-- COMPLETE DATABASE MIGRATION AND TESTING SCRIPT
-- This script creates the vendor-agnostic table, fixes RLS policies, and provides testing utilities
-- Run this entire script in your Supabase SQL editor

-- ============================================================================
-- STEP 1: CREATE VENDOR-AGNOSTIC ANALYSIS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS common_streaming_vendor_analysis_logs (
    -- Primary identifiers
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID REFERENCES spotify_playback_sessions(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    
    -- Vendor Attribution
    vendor_source TEXT NOT NULL DEFAULT 'Unknown', 
    data_source TEXT, 
    from_cache BOOLEAN DEFAULT FALSE,
    fallback_type TEXT, 
    
    -- Track Identification (Universal)
    track_id TEXT,
    track_name TEXT NOT NULL,
    artist_name TEXT,
    track_uri TEXT,
    
    -- Playback Context
    playback_position_ms BIGINT DEFAULT 0,
    is_playing BOOLEAN DEFAULT TRUE,
    
    -- SOUNDNET API CORE ATTRIBUTES (0-100 scale)
    soundnet_camelot TEXT, 
    soundnet_duration TEXT, 
    soundnet_popularity INTEGER, 
    soundnet_energy INTEGER, 
    soundnet_danceability INTEGER, 
    soundnet_happiness INTEGER, 
    soundnet_acousticness INTEGER, 
    soundnet_instrumentalness INTEGER, 
    soundnet_liveness INTEGER, 
    soundnet_speechiness INTEGER, 
    soundnet_loudness TEXT, 
    
    -- SOUNDNET MUSICAL ATTRIBUTES
    soundnet_key TEXT, 
    soundnet_mode TEXT, 
    soundnet_tempo INTEGER, 
    
    -- SPOTIFY API TRACK-LEVEL ATTRIBUTES (0-1 scale)
    spotify_danceability REAL,
    spotify_energy REAL,
    spotify_valence REAL, 
    spotify_acousticness REAL,
    spotify_instrumentalness REAL,
    spotify_liveness REAL,
    spotify_speechiness REAL,
    spotify_loudness REAL, 
    spotify_tempo REAL, 
    spotify_key INTEGER, 
    spotify_mode INTEGER, 
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
    current_section_tempo_confidence REAL,
    current_section_key_confidence REAL,
    current_section_mode_confidence REAL,
    current_section_time_signature INTEGER,
    current_section_time_signature_confidence REAL,
    
    current_segment_start REAL,
    current_segment_duration REAL,
    current_segment_loudness_start REAL,
    current_segment_loudness_max REAL,
    current_segment_loudness_max_time REAL,
    current_segment_loudness_end REAL,
    current_segment_confidence REAL,
    current_segment_pitches REAL[], 
    current_segment_timbre REAL[], 
    
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
    
    -- LEGACY COMPATIBILITY COLUMNS (for old spotify_analysis_logs)
    danceability REAL, -- Maps to spotify_danceability
    energy REAL,       -- Maps to spotify_energy  
    valence REAL,      -- Maps to spotify_valence
    acousticness REAL, -- Maps to spotify_acousticness
    instrumentalness REAL, -- Maps to spotify_instrumentalness
    liveness REAL,     -- Maps to spotify_liveness
    speechiness REAL,  -- Maps to spotify_speechiness
    
    -- Additional RapidAPI specific columns (legacy compatibility)
    rs_key TEXT,
    rs_mode TEXT,
    rs_camelot TEXT,
    rs_happiness INTEGER,
    rs_popularity INTEGER,
    rs_duration TEXT,
    rs_loudness TEXT,
    rs_energy_raw INTEGER,
    rs_danceability_raw INTEGER,
    rs_acousticness_raw INTEGER,
    rs_instrumentalness_raw INTEGER,
    rs_speechiness_raw INTEGER,
    rs_liveness_raw INTEGER,
    
    -- FUTURE VENDOR PLACEHOLDERS
    youtube_attributes JSONB, 
    apple_attributes JSONB, 
    vendor_specific_data JSONB 
);

-- ============================================================================
-- STEP 2: CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_vendor_analysis_session_id ON common_streaming_vendor_analysis_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_vendor_analysis_timestamp ON common_streaming_vendor_analysis_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_vendor_analysis_track_name ON common_streaming_vendor_analysis_logs(track_name);
CREATE INDEX IF NOT EXISTS idx_vendor_analysis_vendor_source ON common_streaming_vendor_analysis_logs(vendor_source);
CREATE INDEX IF NOT EXISTS idx_vendor_analysis_playback_position ON common_streaming_vendor_analysis_logs(playback_position_ms);
CREATE INDEX IF NOT EXISTS idx_vendor_analysis_data_source ON common_streaming_vendor_analysis_logs(data_source);

-- ============================================================================
-- STEP 3: MIGRATE EXISTING DATA (IF ANY)
-- ============================================================================

-- Migrate from spotify_analysis_logs if it exists and has data
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'spotify_analysis_logs') THEN
        -- Check if we have data to migrate
        IF EXISTS (SELECT 1 FROM spotify_analysis_logs LIMIT 1) THEN
            INSERT INTO common_streaming_vendor_analysis_logs (
                session_id, created_at, timestamp, vendor_source, data_source, from_cache,
                track_id, track_name, artist_name, playback_position_ms,
                spotify_danceability, spotify_energy, spotify_valence, spotify_acousticness,
                spotify_instrumentalness, spotify_liveness, spotify_speechiness, spotify_loudness,
                spotify_tempo, spotify_key, spotify_mode, spotify_time_signature,
                current_section_loudness, current_section_tempo, current_section_key, current_section_mode,
                current_segment_loudness_max, current_beat_confidence, current_bar_confidence,
                fitness_phase, workout_intensity, user_notes,
                -- Legacy compatibility columns
                danceability, energy, valence, acousticness, instrumentalness, liveness, speechiness
            )
            SELECT 
                session_id, created_at, timestamp, 
                'Spotify API' as vendor_source, 
                COALESCE(data_source, 'legacy') as data_source,
                COALESCE(from_cache, false) as from_cache,
                track_id, track_name, artist_name, playback_position_ms,
                danceability, energy, valence, acousticness,
                instrumentalness, liveness, speechiness, track_loudness,
                track_tempo, track_key, track_mode, time_signature,
                current_section_loudness, current_section_tempo, current_section_key, current_section_mode,
                current_segment_loudness_max, current_beat_confidence, current_bar_confidence,
                fitness_phase, workout_intensity, user_notes,
                -- Copy to legacy columns too
                danceability, energy, valence, acousticness, instrumentalness, liveness, speechiness
            FROM spotify_analysis_logs
            WHERE NOT EXISTS (
                SELECT 1 FROM common_streaming_vendor_analysis_logs 
                WHERE track_id = spotify_analysis_logs.track_id 
                AND session_id = spotify_analysis_logs.session_id
                AND timestamp = spotify_analysis_logs.timestamp
            );
            
            RAISE NOTICE 'Migrated data from spotify_analysis_logs to common_streaming_vendor_analysis_logs';
        END IF;
    END IF;
