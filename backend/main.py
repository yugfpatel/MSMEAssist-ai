import os
from payment_service import create_payment_link
from zavu_service import send_whatsapp_message, send_invoice_and_payment
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from fastapi.responses import RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
from supabase import create_client, Client
from google import genai
from datetime import datetime, timedelta
from pydantic import BaseModel
from invoice_service import generate_invoice
from calendar_service import (
    get_authorization_url,
    save_google_token,
    get_calendar_service,
    create_calendar_event as calendar_create_event,
    list_upcoming_events,
)

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
BUSINESS_NAME = "Shree Restaurant"

supabase: Client = create_client(
    SUPABASE_URL,
    SUPABASE_KEY
)

# ---- Customer Management Helper ----
def get_or_create_customer(phone: str, name: str | None = None, business_name: str = BUSINESS_NAME):
    """Get existing customer or create a new one. Return customer record."""
    try:
        # First, get the business ID
        business_response = (
            supabase
            .table("businesses")
            .select("id")
            .eq("name", business_name)
            .single()
            .execute()
        )
        business_id = business_response.data.get("id") if business_response.data else None
        
        if not business_id:
            raise ValueError(f"Business '{business_name}' not found")
        
        # Try to find existing customer by phone
        existing_response = (
            supabase
            .table("customers")
            .select("*")
            .eq("phone", phone)
            .eq("business_id", business_id)
            .execute()
        )
        
        if existing_response.data and len(existing_response.data) > 0:
            return existing_response.data[0]
        
        # Create new customer if doesn't exist
        if name:
            new_customer = {
                "phone": phone,
                "name": name,
                "business_id": business_id,
            }
            insert_response = (
                supabase
                .table("customers")
                .insert(new_customer)
                .execute()
            )
            return insert_response.data[0] if insert_response.data else new_customer
        else:
            # If no name provided and customer doesn't exist, we'll create it when name is available
            return None
    except Exception as e:
        print(f"Error in get_or_create_customer: {e}")
        return None

def create_order_from_items(customer_id: str, items: list, total_amount: float, business_name: str = BUSINESS_NAME):
    """Create an order and its line items. Return order ID."""
    try:
        business_response = (
            supabase
            .table("businesses")
            .select("id")
            .eq("name", business_name)
            .single()
            .execute()
        )
        business_id = business_response.data.get("id") if business_response.data else None
        
        if not business_id:
            raise ValueError(f"Business '{business_name}' not found")
        
        # Create the order
        order_data = {
            "customer_id": customer_id,
            "business_id": business_id,
            "total": total_amount,
            "payment_status": "pending",
            "status": "pending",
        }
        
        order_response = (
            supabase
            .table("orders")
            .insert(order_data)
            .execute()
        )
        
        if not order_response.data:
            raise ValueError("Failed to create order")
        
        order = order_response.data[0]
        order_id = order.get("id")
        
        # Create order items
        for item in items:
            # Get product to verify it exists and get current price
            product_response = (
                supabase
                .table("products")
                .select("*")
                .eq("name", item["name"])
                .single()
                .execute()
            )
            
            if not product_response.data:
                print(f"Product not found: {item['name']}")
                continue
            
            product = product_response.data
            
            order_item = {
                "order_id": order_id,
                "product_id": product.get("id"),
                "quantity": int(float(item["quantity"])),
                "price": float(item["price"]),
            }
            
            supabase.table("order_items").insert(order_item).execute()
        
        return order_id, order
    except Exception as e:
        print(f"Error in create_order_from_items: {e}")
        return None, None

def update_order_as_paid(order_id: str, payment_id: str | None = None):
    """Mark an order as confirmed/paid"""
    try:
        update_data = {
            "payment_status": "paid",
            "status": "confirmed",
        }
        
        response = (
            supabase
            .table("orders")
            .update(update_data)
            .eq("id", order_id)
            .execute()
        )
        return response.data
    except Exception as e:
        print(f"Error updating order as paid: {e}")
        return None


app = FastAPI(title="MSMEAssist AI API")

try:
    supabase.storage.create_bucket("invoices", {"name": "invoices", "public": True})
except Exception:
    pass

PUBLIC_BASE_URL = os.getenv(
    "PUBLIC_BASE_URL",
    "https://predator-rocker-bronzing.ngrok-free.dev",
).rstrip("/")




app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        origin.strip().rstrip("/")
        for origin in os.getenv(
            "FRONTEND_URLS",
            "http://localhost:5173,http://127.0.0.1:5173",
        ).split(",")
        if origin.strip()
    ],
    # Vite selects the next open port when 5173 is already occupied, and its
    # production preview uses a different local port. Permit local loopback
    # origins on those ports without opening credentialed CORS to arbitrary
    # websites.
    allow_origin_regex=r"^https?://(localhost|127\.0\.0.1)(?::\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---- Google Calendar Integration ----
GOOGLE_REDIRECT_URI = "http://localhost:8000/auth/google/callback"


@app.get("/auth/google")
def google_auth():
    authorization_url, _state = get_authorization_url(GOOGLE_REDIRECT_URI)
    return RedirectResponse(authorization_url)


@app.get("/auth/google/callback")
def google_callback(request: Request):
    authorization_response = str(request.url)
    save_google_token(authorization_response, GOOGLE_REDIRECT_URI)
    return {
        "message": "Google Calendar connected successfully ✅",
        "next": "Open /calendar/status to verify the connection.",
    }


class AppointmentRequest(BaseModel):
    title: str
    start_time: datetime
    duration_minutes: int = 30
    description: str = ""


@app.get("/calendar/status")
def calendar_status():
    service = get_calendar_service()
    if service is None:
        return {
            "connected": False,
            "message": "Google Calendar is not connected. Open /auth/google first.",
        }
    return {
        "connected": True,
        "message": "Google Calendar is connected ✅",
    }


