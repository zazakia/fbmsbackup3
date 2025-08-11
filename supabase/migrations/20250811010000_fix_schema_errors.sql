-- Fix all schema errors reported in console
-- Migration to add missing columns and tables

BEGIN;

-- Fix purchase_orders table - add missing enhanced_status column
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'purchase_orders' 
        AND column_name = 'enhanced_status'
    ) THEN
        ALTER TABLE public.purchase_orders 
        ADD COLUMN enhanced_status TEXT DEFAULT 'draft';
        
        -- Update existing records to have enhanced_status based on status
        UPDATE public.purchase_orders 
        SET enhanced_status = CASE 
            WHEN status = 'draft' THEN 'draft'
            WHEN status = 'sent' THEN 'sent_to_supplier'
            WHEN status = 'received' THEN 'fully_received'
            WHEN status = 'partial' THEN 'partially_received'
            WHEN status = 'cancelled' THEN 'cancelled'
            ELSE 'draft'
        END;
    END IF;
END $$;

-- Fix user_settings table - add missing privacy column
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_settings' 
        AND column_name = 'privacy'
    ) THEN
        ALTER TABLE public.user_settings 
        ADD COLUMN privacy JSONB DEFAULT '{}'::jsonb;
    END IF;
END $$;

-- Create purchase_order_audit_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.purchase_order_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_order_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
    purchase_order_number TEXT NOT NULL,
    action TEXT NOT NULL,
    performed_by UUID REFERENCES auth.users(id),
    performed_by_name TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    old_values JSONB,
    new_values JSONB,
    reason TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create inventory_locations table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.inventory_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default inventory location if none exists
INSERT INTO public.inventory_locations (name, description, is_active)
SELECT 'Main Warehouse', 'Primary inventory location', true
WHERE NOT EXISTS (SELECT 1 FROM public.inventory_locations);

-- Enable RLS on new tables
ALTER TABLE public.purchase_order_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_locations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for purchase_order_audit_logs
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'purchase_order_audit_logs' 
        AND policyname = 'Authenticated users can view audit logs'
    ) THEN
        CREATE POLICY "Authenticated users can view audit logs" 
        ON public.purchase_order_audit_logs 
        FOR SELECT USING (auth.role() = 'authenticated');
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'purchase_order_audit_logs' 
        AND policyname = 'Authenticated users can create audit logs'
    ) THEN
        CREATE POLICY "Authenticated users can create audit logs" 
        ON public.purchase_order_audit_logs 
        FOR INSERT WITH CHECK (auth.role() = 'authenticated');
    END IF;
END $$;

-- Create RLS policies for inventory_locations
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'inventory_locations' 
        AND policyname = 'Authenticated users can manage inventory locations'
    ) THEN
        CREATE POLICY "Authenticated users can manage inventory locations" 
        ON public.inventory_locations 
        FOR ALL USING (auth.role() = 'authenticated');
    END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_po_audit_logs_po_id ON public.purchase_order_audit_logs(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_po_audit_logs_timestamp ON public.purchase_order_audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_po_audit_logs_action ON public.purchase_order_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_inventory_locations_active ON public.inventory_locations(is_active);

-- Add any missing columns to purchase_orders for enhanced workflow
DO $$ BEGIN
    -- Add approval columns if they don't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'purchase_orders' 
        AND column_name = 'approval_required'
    ) THEN
        ALTER TABLE public.purchase_orders 
        ADD COLUMN approval_required BOOLEAN DEFAULT FALSE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'purchase_orders' 
        AND column_name = 'approved_by'
    ) THEN
        ALTER TABLE public.purchase_orders 
        ADD COLUMN approved_by UUID REFERENCES auth.users(id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'purchase_orders' 
        AND column_name = 'approved_at'
    ) THEN
        ALTER TABLE public.purchase_orders 
        ADD COLUMN approved_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_po_enhanced_status ON public.purchase_orders(enhanced_status);
CREATE INDEX IF NOT EXISTS idx_po_approval_required ON public.purchase_orders(approval_required);
CREATE INDEX IF NOT EXISTS idx_po_approved_by ON public.purchase_orders(approved_by);

COMMIT;

-- Log migration completion
DO $$ BEGIN
    RAISE NOTICE 'Schema fix migration completed successfully';
    RAISE NOTICE '✅ Added enhanced_status column to purchase_orders';
    RAISE NOTICE '✅ Added privacy column to user_settings';
    RAISE NOTICE '✅ Created purchase_order_audit_logs table';
    RAISE NOTICE '✅ Created inventory_locations table with default location';
    RAISE NOTICE '✅ Added approval workflow columns to purchase_orders';
    RAISE NOTICE '✅ Created all necessary indexes and RLS policies';
END $$;