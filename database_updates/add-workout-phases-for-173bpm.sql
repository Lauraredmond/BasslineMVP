-- Add workout_phases data to handle 173 BPM (for sprint_intervals workout_track)
-- This will fix the 406 error when mapping BPM to workout_track
-- Fixed column names to match actual schema

INSERT INTO workout_phases (
    workout_track,
    target_tempo_min,
    target_tempo_max,
    created_at
) VALUES 
-- High intensity phase for songs around 170+ BPM (covers The Pretender at 173)
-- Use existing sprint_intervals workout_track
('sprint_intervals', 160, 180, NOW())

ON CONFLICT (workout_track) DO UPDATE SET
    target_tempo_min = EXCLUDED.target_tempo_min,
    target_tempo_max = EXCLUDED.target_tempo_max,
    created_at = NOW();

-- Verify the data  
SELECT workout_track, target_tempo_min, target_tempo_max 
FROM workout_phases 
ORDER BY target_tempo_min;