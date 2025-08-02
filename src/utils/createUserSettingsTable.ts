import { supabase } from './supabase';

export const createUserSettingsTable = async (): Promise<{ success: boolean; message: string }> => {
  try {
    console.log('Creating user_settings table...');
    
    const { error } = await supabase.rpc('create_user_settings_table_if_not_exists');
    
    if (error) {
      // If RPC doesn't exist, try direct SQL execution
      console.log('RPC not found, trying direct SQL...');
      
      const createTableSQL = `
        -- Create user_settings table
        CREATE TABLE IF NOT EXISTS public.user_settings (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
          theme VARCHAR(20) DEFAULT 'system',
          language VARCHAR(10) DEFAULT 'en',
          timezone VARCHAR(50) DEFAULT 'Asia/Manila',
          date_format VARCHAR(20) DEFAULT 'MM/dd/yyyy',
          time_format VARCHAR(5) DEFAULT '12h',
          currency VARCHAR(10) DEFAULT 'PHP',
          notifications JSONB DEFAULT '{}',
          privacy JSONB DEFAULT '{}',
          display JSONB DEFAULT '{
            "topBar": {
              "showDatabaseStatus": true,
              "showSupabaseStatus": true,
              "showThemeToggle": true,
              "showNotifications": true,
              "showSearch": true,
              "showUserProfile": true,
              "showMobileSearch": true
            }
          }',
          reports JSONB DEFAULT '{}',
          inventory JSONB DEFAULT '{}',
          security JSONB DEFAULT '{}',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(user_id)
        );

        -- Create index
        CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON public.user_settings(user_id);

        -- Enable RLS
        ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

        -- Create policies
        DROP POLICY IF EXISTS "Users can view their own settings" ON public.user_settings;
        CREATE POLICY "Users can view their own settings" ON public.user_settings
          FOR SELECT USING (auth.uid() = user_id);

        DROP POLICY IF EXISTS "Users can update their own settings" ON public.user_settings;
        CREATE POLICY "Users can update their own settings" ON public.user_settings
          FOR UPDATE USING (auth.uid() = user_id);

        DROP POLICY IF EXISTS "Users can insert their own settings" ON public.user_settings;
        CREATE POLICY "Users can insert their own settings" ON public.user_settings
          FOR INSERT WITH CHECK (auth.uid() = user_id);

        DROP POLICY IF EXISTS "Users can delete their own settings" ON public.user_settings;
        CREATE POLICY "Users can delete their own settings" ON public.user_settings
          FOR DELETE USING (auth.uid() = user_id);
      `;

      const { error: sqlError } = await supabase.rpc('sql', { query: createTableSQL });
      
      if (sqlError) {
        console.error('SQL execution failed:', sqlError);
        return {
          success: false,
          message: `Failed to create table: ${sqlError.message}`
        };
      }
    }

    // Test if table was created successfully
    const { data: _data, error: testError } = await supabase
      .from('user_settings')
      .select('id')
      .limit(1);

    if (testError) {
      return {
        success: false,
        message: `Table creation verification failed: ${testError.message}`
      };
    }

    return {
      success: true,
      message: 'user_settings table created successfully!'
    };

  } catch (error) {
    console.error('Error creating user_settings table:', error);
    return {
      success: false,
      message: `Unexpected error: ${error}`
    };
  }
};

// Helper function to check if table exists
export const checkUserSettingsTable = async (): Promise<{ exists: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from('user_settings')
      .select('id')
      .limit(1);

    if (error) {
      if (error.code === '42P01') {
        return { exists: false };
      }
      return { exists: false, error: error.message };
    }

    return { exists: true };
  } catch (error) {
    return { exists: false, error: `${error}` };
  }
};