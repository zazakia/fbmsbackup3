-- Refresh schema permissions for REST API
GRANT USAGE ON SCHEMA fbms TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA fbms TO anon, authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA fbms TO anon, authenticated;

-- Force refresh the PostgREST schema cache
NOTIFY pgrst, 'reload schema';