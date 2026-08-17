import os
import requests
from dotenv import load_dotenv

load_dotenv()
url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_KEY")

res = requests.get(f"{url}/rest/v1/?apikey={key}")
if res.status_code == 200:
    import json
    data = res.json()
    definitions = data.get("definitions", {})
    for table, schema in definitions.items():
        print(f"Table: {table}")
        props = schema.get("properties", {})
        for col, details in props.items():
            print(f"  {col}: {details.get('type')} {details.get('format', '')}")
else:
    print(res.status_code, res.text)
