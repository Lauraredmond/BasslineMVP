-- Fix timestamp data types to support decimal values
-- 2025-09-17: Change bigint to numeric for precise timestamp handling

-- Change timestamp_ms from bigint to numeric to support decimal timestamps
DO $$ 
BEGIN
    -- Check current data type
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'streaming_vendor_attributes' 
        AND column_name = 'timestamp_ms'
        AND data_type = 'bigint'
    ) THEN
        ALTER TABLE streaming_vendor_attributes 
        ALTER COLUMN timestamp_ms TYPE NUMERIC USING timestamp_ms::numeric;
        
        COMMENT ON COLUMN streaming_vendor_attributes.timestamp_ms IS 
        'Timestamp in milliseconds with decimal precision for accurate timing';
        
        RAISE NOTICE 'Changed timestamp_ms from bigint to numeric';
    ELSE
        RAISE NOTICE 'timestamp_ms is already correct type or does not exist';
    END IF;
END $$;

-- Verify the rhythm_taps column is proper array type (should already be FLOAT[])
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'streaming_vendor_attributes' 
        AND column_name = 'rhythm_taps'
        AND data_type = 'ARRAY'
    ) THEN
        RAISE NOTICE 'rhythm_taps column needs to be created or fixed';
    ELSE
        RAISE NOTICE 'rhythm_taps column is correctly typed as array';
    END IF;
END $$;

-- Show current column types
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'streaming_vendor_attributes' 
AND column_name IN ('timestamp_ms', 'bar_start_timestamp', 'rhythm_taps', 'loudness_timestamp')
ORDER BY column_name;

-- Test query to verify decimal timestamps work
/*
Example of what should now work:
INSERT INTO streaming_vendor_attributes (
    track_name, 
    artist_name, 
    timestamp_ms, 
    event_type, 
    bar_start_timestamp,
    rhythm_taps,
    loudness_timestamp
) VALUES (
    'Test Track', 
    'Test Artist', 
    5653.125,  -- This should now work (was failing before)
    'rhythm_taps',
    1234.5,
    ARRAY[1000.1, 2000.2, 3000.3],
    5678.9
);
*/