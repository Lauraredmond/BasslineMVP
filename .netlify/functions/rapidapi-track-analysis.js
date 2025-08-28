// Netlify Function: Secure RapidAPI Track Analysis
// This function handles RapidAPI calls server-side to protect API keys
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
    const { song, artist } = event.queryStringParameters || {};

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

    console.log(`🎯 RapidAPI request: "${song}" by "${artist || 'Unknown'}"`);

    // Prepare request parameters
    const params = new URLSearchParams({ song });
    if (artist) params.append('artist', artist);

    const url = `https://${rapidApiHost}/pktx/analysis?${params}`;
    
    // Make the secure API call
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': rapidApiKey,
        'X-RapidAPI-Host': rapidApiHost
      }
    });

    // Check if request was successful
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`RapidAPI error: ${response.status} - ${errorText}`);
      
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({
          error: 'RapidAPI request failed',
          status: response.status,
          details: errorText
        })
      };
    }

    // Parse and return the response
    const data = await response.json();
    console.log(`✅ RapidAPI success for: "${song}"`);

    // Add metadata about the request
    const enrichedData = {
      ...data,
      _metadata: {
        source: 'RapidAPI via Netlify Function',
        timestamp: new Date().toISOString(),
        song,
        artist: artist || null,
        fromCache: false
      }
    };

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