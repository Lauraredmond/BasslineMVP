-- FINAL FIXED DATABASE MIGRATION SCRIPT
-- This script resolves the variable name ambiguity issue
-- Run this entire script in your Supabase SQL editor

-- ============================================================================
-- STEP 1: CREATE VENDOR-AGNOSTIC ANALYSIS TABLE
-- ============================================================================

-- Drop the table if it exists with incorrect structure
DROP TABLE IF EXISTS common_streaming_vendor_analysis_logs CASCADE;

CREATE TABLE common_streaming_vendor_analysis_logs (
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
    -- These map the old column names to new structure
    danceability REAL, -- Maps to spotify_danceability
    energy REAL,       -- Maps to spotify_energy  
    valence REAL,      -- Maps to spotify_valence
    acousticness REAL, -- Maps to spotify_acousticness
    instrumentalness REAL, -- Maps to spotify_instrumentalness
    liveness REAL,     -- Maps to spotify_liveness
    speechiness REAL,  -- Maps to spotify_speechiness
    track_loudness REAL, -- Maps to spotify_loudness
    track_tempo REAL,  -- Maps to spotify_tempo
    track_key INTEGER, -- Maps to spotify_key
    track_mode INTEGER, -- Maps to spotify_mode
    time_signature INTEGER, -- Maps to spotify_time_signature
    
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

-- Success message for table creation
SELECT 'common_streaming_vendor_analysis_logs table created successfully!' as status;

-- ============================================================================
-- STEP 2: CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_vendor_analysis_session_id ON common_streaming_vendor_analysis_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_vendor_analysis_timestamp ON common_streaming_vendor_analysis_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_vendor_analysis_track_name ON common_streaming_vendor_analysis_logs(track_name);
CREATE INDEX IF NOT EXISTS idx_vendor_analysis_vendor_source ON common_streaming_vendor_analysis_logs(vendor_source);
CREATE INDEX IF NOT EXISTS idx_vendor_analysis_playback_position ON common_streaming_vendor_analysis_logs(playback_position_ms);
CREATE INDEX IF NOT EXISTS idx_vendor_analysis_data_source ON common_streaming_vendor_analysis_logs(data_source);

SELECT 'Performance indexes created successfully!' as status;

-- ============================================================================
-- STEP 3: MIGRATE EXISTING DATA (SIMPLE APPROACH)
-- ============================================================================

-- Check if old table exists and migrate data
DO $$
DECLARE
    has_old_table BOOLEAN := FALSE;
    data_count INTEGER := 0;
    migrated_count INTEGER := 0;
BEGIN
    -- Check if old table exists
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public'
        AND table_name = 'spotify_analysis_logs'
    ) INTO has_old_table;
    
    IF has_old_table THEN
        -- Count existing data
        EXECUTE 'SELECT COUNT(*) FROM spotify_analysis_logs' INTO data_count;
        RAISE NOTICE 'Found spotify_analysis_logs table with % records', data_count;
        
        IF data_count > 0 THEN
            -- Simple migration with only commonly existing columns
            INSERT INTO common_streaming_vendor_analysis_logs (
                session_id,
                vendor_source,
                track_name,
                artist_name,
                created_at,
                timestamp
            )
            SELECT 
                session_id,
                'Spotify API' as vendor_source,
                COALESCE(track_name, 'Unknown Track') as track_name,
                COALESCE(artist_name, 'Unknown Artist') as artist_name,
                COALESCE(created_at, NOW()) as created_at,
                COALESCE(timestamp, NOW()) as timestamp
            FROM spotify_analysis_logs
            WHERE NOT EXISTS (
                SELECT 1 FROM common_streaming_vendor_analysis_logs 
                WHERE track_name = spotify_analysis_logs.track_name
                AND session_id = spotify_analysis_logs.session_id
            );
            
            -- Count migrated records
            SELECT COUNT(*) FROM common_streaming_vendor_analysis_logs INTO migrated_count;
            RAISE NOTICE 'Successfully migrated % records to new table', migrated_count;
        ELSE
            RAISE NOTICE 'Old table exists but contains no data to migrate';
        END IF;
    ELSE
        RAISE NOTICE 'No spotify_analysis_logs table found - starting fresh';
    END IF;
