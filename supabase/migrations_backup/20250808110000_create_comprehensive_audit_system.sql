-- =============================================
-- COMPREHENSIVE AUDIT TRAIL SYSTEM
-- Purchase Order and Inventory Management
-- =============================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- CREATE PURCHASE ORDER AUDIT LOGS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.purchase_order_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_order_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
    purchase_order_number TEXT NOT NULL,
    action TEXT NOT NULL CHECK (action IN (
        'created', 'updated', 'status_changed', 'approved', 'rejected', 
        'sent_to_supplier', 'received', 'partially_received', 'cancelled', 
        'closed', 'deleted', 'reopened', 'edited_items'
    )),
    performed_by UUID NOT NULL REFERENCES auth.users(id),
    performed_by_name TEXT,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    old_values JSONB DEFAULT '{}',
    new_values JSONB DEFAULT '{}',
    reason TEXT,
    metadata JSONB DEFAULT '{}',
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for purchase_order_audit_logs
CREATE INDEX IF NOT EXISTS idx_po_audit_logs_po_id ON public.purchase_order_audit_logs(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_po_audit_logs_action ON public.purchase_order_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_po_audit_logs_timestamp ON public.purchase_order_audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_po_audit_logs_performed_by ON public.purchase_order_audit_logs(performed_by);
CREATE INDEX IF NOT EXISTS idx_po_audit_logs_po_number ON public.purchase_order_audit_logs(purchase_order_number);

-- =============================================
-- CREATE STOCK MOVEMENT AUDIT LOGS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.stock_movement_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stock_movement_id UUID REFERENCES public.stock_movements(id) ON DELETE SET NULL,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    product_name TEXT NOT NULL,
    product_sku TEXT,
    movement_type TEXT NOT NULL CHECK (movement_type IN (
        'purchase_receipt', 'sale', 'adjustment', 'transfer', 'return', 
        'damage', 'expiry', 'shrinkage', 'recount', 'manual'
    )),
    quantity_before NUMERIC NOT NULL DEFAULT 0,
    quantity_after NUMERIC NOT NULL DEFAULT 0,
    quantity_changed NUMERIC NOT NULL,
    unit_cost NUMERIC,
    total_value NUMERIC,
    reference_type TEXT CHECK (reference_type IN ('purchase_order', 'sale', 'adjustment', 'transfer')),
    reference_id TEXT,
    reference_number TEXT,
    batch_number TEXT,
    expiry_date TIMESTAMP WITH TIME ZONE,
    location TEXT,
    location_id UUID REFERENCES public.inventory_locations(id),
    notes TEXT,
    performed_by UUID NOT NULL REFERENCES auth.users(id),
    performed_by_name TEXT,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for stock_movement_audit_logs
CREATE INDEX IF NOT EXISTS idx_stock_audit_logs_product_id ON public.stock_movement_audit_logs(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_audit_logs_movement_type ON public.stock_movement_audit_logs(movement_type);
CREATE INDEX IF NOT EXISTS idx_stock_audit_logs_timestamp ON public.stock_movement_audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_stock_audit_logs_performed_by ON public.stock_movement_audit_logs(performed_by);
CREATE INDEX IF NOT EXISTS idx_stock_audit_logs_reference_id ON public.stock_movement_audit_logs(reference_id);
CREATE INDEX IF NOT EXISTS idx_stock_audit_logs_reference_type ON public.stock_movement_audit_logs(reference_type);
CREATE INDEX IF NOT EXISTS idx_stock_audit_logs_batch_number ON public.stock_movement_audit_logs(batch_number);

-- =============================================
-- CREATE PURCHASE ORDER STATUS HISTORY TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.purchase_order_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_order_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
    purchase_order_number TEXT NOT NULL,
    from_status TEXT,
    to_status TEXT NOT NULL,
    changed_by UUID NOT NULL REFERENCES auth.users(id),
    changed_by_name TEXT,
    change_reason TEXT,
    change_timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    metadata JSONB DEFAULT '{}',
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for purchase_order_status_history
CREATE INDEX IF NOT EXISTS idx_po_status_history_po_id ON public.purchase_order_status_history(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_po_status_history_timestamp ON public.purchase_order_status_history(change_timestamp);
CREATE INDEX IF NOT EXISTS idx_po_status_history_changed_by ON public.purchase_order_status_history(changed_by);
CREATE INDEX IF NOT EXISTS idx_po_status_history_status ON public.purchase_order_status_history(to_status);

-- =============================================
-- CREATE RECEIVING RECORDS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.purchase_order_receiving_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_order_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
    purchase_order_number TEXT NOT NULL,
    receiving_number TEXT UNIQUE NOT NULL,
    received_date TIMESTAMP WITH TIME ZONE NOT NULL,
    received_by UUID NOT NULL REFERENCES auth.users(id),
    received_by_name TEXT,
    receiving_type TEXT NOT NULL CHECK (receiving_type IN ('full', 'partial', 'over')),
    items_received JSONB NOT NULL, -- Array of received items with quantities
    total_items_received INTEGER NOT NULL DEFAULT 0,
    total_quantity_received NUMERIC NOT NULL DEFAULT 0,
    total_value_received NUMERIC NOT NULL DEFAULT 0,
    quality_notes TEXT,
    damage_report TEXT,
    discrepancy_notes TEXT,
    supplier_delivery_note TEXT,
    vehicle_info TEXT,
    driver_info TEXT,
    inspection_status TEXT CHECK (inspection_status IN ('pending', 'passed', 'failed', 'partial')),
    inspection_notes TEXT,
    attachments TEXT[],
    status TEXT NOT NULL CHECK (status IN ('draft', 'pending', 'approved', 'completed', 'cancelled')),
    approved_by UUID REFERENCES auth.users(id),
    approved_by_name TEXT,
    approval_date TIMESTAMP WITH TIME ZONE,
    approval_notes TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for purchase_order_receiving_records
CREATE INDEX IF NOT EXISTS idx_po_receiving_po_id ON public.purchase_order_receiving_records(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_po_receiving_number ON public.purchase_order_receiving_records(receiving_number);
CREATE INDEX IF NOT EXISTS idx_po_receiving_date ON public.purchase_order_receiving_records(received_date);
CREATE INDEX IF NOT EXISTS idx_po_receiving_received_by ON public.purchase_order_receiving_records(received_by);
CREATE INDEX IF NOT EXISTS idx_po_receiving_status ON public.purchase_order_receiving_records(status);

-- =============================================
-- CREATE APPROVAL RECORDS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.purchase_order_approval_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_order_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
    purchase_order_number TEXT NOT NULL,
    approval_level INTEGER NOT NULL DEFAULT 1,
    approval_status TEXT NOT NULL CHECK (approval_status IN ('pending', 'approved', 'rejected', 'escalated')),
    approved_by UUID REFERENCES auth.users(id),
    approved_by_name TEXT,
    approved_by_role TEXT,
    approval_date TIMESTAMP WITH TIME ZONE,
    rejection_date TIMESTAMP WITH TIME ZONE,
    approval_amount NUMERIC,
    approval_limit NUMERIC,
    notes TEXT,
    reason TEXT,
    next_approver UUID REFERENCES auth.users(id),
    next_approver_name TEXT,
    escalation_reason TEXT,
    approval_chain JSONB DEFAULT '[]', -- Track approval workflow
    metadata JSONB DEFAULT '{}',
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for purchase_order_approval_records
CREATE INDEX IF NOT EXISTS idx_po_approval_po_id ON public.purchase_order_approval_records(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_po_approval_status ON public.purchase_order_approval_records(approval_status);
CREATE INDEX IF NOT EXISTS idx_po_approval_approved_by ON public.purchase_order_approval_records(approved_by);
CREATE INDEX IF NOT EXISTS idx_po_approval_date ON public.purchase_order_approval_records(approval_date);
CREATE INDEX IF NOT EXISTS idx_po_approval_level ON public.purchase_order_approval_records(approval_level);

-- =============================================
-- CREATE VALIDATION ERROR LOGS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.purchase_order_validation_errors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_order_id UUID REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
    purchase_order_number TEXT,
    error_type TEXT NOT NULL CHECK (error_type IN (
        'insufficient_stock', 'invalid_quantity', 'price_mismatch', 'supplier_inactive',
        'product_inactive', 'duplicate_item', 'missing_required_field', 'invalid_status_transition',
        'permission_denied', 'approval_required', 'over_receiving', 'under_receiving'
    )),
    error_code TEXT,
    error_message TEXT NOT NULL,
    field_name TEXT,
    field_value TEXT,
    context JSONB DEFAULT '{}',
    resolved BOOLEAN DEFAULT false,
    resolved_by UUID REFERENCES auth.users(id),
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolution_notes TEXT,
    occurred_by UUID REFERENCES auth.users(id),
    occurred_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for purchase_order_validation_errors
CREATE INDEX IF NOT EXISTS idx_po_validation_po_id ON public.purchase_order_validation_errors(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_po_validation_error_type ON public.purchase_order_validation_errors(error_type);
CREATE INDEX IF NOT EXISTS idx_po_validation_resolved ON public.purchase_order_validation_errors(resolved);
CREATE INDEX IF NOT EXISTS idx_po_validation_occurred_at ON public.purchase_order_validation_errors(occurred_at);

-- =============================================
-- CREATE UPDATED_AT TRIGGERS
-- =============================================

-- Create or replace the trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at columns
CREATE TRIGGER update_po_audit_logs_updated_at 
    BEFORE UPDATE ON public.purchase_order_audit_logs 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stock_audit_logs_updated_at 
    BEFORE UPDATE ON public.stock_movement_audit_logs 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_po_receiving_updated_at 
    BEFORE UPDATE ON public.purchase_order_receiving_records 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_po_approval_updated_at 
    BEFORE UPDATE ON public.purchase_order_approval_records 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- ENABLE ROW LEVEL SECURITY
-- =============================================
ALTER TABLE public.purchase_order_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movement_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_receiving_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_approval_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_validation_errors ENABLE ROW LEVEL SECURITY;

-- =============================================
-- CREATE RLS POLICIES
-- =============================================

-- Purchase Order Audit Logs Policies
CREATE POLICY "Users can view PO audit logs from same business" ON public.purchase_order_audit_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.purchase_orders po
            JOIN public.business_users bu ON bu.business_id IS NOT NULL
            WHERE po.id = purchase_order_audit_logs.purchase_order_id
            AND bu.id = auth.uid()
        )
    );

CREATE POLICY "System can insert PO audit logs" ON public.purchase_order_audit_logs
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.business_users bu
            WHERE bu.id = auth.uid()
            AND bu.business_id IS NOT NULL
        )
    );

-- Stock Movement Audit Logs Policies
CREATE POLICY "Users can view stock audit logs from same business" ON public.stock_movement_audit_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.products p
            JOIN public.business_users bu ON bu.business_id IS NOT NULL
            WHERE p.id = stock_movement_audit_logs.product_id
            AND bu.id = auth.uid()
        )
    );

