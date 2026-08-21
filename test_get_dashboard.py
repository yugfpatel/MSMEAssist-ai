import sys
import os
sys.path.insert(0, os.path.abspath('backend'))

from main import get_dashboard_orders
import json

try:
    res = get_dashboard_orders()
    print("Success! Got", len(res.get("orders", [])), "orders.")
    # print(json.dumps(res, indent=2))
except Exception as e:
    import traceback
    traceback.print_exc()
