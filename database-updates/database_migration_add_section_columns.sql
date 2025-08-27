-- Database Migration: Add Section Columns to common_streaming_vendor_analysis_logs
-- Run this SQL directly in Supabase SQL Editor

-- Add section columns to the existing table
ALTER TABLE common_streaming_vendor_analysis_logs 
ADD COLUMN IF NOT EXISTS section_indicator TEXT,
ADD COLUMN IF NOT EXISTS section_index INTEGER,
ADD COLUMN IF NOT EXISTS section_type TEXT,
ADD COLUMN IF NOT EXISTS section_narrative TEXT;

-- Add comments explaining the new columns
COMMENT ON COLUMN common_streaming_vendor_analysis_logs.section_indicator 
IS 'Human-readable section identifier (e.g., "Section 0: intro (0s-30s)")';

COMMENT ON COLUMN common_streaming_vendor_analysis_logs.section_index 
IS 'Numeric section index (0, 1, 2, 3...) for sorting and analysis';

COMMENT ON COLUMN common_streaming_vendor_analysis_logs.section_type 
IS 'Section type (intro, verse, chorus, bridge, outro, unknown)';

COMMENT ON COLUMN common_streaming_vendor_analysis_logs.section_narrative 
IS 'Workout instruction/narrative for this section';

-- Create indexes for faster section-based queries
CREATE INDEX IF NOT EXISTS idx_vendor_analysis_section_indicator 
ON common_streaming_vendor_analysis_logs(section_indicator);

CREATE INDEX IF NOT EXISTS idx_vendor_analysis_section_index 
ON common_streaming_vendor_analysis_logs(section_index);

CREATE INDEX IF NOT EXISTS idx_vendor_analysis_section_type 
ON common_streaming_vendor_analysis_logs(section_type);

-- Create composite index for track + section queries
CREATE INDEX IF NOT EXISTS idx_vendor_analysis_track_section 
ON common_streaming_vendor_analysis_logs(track_name, section_index);

-- Update existing records to populate section info from current_section_* columns
-- This will convert your existing "The Pretender" data to have section info
UPDATE common_streaming_vendor_analysis_logs 
SET 
  section_index = CASE 
    WHEN current_section_start IS NOT NULL THEN 
      COALESCE(ROUND(current_section_start/30), 0)::INTEGER
    ELSE NULL
  END,
  section_type = CASE 
    WHEN current_section_start IS NOT NULL THEN 
      CASE 
        WHEN current_section_start < 15 THEN 'intro'
        WHEN current_section_start > (
          SELECT MAX(current_section_start + current_section_duration) * 0.85 
          FROM common_streaming_vendor_analysis_logs t2 
          WHERE t2.track_name = common_streaming_vendor_analysis_logs.track_name
        ) THEN 'outro'
        WHEN current_section_loudness > -5 THEN 'chorus'
        WHEN current_section_tempo < 100 THEN 'bridge'
        ELSE 'verse'
      END
    ELSE 'unknown'
  END,
  section_indicator = CASE 
    WHEN current_section_start IS NOT NULL THEN 
      'Section ' || COALESCE(ROUND(current_section_start/30), 0) || ': ' ||
      CASE 
        WHEN current_section_start < 15 THEN 'intro'
        WHEN current_section_start > (
          SELECT MAX(current_section_start + current_section_duration) * 0.85 
          FROM common_streaming_vendor_analysis_logs t2 
          WHERE t2.track_name = common_streaming_vendor_analysis_logs.track_name
        ) THEN 'outro'
        WHEN current_section_loudness > -5 THEN 'chorus'
        WHEN current_section_tempo < 100 THEN 'bridge'
        ELSE 'verse'
      END ||
      ' (' || COALESCE(current_section_start, 0) || 's-' || 
      COALESCE(current_section_start + current_section_duration, 30) || 's)'
    ELSE 'Legacy Entry (no section data)'
  END,
  section_narrative = CASE 
    WHEN current_section_start IS NOT NULL THEN 
      CASE 
        WHEN current_section_start < 15 THEN 'Warming up - let your body ease into the rhythm'
        WHEN current_section_loudness > -5 THEN 'Sprint time! High energy section - push your limits'
        WHEN current_section_tempo < 100 THEN 'Recovery section - controlled breathing and steady pace'
        ELSE 'Steady climb - find your sustainable power'
      END
    ELSE 'Continue your workout'
  END
WHERE (section_indicator IS NULL OR section_index IS NULL OR section_type IS NULL);

-- Verify the migration worked
SELECT 
  track_name,
  artist_name,
  section_indicator,
  section_type,
  section_index,
  current_section_tempo,
  current_section_loudness,
  created_at
FROM common_streaming_vendor_analysis_logs 
WHERE section_indicator IS NOT NULL
ORDER BY track_name, section_index
LIMIT 10;