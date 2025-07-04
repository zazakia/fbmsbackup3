-- Step 1: Check if fbms schema exists
SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'fbms';

-- Step 2: Check what tables exist in fbms schema (if any)
SELECT table_name FROM information_schema.tables WHERE table_schema = 'fbms';

-- Step 3: Check what tables exist in public schema
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';

-- Step 4: Check current user permissions
SELECT current_user, session_user;

-- Step 5: Check if we can create a simple test table
CREATE TABLE IF NOT EXISTS public.test_table (id SERIAL PRIMARY KEY, name TEXT);
INSERT INTO public.test_table (name) VALUES ('test');
SELECT * FROM public.test_table;
DROP TABLE public.test_table;