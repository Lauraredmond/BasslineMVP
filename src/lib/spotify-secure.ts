// Secure Spotify Service - Uses server-side proxy and secure sessions
// Replaces localStorage token storage with HTTP-only cookies

import { 
  SpotifyPlaylist, 
  SpotifyTrack, 
  SpotifyAudioFeatures, 
  CurrentTrack,
  SpotifySection,
  SpotifySegment,
  SpotifyTatum,
  SpotifyBar,
  SpotifyBeat,
  SpotifyAudioAnalysis as AudioAnalysis
} from './spotify-types';

const CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID;

// Automatically detect environment and use appropriate redirect URI
const getRedirectUri = (): string => {
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  
  if (isLocalhost) {
    return import.meta.env.VITE_SPOTIFY_REDIRECT_URI_LOCAL || 'http://localhost:5173/callback';
  } else {
    return import.meta.env.VITE_SPOTIFY_REDIRECT_URI_PROD || 'https://trybassline.netlify.app/callback';
  }
};

const REDIRECT_URI = getRedirectUri();

// PKCE helper functions for secure authentication
const generateCodeVerifier = (): string => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode.apply(null, Array.from(array)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
};

const generateCodeChallenge = async (codeVerifier: string): Promise<string> => {
  const data = new TextEncoder().encode(codeVerifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(digest))))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
};

// Call server-side Spotify proxy
const callSpotifyProxy = async (action: string, params: any = {}) => {
  console.log(`📡 [PROXY CALL] Calling spotify-proxy with action: ${action}`);
  
  const response = await fetch('/.netlify/functions/spotify-proxy', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    credentials: 'include', // Include HTTP-only cookies
    body: JSON.stringify({ action, ...params })
  });

  console.log(`📡 [PROXY CALL] Response status: ${response.status} ${response.statusText}`);

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`❌ [PROXY CALL] Spotify proxy error: ${response.status} - ${errorText}`);
    throw new Error(`Spotify proxy error: ${response.status}`);
  }

  const result = await response.json();
  console.log(`📡 [PROXY CALL] Response data:`, result);
  return result;
};

class SecureSpotifyService {
  private accessToken: string | null = null;
  private isInitialized: boolean = false;

  // Initialize service and check for existing session
  async initialize(): Promise<boolean> {
    if (this.isInitialized) return !!this.accessToken;
    
    try {
      // Try to get current user info to validate session
      const userInfo = await this.getCurrentUser();
      this.isInitialized = true;
      return !!userInfo;
    } catch (error) {
      this.isInitialized = true;
      return false;
    }
  }

  // Generate OAuth URL for user login using PKCE
  async getAuthUrl(): Promise<string> {
    const scopes = [
      'playlist-read-private',
      'playlist-read-collaborative', 
      'user-read-private',
      'user-read-email',
      'user-read-playback-state',
      'user-modify-playback-state',
      'streaming',
      'user-read-currently-playing',
      'user-read-recently-played'
    ].join(' ');

    // Generate PKCE parameters
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);
    
