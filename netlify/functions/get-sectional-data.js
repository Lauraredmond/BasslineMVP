// Get sectional analysis data for real-time section display
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

    console.log(`🎯 Fetching sectional data for: "${trackName}" by "${artistName}"`);

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

    // Query for sectional data from the vendor analysis logs
    let query = supabase
      .from('common_streaming_vendor_analysis_logs')
      .select(`
        section_index,
        section_type,
        section_indicator,
        playback_position_ms,
        rs_energy_raw,
        soundnet_tempo,
        rs_loudness,
        soundnet_energy,
        soundnet_danceability,
        current_section_start,
        current_section_duration,
        current_section_loudness,
        current_section_tempo,
        spotify_tempo,
        created_at
      `)
      .eq('track_name', trackName)
      .not('section_type', 'is', null)
      .not('section_index', 'is', null)
      .order('section_index', { ascending: true });

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
      console.log('⚠️ No sectional data found for track');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          sections: [],
          message: 'No sectional data found for this track'
        })
      };
    }

    console.log(`✅ Found ${data.length} sections for track`);

    // Transform the data into the format expected by the component
    const sections = data.map(row => {
      let startTimeSeconds = row.current_section_start || (row.playback_position_ms || 0) / 1000;
      let durationSeconds = row.current_section_duration || 60;
      
      // EXTRACT TIMING FROM SECTION_INDICATOR if available (more reliable)
      if (row.section_indicator && row.section_indicator.includes('(') && row.section_indicator.includes('s-')) {
        try {
          // Parse: "Section 1: verse (26.900000000000002s-94.2s)"
          const timingMatch = row.section_indicator.match(/\((\d+(?:\.\d+)?)s-(\d+(?:\.\d+)?)s\)/);
          if (timingMatch) {
            const extractedStart = parseFloat(timingMatch[1]);
            const extractedEnd = parseFloat(timingMatch[2]);
            startTimeSeconds = extractedStart;
            durationSeconds = extractedEnd - extractedStart;
            console.log(`🎯 Extracted timing from section_indicator: ${extractedStart}s-${extractedEnd}s`);
          }
        } catch (parseError) {
          console.warn('Could not parse timing from section_indicator:', row.section_indicator);
        }
      }
      
      return {
        sectionIndex: row.section_index || 0,
        sectionType: row.section_type || 'unknown',
        sectionStartTime: startTimeSeconds,
        sectionDuration: durationSeconds,
        sectionEndTime: startTimeSeconds + durationSeconds,
        sectionIndicator: row.section_indicator || `Section ${row.section_index}: ${row.section_type} (${Math.round(startTimeSeconds)}s-${Math.round(startTimeSeconds + durationSeconds)}s)`,
        energy: row.rs_energy_raw || row.soundnet_energy || 50,
        tempo: row.current_section_tempo || row.spotify_tempo || row.soundnet_tempo || 120,
        loudness: row.current_section_loudness || (row.rs_loudness ? parseFloat(row.rs_loudness.replace(' dB', '')) : -6)
      };
    });

    // Calculate proper section durations (end time of each section)
    for (let i = 0; i < sections.length - 1; i++) {
      const currentSection = sections[i];
      const nextSection = sections[i + 1];
      
      currentSection.sectionDuration = nextSection.sectionStartTime - currentSection.sectionStartTime;
      currentSection.sectionEndTime = nextSection.sectionStartTime;
    }

    // For the last section, estimate duration
    if (sections.length > 0) {
      const lastSection = sections[sections.length - 1];
      lastSection.sectionDuration = 30; // Default 30 seconds for outro
      lastSection.sectionEndTime = lastSection.sectionStartTime + lastSection.sectionDuration;
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        sections,
        trackName,
        artistName,
        totalSections: sections.length
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