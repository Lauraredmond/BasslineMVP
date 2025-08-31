-- Add training philosophy and testimonials to trainers table
-- Migration: Add new optional fields for trainer profiles

-- Check if trainers table exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'trainers') THEN
    -- Create trainers table if it doesn't exist
    CREATE TABLE trainers (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      name VARCHAR(255) NOT NULL,
      bio TEXT,
      specialties TEXT[], -- Array of specialty strings
      specialized_tags TEXT[], -- Array of specialized tag strings  
      rating DECIMAL(2,1) DEFAULT 0,
      testimonial_count INTEGER DEFAULT 0,
      image_url TEXT,
      multidisciplinary_support TEXT[], -- Array of support descriptions
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    -- Insert sample data to match existing hardcoded trainers
    INSERT INTO trainers (name, bio, specialties, specialized_tags, rating, testimonial_count, image_url, multidisciplinary_support) VALUES
    ('Jane Doe', 'Certified trainer with 8+ years experience in high-intensity workouts', 
     ARRAY['Crossfit', 'HIIT'], ARRAY['Mental Health', 'Postpartum'], 5.0, 24,
     'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=400',
     ARRAY['Collaborates with GPs to support clients managing anxiety and fitness post-pregnancy', 'Designs high-intensity programs that build confidence for clients overcoming mental health challenges']),
    
    ('Mike Chen', 'Former competitive athlete specializing in strength building',
     ARRAY['Strength', 'Powerlifting'], ARRAY['Injury Recovery', 'Older Adults', 'Chronic Conditions'], 4.9, 18,
     'https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=400', 
     ARRAY['Designs progressive lifting programs for older adults recovering from joint surgery', 'Works with physiotherapists to create safe strength training for clients with arthritis and diabetes']),
     
    ('Sarah Williams', 'Mindful movement specialist with holistic wellness approach',
     ARRAY['Yoga', 'Pilates'], ARRAY['Mental Health', 'Chronic Conditions', 'Obesity Support'], 5.0, 31,
     'https://images.unsplash.com/photo-1500375592092-40eb2168fd21?w=400',
     ARRAY['Integrates mindfulness practices with movement therapy for clients managing chronic pain and stress', 'Collaborates with nutritionists and mental health professionals for holistic weight management support']);
  END IF;
END $$;

-- Add new columns for training philosophy and testimonials
ALTER TABLE trainers 
ADD COLUMN IF NOT EXISTS training_philosophy TEXT,
ADD COLUMN IF NOT EXISTS testimonials JSONB DEFAULT '[]'::jsonb;

-- Add sample data for the new fields
UPDATE trainers SET 
  training_philosophy = 'Movement is medicine. I believe in meeting each client where they are and building strength from the inside out. Every workout should empower you physically and mentally.',
  testimonials = '[
    {"quote": "Jane helped me rebuild my confidence after postpartum depression. Her understanding of mental health made all the difference.", "author": "Sarah M.", "rating": 5, "date": "2024-12-15"},
    {"quote": "The HIIT programs are challenging but achievable. Jane knows exactly how to push you without overwhelming you.", "author": "Mike R.", "rating": 5, "date": "2024-11-20"}
  ]'::jsonb
WHERE name = 'Jane Doe';

UPDATE trainers SET
  training_philosophy = 'Strength training is for everyone, regardless of age or starting point. I focus on progressive overload and functional movements that translate to real-life activities.',
  testimonials = '[
    {"quote": "Mike got me back to lifting after my knee surgery. His patience and expertise gave me my strength back.", "author": "Robert K.", "rating": 5, "date": "2024-12-10"},
    {"quote": "At 65, I never thought I could deadlift again. Mike proved me wrong and kept me safe every step of the way.", "author": "Janet L.", "rating": 5, "date": "2024-10-25"}
  ]'::jsonb
WHERE name = 'Mike Chen';

UPDATE trainers SET
  training_philosophy = 'True wellness comes from the connection between mind, body, and breath. I guide clients to find balance through mindful movement and self-compassion.',
  testimonials = '[
    {"quote": "Sarah taught me that fitness isn\'t about punishment - it\'s about self-care. Life-changing approach.", "author": "Emma T.", "rating": 5, "date": "2024-12-01"},
    {"quote": "The yoga sessions helped me manage chronic pain better than any medication. Sarah is incredibly knowledgeable.", "author": "David H.", "rating": 5, "date": "2024-11-15"},
    {"quote": "Lost 40 pounds and gained so much peace of mind. Sarah\'s holistic approach works.", "author": "Maria G.", "rating": 5, "date": "2024-09-30"}
  ]'::jsonb
WHERE name = 'Sarah Williams';

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_trainers_rating ON trainers(rating);
CREATE INDEX IF NOT EXISTS idx_trainers_specialties ON trainers USING GIN(specialties);

-- Rollback instructions (comment out):
-- To rollback this migration:
-- ALTER TABLE trainers DROP COLUMN IF EXISTS training_philosophy;
-- ALTER TABLE trainers DROP COLUMN IF EXISTS testimonials;