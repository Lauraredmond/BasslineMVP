// Simple Database Logger - No column introspection, direct mapping
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

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    
    // Special debug mode for streaming vendor attributes
    if (body.debug === 'streaming_vendor_sections') {
      console.log('🔍 DEBUG MODE: Checking streaming_vendor_attributes table...');
      
      const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      
      if (!supabaseUrl || !supabaseServiceKey) {
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Missing Supabase config' })
        };
      }
      
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      const { data, error } = await supabase
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
      
      const debugData = data.map(row => ({
        section_type: row.section_type,
        timestamp_ms: row.timestamp_ms,
        timestamp_readable: `${Math.floor(row.timestamp_ms / 60000)}:${String(Math.floor((row.timestamp_ms % 60000) / 1000)).padStart(2, '0')}`,
        notes: row.notes
      }));
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'Streaming vendor debug data',
          totalRecords: data.length,
          sections: debugData,
          hasPrechorus: data.some(row => row.section_type?.includes('pre-chorus')),
          sectionTypes: [...new Set(data.map(row => row.section_type))]
        })
      };
    }
    
    // Environment variables
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    console.log('Environment check:', {
      hasUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey
    });
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Server configuration error',
          details: 'Missing Supabase credentials'
        })
      };
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const requestBody = JSON.parse(event.body);
    const { action, data } = requestBody;

    if (action === 'create_session') {
      console.log('Creating session:', data);
      
      const { data: session, error } = await supabase
        .from('spotify_playback_sessions')
        .insert({
          session_name: data.sessionName || `Session ${new Date().toISOString()}`,
          workout_type: data.workoutType || 'general',
          start_time: new Date().toISOString()
        })
        .select('id')
        .single();

      if (error) {
        console.error('Session creation error:', error);
        throw error;
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          sessionId: session.id
        })
      };
    }

    if (action === 'log_analysis') {
      console.log('Logging analysis data:', {
        hasData: !!data,
        dataKeys: Object.keys(data || {})
      });

      // Direct mapping to known table columns - no introspection needed
      const logEntry = {
        session_id: data.session_id,
        vendor_source: data.vendor_source || 'RapidAPI',
        track_name: data.track_name || 'Unknown',
        artist_name: data.artist_name || 'Unknown',
        data_source: data.data_source || 'rapidapi',
        from_cache: data.from_cache || false,
        fallback_type: data.fallback_type || 'api',
        playback_position_ms: data.playback_position_ms || 0,
        is_playing: data.is_playing !== false, // default true
        timestamp: new Date().toISOString()
      };

      // Add RapidAPI/Soundnet data if available
      if (data.rapidSoundnetData) {
        const rapid = data.rapidSoundnetData;
        
        // Map to Soundnet columns
        if (rapid.tempo) logEntry.soundnet_tempo = String(rapid.tempo);
        if (rapid.key) logEntry.soundnet_key = String(rapid.key);
        if (rapid.mode) logEntry.soundnet_mode = String(rapid.mode);
        if (rapid.camelot) logEntry.soundnet_camelot = String(rapid.camelot);
        if (rapid.energy !== undefined) logEntry.soundnet_energy = Number(rapid.energy);
        if (rapid.danceability !== undefined) logEntry.soundnet_danceability = Number(rapid.danceability);
        if (rapid.happiness !== undefined) logEntry.soundnet_happiness = Number(rapid.happiness);
        if (rapid.popularity !== undefined) logEntry.soundnet_popularity = Number(rapid.popularity);
        if (rapid.acousticness !== undefined) logEntry.soundnet_acousticness = Number(rapid.acousticness);
        if (rapid.instrumentalness !== undefined) logEntry.soundnet_instrumentalness = Number(rapid.instrumentalness);
        if (rapid.liveness !== undefined) logEntry.soundnet_liveness = Number(rapid.liveness);
        if (rapid.speechiness !== undefined) logEntry.soundnet_speechiness = Number(rapid.speechiness);
        if (rapid.loudness) logEntry.soundnet_loudness = String(rapid.loudness);
        if (rapid.duration) logEntry.soundnet_duration = String(rapid.duration);
        
        console.log('Mapped RapidAPI data:', {
          tempo: logEntry.soundnet_tempo,
          key: logEntry.soundnet_key,
          energy: logEntry.soundnet_energy,
          camelot: logEntry.soundnet_camelot
        });
      }

      // Insert directly into table
      const { data: logResult, error } = await supabase
        .from('common_streaming_vendor_analysis_logs')
        .insert(logEntry)
        .select('id')
        .single();

      if (error) {
        console.error('Database insert error:', error);
        throw error;
      }

      console.log('Successfully inserted log entry:', logResult.id);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          logId: logResult.id,
          mappedFields: Object.keys(logEntry).length
        })
      };
    }

    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Invalid action' })
    };

  } catch (error) {
    console.error('Function error:', error);
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