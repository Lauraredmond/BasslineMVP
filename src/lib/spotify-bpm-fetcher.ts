import { secureSpotifyService } from './spotify-secure';

export interface TrackBPMData {
  track_name: string;
  artist_name: string;
  spotify_tempo: number;
  found: boolean;
}

/**
 * Intelligent BPM fetcher that gets tempo from Spotify for any track
 * This ensures accurate workout_track mapping based on real BPM data
 */
export class SpotifyBPMFetcher {
  
  /**
   * Fetch BPM for a track from Spotify API
   */
  static async fetchBPMForTrack(trackName: string, artistName: string): Promise<TrackBPMData> {
    try {
      console.log(`🎵 Fetching BPM for: "${trackName}" by "${artistName}"`);
      
      // Search for the track
      const searchQuery = `track:"${trackName}" artist:"${artistName}"`;
      const searchResults = await secureSpotifyService.search(searchQuery, 'track', 1);
      
      if (!searchResults.tracks.items.length) {
        console.log('⚠️ Track not found on Spotify');
        return { track_name: trackName, artist_name: artistName, spotify_tempo: 0, found: false };
      }
      
      const track = searchResults.tracks.items[0];
      console.log(`✅ Found track: ${track.name} by ${track.artists[0].name}`);
      
      // Get audio features with BPM
      const audioFeatures = await secureSpotifyService.getAudioFeatures(track.id);
      
      if (!audioFeatures || !audioFeatures.tempo) {
        console.log('⚠️ No audio features/tempo available');
        return { track_name: trackName, artist_name: artistName, spotify_tempo: 0, found: false };
      }
      
      const bpm = Math.round(audioFeatures.tempo);
      console.log(`🎯 Found BPM: ${bpm} for "${trackName}"`);
      
      return {
        track_name: trackName,
        artist_name: artistName, 
        spotify_tempo: bpm,
        found: true
      };
      
    } catch (error) {
      console.error('❌ Error fetching BPM from Spotify:', error);
      return { track_name: trackName, artist_name: artistName, spotify_tempo: 0, found: false };
    }
  }
  
  /**
   * Simple BPM to workout track mapping for UI display only
   * Note: This is for display purposes only. Production mapping should use the database workout_phases table
   */
  static getWorkoutTrackFromBPM(bpm: number): string {
    if (bpm <= 0) return 'unknown';
    if (bpm < 90) return 'warmup';
    if (bpm < 120) return 'resistance';
    if (bpm < 140) return 'cardio';
    if (bpm < 160) return 'hiit';
    if (bpm < 180) return 'sprint';
    return 'peak_intensity';
  }

  /**
   * DEPRECATED: Get workout track based on BPM - Use database workout_phases table instead
   * This function is kept for reference but should not be used in production
   * All BPM->workout_track mappings should come from Supabase workout_phases table
   */
  static getWorkoutTrackFromBPM_DEPRECATED(bpm: number): string {
    console.warn('⚠️ [DEPRECATED] Using hardcoded BPM mapping - should use database workout_phases table instead');
    // Hardcoded values removed - use database lookup instead
    throw new Error('This function is deprecated - use workout_phases table from database');
  }
  
  /**
   * DEPRECATED: Get BPM ranges for a workout track - Use database workout_phases table instead
   * This function is kept for reference but should not be used in production
   * All BPM ranges should come from Supabase workout_phases.target_tempo_min/max
   */
  static getBPMRangesForWorkoutTrack_DEPRECATED(workoutTrack: string): {min: number, max: number} {
    console.warn('⚠️ [DEPRECATED] Using hardcoded BPM ranges - should use database workout_phases table instead');
    // Hardcoded values removed - use database lookup instead
    throw new Error('This function is deprecated - use workout_phases table from database');
  }
}