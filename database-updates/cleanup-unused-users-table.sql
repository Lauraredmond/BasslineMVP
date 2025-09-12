-- CLEANUP: Remove unused users table and related structures
-- This table appears to be unused scaffolding from early development

-- SAFETY CHECK: Verify no data exists before dropping
-- Run this query first to confirm the table is empty
SELECT 
    'users table row count: ' || COUNT(*) as status,
    CASE 
        WHEN COUNT(*) = 0 THEN 'SAFE TO DROP'
        ELSE 'CONTAINS DATA - REVIEW BEFORE DROPPING'
    END as recommendation
FROM users;

-- Show what would be affected by dropping users table
SELECT 
    t.table_name,
    t.constraint_name,
    t.constraint_type,
    'References users table' as note
FROM information_schema.table_constraints t
JOIN information_schema.key_column_usage k
    ON t.constraint_name = k.constraint_name
WHERE k.referenced_table_name = 'users';

-- If the above queries confirm it's safe, uncomment and run the cleanup:

-- Step 1: Drop any policies on users table
-- DROP POLICY IF EXISTS "users_policy" ON users;
-- DROP POLICY IF EXISTS "users_secure_policy" ON users;

-- Step 2: Drop foreign key constraints that reference users (if any exist)
-- You'll need to check the constraint query above and drop specific constraints

-- Step 3: Drop the users table
-- DROP TABLE IF EXISTS users CASCADE;

-- Step 4: Clean up any unused user-related tables (check if these exist and are empty)
-- DROP TABLE IF EXISTS user_workout_plans CASCADE;
-- DROP TABLE IF EXISTS user_weekly_schedule CASCADE; 
-- DROP TABLE IF EXISTS user_follows CASCADE;

-- Log completion
SELECT '✅ Users table cleanup analysis completed. Review results before running DROP commands.' as status;

-- Alternative: Just keep the table but remove all policies if you're unsure
-- This makes it inert but preserves the structure
-- TRUNCATE users; -- Clear any data
-- DROP POLICY IF EXISTS "users_policy" ON users;
-- DROP POLICY IF EXISTS "users_secure_policy" ON users;