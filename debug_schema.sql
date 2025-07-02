-- Check if fbms schema exists
SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'fbms';

-- Check what tables exist in fbms schema
SELECT table_name FROM information_schema.tables WHERE table_schema = 'fbms';

-- Check what tables exist in public schema (for comparison)
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';

-- Check current user and role
SELECT current_user, current_role;

-- Check permissions on fbms schema
SELECT * FROM information_schema.schema_privileges WHERE table_schema = 'fbms';