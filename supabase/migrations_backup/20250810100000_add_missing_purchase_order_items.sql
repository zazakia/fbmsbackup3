-- Add missing purchase_order_items table and related tables
-- This fixes the PGRST200 error: "Could not find a relationship between 'purchase_orders' and 'purchase_order_items'"

-- Create purchase_order_items table
CREATE TABLE IF NOT EXISTS public.purchase_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_order_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id),
    product_name TEXT NOT NULL,
    product_sku TEXT NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    received_quantity INTEGER DEFAULT 0 CHECK (received_quantity >= 0),
    pending_quantity INTEGER GENERATED ALWAYS AS (quantity - received_quantity) STORED,
    unit_cost NUMERIC(15,2) NOT NULL CHECK (unit_cost >= 0),
    total_cost NUMERIC(15,2) GENERATED ALWAYS AS (quantity * unit_cost) STORED,
    
    -- Audit fields
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),
    
    -- Constraints
    CONSTRAINT received_quantity_not_exceed_ordered 
        CHECK (received_quantity <= quantity)
);

-- Create purchase_order_receiving_records table (referenced by the enhanced schema)
CREATE TABLE IF NOT EXISTS public.purchase_order_receiving_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_order_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
    received_by UUID NOT NULL REFERENCES auth.users(id),
    received_by_name TEXT,
    received_date TIMESTAMPTZ NOT NULL DEFAULT now(),
    notes TEXT,
    status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_poi_purchase_order_id ON public.purchase_order_items(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_poi_product_id ON public.purchase_order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_poi_received_quantity ON public.purchase_order_items(received_quantity);

CREATE INDEX IF NOT EXISTS idx_porr_purchase_order_id ON public.purchase_order_receiving_records(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_porr_received_by ON public.purchase_order_receiving_records(received_by);
CREATE INDEX IF NOT EXISTS idx_porr_received_date ON public.purchase_order_receiving_records(received_date);

-- Enable Row Level Security
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_receiving_records ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Authenticated users can manage purchase order items" 
ON public.purchase_order_items FOR ALL 
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage receiving records" 
ON public.purchase_order_receiving_records FOR ALL 
USING (auth.role() = 'authenticated');

-- Grant permissions
GRANT ALL ON public.purchase_order_items TO authenticated;
GRANT ALL ON public.purchase_order_receiving_records TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER trigger_update_poi_updated_at 
    BEFORE UPDATE ON public.purchase_order_items 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Migration completion log
DO $$ 
BEGIN
    RAISE NOTICE '✅ Added missing purchase_order_items table';
    RAISE NOTICE '✅ Added purchase_order_receiving_records table'; 
    RAISE NOTICE '✅ Created proper foreign key relationships';
    RAISE NOTICE '✅ Added indexes and RLS policies';
    RAISE NOTICE '✅ Fixed PGRST200 relationship error';
END $$;