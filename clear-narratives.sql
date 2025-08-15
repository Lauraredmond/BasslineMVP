-- COMPLETELY CLEAR all warmup narratives and insert ONLY the 2 you want

-- First: Delete ALL existing warmup narratives
DELETE FROM instruction_narratives 
WHERE workout_phase_id IN (
  SELECT wp.id 
  FROM workout_phases wp
  JOIN workout_types wt ON wp.workout_type_id = wt.id
  WHERE wt.name = 'spinning' AND wp.phase_type = 'warmup'
);

-- Second: Insert ONLY your 2 specific narratives
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
  -- EXACT narrative 1: After 4 bars
  ('beat_cue', 'We''re just warming up the legs here', 'bar_start', 4, 1),
  
  -- EXACT narrative 2: 7 seconds before chorus
  ('beat_cue', 'Chorus in 7 seconds', 'pre_chorus', NULL, 2)
) AS narrative_data(narrative_type, text, timing, interval_beats, sort_order);