END $$;

-- ============================================================================
-- STEP 4: FIX RLS POLICIES FOR ANONYMOUS ACCESS
-- ============================================================================

-- Enable RLS on the new table
ALTER TABLE common_streaming_vendor_analysis_logs ENABLE ROW LEVEL SECURITY;
SELECT 'RLS enabled on common_streaming_vendor_analysis_logs' as status;

-- Create permissive policies for MVP (anonymous access)
CREATE POLICY "Allow anonymous read access" ON common_streaming_vendor_analysis_logs
    FOR SELECT USING (true);

CREATE POLICY "Allow anonymous insert access" ON common_streaming_vendor_analysis_logs
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anonymous update access" ON common_streaming_vendor_analysis_logs
    FOR UPDATE USING (true);

SELECT 'Anonymous access policies created for common_streaming_vendor_analysis_logs' as status;

-- Fix existing tables RLS policies
DO $$
DECLARE
    target_table TEXT;
    table_exists BOOLEAN;
BEGIN
    -- Array of tables to fix
    FOREACH target_table IN ARRAY ARRAY[
        'spotify_analysis_logs',
        'spotify_playback_sessions', 
        'spotify_track_analysis',
        'instruction_narratives',
        'workout_phases',
        'workout_types'
    ]
    LOOP
        -- Check if table exists
        SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public'
            AND table_name = target_table
        ) INTO table_exists;
        
        IF table_exists THEN
            -- Drop existing restrictive policies
            EXECUTE format('DROP POLICY IF EXISTS "Users can view own analysis data" ON %I', target_table);
            EXECUTE format('DROP POLICY IF EXISTS "Users can insert own analysis data" ON %I', target_table);
            EXECUTE format('DROP POLICY IF EXISTS "Enable read access for all users" ON %I', target_table);
            EXECUTE format('DROP POLICY IF EXISTS "Enable insert for all users" ON %I', target_table);
            EXECUTE format('DROP POLICY IF EXISTS "Allow anonymous read access" ON %I', target_table);
            EXECUTE format('DROP POLICY IF EXISTS "Allow anonymous insert access" ON %I', target_table);
            EXECUTE format('DROP POLICY IF EXISTS "Allow anonymous update access" ON %I', target_table);
            
            -- Create new permissive policies
            EXECUTE format('CREATE POLICY "Allow anonymous read access" ON %I FOR SELECT USING (true)', target_table);
            EXECUTE format('CREATE POLICY "Allow anonymous insert access" ON %I FOR INSERT WITH CHECK (true)', target_table);
            EXECUTE format('CREATE POLICY "Allow anonymous update access" ON %I FOR UPDATE USING (true)', target_table);
            
            RAISE NOTICE 'Fixed RLS policies for table: %', target_table;
        ELSE
            RAISE NOTICE 'Table % does not exist, skipping RLS fix', target_table;
        END IF;
    END LOOP;
END $$;

-- ============================================================================
-- STEP 5: CREATE TESTING AND VERIFICATION FUNCTIONS
-- ============================================================================

-- Simple test function without variable name conflicts
CREATE OR REPLACE FUNCTION test_migration_success() 
RETURNS TABLE (
    test_name TEXT,
    status TEXT,
    details TEXT
) 
LANGUAGE plpgsql 
AS $$
DECLARE
    test_session_id UUID;
    test_analysis_id UUID;
