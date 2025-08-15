-- Insert sample products
INSERT INTO public.products (name, description, sku, category, price, cost, stock, min_stock, unit, is_active) VALUES
    ('Lucky Me! Pancit Canton Original', 'Instant pancit canton noodles - Original flavor', 'LM-PC-001', 'Food & Beverages', 15.00, 12.00, 500, 100, 'pack', true),
    ('Lucky Me! Pancit Canton Hot Chili', 'Instant pancit canton noodles - Hot Chili flavor', 'LM-PC-002', 'Food & Beverages', 15.00, 12.00, 500, 100, 'pack', true),
    ('Lucky Me! Pancit Canton Calamansi', 'Instant pancit canton noodles - Calamansi flavor', 'LM-PC-003', 'Food & Beverages', 15.00, 12.00, 500, 100, 'pack', true),
    ('Lucky Me! Instant Noodles Chicken', 'Instant noodles - Chicken flavor', 'LM-IN-001', 'Food & Beverages', 10.00, 8.00, 500, 100, 'pack', true),
    ('Lucky Me! Instant Noodles Beef', 'Instant noodles - Beef flavor', 'LM-IN-002', 'Food & Beverages', 10.00, 8.00, 500, 100, 'pack', true),
    ('Lucky Me! Instant Noodles Bulalo', 'Instant noodles - Bulalo flavor', 'LM-IN-003', 'Food & Beverages', 10.00, 8.00, 500, 100, 'pack', true),
    ('Lucky Me! Supreme Pinoy Chicken', 'Premium instant noodles - Pinoy Chicken flavor', 'LM-SP-001', 'Food & Beverages', 20.00, 16.00, 300, 50, 'pack', true),
    ('Lucky Me! Supreme Beef Mami', 'Premium instant noodles - Beef Mami flavor', 'LM-SP-002', 'Food & Beverages', 20.00, 16.00, 300, 50, 'pack', true),
    ('Lucky Me! Supreme La Paz Batchoy', 'Premium instant noodles - La Paz Batchoy flavor', 'LM-SP-003', 'Food & Beverages', 20.00, 16.00, 300, 50, 'pack', true)
ON CONFLICT (sku) DO NOTHING;