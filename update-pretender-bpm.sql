-- Update The Pretender BPM to correct value for sprint_intervals mapping
-- The Pretender by Foo Fighters is 172 BPM (sprint_intervals range: 140-200 BPM)

UPDATE streaming_vendor_attributes 
SET spotify_tempo = 172
WHERE track_name ILIKE '%pretender%' 
AND artist_name ILIKE '%foo fighters%';

-- Verify the update
SELECT track_name, artist_name, spotify_tempo, section_type, timestamp_ms
FROM streaming_vendor_attributes 
WHERE track_name ILIKE '%pretender%' 
AND artist_name ILIKE '%foo fighters%'
ORDER BY timestamp_ms;

-- Show what workout_track this BPM maps to
SELECT 
  'The Pretender' as song,
  172 as bpm,
  workout_track,
  target_tempo_min,
  target_tempo_max
FROM workout_phases
WHERE 172 >= target_tempo_min AND 172 <= target_tempo_max;