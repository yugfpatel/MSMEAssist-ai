import os
import razorpay
from dotenv import load_dotenv

load_dotenv()

RAZORPAY_KEY_ID = os.getenv("RAZORPAY_KEY_ID")
RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET")

if not RAZORPAY_KEY_ID or not RAZORPAY_KEY_SECRET:
    raise RuntimeError("Razorpay API keys are missing from .env")

client = razorpay.Client(
    auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET)
)


def create_payment_link(
    amount: float,
    customer_name: str,
    customer_phone: str | None = None,
    description: str = "MSMEAssist AI Payment",
    order_id: str | None = None,
    invoice_url: str | None = None,
):
    amount_paise = int(round(amount * 100))

    # Build notes with order ID for webhook identification
    notes = {
        "customer_name": customer_name,
    }
    if order_id:
        notes["order_id"] = order_id
    if customer_phone:
        notes["customer_phone"] = customer_phone
    if invoice_url:
        notes["invoice_url"] = invoice_url

    data = {
        "amount": amount_paise,
        "currency": "INR",
        "description": description,
        "customer": {
            "name": customer_name,
        },
        "notify": {
            "sms": False,
            "email": False,
        },
        "reminder_enable": True,
        "notes": notes,
    }

    if customer_phone:
        data["customer"]["contact"] = customer_phone

    payment_link = client.payment_link.create(data)

    return {
        "success": True,
        "payment_id": payment_link["id"],
        "id": payment_link["id"],  # Add this for webhook matching
        "amount": amount,
        "currency": "INR",
        "status": payment_link["status"],
        "payment_link": payment_link["short_url"],
    }