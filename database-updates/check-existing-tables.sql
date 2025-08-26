-- Check what tables actually exist in your database
-- This will help us understand the current database structure

-- Step 1: List all tables that contain 'spotify' or 'analysis' in the name
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND (table_name LIKE '%spotify%' OR table_name LIKE '%analysis%' OR table_name LIKE '%session%' OR table_name LIKE '%vendor%')
ORDER BY table_name;

-- Step 2: Check if the old spotify_analysis_logs table has recent data
SELECT COUNT(*) as old_table_rows 
FROM spotify_analysis_logs 
WHERE created_at > NOW() - INTERVAL '1 day';

-- Step 3: Show recent entries from old table if any exist
SELECT 
    id,
    track_name,
    artist_name,
    data_source,
    from_cache,
    created_at
FROM spotify_analysis_logs 
WHERE created_at > NOW() - INTERVAL '1 day'
ORDER BY created_at DESC 
LIMIT 5;