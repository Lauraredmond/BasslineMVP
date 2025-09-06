-- SQL Snippets for Spotify_tempo Operations
-- Track-level BPM operations for playlist phase mapping

-- ====================
-- READ OPERATIONS
-- ====================

-- Get track-level BPM by track_id (ignores section BPM)
SELECT 
    track_id,
    track_name,
    artist_name,
    spotify_tempo,
    tempo_source,
    tempo_confidence,
    tempo_last_verified_at
FROM streaming_vendor_attributes 
WHERE track_id = :track_id
    AND section_type IS NULL  -- Only track-level records
    AND spotify_tempo IS NOT NULL
ORDER BY updated_at DESC
LIMIT 1;

-- Get all tracks needing BPM backfill
SELECT DISTINCT
    track_id,
    track_name,
    artist_name
FROM streaming_vendor_attributes 
WHERE spotify_tempo IS NULL
    AND section_type IS NULL  -- Only track-level records
    AND track_id IS NOT NULL
ORDER BY created_at DESC
LIMIT :limit_count;

-- Get track-level BPM for multiple tracks
SELECT DISTINCT ON (track_id)
    track_id,
    track_name,
    artist_name,
    spotify_tempo,
    tempo_confidence
FROM streaming_vendor_attributes 
WHERE track_id = ANY(:track_ids)
    AND section_type IS NULL
    AND spotify_tempo IS NOT NULL
ORDER BY track_id, updated_at DESC;

