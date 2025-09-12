-- SECURITY VERIFICATION SCRIPT
-- Run this after applying comprehensive-security-fix.sql to verify all warnings are resolved

-- 1. Check RLS Status on all tables
SELECT 
    schemaname, 
    tablename, 
    CASE 
        WHEN rowsecurity THEN '🔒 SECURED WITH RLS' 
        ELSE '❌ EXPOSED - NO RLS' 
    END as rls_status,
    CASE 
        WHEN rowsecurity THEN 'PASS'
        ELSE 'FAIL'
    END as test_result
FROM pg_tables t
JOIN pg_class c ON c.relname = t.tablename
WHERE schemaname = 'public' 
ORDER BY rowsecurity DESC, tablename;

-- 2. List all policies to verify they exist
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 3. Test anonymous access to sensitive data (should return 0 rows)
-- This simulates what an unauthenticated user would see
SET ROLE anon;
SELECT 'Testing anonymous access to spotify_analysis_logs...' as test;
SELECT COUNT(*) as rows_accessible_to_anon FROM spotify_analysis_logs;

SELECT 'Testing anonymous access to spotify_playback_sessions...' as test;
SELECT COUNT(*) as rows_accessible_to_anon FROM spotify_playback_sessions;

-- Reset role
RESET ROLE;

-- 4. Test public read access to reference data (should work)
SELECT 'Testing public access to workout_phases...' as test;
SELECT COUNT(*) as workout_phases_count FROM workout_phases;

SELECT 'Testing public access to instruction_narratives...' as test;
SELECT COUNT(*) as narratives_count FROM instruction_narratives;

-- 5. Check for any remaining insecure policies
SELECT 
    schemaname,
    tablename,
    policyname,
    'WARNING: Overly permissive policy' as issue
FROM pg_policies 
WHERE schemaname = 'public'
  AND (
    qual ILIKE '%true%' 
    AND policyname ILIKE '%all users%'
    AND tablename IN ('spotify_analysis_logs', 'spotify_playback_sessions', 'spotify_track_analysis')
  );

-- 6. Summary Report
SELECT 
    (SELECT COUNT(*) FROM pg_tables t JOIN pg_class c ON c.relname = t.tablename 
     WHERE schemaname = 'public' AND rowsecurity = true) as tables_with_rls,
    (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public') as total_public_tables,
    CASE 
        WHEN (SELECT COUNT(*) FROM pg_tables t JOIN pg_class c ON c.relname = t.tablename 
              WHERE schemaname = 'public' AND rowsecurity = false) = 0 
        THEN '✅ ALL TABLES SECURED'
        ELSE '❌ SOME TABLES STILL EXPOSED'
    END as security_status;

-- 7. Expected Results Summary
SELECT '
EXPECTED RESULTS:
1. All tables should show "🔒 SECURED WITH RLS" 
2. Anonymous access to spotify_analysis_logs and spotify_playback_sessions should return 0 rows
3. Public access to workout_phases and instruction_narratives should work
4. No overly permissive policies should be found
5. Security status should be "✅ ALL TABLES SECURED"

If any test shows unexpected results, review the security fix and re-apply.
' as verification_guide;