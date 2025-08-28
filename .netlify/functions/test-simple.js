// Simple test function to verify function deployment works
exports.handler = async (event, context) => {
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

  try {
    // Test basic functionality
    const testData = {
      success: true,
      message: 'Netlify functions are working!',
      timestamp: new Date().toISOString(),
      method: event.httpMethod,
      url: event.path,
      query: event.queryStringParameters || {},
      environment: {
        hasSupabaseUrl: !!process.env.VITE_SUPABASE_URL || !!process.env.SUPABASE_URL,
        hasSupabaseKey: !!process.env.SUPABASE_ANON_KEY || !!process.env.VITE_SUPABASE_ANON_KEY,
        nodeVersion: process.version
      }
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(testData, null, 2)
    };

  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
};