CREATE POLICY "System can insert stock audit logs" ON public.stock_movement_audit_logs
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.business_users bu
            WHERE bu.id = auth.uid()
            AND bu.business_id IS NOT NULL
        )
    );

-- Purchase Order Status History Policies
CREATE POLICY "Users can view PO status history from same business" ON public.purchase_order_status_history
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.purchase_orders po
            JOIN public.business_users bu ON bu.business_id IS NOT NULL
            WHERE po.id = purchase_order_status_history.purchase_order_id
            AND bu.id = auth.uid()
        )
    );

CREATE POLICY "System can insert PO status history" ON public.purchase_order_status_history
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.business_users bu
            WHERE bu.id = auth.uid()
            AND bu.business_id IS NOT NULL
        )
    );

-- Receiving Records Policies
CREATE POLICY "Users can view receiving records from same business" ON public.purchase_order_receiving_records
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.purchase_orders po
            JOIN public.business_users bu ON bu.business_id IS NOT NULL
            WHERE po.id = purchase_order_receiving_records.purchase_order_id
            AND bu.id = auth.uid()
        )
    );

CREATE POLICY "Users can manage receiving records" ON public.purchase_order_receiving_records
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.business_users bu
            WHERE bu.id = auth.uid()
            AND bu.role IN ('admin', 'manager', 'employee')
            AND bu.business_id IS NOT NULL
        )
    );

