-- Add Rapid Soundnet API columns to spotify_analysis_logs table
-- Run this migration to add support for Rapid Soundnet Track Analysis API data

-- First, add the existing Audio Features columns if they don't exist
-- (these were referenced in the React component but missing from schema)
DO $$
BEGIN
    -- Audio Features from Spotify API (0-1 scale)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'spotify_analysis_logs' AND column_name = 'danceability') THEN
        ALTER TABLE spotify_analysis_logs ADD COLUMN danceability FLOAT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'spotify_analysis_logs' AND column_name = 'energy') THEN
        ALTER TABLE spotify_analysis_logs ADD COLUMN energy FLOAT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'spotify_analysis_logs' AND column_name = 'valence') THEN
        ALTER TABLE spotify_analysis_logs ADD COLUMN valence FLOAT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'spotify_analysis_logs' AND column_name = 'acousticness') THEN
        ALTER TABLE spotify_analysis_logs ADD COLUMN acousticness FLOAT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'spotify_analysis_logs' AND column_name = 'instrumentalness') THEN
        ALTER TABLE spotify_analysis_logs ADD COLUMN instrumentalness FLOAT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'spotify_analysis_logs' AND column_name = 'liveness') THEN
        ALTER TABLE spotify_analysis_logs ADD COLUMN liveness FLOAT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'spotify_analysis_logs' AND column_name = 'speechiness') THEN
        ALTER TABLE spotify_analysis_logs ADD COLUMN speechiness FLOAT;
    END IF;
    
    -- Now add Rapid Soundnet specific columns
    
    -- Data source tracking
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'spotify_analysis_logs' AND column_name = 'data_source') THEN
        ALTER TABLE spotify_analysis_logs ADD COLUMN data_source VARCHAR(50); -- 'spotify', 'rapidapi', 'fallback'
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'spotify_analysis_logs' AND column_name = 'has_real_audio_features') THEN
        ALTER TABLE spotify_analysis_logs ADD COLUMN has_real_audio_features BOOLEAN DEFAULT false;
    END IF;
    
    -- Rapid Soundnet specific attributes (raw values before Spotify conversion)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'spotify_analysis_logs' AND column_name = 'rs_key') THEN
        ALTER TABLE spotify_analysis_logs ADD COLUMN rs_key VARCHAR(10); -- Musical key as string (e.g., 'C', 'F#')
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'spotify_analysis_logs' AND column_name = 'rs_mode') THEN
        ALTER TABLE spotify_analysis_logs ADD COLUMN rs_mode VARCHAR(10); -- 'major' or 'minor'
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'spotify_analysis_logs' AND column_name = 'rs_camelot') THEN
        ALTER TABLE spotify_analysis_logs ADD COLUMN rs_camelot VARCHAR(10); -- Camelot notation (e.g., '8B')
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'spotify_analysis_logs' AND column_name = 'rs_happiness') THEN
        ALTER TABLE spotify_analysis_logs ADD COLUMN rs_happiness INTEGER; -- 0-100 scale (different from valence)
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'spotify_analysis_logs' AND column_name = 'rs_popularity') THEN
        ALTER TABLE spotify_analysis_logs ADD COLUMN rs_popularity INTEGER; -- 0-100 popularity score
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'spotify_analysis_logs' AND column_name = 'rs_duration') THEN
        ALTER TABLE spotify_analysis_logs ADD COLUMN rs_duration VARCHAR(20); -- Duration string (e.g., '3:45')
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'spotify_analysis_logs' AND column_name = 'rs_loudness') THEN
        ALTER TABLE spotify_analysis_logs ADD COLUMN rs_loudness VARCHAR(20); -- Loudness string with unit (e.g., '-8 dB')
    END IF;
    
    -- Raw 0-100 scale values from Rapid Soundnet (before conversion to 0-1)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'spotify_analysis_logs' AND column_name = 'rs_energy_raw') THEN
        ALTER TABLE spotify_analysis_logs ADD COLUMN rs_energy_raw INTEGER; -- 0-100 scale
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'spotify_analysis_logs' AND column_name = 'rs_danceability_raw') THEN
        ALTER TABLE spotify_analysis_logs ADD COLUMN rs_danceability_raw INTEGER; -- 0-100 scale
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'spotify_analysis_logs' AND column_name = 'rs_acousticness_raw') THEN
        ALTER TABLE spotify_analysis_logs ADD COLUMN rs_acousticness_raw INTEGER; -- 0-100 scale
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'spotify_analysis_logs' AND column_name = 'rs_instrumentalness_raw') THEN
        ALTER TABLE spotify_analysis_logs ADD COLUMN rs_instrumentalness_raw INTEGER; -- 0-100 scale
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'spotify_analysis_logs' AND column_name = 'rs_speechiness_raw') THEN
        ALTER TABLE spotify_analysis_logs ADD COLUMN rs_speechiness_raw INTEGER; -- 0-100 scale
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'spotify_analysis_logs' AND column_name = 'rs_liveness_raw') THEN
        ALTER TABLE spotify_analysis_logs ADD COLUMN rs_liveness_raw INTEGER; -- 0-100 scale
    END IF;
    
    -- API usage tracking
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'spotify_analysis_logs' AND column_name = 'api_requests_used') THEN
        ALTER TABLE spotify_analysis_logs ADD COLUMN api_requests_used INTEGER; -- Track how many requests were used when this was logged
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'spotify_analysis_logs' AND column_name = 'from_cache') THEN
        ALTER TABLE spotify_analysis_logs ADD COLUMN from_cache BOOLEAN DEFAULT false; -- Whether data came from cache
    END IF;
    
    -- Fallback information
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'spotify_analysis_logs' AND column_name = 'fallback_type') THEN
        ALTER TABLE spotify_analysis_logs ADD COLUMN fallback_type VARCHAR(50); -- 'api', 'cache', 'intelligent', 'basic'
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'spotify_analysis_logs' AND column_name = 'detected_genre') THEN
        ALTER TABLE spotify_analysis_logs ADD COLUMN detected_genre VARCHAR(100); -- Genre detected for intelligent fallback
    END IF;
    
    RAISE NOTICE 'Rapid Soundnet columns added successfully to spotify_analysis_logs table';
