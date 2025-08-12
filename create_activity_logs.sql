-- Create activity_logs table to fix frontend 404 error
-- This script can be run directly in the Supabase SQL editor

-- Create the table
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id),
    user_email text,
    action text NOT NULL,
    entity_type text,
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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON public.activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON public.activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity_type ON public.activity_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON public.activity_logs(created_at DESC);

-- Add trigger for updated_at timestamp
DROP TRIGGER IF EXISTS update_activity_logs_updated_at ON public.activity_logs;
CREATE TRIGGER update_activity_logs_updated_at
    BEFORE UPDATE ON public.activity_logs
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Authenticated users can manage activity logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Users can view activity logs" ON public.activity_logs;

-- Create RLS policies
CREATE POLICY "Users can view activity logs" 
ON public.activity_logs FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert activity logs" 
ON public.activity_logs FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update activity logs" 
ON public.activity_logs FOR UPDATE 
USING (auth.role() = 'authenticated');

-- Grant permissions
GRANT ALL ON public.activity_logs TO authenticated;
GRANT ALL ON public.activity_logs TO service_role;
GRANT SELECT ON public.activity_logs TO anon;

-- Insert a test record to verify the table works
INSERT INTO public.activity_logs (action, entity_type, description, details) 
VALUES ('table_created', 'database', 'Activity logs table created to fix 404 error', 
        '{"fix": "404_error", "table": "activity_logs", "created_by": "supabase_cli"}')
ON CONFLICT DO NOTHING;

-- Verify the table was created
SELECT 'activity_logs table created successfully!' as status;
