-- Simple check to see what data is being captured and why new table fails

-- Step 1: Show recent data from old table
SELECT 
    track_name,
    artist_name,
    data_source,
    from_cache,
    fallback_type,
    session_id,
    created_at
FROM spotify_analysis_logs 
WHERE created_at > NOW() - INTERVAL '2 hours'
ORDER BY created_at DESC 
LIMIT 3;

-- Step 2: Check if sessions table exists
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_schema = 'public'
   AND table_name = 'spotify_playback_sessions'
) as sessions_table_exists;

-- Step 3: Try to find what's different between the tables
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'spotify_analysis_logs'
ORDER BY column_name;

-- Step 4: Check new table columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'common_streaming_vendor_analysis_logs'
ORDER BY column_name;