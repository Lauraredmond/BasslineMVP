-- Add columns for advanced audio analysis capture
-- Run this in Supabase SQL Editor

-- Add new columns to streaming_vendor_attributes table
ALTER TABLE streaming_vendor_attributes 
ADD COLUMN IF NOT EXISTS captured_bpm DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS beat_timestamps JSONB,
ADD COLUMN IF NOT EXISTS onset_timestamps JSONB,
ADD COLUMN IF NOT EXISTS downbeat_timestamps JSONB,
ADD COLUMN IF NOT EXISTS confidence_score DECIMAL(3,2),
ADD COLUMN IF NOT EXISTS analysis_session_id UUID,
ADD COLUMN IF NOT EXISTS recording_duration DECIMAL(6,2),
ADD COLUMN IF NOT EXISTS captured_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
ADD COLUMN IF NOT EXISTS analysis_method VARCHAR(50) DEFAULT 'librosa',
ADD COLUMN IF NOT EXISTS tempo_history JSONB;

-- Add comments for documentation
COMMENT ON COLUMN streaming_vendor_attributes.captured_bpm IS 'BPM detected via real-time audio analysis';
COMMENT ON COLUMN streaming_vendor_attributes.beat_timestamps IS 'Array of beat positions in seconds';
COMMENT ON COLUMN streaming_vendor_attributes.onset_timestamps IS 'Array of onset positions in seconds';
COMMENT ON COLUMN streaming_vendor_attributes.downbeat_timestamps IS 'Array of downbeat positions in seconds';
COMMENT ON COLUMN streaming_vendor_attributes.confidence_score IS 'Analysis confidence (0.0-1.0)';
COMMENT ON COLUMN streaming_vendor_attributes.analysis_session_id IS 'Unique session identifier for capture';
COMMENT ON COLUMN streaming_vendor_attributes.recording_duration IS 'Total recording duration in seconds';
COMMENT ON COLUMN streaming_vendor_attributes.captured_at IS 'Timestamp when analysis was captured';
COMMENT ON COLUMN streaming_vendor_attributes.analysis_method IS 'Library used (librosa, beatnet, madmom)';
COMMENT ON COLUMN streaming_vendor_attributes.tempo_history IS 'Timeline of tempo changes during capture';

-- Create index for session queries
CREATE INDEX IF NOT EXISTS idx_sva_analysis_session 
ON streaming_vendor_attributes(analysis_session_id) 
WHERE analysis_session_id IS NOT NULL;

-- Create index for captured data queries
CREATE INDEX IF NOT EXISTS idx_sva_captured_analysis 
ON streaming_vendor_attributes(captured_at) 
WHERE captured_bpm IS NOT NULL;

-- Verify the changes
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'streaming_vendor_attributes' 
AND column_name IN (
    'captured_bpm', 'beat_timestamps', 'onset_timestamps', 
    'confidence_score', 'analysis_session_id', 'captured_at'
)
ORDER BY column_name;