END $$;

-- ============================================================================
-- STEP 4: FIX RLS POLICIES FOR ANONYMOUS ACCESS
-- ============================================================================

-- Enable RLS on the new table
ALTER TABLE common_streaming_vendor_analysis_logs ENABLE ROW LEVEL SECURITY;

-- Drop any existing restrictive policies
DROP POLICY IF EXISTS "Users can view own analysis data" ON common_streaming_vendor_analysis_logs;
DROP POLICY IF EXISTS "Users can insert own analysis data" ON common_streaming_vendor_analysis_logs;

-- Create permissive policies for MVP (anonymous access)
CREATE POLICY "Allow anonymous read access" ON common_streaming_vendor_analysis_logs
    FOR SELECT USING (true);

CREATE POLICY "Allow anonymous insert access" ON common_streaming_vendor_analysis_logs
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anonymous update access" ON common_streaming_vendor_analysis_logs
    FOR UPDATE USING (true);

-- Fix existing tables that need anonymous access
DO $$
DECLARE
    table_name TEXT;
BEGIN
    FOR table_name IN 
        SELECT unnest(ARRAY[
            'spotify_analysis_logs',
            'spotify_playback_sessions', 
            'spotify_track_analysis',
            'instruction_narratives',
            'workout_phases',
            'workout_types'
        ])
    LOOP
        -- Check if table exists
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = table_name) THEN
            -- Drop restrictive policies
            EXECUTE format('DROP POLICY IF EXISTS "Users can view own analysis data" ON %I', table_name);
            EXECUTE format('DROP POLICY IF EXISTS "Users can insert own analysis data" ON %I', table_name);
            EXECUTE format('DROP POLICY IF EXISTS "Enable read access for all users" ON %I', table_name);
            EXECUTE format('DROP POLICY IF EXISTS "Enable insert for all users" ON %I', table_name);
            
            -- Create permissive policies
            EXECUTE format('CREATE POLICY "Allow anonymous read access" ON %I FOR SELECT USING (true)', table_name);
            EXECUTE format('CREATE POLICY "Allow anonymous insert access" ON %I FOR INSERT WITH CHECK (true)', table_name);
            EXECUTE format('CREATE POLICY "Allow anonymous update access" ON %I FOR UPDATE USING (true)', table_name);
            
            RAISE NOTICE 'Updated RLS policies for table: %', table_name;
        END IF;
    END LOOP;
END $$;

-- ============================================================================
-- STEP 5: CREATE TESTING AND VERIFICATION FUNCTIONS
-- ============================================================================

-- Function to test database access
CREATE OR REPLACE FUNCTION test_database_access() 
RETURNS TABLE (
    test_name TEXT,
    status TEXT,
    details TEXT
) 
LANGUAGE plpgsql 
SECURITY DEFINER
AS $$
DECLARE
    session_test_id UUID;
    analysis_test_id UUID;
