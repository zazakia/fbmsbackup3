-- One-off migration to create purchase_order_audit_logs in public schema
CREATE TABLE IF NOT EXISTS public.purchase_order_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  purchase_order_number TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN (
    created, updated, status_changed, approved, rejected,
    sent_to_supplier, received, partially_received, cancelled,
    closed, deleted, reopened, edited_items
  )),
  performed_by UUID REFERENCES auth.users(id),
  performed_by_name TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  old_values JSONB DEFAULT {}::jsonb,
  new_values JSONB DEFAULT {}::jsonb,
  reason TEXT,
  metadata JSONB DEFAULT {}::jsonb,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_po_audit_logs_po_id ON public.purchase_order_audit_logs(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_po_audit_logs_action ON public.purchase_order_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_po_audit_logs_timestamp ON public.purchase_order_audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_po_audit_logs_performed_by ON public.purchase_order_audit_logs(performed_by);
CREATE INDEX IF NOT EXISTS idx_po_audit_logs_po_number ON public.purchase_order_audit_logs(purchase_order_number);

ALTER TABLE public.purchase_order_audit_logs ENABLE ROW LEVEL SECURITY;

DO 865440 BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = public AND tablename = purchase_order_audit_logs AND policyname = allow