-- Check BPM distribution by workout phase ranges
WITH bmp_distribution AS (
    SELECT 
        spotify_tempo,
        track_name,
        artist_name,
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
    MAX(spotify_tempo) as max_bpm,
    ROUND(AVG(spotify_tempo), 1) as avg_bpm
FROM bmp_distribution
GROUP BY phase_category
ORDER BY min_bpm;

-- ====================
-- WRITE OPERATIONS  
-- ====================

-- UPSERT track-level BPM (for backfill operations)
INSERT INTO streaming_vendor_attributes (
    track_id,
    track_name, 
    artist_name,
    vendor,
    spotify_tempo,
    tempo_source,
    tempo_confidence,
    tempo_last_verified_at,
    event_type,
    timestamp_ms,
    created_at,
    updated_at
) VALUES (
    :track_id,
    :track_name,
    :artist_name,
    'spotify',
    :bpm_value,
    'spotify_api',
    0.9,
    NOW(),
    'track_metadata',
    0,
    NOW(),
    NOW()
)
ON CONFLICT (track_id, track_name, artist_name, timestamp_ms, event_type)
DO UPDATE SET
    spotify_tempo = EXCLUDED.spotify_tempo,
    tempo_source = EXCLUDED.tempo_source,
    tempo_confidence = EXCLUDED.tempo_confidence,
    tempo_last_verified_at = EXCLUDED.tempo_last_verified_at,
    updated_at = NOW();

-- Update existing NULL BPM values
UPDATE streaming_vendor_attributes 
SET 
    spotify_tempo = :bpm_value,
    tempo_source = 'spotify_api',
    tempo_confidence = 0.9,
    tempo_last_verified_at = NOW(),
    updated_at = NOW()
WHERE track_id = :track_id
    AND track_name = :track_name
    AND artist_name = :artist_name
    AND section_type IS NULL
    AND spotify_tempo IS NULL;

-- Batch update multiple tracks (for backfill)
UPDATE streaming_vendor_attributes 
SET 
    spotify_tempo = data_updates.new_bpm,
    tempo_source = 'spotify_api',
    tempo_confidence = 0.9,
    tempo_last_verified_at = NOW(),
    updated_at = NOW()
FROM (VALUES 
    ('track_id_1', 'track_name_1', 'artist_1', 120),
    ('track_id_2', 'track_name_2', 'artist_2', 140)
    -- Add more (track_id, track_name, artist_name, bpm) tuples as needed
) AS data_updates(track_id, track_name, artist_name, new_bpm)
WHERE streaming_vendor_attributes.track_id = data_updates.track_id
    AND streaming_vendor_attributes.track_name = data_updates.track_name
    AND streaming_vendor_attributes.artist_name = data_updates.artist_name
    AND streaming_vendor_attributes.section_type IS NULL
    AND streaming_vendor_attributes.spotify_tempo IS NULL;

-- ====================
-- DIAGNOSTIC QUERIES
-- ====================

-- Find tracks with potentially invalid BPM values
SELECT 
    track_name,
    artist_name,
    spotify_tempo,
    tempo_source,
    tempo_confidence,
    'too_low' as issue_type
FROM streaming_vendor_attributes 
WHERE spotify_tempo < 40 
    AND section_type IS NULL

UNION ALL

SELECT 
    track_name,
    artist_name,
    spotify_tempo,
    tempo_source,
    tempo_confidence,
    'too_high' as issue_type
FROM streaming_vendor_attributes 
WHERE spotify_tempo > 220
    AND section_type IS NULL
ORDER BY spotify_tempo;

-- Count NULL vs non-NULL BPM by vendor
SELECT 
    vendor,
    COUNT(*) as total_tracks,
    SUM(CASE WHEN spotify_tempo IS NULL THEN 1 ELSE 0 END) as null_bpm_count,
    SUM(CASE WHEN spotify_tempo IS NOT NULL THEN 1 ELSE 0 END) as valid_bmp_count,
    ROUND(
        (SUM(CASE WHEN spotify_tempo IS NOT NULL THEN 1 ELSE 0 END) * 100.0) / COUNT(*), 
        1
    ) as bmp_coverage_percent
FROM streaming_vendor_attributes 
WHERE section_type IS NULL
GROUP BY vendor;

-- Find "defaulty" BPM values (suspicious patterns)
SELECT 
    spotify_tempo,
    COUNT(*) as occurrence_count,
    ARRAY_AGG(DISTINCT track_name || ' - ' || artist_name) as example_tracks
FROM streaming_vendor_attributes 
WHERE spotify_tempo IN (120, 128, 100, 110, 140)  -- Common default values
    AND section_type IS NULL
GROUP BY spotify_tempo
ORDER BY occurrence_count DESC;

-- ====================
-- MAINTENANCE QUERIES
-- ====================

-- Clean up duplicate track entries (keep most recent)
DELETE FROM streaming_vendor_attributes 
WHERE id NOT IN (
    SELECT DISTINCT ON (track_id, track_name, artist_name)
        id
    FROM streaming_vendor_attributes 
    WHERE section_type IS NULL
    ORDER BY track_id, track_name, artist_name, updated_at DESC
);

-- Update tempo confidence for old records
UPDATE streaming_vendor_attributes 
SET 
    tempo_confidence = CASE 
        WHEN tempo_source = 'spotify_api' THEN 0.9
        WHEN tempo_source = 'computed' THEN 0.6  
        WHEN tempo_source = 'manual' THEN 0.8
        ELSE 0.3
    END,
    updated_at = NOW()
WHERE tempo_confidence IS NULL
    AND section_type IS NULL
    AND spotify_tempo IS NOT NULL;

-- ====================
-- INDEXES FOR PERFORMANCE
-- ====================

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_sva_track_level_bmp 
ON streaming_vendor_attributes(track_id, spotify_tempo) 
WHERE section_type IS NULL;

CREATE INDEX IF NOT EXISTS idx_sva_null_bmp_backfill 
ON streaming_vendor_attributes(track_id, updated_at) 
WHERE spotify_tempo IS NULL AND section_type IS NULL;

CREATE INDEX IF NOT EXISTS idx_sva_bpm_range_matching 
ON streaming_vendor_attributes(spotify_tempo, track_id) 
WHERE spotify_tempo IS NOT NULL AND section_type IS NULL;

-- ====================
-- EXAMPLE USAGE
-- ====================

-- Example: Get BPM for specific track
/*
SELECT * FROM streaming_vendor_attributes 
WHERE track_id = '4AjcwfgGFZxUMbEjb4saNV' 
    AND section_type IS NULL 
    AND spotify_tempo IS NOT NULL;
*/

-- Example: Find tracks in Sprint range (140-200 BPM)
/*
SELECT track_name, artist_name, spotify_tempo
FROM streaming_vendor_attributes 
WHERE spotify_tempo >= 140 
    AND spotify_tempo < 200
    AND section_type IS NULL
ORDER BY spotify_tempo DESC
LIMIT 10;
*/