@app.get("/calendar/events")
def calendar_events(max_results: int = 10):
    try:
        return {"success": True, "events": list_upcoming_events(max_results)}
    except RuntimeError as exc:
        return {"success": False, "message": str(exc)}


@app.post("/calendar/events")
def create_calendar_event(appointment: AppointmentRequest):
    try:
        end_time = (
            appointment.start_time + timedelta(minutes=appointment.duration_minutes)
        ).isoformat()
        created_event = calendar_create_event(
            summary=appointment.title,
            start_time=appointment.start_time.isoformat(),
            end_time=end_time,
            description=appointment.description,
        )
        return {
            "success": True,
            "message": "Appointment booked successfully ✅",
            "event_id": created_event.get("id"),
            "event_link": created_event.get("htmlLink"),
        }
    except RuntimeError as exc:
        return {"success": False, "message": str(exc)}


# ---- Invoice Generator ----
class InvoiceItem(BaseModel):
    name: str
    quantity: float
    price: float


class InvoiceRequest(BaseModel):
    business_name: str
    customer_name: str
    items: list[InvoiceItem]
    gst_percent: float = 0
    discount: float = 0
    customer_phone: str | None = None
    create_payment: bool = True
    payment_description: str = "MSMEAssist AI Invoice Payment"


@app.post("/invoice/generate")
def generate_invoice_endpoint(invoice: InvoiceRequest):
    import base64
    result = generate_invoice(
        business_name=invoice.business_name,
        customer_name=invoice.customer_name,
        items=[item.model_dump() for item in invoice.items],
        gst_percent=invoice.gst_percent,
        discount=invoice.discount,
    )

    invoice_url = None
    if result.get("success") and result.get("pdf_bytes"):
        pdf_bytes = result["pdf_bytes"]
        filename = result["filename"]
        try:
            supabase.storage.from_("invoices").upload(
                path=filename,
                file=pdf_bytes,
                file_options={"content-type": "application/pdf"}
            )
            invoice_url = supabase.storage.from_("invoices").get_public_url(filename)
        except Exception as e:
            if "Bucket not found" in str(e) or "404" in str(e):
                try:
                    supabase.storage.create_bucket("invoices", {"public": True})
                    supabase.storage.from_("invoices").upload(
                        path=filename,
                        file=pdf_bytes,
                        file_options={"content-type": "application/pdf"}
                    )
                    invoice_url = supabase.storage.from_("invoices").get_public_url(filename)
                except Exception:
                    pass
        
        result["invoice_url"] = invoice_url
        result["pdf_bytes"] = base64.b64encode(pdf_bytes).decode('utf-8')

    if result.get("success") and invoice.create_payment:
        payment = create_payment_link(
            amount=result["total"],
            customer_name=invoice.customer_name,
            customer_phone=invoice.customer_phone,
            description=invoice.payment_description,
            invoice_url=invoice_url,
        )
        result["payment"] = payment

    return result


@app.get("/")
def home():
    return {
        "message": "MSMEAssist AI API is running 🚀"
    }


@app.get("/test-db")
def test_database():
    response = supabase.table("businesses").select("*").execute()

    return {
        "database": "connected",
        "businesses": response.data
    }

@app.get("/inspect-schema")
def inspect_schema():
    """Inspect the actual database schema for all tables"""
    tables_to_inspect = ["customers", "orders", "order_items", "products", "businesses"]
    schema = {}
    
    for table_name in tables_to_inspect:
        try:
            # Get one record from each table to see columns
            response = supabase.table(table_name).select("*").limit(1).execute()
            if response.data and len(response.data) > 0:
                # Get the first record to see column names
                sample_record = response.data[0]
                schema[table_name] = {
                    "columns": list(sample_record.keys()),
                    "sample": sample_record
                }
            else:
                schema[table_name] = {
                    "columns": "No records found - querying table structure differently",
                    "sample": None
                }
        except Exception as e:
            schema[table_name] = {
                "error": str(e),
                "message": "Table might not exist or error occurred"
            }
    
    return schema
@app.get("/business")
def get_business():
    response = (
        supabase
        .table("businesses")
        .select("*")
        .eq("name", BUSINESS_NAME)
        .single()
        .execute()
    )

    return response.data


@app.get("/products")
def get_products():
    response = (
        supabase
        .table("products")
        .select("*")
        .execute()
    )

    return response.data


# ---- Product Management Endpoints ----

class ProductCreateRequest(BaseModel):
    name: str
    description: str = ""
    price: float
    stock: int = 0


def get_business_id() -> str:
    """Resolve the real Supabase business row used by this dashboard."""
    try:
        response = (
            supabase
            .table("businesses")
            .select("id")
            .eq("name", BUSINESS_NAME)
            .single()
            .execute()
        )
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Could not load the Supabase business record: {exc}",
        ) from exc

    business_id = (response.data or {}).get("id")
    if not business_id:
        raise HTTPException(
            status_code=500,
            detail=f"No Supabase business record was found for {BUSINESS_NAME}.",
        )

    return business_id


@app.post("/products")
def add_product(product: ProductCreateRequest):
    name = product.name.strip()
    if not name:
        raise HTTPException(status_code=422, detail="Product name is required.")
    if product.price < 0:
        raise HTTPException(status_code=422, detail="Price cannot be negative.")
    if product.stock < 0:
        raise HTTPException(status_code=422, detail="Availability cannot be negative.")

    try:
        existing = (
            supabase
            .table("products")
            .select("id")
            .eq("name", name)
            .execute()
        )
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Could not check Supabase products: {exc}",
        ) from exc

    if existing.data:
        raise HTTPException(
            status_code=409,
            detail="A product with this name already exists.",
        )

    try:
        response = (
            supabase
            .table("products")
            .insert({
                "business_id": get_business_id(),
                "name": name,
                "description": product.description.strip(),
                "price": product.price,
                "stock": product.stock,
                "type": "product",
            })
            .execute()
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Could not add product to Supabase: {exc}",
        ) from exc

    return {
        "success": True,
        "product": response.data[0] if response.data else None,
    }


