#!/bin/bash

# Connect to your ERP Supabase database
# You'll need to get the connection string from your Supabase dashboard

echo "To connect to your ERP database directly with psql:"
echo ""
echo "1. Go to: https://supabase.com/dashboard/project/coqjcziquviehgyifhek/settings/database"
echo "2. Copy the connection string"
echo "3. Use it like: psql 'your-connection-string-here'"
echo ""
echo "Example SQL commands you can run:"
echo ""
echo "-- Check all tables"
echo "\\dt"
echo ""
echo "-- View users"
echo "SELECT email, first_name, last_name, role FROM users LIMIT 5;"
echo ""
echo "-- Check product inventory"
echo "SELECT name, sku, stock, min_stock FROM products WHERE stock < min_stock;"
echo ""
echo "-- Purchase orders summary"
echo "SELECT po_number, supplier_name, status, total FROM purchase_orders ORDER BY created_at DESC LIMIT 10;"
