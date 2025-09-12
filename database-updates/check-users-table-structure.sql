-- Check actual structure of users table in your database
-- Run this first to see what columns actually exist

-- Check if users table exists and show its structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'users'
ORDER BY ordinal_position;

-- Show all tables that contain 'user' in the name
SELECT table_name, table_type
FROM information_schema.tables
WHERE table_schema = 'public' 
  AND table_name ILIKE '%user%'
ORDER BY table_name;

-- Check for any authentication-related columns across all tables
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND (
    column_name ILIKE '%token%' 
    OR column_name ILIKE '%auth%' 
    OR column_name ILIKE '%spotify_id%'
    OR column_name ILIKE '%access%'
    OR column_name ILIKE '%refresh%'
  )
ORDER BY table_name, column_name;