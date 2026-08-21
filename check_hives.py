import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv("backend/.env")
url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_KEY")
supabase: Client = create_client(url, key)

try:
    res = supabase.table("hives").select("*").limit(1).execute()
    print("SUCCESS: Hives table exists.")
except Exception as e:
    print(f"ERROR: {e}")
