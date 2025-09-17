-- Add new columns to streaming_vendor_attributes table for audio timestamp capture features
-- 2025-09-17: Bar start, rhythm taps (array of 8 timestamps), and loudness timestamp columns

-- Add bar_start_timestamp column (float to capture timestamp)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'streaming_vendor_attributes' 
        AND column_name = 'bar_start_timestamp'
    ) THEN
        ALTER TABLE streaming_vendor_attributes 
        ADD COLUMN bar_start_timestamp FLOAT NULL;
        
        COMMENT ON COLUMN streaming_vendor_attributes.bar_start_timestamp IS 
        'Timestamp in milliseconds when a bar/measure starts, captured manually during audio recording';
    END IF;
END $$;

-- Add rhythm_taps column (array of floats to capture up to 8 rhythm timestamps)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'streaming_vendor_attributes' 
        AND column_name = 'rhythm_taps'
    ) THEN
        ALTER TABLE streaming_vendor_attributes 
        ADD COLUMN rhythm_taps FLOAT[] NULL;
        
        COMMENT ON COLUMN streaming_vendor_attributes.rhythm_taps IS 
        'Array of up to 8 timestamps in milliseconds capturing rhythm taps during audio recording';
    END IF;
END $$;

-- Add loudness_timestamp column (float to capture loudness change timestamp)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'streaming_vendor_attributes' 
        AND column_name = 'loudness_timestamp'
    ) THEN
        ALTER TABLE streaming_vendor_attributes 
        ADD COLUMN loudness_timestamp FLOAT NULL;
        
        COMMENT ON COLUMN streaming_vendor_attributes.loudness_timestamp IS 
        'Timestamp in milliseconds when a significant loudness/volume change occurs, captured manually during audio recording';
    END IF;
END $$;

-- Verify the new columns were added
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'streaming_vendor_attributes' 
AND column_name IN ('bar_start_timestamp', 'rhythm_taps', 'loudness_timestamp')
ORDER BY column_name;

-- Show sample usage query for the new columns
-- This query would show how to access the new timestamp data:
/*
SELECT 
    track_name,
    artist_name,
    timestamp_ms,
    event_type,
    bar_start_timestamp,
    rhythm_taps,
    loudness_timestamp,
    captured_by,
    created_at
FROM streaming_vendor_attributes 
WHERE event_type IN ('bar_start', 'rhythm_taps', 'loudness')
AND captured_by = 'manual_audio_capture'
ORDER BY created_at DESC
LIMIT 10;
*/

-- Index for performance on the new event types
CREATE INDEX IF NOT EXISTS idx_sva_audio_timestamp_events 
ON streaming_vendor_attributes (event_type, captured_by, created_at) 
WHERE event_type IN ('bar_start', 'rhythm_taps', 'loudness');

COMMENT ON INDEX idx_sva_audio_timestamp_events IS 
'Performance index for queries filtering on audio timestamp capture event types';