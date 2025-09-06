-- Test queries to verify the fixed BMP operations work correctly
-- Run these to validate the SQL syntax and logic

-- Test 1: Basic BPM retrieval (should work without parameters)
SELECT 
    track_name,
    artist_name,
    spotify_tempo,
    tempo_source
FROM streaming_vendor_attributes 
WHERE section_type IS NULL 
    AND spotify_tempo IS NOT NULL
ORDER BY spotify_tempo DESC
LIMIT 5;

-- Test 2: Phase distribution analysis (should run without errors)
WITH bpm_distribution AS (
    SELECT 
        spotify_tempo,
        CASE 
            WHEN spotify_tempo BETWEEN 60 AND 69 THEN 'cooldown'
            WHEN spotify_tempo BETWEEN 70 AND 79 THEN 'warmup'
            WHEN spotify_tempo BETWEEN 80 AND 94 THEN 'climb'
            WHEN spotify_tempo BETWEEN 95 AND 119 THEN 'hills'
            WHEN spotify_tempo BETWEEN 120 AND 139 THEN 'jumps'
            WHEN spotify_tempo BETWEEN 140 AND 200 THEN 'sprint_intervals'
            ELSE 'out_of_range'
        END as phase_category
    FROM streaming_vendor_attributes 
    WHERE spotify_tempo IS NOT NULL
        AND section_type IS NULL
)
SELECT 
    phase_category,
    COUNT(*) as track_count,
    MIN(spotify_tempo) as min_bpm,
    MAX(spotify_tempo) as max_bpm
FROM bpm_distribution
GROUP BY phase_category
ORDER BY min_bpm NULLS LAST;

-- Test 3: NULL vs non-NULL count (should handle NULL vendors gracefully)
SELECT 
    COALESCE(vendor, 'unknown') as vendor,
    COUNT(*) as total_tracks,
    SUM(CASE WHEN spotify_tempo IS NULL THEN 1 ELSE 0 END) as null_count,
    SUM(CASE WHEN spotify_tempo IS NOT NULL THEN 1 ELSE 0 END) as valid_count
FROM streaming_vendor_attributes 
WHERE section_type IS NULL
GROUP BY vendor;

-- Test 4: Check for invalid BPM values
SELECT 
    'Invalid BPM values' as test_name,
    COUNT(*) as count
FROM streaming_vendor_attributes 
WHERE (spotify_tempo < 40 OR spotify_tempo > 220)
    AND section_type IS NULL
    AND spotify_tempo IS NOT NULL;

-- Test 5: Verify indexes can be created (should not error)
CREATE INDEX IF NOT EXISTS test_idx_bpm_track 
ON streaming_vendor_attributes(spotify_tempo) 
WHERE section_type IS NULL;

-- Clean up test index
DROP INDEX IF EXISTS test_idx_bpm_track;