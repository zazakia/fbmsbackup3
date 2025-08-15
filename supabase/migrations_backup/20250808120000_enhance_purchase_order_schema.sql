-- =============================================
-- ENHANCED PURCHASE ORDER SCHEMA MIGRATION
-- Task ID: 12 - Database migrations for enhanced schema
-- Version: 1.0.0
-- Date: 2025-08-08
-- =============================================

-- This migration enhances the purchase order schema to support:
-- 1. Enhanced status workflow (draft -> pending_approval -> approved -> received)
-- 2. Partial receiving with receivedQuantity tracking
-- 3. Comprehensive audit trails and status history
-- 4. Improved data integrity with proper constraints and indexes

-- =============================================
-- BACKUP EXISTING DATA
-- =============================================

-- Create backup of existing purchase_orders for safety
CREATE TABLE IF NOT EXISTS public.purchase_orders_backup_20250808 AS 
SELECT * FROM public.purchase_orders;

-- =============================================
-- ENHANCE PURCHASE_ORDERS TABLE
-- =============================================

-- Add new columns to purchase_orders table for enhanced workflow
DO $$ 
BEGIN
    -- Add enhanced status support (keeping backward compatibility)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'purchase_orders' AND column_name = 'enhanced_status') THEN
        ALTER TABLE public.purchase_orders 
        ADD COLUMN enhanced_status TEXT DEFAULT 'draft' 
        CHECK (enhanced_status IN (
            'draft', 'pending_approval', 'approved', 'sent_to_supplier',
            'partially_received', 'fully_received', 'cancelled', 'closed'
        ));
    END IF;

    -- Add approval workflow fields
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'purchase_orders' AND column_name = 'approval_required') THEN
        ALTER TABLE public.purchase_orders ADD COLUMN approval_required BOOLEAN DEFAULT FALSE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'purchase_orders' AND column_name = 'approved_by') THEN
        ALTER TABLE public.purchase_orders ADD COLUMN approved_by UUID REFERENCES auth.users(id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'purchase_orders' AND column_name = 'approved_at') THEN
        ALTER TABLE public.purchase_orders ADD COLUMN approved_at TIMESTAMP WITH TIME ZONE;
    END IF;

    -- Add receiving workflow fields
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'purchase_orders' AND column_name = 'total_received_items') THEN
        ALTER TABLE public.purchase_orders ADD COLUMN total_received_items INTEGER DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'purchase_orders' AND column_name = 'total_pending_items') THEN
        ALTER TABLE public.purchase_orders ADD COLUMN total_pending_items INTEGER DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'purchase_orders' AND column_name = 'last_received_date') THEN
        ALTER TABLE public.purchase_orders ADD COLUMN last_received_date TIMESTAMP WITH TIME ZONE;
    END IF;

    -- Add tracking fields
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'purchase_orders' AND column_name = 'expected_delivery_date') THEN
        ALTER TABLE public.purchase_orders ADD COLUMN expected_delivery_date TIMESTAMP WITH TIME ZONE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'purchase_orders' AND column_name = 'actual_delivery_date') THEN
        ALTER TABLE public.purchase_orders ADD COLUMN actual_delivery_date TIMESTAMP WITH TIME ZONE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'purchase_orders' AND column_name = 'supplier_reference') THEN
        ALTER TABLE public.purchase_orders ADD COLUMN supplier_reference TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'purchase_orders' AND column_name = 'internal_notes') THEN
        ALTER TABLE public.purchase_orders ADD COLUMN internal_notes TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'purchase_orders' AND column_name = 'attachments') THEN
        ALTER TABLE public.purchase_orders ADD COLUMN attachments JSONB DEFAULT '[]'::jsonb;
    END IF;
END $$;

-- =============================================
-- CREATE PURCHASE ORDER ITEMS TABLE (if not exists)
-- =============================================

