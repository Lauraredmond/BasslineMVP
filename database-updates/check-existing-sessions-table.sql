-- Check the existing spotify_playback_sessions table structure

-- Step 1: Show all columns in the existing table
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'spotify_playback_sessions'
ORDER BY ordinal_position;

-- Step 2: Show existing data in the table
SELECT COUNT(*) as existing_rows FROM spotify_playback_sessions;

-- Step 3: Show recent rows if any
SELECT * FROM spotify_playback_sessions 
ORDER BY created_at DESC 
LIMIT 3;