-- Add Web Audio Intelligence columns to spotify_analysis_logs table
-- This adds all the missing columns that Web Audio logger tries to write

-- First, let's add the Audio Features columns (if not already added)
ALTER TABLE spotify_analysis_logs 
ADD COLUMN IF NOT EXISTS danceability DECIMAL,
ADD COLUMN IF NOT EXISTS energy DECIMAL,
ADD COLUMN IF NOT EXISTS valence DECIMAL,
ADD COLUMN IF NOT EXISTS acousticness DECIMAL,
ADD COLUMN IF NOT EXISTS instrumentalness DECIMAL,
ADD COLUMN IF NOT EXISTS liveness DECIMAL,
ADD COLUMN IF NOT EXISTS speechiness DECIMAL;

-- Add Advanced Analysis timing columns
ALTER TABLE spotify_analysis_logs 
ADD COLUMN IF NOT EXISTS current_beat_start DECIMAL,
ADD COLUMN IF NOT EXISTS current_bar_start DECIMAL,
ADD COLUMN IF NOT EXISTS current_section_start DECIMAL,
ADD COLUMN IF NOT EXISTS current_tatum_start DECIMAL;

-- Add Section analysis columns (from Web Audio Analysis)
ALTER TABLE spotify_analysis_logs 
ADD COLUMN IF NOT EXISTS current_section_duration DECIMAL,
ADD COLUMN IF NOT EXISTS current_section_confidence DECIMAL,
ADD COLUMN IF NOT EXISTS current_section_tempo DECIMAL,
ADD COLUMN IF NOT EXISTS current_section_tempo_confidence DECIMAL,
ADD COLUMN IF NOT EXISTS current_section_key INTEGER,
ADD COLUMN IF NOT EXISTS current_section_key_confidence DECIMAL,
ADD COLUMN IF NOT EXISTS current_section_mode INTEGER,
ADD COLUMN IF NOT EXISTS current_section_mode_confidence DECIMAL,
ADD COLUMN IF NOT EXISTS current_section_time_signature INTEGER,
ADD COLUMN IF NOT EXISTS current_section_time_signature_confidence DECIMAL;

-- Add Segment analysis columns (from Web Audio Analysis)
ALTER TABLE spotify_analysis_logs 
ADD COLUMN IF NOT EXISTS current_segment_duration DECIMAL,
ADD COLUMN IF NOT EXISTS current_segment_confidence DECIMAL,
ADD COLUMN IF NOT EXISTS current_segment_loudness_start DECIMAL,
ADD COLUMN IF NOT EXISTS current_segment_loudness_max DECIMAL,
ADD COLUMN IF NOT EXISTS current_segment_loudness_max_time DECIMAL,
ADD COLUMN IF NOT EXISTS current_segment_loudness_end DECIMAL,
ADD COLUMN IF NOT EXISTS current_segment_pitches DECIMAL[],  -- Array of 12 chroma values
ADD COLUMN IF NOT EXISTS current_segment_timbre DECIMAL[];   -- Array of 12 timbral coefficients

-- Add Beat/Bar/Tatum timing columns
ALTER TABLE spotify_analysis_logs 
ADD COLUMN IF NOT EXISTS current_beat_duration DECIMAL,
ADD COLUMN IF NOT EXISTS current_bar_duration DECIMAL,
ADD COLUMN IF NOT EXISTS current_bar_confidence DECIMAL,
ADD COLUMN IF NOT EXISTS current_tatum_duration DECIMAL,
ADD COLUMN IF NOT EXISTS current_tatum_confidence DECIMAL;

-- Add data source tracking columns
ALTER TABLE spotify_analysis_logs 
ADD COLUMN IF NOT EXISTS data_source TEXT DEFAULT 'spotify_api',
ADD COLUMN IF NOT EXISTS has_real_audio_features BOOLEAN DEFAULT false;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_analysis_logs_data_source ON spotify_analysis_logs(data_source);
CREATE INDEX IF NOT EXISTS idx_analysis_logs_audio_features ON spotify_analysis_logs(danceability, energy, valence) WHERE danceability IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_analysis_logs_created_at ON spotify_analysis_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_analysis_logs_session_timestamp ON spotify_analysis_logs(session_id, timestamp);

-- Verify the new columns exist
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'spotify_analysis_logs' 
  AND column_name IN (
    'danceability', 'energy', 'valence', 'acousticness', 
    'instrumentalness', 'liveness', 'speechiness',
    'current_beat_start', 'current_section_start', 'data_source'
  )
ORDER BY column_name;