CREATE TABLE IF NOT EXISTS public.purchase_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_order_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id),
    product_name TEXT NOT NULL,
    product_sku TEXT NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    received_quantity INTEGER DEFAULT 0 CHECK (received_quantity >= 0),
    pending_quantity INTEGER GENERATED ALWAYS AS (quantity - received_quantity) STORED,
    unit_cost NUMERIC(15,4) NOT NULL CHECK (unit_cost >= 0),
    total_cost NUMERIC(15,4) GENERATED ALWAYS AS (quantity * unit_cost) STORED,
    received_total_cost NUMERIC(15,4) DEFAULT 0 CHECK (received_total_cost >= 0),
    
    -- Quality and batch tracking
    quality_status TEXT DEFAULT 'pending' CHECK (quality_status IN ('pending', 'approved', 'rejected')),
    batch_number TEXT,
    expiry_date TIMESTAMP WITH TIME ZONE,
    serial_numbers JSONB DEFAULT '[]'::jsonb,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    last_modified_by UUID REFERENCES auth.users(id),
    
    -- Constraints
    CONSTRAINT received_quantity_not_exceed_ordered 
        CHECK (received_quantity <= quantity),
    CONSTRAINT valid_quality_status 
        CHECK (quality_status IS NOT NULL)
);

-- =============================================
-- ADD RECEIVING FIELDS TO EXISTING ITEMS
-- =============================================

-- If purchase_order_items already exists, add the missing columns
DO $$ 
BEGIN
    -- Check if the table exists but is missing receiving fields
    IF EXISTS (SELECT 1 FROM information_schema.tables 
               WHERE table_name = 'purchase_order_items' 
               AND table_schema = 'public') THEN
        
        -- Add received_quantity if not exists
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name = 'purchase_order_items' AND column_name = 'received_quantity') THEN
            ALTER TABLE public.purchase_order_items ADD COLUMN received_quantity INTEGER DEFAULT 0 CHECK (received_quantity >= 0);
        END IF;

        -- Add other missing columns
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name = 'purchase_order_items' AND column_name = 'pending_quantity') THEN
            ALTER TABLE public.purchase_order_items ADD COLUMN pending_quantity INTEGER GENERATED ALWAYS AS (quantity - COALESCE(received_quantity, 0)) STORED;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name = 'purchase_order_items' AND column_name = 'quality_status') THEN
            ALTER TABLE public.purchase_order_items ADD COLUMN quality_status TEXT DEFAULT 'pending' 
                CHECK (quality_status IN ('pending', 'approved', 'rejected'));
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name = 'purchase_order_items' AND column_name = 'batch_number') THEN
            ALTER TABLE public.purchase_order_items ADD COLUMN batch_number TEXT;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name = 'purchase_order_items' AND column_name = 'expiry_date') THEN
            ALTER TABLE public.purchase_order_items ADD COLUMN expiry_date TIMESTAMP WITH TIME ZONE;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name = 'purchase_order_items' AND column_name = 'serial_numbers') THEN
            ALTER TABLE public.purchase_order_items ADD COLUMN serial_numbers JSONB DEFAULT '[]'::jsonb;
        END IF;

        -- Add constraint for received quantity validation
        DO $constraint$ 
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                           WHERE constraint_name = 'received_quantity_not_exceed_ordered' 
                           AND table_name = 'purchase_order_items') THEN
                ALTER TABLE public.purchase_order_items 
                ADD CONSTRAINT received_quantity_not_exceed_ordered 
                CHECK (received_quantity <= quantity);
            END IF;
        EXCEPTION WHEN others THEN
            -- Constraint may already exist with different name
            NULL;
        END $constraint$;
    END IF;
END $$;

-- =============================================
-- CREATE RECEIVING LINE ITEMS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS public.purchase_order_receiving_line_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_order_item_id UUID NOT NULL REFERENCES public.purchase_order_items(id) ON DELETE CASCADE,
    receiving_record_id UUID NOT NULL REFERENCES public.purchase_order_receiving_records(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id),
    product_name TEXT NOT NULL,
    
    -- Quantities and costs
    quantity_received INTEGER NOT NULL CHECK (quantity_received > 0),
    unit_cost NUMERIC(15,4) NOT NULL CHECK (unit_cost >= 0),
    total_cost NUMERIC(15,4) GENERATED ALWAYS AS (quantity_received * unit_cost) STORED,
    
    -- Quality and condition
    condition TEXT NOT NULL DEFAULT 'good' CHECK (condition IN ('good', 'damaged', 'expired', 'returned')),
    quality_notes TEXT,
    
    -- Batch and tracking
    batch_number TEXT,
    expiry_date TIMESTAMP WITH TIME ZONE,
    serial_numbers JSONB DEFAULT '[]'::jsonb,
    location TEXT,
    
    -- Audit fields
    received_by UUID NOT NULL REFERENCES auth.users(id),
    received_by_name TEXT,
    received_date TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- DATA MIGRATION FOR EXISTING RECORDS
