import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY as string;
const supabaseServiceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY as string;

console.log('Supabase URL:', supabaseUrl);
console.log('Environment:', import.meta.env.MODE);

// For development, use service role key to bypass RLS issues
const isDevelopment = import.meta.env.DEV;
const useServiceKey = isDevelopment && supabaseServiceKey;

console.log('Using service key for development:', useServiceKey ? 'Yes' : 'No');

export const supabase = createClient(
  supabaseUrl, 
  useServiceKey ? supabaseServiceKey : supabaseAnonKey
);

// Export anon client for auth operations
export const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey); 