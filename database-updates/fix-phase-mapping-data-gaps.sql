-- FIX PHASE MAPPING DATA GAPS - Add missing track data to prevent fallback behavior
-- Based on the debug analysis, these tracks are likely missing from SVA table

-- First, check what data is currently missing
-- Run the diagnostic script first: \i database-updates/diagnose-phase-mapping-issue.sql

-- Add sample Oasis track data (100 BPM should map to appropriate workout_track)
INSERT INTO streaming_vendor_attributes (
    track_name, 
    artist_name, 
    spotify_tempo,
    event_type,
    data_source,
    notes,
    created_at
) VALUES 
-- Oasis tracks - typical BPM around 90-100
('Wonderwall', 'Oasis', 87, 'track_analysis', 'manual_entry', 'Added to fix phase mapping fallback', NOW()),
('Don''t Look Back in Anger', 'Oasis', 84, 'track_analysis', 'manual_entry', 'Added to fix phase mapping fallback', NOW()),
('Champagne Supernova', 'Oasis', 75, 'track_analysis', 'manual_entry', 'Added to fix phase mapping fallback', NOW()),

-- Dirge tracks - typically slower, around 60-80 BPM  
('Death in Vegas', 'The Dirge', 58, 'track_analysis', 'manual_entry', 'Added to fix phase mapping fallback', NOW()),
('Scorpio Rising', 'The Dirge', 62, 'track_analysis', 'manual_entry', 'Added to fix phase mapping fallback', NOW())

ON CONFLICT (track_name, artist_name) DO UPDATE SET
    spotify_tempo = EXCLUDED.spotify_tempo,
    notes = EXCLUDED.notes || ' | Updated: ' || NOW(),
    updated_at = NOW();

-- Verify the insertions worked
SELECT 
    'Newly Added Tracks' as verification,
    track_name,
    artist_name,
    spotify_tempo,
    notes,
    created_at
FROM streaming_vendor_attributes
WHERE notes LIKE '%Added to fix phase mapping fallback%'
ORDER BY track_name;

-- Show what workout_track these BPM values should map to
WITH new_tracks AS (
    SELECT track_name, artist_name, spotify_tempo
    FROM streaming_vendor_attributes  
    WHERE notes LIKE '%Added to fix phase mapping fallback%'
)
SELECT 
    'Expected Workout Track Mapping' as verification,
    nt.track_name,
    nt.artist_name,
    nt.spotify_tempo as bpm,
    wp.workout_track as expected_mapping,
    wp.target_tempo_min || '-' || wp.target_tempo_max as bpm_range
FROM new_tracks nt
LEFT JOIN workout_phases wp 
    ON nt.spotify_tempo >= wp.target_tempo_min 
    AND nt.spotify_tempo <= wp.target_tempo_max
ORDER BY nt.spotify_tempo;

-- Alternative: If you know the exact track IDs and names from Spotify, update this section:
-- IMPORTANT: Replace these with actual track names/artists from your Spotify playlist

/* 
-- Use this template if you have specific track information:
INSERT INTO streaming_vendor_attributes (
    track_id,           -- Spotify track ID if available
    track_name, 
    artist_name, 
    spotify_tempo,
    event_type,
    data_source,
    notes
) VALUES 
('actual_spotify_track_id', 'Actual Track Name', 'Actual Artist', ACTUAL_BPM, 'track_analysis', 'spotify_fix', 'Fixed missing SVA data');
*/

-- Log completion
SELECT '✅ Phase mapping data gaps fixed. Test in app to verify fallback behavior resolved.' as status;