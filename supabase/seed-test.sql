-- Test Database Seed File
-- Minimal fixtures for testing purposes
-- This file is used specifically for test environment database seeding

-- Clear existing test data (if any)
TRUNCATE TABLE IF EXISTS public.sales_items CASCADE;
TRUNCATE TABLE IF EXISTS public.sales CASCADE;
TRUNCATE TABLE IF EXISTS public.purchase_order_items CASCADE;
TRUNCATE TABLE IF EXISTS public.purchase_orders CASCADE;
TRUNCATE TABLE IF EXISTS public.stock_movements CASCADE;
TRUNCATE TABLE IF EXISTS public.stock_alerts CASCADE;
TRUNCATE TABLE IF EXISTS public.inventory_locations CASCADE;
TRUNCATE TABLE IF EXISTS public.products CASCADE;
TRUNCATE TABLE IF EXISTS public.categories CASCADE;
TRUNCATE TABLE IF EXISTS public.customers CASCADE;
TRUNCATE TABLE IF EXISTS public.suppliers CASCADE;
TRUNCATE TABLE IF EXISTS public.user_profiles CASCADE;

-- Insert test categories
INSERT INTO public.categories (id, name, description, is_active, created_at) VALUES
    ('cat-test-001', 'Test Food & Beverages', 'Test category for food items', true, NOW()),
    ('cat-test-002', 'Test Electronics', 'Test category for electronics', true, NOW()),
    ('cat-test-003', 'Test Supplies', 'Test category for supplies', true, NOW());

-- Insert test products (minimal set for testing)
INSERT INTO public.products (id, name, description, sku, category, price, cost, stock, min_stock, unit, is_active, created_at, updated_at) VALUES
    ('prod-test-001', 'Test Product A', 'Test product for automated testing', 'TEST-001', 'Test Food & Beverages', 25.00, 20.00, 100, 20, 'piece', true, NOW(), NOW()),
    ('prod-test-002', 'Test Product B', 'Another test product', 'TEST-002', 'Test Electronics', 150.00, 120.00, 50, 10, 'piece', true, NOW(), NOW()),
    ('prod-test-003', 'Test Product C', 'Third test product', 'TEST-003', 'Test Supplies', 75.00, 60.00, 200, 50, 'pack', true, NOW(), NOW()),
    ('prod-test-004', 'Low Stock Test', 'Product for testing low stock alerts', 'TEST-LOW-001', 'Test Supplies', 30.00, 25.00, 5, 10, 'piece', true, NOW(), NOW()),
    ('prod-test-005', 'Zero Stock Test', 'Product for testing zero stock scenarios', 'TEST-ZERO-001', 'Test Food & Beverages', 45.00, 35.00, 0, 5, 'piece', true, NOW(), NOW());

-- Insert test customers
INSERT INTO public.customers (id, first_name, last_name, email, phone, address, is_active, created_at, updated_at) VALUES
    ('cust-test-001', 'Test', 'Customer', 'test.customer@example.com', '09123456789', 'Test Address 1', true, NOW(), NOW()),
    ('cust-test-002', 'Jane', 'Doe', 'jane.doe@test.com', '09987654321', 'Test Address 2', true, NOW(), NOW()),
    ('cust-test-003', 'John', 'Smith', 'john.smith@test.com', '09111222333', 'Test Address 3', true, NOW(), NOW());

-- Insert test suppliers
INSERT INTO public.suppliers (id, name, contact_person, email, phone, address, is_active, created_at, updated_at) VALUES
    ('supp-test-001', 'Test Supplier A', 'Supplier Contact A', 'supplier.a@test.com', '09111000001', 'Supplier Address A', true, NOW(), NOW()),
    ('supp-test-002', 'Test Supplier B', 'Supplier Contact B', 'supplier.b@test.com', '09111000002', 'Supplier Address B', true, NOW(), NOW());

-- Insert test inventory locations
INSERT INTO public.inventory_locations (id, name, description, is_active, created_at) VALUES
    ('loc-test-001', 'Test Warehouse A', 'Primary test warehouse', true, NOW()),
    ('loc-test-002', 'Test Store Front', 'Test store front location', true, NOW()),
    ('loc-test-003', 'Test Storage Room', 'Additional test storage', true, NOW());

