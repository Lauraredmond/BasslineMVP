-- v_workout_phases view - provides joined view of phases with narratives and type names
-- This view makes it easy to query workout phases with their associated narratives via REST API

DROP VIEW IF EXISTS v_workout_phases;

CREATE VIEW v_workout_phases AS
SELECT 
  wp.workout_phase_id,
  wp.workout_track,
  wp.target_tempo_min,
  wp.target_tempo_max,
  wp.description as phase_description,
  
  -- Phase type names for better UX
  CASE wp.workout_track
    WHEN 'warmup' THEN 'Warm Up'
    WHEN 'sprint_intervals' THEN 'Sprint Intervals' 
    WHEN 'resistance' THEN 'Resistance Power'
    WHEN 'jumps' THEN 'Sprint Jumps'
    WHEN 'climb' THEN 'Endurance Climb'
    WHEN 'cooldown' THEN 'Cool Down'
    WHEN 'hills' THEN 'Rolling Hills'
    WHEN 'recovery' THEN 'Recovery'
    ELSE INITCAP(wp.workout_track)
  END as phase_type_name,
  
  -- BPM range as readable string
  CONCAT(wp.target_tempo_min, '-', wp.target_tempo_max, ' BPM') as bpm_range,
  
  -- Count of available narratives for this phase
  COUNT(DISTINCT ina.narrative_id) as narrative_count,
  
  -- Available sections that have narratives
  STRING_AGG(DISTINCT ina.section_type, ', ' ORDER BY ina.section_type) as available_sections,
  
  wp.created_at,
  wp.updated_at

FROM workout_phases wp
LEFT JOIN instruction_narratives ina ON wp.workout_track = ina.workout_track
GROUP BY 
  wp.workout_phase_id,
  wp.workout_track, 
  wp.target_tempo_min,
  wp.target_tempo_max,
  wp.description,
  wp.created_at,
  wp.updated_at
ORDER BY wp.target_tempo_min ASC;

-- Grant read access to the view
GRANT SELECT ON v_workout_phases TO anon, authenticated;

-- Example usage:
-- SELECT * FROM v_workout_phases WHERE 100 BETWEEN target_tempo_min AND target_tempo_max;
-- This will show which phase(s) a song with 100 BPM should map to