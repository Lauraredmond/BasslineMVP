const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

exports.handler = async (event, context) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    console.log('🔨 Creating streaming_vendor_attributes table...');

    // Create the table
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS streaming_vendor_attributes (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        track_name VARCHAR(255) NOT NULL,
        artist_name VARCHAR(255) NOT NULL,
        
        -- Timing information
        timestamp_ms BIGINT NOT NULL,
        
        -- Event types
        event_type VARCHAR(50) NOT NULL,
        
        -- Section information
        section_type VARCHAR(50),
        section_number INTEGER,
        
        -- Bar/Beat information
        bar_number INTEGER,
        beat_number INTEGER,
        estimated_tempo DECIMAL(6,2),
        
        -- Audio characteristics
        energy_level INTEGER CHECK (energy_level >= 0 AND energy_level <= 100),
        intensity_level INTEGER CHECK (intensity_level >= 0 AND intensity_level <= 100),
        
        -- Metadata
        data_source VARCHAR(50) DEFAULT 'manual_capture',
        capture_session_id UUID,
        notes TEXT,
        
        -- User and timing
        captured_by VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        
        -- Track metadata
        track_duration_ms BIGINT,
        spotify_track_id VARCHAR(100),
        spotify_tempo REAL,
        
        -- Unique constraint
        UNIQUE(track_name, artist_name, timestamp_ms, event_type)
      );
    `;

    // Execute table creation
    const { error: createError } = await supabase.rpc('exec_sql', {
      sql_query: createTableSQL
    });

    if (createError) {
      console.error('❌ Error creating table:', createError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Failed to create table',
          details: createError.message
        })
      };
    }

    console.log('✅ Table created successfully');

    // Create indexes
    const indexQueries = [
      'CREATE INDEX IF NOT EXISTS idx_streaming_vendor_track ON streaming_vendor_attributes(track_name, artist_name);',
      'CREATE INDEX IF NOT EXISTS idx_streaming_vendor_timestamp ON streaming_vendor_attributes(timestamp_ms);',
      'CREATE INDEX IF NOT EXISTS idx_streaming_vendor_event_type ON streaming_vendor_attributes(event_type);',
      'CREATE INDEX IF NOT EXISTS idx_streaming_vendor_session ON streaming_vendor_attributes(capture_session_id);'
    ];

    for (const indexSQL of indexQueries) {
      const { error: indexError } = await supabase.rpc('exec_sql', {
        sql_query: indexSQL
      });
      
      if (indexError) {
        console.warn('⚠️ Index creation warning:', indexError.message);
      }
    }

    console.log('✅ Indexes created successfully');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'streaming_vendor_attributes table created successfully',
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {
    console.error('❌ Migration error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Migration failed',
        details: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
};