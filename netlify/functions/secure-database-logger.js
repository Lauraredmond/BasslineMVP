// Netlify Function: Secure Database Logger
// Handles all database operations server-side with column introspection
const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    // Use SERVICE ROLE KEY for server-side operations
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    console.log('Environment check:', {
      hasUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey,
      urlPrefix: supabaseUrl ? supabaseUrl.substring(0, 20) + '...' : 'missing'
    });
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase configuration:', {
        hasUrl: !!supabaseUrl,
        hasServiceKey: !!supabaseServiceKey
      });
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Server configuration error',
          details: 'Supabase service key not configured'
        })
      };
    }
    
    console.log('Creating Supabase client with service role key...');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (event.httpMethod === 'POST') {
      const requestBody = JSON.parse(event.body);
      const { action, data } = requestBody;
      
      // Special debug mode for streaming vendor attributes
      if (action === 'debug_streaming_vendor') {
        console.log('🔍 DEBUG MODE: Checking streaming_vendor_attributes table...');
        
        const { data: vendorData, error } = await supabase
          .from('streaming_vendor_attributes')
          .select('*')
          .eq('track_name', 'The Pretender')
          .eq('artist_name', 'Foo Fighters')
          .order('timestamp_ms');
        
        if (error) {
          return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: error.message })
          };
        }
        
        const debugData = vendorData.map(row => ({
          section_type: row.section_type,
          section_number: row.section_number,
          timestamp_ms: row.timestamp_ms,
          timestamp_readable: `${Math.floor(row.timestamp_ms / 60000)}:${String(Math.floor((row.timestamp_ms % 60000) / 1000)).padStart(2, '0')}`,
          notes: row.notes,
          energy_level: row.energy_level
        }));
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            message: 'Streaming vendor debug data',
            totalRecords: vendorData.length,
            sections: debugData,
            hasPrechorus: vendorData.some(row => row.section_type?.includes('pre-chorus')),
            sectionTypes: [...new Set(vendorData.map(row => row.section_type))],
            timingGaps: debugData.map((row, index) => {
              const next = debugData[index + 1];
              return {
                current: row.timestamp_readable,
                next: next?.timestamp_readable,
                gapSeconds: next ? Math.round((next.timestamp_ms - row.timestamp_ms) / 1000) : null
              };
            })
          })
        };
      }

      switch (action) {
        case 'introspect_table':
          return await introspectTable(supabase, headers);
          
        case 'create_session':
          return await createSession(supabase, headers, data);
          
        case 'log_analysis':
          return await logAnalysis(supabase, headers, data);
          
        default:
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Invalid action' })
          };
      }
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };

  } catch (error) {
    console.error('Secure database logger error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        details: error.message
      })
    };
  }
};

async function introspectTable(supabase, headers) {
  try {
    // Hardcoded valid columns for common_streaming_vendor_analysis_logs table
    // This avoids the need to query information_schema which Supabase doesn't allow
    // Column names taken from actual database export
    const validColumns = [
      { name: 'id', type: 'uuid', nullable: false },
      { name: 'session_id', type: 'uuid', nullable: true },
      { name: 'created_at', type: 'timestamp', nullable: false },
      { name: 'timestamp', type: 'timestamp', nullable: false },
      { name: 'vendor_source', type: 'text', nullable: true },
      { name: 'data_source', type: 'text', nullable: true },
      { name: 'from_cache', type: 'boolean', nullable: true },
      { name: 'fallback_type', type: 'text', nullable: true },
      { name: 'track_id', type: 'text', nullable: true },
      { name: 'track_name', type: 'text', nullable: true },
      { name: 'artist_name', type: 'text', nullable: true },
      { name: 'track_uri', type: 'text', nullable: true },
      { name: 'playback_position_ms', type: 'integer', nullable: true },
      { name: 'is_playing', type: 'boolean', nullable: true },
      
      // Soundnet columns (existing in database)
      { name: 'soundnet_camelot', type: 'text', nullable: true },
      { name: 'soundnet_duration', type: 'text', nullable: true },
      { name: 'soundnet_popularity', type: 'integer', nullable: true },
      { name: 'soundnet_energy', type: 'integer', nullable: true },
      { name: 'soundnet_danceability', type: 'integer', nullable: true },
      { name: 'soundnet_happiness', type: 'integer', nullable: true },
      { name: 'soundnet_acousticness', type: 'integer', nullable: true },
      { name: 'soundnet_instrumentalness', type: 'integer', nullable: true },
      { name: 'soundnet_liveness', type: 'integer', nullable: true },
      { name: 'soundnet_speechiness', type: 'integer', nullable: true },
      { name: 'soundnet_loudness', type: 'text', nullable: true },
      { name: 'soundnet_key', type: 'text', nullable: true },
      { name: 'soundnet_mode', type: 'text', nullable: true },
      { name: 'soundnet_tempo', type: 'text', nullable: true },
      
      // RapidAPI/RS columns (existing in database) 
      { name: 'rs_key', type: 'text', nullable: true },
      { name: 'rs_mode', type: 'text', nullable: true },
      { name: 'rs_camelot', type: 'text', nullable: true },
      { name: 'rs_happiness', type: 'integer', nullable: true },
      { name: 'rs_popularity', type: 'integer', nullable: true },
      { name: 'rs_duration', type: 'text', nullable: true },
      { name: 'rs_loudness', type: 'text', nullable: true },
      { name: 'rs_energy_raw', type: 'integer', nullable: true },
      { name: 'rs_danceability_raw', type: 'integer', nullable: true },
      { name: 'rs_acousticness_raw', type: 'integer', nullable: true },
      { name: 'rs_instrumentalness_raw', type: 'integer', nullable: true },
      { name: 'rs_speechiness_raw', type: 'integer', nullable: true },
      { name: 'rs_liveness_raw', type: 'integer', nullable: true },
      
      // Spotify columns
      { name: 'spotify_danceability', type: 'real', nullable: true },
      { name: 'spotify_energy', type: 'real', nullable: true },
      { name: 'spotify_valence', type: 'real', nullable: true },
      { name: 'spotify_acousticness', type: 'real', nullable: true },
      { name: 'spotify_instrumentalness', type: 'real', nullable: true },
      { name: 'spotify_liveness', type: 'real', nullable: true },
      { name: 'spotify_speechiness', type: 'real', nullable: true },
      { name: 'spotify_loudness', type: 'real', nullable: true },
      { name: 'spotify_tempo', type: 'real', nullable: true },
      { name: 'spotify_key', type: 'integer', nullable: true },
      { name: 'spotify_mode', type: 'integer', nullable: true },
      { name: 'spotify_time_signature', type: 'integer', nullable: true },
      
      // Advanced analysis columns
      { name: 'current_section_start', type: 'real', nullable: true },
      { name: 'current_beat_start', type: 'real', nullable: true },
      { name: 'current_segment_loudness_max', type: 'real', nullable: true },
      
      // SECTION COLUMNS - Added support for sectional analysis
      { name: 'section_indicator', type: 'text', nullable: true },
      { name: 'section_index', type: 'integer', nullable: true },
      { name: 'section_type', type: 'text', nullable: true },
      { name: 'section_narrative', type: 'text', nullable: true },
      
      // FITNESS CONTEXT COLUMNS 
      { name: 'fitness_phase', type: 'text', nullable: true },
      { name: 'workout_intensity', type: 'real', nullable: true }
    ];

    console.log('Using hardcoded schema:', {
      columnCount: validColumns.length,
      sampleColumns: validColumns.slice(0, 5).map(c => c.name)
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        columns: validColumns,
        columnNames: validColumns.map(col => col.name)
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Table introspection failed',
        details: error.message
      })
    };
  }
}

