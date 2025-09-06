-- Debug script to check BPM values for "The Pretender" by Foo Fighters
-- This will show ALL records to identify data inconsistencies

-- 1. Show all records for The Pretender (any BPM value)
SELECT 
    'ALL_RECORDS' as query_type,
    track_id,
    track_name,
    artist_name,
    spotify_tempo,
    tempo_source,
    tempo_confidence,
    section_type,
    event_type,
    created_at,
    updated_at
FROM streaming_vendor_attributes 
WHERE track_name = 'The Pretender'
    AND artist_name = 'Foo Fighters'
ORDER BY updated_at DESC;

-- 2. Show only track-level records (section_type IS NULL)
SELECT 
    'TRACK_LEVEL_ONLY' as query_type,
    track_id,
    track_name,
    artist_name,
    spotify_tempo,
    tempo_source,
    tempo_confidence,
    event_type,
    created_at,
    updated_at
FROM streaming_vendor_attributes 
WHERE track_name = 'The Pretender'
    AND artist_name = 'Foo Fighters'
    AND section_type IS NULL
ORDER BY updated_at DESC;

-- 3. Show latest track-level BPM (what the playlist mapper should use)
SELECT 
    'LATEST_TRACK_BPM' as query_type,
    track_id,
    track_name,
    artist_name,
    spotify_tempo,
    tempo_source,
    tempo_confidence,
    created_at,
    updated_at
FROM streaming_vendor_attributes 
WHERE track_name = 'The Pretender'
    AND artist_name = 'Foo Fighters'
    AND section_type IS NULL
    AND spotify_tempo IS NOT NULL
ORDER BY updated_at DESC
LIMIT 1;

-- 4. Count how many different BPM values exist
SELECT 
    'BPM_COUNT' as query_type,
    spotify_tempo,
    COUNT(*) as record_count,
    MIN(created_at) as first_seen,
    MAX(updated_at) as last_updated
FROM streaming_vendor_attributes 
WHERE track_name = 'The Pretender'
    AND artist_name = 'Foo Fighters'
    AND spotify_tempo IS NOT NULL
GROUP BY spotify_tempo
ORDER BY last_updated DESC;

-- 5. Check if there are any duplicate track_ids with different BPM values
SELECT 
    'DUPLICATE_CHECK' as query_type,
    track_id,
    COUNT(DISTINCT spotify_tempo) as different_bpm_count,
    ARRAY_AGG(DISTINCT spotify_tempo) as bpm_values
FROM streaming_vendor_attributes 
WHERE track_name = 'The Pretender'
    AND artist_name = 'Foo Fighters'
    AND spotify_tempo IS NOT NULL
    AND section_type IS NULL
GROUP BY track_id
HAVING COUNT(DISTINCT spotify_tempo) > 1;