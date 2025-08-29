-- Add instruction_narratives for PT guidance based on workout_track and song_component
-- This completes the pipeline: BPM → workout_track → narrative

INSERT INTO instruction_narratives (
    id,
    workout_track,
    song_component,
    text,
    timing_note,
    created_at,
    updated_at
) VALUES 
-- Sprint intervals narratives for high BPM (170+ BPM) - matches new workout_track
('sprint-high-intro', 'sprint_intervals_high', 'intro', 'Sprint intervals ahead! Get ready for high intensity bursts.', 'Intro section', NOW(), NOW()),
('sprint-high-verse', 'sprint_intervals_high', 'verse', 'Push the pace! This is your sprint zone - give it everything.', 'Verse section', NOW(), NOW()),
('sprint-high-pre-chorus', 'sprint_intervals_high', 'pre-chorus', 'Building to the peak! Maintain that sprint energy.', 'Pre-chorus section', NOW(), NOW()),
('sprint-high-chorus', 'sprint_intervals_high', 'chorus', 'Maximum effort! This is your all-out sprint moment.', 'Chorus section', NOW(), NOW()),
('sprint-high-bridge', 'sprint_intervals_high', 'bridge', 'Power through! Keep that sprint intensity strong.', 'Bridge section', NOW(), NOW()),
('sprint-high-breakdown', 'sprint_intervals_high', 'breakdown', 'Quick recovery, then back to sprint mode!', 'Breakdown section', NOW(), NOW()),
('sprint-high-outro', 'sprint_intervals_high', 'outro', 'Strong finish! Maintain form through the final sprint.', 'Outro section', NOW(), NOW()),

-- Jump training narratives for medium-high BPM (140-159 BPM)
('jumps-intro', 'jumps', 'intro', 'Jump training time! Light, explosive movements.', 'Intro section', NOW(), NOW()),
('jumps-verse', 'jumps', 'verse', 'Quick, powerful jumps. Stay light on your feet.', 'Verse section', NOW(), NOW()),
('jumps-pre-chorus', 'jumps', 'pre-chorus', 'Building energy! Get ready for bigger jumps.', 'Pre-chorus section', NOW(), NOW()),
('jumps-chorus', 'jumps', 'chorus', 'Big jumps now! Use that chorus energy.', 'Chorus section', NOW(), NOW()),
('jumps-bridge', 'jumps', 'bridge', 'Mix up your jump patterns - keep it dynamic.', 'Bridge section', NOW(), NOW()),
('jumps-breakdown', 'jumps', 'breakdown', 'Controlled movements. Focus on form.', 'Breakdown section', NOW(), NOW()),
('jumps-outro', 'jumps', 'outro', 'Finish strong with final jump sequence.', 'Outro section', NOW(), NOW()),

-- Hill climbs narratives for medium BPM (120-139 BPM) 
('hills-intro', 'hills', 'intro', 'Hill climb mode. Steady, controlled power.', 'Intro section', NOW(), NOW()),
('hills-verse', 'hills', 'verse', 'Steady climb. Feel that burn building in your legs.', 'Verse section', NOW(), NOW()),
('hills-pre-chorus', 'hills', 'pre-chorus', 'Climbing higher! Maintain that steady rhythm.', 'Pre-chorus section', NOW(), NOW()),
('hills-chorus', 'hills', 'chorus', 'Peak of the hill! Push through with control.', 'Chorus section', NOW(), NOW()),
('hills-bridge', 'hills', 'bridge', 'Sustained effort. You own this hill.', 'Bridge section', NOW(), NOW()),
('hills-breakdown', 'hills', 'breakdown', 'Controlled descent. Stay in control.', 'Breakdown section', NOW(), NOW()),
('hills-outro', 'hills', 'outro', 'Hill conquered! Finish with strength.', 'Outro section', NOW(), NOW()),

-- Recovery narratives for low BPM (80-119 BPM)
('recovery-intro', 'recovery', 'intro', 'Active recovery time. Easy, flowing movements.', 'Intro section', NOW(), NOW()),
('recovery-verse', 'recovery', 'verse', 'Gentle pace. Let your body recover and reset.', 'Verse section', NOW(), NOW()),
('recovery-pre-chorus', 'recovery', 'pre-chorus', 'Smooth transitions. Keep the movement flowing.', 'Pre-chorus section', NOW(), NOW()),
('recovery-chorus', 'recovery', 'chorus', 'Even in recovery, stay engaged and present.', 'Chorus section', NOW(), NOW()),
('recovery-bridge', 'recovery', 'bridge', 'Mindful movement. Connect with your body.', 'Bridge section', NOW(), NOW()),
('recovery-breakdown', 'recovery', 'breakdown', 'Ultra-smooth. This is your reset moment.', 'Breakdown section', NOW(), NOW()),
('recovery-outro', 'recovery', 'outro', 'Perfect recovery. You are refreshed and ready.', 'Outro section', NOW(), NOW())

ON CONFLICT (id) DO UPDATE SET
    text = EXCLUDED.text,
    updated_at = NOW();

-- Verify the data
SELECT workout_track, song_component, text 
FROM instruction_narratives 
WHERE workout_track IN ('sprint_intervals', 'jumps', 'hills', 'recovery')
ORDER BY workout_track, song_component;