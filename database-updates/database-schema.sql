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
    display_name VARCHAR(100) NOT NULL, -- 'Spinning', 'Pilates', 'HIIT', 'Circuits'
    description TEXT,
    default_duration INTEGER, -- in seconds
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Workout Phases (migrated from musicAnalysis.ts)
CREATE TABLE workout_phases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workout_type_id UUID REFERENCES workout_types(id),
    phase_type VARCHAR(50) NOT NULL, -- Generic phase identifier
    display_name VARCHAR(100) NOT NULL, -- Workout-specific phase name
    target_tempo_min INTEGER,
    target_tempo_max INTEGER,
    energy_level_min DECIMAL(3,2), -- 0.00 to 1.00
    energy_level_max DECIMAL(3,2),
    energy_level VARCHAR(20), -- 'low', 'medium', 'high'
    typical_duration INTEGER, -- in seconds
    sort_order INTEGER DEFAULT 0, -- Order within workout type
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(workout_type_id, phase_type) -- Each workout type has unique phase types
);

-- Class Instruction Narratives (migrated from musicAnalysis.ts SPINNING_NARRATIVES)
CREATE TABLE instruction_narratives (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workout_phase_id UUID REFERENCES workout_phases(id),
    narrative_type VARCHAR(50) NOT NULL, -- 'general', 'beat_cue'
    text TEXT NOT NULL,
    timing VARCHAR(50), -- 'bar_start', 'chorus', 'verse', 'pre_chorus', 'build_up', 'drop'
    interval_beats INTEGER, -- for recurring cues (e.g., every 4 bars)
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
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
CREATE INDEX idx_workout_phases_type ON workout_phases(workout_type_id, phase_type);
CREATE INDEX idx_instruction_narratives_phase ON instruction_narratives(workout_phase_id);
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
INSERT INTO workout_types (name, display_name, description, default_duration) VALUES
('spinning', 'Spinning', 'High-energy indoor cycling workout with music synchronization', 2700),
('pilates', 'Pilates', 'Low-impact strength and flexibility training', 3600),
('circuits', 'Circuits', 'High-intensity circuit training with varied exercises', 1800),
('hiit', 'HIIT', 'High-Intensity Interval Training for maximum calorie burn', 1200);

-- Insert seed data for workout phases - each workout type has different phases
WITH workout_type_ids AS (
    SELECT name, id FROM workout_types
)
INSERT INTO workout_phases (workout_type_id, phase_type, display_name, target_tempo_min, target_tempo_max, energy_level_min, energy_level_max, energy_level, typical_duration, sort_order)
SELECT 
    wt.id,
    phase_data.phase_type,
    phase_data.display_name,
    phase_data.tempo_min,
    phase_data.tempo_max,
    phase_data.energy_min,
    phase_data.energy_max,
    phase_data.energy_level,
    phase_data.duration,
    phase_data.sort_order
FROM workout_type_ids wt
CROSS JOIN (
    -- SPINNING PHASES
    SELECT 'spinning' as workout_type, 'warmup' as phase_type, 'Warm Up' as display_name, 70 as tempo_min, 100 as tempo_max, 0.30 as energy_min, 0.60 as energy_max, 'low' as energy_level, 324 as duration, 1 as sort_order
    UNION ALL
    SELECT 'spinning', 'sprint', 'Sprint Intervals', 120, 160, 0.70, 1.00, 'high', 405, 2
    UNION ALL
    SELECT 'spinning', 'hills', 'Rolling Hills', 80, 110, 0.50, 0.80, 'medium', 486, 3
    UNION ALL
    SELECT 'spinning', 'resistance', 'Resistance Power', 60, 90, 0.40, 0.70, 'medium', 432, 4
    UNION ALL
    SELECT 'spinning', 'climb', 'Endurance Climb', 90, 120, 0.60, 0.85, 'medium', 378, 5
    UNION ALL
    SELECT 'spinning', 'jumps', 'Sprint Jumps', 125, 150, 0.80, 1.00, 'high', 324, 6
    UNION ALL
    SELECT 'spinning', 'cooldown', 'Cool Down', 60, 85, 0.10, 0.50, 'low', 135, 7
    
    -- HIIT PHASES
    UNION ALL
    SELECT 'hiit', 'warmup', 'Dynamic Warm-Up', 100, 130, 0.40, 0.65, 'medium', 180, 1
    UNION ALL
    SELECT 'hiit', 'work_interval', 'High-Intensity Work', 140, 180, 0.80, 1.00, 'high', 240, 2
    UNION ALL
    SELECT 'hiit', 'active_recovery', 'Active Recovery', 80, 110, 0.30, 0.50, 'low', 180, 3
    UNION ALL
    SELECT 'hiit', 'tabata', 'Tabata Protocol', 150, 200, 0.85, 1.00, 'high', 240, 4
    UNION ALL
    SELECT 'hiit', 'strength_circuit', 'Strength Circuit', 90, 120, 0.60, 0.80, 'medium', 300, 5
    UNION ALL
    SELECT 'hiit', 'cooldown', 'Recovery Cool-Down', 60, 90, 0.20, 0.45, 'low', 180, 6
    
    -- PILATES PHASES
    UNION ALL
    SELECT 'pilates', 'centering', 'Centering & Breathing', 50, 80, 0.20, 0.40, 'low', 300, 1
    UNION ALL
    SELECT 'pilates', 'warmup', 'Gentle Warm-Up', 60, 90, 0.30, 0.50, 'low', 600, 2
    UNION ALL
    SELECT 'pilates', 'core_foundation', 'Core Foundation', 70, 100, 0.40, 0.60, 'medium', 900, 3
    UNION ALL
    SELECT 'pilates', 'flowing_movement', 'Flowing Movement', 80, 110, 0.50, 0.70, 'medium', 1200, 4
    UNION ALL
    SELECT 'pilates', 'strength_challenge', 'Strength Challenge', 90, 120, 0.60, 0.80, 'medium', 900, 5
    UNION ALL
    SELECT 'pilates', 'flexibility', 'Flexibility & Stretch', 50, 80, 0.20, 0.40, 'low', 600, 6
    
    -- CIRCUITS PHASES
    UNION ALL
    SELECT 'circuits', 'warmup', 'Movement Prep', 90, 120, 0.40, 0.60, 'medium', 300, 1
    UNION ALL
    SELECT 'circuits', 'upper_circuit', 'Upper Body Circuit', 110, 140, 0.60, 0.80, 'medium', 480, 2
    UNION ALL
    SELECT 'circuits', 'cardio_blast', 'Cardio Blast', 130, 160, 0.75, 0.95, 'high', 360, 3
    UNION ALL
    SELECT 'circuits', 'lower_circuit', 'Lower Body Circuit', 100, 130, 0.60, 0.80, 'medium', 480, 4
    UNION ALL
    SELECT 'circuits', 'full_body', 'Full Body Fusion', 120, 150, 0.70, 0.90, 'high', 480, 5
    UNION ALL
    SELECT 'circuits', 'core_finisher', 'Core Finisher', 80, 110, 0.50, 0.70, 'medium', 300, 6
    UNION ALL
    SELECT 'circuits', 'cooldown', 'Recovery Stretch', 60, 80, 0.20, 0.45, 'low', 240, 7
) AS phase_data
WHERE wt.name = phase_data.workout_type;