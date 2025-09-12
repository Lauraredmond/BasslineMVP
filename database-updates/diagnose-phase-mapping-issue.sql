-- PHASE MAPPING DIAGNOSTIC - Find missing tracks causing fallback behavior
-- This investigates why some tracks work (Foo Fighters) while others fallback to "Hills"

-- 1. Check what tracks exist in streaming_vendor_attributes
SELECT 
    'SVA Table Contents' as analysis_type,
    track_name,
    artist_name,
    spotify_tempo,
    COUNT(*) as record_count
FROM streaming_vendor_attributes
WHERE track_name IS NOT NULL
GROUP BY track_name, artist_name, spotify_tempo
ORDER BY track_name;

-- 2. Check workout_phases table to see BPM ranges
SELECT 
    'Workout Phases Ranges' as analysis_type,
    workout_track,
    target_tempo_min,
    target_tempo_max,
    (target_tempo_max - target_tempo_min) as range_size
FROM workout_phases
ORDER BY target_tempo_min;

-- 3. Find tracks that might be missing in SVA but playing in Spotify
-- (This shows potential data gaps)
SELECT 
    'Potential Data Gaps' as analysis_type,
    'Check if these tracks are missing:' as note,
    'Oasis tracks (~100 BPM)' as missing_track_1,
    'Dirge tracks (~58 BPM)' as missing_track_2;

-- 4. Show what workout_track each BPM would map to
WITH bpm_examples AS (
    SELECT generate_series(50, 200, 10) as test_bpm
)
SELECT 
    'BPM Mapping Test' as analysis_type,
    test_bpm,
    wp.workout_track,
    wp.target_tempo_min || '-' || wp.target_tempo_max as bpm_range
FROM bpm_examples b
LEFT JOIN workout_phases wp 
    ON b.test_bpm >= wp.target_tempo_min 
    AND b.test_bpm <= wp.target_tempo_max
ORDER BY test_bpm;

-- 5. Check if there are any duplicates or overlapping ranges
SELECT 
    'Range Overlap Analysis' as analysis_type,
    w1.workout_track as track1,
    w1.target_tempo_min || '-' || w1.target_tempo_max as range1,
    w2.workout_track as track2,
    w2.target_tempo_min || '-' || w2.target_tempo_max as range2,
    'OVERLAP!' as warning
FROM workout_phases w1
JOIN workout_phases w2 ON w1.id != w2.id
WHERE (w1.target_tempo_min BETWEEN w2.target_tempo_min AND w2.target_tempo_max)
   OR (w1.target_tempo_max BETWEEN w2.target_tempo_min AND w2.target_tempo_max)
   OR (w2.target_tempo_min BETWEEN w1.target_tempo_min AND w1.target_tempo_max);

-- 6. Check instruction_narratives to see if narratives exist for all workout_tracks
SELECT 
    'Narrative Coverage' as analysis_type,
    wp.workout_track,
    COUNT(DISTINCT inn.song_component) as available_sections,
    string_agg(DISTINCT inn.song_component, ', ') as sections
FROM workout_phases wp
LEFT JOIN instruction_narratives inn ON wp.workout_track = inn.workout_track
GROUP BY wp.workout_track
ORDER BY wp.workout_track;

-- 7. Find the "Hills" fallback source
SELECT 
    'Hills Fallback Investigation' as analysis_type,
    workout_track,
    target_tempo_min || '-' || target_tempo_max as bmp_range,
    CASE 
        WHEN workout_track ILIKE '%hill%' THEN 'FOUND: This is the Hills source'
        ELSE 'Not hills-related'
    END as hills_check
FROM workout_phases
ORDER BY workout_track;