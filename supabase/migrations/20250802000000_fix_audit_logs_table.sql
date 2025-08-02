-- Fix audit logs table schema and foreign key relationships
-- This migration consolidates conflicting audit table schemas

-- Drop any existing audit tables
DROP TABLE IF EXISTS public.audit_log CASCADE;
DROP TABLE IF EXISTS public.audit_logs CASCADE;

-- Create unified audit_logs table with proper foreign key to users
CREATE TABLE public.audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  table_name TEXT NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
  old_data JSONB,
  new_data JSONB,
  changed_fields TEXT[],
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create indexes for performance
CREATE INDEX idx_audit_logs_table_name ON public.audit_logs(table_name);
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at);
CREATE INDEX idx_audit_logs_operation ON public.audit_logs(operation);

-- Enable Row Level Security
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies - only admins can view audit logs
CREATE POLICY "Admin users can view all audit logs" ON public.audit_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Admins can insert audit logs (for manual entries if needed)
CREATE POLICY "Admin users can insert audit logs" ON public.audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Create audit trigger function
CREATE OR REPLACE FUNCTION public.audit_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
  audit_data JSONB;
  user_info RECORD;
  changed_fields TEXT[] := '{}';
  col_name TEXT;
BEGIN
  -- Get user information
  SELECT u.id, u.email, u.role INTO user_info
  FROM public.users u
  WHERE u.id = auth.uid();

  -- Determine operation and data
  IF TG_OP = 'DELETE' THEN
    audit_data := row_to_json(OLD)::JSONB;
    
    INSERT INTO public.audit_logs (
      table_name,
      operation,
      old_data,
      new_data,
      user_id,
      user_email,
      created_at
    ) VALUES (
      TG_TABLE_NAME,
      TG_OP,
      audit_data,
      NULL,
      user_info.id,
      user_info.email,
      NOW()
    );
    
    RETURN OLD;
    
  ELSIF TG_OP = 'UPDATE' THEN
    -- Find changed fields
    FOR col_name IN SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = TG_TABLE_NAME 
                    AND table_schema = TG_TABLE_SCHEMA
    LOOP
      IF row_to_json(OLD) ->> col_name IS DISTINCT FROM row_to_json(NEW) ->> col_name THEN
        changed_fields := array_append(changed_fields, col_name);
      END IF;
    END LOOP;
    
    INSERT INTO public.audit_logs (
      table_name,
      operation,
      old_data,
      new_data,
      changed_fields,
      user_id,
      user_email,
      created_at
    ) VALUES (
      TG_TABLE_NAME,
      TG_OP,
      row_to_json(OLD)::JSONB,
      row_to_json(NEW)::JSONB,
      changed_fields,
      user_info.id,
      user_info.email,
      NOW()
    );
    
    RETURN NEW;
    
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (
      table_name,
      operation,
      old_data,
      new_data,
      user_id,
      user_email,
      created_at
    ) VALUES (
      TG_TABLE_NAME,
      TG_OP,
      NULL,
      row_to_json(NEW)::JSONB,
      user_info.id,
      user_info.email,
      NOW()
    );
    
    RETURN NEW;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create audit triggers for key business tables
CREATE TRIGGER audit_products_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

CREATE TRIGGER audit_customers_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

CREATE TRIGGER audit_sales_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.sales
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

CREATE TRIGGER audit_purchase_orders_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.purchase_orders
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

CREATE TRIGGER audit_users_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

-- Grant necessary permissions
GRANT SELECT ON public.audit_logs TO authenticated;
GRANT INSERT ON public.audit_logs TO service_role;

-- Add comment for documentation
COMMENT ON TABLE public.audit_logs IS 'Audit trail for all database operations with proper foreign key to auth.users';
COMMENT ON COLUMN public.audit_logs.user_id IS 'Foreign key reference to auth.users(id)';
COMMENT ON COLUMN public.audit_logs.user_email IS 'User email for display purposes';
COMMENT ON COLUMN public.audit_logs.changed_fields IS 'Array of field names that were modified in UPDATE operations';