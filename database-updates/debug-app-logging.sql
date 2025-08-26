-- Debug why app isn't logging anything

-- Step 1: Check if ANY new sessions were created today
SELECT COUNT(*) as sessions_today 
FROM spotify_playback_sessions 
WHERE created_at >= CURRENT_DATE;

-- Step 2: Check recent sessions to see last activity  
SELECT 
    id,
    workout_type,
    is_active,
    created_at,
    ended_at
FROM spotify_playback_sessions 
ORDER BY created_at DESC 
LIMIT 5;

-- Step 3: Check if old table is still getting data
SELECT COUNT(*) as old_table_today 
FROM spotify_analysis_logs 
WHERE created_at >= CURRENT_DATE;

-- Step 4: Check recent old table entries
SELECT 
    track_name,
    data_source,
    from_cache,
    created_at
FROM spotify_analysis_logs 
WHERE created_at >= CURRENT_DATE
ORDER BY created_at DESC 
LIMIT 3;

-- Step 5: Show total counts to see if anything is working
SELECT 
    'New Table' as table_name, 
    COUNT(*) as total_rows
FROM common_streaming_vendor_analysis_logs
UNION ALL
SELECT 
    'Old Table' as table_name, 
    COUNT(*) as total_rows  
FROM spotify_analysis_logs
UNION ALL
SELECT 
    'Sessions Table' as table_name,
    COUNT(*) as total_rows
FROM spotify_playback_sessions;