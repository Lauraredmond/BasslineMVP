-- Bassline MVP Database Schema
-- Create core tables with proper foreign key relationships per primer.md spec

-- streaming_vendor_attributes (SVA) - holds track data and BPM information
CREATE TABLE IF NOT EXISTS streaming_vendor_attributes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  track_id VARCHAR,
  track_name VARCHAR NOT NULL,
  artist_name VARCHAR,
  spotify_tempo NUMERIC, -- BPM for full track (used for phase mapping)
  section_type VARCHAR, -- intro, verse, chorus, bridge, drop, outro (NULL for full-track records)
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

-- workout_phases (WP) - defines workout phases and their BPM ranges
CREATE TABLE IF NOT EXISTS workout_phases (
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

-- instruction_narratives (IN) - holds PT narratives for workout phases and sections
CREATE TABLE IF NOT EXISTS instruction_narratives (
  narrative_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workout_track VARCHAR NOT NULL, -- references workout_phases.workout_track
  section_type VARCHAR NOT NULL, -- intro, verse, chorus, bridge, drop, outro (matches SVA vocabulary)
  narrative_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (workout_track) REFERENCES workout_phases(workout_track) ON DELETE CASCADE
);

-- playlist_phase_map - locks tracks to phases at playlist selection time (per primer.md algorithm A)
CREATE TABLE IF NOT EXISTS playlist_phase_map (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  track_id VARCHAR NOT NULL,
  workout_phase_id UUID NOT NULL,
  workout_track VARCHAR NOT NULL,
  locked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  session_identifier VARCHAR, -- to group playlist selections
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (workout_phase_id) REFERENCES workout_phases(workout_phase_id) ON DELETE CASCADE,
  FOREIGN KEY (workout_track) REFERENCES workout_phases(workout_track) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sva_track_tempo ON streaming_vendor_attributes(track_id, spotify_tempo);
CREATE INDEX IF NOT EXISTS idx_sva_track_section ON streaming_vendor_attributes(track_id, section_type);
CREATE INDEX IF NOT EXISTS idx_wp_tempo_range ON workout_phases(target_tempo_min, target_tempo_max);
CREATE INDEX IF NOT EXISTS idx_in_workout_section ON instruction_narratives(workout_track, section_type);
CREATE INDEX IF NOT EXISTS idx_ppm_track ON playlist_phase_map(track_id);
CREATE INDEX IF NOT EXISTS idx_ppm_session ON playlist_phase_map(session_identifier);

-- Add timestamps triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_sva_updated_at BEFORE UPDATE ON streaming_vendor_attributes
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wp_updated_at BEFORE UPDATE ON workout_phases  
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_in_updated_at BEFORE UPDATE ON instruction_narratives
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();