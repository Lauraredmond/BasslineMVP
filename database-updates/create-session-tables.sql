-- Create tables for workout session locking system
-- These tables store persistent, immutable session snapshots

-- Main session table - stores session metadata
CREATE TABLE workout_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    session_date DATE NOT NULL,
    routine_key TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one session per user per day
    UNIQUE(user_id, session_date)
);

-- Session phase tracks - stores phase->track mappings for each session
CREATE TABLE session_phase_tracks (
    session_id UUID NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
    phase_order INTEGER NOT NULL,
    phase_key TEXT NOT NULL,
    track_id TEXT,
    track_uri TEXT,
    track_name TEXT NOT NULL,
    artist_name TEXT NOT NULL,
    section_map JSONB,
    
    PRIMARY KEY (session_id, phase_order)
);

-- Enable RLS for both tables
ALTER TABLE workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_phase_tracks ENABLE ROW LEVEL SECURITY;

-- RLS policies - allow anonymous access for MVP
CREATE POLICY "Allow anonymous access to workout_sessions" ON workout_sessions
    FOR ALL USING (true);

CREATE POLICY "Allow anonymous access to session_phase_tracks" ON session_phase_tracks
    FOR ALL USING (true);

-- Create indexes for performance
CREATE INDEX idx_workout_sessions_user_date ON workout_sessions(user_id, session_date);
CREATE INDEX idx_session_phase_tracks_session ON session_phase_tracks(session_id);
CREATE INDEX idx_session_phase_tracks_order ON session_phase_tracks(session_id, phase_order);