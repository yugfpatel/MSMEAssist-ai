import sys
import os
sys.path.insert(0, os.path.abspath('backend'))

from main import get_dashboard_summary, get_dashboard_payments, get_dashboard_invoices

try:
    print("Summary:", get_dashboard_summary())
    print("Payments count:", len(get_dashboard_payments().get("payments", [])))
    print("Invoices count:", len(get_dashboard_invoices().get("invoices", [])))
except Exception as e:
    import traceback
    traceback.print_exc()
