// Get section data from streaming_vendor_attributes table for real-time section display
const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed. Use POST.' })
    };
  }

  try {
    // Parse request body
    let body;
    try {
      body = JSON.parse(event.body);
    } catch (parseError) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid JSON in request body' })
      };
    }

    const { trackName, artistName } = body;

    if (!trackName) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'trackName is required' })
      };
    }

    console.log(`🎯 Fetching streaming vendor sections for: "${trackName}" by "${artistName}"`);

    // Initialize Supabase client
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase configuration');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Server configuration error' })
      };
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Query for ALL section data from streaming_vendor_attributes table
    let query = supabase
      .from('streaming_vendor_attributes')
      .select(`
        id,
        track_name,
        artist_name,
        timestamp_ms,
        event_type,
        section_type,
        section_number,
        energy_level,
        intensity_level,
        estimated_tempo,
        notes,
        created_at
      `)
      .eq('track_name', trackName)
      .not('section_type', 'is', null)
      .order('timestamp_ms', { ascending: true });

    // Add artist filter if provided
    if (artistName) {
      query = query.eq('artist_name', artistName);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Supabase query error:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Database query failed', details: error.message })
      };
    }

    if (!data || data.length === 0) {
      console.log('⚠️ No section data found in streaming_vendor_attributes');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          sections: [],
          message: 'No section data found for this track in streaming_vendor_attributes'
        })
      };
    }

    console.log(`✅ Found ${data.length} sections in streaming_vendor_attributes`);

    // Transform the data into the format expected by the component
    const sections = data.map((row, index) => {
      const startTimeSeconds = row.timestamp_ms / 1000;
      const nextRow = data[index + 1];
      const endTimeSeconds = nextRow ? nextRow.timestamp_ms / 1000 : startTimeSeconds + 30; // Default 30s if last section
      const durationSeconds = endTimeSeconds - startTimeSeconds;
      
      // Include section number in the display
      const sectionLabel = row.section_number && row.section_number > 1 ? 
        `${row.section_type} ${row.section_number}` : 
        row.section_type;
      
      return {
        sectionIndex: index,
        sectionType: sectionLabel, // Use section + number for display
        sectionStartTime: startTimeSeconds,
        sectionDuration: durationSeconds,
        sectionEndTime: endTimeSeconds,
        sectionIndicator: `${sectionLabel} (${Math.round(startTimeSeconds)}s-${Math.round(endTimeSeconds)}s)`,
        energy: row.energy_level || 75,
        tempo: row.estimated_tempo || 120,
        loudness: -6, // Default loudness
        intensity: row.intensity_level || 75,
        timestampMs: row.timestamp_ms,
        notes: row.notes,
        dataSource: 'streaming_vendor_attributes',
        sectionNumber: row.section_number,
        rawSectionType: row.section_type // Keep original for matching
      };
    });

    // Add debug information
    const debugInfo = {
      rawData: data.map(row => ({
        section_type: row.section_type,
        section_number: row.section_number,
        timestamp_ms: row.timestamp_ms,
        timestamp_seconds: Math.round(row.timestamp_ms / 1000),
        timestamp_readable: `${Math.floor(row.timestamp_ms / 60000)}:${String(Math.floor((row.timestamp_ms % 60000) / 1000)).padStart(2, '0')}`,
        notes: row.notes,
        energy_level: row.energy_level
      })),
      analysis: {
        hasPrechorus: data.some(row => row.section_type === 'pre-chorus' || row.section_type === 'prechorus'),
        sectionTypes: [...new Set(data.map(row => row.section_type))],
        timingGaps: data.map((row, index) => {
          const next = data[index + 1];
          return {
            current: `${Math.floor(row.timestamp_ms / 60000)}:${String(Math.floor((row.timestamp_ms % 60000) / 1000)).padStart(2, '0')}`,
            next: next ? `${Math.floor(next.timestamp_ms / 60000)}:${String(Math.floor((next.timestamp_ms % 60000) / 1000)).padStart(2, '0')}` : null,
            gapSeconds: next ? Math.round((next.timestamp_ms - row.timestamp_ms) / 1000) : null
          };
        })
      }
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        sections,
        trackName,
        artistName,
        totalSections: sections.length,
        dataSource: 'streaming_vendor_attributes',
        debug: debugInfo
      })
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