-- Add spotify_tempo column to existing streaming_vendor_attributes table
-- This stores the BPM value from Spotify's audio_features API

DO $$
BEGIN
    -- Check if the column already exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'streaming_vendor_attributes' 
        AND column_name = 'spotify_tempo'
        AND table_schema = 'public'
    ) THEN
        -- Add the column
        ALTER TABLE public.streaming_vendor_attributes 
        ADD COLUMN spotify_tempo REAL;
        
        -- Add comment
        COMMENT ON COLUMN public.streaming_vendor_attributes.spotify_tempo 
        IS 'BPM value from Spotify audio_features API';
        
        RAISE NOTICE 'Added spotify_tempo column to streaming_vendor_attributes table';
    ELSE
        RAISE NOTICE 'spotify_tempo column already exists in streaming_vendor_attributes table';
    END IF;
END $$;