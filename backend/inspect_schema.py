#!/usr/bin/env python3
"""
Inspect the Supabase database schema and relationships.
"""
import os
import json
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ SUPABASE_URL or SUPABASE_KEY not found in .env")
    exit(1)

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# List of tables to inspect
TABLES = [
    "businesses",
    "products", 
    "customers",
    "conversations",
    "messages",
    "order_items",
    "orders",
    "appointments",
]

def inspect_table(table_name):
    """Inspect a table's structure by fetching one row and showing its columns"""
    try:
        print(f"\n{'='*70}")
        print(f"TABLE: {table_name}")
        print(f"{'='*70}")
        
        # Fetch one row to see the structure
        response = supabase.table(table_name).select("*").limit(1).execute()
        
        if response.data:
            sample_row = response.data[0]
            print(f"\nColumns and Sample Data:")
            for key, value in sample_row.items():
                value_type = type(value).__name__
                value_str = str(value)[:60] if value else "NULL"
                print(f"  • {key:20} ({value_type:10}): {value_str}")
        else:
            print(f"\n  ⚠️  Table is empty, checking for columns by selecting all...")
            # Try to get all rows to see structure
            response = supabase.table(table_name).select("*").limit(0).execute()
            print(f"  Total rows: 0")
        
        # Get total count
        count_response = supabase.table(table_name).select("*", count="exact").limit(0).execute()
        total_count = count_response.count if hasattr(count_response, 'count') else "unknown"
        print(f"\n  Total rows in table: {total_count}")
        
    except Exception as e:
        print(f"  ❌ Error: {str(e)}")

# Inspect all tables
for table in TABLES:
    inspect_table(table)

print(f"\n{'='*70}")
print("✅ Schema inspection complete")
print(f"{'='*70}\n")