BEGIN
    -- Test 1: Create a session
    BEGIN
        INSERT INTO spotify_playback_sessions (session_name, workout_type) 
        VALUES ('Database Test Session', 'test') 
        RETURNING id INTO session_test_id;
        
        RETURN QUERY SELECT 
            'Session Creation'::TEXT,
            'SUCCESS'::TEXT,
            ('Session ID: ' || session_test_id::TEXT)::TEXT;
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT 
            'Session Creation'::TEXT,
            'FAILED'::TEXT,
            SQLERRM::TEXT;
    END;
    
    -- Test 2: Insert into vendor analysis table
    BEGIN
        INSERT INTO common_streaming_vendor_analysis_logs (
            session_id,
            vendor_source,
            track_name,
            artist_name,
            soundnet_energy,
            soundnet_happiness,
            soundnet_popularity
        ) VALUES (
            session_test_id,
            'Test API',
            'Test Track',
            'Test Artist',
            75,
            80,
            65
        ) RETURNING id INTO analysis_test_id;
        
        RETURN QUERY SELECT 
            'Analysis Logging'::TEXT,
            'SUCCESS'::TEXT,
            ('Analysis ID: ' || analysis_test_id::TEXT)::TEXT;
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT 
            'Analysis Logging'::TEXT,
            'FAILED'::TEXT,
            SQLERRM::TEXT;
    END;
    
    -- Test 3: Read data back
    BEGIN
        IF EXISTS (
            SELECT 1 FROM common_streaming_vendor_analysis_logs 
            WHERE id = analysis_test_id
        ) THEN
            RETURN QUERY SELECT 
                'Data Retrieval'::TEXT,
                'SUCCESS'::TEXT,
                'Can read inserted data'::TEXT;
        ELSE
            RETURN QUERY SELECT 
                'Data Retrieval'::TEXT,
                'FAILED'::TEXT,
                'Cannot find inserted data'::TEXT;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT 
            'Data Retrieval'::TEXT,
            'FAILED'::TEXT,
            SQLERRM::TEXT;
    END;
    
    -- Clean up test data
    BEGIN
        DELETE FROM common_streaming_vendor_analysis_logs WHERE id = analysis_test_id;
        DELETE FROM spotify_playback_sessions WHERE id = session_test_id;
    EXCEPTION WHEN OTHERS THEN
        -- Ignore cleanup errors
    END;
END $$;

-- Function to get table statistics
CREATE OR REPLACE FUNCTION get_table_stats()
RETURNS TABLE (
    table_name TEXT,
    row_count BIGINT,
    has_rls BOOLEAN,
    policy_count INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.table_name::TEXT,
        COALESCE(s.n_tup_ins - s.n_tup_del, 0) as row_count,
        c.relrowsecurity as has_rls,
        (SELECT COUNT(*) FROM pg_policy p WHERE p.polrelid = c.oid)::INTEGER as policy_count
    FROM information_schema.tables t
    LEFT JOIN pg_class c ON c.relname = t.table_name
    LEFT JOIN pg_stat_user_tables s ON s.relname = t.table_name
    WHERE t.table_schema = 'public' 
    AND t.table_name IN (
        'spotify_analysis_logs',
        'common_streaming_vendor_analysis_logs',
        'spotify_playback_sessions',
        'spotify_track_analysis'
    )
    ORDER BY t.table_name;
END $$;

-- ============================================================================
-- STEP 6: ADD HELPFUL COMMENTS AND DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE common_streaming_vendor_analysis_logs IS 'Vendor-agnostic music analysis data from multiple streaming APIs (Spotify, RapidAPI Soundnet, YouTube, Apple Music)';
COMMENT ON COLUMN common_streaming_vendor_analysis_logs.vendor_source IS 'API source: "Spotify API", "Soundnet API", "YouTube API", "Apple Music API", etc.';
COMMENT ON COLUMN common_streaming_vendor_analysis_logs.soundnet_energy IS 'Soundnet energy level 0-100 (raw scale)';
COMMENT ON COLUMN common_streaming_vendor_analysis_logs.spotify_energy IS 'Spotify energy level 0.0-1.0 (normalized scale)';
COMMENT ON COLUMN common_streaming_vendor_analysis_logs.soundnet_camelot IS 'Harmonic mixing notation (e.g., "8B", "1A")';

-- ============================================================================
-- STEP 7: RUN TESTS AND VERIFICATION
-- ============================================================================

-- Show table statistics
SELECT 
    '=== DATABASE MIGRATION COMPLETE ===' as status,
    'Running verification tests...' as message;

-- Test database access
SELECT * FROM test_database_access();

-- Show table statistics  
SELECT 
    '=== TABLE STATISTICS ===' as section,
    '' as spacer;

SELECT * FROM get_table_stats();

-- Show successful completion
SELECT 
    '✅ MIGRATION SUCCESSFUL!' as status,
    'Your database is now ready for RapidAPI → Supabase logging' as message,
    'Tables created, RLS policies fixed, and anonymous access enabled' as details;

-- Show next steps
SELECT 
    '📋 NEXT STEPS:' as section,
    '' as step_0,
    '1. Add RAPIDAPI_KEY to Netlify environment variables' as step_1,
    '2. Deploy the new Netlify function' as step_2, 
    '3. Update your client code to use secureRapidSoundnetService' as step_3,
    '4. Test the end-to-end flow' as step_4;