-- Fix customers table by adding missing columns
-- This script adds all the columns that the frontend API expects but are missing from the database

-- Add missing columns to the customers table
ALTER TABLE public.customers 
ADD COLUMN IF NOT EXISTS province VARCHAR(100),
ADD COLUMN IF NOT EXISTS zip_code VARCHAR(20),
ADD COLUMN IF NOT EXISTS credit_limit DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS current_balance DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_purchases DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS customer_type VARCHAR(50) DEFAULT 'individual',
ADD COLUMN IF NOT EXISTS tax_id VARCHAR(50),
ADD COLUMN IF NOT EXISTS business_name VARCHAR(200),
ADD COLUMN IF NOT EXISTS birthday TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS preferred_payment_method VARCHAR(50),
ADD COLUMN IF NOT EXISTS discount_percentage DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS loyalty_points INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_purchase TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_contact TIMESTAMP WITH TIME ZONE;

-- Update existing records to have default values
UPDATE public.customers 
SET 
    province = state,
    zip_code = postal_code,
    is_active = true,
    customer_type = 'individual',
    tags = '{}'
WHERE province IS NULL OR zip_code IS NULL OR is_active IS NULL OR customer_type IS NULL OR tags IS NULL;

-- Create customer_contacts table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.customer_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL DEFAULT 'general',
    subject VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    follow_up_date TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_customers_is_active ON public.customers(is_active);
CREATE INDEX IF NOT EXISTS idx_customers_customer_type ON public.customers(customer_type);
CREATE INDEX IF NOT EXISTS idx_customers_business_name ON public.customers(business_name);
CREATE INDEX IF NOT EXISTS idx_customers_last_purchase ON public.customers(last_purchase);
CREATE INDEX IF NOT EXISTS idx_customer_contacts_customer_id ON public.customer_contacts(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_contacts_status ON public.customer_contacts(status);

-- Create trigger for customer_contacts updated_at
CREATE TRIGGER update_customer_contacts_updated_at 
    BEFORE UPDATE ON public.customer_contacts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS on customer_contacts
ALTER TABLE public.customer_contacts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for customer_contacts
CREATE POLICY "Authenticated users can manage customer contacts" 
    ON public.customer_contacts FOR ALL USING (auth.role() = 'authenticated');

-- Grant permissions
GRANT ALL ON public.customer_contacts TO authenticated;

-- Verify the table structure
SELECT 'customers' as table_name, column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'customers' AND table_schema = 'public'
ORDER BY ordinal_position;

SELECT 'customer_contacts' as table_name, column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'customer_contacts' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Insert a test customer to verify everything works
INSERT INTO public.customers (
    first_name, 
    last_name, 
    email, 
    phone, 
    address, 
    city, 
    province, 
    zip_code, 
    credit_limit, 
    current_balance, 
    total_purchases, 
    is_active, 
    customer_type, 
    business_name, 
    notes, 
    tags, 
    preferred_payment_method, 
    discount_percentage, 
    loyalty_points
) VALUES (
    'Test', 
    'Customer', 
    'test@example.com', 
    '+63123456789', 
    '123 Test Street', 
    'Manila', 
    'Metro Manila', 
    '1234', 
    1000.00, 
    0.00, 
    0.00, 
    true, 
    'individual', 
    NULL, 
    'Test customer for verification', 
    ARRAY['test', 'verification'], 
    'cash', 
    0.00, 
    0
) ON CONFLICT (email) DO NOTHING;

SELECT 'Customers table and customer_contacts table have been updated successfully!' as message; 