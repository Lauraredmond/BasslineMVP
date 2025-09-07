-- Row Level Security (RLS) Policies for Bassline MVP
-- Enable RLS and create read policies for public access to core data

-- Enable RLS on all tables
ALTER TABLE streaming_vendor_attributes ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_phases ENABLE ROW LEVEL SECURITY;  
ALTER TABLE instruction_narratives ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlist_phase_map ENABLE ROW LEVEL SECURITY;

-- streaming_vendor_attributes: Allow read access to track data and BPM info
CREATE POLICY "Allow public read access to track attributes" 
ON streaming_vendor_attributes FOR SELECT 
TO anon, authenticated
USING (true);

-- workout_phases: Allow read access to workout phase definitions
CREATE POLICY "Allow public read access to workout phases"
ON workout_phases FOR SELECT
TO anon, authenticated  
USING (true);

-- instruction_narratives: Allow read access to PT narratives
CREATE POLICY "Allow public read access to narratives"
ON instruction_narratives FOR SELECT
TO anon, authenticated
USING (true);

-- playlist_phase_map: Allow read access to locked phase mappings
-- Note: In production, you might want to restrict this by user/session
CREATE POLICY "Allow public read access to phase mappings"
ON playlist_phase_map FOR SELECT  
TO anon, authenticated
USING (true);

-- Grant table permissions to roles
GRANT SELECT ON streaming_vendor_attributes TO anon, authenticated;
GRANT SELECT ON workout_phases TO anon, authenticated;
GRANT SELECT ON instruction_narratives TO anon, authenticated; 
GRANT SELECT ON playlist_phase_map TO anon, authenticated;

-- Grant usage on sequences (for INSERT operations if needed later)
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- For write operations, you would add more specific policies like:
-- CREATE POLICY "Allow authenticated users to insert phase mappings"
-- ON playlist_phase_map FOR INSERT
-- TO authenticated 
-- WITH CHECK (true);

-- Comments for documentation
COMMENT ON TABLE streaming_vendor_attributes IS 'Track metadata including BPM data from Spotify and other vendors';
COMMENT ON TABLE workout_phases IS 'Workout phase definitions with BPM ranges for automatic track-to-phase mapping';
COMMENT ON TABLE instruction_narratives IS 'PT (Personal Trainer) narratives for specific workout phases and song sections';  
COMMENT ON TABLE playlist_phase_map IS 'Locked track-to-phase mappings created at playlist selection time';
COMMENT ON VIEW v_workout_phases IS 'Joined view showing workout phases with type names and narrative counts';