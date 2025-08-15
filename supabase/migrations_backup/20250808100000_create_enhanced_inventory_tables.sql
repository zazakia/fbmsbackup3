-- Create enhanced inventory tables with comprehensive audit trail
-- This migration creates tables for detailed product history tracking

-- =============================================
-- CREATE INVENTORY LOCATIONS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.inventory_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL CHECK (type IN ('warehouse', 'store', 'display', 'storage')),
    address TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for inventory_locations
CREATE INDEX IF NOT EXISTS idx_inventory_locations_type ON public.inventory_locations(type);
CREATE INDEX IF NOT EXISTS idx_inventory_locations_active ON public.inventory_locations(is_active);

-- Enable Row Level Security
ALTER TABLE public.inventory_locations ENABLE ROW LEVEL SECURITY;

-- =============================================
-- CREATE TRANSFER SLIPS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.transfer_slips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transfer_number TEXT UNIQUE NOT NULL,
    from_location_id UUID REFERENCES public.inventory_locations(id),
    from_location_name TEXT,
    to_location_id UUID REFERENCES public.inventory_locations(id),
    to_location_name TEXT,
    items JSONB NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('draft', 'pending', 'approved', 'issued', 'in_transit', 'partially_received', 'received', 'completed', 'cancelled', 'rejected')),
    requested_by UUID REFERENCES auth.users(id),
    requested_by_name TEXT,
    approved_by UUID REFERENCES auth.users(id),
    approved_by_name TEXT,
    issued_by UUID REFERENCES auth.users(id),
    issued_by_name TEXT,
    received_by UUID REFERENCES auth.users(id),
    received_by_name TEXT,
    transfer_date TIMESTAMP WITH TIME ZONE NOT NULL,
    expected_delivery_date TIMESTAMP WITH TIME ZONE,
    actual_delivery_date TIMESTAMP WITH TIME ZONE,
    issued_date TIMESTAMP WITH TIME ZONE,
    received_date TIMESTAMP WITH TIME ZONE,
    vehicle_info TEXT,
    driver_info TEXT,
    notes TEXT,
    attachments TEXT[],
    total_items INTEGER NOT NULL,
    total_quantity NUMERIC NOT NULL,
    total_value NUMERIC NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for transfer_slips
CREATE INDEX IF NOT EXISTS idx_transfer_slips_transfer_number ON public.transfer_slips(transfer_number);
CREATE INDEX IF NOT EXISTS idx_transfer_slips_from_location ON public.transfer_slips(from_location_id);
CREATE INDEX IF NOT EXISTS idx_transfer_slips_to_location ON public.transfer_slips(to_location_id);
CREATE INDEX IF NOT EXISTS idx_transfer_slips_status ON public.transfer_slips(status);
CREATE INDEX IF NOT EXISTS idx_transfer_slips_transfer_date ON public.transfer_slips(transfer_date);
CREATE INDEX IF NOT EXISTS idx_transfer_slips_requested_by ON public.transfer_slips(requested_by);

-- Enable Row Level Security
ALTER TABLE public.transfer_slips ENABLE ROW LEVEL SECURITY;

-- =============================================
-- CREATE STOCK MOVEMENTS TABLE (Enhanced)
-- =============================================
-- Drop existing stock_movements table if it exists
DROP TABLE IF EXISTS public.stock_movements CASCADE;

-- Create enhanced stock_movements table
CREATE TABLE IF NOT EXISTS public.stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    product_name TEXT NOT NULL,
    product_sku TEXT,
    type TEXT NOT NULL CHECK (type IN ('stock_in', 'stock_out', 'sale', 'adjustment_in', 'adjustment_out', 'transfer_out', 'transfer_in', 'return_in', 'return_out', 'damage_out', 'expired_out', 'shrinkage', 'recount', 'initial_stock', 'purchase')),
    quantity NUMERIC NOT NULL,
    previous_stock NUMERIC NOT NULL,
    new_stock NUMERIC NOT NULL,
    unit_cost NUMERIC,
    total_value NUMERIC,
    reason TEXT NOT NULL,
    reference_number TEXT,
    reference_type TEXT CHECK (reference_type IN ('sale', 'purchase', 'adjustment', 'transfer', 'return', 'manual')),
    reference_id UUID,
    location_id UUID REFERENCES public.inventory_locations(id),
    location_name TEXT,
    from_location_id UUID REFERENCES public.inventory_locations(id),
    from_location_name TEXT,
    to_location_id UUID REFERENCES public.inventory_locations(id),
    to_location_name TEXT,
    batch_number TEXT,
    expiry_date TIMESTAMP WITH TIME ZONE,
    performed_by UUID REFERENCES auth.users(id) NOT NULL,
    performed_by_name TEXT,
    approved_by UUID REFERENCES auth.users(id),
    approved_by_name TEXT,
    notes TEXT,
    attachments TEXT[],
    status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'completed', 'cancelled', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for stock_movements
