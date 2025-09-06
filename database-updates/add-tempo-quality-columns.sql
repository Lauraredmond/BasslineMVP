-- Add tempo quality and lineage tracking columns to streaming_vendor_attributes table
-- This implements the tempo QA system for the Bassline MVP

DO $$
BEGIN
    -- Add tempo_source column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'streaming_vendor_attributes' 
        AND column_name = 'tempo_source'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.streaming_vendor_attributes 
        ADD COLUMN tempo_source TEXT 
        CHECK (tempo_source IN ('spotify_api','computed','manual','unknown')) 
        DEFAULT 'unknown';
        
        COMMENT ON COLUMN public.streaming_vendor_attributes.tempo_source 
        IS 'Source of the tempo data: spotify_api, computed, manual, or unknown';
        
        RAISE NOTICE 'Added tempo_source column to streaming_vendor_attributes';
    ELSE
        RAISE NOTICE 'tempo_source column already exists';
    END IF;

    -- Add tempo_confidence column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'streaming_vendor_attributes' 
        AND column_name = 'tempo_confidence'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.streaming_vendor_attributes 
        ADD COLUMN tempo_confidence NUMERIC 
        CHECK (tempo_confidence BETWEEN 0 AND 1) 
        DEFAULT NULL;
        
        COMMENT ON COLUMN public.streaming_vendor_attributes.tempo_confidence 
        IS 'Confidence score for tempo accuracy (0.0 to 1.0, NULL if unknown)';
        
        RAISE NOTICE 'Added tempo_confidence column to streaming_vendor_attributes';
    ELSE
        RAISE NOTICE 'tempo_confidence column already exists';
    END IF;

    -- Add tempo_last_verified_at column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'streaming_vendor_attributes' 
        AND column_name = 'tempo_last_verified_at'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.streaming_vendor_attributes 
        ADD COLUMN tempo_last_verified_at TIMESTAMPTZ DEFAULT NULL;
        
        COMMENT ON COLUMN public.streaming_vendor_attributes.tempo_last_verified_at 
        IS 'Timestamp of last tempo verification/quality check';
        
        RAISE NOTICE 'Added tempo_last_verified_at column to streaming_vendor_attributes';
    ELSE
        RAISE NOTICE 'tempo_last_verified_at column already exists';
    END IF;

    -- Add vendor column if it doesn't exist (required by the spec)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'streaming_vendor_attributes' 
        AND column_name = 'vendor'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.streaming_vendor_attributes 
        ADD COLUMN vendor VARCHAR(50) DEFAULT 'spotify';
        
        COMMENT ON COLUMN public.streaming_vendor_attributes.vendor 
        IS 'Streaming vendor (spotify, apple_music, etc.)';
        
        RAISE NOTICE 'Added vendor column to streaming_vendor_attributes';
    ELSE
        RAISE NOTICE 'vendor column already exists';
    END IF;

    -- Add track_id column if it doesn't exist (required by the spec)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'streaming_vendor_attributes' 
        AND column_name = 'track_id'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.streaming_vendor_attributes 
        ADD COLUMN track_id VARCHAR(255);
        
        COMMENT ON COLUMN public.streaming_vendor_attributes.track_id 
        IS 'Vendor-specific track identifier (e.g., Spotify track ID)';
        
        -- Populate track_id with spotify_track_id where available
        UPDATE public.streaming_vendor_attributes 
        SET track_id = spotify_track_id 
        WHERE spotify_track_id IS NOT NULL AND track_id IS NULL;
        
        RAISE NOTICE 'Added track_id column to streaming_vendor_attributes';
    ELSE
        RAISE NOTICE 'track_id column already exists';
    END IF;

    -- Add section columns if they don't exist (for section-level BPM)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'streaming_vendor_attributes' 
        AND column_name = 'section_start_ms'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.streaming_vendor_attributes 
        ADD COLUMN section_start_ms BIGINT DEFAULT NULL;
        
        COMMENT ON COLUMN public.streaming_vendor_attributes.section_start_ms 
        IS 'Start time of section in milliseconds';
        
        RAISE NOTICE 'Added section_start_ms column to streaming_vendor_attributes';
    ELSE
        RAISE NOTICE 'section_start_ms column already exists';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'streaming_vendor_attributes' 
        AND column_name = 'section_end_ms'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.streaming_vendor_attributes 
        ADD COLUMN section_end_ms BIGINT DEFAULT NULL;
        
        COMMENT ON COLUMN public.streaming_vendor_attributes.section_end_ms 
        IS 'End time of section in milliseconds';
        
        RAISE NOTICE 'Added section_end_ms column to streaming_vendor_attributes';
    ELSE
        RAISE NOTICE 'section_end_ms column already exists';
    END IF;

    -- Update existing records to have better defaults
    -- Set tempo_source based on existing data
    UPDATE public.streaming_vendor_attributes 
    SET tempo_source = CASE 
        WHEN spotify_tempo IS NOT NULL AND data_source = 'manual_capture' THEN 'spotify_api'
        WHEN estimated_tempo IS NOT NULL THEN 'computed'
        ELSE 'unknown'
    END,
    tempo_confidence = CASE 
        WHEN spotify_tempo IS NOT NULL THEN 0.8
        WHEN estimated_tempo IS NOT NULL THEN 0.6
        ELSE NULL
    END
    WHERE tempo_source = 'unknown';

    -- Create indexes for performance
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'streaming_vendor_attributes' 
        AND indexname = 'idx_streaming_vendor_track_vendor'
    ) THEN
        CREATE INDEX idx_streaming_vendor_track_vendor 
        ON public.streaming_vendor_attributes(track_id, vendor);
        RAISE NOTICE 'Created index idx_streaming_vendor_track_vendor';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'streaming_vendor_attributes' 
        AND indexname = 'idx_streaming_vendor_sections'
    ) THEN
        CREATE INDEX idx_streaming_vendor_sections 
        ON public.streaming_vendor_attributes(track_id, vendor, section_start_ms, section_end_ms)
        WHERE section_start_ms IS NOT NULL;
        RAISE NOTICE 'Created index idx_streaming_vendor_sections';
    END IF;
END $$;

-- Create audit query for tempo quality assessment
-- This query helps identify "defaulty" tempos and quality issues
COMMENT ON TABLE public.streaming_vendor_attributes IS 
'Streaming vendor track attributes with tempo quality tracking. Use these audit queries:

-- Spot "defaulty" tempos
SELECT spotify_tempo, COUNT(*) AS track_count
FROM streaming_vendor_attributes
WHERE vendor = ''spotify'' AND spotify_tempo IS NOT NULL
GROUP BY spotify_tempo
ORDER BY track_count DESC
LIMIT 10;

-- Check nulls and outliers
SELECT
  SUM(CASE WHEN spotify_tempo IS NULL THEN 1 ELSE 0 END) AS nulls,
  SUM(CASE WHEN spotify_tempo < 40 OR spotify_tempo > 220 THEN 1 ELSE 0 END) AS outliers,
  COUNT(*) AS total
FROM streaming_vendor_attributes
WHERE vendor = ''spotify'';

-- Quality distribution
SELECT tempo_source, tempo_confidence, COUNT(*) 
FROM streaming_vendor_attributes 
GROUP BY tempo_source, tempo_confidence 
ORDER BY tempo_source, tempo_confidence;
';