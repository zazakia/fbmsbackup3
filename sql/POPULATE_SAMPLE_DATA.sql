-- Populate Sample Data and Fix Data Consistency

-- Update existing products with category names based on their product type
UPDATE public.products 
SET category = CASE 
    WHEN name ILIKE '%laptop%' OR name ILIKE '%computer%' THEN 'Electronics'
    WHEN name ILIKE '%chair%' OR name ILIKE '%desk%' THEN 'Office Supplies'
    WHEN name ILIKE '%coffee%' OR name ILIKE '%tea%' THEN 'Food & Beverages'
    WHEN name ILIKE '%pen%' OR name ILIKE '%pencil%' THEN 'Office Supplies'
    ELSE 'Electronics'
END
WHERE category IS NULL OR category = '';

-- Link products to category IDs
UPDATE public.products 
SET category_id = c.id
FROM public.categories c
WHERE public.products.category = c.name;

-- Add sample customers
INSERT INTO public.customers (first_name, last_name, email, phone, address, city, province)
VALUES 
    ('Juan', 'dela Cruz', 'juan@example.com', '09123456789', '123 Rizal Street', 'Manila', 'Metro Manila'),
    ('Maria', 'Santos', 'maria@example.com', '09234567890', '456 Bonifacio Ave', 'Quezon City', 'Metro Manila'),
    ('Jose', 'Garcia', 'jose@example.com', '09345678901', '789 Mabini St', 'Makati', 'Metro Manila'),
    ('Ana', 'Reyes', 'ana@example.com', '09456789012', '321 Taft Avenue', 'Manila', 'Metro Manila')
ON CONFLICT (email) DO NOTHING;

-- Add sample suppliers
INSERT INTO public.suppliers (name, contact_person, email, phone, address, city, province)
VALUES 
    ('Tech Solutions Inc.', 'John Smith', 'john@techsolutions.ph', '02-8234-5678', '100 Tech Hub', 'Makati', 'Metro Manila'),
    ('Office Plus Corp.', 'Sarah Lee', 'sarah@officeplus.ph', '02-8345-6789', '200 Business District', 'BGC', 'Metro Manila'),
    ('Food Distributors Ltd.', 'Miguel Torres', 'miguel@fooddist.ph', '02-8456-7890', '300 Market Street', 'Pasig', 'Metro Manila')
ON CONFLICT (name) DO NOTHING;

-- Add sample sales
DO $$
DECLARE
    customer_id UUID;
    sale_id UUID;
    product_record RECORD;
BEGIN
    -- Get a customer ID
    SELECT id INTO customer_id FROM public.customers LIMIT 1;
    
    IF customer_id IS NOT NULL THEN
        -- Create a sample sale
        INSERT INTO public.sales (customer_id, sale_number, subtotal, tax_amount, total_amount, payment_method, payment_status, status)
        VALUES (customer_id, 'SALE-001', 1000.00, 120.00, 1120.00, 'cash', 'paid', 'completed')
        RETURNING id INTO sale_id;
        
        -- Add sale items
        FOR product_record IN 
            SELECT id, name, sku, price FROM public.products LIMIT 2
        LOOP
            INSERT INTO public.sale_items (sale_id, product_id, product_name, product_sku, quantity, unit_price, total_price)
            VALUES (sale_id, product_record.id, product_record.name, product_record.sku, 1, product_record.price, product_record.price);
        END LOOP;
    END IF;
END $$;

-- Add sample stock movements
DO $$
DECLARE
    product_record RECORD;
BEGIN
    FOR product_record IN 
        SELECT id, name, sku, stock FROM public.products LIMIT 3
    LOOP
        INSERT INTO public.stock_movements (
            product_id, product_name, product_sku, movement_type, 
            quantity, previous_stock, new_stock, reason, performed_by, status
        )
        VALUES (
            product_record.id, 
            product_record.name, 
            product_record.sku, 
            'creation',
            product_record.stock,
            0,
            product_record.stock,
            'Initial stock creation',
            'system',
            'completed'
        );
    END LOOP;
END $$;

-- Add sample purchase order
DO $$
DECLARE
    supplier_id UUID;
    po_id UUID;
    product_record RECORD;
BEGIN
    -- Get a supplier ID
    SELECT id INTO supplier_id FROM public.suppliers LIMIT 1;
    
    IF supplier_id IS NOT NULL THEN
        -- Create a sample purchase order
        INSERT INTO public.purchase_orders (
            po_number, supplier_id, status, subtotal, total_amount, notes
        )
        VALUES (
            'PO-001', supplier_id, 'pending', 5000.00, 5000.00, 'Sample purchase order'
        )
        RETURNING id INTO po_id;
        
        -- Add purchase order items
        FOR product_record IN 
            SELECT id, name, sku, cost FROM public.products LIMIT 2
        LOOP
            INSERT INTO public.purchase_order_items (
                purchase_order_id, product_id, product_name, product_sku, 
                quantity, unit_price, total_price
            )
            VALUES (
                po_id, product_record.id, product_record.name, product_record.sku,
                10, product_record.cost, product_record.cost * 10
            );
        END LOOP;
    END IF;
END $$;

-- Update product stocks with more realistic values
UPDATE public.products SET 
    stock = CASE 
        WHEN name ILIKE '%laptop%' THEN 5
        WHEN name ILIKE '%chair%' THEN 15
        WHEN name ILIKE '%coffee%' THEN 50
        WHEN name ILIKE '%pen%' THEN 200
        ELSE stock
    END,
    min_stock = CASE 
        WHEN name ILIKE '%laptop%' THEN 2
        WHEN name ILIKE '%chair%' THEN 5
        WHEN name ILIKE '%coffee%' THEN 10
        WHEN name ILIKE '%pen%' THEN 50
        ELSE min_stock
    END;

-- Verify the data
SELECT 'Sample data populated successfully!' as status;
SELECT 'Products: ' || COUNT(*) as summary FROM public.products
UNION ALL
SELECT 'Categories: ' || COUNT(*) FROM public.categories
UNION ALL  
SELECT 'Customers: ' || COUNT(*) FROM public.customers
UNION ALL
SELECT 'Suppliers: ' || COUNT(*) FROM public.suppliers
UNION ALL
SELECT 'Sales: ' || COUNT(*) FROM public.sales;