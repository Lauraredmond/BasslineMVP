-- SQL Snippets for Spotify_tempo Operations (FIXED VERSION)
-- Track-level BPM operations for playlist phase mapping
-- Note: Replace $1, $2, etc. with actual values when running queries

-- ====================
-- READ OPERATIONS
-- ====================

-- Get track-level BPM by track_id (ignores section BPM)
-- Usage: Replace $1 with actual track_id
SELECT 
    track_id,
    track_name,
    artist_name,
    spotify_tempo,
    tempo_source,
    tempo_confidence,
    tempo_last_verified_at
FROM streaming_vendor_attributes 
WHERE track_id = $1
    AND section_type IS NULL  -- Only track-level records
    AND spotify_tempo IS NOT NULL
ORDER BY updated_at DESC
LIMIT 1;

-- Get all tracks needing BPM backfill
-- Usage: Replace $1 with desired limit (e.g., 50)
SELECT DISTINCT
    track_id,
    track_name,
    artist_name
FROM streaming_vendor_attributes 
WHERE spotify_tempo IS NULL
    AND section_type IS NULL  -- Only track-level records
    AND track_id IS NOT NULL
ORDER BY created_at DESC
LIMIT $1;

-- Get track-level BPM for multiple tracks
-- Usage: Replace $1 with array of track IDs (e.g., ARRAY['id1', 'id2'])
SELECT DISTINCT ON (track_id)
    track_id,
    track_name,
    artist_name,
    spotify_tempo,
    tempo_confidence
FROM streaming_vendor_attributes 
WHERE track_id = ANY($1)
    AND section_type IS NULL
    AND spotify_tempo IS NOT NULL
ORDER BY track_id, updated_at DESC;

-- Check BPM distribution by workout phase ranges
WITH bpm_distribution AS (
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
FROM bpm_distribution
GROUP BY phase_category
ORDER BY min_bpm NULLS LAST;

-- ====================
-- WRITE OPERATIONS  
-- ====================

-- UPSERT track-level BPM (for backfill operations)
-- Usage: Replace $1-$4 with actual values
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
    $1,    -- track_id
    $2,    -- track_name
    $3,    -- artist_name
    'spotify',
    $4,    -- bpm_value
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
-- Usage: Replace $1-$4 with actual values
UPDATE streaming_vendor_attributes 
SET 
    spotify_tempo = $1,           -- bpm_value
    tempo_source = 'spotify_api',
    tempo_confidence = 0.9,
    tempo_last_verified_at = NOW(),
    updated_at = NOW()
WHERE track_id = $2               -- track_id
    AND track_name = $3           -- track_name
    AND artist_name = $4          -- artist_name
    AND section_type IS NULL
    AND spotify_tempo IS NULL;

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
    COALESCE(vendor, 'unknown') as vendor,
    COUNT(*) as total_tracks,
    SUM(CASE WHEN spotify_tempo IS NULL THEN 1 ELSE 0 END) as null_bpm_count,
    SUM(CASE WHEN spotify_tempo IS NOT NULL THEN 1 ELSE 0 END) as valid_bpm_count,
    ROUND(
        (SUM(CASE WHEN spotify_tempo IS NOT NULL THEN 1 ELSE 0 END) * 100.0) / NULLIF(COUNT(*), 0), 
        1
    ) as bpm_coverage_percent
FROM streaming_vendor_attributes 
WHERE section_type IS NULL
GROUP BY vendor
ORDER BY bpm_coverage_percent DESC;

-- Find "defaulty" BPM values (suspicious patterns)
SELECT 
    spotify_tempo,
    COUNT(*) as occurrence_count,
    ARRAY_AGG(DISTINCT SUBSTRING(track_name || ' - ' || artist_name, 1, 50)) as example_tracks
FROM streaming_vendor_attributes 
WHERE spotify_tempo IN (120, 128, 100, 110, 140)  -- Common default values
    AND section_type IS NULL
GROUP BY spotify_tempo
ORDER BY occurrence_count DESC;

-- ====================
-- MAINTENANCE QUERIES
-- ====================

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
CREATE INDEX IF NOT EXISTS idx_sva_track_level_bpm 
ON streaming_vendor_attributes(track_id, spotify_tempo) 
WHERE section_type IS NULL;

CREATE INDEX IF NOT EXISTS idx_sva_null_bpm_backfill 
ON streaming_vendor_attributes(track_id, updated_at) 
WHERE spotify_tempo IS NULL AND section_type IS NULL;

CREATE INDEX IF NOT EXISTS idx_sva_bpm_range_matching 
ON streaming_vendor_attributes(spotify_tempo, track_id) 
WHERE spotify_tempo IS NOT NULL AND section_type IS NULL;

-- ====================
-- READY-TO-RUN EXAMPLES
-- ====================

-- Example 1: Get BPM for "The Pretender" by Foo Fighters
SELECT 
    track_id,
    track_name,
    artist_name,
    spotify_tempo,
    tempo_source,
    tempo_confidence
FROM streaming_vendor_attributes 
WHERE track_name = 'The Pretender'
    AND artist_name = 'Foo Fighters'
    AND section_type IS NULL 
    AND spotify_tempo IS NOT NULL
ORDER BY updated_at DESC
LIMIT 1;

-- Example 2: Find all tracks in Sprint range (140-200 BPM)
SELECT 
    track_name, 
    artist_name, 
    spotify_tempo,
    tempo_confidence
FROM streaming_vendor_attributes 
WHERE spotify_tempo >= 140 
    AND spotify_tempo < 200
    AND section_type IS NULL
ORDER BY spotify_tempo DESC
LIMIT 10;

-- Example 3: Count tracks by phase category
WITH phase_counts AS (
    SELECT 
        CASE 
            WHEN spotify_tempo BETWEEN 60 AND 69 THEN 'cooldown (60-69)'
            WHEN spotify_tempo BETWEEN 70 AND 79 THEN 'warmup (70-79)'
            WHEN spotify_tempo BETWEEN 80 AND 94 THEN 'climb (80-94)'
            WHEN spotify_tempo BETWEEN 95 AND 119 THEN 'hills (95-119)'
            WHEN spotify_tempo BETWEEN 120 AND 139 THEN 'jumps (120-139)'
            WHEN spotify_tempo BETWEEN 140 AND 200 THEN 'sprint_intervals (140-200)'
            WHEN spotify_tempo < 60 THEN 'too_low (< 60)'
            WHEN spotify_tempo > 200 THEN 'too_high (> 200)'
            ELSE 'unknown'
        END as phase_range,
        COUNT(*) as track_count
    FROM streaming_vendor_attributes 
    WHERE spotify_tempo IS NOT NULL
        AND section_type IS NULL
    GROUP BY 1
)
SELECT * FROM phase_counts ORDER BY track_count DESC;

-- Example 4: Find tracks needing BPM backfill (ready to run)
SELECT DISTINCT
    track_id,
    track_name,
    artist_name,
    created_at
FROM streaming_vendor_attributes 
WHERE spotify_tempo IS NULL
    AND section_type IS NULL
    AND track_id IS NOT NULL
ORDER BY created_at DESC
LIMIT 20;