import { supabase } from './supabase';

export const fixUserSettingsTable = async () => {
  try {
    console.log('Fixing user_settings table structure...');
    
    // SQL to add missing columns
    const sql = `
      -- Add missing columns if they don't exist
      DO $$ 
      BEGIN
          -- Add currency column
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                         WHERE table_name = 'user_settings' AND column_name = 'currency') THEN
              ALTER TABLE public.user_settings ADD COLUMN currency VARCHAR(10) DEFAULT 'PHP';
          END IF;

          -- Add language column if missing
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                         WHERE table_name = 'user_settings' AND column_name = 'language') THEN
              ALTER TABLE public.user_settings ADD COLUMN language VARCHAR(10) DEFAULT 'en';
          END IF;

          -- Add timezone column if missing
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                         WHERE table_name = 'user_settings' AND column_name = 'timezone') THEN
              ALTER TABLE public.user_settings ADD COLUMN timezone VARCHAR(50) DEFAULT 'Asia/Manila';
          END IF;

          -- Add date_format column if missing
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                         WHERE table_name = 'user_settings' AND column_name = 'date_format') THEN
              ALTER TABLE public.user_settings ADD COLUMN date_format VARCHAR(20) DEFAULT 'MM/dd/yyyy';
          END IF;

          -- Add time_format column if missing
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                         WHERE table_name = 'user_settings' AND column_name = 'time_format') THEN
              ALTER TABLE public.user_settings ADD COLUMN time_format VARCHAR(5) DEFAULT '12h' CHECK (time_format IN ('12h', '24h'));
          END IF;

          -- Add menuVisibility column if missing
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                         WHERE table_name = 'user_settings' AND column_name = 'menuVisibility') THEN
              ALTER TABLE public.user_settings ADD COLUMN "menuVisibility" JSONB DEFAULT '{
                  "dashboard": true,
                  "inventory": true,
                  "sales": true,
                  "purchases": true,
                  "suppliers": true,
                  "customers": true,
                  "reports": true,
                  "analytics": true,
                  "settings": true,
                  "users": true,
                  "audit": true,
                  "backup": true
              }'::jsonb;
          END IF;
      END $$;
    `;

    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      console.error('Error fixing table structure:', error);
      return { 
        success: false, 
        message: `Failed to fix table structure: ${error.message}` 
      };
    }

    console.log('Successfully fixed user_settings table structure');
    return { 
      success: true, 
      message: 'user_settings table structure has been fixed' 
    };

  } catch (error) {
    console.error('Error in fixUserSettingsTable:', error);
    return { 
      success: false, 
      message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}` 
    };
  }
};