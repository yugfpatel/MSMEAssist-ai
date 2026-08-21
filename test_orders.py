import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv("backend/.env")

url: str = os.getenv("SUPABASE_URL")
key: str = os.getenv("SUPABASE_SERVICE_KEY")
if not key:
    key = os.getenv("SUPABASE_KEY")
supabase: Client = create_client(url, key)

try:
    business_response = supabase.table("businesses").select("id").eq("name", "Shree Restaurant").single().execute()
    business_id = business_response.data.get("id")
    print("Business ID:", business_id)
    
    orders_response = supabase.table("orders").select("*").eq("business_id", business_id).order("created_at", desc=True).execute()
    print("Orders count:", len(orders_response.data))
    
    if orders_response.data:
        print("First order:", orders_response.data[0])
        
        customer_id = orders_response.data[0].get("customer_id")
        print("Customer ID:", customer_id)
        if customer_id:
            customer_response = supabase.table("customers").select("*").eq("id", customer_id).single().execute()
            print("Customer:", customer_response.data)
            
        order_id = orders_response.data[0].get("id")
        items_response = supabase.table("order_items").select("*, products(name, price)").eq("order_id", order_id).execute()
        print("Items:", items_response.data)

except Exception as e:
    import traceback
    traceback.print_exc()
