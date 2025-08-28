-- Insert specific warm-up narratives for smart timing
-- First, get the spinning warmup phase ID

WITH spinning_warmup AS (
  SELECT wp.id as phase_id
  FROM workout_phases wp
  JOIN workout_types wt ON wp.workout_type_id = wt.id
  WHERE wt.name = 'spinning' AND wp.phase_type = 'warmup'
)
INSERT INTO instruction_narratives (workout_phase_id, narrative_type, text, timing, interval_beats, sort_order)
SELECT 
  sw.phase_id,
  narrative_data.narrative_type,
  narrative_data.text,
  narrative_data.timing,
  narrative_data.interval_beats,
  narrative_data.sort_order
FROM spinning_warmup sw
CROSS JOIN (VALUES
  -- Narrative 1: After first 4 bars (bar_start with interval 4, but only show once)
  ('beat_cue', 'We''re just warming up the legs here', 'bar_start', 4, 1),
  
  -- Narrative 2: 7 seconds before chorus 
  ('beat_cue', 'Chorus in 7 seconds', 'pre_chorus', NULL, 2)
) AS narrative_data(narrative_type, text, timing, interval_beats, sort_order);