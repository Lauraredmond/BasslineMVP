-- FIX BPM BOUNDARY CONDITION BUG
-- Oasis (100 BPM) should map to 'climb' (90-100) not 'hills' (101-115)

-- First, verify the current issue
SELECT 
    'Current Problem Analysis' as test_type,
    wp.workout_track,
    wp.target_tempo_min,
    wp.target_tempo_max,
    CASE 
        WHEN 100 >= wp.target_tempo_min AND 100 <= wp.target_tempo_max 
        THEN '✅ SHOULD MATCH'
        ELSE '❌ Should not match'
    END as oasis_100_bpm_match
FROM workout_phases wp
ORDER BY wp.target_tempo_min;

-- Test the query that your app is using
SELECT 
    'App Query Test - Oasis 100 BPM' as test_type,
    workout_track,
    target_tempo_min,
    target_tempo_max,
    target_tempo_max - target_tempo_min as range_size
FROM workout_phases 
WHERE 100 >= target_tempo_min AND 100 <= target_tempo_max
ORDER BY (target_tempo_max - target_tempo_min) ASC; -- Narrowest range first

-- Test the query for Dirge 58 BPM  
SELECT 
    'App Query Test - Dirge 58 BPM' as test_type,
    workout_track,
    target_tempo_min,
    target_tempo_max,
    target_tempo_max - target_tempo_min as range_size
FROM workout_phases 
WHERE 58 >= target_tempo_min AND 58 <= target_tempo_max
ORDER BY (target_tempo_max - target_tempo_min) ASC;

-- Test the query for Foo Fighters 170 BPM (this should work correctly)
SELECT 
    'App Query Test - Foo Fighters 170 BPM' as test_type,
    workout_track,
    target_tempo_min,
    target_tempo_max,
    target_tempo_max - target_tempo_min as range_size
FROM workout_phases 
WHERE 170 >= target_tempo_min AND 170 <= target_tempo_max
ORDER BY (target_tempo_max - target_tempo_min) ASC;

-- If the queries above show correct results, the issue is in the app code
-- If they show wrong results, we need to fix the data

-- Check if there are any overlapping ranges causing confusion
SELECT 
    'Overlap Check' as analysis,
    w1.workout_track as track1,
    w1.target_tempo_min || '-' || w1.target_tempo_max as range1,
    w2.workout_track as track2,
    w2.target_tempo_min || '-' || w2.target_tempo_max as range2,
    '⚠️ OVERLAP DETECTED' as issue
FROM workout_phases w1, workout_phases w2
WHERE w1.id != w2.id
  AND ((w1.target_tempo_min <= w2.target_tempo_max AND w1.target_tempo_max >= w2.target_tempo_min))
ORDER BY w1.target_tempo_min;

-- Show all tracks from SVA and their expected mappings
SELECT DISTINCT
    'SVA Track Mapping Verification' as analysis,
    sva.track_name as track,
    sva.artist_name,
    sva.spotify_tempo as bpm,
    wp.workout_track as expected_mapping,
    wp.target_tempo_min || '-' || wp.target_tempo_max as range
FROM streaming_vendor_attributes sva
LEFT JOIN workout_phases wp 
    ON sva.spotify_tempo >= wp.target_tempo_min 
    AND sva.spotify_tempo <= wp.target_tempo_max
WHERE sva.spotify_tempo IS NOT NULL
ORDER BY sva.spotify_tempo;