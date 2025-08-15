-- Final data fix script that works with existing table structure

-- Add missing columns that the app expects
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS subtotal DECIMAL(15,2) DEFAULT 0;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS province VARCHAR(100);

-- Insert sample customers with correct columns
INSERT INTO public.customers (first_name, last_name, email, phone, address, city, state, province)
VALUES 
    ('Juan', 'dela Cruz', 'juan@example.com', '09123456789', '123 Rizal Street', 'Manila', 'Metro Manila', 'Metro Manila'),
    ('Maria', 'Santos', 'maria@example.com', '09234567890', '456 Bonifacio Ave', 'Quezon City', 'Metro Manila', 'Metro Manila'),
    ('Jose', 'Garcia', 'jose@example.com', '09345678901', '789 Mabini St', 'Makati', 'Metro Manila', 'Metro Manila')
ON CONFLICT (email) DO NOTHING;

-- Insert sample suppliers (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'suppliers') THEN
        INSERT INTO public.suppliers (name, contact_person, email, phone, address, city)
        VALUES 
            ('Tech Solutions Inc.', 'John Smith', 'john@techsolutions.ph', '02-8234-5678', '100 Tech Hub', 'Makati'),
            ('Office Plus Corp.', 'Sarah Lee', 'sarah@officeplus.ph', '02-8345-6789', '200 Business District', 'BGC'),
            ('Food Distributors Ltd.', 'Miguel Torres', 'miguel@fooddist.ph', '02-8456-7890', '300 Market Street', 'Pasig')
        ON CONFLICT (name) DO NOTHING;
    END IF;
END $$;

-- Create a sample sale
DO $$
DECLARE
    customer_id UUID;
    sale_id UUID;
BEGIN
    -- Get a customer ID
    SELECT id INTO customer_id FROM public.customers LIMIT 1;
    
    IF customer_id IS NOT NULL THEN
        INSERT INTO public.sales (customer_id, sale_number, subtotal, total_amount, tax_amount, payment_method, status)
        VALUES (customer_id, 'SALE-001', 1000.00, 1120.00, 120.00, 'cash', 'completed')
        RETURNING id INTO sale_id;
        
        -- Add sale items
        INSERT INTO public.sale_items (sale_id, product_id, product_name, product_sku, quantity, unit_price, total_price)
        SELECT sale_id, id, name, sku, 1, price, price
        FROM public.products 
        LIMIT 2;
    END IF;
END $$;

-- Update all products to have proper category mapping
UPDATE public.products 
SET category = CASE 
    WHEN name ILIKE '%laptop%' OR name ILIKE '%computer%' THEN 'Electronics'
    WHEN name ILIKE '%chair%' OR name ILIKE '%desk%' THEN 'Office Supplies'
    WHEN name ILIKE '%coffee%' OR name ILIKE '%tea%' THEN 'Food & Beverages'
    WHEN name ILIKE '%pen%' OR name ILIKE '%pencil%' THEN 'Office Supplies'
    ELSE 'Electronics'
END;

-- Link products to category IDs
UPDATE public.products 
SET category_id = c.id
FROM public.categories c
WHERE public.products.category = c.name;

-- Ensure products have barcodes and other required fields
UPDATE public.products 
SET 
    barcode = COALESCE(barcode, '123456789' || RIGHT(id::text, 3)),
    tags = COALESCE(tags, ARRAY['sample', 'demo']),
    images = COALESCE(images, ARRAY[]::text[])
WHERE barcode IS NULL OR tags IS NULL OR images IS NULL;

-- Show final status
SELECT 'Database setup completed!' as status;

-- Show data summary
SELECT 'Summary Report:' as report;
SELECT 
    'Products' as table_name, 
    COUNT(*)::text as count,
    '✅ Ready' as status
FROM public.products
UNION ALL
SELECT 
    'Categories', 
    COUNT(*)::text,
    '✅ Ready'
FROM public.categories
UNION ALL
SELECT 
    'Customers', 
    COUNT(*)::text,
    '✅ Ready'
FROM public.customers
UNION ALL
SELECT 
    'Sales', 
    COUNT(*)::text,
    '✅ Ready'
FROM public.sales;

-- Test a sample query that the app would make
SELECT 'Sample Product Query (what app will see):' as test;
SELECT 
    id,
    name,
    sku,
    category,
    price,
    stock,
    is_active,
    created_at
FROM public.products 
WHERE is_active = true
LIMIT 3;