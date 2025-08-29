-- Simplify workout_phases and instruction_narratives tables
-- Run this in your Supabase SQL Editor

-- ============================================================================
-- STEP 1: Clear existing data and simplify workout_phases table
-- ============================================================================

-- Clear existing data
DELETE FROM instruction_narratives;
DELETE FROM workout_phases;

-- Remove foreign key dependency temporarily to simplify structure
ALTER TABLE instruction_narratives DROP CONSTRAINT IF EXISTS instruction_narratives_workout_phase_id_fkey;

-- Drop redundant columns from workout_phases
ALTER TABLE workout_phases 
DROP COLUMN IF EXISTS workout_type_id,
DROP COLUMN IF EXISTS phase_type,
DROP COLUMN IF EXISTS energy_level_min,
DROP COLUMN IF EXISTS energy_level_max,
DROP COLUMN IF EXISTS energy_level,
DROP COLUMN IF EXISTS typical_duration,
DROP COLUMN IF EXISTS sort_order;

-- Drop the unique constraint that referenced dropped columns
ALTER TABLE workout_phases DROP CONSTRAINT IF EXISTS workout_phases_workout_type_id_phase_type_key;

-- ============================================================================
-- STEP 2: Simplify instruction_narratives table
-- ============================================================================

-- Drop redundant columns from instruction_narratives
ALTER TABLE instruction_narratives
DROP COLUMN IF EXISTS workout_phase_id,
DROP COLUMN IF EXISTS narrative_type,
DROP COLUMN IF EXISTS interval_beats,
DROP COLUMN IF EXISTS sort_order;

-- Rename timing column to song_component for clarity
ALTER TABLE instruction_narratives 
RENAME COLUMN timing TO song_component;

-- Add workout_track column to instruction_narratives
ALTER TABLE instruction_narratives 
ADD COLUMN IF NOT EXISTS workout_track VARCHAR(100) NOT NULL DEFAULT 'sprint_intervals';

-- ============================================================================
-- STEP 3: Insert simplified workout_phases data (workout_track -> BPM ranges)
-- ============================================================================

INSERT INTO workout_phases (workout_track, target_tempo_min, target_tempo_max) VALUES
('sprint_intervals', 120, 140),
('climb', 80, 100),
('resistance', 85, 110),
('jumps', 110, 130),
('recovery', 70, 90),
('hills', 95, 115),
('cooldown', 60, 85),
('warmup', 70, 95);

-- ============================================================================
-- STEP 4: Insert simplified instruction_narratives data 
-- (workout_track + song_component -> narrative)
-- ============================================================================

INSERT INTO instruction_narratives (workout_track, song_component, text) VALUES

-- SPRINT INTERVALS narratives
('sprint_intervals', 'intro', 'Get ready to sprint! Find your baseline pace - we''re about to fly.'),
('sprint_intervals', 'verse', 'Sprint time! Quick legs, strong core - let the beat drive you forward!'),
('sprint_intervals', 'pre_chorus', 'Building to the big moment - increase your pace, feel the energy rising!'),
('sprint_intervals', 'chorus', 'This is it! Maximum effort - sprint like you mean it! Quick legs!'),
('sprint_intervals', 'bridge', 'Sustained power - hold that high intensity, you''ve got this!'),
('sprint_intervals', 'outro', 'Final sprint home - give everything you''ve got left!'),

-- CLIMB narratives
('climb', 'intro', 'Time to climb! Add resistance and find your climbing rhythm.'),
('climb', 'verse', 'Steady climb - strong legs, controlled breathing. Power through each stroke.'),
('climb', 'pre_chorus', 'The hill gets steeper - add more resistance, stay seated and strong.'),
('climb', 'chorus', 'Peak of the climb! Maximum resistance - you''re crushing this mountain!'),
('climb', 'bridge', 'Long sustained climb - stay focused, breathe deep, power through.'),
('climb', 'outro', 'Final push to the summit - you''ve almost conquered this climb!'),

-- RESISTANCE narratives  
('resistance', 'intro', 'Heavy resistance ahead - settle in and prepare for the grind.'),
('resistance', 'verse', 'Feel that resistance - strong, controlled strokes. Let the bass drive your legs.'),
('resistance', 'pre_chorus', 'Building intensity with resistance - stay strong, stay focused.'),
('resistance', 'chorus', 'Maximum resistance! This is where champions are made - push through!'),
('resistance', 'bridge', 'Sustained heavy resistance - mental toughness time. You''ve got this!'),
('resistance', 'outro', 'Power through to the finish - show that resistance who''s boss!'),