-- Insert some test stock movements
INSERT INTO public.stock_movements (id, product_id, type, quantity, reason, performed_by, location_id, created_at) VALUES
    ('mov-test-001', 'prod-test-001', 'in', 100, 'Initial stock for testing', 'test-user', 'loc-test-001', NOW()),
    ('mov-test-002', 'prod-test-002', 'in', 50, 'Initial stock for testing', 'test-user', 'loc-test-001', NOW()),
    ('mov-test-003', 'prod-test-003', 'in', 200, 'Initial stock for testing', 'test-user', 'loc-test-001', NOW()),
    ('mov-test-004', 'prod-test-001', 'out', 10, 'Test sale transaction', 'test-user', 'loc-test-001', NOW()),
    ('mov-test-005', 'prod-test-002', 'adjustment', -5, 'Test stock adjustment', 'test-user', 'loc-test-001', NOW());

-- Insert test stock alerts
INSERT INTO public.stock_alerts (id, product_id, type, message, threshold, current_stock, is_resolved, created_at) VALUES
    ('alert-test-001', 'prod-test-004', 'low_stock', 'Test low stock alert', 10, 5, false, NOW()),
    ('alert-test-002', 'prod-test-005', 'out_of_stock', 'Test out of stock alert', 5, 0, false, NOW());

-- Insert a test sale
INSERT INTO public.sales (id, invoice_number, customer_id, subtotal, tax, total, payment_method, status, cashier_id, created_at) VALUES
    ('sale-test-001', 'INV-TEST-001', 'cust-test-001', 100.00, 12.00, 112.00, 'cash', 'completed', 'test-cashier', NOW());

-- Insert test sale items
INSERT INTO public.sales_items (id, sale_id, product_id, quantity, unit_price, total) VALUES
    ('si-test-001', 'sale-test-001', 'prod-test-001', 2, 25.00, 50.00),
    ('si-test-002', 'sale-test-001', 'prod-test-002', 1, 50.00, 50.00);

-- Insert a test purchase order
INSERT INTO public.purchase_orders (id, po_number, supplier_id, status, subtotal, tax, total, expected_date, created_by, created_at) VALUES
    ('po-test-001', 'PO-TEST-001', 'supp-test-001', 'pending', 500.00, 60.00, 560.00, NOW() + INTERVAL '7 days', 'test-user', NOW());

-- Insert test purchase order items
INSERT INTO public.purchase_order_items (id, purchase_order_id, product_id, quantity, unit_cost, total) VALUES
    ('poi-test-001', 'po-test-001', 'prod-test-001', 20, 20.00, 400.00),
    ('poi-test-002', 'po-test-001', 'prod-test-002', 1, 100.00, 100.00);

-- Create a test user profile (if auth user exists)
-- This will be handled by the test environment setup

-- Add some test settings/configurations
-- These can be used for testing various business rules and configurations

-- Analytics/Reporting test data markers
INSERT INTO public.categories (id, name, description, is_active, created_at) VALUES
    ('cat-analytics-test', 'Analytics Test Category', 'Used for testing analytics and reporting', true, NOW())
ON CONFLICT (id) DO NOTHING;

-- Performance testing markers
INSERT INTO public.products (id, name, description, sku, category, price, cost, stock, min_stock, unit, is_active, created_at, updated_at) VALUES
    ('prod-perf-test', 'Performance Test Product', 'Used for performance testing', 'PERF-TEST-001', 'Analytics Test Category', 100.00, 80.00, 1000, 100, 'piece', true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Create indexes for test performance
CREATE INDEX IF NOT EXISTS idx_test_products_sku ON public.products(sku) WHERE sku LIKE 'TEST-%';
CREATE INDEX IF NOT EXISTS idx_test_stock_movements_product ON public.stock_movements(product_id) WHERE created_at > NOW() - INTERVAL '1 day';

-- Test constraints validation data
-- These will be used to test database constraints and business rule validation

COMMIT;
