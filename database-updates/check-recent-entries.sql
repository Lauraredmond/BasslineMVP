-- Check if any new entries were created after the API calls

-- Check new table
SELECT COUNT(*) as new_table_count 
FROM common_streaming_vendor_analysis_logs 
WHERE created_at > NOW() - INTERVAL '1 hour';

-- Show recent entries if any
SELECT 
    track_name,
    artist_name,
    vendor_source,
    data_source,
    soundnet_tempo,
    soundnet_energy,
    created_at
FROM common_streaming_vendor_analysis_logs 
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC 
LIMIT 5;