-- JUMPS narratives
('jumps', 'intro', 'Get ready to jump! Up for 8, down for 8 - find your rhythm.'),
('jumps', 'verse', 'Jump time! Up for 8 beats, down for 8 - ride the musical phrases!'),
('jumps', 'pre_chorus', 'Quick transitions coming - stay light on the saddle, ready to move!'),
('jumps', 'chorus', 'Big jumps! Up and down with the music - let the rhythm guide you!'),
('jumps', 'bridge', 'Controlled jumps - up for strength, down for speed. Feel the music!'),
('jumps', 'outro', 'Final jumping sequence - finish strong with those controlled movements!'),

-- RECOVERY narratives
('recovery', 'intro', 'Recovery time - catch your breath while keeping those legs moving.'),
('recovery', 'verse', 'Active recovery - steady pace, deep breaths. Let your heart rate settle.'),
('recovery', 'pre_chorus', 'Gentle preparation - stay loose and ready for what''s coming next.'),
('recovery', 'chorus', 'Controlled recovery - use this time wisely to prepare for the next push.'),
('recovery', 'bridge', 'Sustained recovery - breathe deep, stay present, you''re doing great.'),
('recovery', 'outro', 'Final recovery - well done! Let your body settle into relaxation.'),

-- HILLS narratives
('hills', 'intro', 'Rolling hills ahead - prepare for ups and downs with the terrain.'),
('hills', 'verse', 'Hill work - standing climbs, seated power. Mix it up with the music!'),
('hills', 'pre_chorus', 'Approaching the big hill - get ready to stand and power through.'),
('hills', 'chorus', 'Peak hill power! Standing strong, driving through with everything you have!'),
('hills', 'bridge', 'Sustained hill effort - stay strong, you''re almost over the crest.'),
('hills', 'outro', 'Final hill - power over the top and cruise down the other side!'),

-- COOLDOWN narratives  
('cooldown', 'intro', 'Time to cool down - let your heart rate gently come down.'),
('cooldown', 'verse', 'Gentle cooldown - easy pace, deep breathing. Well done today.'),
('cooldown', 'pre_chorus', 'Slowing down gradually - feel proud of what you accomplished.'),
('cooldown', 'chorus', 'Perfect cooldown pace - let the music carry you to a peaceful finish.'),
('cooldown', 'bridge', 'Almost done - enjoy these final moments of movement and music.'),
('cooldown', 'outro', 'Beautiful finish - take a moment to appreciate what you just achieved.'),

-- WARMUP narratives
('warmup', 'intro', 'Gentle warmup - let your body ease into the workout rhythm.'),
('warmup', 'verse', 'Building warmth - feel your muscles waking up to the music.'),
('warmup', 'pre_chorus', 'Gradually increasing - your body is getting ready for more intensity.'),
('warmup', 'chorus', 'Perfect warmup pace - you''re feeling good and ready to work harder.'),
('warmup', 'bridge', 'Final warmup phase - your body is primed and ready for action.'),
('warmup', 'outro', 'Warmup complete - you''re ready to tackle the main workout!');

-- ============================================================================
-- STEP 5: Create indexes for the new simplified structure
-- ============================================================================

-- Drop old indexes
DROP INDEX IF EXISTS idx_workout_phases_type;
DROP INDEX IF EXISTS idx_instruction_narratives_phase;

-- Create new indexes for the simplified structure
CREATE INDEX IF NOT EXISTS idx_workout_phases_track ON workout_phases(workout_track);
CREATE INDEX IF NOT EXISTS idx_instruction_narratives_track_component ON instruction_narratives(workout_track, song_component);

-- ============================================================================
-- VERIFICATION: Check the simplified tables
-- ============================================================================

-- Show simplified workout_phases structure
SELECT 'workout_phases' as table_name, workout_track, target_tempo_min, target_tempo_max 
FROM workout_phases 
ORDER BY workout_track;

-- Show simplified instruction_narratives structure  
SELECT 'instruction_narratives' as table_name, workout_track, song_component, 
       LEFT(text, 50) || '...' as narrative_preview
FROM instruction_narratives 
ORDER BY workout_track, song_component;

-- Show row counts
SELECT 
    'workout_phases' as table_name, 
    COUNT(*) as row_count 
FROM workout_phases
UNION ALL
SELECT 
    'instruction_narratives' as table_name, 
    COUNT(*) as row_count 
FROM instruction_narratives;