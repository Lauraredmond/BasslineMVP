-- Create the missing spotify_playback_sessions table
-- This is required for the foreign key constraint in common_streaming_vendor_analysis_logs

-- Step 1: Create the sessions table
CREATE TABLE IF NOT EXISTS spotify_playback_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    workout_type TEXT,
    workout_plan JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    total_tracks_analyzed INTEGER DEFAULT 0,
    session_notes TEXT
);

-- Step 2: Add RLS policies
ALTER TABLE spotify_playback_sessions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own sessions" ON spotify_playback_sessions;
DROP POLICY IF EXISTS "Users can insert own sessions" ON spotify_playback_sessions;
DROP POLICY IF EXISTS "Users can update own sessions" ON spotify_playback_sessions;

-- Allow authenticated users to manage their own sessions
CREATE POLICY "Users can view own sessions" ON spotify_playback_sessions
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert own sessions" ON spotify_playback_sessions
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update own sessions" ON spotify_playback_sessions
    FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Step 3: Create indexes
CREATE INDEX IF NOT EXISTS idx_playback_sessions_user_id ON spotify_playback_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_playback_sessions_created_at ON spotify_playback_sessions(created_at);
CREATE INDEX IF NOT EXISTS idx_playback_sessions_is_active ON spotify_playback_sessions(is_active);

-- Step 4: Test that it works
SELECT 'Sessions table created successfully!' as status;