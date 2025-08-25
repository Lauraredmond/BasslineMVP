-- DATABASE MIGRATION: Vendor-Agnostic Streaming Analysis System
-- Migrates spotify_analysis_logs to common_streaming_vendor_analysis_logs
-- Adds comprehensive Soundnet attributes and vendor source tracking

-- Step 1: Create new vendor-agnostic table with all attributes
CREATE TABLE IF NOT EXISTS common_streaming_vendor_analysis_logs (
    -- Primary identifiers
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID REFERENCES spotify_playback_sessions(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    
    -- Vendor Attribution
    vendor_source TEXT NOT NULL DEFAULT 'Unknown', -- 'Spotify API', 'Soundnet API', 'YouTube API', 'Apple Music API', etc.
    data_source TEXT, -- 'api', 'cache', 'fallback'
    from_cache BOOLEAN DEFAULT FALSE,
    fallback_type TEXT, -- 'intelligent', 'basic', 'genre-based'
    
    -- Track Identification (Universal)
    track_id TEXT,
    track_name TEXT NOT NULL,
    artist_name TEXT,
    track_uri TEXT,
    
    -- Playback Context
    playback_position_ms BIGINT DEFAULT 0,
    is_playing BOOLEAN DEFAULT TRUE,
    
    -- SOUNDNET API CORE ATTRIBUTES (0-100 scale)
    soundnet_camelot TEXT, -- Harmonic mixing key (e.g., "8B", "1A")
    soundnet_duration TEXT, -- Track duration (e.g., "3:28")
    soundnet_popularity INTEGER, -- 0-100 popularity score
    soundnet_energy INTEGER, -- 0-100 energy level
    soundnet_danceability INTEGER, -- 0-100 groove factor
    soundnet_happiness INTEGER, -- 0-100 mood/valence score
    soundnet_acousticness INTEGER, -- 0-100 acoustic vs electronic
    soundnet_instrumentalness INTEGER, -- 0-100 instrumental vs vocal
    soundnet_liveness INTEGER, -- 0-100 live performance feel
    soundnet_speechiness INTEGER, -- 0-100 spoken word content
    soundnet_loudness TEXT, -- RMS loudness (e.g., "-5 dB")
    
    -- SOUNDNET MUSICAL ATTRIBUTES
    soundnet_key TEXT, -- Musical key (e.g., "C", "F#", "Ab")
    soundnet_mode TEXT, -- "major" or "minor"
    soundnet_tempo INTEGER, -- BPM (beats per minute)
    
    -- SPOTIFY API TRACK-LEVEL ATTRIBUTES (0-1 scale)
    spotify_danceability REAL,
    spotify_energy REAL,
    spotify_valence REAL, -- happiness/mood
    spotify_acousticness REAL,
    spotify_instrumentalness REAL,
    spotify_liveness REAL,
    spotify_speechiness REAL,
    spotify_loudness REAL, -- dB
    spotify_tempo REAL, -- BPM
    spotify_key INTEGER, -- 0-11 (C=0, C#=1, etc.)
    spotify_mode INTEGER, -- 0=minor, 1=major
    spotify_time_signature INTEGER,
    spotify_tempo_confidence REAL,
    
    -- SPOTIFY ADVANCED ANALYSIS (Dynamic Segments)
    current_section_start REAL,
    current_section_duration REAL,
    current_section_loudness REAL,
    current_section_tempo REAL,
    current_section_key INTEGER,
    current_section_mode INTEGER,
    current_section_confidence REAL,
    
    current_segment_start REAL,
    current_segment_duration REAL,
    current_segment_loudness_start REAL,
    current_segment_loudness_max REAL,
    current_segment_loudness_end REAL,
    current_segment_confidence REAL,
    current_segment_pitches REAL[], -- 12-dimensional pitch vector
    current_segment_timbre REAL[], -- Timbral texture features
    
    -- BEAT/BAR/TATUM ANALYSIS
    current_beat_start REAL,
    current_beat_duration REAL,
    current_beat_confidence REAL,
    current_bar_start REAL,
    current_bar_duration REAL,
    current_bar_confidence REAL,
    current_tatum_start REAL,
    current_tatum_duration REAL,
    current_tatum_confidence REAL,
    
    -- FITNESS CONTEXT
    fitness_phase TEXT,
    workout_intensity INTEGER,
    user_notes TEXT,
    
    -- FUTURE VENDOR PLACEHOLDERS
    youtube_attributes JSONB, -- For YouTube Music API data
    apple_attributes JSONB, -- For Apple Music API data
    vendor_specific_data JSONB -- Flexible JSON for any vendor-specific attributes
);

-- Step 2: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_vendor_analysis_session_id ON common_streaming_vendor_analysis_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_vendor_analysis_timestamp ON common_streaming_vendor_analysis_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_vendor_analysis_track_name ON common_streaming_vendor_analysis_logs(track_name);
CREATE INDEX IF NOT EXISTS idx_vendor_analysis_vendor_source ON common_streaming_vendor_analysis_logs(vendor_source);
CREATE INDEX IF NOT EXISTS idx_vendor_analysis_playback_position ON common_streaming_vendor_analysis_logs(playback_position_ms);

-- Step 3: Migrate existing data from spotify_analysis_logs (if exists)
INSERT INTO common_streaming_vendor_analysis_logs (
    id, session_id, created_at, timestamp, vendor_source, data_source, from_cache,
    track_id, track_name, artist_name, playback_position_ms,
    spotify_danceability, spotify_energy, spotify_valence, spotify_acousticness,
    spotify_instrumentalness, spotify_liveness, spotify_speechiness, spotify_loudness,
    spotify_tempo, spotify_key, spotify_mode, spotify_time_signature,
    current_section_loudness, current_section_tempo, current_section_key, current_section_mode,
    current_segment_loudness_max, current_beat_confidence, current_bar_confidence,
    fitness_phase, workout_intensity, user_notes
)
SELECT 
    id, session_id, created_at, timestamp, 
    'Spotify API' as vendor_source, -- Mark existing data as Spotify
    data_source, from_cache,
    track_id, track_name, artist_name, playback_position_ms,
    danceability, energy, valence, acousticness,
    instrumentalness, liveness, speechiness, track_loudness,
    track_tempo, track_key, track_mode, time_signature,
    current_section_loudness, current_section_tempo, current_section_key, current_section_mode,
    current_segment_loudness_max, current_beat_confidence, current_bar_confidence,
    fitness_phase, workout_intensity, user_notes
FROM spotify_analysis_logs
WHERE EXISTS (SELECT 1 FROM spotify_analysis_logs LIMIT 1);

-- Step 4: Add RLS (Row Level Security) policies
ALTER TABLE common_streaming_vendor_analysis_logs ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read their own data
CREATE POLICY "Users can view own analysis data" ON common_streaming_vendor_analysis_logs
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- Allow authenticated users to insert their own data  
CREATE POLICY "Users can insert own analysis data" ON common_streaming_vendor_analysis_logs
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Step 5: Create a view for backward compatibility
CREATE OR REPLACE VIEW spotify_analysis_logs_view AS
SELECT 
    id, session_id, created_at, timestamp,
    track_id, track_name, artist_name, playback_position_ms,
    spotify_danceability as danceability,
    spotify_energy as energy,
    spotify_valence as valence,
    spotify_acousticness as acousticness,
    spotify_instrumentalness as instrumentalness,
    spotify_liveness as liveness,
    spotify_speechiness as speechiness,
    spotify_loudness as track_loudness,
    spotify_tempo as track_tempo,
    spotify_key as track_key,
    spotify_mode as track_mode,
    current_section_loudness,
    current_section_tempo,
    current_segment_loudness_max,
    fitness_phase,
    workout_intensity,
    -- Add Soundnet attributes for compatibility
    soundnet_camelot as rs_camelot,
    soundnet_happiness as rs_happiness,
    soundnet_popularity as rs_popularity,
    soundnet_energy as rs_energy_raw,
    soundnet_danceability as rs_danceability_raw,
    vendor_source,
    data_source,
    from_cache
FROM common_streaming_vendor_analysis_logs;

-- Step 6: Add helpful comments
COMMENT ON TABLE common_streaming_vendor_analysis_logs IS 'Vendor-agnostic streaming music analysis data from multiple APIs (Spotify, Soundnet, YouTube, Apple Music)';
COMMENT ON COLUMN common_streaming_vendor_analysis_logs.vendor_source IS 'API source: "Spotify API", "Soundnet API", "YouTube API", "Apple Music API"';
COMMENT ON COLUMN common_streaming_vendor_analysis_logs.soundnet_energy IS 'Soundnet energy level 0-100 (raw scale)';
COMMENT ON COLUMN common_streaming_vendor_analysis_logs.spotify_energy IS 'Spotify energy level 0.0-1.0 (normalized scale)';
COMMENT ON COLUMN common_streaming_vendor_analysis_logs.soundnet_camelot IS 'Harmonic mixing notation (e.g., "8B", "1A")';

-- Success message
SELECT 'Migration completed successfully! Table renamed and Soundnet attributes added.' as status;