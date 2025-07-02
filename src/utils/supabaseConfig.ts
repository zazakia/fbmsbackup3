import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY as string;
const supabaseServiceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY as string;

// For development, we'll use service role key to bypass RLS
const isDevelopment = import.meta.env.DEV;

export const supabase = createClient(
  supabaseUrl, 
  isDevelopment && supabaseServiceKey ? supabaseServiceKey : supabaseAnonKey
);

// Also export anon client for auth operations
export const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);