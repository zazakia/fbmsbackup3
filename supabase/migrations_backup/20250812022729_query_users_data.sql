-- Query to view current users in the system
SELECT 
    id,
    email,
    first_name,
    last_name,
    role,
    department,
    is_active,
    status,
    created_at
FROM users 
WHERE is_active = true
ORDER BY created_at DESC;

-- Query to check product inventory status
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