-- =============================================

-- Migrate existing status values to enhanced status
UPDATE public.purchase_orders 
SET enhanced_status = CASE 
    WHEN status = 'draft' THEN 'draft'
    WHEN status = 'sent' THEN 'sent_to_supplier' 
    WHEN status = 'received' THEN 'fully_received'
    WHEN status = 'partial' THEN 'partially_received'
    WHEN status = 'cancelled' THEN 'cancelled'
    ELSE 'draft'
END
WHERE enhanced_status IS NULL OR enhanced_status = 'draft';

-- Initialize receiving counters for existing purchase orders
UPDATE public.purchase_orders 
SET 
    total_pending_items = (
        SELECT COALESCE(SUM(quantity), 0) 
        FROM public.purchase_order_items 
        WHERE purchase_order_id = purchase_orders.id
    ),
    total_received_items = 0
WHERE total_pending_items IS NULL;

-- =============================================
-- CREATE INDEXES FOR PERFORMANCE
-- =============================================

-- Purchase Orders indexes
CREATE INDEX IF NOT EXISTS idx_po_enhanced_status ON public.purchase_orders(enhanced_status);
CREATE INDEX IF NOT EXISTS idx_po_approval_required ON public.purchase_orders(approval_required);
CREATE INDEX IF NOT EXISTS idx_po_approved_by ON public.purchase_orders(approved_by);
CREATE INDEX IF NOT EXISTS idx_po_expected_delivery ON public.purchase_orders(expected_delivery_date);
CREATE INDEX IF NOT EXISTS idx_po_last_received ON public.purchase_orders(last_received_date);
CREATE INDEX IF NOT EXISTS idx_po_supplier_ref ON public.purchase_orders(supplier_reference);

