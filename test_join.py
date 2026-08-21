import sys
import os
import json
sys.path.insert(0, os.path.abspath('backend'))
from dotenv import load_dotenv
from supabase import create_client, Client
load_dotenv("backend/.env")

url: str = os.getenv("SUPABASE_URL")
key: str = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_KEY")
supabase: Client = create_client(url, key)

business_id = "a315aedf-7b73-4112-a05b-93a5d1dc2c79"
try:
    res = supabase.table("orders").select("*, customers(*), order_items(*, products(name, price))").eq("business_id", business_id).limit(1).execute()
    print("Success!", json.dumps(res.data, indent=2))
except Exception as e:
    print("Error:", e)
