-- =============================================
-- Create Stock Movements Table (Inventory Ledger)
-- =============================================

CREATE TABLE IF NOT EXISTS public.stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    change INTEGER NOT NULL,
    type VARCHAR(30) NOT NULL, -- e.g. 'sale', 'purchase', 'adjustment', 'return'
    reference_id UUID,         -- Related sale/purchase/adjustment ID (nullable)
    user_id UUID REFERENCES public.users(id),
    reason TEXT,
    resulting_stock INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast lookup by product
CREATE INDEX IF NOT EXISTS idx_stock_movements_product_id ON public.stock_movements(product_id);
-- Index for fast lookup by type
CREATE INDEX IF NOT EXISTS idx_stock_movements_type ON public.stock_movements(type);
-- Index for fast lookup by created_at
CREATE INDEX IF NOT EXISTS idx_stock_movements_created_at ON public.stock_movements(created_at);

-- Enable Row Level Security
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to manage stock movements
CREATE POLICY "Authenticated users can manage stock movements" ON public.stock_movements FOR ALL USING (auth.role() = 'authenticated'); 