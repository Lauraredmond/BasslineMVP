-- Complete database setup for Bassline MVP - Fixed to match frontend expectations
-- This fixes PGRST200 error: "Could not find a relationship between 'workout_phases' and 'workout_types'"

-- Drop existing objects if they exist (for clean setup)
DROP VIEW IF EXISTS v_workout_phases CASCADE;
DROP TABLE IF EXISTS playlist_phase_map CASCADE;
DROP TABLE IF EXISTS instruction_narratives CASCADE; 
DROP TABLE IF EXISTS workout_phases CASCADE;
DROP TABLE IF EXISTS workout_types CASCADE;
DROP TABLE IF EXISTS streaming_vendor_attributes CASCADE;

-- Create workout_types table (missing table that frontend expects)
CREATE TABLE workout_types (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR NOT NULL UNIQUE, -- 'spinning', 'strength', etc.
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create streaming_vendor_attributes table (with all columns frontend uses)
CREATE TABLE streaming_vendor_attributes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  track_id VARCHAR,
  track_name VARCHAR NOT NULL,
  artist_name VARCHAR,
  spotify_tempo NUMERIC, -- BPM for full track
  section_type VARCHAR, -- intro, verse, chorus, bridge, drop, outro  
  section_number INTEGER,
  timestamp_ms BIGINT,
  -- Additional columns used by frontend code
  event_type VARCHAR,
  energy_level INTEGER,
  intensity_level INTEGER,
  data_source VARCHAR,
  track_duration_ms BIGINT,
  captured_by VARCHAR,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create workout_phases table (updated to match frontend expectations)
CREATE TABLE workout_phases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY, -- frontend expects 'id', not 'workout_phase_id'
  workout_type_id UUID NOT NULL, -- FK to workout_types (frontend expects this)
  phase_type VARCHAR NOT NULL, -- frontend expects 'phase_type', not 'workout_track'
  workout_track VARCHAR NOT NULL, -- keep for primer.md compatibility
  target_tempo_min INTEGER NOT NULL,
  target_tempo_max INTEGER NOT NULL, 
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT valid_tempo_range CHECK (target_tempo_min <= target_tempo_max),
  CONSTRAINT positive_tempo CHECK (target_tempo_min > 0 AND target_tempo_max > 0),
  FOREIGN KEY (workout_type_id) REFERENCES workout_types(id) ON DELETE CASCADE
);

-- Create instruction_narratives table (updated structure)
CREATE TABLE instruction_narratives (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workout_phase_id UUID NOT NULL, -- FK to workout_phases.id
  workout_track VARCHAR NOT NULL, -- for primer.md compatibility
  section_type VARCHAR NOT NULL, -- intro, verse, chorus, bridge, drop, outro
  narrative_text TEXT NOT NULL,
  narrative_type VARCHAR DEFAULT 'instruction', -- 'instruction', 'beat_cue', etc.
  sort_order INTEGER DEFAULT 0,
  interval_beats INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (workout_phase_id) REFERENCES workout_phases(id) ON DELETE CASCADE
);

-- Create playlist_phase_map table (for locked mappings per primer.md)
CREATE TABLE playlist_phase_map (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  track_id VARCHAR NOT NULL,
  workout_phase_id UUID NOT NULL,
  workout_track VARCHAR NOT NULL,
  locked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  session_identifier VARCHAR,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (workout_phase_id) REFERENCES workout_phases(id) ON DELETE CASCADE
);

-- Insert workout types
INSERT INTO workout_types (name, description) VALUES
('spinning', 'Indoor cycling/spinning workouts'),
('strength', 'Strength training workouts'),
('general', 'General fitness workouts');

-- Insert workout phases (matching both frontend expectations and primer.md spec)
INSERT INTO workout_phases (workout_type_id, phase_type, workout_track, target_tempo_min, target_tempo_max, description) 
SELECT 
  wt.id,
  'warmup',
  'warmup', 
  50, 
  70, 
  'Gentle warm-up to prepare the body for exercise'
FROM workout_types wt WHERE wt.name = 'spinning'
UNION ALL
SELECT 
  wt.id,
  'resistance',
  'resistance',
  55,
  85,
  'Heavy resistance work with controlled cadence'
FROM workout_types wt WHERE wt.name = 'spinning'
UNION ALL
SELECT 
  wt.id,
  'climb', 
  'climb',
  90,
  120,
  'Sustained climbing efforts - BPM=100 MAPS HERE'
FROM workout_types wt WHERE wt.name = 'spinning'
UNION ALL
SELECT 
  wt.id,
  'jumps',
  'jumps', 
  140,
  170,
  'High-energy position changes and explosive movements'
FROM workout_types wt WHERE wt.name = 'spinning'
UNION ALL
SELECT 
  wt.id,
  'sprint_intervals',
  'sprint_intervals',
  160,
  180,
  'Maximum speed intervals with light resistance'
FROM workout_types wt WHERE wt.name = 'spinning'
UNION ALL
SELECT 
  wt.id,
  'hills',
  'hills',
  100,
  140,
  'Rolling hill climbs with varying resistance'
FROM workout_types wt WHERE wt.name = 'spinning'
UNION ALL
SELECT 
  wt.id,
  'recovery',
  'recovery',
  60,
  90,
  'Active recovery between intense efforts'
FROM workout_types wt WHERE wt.name = 'spinning'
UNION ALL
SELECT 
  wt.id,
  'cooldown',
  'cooldown',
  50,
  70,
  'Gentle cool-down to bring heart rate down'
FROM workout_types wt WHERE wt.name = 'spinning';

