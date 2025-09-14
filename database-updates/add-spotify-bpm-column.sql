-- Add spotify_tempo column to streaming_vendor_attributes table
-- Run this in your Supabase SQL Editor

-- Add the column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'streaming_vendor_attributes' 
        AND column_name = 'spotify_tempo'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.streaming_vendor_attributes 
        ADD COLUMN spotify_tempo REAL;
        
        RAISE NOTICE 'Successfully added spotify_tempo column';
    ELSE
        RAISE NOTICE 'spotify_tempo column already exists';
    END IF;
END $$;

-- Add a comment to document the column
COMMENT ON COLUMN public.streaming_vendor_attributes.spotify_tempo 
IS 'BPM (beats per minute) from Spotify audio_features API';

-- Verify the column was added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'streaming_vendor_attributes' 
AND column_name = 'spotify_tempo';