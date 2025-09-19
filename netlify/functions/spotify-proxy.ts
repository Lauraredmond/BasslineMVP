// Secure Spotify API Proxy - Server-side token handling
// Keeps client secrets and OAuth tokens on server only

import { Handler } from '@netlify/functions';

const CLIENT_ID = process.env.VITE_SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json'
};

// Server-side token exchange for OAuth
const exchangeCodeForTokens = async (code: string, codeVerifier: string, redirectUri: string) => {
  const tokenEndpoint = 'https://accounts.spotify.com/api/token';
  
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    client_id: CLIENT_ID!,
    client_secret: CLIENT_SECRET!,
    code_verifier: codeVerifier
  });

  const response = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: body.toString()
  });

  if (!response.ok) {
    throw new Error(`Token exchange failed: ${response.status}`);
  }

  return await response.json();
};

// Server-side token refresh
const refreshAccessToken = async (refreshToken: string) => {
  const tokenEndpoint = 'https://accounts.spotify.com/api/token';
  
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: CLIENT_ID!,
    client_secret: CLIENT_SECRET!
  });

  const response = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: body.toString()
  });

  if (!response.ok) {
    throw new Error(`Token refresh failed: ${response.status}`);
  }

  return await response.json();
};

// Proxy Spotify API calls with server-side token
const makeSpotifyApiCall = async (endpoint: string, accessToken: string, method = 'GET', body?: any) => {
  const url = `https://api.spotify.com/v1${endpoint}`;
  
  const options: RequestInit = {
    method,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  };

  if (body && method !== 'GET') {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  
  if (!response.ok) {
    throw new Error(`Spotify API call failed: ${response.status} ${response.statusText}`);
  }

  return await response.json();
};

export const handler: Handler = async (event, context) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: ''
    };
  }

  try {
    if (!CLIENT_ID || !CLIENT_SECRET) {
      return {
        statusCode: 500,
        headers: CORS_HEADERS,
        body: JSON.stringify({ 
          error: 'Server configuration error',
          message: 'Missing Spotify credentials'
        })
      };
    }

    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Method not allowed' })
      };
    }

    const { action, ...params } = JSON.parse(event.body || '{}');

    switch (action) {
      case 'exchangeCode':
        const { code, codeVerifier, redirectUri } = params;
        if (!code || !codeVerifier || !redirectUri) {
          return {
            statusCode: 400,
            headers: CORS_HEADERS,
            body: JSON.stringify({ error: 'Missing required parameters for token exchange' })
          };
        }
        
        const tokens = await exchangeCodeForTokens(code, codeVerifier, redirectUri);
        
        // Return tokens in secure HTTP-only cookie format
        const cookieOptions = [
          'HttpOnly',
          'Secure',
          'SameSite=Strict',
          `Max-Age=${tokens.expires_in}`,
          'Path=/'
        ].join('; ');

        return {
          statusCode: 200,
          headers: {
            ...CORS_HEADERS,
            'Set-Cookie': [
              `spotify_access_token=${tokens.access_token}; ${cookieOptions}`,
              `spotify_refresh_token=${tokens.refresh_token}; ${cookieOptions.replace(`Max-Age=${tokens.expires_in}`, 'Max-Age=2592000')}` // 30 days for refresh token
            ]
          },
          body: JSON.stringify({ 
            success: true,
            expires_in: tokens.expires_in,
            scope: tokens.scope
          })
        };

      case 'refreshToken':
        const { refreshToken } = params;
        if (!refreshToken) {
          return {
            statusCode: 400,
            headers: CORS_HEADERS,
            body: JSON.stringify({ error: 'Missing refresh token' })
          };
        }
        
        const refreshedTokens = await refreshAccessToken(refreshToken);
        
        return {
          statusCode: 200,
          headers: CORS_HEADERS,
          body: JSON.stringify({
            access_token: refreshedTokens.access_token,
            expires_in: refreshedTokens.expires_in,
            scope: refreshedTokens.scope
          })
        };

      case 'apiCall':
        const { endpoint, accessToken, method = 'GET', body } = params;
        if (!endpoint || !accessToken) {
          return {
            statusCode: 400,
            headers: CORS_HEADERS,
            body: JSON.stringify({ error: 'Missing endpoint or access token' })
          };
        }
        
        const apiResponse = await makeSpotifyApiCall(endpoint, accessToken, method, body);
        
        return {
          statusCode: 200,
          headers: CORS_HEADERS,
          body: JSON.stringify(apiResponse)
        };

      case 'logout':
        return {
          statusCode: 200,
          headers: {
            ...CORS_HEADERS,
            'Set-Cookie': [
              'spotify_access_token=; HttpOnly; Secure; SameSite=Strict; Max-Age=0; Path=/',
              'spotify_refresh_token=; HttpOnly; Secure; SameSite=Strict; Max-Age=0; Path=/'
            ]
          },
          body: JSON.stringify({ success: true, message: 'Logged out successfully' })
        };

      default:
        return {
          statusCode: 400,
          headers: CORS_HEADERS,
          body: JSON.stringify({ error: `Unknown action: ${action}` })
        };
    }

  } catch (error) {
    console.error('Spotify proxy error:', error);
    
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ 
        error: 'Server error',
        message: process.env.NODE_ENV === 'development' ? (error as Error).message : 'Internal server error'
      })
    };
  }
};