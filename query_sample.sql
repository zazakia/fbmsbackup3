-- Sample queries for your ERP system

-- 1. Get all users with their roles
SELECT id, email, first_name, last_name, role, department, is_active, created_at
FROM users 
WHERE is_active = true
ORDER BY created_at DESC;

-- 2. Get current product inventory with low stock alerts
SELECT 
    name,
    sku,
    category,
    stock,
    min_stock,
    price,
    CASE 
        WHEN stock <= min_stock THEN 'LOW STOCK ALERT'
        WHEN stock <= (min_stock * 1.5) THEN 'REORDER SOON'
        ELSE 'ADEQUATE'
    END as stock_status
FROM products 
WHERE is_active = true
ORDER BY stock_status DESC, stock ASC;

-- 3. Purchase order summary
SELECT 
    po_number,
    supplier_name,
    status,
    total,
    expected_date,
    created_at
FROM purchase_orders 
ORDER BY created_at DESC 
LIMIT 10;

-- 4. Account balances summary by type
SELECT 
    type as account_type,
    COUNT(*) as account_count,
    COUNT(CASE WHEN is_active THEN 1 END) as active_accounts
FROM accounts 
GROUP BY type
ORDER BY type;
