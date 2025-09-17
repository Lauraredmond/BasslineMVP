const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client with service role for server-side operations
const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
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

  // Check for required environment variables
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Server configuration error - missing service key',
        details: 'SUPABASE_SERVICE_ROLE_KEY not configured'
      })
    };
  }

  try {
    const { trackName, artistName, sessionId, events, spotifyTempo } = JSON.parse(event.body);

    console.log(`📝 Saving audio timestamps for: ${trackName} by ${artistName}`);
    console.log(`🎯 Session ID: ${sessionId}`);
    console.log(`⏰ Events to save: ${events.length}`);

    // Validate required fields
    if (!trackName || !artistName || !sessionId || !Array.isArray(events)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Missing required fields: trackName, artistName, sessionId, events' 
        })
      };
    }

    // Prepare database records
    const records = events.map(event => ({
      track_name: trackName,
      artist_name: artistName,
      timestamp_ms: event.timestamp_ms,
      event_type: event.event_type,
      section_type: event.section_type || null,
      section_number: event.section_number || null,
      bar_number: event.bar_number || null,
      beat_number: event.beat_number || null,
      energy_level: event.energy_level || null,
      intensity_level: event.intensity_level || null,
      notes: event.notes || null,
      bar_start_timestamp: event.bar_start_timestamp || null,
      rhythm_taps: event.rhythm_taps || null,
      loudness_timestamp: event.loudness_timestamp || null,
      data_source: event.data_source || 'manual_capture',
      capture_session_id: event.capture_session_id || sessionId,
      captured_by: event.captured_by || 'manual_audio_capture',
      spotify_tempo: spotifyTempo || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    console.log(`💾 Inserting ${records.length} records into streaming_vendor_attributes table`);
    console.log('📊 Sample record:', JSON.stringify(records[0], null, 2));

    // Insert records into database
    const { data, error } = await supabase
      .from('streaming_vendor_attributes')
      .insert(records)
      .select();

    if (error) {
      console.error('❌ Database error:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Database error',
          details: error.message 
        })
      };
    }

    console.log(`✅ Successfully saved ${data?.length || records.length} timestamp records`);

    // Return success response
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `Saved ${records.length} timestamp events`,
        sessionId,
        trackName,
        artistName,
        recordsInserted: data?.length || records.length,
        data: {
          session_id: sessionId,
          track_name: trackName,
          artist_name: artistName,
          events_saved: records.length,
          timestamp: new Date().toISOString()
        }
      })
    };

  } catch (error) {
    console.error('❌ Function error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        details: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
};