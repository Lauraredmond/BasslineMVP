-- Create the missing spotify_playback_sessions table (simplified version)
-- This is required for the foreign key constraint in common_streaming_vendor_analysis_logs

-- Step 1: Create the sessions table without RLS for now
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

-- Step 2: Create indexes only
CREATE INDEX IF NOT EXISTS idx_playback_sessions_user_id ON spotify_playback_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_playback_sessions_created_at ON spotify_playback_sessions(created_at);
CREATE INDEX IF NOT EXISTS idx_playback_sessions_is_active ON spotify_playback_sessions(is_active);

-- Step 3: Test that it works
SELECT 'Sessions table created successfully (no RLS)!' as status;

-- Step 4: Insert a test session to make sure foreign key will work
INSERT INTO spotify_playback_sessions (workout_type, is_active) 
VALUES ('test', false);

-- Step 5: Show it was created
SELECT COUNT(*) as session_count FROM spotify_playback_sessions;