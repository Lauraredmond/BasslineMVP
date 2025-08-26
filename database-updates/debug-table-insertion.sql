-- Debug script to test database insertion issues
-- Run this in Supabase SQL editor to diagnose the problem

-- Step 1: Check if table exists and has correct structure
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'common_streaming_vendor_analysis_logs'
ORDER BY ordinal_position;

-- Step 2: Check RLS policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'common_streaming_vendor_analysis_logs';

-- Step 3: Test manual insertion (this should work if policies are correct)
INSERT INTO common_streaming_vendor_analysis_logs (
    track_name,
    artist_name,
    vendor_source,
    data_source,
    from_cache,
    fallback_type,
    soundnet_energy,
    soundnet_tempo,
    soundnet_key,
    soundnet_mode,
    spotify_danceability,
    spotify_energy
) VALUES (
    'Test Track',
    'Test Artist',
    'Soundnet API',
    'rapidapi',
    false,
    null,
    75,
    120,
    'C',
    'major',
    0.8,
    0.7
);

-- Step 4: Check if the test row was inserted
SELECT COUNT(*) as total_rows FROM common_streaming_vendor_analysis_logs;

-- Step 5: Show recent rows (if any)
SELECT 
    id,
    track_name,
    artist_name,
    vendor_source,
    data_source,
    from_cache,
    fallback_type,
    created_at
FROM common_streaming_vendor_analysis_logs 
ORDER BY created_at DESC 
LIMIT 5;

-- Step 6: Check if old table has data instead
SELECT COUNT(*) as old_table_rows FROM spotify_analysis_logs WHERE created_at > NOW() - INTERVAL '1 day';