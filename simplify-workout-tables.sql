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
('warmup', 'outro', 'Warmup complete - you''re ready to tackle the main workout!'),

-- Additional song components for all workout tracks
-- BREAKDOWN components
('sprint_intervals', 'breakdown', 'Breakdown time! Let loose and sprint with the music breakdown!'),
('climb', 'breakdown', 'Breakdown climb - power through this intense musical moment!'),
('resistance', 'breakdown', 'Heavy resistance breakdown - this is your moment to dominate!'),
('jumps', 'breakdown', 'Crazy jumps during breakdown - let the music move you!'),
('recovery', 'breakdown', 'Easy breakdown - stay controlled during this musical intensity.'),
('hills', 'breakdown', 'Hill breakdown - standing power through this epic moment!'),
('cooldown', 'breakdown', 'Gentle breakdown - let the music wash over you as you cool down.'),
('warmup', 'breakdown', 'Warmup breakdown - feel the music building your energy!'),

-- END OF BAR components
('sprint_intervals', 'end_of_bar', 'End of bar sprint - finish strong into the next phrase!'),
('climb', 'end_of_bar', 'Bar ending climb - power through to the next musical phrase!'),
('resistance', 'end_of_bar', 'Resistance bar ending - strong finish into the next section!'),
('jumps', 'end_of_bar', 'Jump at bar end - transition smoothly to the next phrase!'),
('recovery', 'end_of_bar', 'Bar end recovery - smooth transition, stay relaxed.'),
('hills', 'end_of_bar', 'Hill bar ending - crest the phrase and prepare for the next!'),
('cooldown', 'end_of_bar', 'Bar end cooldown - gentle transition to the next phrase.'),
('warmup', 'end_of_bar', 'Bar end warmup - building smoothly to the next section!'),

-- VERSE 2 components
('sprint_intervals', 'verse_2', 'Second verse sprint! You''ve found your rhythm - now push harder!'),
('climb', 'verse_2', 'Second climb verse - you know the drill, add more resistance!'),
('resistance', 'verse_2', 'Verse 2 resistance - double down on that heavy resistance work!'),
('jumps', 'verse_2', 'Second verse jumps - you''ve got the pattern, now perfect it!'),
('recovery', 'verse_2', 'Second recovery verse - maintain that steady, controlled pace.'),
('hills', 'verse_2', 'Hills verse 2 - another hill to conquer, you''ve got this!'),
('cooldown', 'verse_2', 'Second cooldown verse - deeper into relaxation and recovery.'),
('warmup', 'verse_2', 'Warmup verse 2 - your body is warming up nicely, keep building!'),

-- VERSE 3 components
('sprint_intervals', 'verse_3', 'Final verse sprint - this is where legends are made!'),
('climb', 'verse_3', 'Third climb verse - summit time! Maximum resistance and power!'),
('resistance', 'verse_3', 'Final resistance verse - show this workout who''s the boss!'),
('jumps', 'verse_3', 'Third verse jumps - perfect execution, you''ve mastered this!'),
('recovery', 'verse_3', 'Final recovery verse - well-earned rest, you''ve worked hard.'),
('hills', 'verse_3', 'Hills verse 3 - final hill conquest, power over the top!'),
('cooldown', 'verse_3', 'Final cooldown verse - complete relaxation, beautiful work today.'),
('warmup', 'verse_3', 'Final warmup verse - fully warmed up and ready for action!'),

-- CHORUS 2 components  
('sprint_intervals', 'chorus_2', 'Second chorus sprint! Even faster now - you''re unstoppable!'),
('climb', 'chorus_2', 'Chorus 2 climb - peak power! This is your mountain-crushing moment!'),
('resistance', 'chorus_2', 'Second chorus resistance - maximum power through the music peak!'),
('jumps', 'chorus_2', 'Chorus 2 jumps - explosive movement with the musical climax!'),
('recovery', 'chorus_2', 'Second chorus recovery - controlled intensity, smart pacing.'),
('hills', 'chorus_2', 'Hills chorus 2 - standing power! Drive through this musical peak!'),
('cooldown', 'chorus_2', 'Chorus 2 cooldown - let the music''s energy gently carry you down.'),
('warmup', 'chorus_2', 'Warmup chorus 2 - feeling the energy build, ready for more!'),

-- CHORUS 3 components
('sprint_intervals', 'chorus_3', 'Final chorus sprint - everything you''ve got! Sprint to glory!'),
('climb', 'chorus_3', 'Ultimate chorus climb - this is your Everest moment! Conquer it!'),
('resistance', 'chorus_3', 'Final chorus resistance - legendary effort! Power through!'),
('jumps', 'chorus_3', 'Final chorus jumps - perfect execution meets musical perfection!'),
('recovery', 'chorus_3', 'Final chorus recovery - well-deserved gentle pace after hard work.'),
('hills', 'chorus_3', 'Final hills chorus - summit conquered! You are unstoppable!'),
('cooldown', 'chorus_3', 'Final chorus cooldown - perfect peaceful finish to an amazing workout.'),
('warmup', 'chorus_3', 'Final warmup chorus - completely ready! Let''s crush this workout!');

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