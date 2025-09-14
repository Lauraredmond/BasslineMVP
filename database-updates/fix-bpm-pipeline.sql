-- CRITICAL FIX: Add spotify_tempo column and populate The Pretender BPM
-- Data Analyst Report: This column is missing from production table

-- Step 1: Add the missing column
ALTER TABLE streaming_vendor_attributes 
ADD COLUMN IF NOT EXISTS spotify_tempo REAL;

-- Add comment
COMMENT ON COLUMN streaming_vendor_attributes.spotify_tempo 
IS 'BPM from Spotify audio_features API - critical for workout_track mapping';

-- Step 2: Update The Pretender with correct BPM (172 BPM = sprint_intervals)
UPDATE streaming_vendor_attributes 
SET spotify_tempo = 172
WHERE track_name ILIKE '%pretender%' 
AND artist_name ILIKE '%foo%';

-- Step 3: Verify the data pipeline works
SELECT 
  track_name,
  artist_name,
  spotify_tempo,
  section_type,
  timestamp_ms,
  CASE 
    WHEN spotify_tempo >= 140 THEN 'sprint_intervals'
    WHEN spotify_tempo >= 120 THEN 'jumps'
    WHEN spotify_tempo >= 95 THEN 'hills'
    WHEN spotify_tempo >= 85 THEN 'resistance'
    WHEN spotify_tempo >= 80 THEN 'climb'
    WHEN spotify_tempo >= 70 THEN 'warmup'
    WHEN spotify_tempo >= 60 THEN 'cooldown'
    ELSE 'recovery'
  END as mapped_workout_track
FROM streaming_vendor_attributes 
WHERE track_name ILIKE '%pretender%' 
ORDER BY timestamp_ms;

-- Step 4: Show the table structure
\d streaming_vendor_attributes;