@app.delete("/products/{product_id}")
def delete_product(product_id: str):
    try:
        existing = (
            supabase
            .table("products")
            .select("id")
            .eq("id", product_id)
            .execute()
        )
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Could not check the Supabase product: {exc}",
        ) from exc

    if not existing.data:
        raise HTTPException(status_code=404, detail="Product not found.")

    try:
        response = (
            supabase
            .table("products")
            .delete()
            .eq("id", product_id)
            .execute()
        )
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Could not delete product from Supabase: {exc}",
        ) from exc

    return {
        "success": True,
        "message": "Product removed successfully.",
        "product_id": product_id,
    }


gemini_client = genai.Client(
    api_key=os.getenv("GEMINI_API_KEY")
)

# ---- Dashboard Endpoints ----

@app.delete("/orders/{order_id}")
def delete_order(order_id: str):
    """Delete an order and its items"""
    try:
        supabase.table("order_items").delete().eq("order_id", order_id).execute()
        response = supabase.table("orders").delete().eq("id", order_id).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Order not found")
            
        return {"message": "Order deleted successfully"}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Could not delete order: {exc}")


@app.get("/dashboard/orders")
def get_dashboard_orders():
    """Get all confirmed/paid orders with customer and product details"""
    try:
        business_response = (
            supabase
            .table("businesses")
            .select("id")
            .eq("name", BUSINESS_NAME)
            .single()
            .execute()
        )
        
        if not business_response.data:
            return {"orders": []}
        
        business_id = business_response.data.get("id")
        
        orders_response = (
            supabase
            .table("orders")
            .select("*, customers(*), order_items(*, products(name, price, batch_id))")
            .eq("business_id", business_id)
            .order("created_at", desc=True)
            .execute()
        )
        
        orders_list = []
        for order in orders_response.data or []:
            customer = order.get("customers") or {}
            if isinstance(customer, list):
                customer = customer[0] if customer else {}
                
            items_list = []
            for item in order.get("order_items") or []:
                product = item.get("products") or {}
                if isinstance(product, list):
                    product = product[0] if product else {}
                items_list.append({
                    "product": product.get("name", "Unknown"),
                    "batch_id": product.get("batch_id") or item.get("batch_id"),
                    "quantity": item.get("quantity"),
                    "price": item.get("price"),
                    "total": float(item.get("quantity", 0)) * float(item.get("price", 0))
                })
            
            orders_list.append({
                "id": order.get("id"),
                "customer_name": customer.get("name", "Unknown"),
                "customer_phone": customer.get("phone", ""),
                "items": items_list,
                "total": order.get("total"),
                "payment_status": order.get("payment_status"),
                "status": order.get("status"),
                "created_at": order.get("created_at"),
            })
        
        return {"orders": orders_list}
    except Exception as e:
        print(f"Error in get_dashboard_orders: {e}")
        return {"orders": [], "error": str(e)}


@app.get("/dashboard/payments")
def get_dashboard_payments():
    """Get all paid orders (represents payments)"""
    try:
        business_response = (
            supabase
            .table("businesses")
            .select("id")
            .eq("name", BUSINESS_NAME)
            .single()
            .execute()
        )
        
        if not business_response.data:
            return {"payments": []}
        
        business_id = business_response.data.get("id")
        
        orders_response = (
            supabase
            .table("orders")
            .select("*, customers(*)")
            .eq("business_id", business_id)
            .order("created_at", desc=True)
            .execute()
        )
        
        payments_list = []
        for order in orders_response.data or []:
            customer = order.get("customers") or {}
            if isinstance(customer, list):
                customer = customer[0] if customer else {}
            
            payments_list.append({
                "id": order.get("id"),
                "customer_name": customer.get("name", "Unknown"),
                "customer_phone": customer.get("phone", ""),
                "amount": order.get("total"),
                "payment_status": order.get("payment_status"),
                "status": order.get("status"),
                "created_at": order.get("created_at"),
            })
        
        return {"payments": payments_list}
    except Exception as e:
        print(f"Error in get_dashboard_payments: {e}")
        return {"payments": [], "error": str(e)}


@app.get("/dashboard/invoices")
def get_dashboard_invoices():
    """Get all invoices (orders with generated invoice files)"""
    try:
        business_response = (
            supabase
            .table("businesses")
            .select("id")
            .eq("name", BUSINESS_NAME)
            .single()
            .execute()
        )
        
        if not business_response.data:
            return {"invoices": []}
        
        business_id = business_response.data.get("id")
        
        # Get all orders (invoices are generated for all orders)
        orders_response = (
            supabase
            .table("orders")
            .select("*")
            .eq("business_id", business_id)
            .order("created_at", desc=True)
            .execute()
        )
        
        if not orders_response.data:
            return {"invoices": []}
        
        invoices_list = []
        for order in orders_response.data:
            customer_id = order.get("customer_id")
            
            # Get customer details
            customer_response = (
                supabase
                .table("customers")
                .select("*")
                .eq("id", customer_id)
                .single()
                .execute()
            )
            customer = customer_response.data or {}
            
            invoices_list.append({
                "id": order.get("id"),
                "invoice_number": f"INV-{order.get('id')}",
                "customer_name": customer.get("name", "Unknown"),
                "customer_phone": customer.get("phone", ""),
                "amount": order.get("total"),
                "payment_status": order.get("payment_status"),
                "status": order.get("status"),
                "created_at": order.get("created_at"),
            })
        
        return {"invoices": invoices_list}
    except Exception as e:
        print(f"Error in get_dashboard_invoices: {e}")
        return {"invoices": [], "error": str(e)}


