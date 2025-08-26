-- NUCLEAR OPTION: Clear all testing data (use ONLY if massive overload)

-- WARNING: This deletes ALL data from today - use only if absolutely necessary

-- Step 1: Clear today's entries
DELETE FROM common_streaming_vendor_analysis_logs 
WHERE DATE(created_at) = CURRENT_DATE;

-- Step 2: Clear any test sessions
DELETE FROM spotify_playback_sessions 
WHERE workout_type LIKE '%test%' OR workout_type LIKE '%Test%';

-- Step 3: Reset sequences (if needed)
-- This is usually not necessary in Supabase

-- Step 4: Verify cleanup
SELECT 
    'After nuclear cleanup' as status,
    COUNT(*) as total_remaining_entries
FROM common_streaming_vendor_analysis_logs;