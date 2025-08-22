-- Quick test to see if RapidAPI columns exist in database
-- This will show if the RapidAPI database migration was run

SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'spotify_analysis_logs' 
AND column_name LIKE '%rs_%'
ORDER BY column_name;

-- Also check for data_source column
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'spotify_analysis_logs' 
AND column_name IN ('data_source', 'from_cache', 'fallback_type');

-- Check if any entries have RapidAPI data
SELECT 
    track_name,
    data_source,
    rs_key,
    rs_camelot,
    rs_happiness,
    created_at
FROM spotify_analysis_logs 
WHERE data_source = 'rapidapi' OR rs_key IS NOT NULL
ORDER BY created_at DESC 
LIMIT 5;