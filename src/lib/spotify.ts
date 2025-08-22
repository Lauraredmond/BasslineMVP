// Spotify Web API integration for Bassline Fitness
// Using Authorization Code with PKCE flow for secure frontend authentication

import { rapidSoundnetService } from './rapid-soundnet';
import { trackAnalysisCache } from './track-analysis-cache';

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

export interface SpotifyPlaylist {
  id: string;
  name: string;
  tracks: {
    total: number;
  };
  description?: string;
  images?: Array<{
    url: string;
  }>;
}

export interface SpotifyTrack {
  id: string;
  name: string;
  artists: Array<{
    name: string;
  }>;
  duration_ms: number;
  preview_url?: string;
  audio_features?: SpotifyAudioFeatures;
}

export interface SpotifyAudioFeatures {
  danceability: number;
  energy: number;
  key: number;
  loudness: number;
  mode: number;
  speechiness: number;
  acousticness: number;
  instrumentalness: number;
  liveness: number;
  valence: number;
  tempo: number;
  time_signature: number;
}

// Advanced Audio Analysis interfaces
export interface SpotifySection {
  start: number;
  duration: number;
  confidence: number;
  loudness: number;
  tempo: number;
  tempo_confidence: number;
  key: number;
  key_confidence: number;
  mode: number;
  mode_confidence: number;
  time_signature: number;
  time_signature_confidence: number;
}

export interface SpotifySegment {
  start: number;
  duration: number;
  confidence: number;
  loudness_start: number;
  loudness_max_time: number;
  loudness_max: number;
  loudness_end: number;
  pitches: number[];
  timbre: number[];
}

export interface SpotifyBar {
  start: number;
  duration: number;
  confidence: number;
}

export interface SpotifyBeat {
  start: number;
  duration: number;
  confidence: number;
}

export interface SpotifyTatum {
  start: number;
  duration: number;
  confidence: number;
}

export interface SpotifyAudioAnalysis {
  bars: SpotifyBar[];
  beats: SpotifyBeat[];
  sections: SpotifySection[];
  segments: SpotifySegment[];
  tatums: SpotifyTatum[];
  meta: {
    analyzer_version: string;
    platform: string;
    detailed_status: string;
    status_code: number;
    timestamp: number;
    analysis_time: number;
    input_process: string;
  };
  track: {
    num_samples: number;
    duration: number;
    sample_md5: string;
    offset_seconds: number;
    window_seconds: number;
    analysis_sample_rate: number;
    analysis_channels: number;
    end_of_fade_in: number;
    start_of_fade_out: number;
    loudness: number;
    tempo: number;
    tempo_confidence: number;
    time_signature: number;
    time_signature_confidence: number;
    key: number;
    key_confidence: number;
    mode: number;
    mode_confidence: number;
  };
}

export interface SpotifyDevice {
  id: string;
  is_active: boolean;
  is_private_session: boolean;
  is_restricted: boolean;
  name: string;
  type: string;
  volume_percent: number;
}

export interface SpotifyPlaybackState {
  device: SpotifyDevice;
  shuffle_state: boolean;
  repeat_state: string;
  timestamp: number;
  context: any;
  progress_ms: number;
  item: SpotifyTrack;
  currently_playing_type: string;
  is_playing: boolean;
}

class SpotifyService {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  constructor() {
    // Check for tokens in localStorage on initialization
    this.accessToken = localStorage.getItem('spotify_access_token');
    this.refreshToken = localStorage.getItem('spotify_refresh_token');
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
    
    // Store code verifier for later use
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