-- Insert test narratives (updated to use workout_phase_id)
INSERT INTO instruction_narratives (workout_phase_id, workout_track, section_type, narrative_text, narrative_type, sort_order)
SELECT 
  wp.id,
  wp.workout_track,
  'intro',
  'Time for a climb! Add some resistance and settle into your climbing rhythm.',
  'instruction',
  1
FROM workout_phases wp 
JOIN workout_types wt ON wp.workout_type_id = wt.id
WHERE wt.name = 'spinning' AND wp.phase_type = 'climb'
UNION ALL
SELECT 
  wp.id,
  wp.workout_track, 
  'verse',
  'Steady climbing here. Feel that resistance in your legs, drive through your heels.',
  'instruction',
  2
FROM workout_phases wp
JOIN workout_types wt ON wp.workout_type_id = wt.id
WHERE wt.name = 'spinning' AND wp.phase_type = 'climb'
UNION ALL
SELECT 
  wp.id,
  wp.workout_track,
  'chorus', 
  'This is your mountain! Push through this climb with power and control.',
  'instruction',
  3
FROM workout_phases wp
JOIN workout_types wt ON wp.workout_type_id = wt.id  
WHERE wt.name = 'spinning' AND wp.phase_type = 'climb'
UNION ALL
SELECT 
  wp.id,
  wp.workout_track,
  'intro',
  'Sprint track! Medium pace to start with.',
  'instruction',
  1
FROM workout_phases wp
JOIN workout_types wt ON wp.workout_type_id = wt.id
WHERE wt.name = 'spinning' AND wp.phase_type = 'sprint_intervals'
UNION ALL
SELECT 
  wp.id,
  wp.workout_track,
  'verse', 
  'Easy spinning here, just getting the legs moving and the blood flowing.',
  'instruction',
  1
FROM workout_phases wp
JOIN workout_types wt ON wp.workout_type_id = wt.id
WHERE wt.name = 'spinning' AND wp.phase_type = 'warmup';

-- Insert test data including "Slide Away" BPM=100
INSERT INTO streaming_vendor_attributes (track_id, track_name, artist_name, spotify_tempo, section_type) VALUES
('slide_away_test_id', 'Slide Away', 'Test Artist', 100, NULL), -- Full track BPM - should map to climb
('slide_away_test_id', 'Slide Away', 'Test Artist', NULL, 'intro'),
('slide_away_test_id', 'Slide Away', 'Test Artist', NULL, 'verse'), 
('slide_away_test_id', 'Slide Away', 'Test Artist', NULL, 'chorus');

-- Create updated v_workout_phases view (with proper joins)
CREATE VIEW v_workout_phases AS
SELECT 
  wp.id as workout_phase_id,
  wp.phase_type,
  wp.workout_track,
  wp.target_tempo_min,
  wp.target_tempo_max,
  wp.description,
  wt.name as workout_type_name,
  -- User-friendly phase names
  CASE wp.phase_type
    WHEN 'warmup' THEN 'Warm Up'
    WHEN 'sprint_intervals' THEN 'Sprint Intervals'
    WHEN 'resistance' THEN 'Resistance Power' 
    WHEN 'jumps' THEN 'Sprint Jumps'
    WHEN 'climb' THEN 'Endurance Climb'
    WHEN 'cooldown' THEN 'Cool Down'
    WHEN 'hills' THEN 'Rolling Hills'
    WHEN 'recovery' THEN 'Recovery'
    ELSE INITCAP(wp.phase_type)
  END as phase_type_name,
  CONCAT(wp.target_tempo_min, '-', wp.target_tempo_max, ' BPM') as bpm_range,
  COUNT(DISTINCT ina.id) as narrative_count,
  STRING_AGG(DISTINCT ina.section_type, ', ' ORDER BY ina.section_type) as available_sections
FROM workout_phases wp
JOIN workout_types wt ON wp.workout_type_id = wt.id
LEFT JOIN instruction_narratives ina ON wp.id = ina.workout_phase_id  
GROUP BY wp.id, wp.phase_type, wp.workout_track, wp.target_tempo_min, wp.target_tempo_max, wp.description, wt.name
ORDER BY wp.target_tempo_min ASC;

-- Enable RLS
ALTER TABLE streaming_vendor_attributes ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE instruction_narratives ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlist_phase_map ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (allow public read)
CREATE POLICY "Allow public read access to track attributes" ON streaming_vendor_attributes FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow public read access to workout types" ON workout_types FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow public read access to workout phases" ON workout_phases FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow public read access to narratives" ON instruction_narratives FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow public read access to phase mappings" ON playlist_phase_map FOR SELECT TO anon, authenticated USING (true);

-- Grant permissions
GRANT SELECT ON streaming_vendor_attributes TO anon, authenticated;
GRANT SELECT ON workout_types TO anon, authenticated;
GRANT SELECT ON workout_phases TO anon, authenticated;
GRANT SELECT ON instruction_narratives TO anon, authenticated;
GRANT SELECT ON playlist_phase_map TO anon, authenticated; 
GRANT SELECT ON v_workout_phases TO anon, authenticated;

-- Create indexes for performance
CREATE INDEX idx_sva_track_tempo ON streaming_vendor_attributes(track_id, spotify_tempo);
CREATE INDEX idx_wp_tempo_range ON workout_phases(target_tempo_min, target_tempo_max); 
CREATE INDEX idx_wp_type_phase ON workout_phases(workout_type_id, phase_type);
CREATE INDEX idx_in_workout_phase ON instruction_narratives(workout_phase_id, section_type);