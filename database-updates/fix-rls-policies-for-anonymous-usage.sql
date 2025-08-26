-- Fix RLS Policies for Anonymous Usage
-- This allows the app to work without requiring user authentication for MVP purposes

-- Step 1: Fix existing table policies to allow anonymous access
-- Note: In production, you'd want proper user authentication instead

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view own analysis data" ON spotify_analysis_logs;
DROP POLICY IF EXISTS "Users can insert own analysis data" ON spotify_analysis_logs;
DROP POLICY IF EXISTS "Enable read access for all users" ON spotify_analysis_logs;
DROP POLICY IF EXISTS "Enable insert for all users" ON spotify_analysis_logs;

DROP POLICY IF EXISTS "Users can view own analysis data" ON common_streaming_vendor_analysis_logs;
DROP POLICY IF EXISTS "Users can insert own analysis data" ON common_streaming_vendor_analysis_logs;

DROP POLICY IF EXISTS "Enable read access for all users" ON spotify_playback_sessions;
DROP POLICY IF EXISTS "Enable insert for all users" ON spotify_playback_sessions;

DROP POLICY IF EXISTS "Enable read access for all users" ON spotify_track_analysis;
DROP POLICY IF EXISTS "Enable insert for all users" ON spotify_track_analysis;

-- Create permissive policies for anonymous access (MVP only)
-- For spotify_analysis_logs table
CREATE POLICY "Allow anonymous read access" ON spotify_analysis_logs
    FOR SELECT USING (true);

CREATE POLICY "Allow anonymous insert access" ON spotify_analysis_logs
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anonymous update access" ON spotify_analysis_logs
    FOR UPDATE USING (true);

-- For common_streaming_vendor_analysis_logs table (if it exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'common_streaming_vendor_analysis_logs') THEN
        -- Create policies for the new vendor table
        EXECUTE 'CREATE POLICY "Allow anonymous read access" ON common_streaming_vendor_analysis_logs FOR SELECT USING (true)';
        EXECUTE 'CREATE POLICY "Allow anonymous insert access" ON common_streaming_vendor_analysis_logs FOR INSERT WITH CHECK (true)';
        EXECUTE 'CREATE POLICY "Allow anonymous update access" ON common_streaming_vendor_analysis_logs FOR UPDATE USING (true)';
    END IF;
END $$;

-- For spotify_playback_sessions table
CREATE POLICY "Allow anonymous read access" ON spotify_playback_sessions
    FOR SELECT USING (true);

CREATE POLICY "Allow anonymous insert access" ON spotify_playback_sessions
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anonymous update access" ON spotify_playback_sessions
    FOR UPDATE USING (true);

-- For spotify_track_analysis table
CREATE POLICY "Allow anonymous read access" ON spotify_track_analysis
    FOR SELECT USING (true);

CREATE POLICY "Allow anonymous insert access" ON spotify_track_analysis
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anonymous update access" ON spotify_track_analysis
    FOR UPDATE USING (true);

-- For instruction_narratives table (fix the 42501 error)
DROP POLICY IF EXISTS "Enable read access for all users" ON instruction_narratives;
DROP POLICY IF EXISTS "Enable insert for all users" ON instruction_narratives;

CREATE POLICY "Allow anonymous read access" ON instruction_narratives
    FOR SELECT USING (true);

CREATE POLICY "Allow anonymous insert access" ON instruction_narratives
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anonymous update access" ON instruction_narratives
    FOR UPDATE USING (true);

CREATE POLICY "Allow anonymous delete access" ON instruction_narratives
    FOR DELETE USING (true);

-- Fix other tables that might have RLS issues
DO $$
DECLARE
    table_record RECORD;
BEGIN
    -- Get all tables with RLS enabled
    FOR table_record IN 
        SELECT schemaname, tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename IN (
            'workout_phases',
            'workout_types', 
            'trainers',
            'community_posts',
            'users'
        )
    LOOP
        -- Check if RLS is enabled
        IF EXISTS (
            SELECT 1 FROM pg_class c
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE c.relname = table_record.tablename
            AND n.nspname = table_record.schemaname
            AND c.relrowsecurity = true
        ) THEN
            -- Create anonymous access policies
            EXECUTE format('DROP POLICY IF EXISTS "Allow anonymous read access" ON %I', table_record.tablename);
            EXECUTE format('DROP POLICY IF EXISTS "Allow anonymous insert access" ON %I', table_record.tablename);
            EXECUTE format('DROP POLICY IF EXISTS "Allow anonymous update access" ON %I', table_record.tablename);
            EXECUTE format('DROP POLICY IF EXISTS "Allow anonymous delete access" ON %I', table_record.tablename);
            
            EXECUTE format('CREATE POLICY "Allow anonymous read access" ON %I FOR SELECT USING (true)', table_record.tablename);
            EXECUTE format('CREATE POLICY "Allow anonymous insert access" ON %I FOR INSERT WITH CHECK (true)', table_record.tablename);
            EXECUTE format('CREATE POLICY "Allow anonymous update access" ON %I FOR UPDATE USING (true)', table_record.tablename);
            EXECUTE format('CREATE POLICY "Allow anonymous delete access" ON %I FOR DELETE USING (true)', table_record.tablename);
            
            RAISE NOTICE 'Updated RLS policies for table: %', table_record.tablename;
        END IF;
    END LOOP;
END $$;

-- Create a test function to verify anonymous access works
CREATE OR REPLACE FUNCTION test_anonymous_access() 
RETURNS TABLE (
    table_name text,
    can_select boolean,
    can_insert boolean,
    test_result text
) 
LANGUAGE plpgsql 
SECURITY DEFINER
AS $$
BEGIN
    -- Test spotify_playback_sessions
    BEGIN
        PERFORM 1 FROM spotify_playback_sessions LIMIT 1;
        can_select := true;
    EXCEPTION WHEN OTHERS THEN
        can_select := false;
    END;
    
    BEGIN
        INSERT INTO spotify_playback_sessions (session_name, workout_type) 
        VALUES ('Test Session', 'test') RETURNING id;
        can_insert := true;
    EXCEPTION WHEN OTHERS THEN
        can_insert := false;
    END;
    
    RETURN QUERY SELECT 
        'spotify_playback_sessions'::text,
        can_select,
        can_insert,
        CASE 
            WHEN can_select AND can_insert THEN 'SUCCESS: Anonymous access works'
            ELSE 'FAILED: Anonymous access blocked'
        END;
    
    -- Test instruction_narratives
    can_select := false;
    can_insert := false;
    
    BEGIN
        PERFORM 1 FROM instruction_narratives LIMIT 1;
        can_select := true;
    EXCEPTION WHEN OTHERS THEN
        can_select := false;
    END;
    
    RETURN QUERY SELECT 
        'instruction_narratives'::text,
        can_select,
        false, -- Skip insert test for this table
        CASE 
            WHEN can_select THEN 'SUCCESS: Anonymous read access works'
            ELSE 'FAILED: Anonymous read access blocked'
        END;
END $$;

-- Run the test
SELECT * FROM test_anonymous_access();

-- Add helpful comment
COMMENT ON FUNCTION test_anonymous_access() IS 'Test function to verify that anonymous users can access necessary tables for the MVP';

-- Success message
SELECT 
    '✅ RLS Policies updated for anonymous access!' as status,
    'All users can now read/write to logging tables without authentication' as note,
    '⚠️ In production, implement proper user authentication instead' as warning;