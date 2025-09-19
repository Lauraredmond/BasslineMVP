// Spotify API Type Definitions
// Safe interface definitions extracted from insecure spotify.ts

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

export interface CurrentTrack {
  timestamp: number;
  progress_ms: number;
  item: SpotifyTrack;
  currently_playing_type: string;
  is_playing: boolean;
}

// Utility function for track URI formatting
export const formatTrackUri = (trackId: string): string => {
  return `spotify:track:${trackId}`;
};