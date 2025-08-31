-- Database Schema Inspection Queries
-- Run these in Supabase SQL Editor to verify table structures

-- 1. Check which target tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('streaming_vendor_attributes', 'instruction_narratives', 'workout_phases')
ORDER BY table_name;

-- 2. Get detailed column information for streaming_vendor_attributes
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length,
    numeric_precision,
    numeric_scale,
    ordinal_position
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'streaming_vendor_attributes'
ORDER BY ordinal_position;

-- 3. Get detailed column information for instruction_narratives  
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length,
    numeric_precision,
    numeric_scale,
    ordinal_position
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'instruction_narratives'
ORDER BY ordinal_position;

-- 4. Get detailed column information for workout_phases
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length,
    numeric_precision,
    numeric_scale,
    ordinal_position
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'workout_phases'
ORDER BY ordinal_position;

-- 5. Check table constraints (primary keys, foreign keys, unique constraints)
SELECT 
    tc.table_name,
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
LEFT JOIN information_schema.constraint_column_usage ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_schema = 'public'
AND tc.table_name IN ('streaming_vendor_attributes', 'instruction_narratives', 'workout_phases')
ORDER BY tc.table_name, tc.constraint_type;

-- 6. Get row counts for each table
SELECT 'streaming_vendor_attributes' as table_name, COUNT(*) as row_count 
FROM streaming_vendor_attributes
UNION ALL
SELECT 'instruction_narratives' as table_name, COUNT(*) as row_count 
FROM instruction_narratives
UNION ALL
SELECT 'workout_phases' as table_name, COUNT(*) as row_count 
FROM workout_phases;

-- 7. Sample data from streaming_vendor_attributes
SELECT 
    track_name,
    artist_name,
    timestamp_ms,
    event_type,
    section_type,
    section_number,
    energy_level,
    intensity_level,
    spotify_track_id,
    created_at
FROM streaming_vendor_attributes 
ORDER BY track_name, timestamp_ms
LIMIT 10;

-- 8. Sample data from instruction_narratives
SELECT 
    workout_track,
    song_component,
    LEFT(text, 100) || '...' as text_preview,
    created_at
FROM instruction_narratives 
ORDER BY workout_track, song_component
LIMIT 10;

-- 9. Sample data from workout_phases
SELECT 
    workout_track,
    target_tempo_min,
    target_tempo_max,
    created_at
FROM workout_phases 
ORDER BY target_tempo_min;

-- 10. Analyze relationships between tables
-- Show which workout_tracks exist in both instruction_narratives and workout_phases
SELECT 
    'Both tables' as status,
    wp.workout_track,
    wp.target_tempo_min,
    wp.target_tempo_max,
    COUNT(in_table.id) as narrative_count
FROM workout_phases wp
LEFT JOIN instruction_narratives in_table ON wp.workout_track = in_table.workout_track
GROUP BY wp.workout_track, wp.target_tempo_min, wp.target_tempo_max
ORDER BY wp.target_tempo_min;

-- 11. Show unique section_types in streaming_vendor_attributes
SELECT 
    section_type,
    COUNT(*) as occurrence_count,
    COUNT(DISTINCT track_name) as track_count
FROM streaming_vendor_attributes 
WHERE section_type IS NOT NULL
GROUP BY section_type
ORDER BY occurrence_count DESC;

-- 12. Show unique song_components in instruction_narratives
SELECT 
    song_component,
    COUNT(*) as narrative_count,
    COUNT(DISTINCT workout_track) as workout_track_count
FROM instruction_narratives
GROUP BY song_component
ORDER BY narrative_count DESC;

-- 13. Check for potential mapping issues between section_type and song_component
-- This shows section_types from SVA that don't have corresponding song_components in IN
SELECT DISTINCT 
    sva.section_type,
    'Missing in instruction_narratives' as issue
FROM streaming_vendor_attributes sva
LEFT JOIN instruction_narratives in_table ON sva.section_type = in_table.song_component
WHERE sva.section_type IS NOT NULL 
AND in_table.song_component IS NULL;

-- 14. Show BPM distribution to verify workout_phases ranges are appropriate
SELECT 
    CASE 
        WHEN spotify_tempo BETWEEN 60 AND 69 THEN 'cooldown (60-69)'
        WHEN spotify_tempo BETWEEN 70 AND 79 THEN 'warmup (70-79)'
        WHEN spotify_tempo BETWEEN 80 AND 84 THEN 'climb (80-84)'
        WHEN spotify_tempo BETWEEN 85 AND 94 THEN 'resistance (85-94)'
        WHEN spotify_tempo BETWEEN 95 AND 119 THEN 'hills (95-119)'
        WHEN spotify_tempo BETWEEN 120 AND 139 THEN 'jumps (120-139)'
        WHEN spotify_tempo BETWEEN 140 AND 200 THEN 'sprint_intervals (140-200)'
        ELSE 'outside_ranges'
    END as suggested_workout_track,
    COUNT(*) as track_count,
    MIN(spotify_tempo) as min_bpm,
    MAX(spotify_tempo) as max_bpm,
    AVG(spotify_tempo) as avg_bpm
FROM streaming_vendor_attributes 
WHERE spotify_tempo IS NOT NULL
GROUP BY 
    CASE 
        WHEN spotify_tempo BETWEEN 60 AND 69 THEN 'cooldown (60-69)'
        WHEN spotify_tempo BETWEEN 70 AND 79 THEN 'warmup (70-79)'
        WHEN spotify_tempo BETWEEN 80 AND 84 THEN 'climb (80-84)'
        WHEN spotify_tempo BETWEEN 85 AND 94 THEN 'resistance (85-94)'
        WHEN spotify_tempo BETWEEN 95 AND 119 THEN 'hills (95-119)'
        WHEN spotify_tempo BETWEEN 120 AND 139 THEN 'jumps (120-139)'
        WHEN spotify_tempo BETWEEN 140 AND 200 THEN 'sprint_intervals (140-200)'
        ELSE 'outside_ranges'
    END
ORDER BY min_bpm;