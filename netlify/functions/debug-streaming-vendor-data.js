// Debug function to check actual data in streaming_vendor_attributes table
const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Server configuration error' })
      };
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all data for The Pretender to debug timing issues
    const { data, error } = await supabase
      .from('streaming_vendor_attributes')
      .select('*')
      .eq('track_name', 'The Pretender')
      .eq('artist_name', 'Foo Fighters')
      .order('timestamp_ms', { ascending: true });

    if (error) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: error.message })
      };
    }

    // Convert timestamps to readable format for debugging
    const debugData = data.map(row => ({
      section_type: row.section_type,
      section_number: row.section_number,
      timestamp_ms: row.timestamp_ms,
      timestamp_seconds: Math.round(row.timestamp_ms / 1000),
      timestamp_readable: `${Math.floor(row.timestamp_ms / 60000)}:${String(Math.floor((row.timestamp_ms % 60000) / 1000)).padStart(2, '0')}`,
      energy_level: row.energy_level,
      intensity_level: row.intensity_level,
      notes: row.notes,
      data_source: row.data_source || 'manual_capture',
      created_at: row.created_at
    }));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        totalRecords: data.length,
        sections: debugData,
        analysis: {
          hasPrechorus: data.some(row => row.section_type === 'pre-chorus' || row.section_type === 'prechorus'),
          sectionTypes: [...new Set(data.map(row => row.section_type))],
          timingGaps: debugData.map((row, index) => ({
            current: row.timestamp_readable,
            next: debugData[index + 1]?.timestamp_readable,
            gapSeconds: debugData[index + 1] ? Math.round((debugData[index + 1].timestamp_ms - row.timestamp_ms) / 1000) : null
          }))
        }
      })
    };

  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};