@app.get("/dashboard/summary")
def get_dashboard_summary():
    """Get dashboard summary statistics"""
    try:
        business_response = (
            supabase
            .table("businesses")
            .select("id")
            .eq("name", BUSINESS_NAME)
            .single()
            .execute()
        )
        
        if not business_response.data:
            return {"summary": {}}
        
        business_id = business_response.data.get("id")
        
        # Get all orders
        orders_response = (
            supabase
            .table("orders")
            .select("*")
            .eq("business_id", business_id)
            .execute()
        )
        
        orders = orders_response.data or []
        
        # Calculate summary stats
        total_orders = len(orders)
        paid_orders = sum(1 for o in orders if o.get("payment_status") == "paid")
        total_revenue = sum(float(o.get("total", 0)) for o in orders if o.get("payment_status") == "paid")
        pending_payments = sum(float(o.get("total", 0)) for o in orders if o.get("payment_status") == "pending")
        
        # Get today's stats
        from datetime import datetime, date, timedelta
        today = date.today().isoformat()
        today_orders = sum(1 for o in orders if (o.get("created_at") or "").startswith(today) and o.get("payment_status") == "paid")
        today_revenue = sum(float(o.get("total", 0)) for o in orders if (o.get("created_at") or "").startswith(today) and o.get("payment_status") == "paid")
        
        revenue_last_7_days = []
        for i in range(6, -1, -1):
            day_date = (date.today() - timedelta(days=i)).isoformat()
            day_revenue = sum(float(o.get("total", 0)) for o in orders if (o.get("created_at") or "").startswith(day_date) and o.get("payment_status") == "paid")
            revenue_last_7_days.append(day_revenue)
        
        # Get total products
        products_response = (
            supabase
            .table("products")
            .select("id")
            .eq("business_id", business_id)
            .execute()
        )
        total_products = len(products_response.data or [])
        
        return {
            "summary": {
                "total_orders": total_orders,
                "paid_orders": paid_orders,
                "pending_payments": len([o for o in orders if o.get("payment_status") == "pending"]),
                "today_orders": today_orders,
                "today_revenue": today_revenue,
                "total_revenue": total_revenue,
                "month_revenue": total_revenue,  # Simplified for now
                "collected_amount": total_revenue,
                "pending_amount": pending_payments,
                "total_products": total_products,
                "payment_success_rate": (paid_orders / total_orders * 100) if total_orders > 0 else 0,
                "revenue_last_7_days": revenue_last_7_days,
            }
        }
    except Exception as e:
        print(f"Error in get_dashboard_summary: {e}")
        return {"summary": {}, "error": str(e)}


class ChatRequest(BaseModel):
    message: str


@app.post("/chat")
def chat(request: ChatRequest):

    # Get business information
    business_response = (
        supabase
        .table("businesses")
        .select("*")
        .eq("name", "Shree Restaurant")
        .single()
        .execute()
    )

    # Get products
    products_response = (
        supabase
        .table("products")
        .select("name, description, price, stock")
        .execute()
    )

    business = business_response.data
    products = products_response.data

    prompt = f"""
You are MSMEAssist AI, a friendly AI business assistant for small and medium businesses.

BUSINESS INFORMATION:
{business}

PRODUCTS:
{products}

CUSTOMER MESSAGE:
{request.message}

LANGUAGE RULES:

1. ENGLISH
If the customer writes in English, reply naturally in English.

Example:
Customer: "What is the price of Gujarati thali?"
Reply: "The Gujarati thali is ₹180."

2. GUJLISH
If the customer writes Gujarati using English/Roman letters, reply ONLY in Gujlish.
Do NOT use Gujarati script.

Example:
Customer: "Gujarati thali ketla ni che?"
Reply: "Gujarati thali ₹180 ni che 😊"

Customer: "Aaje restaurant open che?"
Reply: "Ha, aaje restaurant open che."

3. HINGLISH
If the customer writes Hindi using English/Roman letters, reply ONLY in Hinglish.
Do NOT use Devanagari script.

Example:
Customer: "Gujarati thali kitne ki hai?"
Reply: "Gujarati thali ₹180 ki hai 😊"

Customer: "Aaj restaurant kitne baje tak open hai?"
Reply: "Aaj restaurant raat 11 baje tak open hai."

4. MIXED LANGUAGE
If the customer mixes English with Hinglish or Gujlish, naturally mirror their style.

Example:
Customer: "Bhai Gujarati thali available che?"
Reply: "Ha bhai, Gujarati thali available che 😊"

IMPORTANT:
- Match the customer's language style.
- If they use Roman letters, respond using Roman letters.
- NEVER use Gujarati script when the customer uses Gujlish.
- NEVER use Hindi/Devanagari script when the customer uses Hinglish.
- Keep replies short, friendly and conversational.
- Use emojis naturally but don't overuse them.
- Never invent products, prices, stock, timings or business information.
- Use ONLY the business information and products provided above.
"""

    import time
    response = None
    max_retries = 3
    delay = 1

    for attempt in range(max_retries):
        try:
            response = gemini_client.models.generate_content(
                model="gemini-3.6-flash",
                contents=prompt
            )
            break
        except Exception as e:
            if "503" in str(e):
                print(f"Chat: Gemini 3.6 503 error, retrying in {delay}s (Attempt {attempt+1}/{max_retries})")
                time.sleep(delay)
                delay *= 2
            else:
                print(f"Chat: Gemini generation error: {e}")
                break

    if not response:
        print("Chat: Gemini API could not generate response")

    if not response or not getattr(response, "text", None):
        return {
            "reply": "Sorry, I'm having a little trouble processing your message right now. Please try again in a moment. 🙏"
        }

    return {
        "reply": response.text
    }
# ---- Payment Collector ----
class PaymentRequest(BaseModel):
    amount: float
    customer_name: str
    customer_phone: str | None = None
    description: str = "MSMEAssist AI Payment"


@app.post("/payment/create")
def create_payment(request: PaymentRequest):
    return create_payment_link(
        amount=request.amount,
        customer_name=request.customer_name,
        customer_phone=request.customer_phone,
        description=request.description,
    )

# ---- WhatsApp / Zavu Test ----
class WhatsAppTestRequest(BaseModel):
    phone_number: str
    message: str = "MSMEAssist AI is connected!"


