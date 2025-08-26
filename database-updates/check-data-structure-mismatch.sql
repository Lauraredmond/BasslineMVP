-- Check why inserts are failing on the new table and falling back to old table
-- Compare data structures and check for issues

-- Step 1: Show the recent data that IS being captured in old table
SELECT 
    track_name,
    artist_name,
    data_source,
    from_cache,
    fallback_type,
    session_id,
    rs_energy,
    rs_tempo,
    rs_key,
    created_at
FROM spotify_analysis_logs 
WHERE created_at > NOW() - INTERVAL '2 hours'
ORDER BY created_at DESC 
LIMIT 3;

-- Step 2: Check if session_id values in old table are valid UUIDs
SELECT 
    session_id,
    CASE 
        WHEN session_id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
        THEN 'Valid UUID'
        ELSE 'Invalid UUID'
    END as uuid_check
FROM spotify_analysis_logs 
WHERE created_at > NOW() - INTERVAL '2 hours'
LIMIT 5;

-- Step 3: Check if spotify_playback_sessions table actually exists 
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_schema = 'public'
   AND table_name = 'spotify_playback_sessions'
) as sessions_table_exists;

-- Step 4: Compare column structures between old and new tables
SELECT 'OLD TABLE' as table_type, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'spotify_analysis_logs'
AND column_name IN ('session_id', 'vendor_source', 'data_source', 'track_name')

UNION ALL

SELECT 'NEW TABLE' as table_type, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'common_streaming_vendor_analysis_logs'
AND column_name IN ('session_id', 'vendor_source', 'data_source', 'track_name')
ORDER BY column_name, table_type;