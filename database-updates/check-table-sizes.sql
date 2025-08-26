-- Check table sizes and if cleanup is needed

-- Step 1: Check how much data was actually inserted
SELECT 
    'common_streaming_vendor_analysis_logs' as table_name,
    COUNT(*) as total_rows,
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '2 hours') as recent_rows,
    MIN(created_at) as earliest_entry,
    MAX(created_at) as latest_entry
FROM common_streaming_vendor_analysis_logs

UNION ALL

SELECT 
    'spotify_analysis_logs' as table_name,
    COUNT(*) as total_rows,
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '2 hours') as recent_rows,
    MIN(created_at) as earliest_entry,
    MAX(created_at) as latest_entry
FROM spotify_analysis_logs

UNION ALL

SELECT 
    'spotify_playback_sessions' as table_name,
    COUNT(*) as total_rows,
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '2 hours') as recent_rows,
    MIN(created_at) as earliest_entry,
    MAX(created_at) as latest_entry
FROM spotify_playback_sessions;

-- Step 2: Check for duplicate entries (same track logged multiple times)
SELECT 
    track_name,
    artist_name,
    COUNT(*) as duplicate_count
FROM common_streaming_vendor_analysis_logs 
WHERE created_at > NOW() - INTERVAL '2 hours'
GROUP BY track_name, artist_name
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC
LIMIT 10;

-- Step 3: Check database size (if supported)
SELECT 
    schemaname,
    tablename,
    attname,
    n_distinct,
    correlation
FROM pg_stats 
WHERE tablename IN ('common_streaming_vendor_analysis_logs', 'spotify_analysis_logs')
LIMIT 5;