CREATE INDEX IF NOT EXISTS idx_stock_movements_product_id ON public.stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_type ON public.stock_movements(type);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created_at ON public.stock_movements(created_at);
CREATE INDEX IF NOT EXISTS idx_stock_movements_reference_id ON public.stock_movements(reference_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_location ON public.stock_movements(location_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_from_location ON public.stock_movements(from_location_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_to_location ON public.stock_movements(to_location_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_batch_number ON public.stock_movements(batch_number);
CREATE INDEX IF NOT EXISTS idx_stock_movements_status ON public.stock_movements(status);

-- Enable Row Level Security
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

-- =============================================
-- CREATE RLS POLICIES
-- =============================================

-- Inventory locations policies
CREATE POLICY "Users can view inventory locations" ON public.inventory_locations
    FOR SELECT USING (true);

CREATE POLICY "Managers can manage inventory locations" ON public.inventory_locations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.business_users 
            WHERE business_users.id = auth.uid() 
            AND business_users.role IN ('admin', 'manager')
        )
    );

-- Transfer slips policies
CREATE POLICY "Users can view transfer slips from same business" ON public.transfer_slips
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.business_users bu
            WHERE bu.id = auth.uid()
            AND bu.business_id IS NOT NULL
        )
    );

CREATE POLICY "Users can create transfer slips" ON public.transfer_slips
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.business_users bu
            WHERE bu.id = auth.uid()
            AND bu.business_id IS NOT NULL
        )
    );

CREATE POLICY "Users can update own transfer slips" ON public.transfer_slips
    FOR UPDATE USING (
        requested_by = auth.uid() OR 
        EXISTS (
            SELECT 1 FROM public.business_users bu
            WHERE bu.id = auth.uid()
            AND bu.role IN ('admin', 'manager')
        )
    );

CREATE POLICY "Admins can delete transfer slips" ON public.transfer_slips
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.business_users bu
            WHERE bu.id = auth.uid()
            AND bu.role = 'admin'
        )
    );

-- Stock movements policies
CREATE POLICY "Users can view stock movements from same business" ON public.stock_movements
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.products p
            WHERE p.id = product_id
            AND p.business_id = (
                SELECT business_id FROM public.business_users WHERE id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can create stock movements" ON public.stock_movements
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.business_users bu
            WHERE bu.id = auth.uid()
            AND bu.business_id IS NOT NULL
        )
    );

CREATE POLICY "Managers can update stock movements" ON public.stock_movements
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.business_users bu
            WHERE bu.id = auth.uid()
            AND bu.role IN ('admin', 'manager')
        )
    );

CREATE POLICY "Admins can delete stock movements" ON public.stock_movements
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.business_users bu
            WHERE bu.id = auth.uid()
            AND bu.role = 'admin'
        )
    );

-- =============================================
-- ADD FOREIGN KEY CONSTRAINTS
-- =============================================

-- Add foreign key constraint to link stock_movements to business
-- This requires adding business_id to products table if not present
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES public.businesses(id);

-- Create trigger to update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_inventory_locations_updated_at 
    BEFORE UPDATE ON public.inventory_locations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transfer_slips_updated_at 
    BEFORE UPDATE ON public.transfer_slips 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stock_movements_updated_at 
    BEFORE UPDATE ON public.stock_movements 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- INITIAL DATA SETUP
-- =============================================

-- Insert default inventory location if not exists
INSERT INTO public.inventory_locations (name, type, description, is_active)
SELECT 'Main Warehouse', 'warehouse', 'Primary inventory storage location', true
WHERE NOT EXISTS (SELECT 1 FROM public.inventory_locations WHERE name = 'Main Warehouse');

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant execute permission on the update function
GRANT EXECUTE ON FUNCTION update_updated_at_column() TO authenticated;

-- Add comments for documentation
COMMENT ON TABLE public.inventory_locations IS 'Stores information about different inventory locations (warehouses, stores, etc.)';
COMMENT ON TABLE public.transfer_slips IS 'Tracks inventory transfers between locations with complete audit trail';
COMMENT ON TABLE public.stock_movements IS 'Comprehensive ledger of all inventory movements with detailed audit information';