async function createSession(supabase, headers, data) {
  try {
    const { data: session, error } = await supabase
      .from('spotify_playback_sessions')
      .insert({
        session_name: data.sessionName || `Session ${new Date().toISOString()}`,
        workout_type: data.workoutType || 'general',
        start_time: new Date().toISOString()
      })
      .select('id')
      .single();

    if (error) throw error;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        sessionId: session.id
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Session creation failed',
        details: error.message
      })
    };
  }
}

async function logAnalysis(supabase, headers, data) {
  try {
    // Use hardcoded valid column names (matching database schema)
    const validColumnNames = new Set([
      'id', 'session_id', 'created_at', 'timestamp', 'vendor_source', 'data_source', 
      'from_cache', 'fallback_type', 'track_id', 'track_name', 'artist_name', 'track_uri', 
      'playback_position_ms', 'is_playing',
      // Soundnet columns (existing in database)
      'soundnet_camelot', 'soundnet_duration', 'soundnet_popularity', 'soundnet_energy',
      'soundnet_danceability', 'soundnet_happiness', 'soundnet_acousticness', 'soundnet_instrumentalness',
      'soundnet_liveness', 'soundnet_speechiness', 'soundnet_loudness', 'soundnet_key', 'soundnet_mode', 'soundnet_tempo',
      // RapidAPI/RS columns (existing in database)
      'rs_key', 'rs_mode', 'rs_camelot', 'rs_happiness', 'rs_popularity', 'rs_duration', 
      'rs_loudness', 'rs_energy_raw', 'rs_danceability_raw', 'rs_acousticness_raw', 
      'rs_instrumentalness_raw', 'rs_speechiness_raw', 'rs_liveness_raw',
      // Spotify columns
      'spotify_danceability', 'spotify_energy', 'spotify_valence', 'spotify_acousticness',
      'spotify_instrumentalness', 'spotify_liveness', 'spotify_speechiness', 'spotify_loudness',
      'spotify_tempo', 'spotify_key', 'spotify_mode', 'spotify_time_signature',
      // Advanced analysis
      'current_section_start', 'current_beat_start', 'current_segment_loudness_max',
      // SECTION COLUMNS - Added support for sectional analysis
      'section_indicator', 'section_index', 'section_type', 'section_narrative',
      // FITNESS CONTEXT
      'fitness_phase', 'workout_intensity'
    ]);
    
    console.log('Using hardcoded valid columns for filtering:', Array.from(validColumnNames).slice(0, 10));
    
    // Filter payload to only valid columns
    const filteredPayload = {};
    Object.keys(data).forEach(key => {
      if (validColumnNames.has(key)) {
        filteredPayload[key] = data[key];
      }
    });

    console.log('Filtered payload keys:', Object.keys(filteredPayload));
    console.log('Original payload size:', Object.keys(data).length);
    console.log('Filtered payload size:', Object.keys(filteredPayload).length);

    // Insert with only valid columns
    const { data: logEntry, error } = await supabase
      .from('common_streaming_vendor_analysis_logs')
      .insert(filteredPayload)
      .select('id')
      .single();

    if (error) throw error;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        logId: logEntry.id,
        filteredFields: Object.keys(filteredPayload).length,
        originalFields: Object.keys(data).length
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Analysis logging failed',
        details: error.message
      })
    };
  }
}