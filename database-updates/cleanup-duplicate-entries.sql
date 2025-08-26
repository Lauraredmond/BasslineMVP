-- Clean up duplicate entries from today's testing (SAFE cleanup)

-- Step 1: Keep only the LATEST entry for each track from today
WITH ranked_entries AS (
  SELECT 
    id,
    track_name,
    artist_name,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY track_name, artist_name 
      ORDER BY created_at DESC
    ) as rn
  FROM common_streaming_vendor_analysis_logs 
  WHERE DATE(created_at) = CURRENT_DATE
)
DELETE FROM common_streaming_vendor_analysis_logs 
WHERE id IN (
  SELECT id FROM ranked_entries WHERE rn > 1
);

-- Step 2: Show what remains
SELECT 
    'After cleanup' as status,
    COUNT(*) as remaining_entries_today
FROM common_streaming_vendor_analysis_logs 
WHERE DATE(created_at) = CURRENT_DATE;

-- Step 3: Show sample of remaining data
SELECT 
    track_name,
    artist_name,
    soundnet_tempo,
    soundnet_energy,
    created_at
FROM common_streaming_vendor_analysis_logs 
WHERE DATE(created_at) = CURRENT_DATE
ORDER BY created_at DESC 
LIMIT 5;