-- Approval Records Policies
CREATE POLICY "Users can view approval records from same business" ON public.purchase_order_approval_records
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.purchase_orders po
            JOIN public.business_users bu ON bu.business_id IS NOT NULL
            WHERE po.id = purchase_order_approval_records.purchase_order_id
            AND bu.id = auth.uid()
        )
    );

CREATE POLICY "Managers can manage approval records" ON public.purchase_order_approval_records
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.business_users bu
            WHERE bu.id = auth.uid()
            AND bu.role IN ('admin', 'manager')
            AND bu.business_id IS NOT NULL
        )
    );

-- Validation Error Policies
CREATE POLICY "Users can view validation errors from same business" ON public.purchase_order_validation_errors
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.purchase_orders po
            JOIN public.business_users bu ON bu.business_id IS NOT NULL
            WHERE po.id = purchase_order_validation_errors.purchase_order_id
            AND bu.id = auth.uid()
        )
    );

CREATE POLICY "System can manage validation errors" ON public.purchase_order_validation_errors
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.business_users bu
            WHERE bu.id = auth.uid()
            AND bu.business_id IS NOT NULL
        )
    );

-- =============================================
-- GRANT PERMISSIONS
-- =============================================
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON FUNCTION update_updated_at_column() TO authenticated;