# ---- WhatsApp Order Models ----
class OrderItem(BaseModel):
    name: str
    quantity: float


class WhatsAppOrderRequest(BaseModel):
    phone_number: str
    customer_name: str = "WhatsApp Customer"
    items: list[OrderItem]

@app.post("/whatsapp/test")
def whatsapp_test(request: WhatsAppTestRequest):
    result = send_whatsapp_message(
        phone_number=request.phone_number,
        message=request.message,
    )


    return {
        "success": True,
        "message": "WhatsApp message sent successfully",
        "zavu_response": result,
    }


# ---- WhatsApp Order Endpoint ----
@app.post("/whatsapp/order")
def whatsapp_order(request: WhatsAppOrderRequest):
    products_response = (
        supabase
        .table("products")
        .select("name, description, price, stock")
        .execute()
    )
    products = products_response.data or []

    product_map = {str(p["name"]).strip().lower(): p for p in products}
    invoice_items = []

    for requested_item in request.items:
        product = product_map.get(requested_item.name.strip().lower())
        if not product:
            return {
                "success": False,
                "message": f"Product not found: {requested_item.name}",
            }

        stock = product.get("stock")
        if stock is not None and requested_item.quantity > float(stock):
            return {
                "success": False,
                "message": f"Insufficient stock for {requested_item.name}",
            }

        invoice_items.append({
            "name": product["name"],
            "quantity": requested_item.quantity,
            "price": float(product["price"]),
        })

    invoice_result = generate_invoice(
        business_name="Shree Restaurant",
        customer_name=request.customer_name,
        items=invoice_items,
        gst_percent=0,
        discount=0,
    )

    if not invoice_result.get("success"):
        return invoice_result

    payment_result = create_payment_link(
        amount=invoice_result["total"],
        customer_name=request.customer_name,
        customer_phone=request.phone_number,
        description="MSMEAssist AI WhatsApp Order",
    )

    return {
        "success": True,
        "invoice": invoice_result,
        "payment": payment_result,
    }


 
# Pending WhatsApp orders waiting for customer name.
pending_whatsapp_orders = {}

# Payment links waiting for successful Razorpay payment before invoice delivery.


# Helper function to detect language
def detect_language_from_message(msg: str) -> str:
    """Detect if message is in English, Hinglish, or Gujlish"""
    msg_lower = msg.lower()
    # Gujlish indicators
    gujlish_words = {'che', 'tame', 'aapda', 'tu', 'malyu', 'moklo', 'batavsho', 'puchhyu', 'ane', 'aaj', 'jaa'}
    gujlish_count = sum(1 for word in gujlish_words if word in msg_lower)
    
    # Hinglish indicators
    hinglish_words = {'hai', 'hote', 'kya', 'karte', 'aap', 'maine', 'humne', 'kitna', 'kaise', 'kya', 'phir', 'bata'}
    hinglish_count = sum(1 for word in hinglish_words if word in msg_lower)
    
    # Gujarati script characters
    has_gujarati = any(char in msg for char in 'અઈઓુંહજટણતચજ')
    # Hindi/Devanagari script characters
    has_devanagari = any(char in msg for char in 'आइईओउअंहजटणतचज')
    
    if has_gujarati or gujlish_count >= 2:
        return "gujlish"
    elif has_devanagari or hinglish_count >= 2:
        return "hinglish"
    else:
        return "english"

def get_name_request_message(language: str) -> str:
    """Get the appropriate customer name request message in the detected language"""
    if language == "gujlish":
        return "Sure! Order ane invoice ke liye tamaru naam bata sakte ho? 😊"
    elif language == "hinglish":
        return "Bilkul! Order aur invoice ke liye aapka naam bata sakte ho? 😊"
    else:
        return "Sure! May I know your name for the order and invoice? 😊"

def get_cancel_message(language: str) -> str:
    """Get the appropriate order cancellation message in the detected language"""
    if language == "gujlish":
        return "Okay 👍 Order cancel kari didho che. Jo tame navo order karvo hoy to moklo."
    elif language == "hinglish":
        return "Okay 👍 Aapka order cancel kar diya gaya. Agar phir se order karna hai to bataiye."
    else:
        return "Okay 👍 Your order has been cancelled. Feel free to place a new order anytime."


