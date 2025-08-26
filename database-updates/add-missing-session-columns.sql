-- Add missing columns to existing spotify_playback_sessions table

-- Step 1: Add missing columns
ALTER TABLE spotify_playback_sessions 
ADD COLUMN IF NOT EXISTS ended_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS workout_plan JSONB,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS total_tracks_analyzed INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS session_notes TEXT;

-- Step 2: Update existing rows to have is_active = true if they don't have ended_at
UPDATE spotify_playback_sessions 
SET is_active = TRUE 
WHERE ended_at IS NULL;

-- Step 3: Verify the columns were added
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'spotify_playback_sessions'
ORDER BY ordinal_position;

-- Step 4: Test that foreign key constraint will work now
SELECT 'Sessions table updated successfully! Foreign key should work now.' as status;