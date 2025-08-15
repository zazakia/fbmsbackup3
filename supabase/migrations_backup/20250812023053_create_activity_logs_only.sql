-- Create activity_logs table to fix frontend 404 error
-- Only create if it doesn't exist

DO $$
BEGIN
    -- Check if activity_logs table exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'activity_logs'
    ) THEN
        -- Create the table
        CREATE TABLE public.activity_logs (
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

        -- Create indexes
        CREATE INDEX idx_activity_logs_user_id ON public.activity_logs(user_id);
        CREATE INDEX idx_activity_logs_action ON public.activity_logs(action);
        CREATE INDEX idx_activity_logs_created_at ON public.activity_logs(created_at DESC);

        -- Add trigger for updated_at
        CREATE TRIGGER update_activity_logs_updated_at
            BEFORE UPDATE ON public.activity_logs
            FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

        -- Enable RLS
        ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

        -- Create policies
        CREATE POLICY "Authenticated users can manage activity logs" 
        ON public.activity_logs 
        USING (auth.role() = 'authenticated');

        -- Grant permissions
        GRANT ALL ON public.activity_logs TO authenticated;
        GRANT ALL ON public.activity_logs TO service_role;
        GRANT ALL ON public.activity_logs TO anon;

        -- Insert initial log entry
        INSERT INTO public.activity_logs (action, entity_type, description, details) 
        VALUES ('table_created', 'database', 'Activity logs table created successfully', '{"table": "activity_logs", "fix": "404_error"}');
        
        RAISE NOTICE 'activity_logs table created successfully';
    ELSE
        RAISE NOTICE 'activity_logs table already exists';
    END IF;
END
$$;
