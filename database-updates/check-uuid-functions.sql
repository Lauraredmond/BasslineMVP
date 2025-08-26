-- Check what UUID functions are available in your database

-- Step 1: Check if uuid-ossp extension is installed
SELECT * FROM pg_extension WHERE extname = 'uuid-ossp';

-- Step 2: Try to enable uuid-ossp extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Step 3: List available UUID functions
SELECT proname 
FROM pg_proc 
WHERE proname LIKE '%uuid%' 
ORDER BY proname;

-- Step 4: Test a simple UUID generation
SELECT uuid_generate_v4() as test_uuid;