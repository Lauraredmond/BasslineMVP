-- Create streaming_vendor_attributes table for manual audio timestamping
-- This table stores manually captured timestamps for section and bar changes

CREATE TABLE IF NOT EXISTS streaming_vendor_attributes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  track_name VARCHAR(255) NOT NULL,
  artist_name VARCHAR(255) NOT NULL,
  
  -- Timing information
  timestamp_ms BIGINT NOT NULL, -- Timestamp in milliseconds from start of track
  
  -- Event types
  event_type VARCHAR(50) NOT NULL, -- 'section_change', 'bar_change', 'beat', 'custom'
  
  -- Section information (for section_change events)
  section_type VARCHAR(50), -- 'intro', 'verse', 'chorus', 'bridge', 'outro', etc.
  section_number INTEGER, -- Which occurrence (verse 1, verse 2, etc.)
  
  -- Bar/Beat information (for bar_change events)
  bar_number INTEGER, -- Bar/measure number
  beat_number INTEGER, -- Beat within the bar (1-4 typically)
  estimated_tempo DECIMAL(6,2), -- BPM at this point
  
  -- Audio characteristics at this timestamp
  energy_level INTEGER CHECK (energy_level >= 0 AND energy_level <= 100),
  intensity_level INTEGER CHECK (intensity_level >= 0 AND intensity_level <= 100),
  
  -- Metadata
  data_source VARCHAR(50) DEFAULT 'manual_capture', -- How this data was captured
  capture_session_id UUID, -- Group related captures together
  notes TEXT, -- Optional notes about this timestamp
  
  -- User and timing
  captured_by VARCHAR(100), -- Who captured this data
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Track metadata
  track_duration_ms BIGINT, -- Total track duration
  spotify_track_id VARCHAR(100), -- If available
  
  -- Indexing
  UNIQUE(track_name, artist_name, timestamp_ms, event_type)
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_streaming_vendor_track ON streaming_vendor_attributes(track_name, artist_name);
CREATE INDEX IF NOT EXISTS idx_streaming_vendor_timestamp ON streaming_vendor_attributes(timestamp_ms);
CREATE INDEX IF NOT EXISTS idx_streaming_vendor_event_type ON streaming_vendor_attributes(event_type);
CREATE INDEX IF NOT EXISTS idx_streaming_vendor_session ON streaming_vendor_attributes(capture_session_id);

-- Insert sample data for "The Pretender" by Foo Fighters
-- (This would be replaced with actual captured data)
INSERT INTO streaming_vendor_attributes (
  track_name, artist_name, timestamp_ms, event_type, section_type, section_number,
  energy_level, intensity_level, notes, captured_by, capture_session_id
) VALUES 
-- Section changes for The Pretender (estimated - these would be captured manually)
('The Pretender', 'Foo Fighters', 0, 'section_change', 'intro', 1, 30, 40, 'Quiet guitar intro', 'manual_capture', gen_random_uuid()),
('The Pretender', 'Foo Fighters', 23000, 'section_change', 'verse', 1, 60, 65, 'First verse begins', 'manual_capture', gen_random_uuid()),
('The Pretender', 'Foo Fighters', 45000, 'section_change', 'chorus', 1, 90, 95, 'First chorus - high energy', 'manual_capture', gen_random_uuid()),
('The Pretender', 'Foo Fighters', 73000, 'section_change', 'verse', 2, 65, 70, 'Second verse', 'manual_capture', gen_random_uuid()),
('The Pretender', 'Foo Fighters', 95000, 'section_change', 'chorus', 2, 95, 100, 'Second chorus', 'manual_capture', gen_random_uuid()),
('The Pretender', 'Foo Fighters', 123000, 'section_change', 'bridge', 1, 80, 85, 'Bridge section', 'manual_capture', gen_random_uuid()),
('The Pretender', 'Foo Fighters', 145000, 'section_change', 'chorus', 3, 100, 100, 'Final chorus', 'manual_capture', gen_random_uuid()),
('The Pretender', 'Foo Fighters', 180000, 'section_change', 'outro', 1, 40, 30, 'Song ending', 'manual_capture', gen_random_uuid())
ON CONFLICT (track_name, artist_name, timestamp_ms, event_type) DO NOTHING;

COMMENT ON TABLE streaming_vendor_attributes IS 'Manual audio timestamping data for section and bar changes in tracks';