def process_whatsapp_order_logic(customer_phone: str, customer_name: str, invoice_items: list):
    customer_record = get_or_create_customer(customer_phone, customer_name)
    if not customer_record:
        send_whatsapp_message(customer_phone, "Sorry, I couldn't save your information. Please try again.")
        return {"success": True, "received": True, "message": "Customer creation failed"}
    
    customer_id = customer_record.get("id")
    
    # Enforce using the real customer name from the DB if available
    db_name = customer_record.get("name")
    if db_name and db_name not in ["WhatsApp Customer", "Customer", ""]:
        customer_name = db_name

    calculated_total = sum(item["quantity"] * item["price"] for item in invoice_items)
    order_id, order_record = create_order_from_items(customer_id, invoice_items, calculated_total)
    
    if not order_id:
        send_whatsapp_message(customer_phone, "Sorry, I couldn't create your order. Please try again.")
        return {"success": True, "received": True, "message": "Order creation failed"}
    
    invoice_result = generate_invoice(
        business_name="Shree Restaurant",
        customer_name=customer_name,
        items=invoice_items,
        gst_percent=0,
        discount=0,
    )

    if not invoice_result.get("success"):
        send_whatsapp_message(customer_phone, "Sorry, bill generate karvama problem aavi. Please try again.")
        return {"success": True, "received": True, "message": "Invoice generation failed"}

    invoice_url = None
    pdf_bytes = invoice_result.get("pdf_bytes")
    filename = invoice_result.get("filename")
    if pdf_bytes and filename:
        try:
            supabase.storage.from_("invoices").upload(
                path=filename,
                file=pdf_bytes,
                file_options={"content-type": "application/pdf"}
            )
            invoice_url = supabase.storage.from_("invoices").get_public_url(filename)
        except Exception as e:
            print(f"Error uploading invoice to Supabase: {e}")
            if "Bucket not found" in str(e) or "404" in str(e):
                try:
                    supabase.storage.create_bucket("invoices", {"name": "invoices", "public": True})
                    supabase.storage.from_("invoices").upload(
                        path=filename,
                        file=pdf_bytes,
                        file_options={"content-type": "application/pdf"}
                    )
                    invoice_url = supabase.storage.from_("invoices").get_public_url(filename)
                except Exception as inner_e:
                    print(f"Second upload attempt failed: {inner_e}")

    payment_result = create_payment_link(
        amount=invoice_result["total"],
        customer_name=customer_name,
        customer_phone=customer_phone,
        description="MSMEAssist AI WhatsApp Order",
        order_id=order_id,
        invoice_url=invoice_url,
    )

    payment_link = payment_result.get("payment_link")

    if not payment_link:
        send_whatsapp_message(customer_phone, f"Your order total is Rs. {invoice_result['total']:.2f}, but I couldn't create the payment link right now. Please try again.")
        return {"success": True, "received": True, "message": "Payment link creation failed"}

    pending_whatsapp_orders.pop(customer_phone, None)
    
    zavu_response = send_whatsapp_message(
        phone_number=customer_phone,
        message=(
            f"💳 Your order total is Rs. {invoice_result['total']:.2f}.\n\n"
            f"Please complete your payment here:\n{payment_link}\n\n"
            "After successful payment, your invoice will be sent here automatically."
        ),
    )

    return {
        "success": True,
        "received": True,
        "intent": "payment_pending",
        "order_id": order_id,
        "customer_name": customer_name,
        "payment": payment_result,
        "zavu_response": zavu_response,
    }


