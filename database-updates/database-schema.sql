-- Bassline MVP Database Schema
-- Recommended: Supabase (PostgreSQL) for TypeScript integration and real-time features

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User Management
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    spotify_id VARCHAR(255) UNIQUE,
    spotify_access_token TEXT,
    spotify_refresh_token TEXT,
    profile_image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Workout Types (migrated from hardcoded data)
CREATE TABLE workout_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL, -- 'spinning', 'pilates', 'hiit', 'circuits'
    workout_track VARCHAR(100) NOT NULL, -- 'Spinning', 'Pilates', 'HIIT', 'Circuits'
    description TEXT,
    default_duration INTEGER, -- in seconds
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Simplified Workout Phases - Maps workout tracks to BPM ranges
CREATE TABLE workout_phases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workout_track VARCHAR(100) NOT NULL UNIQUE, -- 'sprint_intervals', 'climb', 'resistance', etc.
    target_tempo_min INTEGER NOT NULL, -- Minimum BPM for this workout track
    target_tempo_max INTEGER NOT NULL, -- Maximum BPM for this workout track
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Simplified Instruction Narratives - Maps workout tracks + song components to narratives
CREATE TABLE instruction_narratives (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workout_track VARCHAR(100) NOT NULL, -- 'sprint_intervals', 'climb', 'resistance', etc.
    song_component VARCHAR(50) NOT NULL, -- 'intro', 'verse', 'verse_2', 'verse_3', 'pre_chorus', 'chorus', 'chorus_2', 'chorus_3', 'bridge', 'breakdown', 'end_of_bar', 'outro'
    text TEXT NOT NULL, -- The instruction narrative
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(workout_track, song_component) -- Each workout track has unique narratives per song component
);

-- Trainers (migrated from TrainerNetwork.tsx)
CREATE TABLE trainers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,
    bio TEXT,
    profile_image_url TEXT,
    rating DECIMAL(3,2) DEFAULT 0.0,
    testimonial_count INTEGER DEFAULT 0,
    years_experience INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trainer Specialties (many-to-many)
CREATE TABLE trainer_specialties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trainer_id UUID REFERENCES trainers(id) ON DELETE CASCADE,
    specialty VARCHAR(100) NOT NULL, -- 'Crossfit', 'HIIT', 'Strength', 'Powerlifting', 'Yoga', 'Pilates'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trainer Specialized Tags
CREATE TABLE trainer_specialized_tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trainer_id UUID REFERENCES trainers(id) ON DELETE CASCADE,
    tag VARCHAR(100) NOT NULL, -- 'Mental Health', 'Postpartum', 'Injury Recovery', 'Older Adults', 'Chronic Conditions', 'Obesity Support'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trainer Multidisciplinary Support