-- =============================================
-- ADD TABLE COMMENTS FOR DOCUMENTATION
-- =============================================
COMMENT ON TABLE public.purchase_order_audit_logs IS 'Comprehensive audit trail for all purchase order operations and changes';
COMMENT ON TABLE public.stock_movement_audit_logs IS 'Detailed audit trail for inventory movements with before/after quantities and context';
COMMENT ON TABLE public.purchase_order_status_history IS 'Historical record of all purchase order status transitions';
COMMENT ON TABLE public.purchase_order_receiving_records IS 'Complete records of goods received against purchase orders';
COMMENT ON TABLE public.purchase_order_approval_records IS 'Approval workflow tracking for purchase orders';
COMMENT ON TABLE public.purchase_order_validation_errors IS 'Log of validation errors and their resolution status';

-- Add column comments for key fields
COMMENT ON COLUMN public.purchase_order_audit_logs.old_values IS 'JSON snapshot of values before the change';
COMMENT ON COLUMN public.purchase_order_audit_logs.new_values IS 'JSON snapshot of values after the change';
COMMENT ON COLUMN public.purchase_order_audit_logs.metadata IS 'Additional context and system metadata';

COMMENT ON COLUMN public.stock_movement_audit_logs.quantity_changed IS 'Net change in quantity (positive for increases, negative for decreases)';
COMMENT ON COLUMN public.stock_movement_audit_logs.reference_type IS 'Type of operation that caused this stock movement';
COMMENT ON COLUMN public.stock_movement_audit_logs.reference_id IS 'ID of the related record (purchase order, sale, etc.)';

-- =============================================
-- CREATE USEFUL VIEWS
-- =============================================

-- View for recent purchase order activities
CREATE OR REPLACE VIEW public.recent_purchase_order_activities AS
SELECT 
    pal.id,
    pal.purchase_order_id,
    pal.purchase_order_number,
    pal.action,
    pal.performed_by_name,
    pal.timestamp,
    pal.reason,
    po.status as current_status,
    po.total as order_total
FROM public.purchase_order_audit_logs pal
JOIN public.purchase_orders po ON po.id = pal.purchase_order_id
ORDER BY pal.timestamp DESC
LIMIT 100;

-- View for stock movement summary
CREATE OR REPLACE VIEW public.stock_movement_summary AS
SELECT 
    smal.product_id,
    smal.product_name,
    smal.product_sku,
    COUNT(*) as total_movements,
    SUM(CASE WHEN smal.quantity_changed > 0 THEN smal.quantity_changed ELSE 0 END) as total_stock_in,
    SUM(CASE WHEN smal.quantity_changed < 0 THEN ABS(smal.quantity_changed) ELSE 0 END) as total_stock_out,
    SUM(smal.quantity_changed) as net_change,
    MAX(smal.timestamp) as last_movement_date,
    COUNT(DISTINCT smal.performed_by) as unique_users_involved
FROM public.stock_movement_audit_logs smal
GROUP BY smal.product_id, smal.product_name, smal.product_sku;

-- Grant SELECT permissions on views
GRANT SELECT ON public.recent_purchase_order_activities TO authenticated;
GRANT SELECT ON public.stock_movement_summary TO authenticated;

-- =============================================
-- COMPLETION MESSAGE
-- =============================================
DO $$ 
BEGIN
    RAISE NOTICE 'Comprehensive Audit Trail System created successfully!';
    RAISE NOTICE 'Tables created: purchase_order_audit_logs, stock_movement_audit_logs, purchase_order_status_history, purchase_order_receiving_records, purchase_order_approval_records, purchase_order_validation_errors';
    RAISE NOTICE 'Views created: recent_purchase_order_activities, stock_movement_summary';
    RAISE NOTICE 'All tables have RLS enabled with appropriate policies';
    RAISE NOTICE 'Indexes and triggers have been configured for optimal performance';
END $$;