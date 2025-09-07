-- Seed data for Bassline MVP
-- Insert workout phases and test data including "Slide Away" BPM=100 example

-- Insert workout phases with proper BPM ranges per primer.md spec
INSERT INTO workout_phases (workout_track, target_tempo_min, target_tempo_max, description) VALUES
('warmup', 50, 70, 'Gentle warm-up to prepare the body for exercise'),
('resistance', 55, 85, 'Heavy resistance work with controlled cadence'),  
('climb', 90, 120, 'Sustained climbing efforts with moderate to heavy resistance'),
('jumps', 140, 170, 'High-energy position changes and explosive movements'),
('sprint_intervals', 160, 180, 'Maximum speed intervals with light resistance'),
('hills', 100, 140, 'Rolling hill climbs with varying resistance'),
('recovery', 60, 90, 'Active recovery between intense efforts'),
('cooldown', 50, 70, 'Gentle cool-down to bring heart rate down')
ON CONFLICT (workout_track) DO UPDATE SET
  target_tempo_min = EXCLUDED.target_tempo_min,
  target_tempo_max = EXCLUDED.target_tempo_max,
  description = EXCLUDED.description,
  updated_at = NOW();

-- Insert sample narratives for testing
INSERT INTO instruction_narratives (workout_track, section_type, narrative_text) VALUES
-- Warmup narratives  
('warmup', 'intro', 'Welcome to your workout! Let''s start with an easy warm-up spin.'),
('warmup', 'verse', 'Easy spinning here, just getting the legs moving and the blood flowing.'),
('warmup', 'chorus', 'Feel the music but keep it controlled. This is just your warm-up.'),

-- Climb narratives (for BPM 90-120 range, includes "Slide Away" at 100 BPM)
('climb', 'intro', 'Time for a climb! Add some resistance and settle into your climbing rhythm.'),
('climb', 'verse', 'Steady climbing here. Feel that resistance in your legs, drive through your heels.'),
('climb', 'chorus', 'This is your mountain! Push through this climb with power and control.'),
('climb', 'bridge', 'Halfway up the mountain. Stay strong, you''ve got this!'),

-- Sprint narratives
('sprint_intervals', 'intro', 'Sprint track! Medium pace to start with.'),
('sprint_intervals', 'verse', 'Get ready to fly! Light resistance, quick legs coming up.'),
('sprint_intervals', 'chorus', 'GO! Sprint with the music! Quick, quick, quick!'),
('sprint_intervals', 'bridge', 'Keep those legs flying! You''re in the zone now.'),

-- Resistance narratives  
('resistance', 'intro', 'Heavy resistance work coming up. Get ready to feel the burn.'),
('resistance', 'verse', 'Slow and controlled. Feel every pedal stroke with this resistance.'),
('resistance', 'chorus', 'This is your power section. Drive through those legs!'),

-- Recovery narratives
('recovery', 'verse', 'Active recovery here. Keep the legs spinning but take it easy.'),
('recovery', 'chorus', 'Catch your breath but keep moving. You''re doing great.')

ON CONFLICT (workout_track, section_type) DO UPDATE SET
  narrative_text = EXCLUDED.narrative_text,
  updated_at = NOW();

-- Insert test track data including "Slide Away" with BPM=100 
INSERT INTO streaming_vendor_attributes (track_id, track_name, artist_name, spotify_tempo, section_type) VALUES
-- Slide Away - full track BPM (should map to 'climb' phase per primer.md spec)
('slide_away_test_id', 'Slide Away', 'Test Artist', 100, NULL),

-- Slide Away - section data  
('slide_away_test_id', 'Slide Away', 'Test Artist', NULL, 'intro'),
('slide_away_test_id', 'Slide Away', 'Test Artist', NULL, 'verse'), 
('slide_away_test_id', 'Slide Away', 'Test Artist', NULL, 'chorus'),
('slide_away_test_id', 'Slide Away', 'Test Artist', NULL, 'bridge'),

-- Additional test tracks for validation
('high_energy_test', 'High Energy Track', 'Test Artist', 165, NULL), -- Should map to sprint_intervals
('low_energy_test', 'Low Energy Track', 'Test Artist', 65, NULL),     -- Should map to warmup  
('resistance_test', 'Heavy Track', 'Test Artist', 75, NULL)           -- Should map to resistance

ON CONFLICT (track_id, track_name, COALESCE(section_type, 'full_track')) DO UPDATE SET
  spotify_tempo = EXCLUDED.spotify_tempo,
  updated_at = NOW();