  // Exchange authorization code for access token using PKCE
  async exchangeCodeForToken(code: string): Promise<boolean> {
    try {
      const codeVerifier = localStorage.getItem('spotify_code_verifier');
      if (!codeVerifier) {
        throw new Error('No code verifier found');
      }

      const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          client_id: CLIENT_ID,
          grant_type: 'authorization_code',
          code: code,
          redirect_uri: REDIRECT_URI,
          code_verifier: codeVerifier
        })
      });

      const data = await response.json();
      
      if (data.access_token) {
        this.accessToken = data.access_token;
        this.refreshToken = data.refresh_token;
        
        // Store tokens in localStorage
        localStorage.setItem('spotify_access_token', this.accessToken);
        if (this.refreshToken) {
          localStorage.setItem('spotify_refresh_token', this.refreshToken);
        }
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error exchanging code for token:', error);
      return false;
    }
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return !!this.accessToken;
  }

  // Validate current access token by making a simple API call
  async validateToken(): Promise<boolean> {
    if (!this.accessToken) {
      console.log('🚨 No access token to validate');
      return false;
    }

    try {
      console.log('🔍 Validating Spotify access token...');
      const response = await fetch('https://api.spotify.com/v1/me', {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });

      console.log('🔍 Token validation response:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });

      if (response.ok) {
        const userData = await response.json();
        console.log('✅ Token is valid! User:', {
          id: userData.id,
          display_name: userData.display_name,
          product: userData.product
        });
        return true;
      } else {
        console.error('❌ Token validation failed:', {
          status: response.status,
          statusText: response.statusText
        });
        
        if (response.status === 401) {
          console.log('🔄 Token expired, clearing stored token');
          this.accessToken = null;
          localStorage.removeItem('spotify_access_token');
          localStorage.removeItem('spotify_refresh_token');
        }
        return false;
      }
    } catch (error) {
      console.error('💥 Token validation exception:', error);
      return false;
    }
  }

  // Get current user's playlists
  async getUserPlaylists(): Promise<SpotifyPlaylist[]> {
    if (!this.accessToken) {
      throw new Error('Not authenticated');
    }

    try {
      const response = await fetch('https://api.spotify.com/v1/me/playlists?limit=50', {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });

      if (response.status === 401) {
        // Token expired, try to refresh
        await this.refreshAccessToken();
        return this.getUserPlaylists(); // Retry
      }

      const data = await response.json();
      return data.items || [];
    } catch (error) {
      console.error('Error fetching playlists:', error);
      return [];
    }
  }

  // Get tracks from a specific playlist with audio features
  async getPlaylistTracks(playlistId: string): Promise<SpotifyTrack[]> {
    if (!this.accessToken) {
      throw new Error('Not authenticated');
    }

    try {
      const response = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });

      const data = await response.json();
      const tracks = data.items?.map((item: any) => item.track) || [];
      
      // Get audio features for all tracks
      const tracksWithFeatures = await this.enhanceTracksWithAudioFeatures(tracks);
      return tracksWithFeatures;
    } catch (error) {
      console.error('Error fetching playlist tracks:', error);
      return [];
    }
  }

  // Get audio features for tracks
  async getAudioFeatures(trackIds: string[]): Promise<SpotifyAudioFeatures[]> {
    if (!this.accessToken || trackIds.length === 0) {
      console.log('🚨 getAudioFeatures: Missing access token or empty trackIds', {
        hasAccessToken: !!this.accessToken,
        trackIdsLength: trackIds.length,
        trackIds
      });
      return [];
    }

    try {
      console.log('🎯 Making Audio Features API request:', {
        url: `https://api.spotify.com/v1/audio-features?ids=${trackIds.join(',')}`,
        trackIds,
        hasToken: !!this.accessToken
      });
      
      const response = await fetch(`https://api.spotify.com/v1/audio-features?ids=${trackIds.join(',')}`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });

      console.log('📡 Audio Features API response status:', response.status, response.statusText);
      
      if (!response.ok) {
        console.error('❌ Audio Features API error response:', {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries())
        });
        
        const errorText = await response.text();
        console.error('❌ Audio Features API error body:', errorText);
        return [];
      }

      const data = await response.json();
      console.log('📊 Audio Features API raw data:', data);
      
      const features = data.audio_features || [];
      console.log('🔍 Parsed audio features:', {
        count: features.length,
        features: features.map(f => f ? {
          id: f.id,
          tempo: f.tempo,
          key: f.key,
          danceability: f.danceability,
          energy: f.energy
        } : null)
      });
      
      return features;
    } catch (error) {
      console.error('💥 Audio Features API exception:', error);
      console.error('💥 Exception details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      return [];
    }
  }

  // Get detailed audio analysis with sections, segments, bars, beats
  async getAudioAnalysis(trackId: string): Promise<SpotifyAudioAnalysis | null> {
    if (!this.accessToken) {
      throw new Error('Not authenticated');
    }

    try {
      const response = await fetch(`https://api.spotify.com/v1/audio-analysis/${trackId}`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });

      if (response.status === 401) {
        // Token expired, try to refresh
        await this.refreshAccessToken();
        return this.getAudioAnalysis(trackId); // Retry
      }

      if (!response.ok) {
        console.error('Audio analysis request failed:', response.status, response.statusText);
        return null;
      }

      const analysis = await response.json();
      console.log('🎵 Received audio analysis:', {
        bars: analysis.bars?.length || 0,
        beats: analysis.beats?.length || 0,
        sections: analysis.sections?.length || 0,
        segments: analysis.segments?.length || 0,
        duration: analysis.track?.duration || 0
      });

      return analysis;
    } catch (error) {
      console.error('Error fetching audio analysis:', error);
      return null;
    }
  }

  // Enhance tracks with audio features using Spotify API + Rapid Soundnet fallback
  private async enhanceTracksWithAudioFeatures(tracks: SpotifyTrack[]): Promise<SpotifyTrack[]> {
    const validTracks = tracks.filter(track => track && track.id);
    if (validTracks.length === 0) return tracks;
    
    const trackIds = validTracks.map(track => track.id);
    const audioFeatures = await this.getAudioFeatures(trackIds);
    
    // Enhanced tracks with Spotify audio features first, then Rapid Soundnet fallback
    const enhancedTracks = await Promise.all(validTracks.map(async (track, index) => {
      let audio_features = audioFeatures[index];
      let rapidSoundnetMetadata = null;
      
      // If Spotify audio features failed, try Rapid Soundnet
      if (!audio_features) {
        console.log(`⚠️ No Spotify audio features for: ${track.name} by ${track.artists?.[0]?.name}`);
        const rapidResult = await this.getRapidSoundnetAudioFeatures(track.name, track.artists?.[0]?.name);
        audio_features = rapidResult.audioFeatures;
        
        // Store metadata for research lab
        if (rapidResult.rapidSoundnetData) {
          rapidSoundnetMetadata = {
            ...rapidResult,
            // Convert raw data for logging
            rapidSoundnetData: {
              key: rapidResult.rapidSoundnetData.key,
              mode: rapidResult.rapidSoundnetData.mode,
              camelot: rapidResult.rapidSoundnetData.camelot,
              happiness: rapidResult.rapidSoundnetData.happiness,
              popularity: rapidResult.rapidSoundnetData.popularity,
              duration: rapidResult.rapidSoundnetData.duration,
              loudness: rapidResult.rapidSoundnetData.loudness,
              energy_raw: rapidResult.rapidSoundnetData.energy,
              danceability_raw: rapidResult.rapidSoundnetData.danceability,
              acousticness_raw: rapidResult.rapidSoundnetData.acousticness,
              instrumentalness_raw: rapidResult.rapidSoundnetData.instrumentalness,
              speechiness_raw: rapidResult.rapidSoundnetData.speechiness,
              liveness_raw: rapidResult.rapidSoundnetData.liveness
            }
          };
        }
      }
      
      return {
        ...track,
        audio_features: audio_features || undefined,
        // Add metadata for research lab integration
        _rapidSoundnetMetadata: rapidSoundnetMetadata
      };
    }));
    
    return enhancedTracks;
  }

  // Get audio features from Rapid Soundnet API (with caching) - returns both Spotify format and metadata
  private async getRapidSoundnetAudioFeatures(trackName: string, artistName?: string): Promise<{
    audioFeatures: SpotifyAudioFeatures | null;
    rapidSoundnetData?: any;
    dataSource?: string;
    fromCache?: boolean;
    fallbackType?: string;
    detectedGenre?: string;
    apiRequestsUsed?: number;
  }> {
    try {
      const usage = rapidSoundnetService.getRequestUsage();
      
      // Check cache first
      const cached = trackAnalysisCache.getCached(trackName, artistName);
      if (cached) {
        console.log('📚 Using cached Rapid Soundnet data for:', trackName);
        const audioFeatures = rapidSoundnetService.convertToSpotifyAudioFeatures(cached);
        return {
          audioFeatures,
          rapidSoundnetData: cached,
          dataSource: 'rapidapi',
          fromCache: true,
          fallbackType: 'cache',
          apiRequestsUsed: usage.used
        };
      }

      // Check if we can make a request
      if (!rapidSoundnetService.canMakeRequest()) {
        console.warn(`⚠️ Rapid Soundnet API limit reached (${usage.used}/${3}). Next reset: ${rapidSoundnetService.getTimeUntilReset()}`);
        
        // Try intelligent fallback
        const analysis = await rapidSoundnetService.getTrackAnalysis(trackName, artistName, true);
        if (analysis) {
          const audioFeatures = rapidSoundnetService.convertToSpotifyAudioFeatures(analysis);
          return {
            audioFeatures,
            rapidSoundnetData: analysis,
            dataSource: 'fallback',
            fromCache: false,
            fallbackType: 'intelligent',
            detectedGenre: this.detectGenreFromName(trackName, artistName),
            apiRequestsUsed: usage.used
          };
        }
        
        return { audioFeatures: null };
      }

      // Make API request
      console.log('🎯 Fetching from Rapid Soundnet API:', trackName, 'by', artistName);
      const analysis = await rapidSoundnetService.getTrackAnalysis(trackName, artistName);
      
      if (analysis) {
        // Cache the result
        trackAnalysisCache.setCached(trackName, analysis, artistName, 'rapidapi');
        
        // Convert to Spotify format
        const audioFeatures = rapidSoundnetService.convertToSpotifyAudioFeatures(analysis);
        console.log('✅ Rapid Soundnet analysis converted to Spotify format:', {
          track: trackName,
          tempo: audioFeatures.tempo,
          key: audioFeatures.key,
          energy: audioFeatures.energy,
          danceability: audioFeatures.danceability
        });
        
        const newUsage = rapidSoundnetService.getRequestUsage();
        return {
          audioFeatures,
          rapidSoundnetData: analysis,
          dataSource: 'rapidapi',
          fromCache: false,
          fallbackType: 'api',
          apiRequestsUsed: newUsage.used
        };
      }
      
      return { audioFeatures: null };
    } catch (error) {
      console.error('💥 Error getting Rapid Soundnet audio features:', error);
      return { audioFeatures: null };
    }
  }

  // Simple genre detection helper
  private detectGenreFromName(trackName: string, artistName?: string): string {
    const text = `${trackName} ${artistName || ''}`.toLowerCase();
    
    if (text.includes('remix') || text.includes('dance') || text.includes('electronic') || text.includes('edm')) return 'electronic';
    if (text.includes('acoustic') || text.includes('folk') || text.includes('unplugged')) return 'acoustic';
    if (text.includes('rock') || text.includes('metal') || text.includes('punk')) return 'rock';
    if (text.includes('rap') || text.includes('hip hop') || text.includes('trap')) return 'hip-hop';
    if (text.includes('pop') || text.includes('hit') || text.includes('single')) return 'pop';
    
    return 'unknown';
  }

  // Refresh access token using PKCE
  private async refreshAccessToken(): Promise<void> {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          client_id: CLIENT_ID,
          grant_type: 'refresh_token',
          refresh_token: this.refreshToken
        })
      });

      const data = await response.json();
      
      if (data.access_token) {
        this.accessToken = data.access_token;
        localStorage.setItem('spotify_access_token', this.accessToken);
        
        if (data.refresh_token) {
          this.refreshToken = data.refresh_token;
          localStorage.setItem('spotify_refresh_token', this.refreshToken);
        }
      }
    } catch (error) {
      console.error('Error refreshing token:', error);
      this.logout();
    }
  }

  // Logout user
  logout(): void {
    this.accessToken = null;
    this.refreshToken = null;
    localStorage.removeItem('spotify_access_token');
    localStorage.removeItem('spotify_refresh_token');
    localStorage.removeItem('spotify_pkce_verifier');
    console.log('🚪 Cleared all Spotify tokens - please re-authenticate');
  }

  // Get current user profile
  async getCurrentUser(): Promise<any> {
    if (!this.accessToken) {
      throw new Error('Not authenticated');
    }

    try {
      const response = await fetch('https://api.spotify.com/v1/me', {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });

      return await response.json();
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  }

  // Get available devices
  async getAvailableDevices(): Promise<SpotifyDevice[]> {
    if (!this.accessToken) {
      throw new Error('Not authenticated');
    }

    try {
      const response = await fetch('https://api.spotify.com/v1/me/player/devices', {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });

      const data = await response.json();
      return data.devices || [];
    } catch (error) {
      console.error('Error fetching devices:', error);
      return [];
    }
  }

  // Get current playback state
  async getCurrentPlayback(): Promise<SpotifyPlaybackState | null> {
    if (!this.accessToken) {
      throw new Error('Not authenticated');
    }

    try {
      const response = await fetch('https://api.spotify.com/v1/me/player', {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });

      if (response.status === 204) {
        return null; // No active device
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching playback state:', error);
      return null;
    }
  }

  // Start/Resume playback
  async startPlayback(options?: {
    device_id?: string;
    context_uri?: string;
    uris?: string[];
    offset?: { position?: number; uri?: string };
    position_ms?: number;
  }): Promise<boolean> {
    if (!this.accessToken) {
      throw new Error('Not authenticated');
    }

    try {
      const url = options?.device_id 
        ? `https://api.spotify.com/v1/me/player/play?device_id=${options.device_id}`
        : 'https://api.spotify.com/v1/me/player/play';

      const body: any = {};
      if (options?.context_uri) body.context_uri = options.context_uri;
      if (options?.uris) body.uris = options.uris;
      if (options?.offset) body.offset = options.offset;
      if (options?.position_ms) body.position_ms = options.position_ms;

      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: Object.keys(body).length > 0 ? JSON.stringify(body) : undefined
      });

      return response.status === 204;
    } catch (error) {
      console.error('Error starting playback:', error);
      return false;
    }
  }

  // Pause playback
  async pausePlayback(device_id?: string): Promise<boolean> {
    if (!this.accessToken) {
      throw new Error('Not authenticated');
    }

    try {
      const url = device_id 
        ? `https://api.spotify.com/v1/me/player/pause?device_id=${device_id}`
        : 'https://api.spotify.com/v1/me/player/pause';

      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });

      return response.status === 204;
    } catch (error) {
      console.error('Error pausing playback:', error);
      return false;
    }
  }

  // Skip to next track
  async skipToNext(device_id?: string): Promise<boolean> {
    if (!this.accessToken) {
      throw new Error('Not authenticated');
    }

    try {
      const url = device_id 
        ? `https://api.spotify.com/v1/me/player/next?device_id=${device_id}`
        : 'https://api.spotify.com/v1/me/player/next';

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });

      return response.status === 204;
    } catch (error) {
      console.error('Error skipping to next:', error);
      return false;
    }
  }

  // Skip to previous track
  async skipToPrevious(device_id?: string): Promise<boolean> {
    if (!this.accessToken) {
      throw new Error('Not authenticated');
    }

    try {
      const url = device_id 
        ? `https://api.spotify.com/v1/me/player/previous?device_id=${device_id}`
        : 'https://api.spotify.com/v1/me/player/previous';

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });

      return response.status === 204;
    } catch (error) {
      console.error('Error skipping to previous:', error);
      return false;
    }
  }

  // Set volume
  async setVolume(volume: number, device_id?: string): Promise<boolean> {
    if (!this.accessToken) {
      throw new Error('Not authenticated');
    }

    try {
      const url = device_id 
        ? `https://api.spotify.com/v1/me/player/volume?volume_percent=${volume}&device_id=${device_id}`
        : `https://api.spotify.com/v1/me/player/volume?volume_percent=${volume}`;

      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });

      return response.status === 204;
    } catch (error) {
      console.error('Error setting volume:', error);
      return false;
    }
  }

  // Start playlist playback (with better error handling)
  async startPlaylistPlayback(playlistId: string, device_id?: string): Promise<boolean> {
    try {
      // First try to transfer playback to the device if specified
      if (device_id) {
        await this.transferPlayback(device_id);
        // Small delay to let transfer complete
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      return this.startPlayback({
        context_uri: `spotify:playlist:${playlistId}`,
        device_id
      });
    } catch (error) {
      console.error('Error starting playlist:', error);
      return false;
    }
  }
  
  // Transfer playback to specific device
  async transferPlayback(device_id: string, play: boolean = false): Promise<boolean> {
    if (!this.accessToken) {
      throw new Error('Not authenticated');
    }

    try {
      const response = await fetch('https://api.spotify.com/v1/me/player', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          device_ids: [device_id],
          play
        })
      });

      return response.status === 204;
    } catch (error) {
      console.error('Error transferring playback:', error);
      return false;
    }
  }

  // Play specific track from playlist
  async playTrackFromPlaylist(playlistId: string, trackUri: string, device_id?: string): Promise<boolean> {
    return this.startPlayback({
      context_uri: `spotify:playlist:${playlistId}`,
      offset: { uri: trackUri },
      device_id
    });
  }

  // Get Rapid Soundnet API usage info
  getRapidSoundnetUsage() {
    return rapidSoundnetService.getRequestUsage();
  }

  // Get track analysis cache stats
  getCacheStats() {
    return trackAnalysisCache.getStats();
  }

  // Force refresh track with Rapid Soundnet (for testing/manual override)
  async forceRapidSoundnetAnalysis(trackName: string, artistName?: string): Promise<SpotifyAudioFeatures | null> {
    return this.getRapidSoundnetAudioFeatures(trackName, artistName);
  }
}

export const spotifyService = new SpotifyService();

// Utility function to format track URI
export const formatTrackUri = (trackId: string): string => `spotify:track:${trackId}`;

// Utility function to format playlist URI 
export const formatPlaylistUri = (playlistId: string): string => `spotify:playlist:${playlistId}`;