    // Store code verifier for later use (only place we still use localStorage)
    localStorage.setItem('spotify_code_verifier', codeVerifier);

    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      response_type: 'code',
      redirect_uri: REDIRECT_URI,
      scope: scopes,
      code_challenge_method: 'S256',
      code_challenge: codeChallenge,
      show_dialog: 'true'
    });

    return `https://accounts.spotify.com/authorize?${params}`;
  }

  // Exchange authorization code for access token using server-side proxy
  async exchangeCodeForToken(code: string): Promise<boolean> {
    try {
      console.log('🔄 [TOKEN EXCHANGE] Starting token exchange with code:', code.substring(0, 10) + '...');
      
      const codeVerifier = localStorage.getItem('spotify_code_verifier');
      if (!codeVerifier) {
        console.error('❌ [TOKEN EXCHANGE] No code verifier found in localStorage');
        throw new Error('No code verifier found');
      }

      console.log('🔑 [TOKEN EXCHANGE] Found code verifier, calling server proxy...');
      
      // Use server-side proxy for secure token exchange
      const result = await callSpotifyProxy('exchangeCode', {
        code,
        codeVerifier,
        redirectUri: REDIRECT_URI
      });

      console.log('📡 [TOKEN EXCHANGE] Server response:', result);

      if (result.success) {
        // Clean up code verifier
        localStorage.removeItem('spotify_code_verifier');
        this.isInitialized = true;
        console.log('✅ [TOKEN EXCHANGE] Token exchange successful!');
        return true;
      }
      
      console.error('❌ [TOKEN EXCHANGE] Server returned success=false');
      return false;
    } catch (error) {
      console.error('❌ [TOKEN EXCHANGE] Error exchanging code for token:', error);
      return false;
    }
  }

  // Check if user is authenticated by testing API call
  async isAuthenticated(): Promise<boolean> {
    try {
      console.log('🔍 [AUTH CHECK] Starting authentication check...');
      const user = await this.getCurrentUser();
      console.log('✅ [AUTH CHECK] Authentication successful:', user?.display_name || 'Unknown user');
      return true;
    } catch (error) {
      console.log('❌ [AUTH CHECK] Authentication failed:', error);
      return false;
    }
  }

  // Get current user info through secure proxy
  async getCurrentUser(): Promise<any> {
    try {
      // Try direct API call with session cookies
      const response = await fetch('/.netlify/functions/spotify-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          action: 'apiCall',
          endpoint: '/me'
        })
      });

      if (!response.ok) {
        throw new Error('Authentication required');
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting current user:', error);
      throw error;
    }
  }

  // Get user playlists through secure proxy
  async getPlaylists(): Promise<SpotifyPlaylist[]> {
    try {
      const response = await fetch('/.netlify/functions/spotify-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          action: 'apiCall',
          endpoint: '/me/playlists?limit=50'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to fetch playlists');
      }

      const data = await response.json();
      return data.items || [];
    } catch (error) {
      console.error('Error getting playlists:', error);
      throw error;
    }
  }

  // Get playlist tracks through secure proxy
  async getPlaylistTracks(playlistId: string): Promise<SpotifyTrack[]> {
    try {
      const response = await fetch('/.netlify/functions/spotify-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          action: 'apiCall',
          endpoint: `/playlists/${playlistId}/tracks`
        })
      });

      if (!response.ok) {
        throw new Error('Failed to fetch playlist tracks');
      }

      const data = await response.json();
      return data.items?.map((item: any) => item.track) || [];
    } catch (error) {
      console.error('Error getting playlist tracks:', error);
      throw error;
    }
  }

  // Get currently playing track through secure proxy
  async getCurrentlyPlaying(): Promise<CurrentTrack | null> {
    try {
      const response = await fetch('/.netlify/functions/spotify-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          action: 'apiCall',
          endpoint: '/me/player/currently-playing'
        })
      });

      if (response.status === 204) {
        return null; // No track currently playing
      }

      if (!response.ok) {
        throw new Error('Failed to get currently playing track');
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting currently playing track:', error);
      return null;
    }
  }

  // Logout and clear session
  async logout(): Promise<void> {
    try {
      await callSpotifyProxy('logout');
      this.accessToken = null;
      this.isInitialized = false;
      
      // Clean up any remaining localStorage items
      localStorage.removeItem('spotify_code_verifier');
      
      console.log('Logged out successfully');
    } catch (error) {
      console.error('Error during logout:', error);
    }
  }

  // Get available devices through secure proxy
  async getDevices(): Promise<any[]> {
    try {
      const response = await fetch('/.netlify/functions/spotify-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          action: 'apiCall',
          endpoint: '/me/player/devices'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get devices');
      }

      const data = await response.json();
      return data.devices || [];
    } catch (error) {
      console.error('Error getting devices:', error);
      return [];
    }
  }

  // Alias for getDevices
  getAvailableDevices = () => this.getDevices();

  // Start playlist playback through secure proxy
  async startPlaylistPlayback(playlistId: string, deviceId?: string): Promise<boolean> {
    try {
      const body: any = {
        action: 'apiCall',
        endpoint: '/me/player/play',
        method: 'PUT',
        body: {
          context_uri: `spotify:playlist:${playlistId}`
        }
      };

      if (deviceId) {
        body.body.device_id = deviceId;
      }

      const response = await fetch('/.netlify/functions/spotify-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body)
      });

      return response.ok;
    } catch (error) {
      console.error('Error starting playlist playback:', error);
      return false;
    }
  }

  // Get current playback state (alias for getCurrentlyPlaying)
  async getCurrentPlayback(): Promise<any> {
    return this.getCurrentlyPlaying();
  }

  // Get user playlists (alias for getPlaylists)
  async getUserPlaylists(): Promise<SpotifyPlaylist[]> {
    return this.getPlaylists();
  }

  // Playback control methods
  async startPlayback(options: { device_id?: string } = {}): Promise<boolean> {
    try {
      const body: any = {
        action: 'apiCall',
        endpoint: '/me/player/play',
        method: 'PUT',
        body: {}
      };

      if (options.device_id) {
        body.body.device_id = options.device_id;
      }

      const response = await fetch('/.netlify/functions/spotify-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body)
      });

      return response.ok;
    } catch (error) {
      console.error('Error starting playback:', error);
      return false;
    }
  }

  async pausePlayback(deviceId?: string): Promise<boolean> {
    try {
      const body: any = {
        action: 'apiCall',
        endpoint: '/me/player/pause',
        method: 'PUT',
        body: {}
      };

      if (deviceId) {
        body.body.device_id = deviceId;
      }

      const response = await fetch('/.netlify/functions/spotify-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body)
      });

      return response.ok;
    } catch (error) {
      console.error('Error pausing playback:', error);
      return false;
    }
  }

  async skipToNext(deviceId?: string): Promise<boolean> {
    try {
      const body: any = {
        action: 'apiCall',
        endpoint: '/me/player/next',
        method: 'POST',
        body: {}
      };

      if (deviceId) {
        body.body.device_id = deviceId;
      }

      const response = await fetch('/.netlify/functions/spotify-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body)
      });

      return response.ok;
    } catch (error) {
      console.error('Error skipping to next:', error);
      return false;
    }
  }

  async skipToPrevious(deviceId?: string): Promise<boolean> {
    try {
      const body: any = {
        action: 'apiCall',
        endpoint: '/me/player/previous', 
        method: 'POST',
        body: {}
      };

      if (deviceId) {
        body.body.device_id = deviceId;
      }

      const response = await fetch('/.netlify/functions/spotify-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body)
      });

      return response.ok;
    } catch (error) {
      console.error('Error skipping to previous:', error);
      return false;
    }
  }

  async playTrackFromPlaylist(playlistId: string, trackOffset: number, deviceId?: string): Promise<boolean> {
    try {
      const body: any = {
        action: 'apiCall',
        endpoint: '/me/player/play',
        method: 'PUT',
        body: {
          context_uri: `spotify:playlist:${playlistId}`,
          offset: { position: trackOffset }
        }
      };

      if (deviceId) {
        body.body.device_id = deviceId;
      }

      const response = await fetch('/.netlify/functions/spotify-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body)
      });

      return response.ok;
    } catch (error) {
      console.error('Error playing track from playlist:', error);
      return false;
    }
  }

  // Get audio features for tracks through secure proxy
  async getAudioFeatures(trackIds: string[]): Promise<SpotifyAudioFeatures[]> {
    try {
      const response = await fetch('/.netlify/functions/spotify-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          action: 'apiCall',
          endpoint: `/audio-features?ids=${trackIds.join(',')}`
        })
      });

      if (!response.ok) {
        if (response.status === 403) {
          console.log('ℹ️ [AUDIO FEATURES] API access restricted by Spotify - using fallback');
          return [];
        }
        throw new Error('Failed to get audio features');
      }

      const data = await response.json();
      return data.audio_features || [];
    } catch (error) {
      console.error('Error getting audio features:', error);
      return [];
    }
  }

  // Get audio analysis for a track through secure proxy
  async getAudioAnalysis(trackId: string): Promise<AudioAnalysis | null> {
    try {
      const response = await fetch('/.netlify/functions/spotify-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          action: 'apiCall',
          endpoint: `/audio-analysis/${trackId}`
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get audio analysis');
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting audio analysis:', error);
      return null;
    }
  }

  // Legacy compatibility methods - delegate to secure implementations
  validateToken = () => this.isAuthenticated();
  refreshAccessToken = async () => true; // Handled server-side now
}

// Export singleton instance
export const secureSpotifyService = new SecureSpotifyService();

// Export for backward compatibility during transition
export default secureSpotifyService;