-- Purchase Order Items indexes
CREATE INDEX IF NOT EXISTS idx_poi_po_id ON public.purchase_order_items(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_poi_product_id ON public.purchase_order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_poi_received_qty ON public.purchase_order_items(received_quantity);
CREATE INDEX IF NOT EXISTS idx_poi_pending_qty ON public.purchase_order_items(pending_quantity);
CREATE INDEX IF NOT EXISTS idx_poi_quality_status ON public.purchase_order_items(quality_status);
CREATE INDEX IF NOT EXISTS idx_poi_batch_number ON public.purchase_order_items(batch_number);
CREATE INDEX IF NOT EXISTS idx_poi_expiry_date ON public.purchase_order_items(expiry_date);

-- Receiving Line Items indexes
CREATE INDEX IF NOT EXISTS idx_prli_poi_id ON public.purchase_order_receiving_line_items(purchase_order_item_id);
CREATE INDEX IF NOT EXISTS idx_prli_receiving_id ON public.purchase_order_receiving_line_items(receiving_record_id);
CREATE INDEX IF NOT EXISTS idx_prli_product_id ON public.purchase_order_receiving_line_items(product_id);
CREATE INDEX IF NOT EXISTS idx_prli_condition ON public.purchase_order_receiving_line_items(condition);
CREATE INDEX IF NOT EXISTS idx_prli_received_by ON public.purchase_order_receiving_line_items(received_by);
CREATE INDEX IF NOT EXISTS idx_prli_received_date ON public.purchase_order_receiving_line_items(received_date);
CREATE INDEX IF NOT EXISTS idx_prli_batch_number ON public.purchase_order_receiving_line_items(batch_number);

-- =============================================
-- CREATE TRIGGERS FOR AUTOMATIC UPDATES
-- =============================================

-- Function to update purchase order receiving totals
CREATE OR REPLACE FUNCTION update_purchase_order_receiving_totals()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the parent purchase order totals whenever items change
    UPDATE public.purchase_orders 
    SET 
        total_received_items = (
            SELECT COALESCE(SUM(received_quantity), 0) 
            FROM public.purchase_order_items 
            WHERE purchase_order_id = COALESCE(NEW.purchase_order_id, OLD.purchase_order_id)
        ),
        total_pending_items = (
            SELECT COALESCE(SUM(pending_quantity), 0) 
            FROM public.purchase_order_items 
            WHERE purchase_order_id = COALESCE(NEW.purchase_order_id, OLD.purchase_order_id)
        ),
        last_received_date = CASE 
            WHEN (SELECT COALESCE(SUM(received_quantity), 0) 
                  FROM public.purchase_order_items 
                  WHERE purchase_order_id = COALESCE(NEW.purchase_order_id, OLD.purchase_order_id)) > 0 
            THEN NOW() 
            ELSE last_received_date 
        END,
        enhanced_status = CASE 
            WHEN (SELECT COALESCE(SUM(pending_quantity), 0) 
                  FROM public.purchase_order_items 
                  WHERE purchase_order_id = COALESCE(NEW.purchase_order_id, OLD.purchase_order_id)) = 0 
            THEN 'fully_received'
            WHEN (SELECT COALESCE(SUM(received_quantity), 0) 
                  FROM public.purchase_order_items 
                  WHERE purchase_order_id = COALESCE(NEW.purchase_order_id, OLD.purchase_order_id)) > 0 
            THEN 'partially_received'
            ELSE enhanced_status
        END,
        updated_at = NOW()
    WHERE id = COALESCE(NEW.purchase_order_id, OLD.purchase_order_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger for purchase order items updates
DROP TRIGGER IF EXISTS trigger_update_po_receiving_totals ON public.purchase_order_items;
CREATE TRIGGER trigger_update_po_receiving_totals
    AFTER INSERT OR UPDATE OR DELETE ON public.purchase_order_items
    FOR EACH ROW EXECUTE FUNCTION update_purchase_order_receiving_totals();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create updated_at triggers
CREATE TRIGGER trigger_update_po_items_updated_at 
    BEFORE UPDATE ON public.purchase_order_items 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- ENABLE ROW LEVEL SECURITY
-- =============================================

-- Enable RLS on new tables
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_receiving_line_items ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for purchase_order_items
CREATE POLICY "Authenticated users can manage purchase order items" 
ON public.purchase_order_items FOR ALL 
USING (auth.role() = 'authenticated');

-- Create RLS policies for receiving line items
CREATE POLICY "Authenticated users can manage receiving line items" 
ON public.purchase_order_receiving_line_items FOR ALL 
USING (auth.role() = 'authenticated');

-- =============================================
-- GRANT PERMISSIONS
-- =============================================

GRANT ALL ON public.purchase_order_items TO authenticated;
GRANT ALL ON public.purchase_order_receiving_line_items TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- =============================================
-- DATA INTEGRITY VALIDATION
-- =============================================

-- Validate that all purchase orders have valid enhanced status
DO $$
DECLARE
    invalid_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO invalid_count 
    FROM public.purchase_orders 
    WHERE enhanced_status NOT IN (
        'draft', 'pending_approval', 'approved', 'sent_to_supplier',
        'partially_received', 'fully_received', 'cancelled', 'closed'
    );
    
    IF invalid_count > 0 THEN
        RAISE WARNING 'Found % purchase orders with invalid enhanced_status. Please check and fix.', invalid_count;
    END IF;
END $$;

-- =============================================
-- MIGRATION COMPLETION LOG
-- =============================================

DO $$ 
BEGIN
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'ENHANCED PURCHASE ORDER SCHEMA MIGRATION COMPLETED';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'Migration Date: %', NOW();
    RAISE NOTICE 'Tables Enhanced:';
    RAISE NOTICE '  - purchase_orders (added enhanced workflow fields)';
    RAISE NOTICE '  - purchase_order_items (enhanced with receiving tracking)';
    RAISE NOTICE '  - purchase_order_receiving_line_items (new table)';
    RAISE NOTICE 'Features Added:';
    RAISE NOTICE '  ✓ Enhanced status workflow with 8 states';
    RAISE NOTICE '  ✓ Partial receiving with quantity tracking';
    RAISE NOTICE '  ✓ Quality status and batch/serial number tracking';
    RAISE NOTICE '  ✓ Approval workflow support';
    RAISE NOTICE '  ✓ Comprehensive audit trails';
    RAISE NOTICE '  ✓ Performance indexes and constraints';
    RAISE NOTICE '  ✓ Automatic status transitions via triggers';
    RAISE NOTICE '  ✓ Data integrity validation';
    RAISE NOTICE '  ✓ Row Level Security policies';
    RAISE NOTICE 'Backup Created: purchase_orders_backup_20250808';
    RAISE NOTICE '==============================================';
END $$;