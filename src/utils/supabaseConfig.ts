import { createClient } from '@supabase/supabase-js';

// Production Supabase configuration - ALWAYS use remote/live connection
const PRODUCTION_CONFIG = {
  url: 'https://coqjcziquviehgyifhek.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvcWpjemlxdXZpZWhneWlmaGVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk0MDUzOTMsImV4cCI6MjA2NDk4MTM5M30.NSdUfHdeXLwBCcY9UO4s3LoSEBm4AuU0Jh5BLIcoQ5E'
};

// Force production URLs - ignore any local environment variables
const supabaseUrl = PRODUCTION_CONFIG.url;
const supabaseAnonKey = PRODUCTION_CONFIG.anonKey;

// The 'supabase' client should always use the anon key for client-side operations.
// Row Level Security (RLS) should be used to control data access.
export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
);

// Also export anon client for auth operations (currently identical to 'supabase')
export const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);