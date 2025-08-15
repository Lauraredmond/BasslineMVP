// Spotify Web API integration for Bassline Fitness

const CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = import.meta.env.VITE_SPOTIFY_CLIENT_SECRET;

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

  // Generate OAuth URL for user login
  getAuthUrl(): string {
    const scopes = [
      'playlist-read-private',
      'playlist-read-collaborative', 
      'user-read-private',
      'user-read-email',
      'user-read-playback-state',
      'user-modify-playback-state',
      'streaming'
    ].join(' ');

    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      response_type: 'code',
      redirect_uri: REDIRECT_URI,
      scope: scopes,
      show_dialog: 'true'
    });

    return `https://accounts.spotify.com/authorize?${params}`;
  }

  // Exchange authorization code for access token
  async exchangeCodeForToken(code: string): Promise<boolean> {
    try {
      const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': 'Basic ' + btoa(CLIENT_ID + ':' + CLIENT_SECRET)
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code: code,
          redirect_uri: REDIRECT_URI
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
      return [];
    }

    try {
      const response = await fetch(`https://api.spotify.com/v1/audio-features?ids=${trackIds.join(',')}`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });

      const data = await response.json();
      return data.audio_features || [];
    } catch (error) {
      console.error('Error fetching audio features:', error);
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

  // Enhance tracks with audio features
  private async enhanceTracksWithAudioFeatures(tracks: SpotifyTrack[]): Promise<SpotifyTrack[]> {
    const validTracks = tracks.filter(track => track && track.id);
    if (validTracks.length === 0) return tracks;
    
    const trackIds = validTracks.map(track => track.id);
    const audioFeatures = await this.getAudioFeatures(trackIds);
    
    return validTracks.map((track, index) => ({
      ...track,
      audio_features: audioFeatures[index] || undefined
    }));
  }

  // Refresh access token
  private async refreshAccessToken(): Promise<void> {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': 'Basic ' + btoa(CLIENT_ID + ':' + CLIENT_SECRET)
        },
        body: new URLSearchParams({
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
}

export const spotifyService = new SpotifyService();

// Utility function to format track URI
export const formatTrackUri = (trackId: string): string => `spotify:track:${trackId}`;

// Utility function to format playlist URI 
export const formatPlaylistUri = (playlistId: string): string => `spotify:playlist:${playlistId}`;