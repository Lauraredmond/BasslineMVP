// Enhanced Netlify Function: Full RapidAPI Track Analysis with Sections
// This function gets the complete API response including time-based sections
exports.handler = async (event, context) => {
  // CORS headers for client requests
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // Only allow GET requests
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed. Use GET.' })
    };
  }

  try {
    // Get environment variables (server-side only)
    const rapidApiKey = process.env.RAPIDAPI_KEY;
    const rapidApiHost = process.env.RAPIDAPI_HOST || 'track-analysis.p.rapidapi.com';

    if (!rapidApiKey) {
      console.error('RAPIDAPI_KEY not configured in Netlify environment variables');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Server configuration error',
          details: 'API key not configured'
        })
      };
    }

    // Parse query parameters
    const { song, artist, format } = event.queryStringParameters || {};

    if (!song) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Bad request',
          details: 'Missing required parameter: song'
        })
      };
    }

    console.log(`🎯 Enhanced RapidAPI request: "${song}" by "${artist || 'Unknown'}"`);

    // Prepare request parameters - try different endpoints for more detailed data
    const params = new URLSearchParams({ song });
    if (artist) params.append('artist', artist);
    
    // Try the enhanced analysis endpoint first (if available)
    const endpoints = [
      `/pktx/detailed-analysis?${params}`,  // Try enhanced endpoint first
      `/pktx/analysis?${params}`            // Fallback to regular endpoint
    ];

    let response;
    let usedEndpoint;
    
    for (const endpoint of endpoints) {
      const url = `https://${rapidApiHost}${endpoint}`;
      
      try {
        console.log(`🔍 Trying endpoint: ${endpoint}`);
        
        response = await fetch(url, {
          method: 'GET',
          headers: {
            'X-RapidAPI-Key': rapidApiKey,
            'X-RapidAPI-Host': rapidApiHost
          }
        });

        if (response.ok) {
          usedEndpoint = endpoint;
          console.log(`✅ Success with endpoint: ${endpoint}`);
          break;
        } else {
          console.log(`❌ Failed with endpoint ${endpoint}: ${response.status}`);
        }
        
      } catch (endpointError) {
        console.log(`💥 Error with endpoint ${endpoint}:`, endpointError.message);
        continue;
      }
    }

    // Check if any endpoint worked
    if (!response || !response.ok) {
      const errorText = await response?.text() || 'No response received';
      console.error(`RapidAPI error: ${response?.status || 'No status'} - ${errorText}`);
      
      return {
        statusCode: response?.status || 500,
        headers,
        body: JSON.stringify({
          error: 'RapidAPI request failed on all endpoints',
          status: response?.status || 500,
          details: errorText
        })
      };
    }

    // Parse and return the response
    const data = await response.json();
    console.log(`✅ Enhanced RapidAPI success for: "${song}" using ${usedEndpoint}`);
    console.log('📊 Response structure:', Object.keys(data));
    
    // Check if we got sectional data
    const hasSections = data.sections && Array.isArray(data.sections);
    const hasSegments = data.segments && Array.isArray(data.segments);
    const hasBars = data.bars && Array.isArray(data.bars);
    const hasBeats = data.beats && Array.isArray(data.beats);
    
    console.log('🔍 Analysis depth:', {
      sections: hasSections ? data.sections.length : 0,
      segments: hasSegments ? data.segments.length : 0,
      bars: hasBars ? data.bars.length : 0,
      beats: hasBeats ? data.beats.length : 0
    });

    // Add metadata about the request and what we found
    const enrichedData = {
      ...data,
      _metadata: {
        source: 'Enhanced RapidAPI via Netlify Function',
        endpoint: usedEndpoint,
        timestamp: new Date().toISOString(),
        song,
        artist: artist || null,
        fromCache: false,
        analysisDepth: {
          hasSections,
          hasSegments,
          hasBars,
          hasBeats,
          totalSections: hasSections ? data.sections.length : 0,
          totalSegments: hasSegments ? data.segments.length : 0
        }
      }
    };

    // If we didn't get sectional data, create estimated sections
    if (!hasSections && data.tempo && data.duration) {
      console.log('📊 No sections found, creating estimated sections');
      enrichedData.sections = createEstimatedSections(data);
      enrichedData._metadata.sectionsEstimated = true;
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(enrichedData)
    };

  } catch (error) {
    console.error('Netlify function error:', error);
    
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

// Helper function to create estimated sections when API doesn't provide them
function createEstimatedSections(basicData) {
  const duration = parseDurationString(basicData.duration || '3:00');
  const tempo = basicData.tempo || 120;
  const loudnessBase = parseLoudnessValue(basicData.loudness || '-8 dB');
  
  // Create typical song structure sections
  return [
    {
      start: 0,
      duration: Math.round(duration * 0.1), // 10% intro
      confidence: 0.5,
      tempo: tempo * 0.95, // Slightly slower intro
      key: 0,
      mode: basicData.mode === 'major' ? 1 : 0,
      time_signature: 4,
      loudness: loudnessBase - 3,
      sectionType: 'intro'
    },
    {
      start: Math.round(duration * 0.1),
      duration: Math.round(duration * 0.25), // 25% verse
      confidence: 0.6,
      tempo: tempo,
      key: 0,
      mode: basicData.mode === 'major' ? 1 : 0,
      time_signature: 4,
      loudness: loudnessBase - 1,
      sectionType: 'verse'
    },
    {
      start: Math.round(duration * 0.35),
      duration: Math.round(duration * 0.3), // 30% chorus
      confidence: 0.7,
      tempo: tempo * 1.02, // Slightly faster chorus
      key: 0,
      mode: basicData.mode === 'major' ? 1 : 0,
      time_signature: 4,
      loudness: loudnessBase + 2,
      sectionType: 'chorus'
    },
    {
      start: Math.round(duration * 0.65),
      duration: Math.round(duration * 0.25), // 25% verse/bridge
      confidence: 0.6,
      tempo: tempo,
      key: 0,
      mode: basicData.mode === 'major' ? 1 : 0,
      time_signature: 4,
      loudness: loudnessBase,
      sectionType: 'verse'
    },
    {
      start: Math.round(duration * 0.9),
      duration: Math.round(duration * 0.1), // 10% outro
      confidence: 0.5,
      tempo: tempo * 0.9, // Slower outro
      key: 0,
      mode: basicData.mode === 'major' ? 1 : 0,
      time_signature: 4,
      loudness: loudnessBase - 4,
      sectionType: 'outro'
    }
  ];
}

// Helper function to parse duration string
function parseDurationString(duration) {
  const parts = duration.split(':');
  if (parts.length === 2) {
    return parseInt(parts[0]) * 60 + parseInt(parts[1]);
  }
  return 180; // Default 3 minutes
}

// Helper function to parse loudness value
function parseLoudnessValue(loudness) {
  const match = loudness.match(/-?\d+(\.\d+)?/);
  return match ? parseFloat(match[0]) : -8;
}