# ---- Zavu Incoming WhatsApp Webhook ----
@app.post("/webhook/zavu")
async def zavu_webhook(request: Request):
    payload = await request.json()
    print("ZAVU WEBHOOK:", payload)

    data = payload.get("data", {})
    customer_phone = data.get("from")
    customer_message = data.get("text", "").strip()

    if not customer_phone or not customer_message:
        return {
            "success": False,
            "received": True,
            "message": "No customer phone number or text message found",
        }

    business_response = (
        supabase
        .table("businesses")
        .select("*")
        .eq("name", "Shree Restaurant")
        .single()
        .execute()
    )

    products_response = (
        supabase
        .table("products")
        .select("name, description, price, stock")
        .execute()
    )

    business = business_response.data
    products = products_response.data or []

    # Honey Chain Traceability Data
    try:
        batches_response = supabase.table("honey_batches").select("batch_id, product_name, honey_variety, harvest_date, quality_info").execute()
        batches = batches_response.data or []
    except Exception:
        batches = []

    prompt = f"""
You are MSMEAssist AI, a friendly AI business assistant for small and medium businesses.

BUSINESS INFORMATION:
{business}

PRODUCTS:
{products}

HONEY BATCHES & TRACEABILITY (Honey Chain Module):
{batches}
If a customer asks about the origin, authenticity, or details of a honey product (e.g., "Is this honey genuine?", "Where is it from?"), use the HONEY BATCHES information to inform them. Tell them they can verify authenticity using the Batch ID or the QR code provided on the product. NEVER invent honey varieties, prices, batch information, or harvest dates.

CUSTOMER MESSAGE:
{customer_message}

TASK:
1. Decide whether the customer is asking a normal question, requesting an order/purchase, or asking about an appointment.
2. If it is an order/purchase, return ONLY valid JSON in this exact structure:
{{
  "intent": "order",
  "items": [
    {{"name": "exact product name from PRODUCTS", "quantity": 1}}
  ],
  "reply": "short customer-facing confirmation"
}}
3. If it is NOT an order, return ONLY valid JSON in this exact structure:
{{
  "intent": "chat",
  "items": [],
  "reply": "short customer-facing answer"
}}
4. If it is an appointment request, return ONLY valid JSON in this exact structure:
{{
  "intent": "appointment",
  "items": [],
  "reply": "short customer-facing request for date/time"
}}
5. Never invent products, prices, stock, timings or business information.
6. Use ONLY products listed in PRODUCTS.
7. Match the customer's language style.
8. If the customer writes Gujarati in Roman letters, reply in Gujlish only.
9. If the customer writes Hindi in Roman letters, reply in Hinglish only.
10. If the customer writes English, reply in English.
11. Keep the reply short, friendly and conversational.
12. Return JSON only. No markdown fences and no extra text.
"""

    import time
    response = None
    max_retries = 3
    delay = 1

    for attempt in range(max_retries):
        try:
            response = gemini_client.models.generate_content(
                model="gemini-3.6-flash",
                contents=prompt,
            )
            break
        except Exception as e:
            if "503" in str(e):
                print(f"Gemini 3.6 503 error, retrying in {delay}s (Attempt {attempt+1}/{max_retries})")
                time.sleep(delay)
                delay *= 2
            else:
                print(f"Gemini generation error: {e}")
                break

    if not response:
        print("Gemini API could not generate response")

    if not response or not getattr(response, "text", None):
        error_msg = "Sorry, I'm having a little trouble processing your message right now. Please try again in a moment. 🙏"
        zavu_response = send_whatsapp_message(
            phone_number=customer_phone,
            message=error_msg,
        )
        return {
            "success": True,
            "received": True,
            "message": "Gemini API unavailable",
            "zavu_response": zavu_response
        }

    raw_reply = (response.text or "").strip()

    import json
    try:
        ai_result = json.loads(raw_reply)
    except json.JSONDecodeError:
        ai_result = {
            "intent": "chat",
            "items": [],
            "reply": raw_reply or "Sorry, I couldn't process that message right now.",
        }

    intent = ai_result.get("intent", "chat")
    ai_reply = ai_result.get("reply", "Sorry, I couldn't process that message right now.").strip()

    normalized_message = customer_message.lower().strip()
    confirmation_words = {
        "yes", "y", "confirm", "confirmed", "ok", "okay", "haan", "ha", "haji",
        "હા"
    }
    rejection_words = {
        "no", "n", "cancel", "cancel order", "nope", "nah", "nahi", "na"
    }

    # Check if we're waiting for customer name for this phone number.
    if customer_phone in pending_whatsapp_orders and pending_whatsapp_orders[customer_phone].get("status") == "pending_name":
        customer_name = customer_message.strip()
        invoice_items = pending_whatsapp_orders[customer_phone]["items"]
        return process_whatsapp_order_logic(customer_phone, customer_name, invoice_items)

    # Confirm a previously collected order.
    if customer_phone in pending_whatsapp_orders and pending_whatsapp_orders[customer_phone].get("status") == "pending_confirmation" and normalized_message in confirmation_words:
        pending_order = pending_whatsapp_orders.pop(customer_phone)
        invoice_items = pending_order["items"]

        # Create the invoice internally so we know the final payable amount,
        # but DO NOT send the invoice to the customer yet.
        invoice_result = generate_invoice(
            business_name="Shree Restaurant",
            customer_name=pending_order.get("customer_name", "WhatsApp Customer"),
            items=invoice_items,
            gst_percent=0,
            discount=0,
        )

        if not invoice_result.get("success"):
            send_whatsapp_message(
                customer_phone,
                "Sorry, bill generate karvama problem aavi. Please try again.",
            )
            return {
                "success": False,
                "received": True,
                "message": "Invoice generation failed",
            }

        invoice_url = None
        pdf_bytes = invoice_result.get("pdf_bytes")
        filename = invoice_result.get("filename")
        if pdf_bytes and filename:
            try:
                supabase.storage.from_("invoices").upload(
                    path=filename,
                    file=pdf_bytes,
                    file_options={"content-type": "application/pdf"}
                )
                invoice_url = supabase.storage.from_("invoices").get_public_url(filename)
            except Exception as e:
                print(f"Error uploading invoice to Supabase: {e}")
                # Fallback if bucket creation failed earlier
                if "Bucket not found" in str(e) or "404" in str(e):
                    try:
                        supabase.storage.create_bucket("invoices", {"name": "invoices", "public": True})
                        supabase.storage.from_("invoices").upload(
                            path=filename,
                            file=pdf_bytes,
                            file_options={"content-type": "application/pdf"}
                        )
                        invoice_url = supabase.storage.from_("invoices").get_public_url(filename)
                    except Exception as inner_e:
                        print(f"Second upload attempt failed: {inner_e}")

        payment_result = create_payment_link(
            amount=invoice_result["total"],
            customer_name=pending_order.get("customer_name", "WhatsApp Customer"),
            customer_phone=customer_phone,
            description="MSMEAssist AI WhatsApp Order",
            invoice_url=invoice_url,
        )

        payment_link = payment_result.get("payment_link")

        if not payment_link:
            send_whatsapp_message(
                customer_phone,
                f"Your order total is Rs. {invoice_result['total']:.2f}, but I couldn't create the payment link right now. Please try again.",
            )
            return {
                "success": False,
                "received": True,
                "message": "Payment link creation failed",
            }

        # IMPORTANT: payment link ONLY. Invoice is not sent here.
        zavu_response = send_whatsapp_message(
            phone_number=customer_phone,
            message=(
                f"💳 Your order total is Rs. {invoice_result['total']:.2f}.\n\n"
                f"Please complete your payment here:\n{payment_link}\n\n"
                "After successful payment, your invoice will be sent here automatically."
            ),
        )

        return {
            "success": True,
            "received": True,
            "intent": "payment_pending",
            "payment": payment_result,
            "zavu_response": zavu_response,
        }

    # Cancel a previously collected order or name entry.
    if customer_phone in pending_whatsapp_orders and (
        pending_whatsapp_orders[customer_phone].get("status") == "pending_confirmation" or
        pending_whatsapp_orders[customer_phone].get("status") == "pending_name"
    ) and normalized_message in rejection_words:
        pending_order = pending_whatsapp_orders.pop(customer_phone, None)
        detected_lang = detect_language_from_message(customer_message)
        cancel_msg = get_cancel_message(detected_lang)
        
        zavu_response = send_whatsapp_message(
            phone_number=customer_phone,
            message=cancel_msg,
        )
        return {
            "success": True,
            "received": True,
            "intent": "order_cancelled",
            "zavu_response": zavu_response,
        }

    if intent == "appointment":
        detected_lang = detect_language_from_message(customer_message)
        if detected_lang == "gujlish":
            appt_msg = ai_reply or "Sure! Aapda kone date ane time ane possible che?"
        elif detected_lang == "hinglish":
            appt_msg = ai_reply or "Sure! Aap kab appointment lena chahte ho?"
        else:
            appt_msg = ai_reply or "Sure! Please tell me your preferred date and time for the appointment."
        
        zavu_response = send_whatsapp_message(
            phone_number=customer_phone,
            message=appt_msg,
        )
        return {
            "success": True,
            "received": True,
            "intent": "appointment",
            "reply": appt_msg,
            "zavu_response": zavu_response,
        }

    if intent == "order" and ai_result.get("items"):
        detected_lang = detect_language_from_message(customer_message)
        product_map = {str(p["name"]).strip().lower(): p for p in products}
        invoice_items = []

        for item in ai_result["items"]:
            product = product_map.get(str(item.get("name", "")).strip().lower())
            quantity = float(item.get("quantity", 0))

            if not product or quantity <= 0:
                return {"success": True, "received": True, "message": "I couldn't match one of the requested products."}

            stock = product.get("stock")
            if stock is not None and quantity > float(stock):
                send_whatsapp_message(customer_phone, f"Sorry, {product['name']} is not available in that quantity right now.")
                return {"success": True, "received": True, "message": "Insufficient stock"}

            invoice_items.append({
                "name": product["name"],
                "quantity": quantity,
                "price": float(product["price"]),
            })

        # Check if customer already exists and has a real name
        customer_record = get_or_create_customer(customer_phone, None)
        valid_name = None
        if customer_record and customer_record.get("name"):
            name_val = customer_record.get("name").strip()
            if name_val and name_val not in ["WhatsApp Customer", "Customer", ""]:
                valid_name = name_val

        if valid_name:
            # We know the customer, proceed directly to order processing
            return process_whatsapp_order_logic(customer_phone, valid_name, invoice_items)

        # Store order items and mark as waiting for customer name
        pending_whatsapp_orders[customer_phone] = {
            "customer_name": None,
            "items": invoice_items,
            "status": "pending_name",
            "language": detected_lang,
        }

        # Send the name request in appropriate language
        name_request_msg = get_name_request_message(detected_lang)
        zavu_response = send_whatsapp_message(phone_number=customer_phone, message=name_request_msg)

        return {
            "success": True,
            "received": True,
            "intent": "order_pending_name",
            "items": invoice_items,
            "zavu_response": zavu_response,
        }

    # Regular chat message
    zavu_response = send_whatsapp_message(
        phone_number=customer_phone,
        message=ai_reply,
    )

    return {
        "success": True,
        "received": True,
        "intent": "chat",
        "customer_phone": customer_phone,
        "customer_message": customer_message,
        "reply": ai_reply,
        "zavu_response": zavu_response,
    }


