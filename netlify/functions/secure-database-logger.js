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
    const validColumns = [
      { name: 'id', type: 'uuid', nullable: false },
      { name: 'session_id', type: 'uuid', nullable: true },
      { name: 'track_id', type: 'text', nullable: true },
      { name: 'track_name', type: 'text', nullable: true },
      { name: 'artist_name', type: 'text', nullable: true },
      { name: 'album_name', type: 'text', nullable: true },
      { name: 'progress_ms', type: 'integer', nullable: true },
      { name: 'timestamp', type: 'timestamp', nullable: false },
      { name: 'tempo', type: 'text', nullable: true },
      { name: 'key', type: 'text', nullable: true },
      { name: 'energy', type: 'integer', nullable: true },
      { name: 'camelot', type: 'text', nullable: true },
      { name: 'current_section_start', type: 'real', nullable: true },
      { name: 'current_beat_start', type: 'real', nullable: true },
      { name: 'current_segment_loudness_max', type: 'real', nullable: true }
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
    // Use hardcoded valid column names (same as introspectTable function)
    const validColumnNames = new Set([
      'id', 'session_id', 'track_id', 'track_name', 'artist_name', 'album_name',
      'progress_ms', 'timestamp', 'tempo', 'key', 'energy', 'camelot',
      'current_section_start', 'current_beat_start', 'current_segment_loudness_max'
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