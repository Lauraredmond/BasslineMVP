-- Complete database setup for Bassline MVP
-- This script will fix PGRST200 errors by ensuring all tables exist with proper structure

-- Drop existing objects if they exist (for clean setup)
DROP VIEW IF EXISTS v_workout_phases CASCADE;
DROP TABLE IF EXISTS playlist_phase_map CASCADE;
DROP TABLE IF EXISTS instruction_narratives CASCADE; 
DROP TABLE IF EXISTS workout_phases CASCADE;
DROP TABLE IF EXISTS streaming_vendor_attributes CASCADE;

-- Create streaming_vendor_attributes table
CREATE TABLE streaming_vendor_attributes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  track_id VARCHAR NOT NULL,
  track_name VARCHAR NOT NULL,
  artist_name VARCHAR,
  spotify_tempo NUMERIC, -- BPM for full track
  section_type VARCHAR, -- intro, verse, chorus, bridge, drop, outro  
  section_number INTEGER,
  timestamp_ms BIGINT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create workout_phases table (core table for phase mapping)
CREATE TABLE workout_phases (
  workout_phase_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workout_track VARCHAR NOT NULL UNIQUE, -- warmup, sprint_intervals, resistance, jumps, climb, cooldown
  target_tempo_min INTEGER NOT NULL,
  target_tempo_max INTEGER NOT NULL, 
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT valid_tempo_range CHECK (target_tempo_min <= target_tempo_max),
  CONSTRAINT positive_tempo CHECK (target_tempo_min > 0 AND target_tempo_max > 0)
);

-- Create instruction_narratives table
CREATE TABLE instruction_narratives (
  narrative_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workout_track VARCHAR NOT NULL, -- FK to workout_phases.workout_track
  section_type VARCHAR NOT NULL, -- intro, verse, chorus, bridge, drop, outro
  narrative_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (workout_track) REFERENCES workout_phases(workout_track) ON DELETE CASCADE
);

-- Create playlist_phase_map table (for locked mappings)
CREATE TABLE playlist_phase_map (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  track_id VARCHAR NOT NULL,
  workout_phase_id UUID NOT NULL,
  workout_track VARCHAR NOT NULL,
  locked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  session_identifier VARCHAR,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (workout_phase_id) REFERENCES workout_phases(workout_phase_id) ON DELETE CASCADE,
  FOREIGN KEY (workout_track) REFERENCES workout_phases(workout_track) ON DELETE CASCADE
);

-- Insert workout phases
INSERT INTO workout_phases (workout_track, target_tempo_min, target_tempo_max, description) VALUES
('warmup', 50, 70, 'Gentle warm-up to prepare the body for exercise'),
('resistance', 55, 85, 'Heavy resistance work with controlled cadence'),
('climb', 90, 120, 'Sustained climbing efforts - THIS IS WHERE BPM=100 MAPS'),
('jumps', 140, 170, 'High-energy position changes and explosive movements'), 
('sprint_intervals', 160, 180, 'Maximum speed intervals with light resistance'),
('hills', 100, 140, 'Rolling hill climbs with varying resistance'),
('recovery', 60, 90, 'Active recovery between intense efforts'),
('cooldown', 50, 70, 'Gentle cool-down to bring heart rate down');

-- Insert test narratives
INSERT INTO instruction_narratives (workout_track, section_type, narrative_text) VALUES
('climb', 'intro', 'Time for a climb! Add some resistance and settle into your climbing rhythm.'),
('climb', 'verse', 'Steady climbing here. Feel that resistance in your legs, drive through your heels.'),
('climb', 'chorus', 'This is your mountain! Push through this climb with power and control.'),
('sprint_intervals', 'intro', 'Sprint track! Medium pace to start with.'),
('sprint_intervals', 'verse', 'Get ready to fly! Light resistance, quick legs coming up.'),
('resistance', 'intro', 'Heavy resistance work coming up. Get ready to feel the burn.'),
('warmup', 'verse', 'Easy spinning here, just getting the legs moving and the blood flowing.');

-- Insert test data including "Slide Away" BPM=100
INSERT INTO streaming_vendor_attributes (track_id, track_name, artist_name, spotify_tempo, section_type) VALUES
('slide_away_test_id', 'Slide Away', 'Test Artist', 100, NULL), -- Full track BPM - should map to climb
('slide_away_test_id', 'Slide Away', 'Test Artist', NULL, 'intro'),
('slide_away_test_id', 'Slide Away', 'Test Artist', NULL, 'verse'),
('slide_away_test_id', 'Slide Away', 'Test Artist', NULL, 'chorus');

-- Create v_workout_phases view  
CREATE VIEW v_workout_phases AS
SELECT 
  wp.workout_phase_id,
  wp.workout_track,
  wp.target_tempo_min,
  wp.target_tempo_max,
  wp.description,
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
LEFT JOIN instruction_narratives ina ON wp.workout_track = ina.workout_track  
GROUP BY wp.workout_phase_id, wp.workout_track, wp.target_tempo_min, wp.target_tempo_max, wp.description
ORDER BY wp.target_tempo_min ASC;

-- Enable RLS
ALTER TABLE streaming_vendor_attributes ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE instruction_narratives ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlist_phase_map ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (allow public read)
CREATE POLICY "Allow public read access to track attributes" ON streaming_vendor_attributes FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow public read access to workout phases" ON workout_phases FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow public read access to narratives" ON instruction_narratives FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow public read access to phase mappings" ON playlist_phase_map FOR SELECT TO anon, authenticated USING (true);

-- Grant permissions
GRANT SELECT ON streaming_vendor_attributes TO anon, authenticated;
GRANT SELECT ON workout_phases TO anon, authenticated;
GRANT SELECT ON instruction_narratives TO anon, authenticated;
GRANT SELECT ON playlist_phase_map TO anon, authenticated; 
GRANT SELECT ON v_workout_phases TO anon, authenticated;

-- Create indexes for performance
CREATE INDEX idx_sva_track_tempo ON streaming_vendor_attributes(track_id, spotify_tempo);
CREATE INDEX idx_wp_tempo_range ON workout_phases(target_tempo_min, target_tempo_max); 
CREATE INDEX idx_in_workout_section ON instruction_narratives(workout_track, section_type);