END $$;

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_analysis_logs_data_source ON spotify_analysis_logs(data_source);
CREATE INDEX IF NOT EXISTS idx_analysis_logs_rs_key ON spotify_analysis_logs(rs_key);
CREATE INDEX IF NOT EXISTS idx_analysis_logs_fallback_type ON spotify_analysis_logs(fallback_type);
CREATE INDEX IF NOT EXISTS idx_analysis_logs_has_real_features ON spotify_analysis_logs(has_real_audio_features);

-- Create a view for easier querying of combined data
CREATE OR REPLACE VIEW spotify_analysis_with_source AS
SELECT 
    id,
    session_id,
    track_id,
    track_name,
    artist_name,
    timestamp,
    playback_position_ms,
    
    -- Data source info
    data_source,
    has_real_audio_features,
    from_cache,
    fallback_type,
    detected_genre,
    
    -- Musical attributes (unified view)
    CASE 
        WHEN data_source = 'rapidapi' THEN rs_key 
        ELSE 
            CASE track_key
                WHEN 0 THEN 'C' WHEN 1 THEN 'C#' WHEN 2 THEN 'D' WHEN 3 THEN 'D#'
                WHEN 4 THEN 'E' WHEN 5 THEN 'F' WHEN 6 THEN 'F#' WHEN 7 THEN 'G'
                WHEN 8 THEN 'G#' WHEN 9 THEN 'A' WHEN 10 THEN 'A#' WHEN 11 THEN 'B'
                ELSE 'Unknown'
            END
    END as key_name,
    
    CASE 
        WHEN data_source = 'rapidapi' THEN rs_mode
        ELSE 
            CASE track_mode WHEN 1 THEN 'major' WHEN 0 THEN 'minor' ELSE 'unknown' END
    END as mode_name,
    
    -- Spotify format attributes
    track_tempo,
    track_loudness,
    danceability,
    energy,
    valence,
    acousticness,
    instrumentalness,
    liveness,
    speechiness,
    
    -- Rapid Soundnet raw values (when available)
    rs_camelot,
    rs_happiness,
    rs_popularity,
    rs_energy_raw,
    rs_danceability_raw,
    
    -- Fitness context
    fitness_phase,
    workout_intensity,
    user_notes,
    
    created_at
FROM spotify_analysis_logs;

COMMENT ON VIEW spotify_analysis_with_source IS 'Unified view of Spotify analysis data showing both original and Rapid Soundnet attributes with proper data source attribution';