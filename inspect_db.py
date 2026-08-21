import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv("backend/.env")
url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_KEY")
supabase: Client = create_client(url, key)

tables = ["businesses", "customers", "products", "orders", "order_items"]
for t in tables:
    try:
        res = supabase.table(t).select("*").limit(1).execute()
        print(f"Table {t} exists. Keys: {list(res.data[0].keys()) if res.data else 'Empty'}")
    except Exception as e:
        print(f"Error querying {t}: {e}")
