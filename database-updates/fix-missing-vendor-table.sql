-- Fix for database logging issue: Create common_streaming_vendor_analysis_logs table
-- Run this manually in Supabase SQL editor

-- Step 1: Check if table exists
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE  table_schema = 'public'
   AND    table_name   = 'common_streaming_vendor_analysis_logs'
) as table_exists;

-- Step 2: Create the table if it doesn't exist
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

-- Step 3: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_vendor_analysis_session_id ON common_streaming_vendor_analysis_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_vendor_analysis_timestamp ON common_streaming_vendor_analysis_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_vendor_analysis_track_name ON common_streaming_vendor_analysis_logs(track_name);
CREATE INDEX IF NOT EXISTS idx_vendor_analysis_vendor_source ON common_streaming_vendor_analysis_logs(vendor_source);
CREATE INDEX IF NOT EXISTS idx_vendor_analysis_playback_position ON common_streaming_vendor_analysis_logs(playback_position_ms);

-- Step 4: Add RLS (Row Level Security) policies
ALTER TABLE common_streaming_vendor_analysis_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own analysis data" ON common_streaming_vendor_analysis_logs;
DROP POLICY IF EXISTS "Users can insert own analysis data" ON common_streaming_vendor_analysis_logs;

-- Allow authenticated users to read their own data
CREATE POLICY "Users can view own analysis data" ON common_streaming_vendor_analysis_logs
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- Allow authenticated users to insert their own data  
CREATE POLICY "Users can insert own analysis data" ON common_streaming_vendor_analysis_logs
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Step 5: Test the table
SELECT 'Table created successfully! Ready for logging.' as status;