-- Create activity_logs table to fix frontend 404 error
-- This table will track user activities and system events

CREATE TABLE IF NOT EXISTS public.activity_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id),
    user_email text,
    action text NOT NULL,
    entity_type text, -- e.g., 'product', 'purchase_order', 'customer'
    entity_id uuid,
    entity_name text,
    description text,
    details jsonb DEFAULT '{}',
    ip_address inet,
    user_agent text,
    session_id text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON public.activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON public.activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity_type ON public.activity_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON public.activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity_id ON public.activity_logs(entity_id);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE TRIGGER update_activity_logs_updated_at
    BEFORE UPDATE ON public.activity_logs
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Authenticated users can view activity logs" 
ON public.activity_logs FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert activity logs" 
ON public.activity_logs FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update their own activity logs" 
ON public.activity_logs FOR UPDATE 
USING (auth.uid() = user_id OR 
       auth.uid() IN (SELECT id FROM public.users WHERE role = 'admin'));

CREATE POLICY "Admins can delete activity logs" 
ON public.activity_logs FOR DELETE 
USING (auth.uid() IN (SELECT id FROM public.users WHERE role = 'admin'));

-- Grant permissions
GRANT ALL ON public.activity_logs TO authenticated;
GRANT ALL ON public.activity_logs TO service_role;

-- Insert some sample activity logs for testing
INSERT INTO public.activity_logs (action, entity_type, description, details) VALUES 
('system_startup', 'system', 'Application started successfully', '{"version": "1.0.0"}'),
('table_created', 'database', 'Activity logs table created', '{"table": "activity_logs"}');

-- Comment on table and columns
COMMENT ON TABLE public.activity_logs IS 'Tracks user activities and system events for auditing purposes';
COMMENT ON COLUMN public.activity_logs.action IS 'Type of action performed (e.g., create, update, delete, login)';
COMMENT ON COLUMN public.activity_logs.entity_type IS 'Type of entity affected (e.g., product, order, user)';
COMMENT ON COLUMN public.activity_logs.details IS 'Additional JSON data about the activity';
