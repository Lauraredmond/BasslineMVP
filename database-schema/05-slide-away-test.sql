-- Test query to confirm "Slide Away" BPM=100 maps to "climb" phase
-- This implements the primer.md algorithm for BPM→phase mapping

-- Algorithm: Use SVA.spotify_tempo and find WP row where target_tempo_min <= BPM <= target_tempo_max
-- If multiple matches, choose narrowest range

WITH bpm_test AS (
  -- Step 1: Get BPM for "Slide Away" (should be 100)
  SELECT 
    'slide_away_test_id' as track_id,
    'Slide Away' as track_name,
    100 as tempo -- Test BPM per primer.md requirement
),
phase_candidates AS (
  -- Step 2: Find all workout phases that match BPM=100
  SELECT
    bt.track_id,
    bt.track_name, 
    bt.tempo,
    wp.workout_phase_id,
    wp.workout_track,
    wp.target_tempo_min,
    wp.target_tempo_max,
    -- Calculate range span for tie-breaking (narrowest range wins)
    (wp.target_tempo_max - wp.target_tempo_min) as range_span
  FROM bpm_test bt
  JOIN workout_phases wp 
    ON bt.tempo BETWEEN wp.target_tempo_min AND wp.target_tempo_max
),
best_match AS (
  -- Step 3: Pick the phase with the narrowest range (tie-breaker per primer.md)
  SELECT *
  FROM phase_candidates
  ORDER BY range_span ASC
  LIMIT 1
)
-- Final result: Should show "Slide Away" BPM=100 maps to "climb" phase
SELECT 
  track_name,
  tempo as bpm,
  workout_track as mapped_phase,
  target_tempo_min,
  target_tempo_max,
  range_span,
  CASE 
    WHEN workout_track = 'climb' THEN '✅ CORRECT: Maps to climb as expected'
    ELSE '❌ ERROR: Should map to climb phase'
  END as validation_result
FROM best_match;

-- Expected result:
-- track_name: "Slide Away"
-- bpm: 100  
-- mapped_phase: "climb"
-- target_tempo_min: 90
-- target_tempo_max: 120
-- range_span: 30
-- validation_result: "✅ CORRECT: Maps to climb as expected"