# ---- Razorpay Payment Webhook ----
@app.post("/webhook/razorpay")
async def razorpay_webhook(request: Request):
    payload = await request.json()
    print("RAZORPAY WEBHOOK:", payload)

    event = payload.get("event", "")
    payload_data = payload.get("payload", {}) or {}

    payment_entity = (
        payload_data.get("payment", {}).get("entity", {}) or {}
    )
    payment_link_entity = (
        payload_data.get("payment_link", {}).get("entity", {}) or {}
    )

    print("RAZORPAY EVENT:", event)
    print("PAYMENT LINK ENTITY:", payment_link_entity)
    print("PAYMENT ENTITY:", payment_entity)

    # We only deliver the invoice after a successful payment event.
    if event not in {"payment_link.paid", "payment.captured"}:
        return {"success": True, "received": True, "event": event}

    payment_link_id = (
        payment_link_entity.get("id")
        or payment_entity.get("payment_link_id")
    )

    # Prevent duplicate invoices: if this payment belongs to a payment link,
    # we ONLY process the `payment_link.paid` event and ignore `payment.captured`.
    if event == "payment.captured" and payment_link_id:
        print(f"Ignoring payment.captured for payment link {payment_link_id} to prevent duplicate deliveries.")
        return {"success": True, "received": True, "message": "Ignored payment.captured to prevent duplicates"}

    payment_notes = payment_entity.get("notes") or {}
    payment_link_notes = payment_link_entity.get("notes") or {}
    
    order_id_from_notes = payment_notes.get("order_id") or payment_link_notes.get("order_id")
    
    payment_id = payment_entity.get("id")
    if order_id_from_notes:
        # Check if the order was already paid to prevent duplicate webhooks from sending multiple invoices
        existing_order = supabase.table("orders").select("payment_status").eq("id", order_id_from_notes).execute()
        if existing_order.data and existing_order.data[0].get("payment_status") == "paid":
            print(f"Order {order_id_from_notes} is already marked as paid. Ignoring duplicate webhook.")
            return {"success": True, "received": True, "message": "Duplicate webhook ignored (already paid)"}

        update_result = update_order_as_paid(order_id_from_notes, payment_id)
        print(f"Order {order_id_from_notes} marked as paid directly from webhook notes: {update_result}")

    # Completely stateless extraction of metadata from Razorpay notes!
    customer_phone = payment_notes.get("customer_phone") or payment_link_notes.get("customer_phone")
    invoice_url = payment_notes.get("invoice_url") or payment_link_notes.get("invoice_url")
    total = (payment_entity.get("amount") or payment_link_entity.get("amount") or 0) / 100.0

    if not customer_phone or not invoice_url:
        print("NO CUSTOMER PHONE OR INVOICE URL FOUND IN PAYMENT NOTES.")
        return {
            "success": True,
            "received": True,
            "payment_confirmed": True,
            "invoice_sent": False,
            "message": "Payment received but no invoice metadata found in notes.",
        }

    print("PAYMENT CONFIRMED FOR:", customer_phone)
    print("ORDER ID:", order_id_from_notes)
    print("PUBLIC INVOICE URL:", invoice_url)
    print("TOTAL:", total)

    zavu_response = None
    # IMPORTANT: This is the first point where the invoice is sent.
    if invoice_url and invoice_url.startswith("https://") and "<filename>" not in invoice_url:
        try:
            from zavu_service import send_whatsapp_document
            zavu_response = send_whatsapp_document(
                phone_number=customer_phone,
                document_url=invoice_url,
                filename="invoice.pdf",
                caption=f"🧾 Payment received! Your invoice for Rs. {total:.2f} is attached.",
            )
        except Exception as exc:
            print(f"Invoice document delivery failed: {exc}")
            zavu_response = send_whatsapp_message(
                phone_number=customer_phone,
                message=(
                    f"✅ Payment received!\n\n"
                    f"🧾 Your invoice: {invoice_url}\n"
                    f"Amount paid: Rs. {total:.2f}"
                ),
            )

    return {
        "success": True,
        "received": True,
        "payment_confirmed": True,
        "invoice_sent": True if zavu_response else False,
        "zavu_response": zavu_response,
    }

# --- Honey Chain Integration ---
from honey_chain import attach_honey_chain_routes
attach_honey_chain_routes(app, supabase, gemini_client, BUSINESS_NAME)
