-- Check if workout sessions are being created properly
-- This will help diagnose why app logging might be failing

-- Step 1: Check if spotify_playback_sessions table exists and has recent data
SELECT COUNT(*) as recent_sessions 
FROM spotify_playback_sessions 
WHERE created_at > NOW() - INTERVAL '1 day';

-- Step 2: Show recent sessions
SELECT 
    id,
    user_id,
    workout_type,
    created_at,
    ended_at,
    is_active
FROM spotify_playback_sessions 
ORDER BY created_at DESC 
LIMIT 5;

-- Step 3: Check if there are any rows in the old table (fallback)
SELECT COUNT(*) as old_table_recent_rows 
FROM spotify_analysis_logs 
WHERE created_at > NOW() - INTERVAL '1 day';

-- Step 4: Show recent entries from old table to see what data is being captured
SELECT 
    id,
    session_id,
    track_name,
    artist_name,
    data_source,
    from_cache,
    fallback_type,
    created_at
FROM spotify_analysis_logs 
WHERE created_at > NOW() - INTERVAL '1 day'
ORDER BY created_at DESC 
LIMIT 10;

-- Step 5: Clean up our test row
DELETE FROM common_streaming_vendor_analysis_logs 
WHERE track_name = 'Test Track' AND artist_name = 'Test Artist';