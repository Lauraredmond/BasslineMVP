// Temporary Database Migration Utility
// Used to execute the vendor-agnostic analysis logs table migration

import { supabase } from './supabase';

export class DatabaseMigrator {
  
  // Execute the vendor-agnostic migration
  async runVendorAgnosticMigration(): Promise<{ success: boolean; error?: any; message?: string }> {
    try {
      console.log('🔄 Starting vendor-agnostic analysis logs migration...');
      
      // Check if table already exists
      const { data: existingTable, error: checkError } = await supabase
        .from('common_streaming_vendor_analysis_logs')
        .select('id')
        .limit(1);
      
      if (!checkError) {
        console.log('✅ Table common_streaming_vendor_analysis_logs already exists');
        return { success: true, message: 'Table already exists' };
      }
      
      // Table doesn't exist, create it
      console.log('📝 Creating new vendor-agnostic analysis table...');
      
      const createTableSQL = `
        -- Step 1: Create new vendor-agnostic table with all attributes
        CREATE TABLE IF NOT EXISTS common_streaming_vendor_analysis_logs (
            -- Primary identifiers
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            session_id UUID REFERENCES spotify_playback_sessions(id),
            created_at TIMESTAMPTZ DEFAULT NOW(),
            timestamp TIMESTAMPTZ DEFAULT NOW(),
            
            -- Vendor Attribution
            vendor_source TEXT NOT NULL DEFAULT 'Unknown', -- 'Spotify API', 'Soundnet API', 'YouTube API', 'Apple Music API', etc.
            data_source TEXT, -- 'api', 'cache', 'fallback'
            from_cache BOOLEAN DEFAULT FALSE,
            fallback_type TEXT, -- 'intelligent', 'basic', 'genre-based'
            
            -- Track Identification (Universal)
            track_id TEXT,
            track_name TEXT NOT NULL,
            artist_name TEXT,
            track_uri TEXT,
            
            -- Playback Context
            playback_position_ms BIGINT DEFAULT 0,
            is_playing BOOLEAN DEFAULT TRUE,
            
            -- SOUNDNET API CORE ATTRIBUTES (0-100 scale)
            soundnet_camelot TEXT, -- Harmonic mixing key (e.g., "8B", "1A")
            soundnet_duration TEXT, -- Track duration (e.g., "3:28")
            soundnet_popularity INTEGER, -- 0-100 popularity score
            soundnet_energy INTEGER, -- 0-100 energy level
            soundnet_danceability INTEGER, -- 0-100 groove factor
            soundnet_happiness INTEGER, -- 0-100 mood/valence score
            soundnet_acousticness INTEGER, -- 0-100 acoustic vs electronic
            soundnet_instrumentalness INTEGER, -- 0-100 instrumental vs vocal
            soundnet_liveness INTEGER, -- 0-100 live performance feel
            soundnet_speechiness INTEGER, -- 0-100 spoken word content
            soundnet_loudness TEXT, -- RMS loudness (e.g., "-5 dB")
            
            -- SOUNDNET MUSICAL ATTRIBUTES
            soundnet_key TEXT, -- Musical key (e.g., "C", "F#", "Ab")
            soundnet_mode TEXT, -- "major" or "minor"
            soundnet_tempo INTEGER, -- BPM (beats per minute)
            
            -- SPOTIFY API TRACK-LEVEL ATTRIBUTES (0-1 scale)
            spotify_danceability REAL,
            spotify_energy REAL,
            spotify_valence REAL, -- happiness/mood
            spotify_acousticness REAL,
            spotify_instrumentalness REAL,
            spotify_liveness REAL,
            spotify_speechiness REAL,
            spotify_loudness REAL, -- dB
            spotify_tempo REAL, -- BPM
            spotify_key INTEGER, -- 0-11 (C=0, C#=1, etc.)
            spotify_mode INTEGER, -- 0=minor, 1=major
            spotify_time_signature INTEGER,
            spotify_tempo_confidence REAL,
            
            -- SPOTIFY ADVANCED ANALYSIS (Dynamic Segments)
            current_section_start REAL,
            current_section_duration REAL,
            current_section_loudness REAL,
            current_section_tempo REAL,
            current_section_key INTEGER,
            current_section_mode INTEGER,
            current_section_confidence REAL,
            current_section_tempo_confidence REAL,
            current_section_key_confidence REAL,
            current_section_mode_confidence REAL,
            current_section_time_signature INTEGER,
            current_section_time_signature_confidence REAL,
            
            current_segment_start REAL,
            current_segment_duration REAL,
            current_segment_loudness_start REAL,
            current_segment_loudness_max REAL,
            current_segment_loudness_max_time REAL,
            current_segment_loudness_end REAL,
            current_segment_confidence REAL,
            current_segment_pitches REAL[], -- 12-dimensional pitch vector
            current_segment_timbre REAL[], -- Timbral texture features
            
            -- BEAT/BAR/TATUM ANALYSIS
            current_beat_start REAL,
            current_beat_duration REAL,
            current_beat_confidence REAL,
            current_bar_start REAL,
            current_bar_duration REAL,
            current_bar_confidence REAL,
            current_tatum_start REAL,
            current_tatum_duration REAL,
            current_tatum_confidence REAL,
            
            -- FITNESS CONTEXT
            fitness_phase TEXT,
            workout_intensity INTEGER,
            user_notes TEXT,
            
            -- FUTURE VENDOR PLACEHOLDERS
            youtube_attributes JSONB, -- For YouTube Music API data
            apple_attributes JSONB, -- For Apple Music API data
            vendor_specific_data JSONB -- Flexible JSON for any vendor-specific attributes
        );
      `;
      
      // Since we can't execute raw SQL, we'll test if table exists by trying to insert a test record
      console.log('⚠️ Unable to create table via raw SQL. Table must be created manually through Supabase Dashboard.');
      console.log('📋 SQL to execute in Supabase Dashboard:');
      console.log(createTableSQL);
      
      return { 
        success: false, 
        error: 'Manual table creation required',
        message: 'Please execute the SQL in Supabase Dashboard'
      };
      
      // Create indexes
      console.log('📊 Creating indexes...');
      
      const indexesSQL = `
        CREATE INDEX IF NOT EXISTS idx_vendor_analysis_session_id ON common_streaming_vendor_analysis_logs(session_id);
        CREATE INDEX IF NOT EXISTS idx_vendor_analysis_timestamp ON common_streaming_vendor_analysis_logs(timestamp);
        CREATE INDEX IF NOT EXISTS idx_vendor_analysis_track_name ON common_streaming_vendor_analysis_logs(track_name);
        CREATE INDEX IF NOT EXISTS idx_vendor_analysis_vendor_source ON common_streaming_vendor_analysis_logs(vendor_source);
        CREATE INDEX IF NOT EXISTS idx_vendor_analysis_playback_position ON common_streaming_vendor_analysis_logs(playback_position_ms);
      `;
      
      const { error: indexError } = await supabase.rpc('exec_sql', { sql: indexesSQL });
      
      if (indexError) {
        console.warn('⚠️ Some indexes may have failed to create:', indexError);
      }
      
      // Enable RLS
      console.log('🔐 Enabling Row Level Security...');
      
      const rlsSQL = `
        ALTER TABLE common_streaming_vendor_analysis_logs ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS "Users can view own analysis data" ON common_streaming_vendor_analysis_logs;
        CREATE POLICY "Users can view own analysis data" ON common_streaming_vendor_analysis_logs
            FOR SELECT USING (true); -- Allow all reads for now
        
        DROP POLICY IF EXISTS "Users can insert own analysis data" ON common_streaming_vendor_analysis_logs;
        CREATE POLICY "Users can insert own analysis data" ON common_streaming_vendor_analysis_logs
            FOR INSERT WITH CHECK (true); -- Allow all inserts for now
      `;
      
      const { error: rlsError } = await supabase.rpc('exec_sql', { sql: rlsSQL });
      
      if (rlsError) {
        console.warn('⚠️ RLS policies may have failed:', rlsError);
      }
      
      console.log('✅ Vendor-agnostic analysis table migration completed successfully!');
      return { success: true, message: 'Migration completed successfully' };
      
    } catch (error) {
      console.error('💥 Migration failed:', error);
      return { success: false, error };
    }
  }
  
  // Test table access
  async testTableAccess(): Promise<{ success: boolean; error?: any; message?: string }> {
    try {
      console.log('🔍 Testing table access...');
      
      // Try to select from the table
      const { data, error } = await supabase
        .from('common_streaming_vendor_analysis_logs')
        .select('id')
        .limit(1);
      
      if (error) {
        console.error('❌ Table access failed:', error);
        return { success: false, error };
      }
      
      console.log('✅ Table access successful, records found:', data?.length || 0);
      return { success: true, message: `Table accessible, ${data?.length || 0} records found` };
      
    } catch (error) {
      console.error('💥 Table access test failed:', error);
      return { success: false, error };
    }
  }
}

export const databaseMigrator = new DatabaseMigrator();

// Global function for easy console access
declare global {
  interface Window {
    runMigration: () => Promise<void>;
    testTable: () => Promise<void>;
  }
}

window.runMigration = async () => {
  const result = await databaseMigrator.runVendorAgnosticMigration();
  console.log('Migration result:', result);
};

window.testTable = async () => {
  const result = await databaseMigrator.testTableAccess();
  console.log('Table test result:', result);
};