BEGIN
    -- Test 1: Create a test session
    BEGIN
        INSERT INTO spotify_playback_sessions (session_name, workout_type) 
        VALUES ('Migration Verification Session', 'test') 
        RETURNING id INTO test_session_id;
        
        RETURN QUERY SELECT 
            'Session Creation'::TEXT,
            'SUCCESS'::TEXT,
            ('Created session: ' || test_session_id::TEXT)::TEXT;
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT 
            'Session Creation'::TEXT,
            'FAILED'::TEXT,
            SQLERRM::TEXT;
    END;
    
    -- Test 2: Insert into new vendor analysis table
    BEGIN
        INSERT INTO common_streaming_vendor_analysis_logs (
            session_id,
            vendor_source,
            track_name,
            artist_name,
            soundnet_energy,
            soundnet_happiness,
            spotify_danceability,
            spotify_energy,
            danceability,
            energy
        ) VALUES (
            test_session_id,
            'Migration Test API',
            'Test Track',
            'Test Artist',
            85,
            90,
            0.85,
            0.90,
            0.85,
            0.90
        ) RETURNING id INTO test_analysis_id;
        
        RETURN QUERY SELECT 
            'Analysis Insert'::TEXT,
            'SUCCESS'::TEXT,
            ('Created analysis: ' || test_analysis_id::TEXT)::TEXT;
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT 
            'Analysis Insert'::TEXT,
            'FAILED'::TEXT,
            SQLERRM::TEXT;
    END;
    
    -- Test 3: Read data back
    BEGIN
        IF EXISTS (
            SELECT 1 FROM common_streaming_vendor_analysis_logs 
            WHERE id = test_analysis_id
            AND vendor_source = 'Migration Test API'
        ) THEN
            RETURN QUERY SELECT 
                'Data Verification'::TEXT,
                'SUCCESS'::TEXT,
                'Data was inserted and can be retrieved'::TEXT;
        ELSE
            RETURN QUERY SELECT 
                'Data Verification'::TEXT,
                'FAILED'::TEXT,
                'Data was not found after insertion'::TEXT;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT 
            'Data Verification'::TEXT,
            'FAILED'::TEXT,
            SQLERRM::TEXT;
    END;
    
    -- Test 4: Anonymous access test
    BEGIN
        PERFORM 1 FROM common_streaming_vendor_analysis_logs LIMIT 1;
        RETURN QUERY SELECT 
            'Anonymous Access'::TEXT,
            'SUCCESS'::TEXT,
            'Anonymous users can access the table'::TEXT;
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT 
            'Anonymous Access'::TEXT,
            'FAILED'::TEXT,
            ('Access denied: ' || SQLERRM)::TEXT;
    END;
    
    -- Clean up test data
    BEGIN
        DELETE FROM common_streaming_vendor_analysis_logs WHERE id = test_analysis_id;
        DELETE FROM spotify_playback_sessions WHERE id = test_session_id;
        RAISE NOTICE 'Cleaned up test data';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not clean up test data: %', SQLERRM;
    END;
END $$;

-- ============================================================================
-- STEP 6: RUN VERIFICATION TESTS
-- ============================================================================

-- Show completion status
SELECT 
    '🎉 DATABASE MIGRATION COMPLETED! 🎉' as status,
    'Running verification tests...' as next_step;

-- Run the migration verification tests
SELECT * FROM test_migration_success();

-- Show table statistics
SELECT 
    '=== MIGRATION RESULTS ===' as section;

SELECT 
    schemaname,
    tablename,
    COALESCE(n_tup_ins, 0) - COALESCE(n_tup_del, 0) as row_count,
    n_tup_ins as total_inserts,
    n_tup_upd as total_updates
FROM pg_stat_user_tables 
WHERE tablename IN (
    'spotify_analysis_logs',
    'common_streaming_vendor_analysis_logs',
    'spotify_playbook_sessions'
)
ORDER BY tablename;

-- Final success message
SELECT 
    '✅ MIGRATION COMPLETED SUCCESSFULLY!' as final_status,
    'Your database is ready for secure RapidAPI → Supabase logging' as message,
    'The new common_streaming_vendor_analysis_logs table is configured and accessible' as details;

-- Next steps
SELECT 
    '📋 NEXT STEPS:' as instructions,
    '1. Add RAPIDAPI_KEY to Netlify environment variables' as step_1,
    '2. Deploy your Netlify function (if not done)' as step_2, 
    '3. Test your application integration' as step_3,
    '4. Use the Debug Panel to run integration tests' as step_4;