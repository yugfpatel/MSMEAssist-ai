import sys
import os
import json
sys.path.insert(0, os.path.abspath('backend'))

from main import get_dashboard_orders

try:
    res = get_dashboard_orders()
    print("Success! Return keys:", res.keys())
    if "orders" in res:
        print(f"Got {len(res['orders'])} orders.")
    else:
        print("Response:", res)
except Exception as e:
    import traceback
    traceback.print_exc()
