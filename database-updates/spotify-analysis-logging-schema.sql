-- Spotify Audio Analysis Logging Schema
-- This schema captures all Spotify audio analysis attributes during playback for fitness narrative mapping research

-- Main logging table for tracking analysis data changes during playback
CREATE TABLE spotify_analysis_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID NOT NULL, -- Groups logs from the same playback session
    track_id VARCHAR(255) NOT NULL, -- Spotify track ID
    track_name VARCHAR(500),
    artist_name VARCHAR(500),
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    playback_position_ms INTEGER NOT NULL, -- Current position in track when logged
    
    -- Meta information
    analyzer_version VARCHAR(100),
    platform VARCHAR(100),
    detailed_status VARCHAR(200),
    status_code INTEGER,
    analysis_timestamp TIMESTAMPTZ,
    analysis_time FLOAT,
    input_process VARCHAR(200),
    
    -- Track-level analysis
    num_samples INTEGER,
    duration FLOAT,
    sample_md5 VARCHAR(255),
    offset_seconds FLOAT,
    window_seconds FLOAT,
    analysis_sample_rate INTEGER,
    analysis_channels INTEGER,
    end_of_fade_in FLOAT,
    start_of_fade_out FLOAT,
    track_loudness FLOAT,
    track_tempo FLOAT,
    tempo_confidence FLOAT,
    time_signature INTEGER,
    time_signature_confidence FLOAT,
    track_key INTEGER,
    key_confidence FLOAT,
    track_mode INTEGER,
    mode_confidence FLOAT,
    codestring TEXT,
    code_version FLOAT,
    echoprintstring TEXT,
    echoprint_version FLOAT,
    synchstring TEXT,
    synch_version FLOAT,
    rhythmstring TEXT,
    rhythm_version FLOAT,
    
    -- Current section data (interpolated from sections array)
    current_section_start FLOAT,
    current_section_duration FLOAT,
    current_section_confidence FLOAT,
    current_section_loudness FLOAT,
    current_section_tempo FLOAT,
    current_section_tempo_confidence FLOAT,
    current_section_key INTEGER,
    current_section_key_confidence FLOAT,
    current_section_mode INTEGER,
    current_section_mode_confidence FLOAT,
    current_section_time_signature INTEGER,
    current_section_time_signature_confidence FLOAT,
    
    -- Current segment data (interpolated from segments array)
    current_segment_start FLOAT,
    current_segment_duration FLOAT,
    current_segment_confidence FLOAT,
    current_segment_loudness_start FLOAT,
    current_segment_loudness_max FLOAT,
    current_segment_loudness_max_time FLOAT,
    current_segment_loudness_end FLOAT,
    current_segment_pitches FLOAT[], -- Array of 12 pitch values
    current_segment_timbre FLOAT[], -- Array of 12 timbre values
    
    -- Current beat/bar/tatum context
    current_beat_start FLOAT,
    current_beat_duration FLOAT,
    current_beat_confidence FLOAT,
    current_bar_start FLOAT,
    current_bar_duration FLOAT,
    current_bar_confidence FLOAT,
    current_tatum_start FLOAT,
    current_tatum_duration FLOAT,
    current_tatum_confidence FLOAT,
    
    -- Fitness context (for mapping purposes)
    fitness_phase VARCHAR(100), -- e.g., 'warmup', 'cardio', 'strength', 'cooldown'
    workout_intensity INTEGER, -- 1-10 scale
    user_notes TEXT, -- Manual annotations for patterns
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient querying
CREATE INDEX idx_analysis_logs_session ON spotify_analysis_logs(session_id);
CREATE INDEX idx_analysis_logs_track ON spotify_analysis_logs(track_id);
CREATE INDEX idx_analysis_logs_timestamp ON spotify_analysis_logs(timestamp);
CREATE INDEX idx_analysis_logs_position ON spotify_analysis_logs(playback_position_ms);
CREATE INDEX idx_analysis_logs_fitness_phase ON spotify_analysis_logs(fitness_phase);

-- Table for storing complete analysis data for reference
CREATE TABLE spotify_track_analysis (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    track_id VARCHAR(255) UNIQUE NOT NULL,
    track_name VARCHAR(500),
    artist_name VARCHAR(500),
    analysis_data JSONB NOT NULL, -- Store complete Spotify analysis response
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table for playback sessions
CREATE TABLE spotify_playback_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_name VARCHAR(200),
    workout_type VARCHAR(100),
    start_time TIMESTAMPTZ DEFAULT NOW(),
    end_time TIMESTAMPTZ,
    user_id UUID, -- Reference to user if needed
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE spotify_analysis_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE spotify_track_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE spotify_playback_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies (adjust based on your auth needs)
CREATE POLICY "Enable read access for all users" ON spotify_analysis_logs FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON spotify_analysis_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable read access for all users" ON spotify_track_analysis FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON spotify_track_analysis FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable read access for all users" ON spotify_playback_sessions FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON spotify_playback_sessions FOR INSERT WITH CHECK (true);