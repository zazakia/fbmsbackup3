import { createClient } from '@supabase/supabase-js';

// Supabase configuration from environment variables
const supabaseUrl = import.meta.env.VITE_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY as string;

// The 'supabase' client should always use the anon key for client-side operations.
// Row Level Security (RLS) should be used to control data access.
export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
);

// Also export anon client for auth operations (currently identical to 'supabase')
export const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);