CREATE TABLE trainer_multidisciplinary_support (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trainer_id UUID REFERENCES trainers(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Workout Plans
CREATE TABLE user_workout_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    is_regular_plan BOOLEAN DEFAULT false,
    total_duration INTEGER, -- in seconds
    spotify_playlist_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Weekly Schedule
CREATE TABLE user_weekly_schedule (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    workout_plan_id UUID REFERENCES user_workout_plans(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL, -- 1=Monday, 7=Sunday
    workout_type_id UUID REFERENCES workout_types(id),
    intensity_level VARCHAR(20), -- 'low', 'medium', 'high'
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Spotify Tracks Cache
CREATE TABLE spotify_tracks (
    id VARCHAR(255) PRIMARY KEY, -- Spotify track ID
    name VARCHAR(500) NOT NULL,
    artist VARCHAR(500) NOT NULL,
    album VARCHAR(500),
    duration_ms INTEGER NOT NULL,
    preview_url TEXT,
    spotify_url TEXT NOT NULL,
    image_url TEXT,
    
    -- Audio Features
    tempo DECIMAL(6,3),
    energy DECIMAL(3,2),
    danceability DECIMAL(3,2),
    valence DECIMAL(3,2),
    acousticness DECIMAL(3,2),
    instrumentalness DECIMAL(3,2),
    loudness DECIMAL(6,3),
    speechiness DECIMAL(3,2),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Track Phase Mappings (generated workout plans)
CREATE TABLE track_phase_mappings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workout_plan_id UUID REFERENCES user_workout_plans(id) ON DELETE CASCADE,
    spotify_track_id VARCHAR(255) REFERENCES spotify_tracks(id),
    workout_phase_id UUID REFERENCES workout_phases(id),
    start_time INTEGER NOT NULL, -- seconds from workout start
    end_time INTEGER NOT NULL, -- seconds from workout start
    confidence_score DECIMAL(3,2), -- 0.00 to 1.00
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Community Posts (migrated from Community.tsx mock data)
CREATE TABLE community_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    workout_type VARCHAR(100),
    duration_minutes INTEGER,
    intensity_level VARCHAR(20),
    caption TEXT,
    playlist_name VARCHAR(255),
    likes_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Community Post Likes
CREATE TABLE community_post_likes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID REFERENCES community_posts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(post_id, user_id)
);

-- User Following/Friends
CREATE TABLE user_follows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    follower_id UUID REFERENCES users(id) ON DELETE CASCADE,
    following_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(follower_id, following_id),
    CHECK (follower_id != following_id)
);

-- Shared Playlists
CREATE TABLE shared_playlists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    spotify_playlist_id VARCHAR(255),
    is_public BOOLEAN DEFAULT false,
    track_count INTEGER DEFAULT 0,
    total_duration INTEGER, -- in seconds
    workout_type_id UUID REFERENCES workout_types(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_users_spotify_id ON users(spotify_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_workout_phases_track ON workout_phases(workout_track);
CREATE INDEX idx_instruction_narratives_track_component ON instruction_narratives(workout_track, song_component);
CREATE INDEX idx_trainers_active ON trainers(is_active);
CREATE INDEX idx_trainer_specialties_trainer ON trainer_specialties(trainer_id);
CREATE INDEX idx_user_workout_plans_user ON user_workout_plans(user_id);
CREATE INDEX idx_weekly_schedule_user_day ON user_weekly_schedule(user_id, day_of_week);
CREATE INDEX idx_spotify_tracks_tempo ON spotify_tracks(tempo);
CREATE INDEX idx_spotify_tracks_energy ON spotify_tracks(energy);
CREATE INDEX idx_track_mappings_plan ON track_phase_mappings(workout_plan_id);
CREATE INDEX idx_community_posts_user ON community_posts(user_id);
CREATE INDEX idx_community_posts_created ON community_posts(created_at DESC);
CREATE INDEX idx_user_follows_follower ON user_follows(follower_id);
CREATE INDEX idx_user_follows_following ON user_follows(following_id);
CREATE INDEX idx_shared_playlists_user ON shared_playlists(user_id);
CREATE INDEX idx_shared_playlists_public ON shared_playlists(is_public);

-- Insert seed data for workout types
INSERT INTO workout_types (name, workout_track, description, default_duration) VALUES
('spinning', 'Spinning', 'High-energy indoor cycling workout with music synchronization', 2700),
('pilates', 'Pilates', 'Low-impact strength and flexibility training', 3600),
('circuits', 'Circuits', 'High-intensity circuit training with varied exercises', 1800),
('hiit', 'HIIT', 'High-Intensity Interval Training for maximum calorie burn', 1200);

-- Insert simplified workout phases (workout_track -> BPM ranges)
INSERT INTO workout_phases (workout_track, target_tempo_min, target_tempo_max) VALUES
('sprint_intervals', 120, 140),
('climb', 80, 100),
('resistance', 85, 110),
('jumps', 110, 130),
('recovery', 70, 90),
('hills', 95, 115),
('cooldown', 60, 85),
('warmup', 70, 95);

-- Insert simplified instruction narratives (workout_track + song_component -> narrative)
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