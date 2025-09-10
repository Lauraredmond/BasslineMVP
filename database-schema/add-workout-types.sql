-- Add missing workout_types table and relationships to fix PGRST200 error
-- This ADDS to the existing schema without breaking primer.md compatibility

-- Create workout_types table (the missing table causing PGRST200 error)
CREATE TABLE IF NOT EXISTS workout_types (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR NOT NULL UNIQUE, -- 'spinning', 'strength', etc.
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add missing columns to workout_phases table (don't recreate, just add what's missing)
ALTER TABLE workout_phases ADD COLUMN IF NOT EXISTS workout_type_id UUID;
ALTER TABLE workout_phases ADD COLUMN IF NOT EXISTS phase_type VARCHAR;

-- Insert workout types
INSERT INTO workout_types (name, description) VALUES
('spinning', 'Indoor cycling/spinning workouts'),
('strength', 'Strength training workouts'),
('general', 'General fitness workouts')
ON CONFLICT (name) DO NOTHING;

-- Update workout_phases to have the workout_type_id and phase_type values
UPDATE workout_phases SET 
  workout_type_id = (SELECT id FROM workout_types WHERE name = 'spinning'),
  phase_type = workout_track
WHERE workout_type_id IS NULL;

-- Add foreign key constraint (after data is populated)
ALTER TABLE workout_phases 
ADD CONSTRAINT fk_workout_phases_workout_type 
FOREIGN KEY (workout_type_id) REFERENCES workout_types(id) ON DELETE CASCADE;

-- Update instruction_narratives to have workout_phase_id reference (if missing)
ALTER TABLE instruction_narratives ADD COLUMN IF NOT EXISTS workout_phase_id UUID;

-- Populate workout_phase_id in instruction_narratives
UPDATE instruction_narratives SET 
  workout_phase_id = (
    SELECT id FROM workout_phases 
    WHERE workout_phases.workout_track = instruction_narratives.workout_track 
    LIMIT 1
  )
WHERE workout_phase_id IS NULL;

-- Add foreign key for instruction_narratives (after data is populated)
ALTER TABLE instruction_narratives
ADD CONSTRAINT fk_instruction_narratives_workout_phase
FOREIGN KEY (workout_phase_id) REFERENCES workout_phases(id) ON DELETE CASCADE;

-- Add missing columns that frontend might expect
ALTER TABLE instruction_narratives ADD COLUMN IF NOT EXISTS narrative_type VARCHAR DEFAULT 'instruction';
ALTER TABLE instruction_narratives ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
ALTER TABLE instruction_narratives ADD COLUMN IF NOT EXISTS interval_beats INTEGER;

-- Enable RLS on new table
ALTER TABLE workout_types ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for new table
CREATE POLICY "Allow public read access to workout types" ON workout_types FOR SELECT TO anon, authenticated USING (true);

-- Grant permissions on new table
GRANT SELECT ON workout_types TO anon, authenticated;

-- Update the view to include the proper joins (drop and recreate)
DROP VIEW IF EXISTS v_workout_phases;

CREATE VIEW v_workout_phases AS
SELECT 
  wp.workout_phase_id,
  wp.phase_type,
  wp.workout_track,
  wp.target_tempo_min,
  wp.target_tempo_max,
  wp.description,
  wt.name as workout_type_name,
  -- User-friendly phase names
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
  CONCAT(wp.target_tempo_min, '-', wp.target_tempo_max, ' BPM') as bpm_range,
  COUNT(DISTINCT ina.narrative_id) as narrative_count,
  STRING_AGG(DISTINCT ina.section_type, ', ' ORDER BY ina.section_type) as available_sections
FROM workout_phases wp
LEFT JOIN workout_types wt ON wp.workout_type_id = wt.id
LEFT JOIN instruction_narratives ina ON wp.workout_phase_id = ina.workout_phase_id  
GROUP BY wp.workout_phase_id, wp.phase_type, wp.workout_track, wp.target_tempo_min, wp.target_tempo_max, wp.description, wt.name
ORDER BY wp.target_tempo_min ASC;

-- Grant permissions on updated view
GRANT SELECT ON v_workout_phases TO anon, authenticated;

-- Create indexes for new relationships
CREATE INDEX IF NOT EXISTS idx_wp_workout_type ON workout_phases(workout_type_id);
CREATE INDEX IF NOT EXISTS idx_in_workout_phase_id ON instruction_narratives(workout_phase_id);