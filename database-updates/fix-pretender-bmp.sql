-- Fix script to ensure consistent BPM for "The Pretender" by Foo Fighters
-- This script will standardize the BPM to 173 based on console logs showing correct RapidAPI data

-- Step 1: Check current state
SELECT 
    'BEFORE_FIX' as status,
    track_id,
    spotify_tempo,
    tempo_source,
    updated_at
FROM streaming_vendor_attributes 
WHERE track_name = 'The Pretender'
    AND artist_name = 'Foo Fighters'
    AND section_type IS NULL
ORDER BY updated_at DESC;

-- Step 2: Update all track-level records to have consistent BPM
UPDATE streaming_vendor_attributes 
SET 
    spotify_tempo = 173,
    tempo_source = 'rapidapi_verified',
    tempo_confidence = 0.9,
    tempo_last_verified_at = NOW(),
    updated_at = NOW()
WHERE track_name = 'The Pretender'
    AND artist_name = 'Foo Fighters'
    AND section_type IS NULL
    AND (spotify_tempo != 173 OR spotify_tempo IS NULL);

-- Step 3: Verify the fix
SELECT 
    'AFTER_FIX' as status,
    track_id,
    spotify_tempo,
    tempo_source,
    tempo_confidence,
    updated_at
FROM streaming_vendor_attributes 
WHERE track_name = 'The Pretender'
    AND artist_name = 'Foo Fighters'
    AND section_type IS NULL
ORDER BY updated_at DESC;

-- Step 4: Verify phase mapping
SELECT 
    'PHASE_MAPPING' as status,
    173 as bpm,
    CASE 
        WHEN 173 BETWEEN 60 AND 69 THEN 'cooldown'
        WHEN 173 BETWEEN 70 AND 79 THEN 'warmup'
        WHEN 173 BETWEEN 80 AND 94 THEN 'climb'
        WHEN 173 BETWEEN 95 AND 119 THEN 'hills'
        WHEN 173 BETWEEN 120 AND 139 THEN 'jumps'
        WHEN 173 BETWEEN 140 AND 200 THEN 'sprint_intervals'
        ELSE 'out_of_range'
    END as correct_phase,
    CASE 
        WHEN 100 BETWEEN 60 AND 69 THEN 'cooldown'
        WHEN 100 BETWEEN 70 AND 79 THEN 'warmup'
        WHEN 100 BETWEEN 80 AND 94 THEN 'climb'
        WHEN 100 BETWEEN 95 AND 119 THEN 'hills'
        WHEN 100 BETWEEN 120 AND 139 THEN 'jumps'
        WHEN 100 BETWEEN 140 AND 200 THEN 'sprint_intervals'
        ELSE 'out_of_range'
    END as incorrect_phase_from_100bpm;