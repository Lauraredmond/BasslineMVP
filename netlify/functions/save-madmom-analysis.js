const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase configuration');
}

const supabase = createClient(supabaseUrl, supabaseKey);

exports.handler = async (event, context) => {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // Handle preflight request
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
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    console.log('💾 [SVA] Processing madmom analysis save request...');
    
    const svaData = JSON.parse(event.body);
    
    // Validate required fields
    if (!svaData.track_name || !svaData.artist_name) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Missing required fields: track_name and artist_name are required' 
        })
      };
    }

    console.log('💾 [SVA] Saving madmom analysis for:', {
      track: svaData.track_name,
      artist: svaData.artist_name,
      bpm: svaData.spotify_tempo,
      method: svaData.analysis_method
    });

    // Insert into streaming_vendor_attributes table
    const { data, error } = await supabase
      .from('streaming_vendor_attributes')
      .insert([{
        // Track identification
        track_name: svaData.track_name,
        artist_name: svaData.artist_name,
        track_id: svaData.spotify_track_id || null,
        
        // Core tempo/BPM data from madmom
        spotify_tempo: svaData.spotify_tempo,
        tempo_confidence: svaData.tempo_confidence,
        analysis_method: svaData.analysis_method,
        
        // Beat tracking data (store as JSONB)
        beat_timestamps: svaData.beat_timestamps,
        downbeat_timestamps: svaData.downbeat_timestamps,
        onset_timestamps: svaData.onset_timestamps,
        
        // Session metadata
        capture_session_id: svaData.capture_session_id,
        captured_at: svaData.captured_at,
        capture_method: svaData.capture_method,
        
        // Processor configuration
        processor_config: svaData.processor_config,
        
        // Analysis quality metrics
        analysis_duration_ms: svaData.analysis_duration_ms,
        total_beats_detected: svaData.total_beats_detected,
        total_downbeats_detected: svaData.total_downbeats_detected,
        total_onsets_detected: svaData.total_onsets_detected,
        
        // Section information
        section_type: svaData.section_type || 'full_track',
        section_number: svaData.section_number || 1,
        timestamp_ms: svaData.timestamp_ms || 0,
        
        // Timestamps
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select();

    if (error) {
      console.error('❌ [SVA] Supabase insert error:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Database insert failed', 
          details: error.message 
        })
      };
    }

    console.log('✅ [SVA] Successfully saved madmom analysis to streaming_vendor_attributes');
    console.log('📊 [SVA] Saved record:', data[0]);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Madmom analysis data saved to streaming_vendor_attributes',
        record_id: data[0].id,
        track_info: {
          name: data[0].track_name,
          artist: data[0].artist_name,
          bpm: data[0].spotify_tempo,
          beats_detected: data[0].total_beats_detected,
          confidence: data[0].tempo_confidence
        }
      })
    };

  } catch (error) {
    console.error('❌ [SVA] Function error:', error);
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