import { spotifyService } from './spotify';

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
      const searchResults = await spotifyService.search(searchQuery, 'track', 1);
      
      if (!searchResults.tracks.items.length) {
        console.log('⚠️ Track not found on Spotify');
        return { track_name: trackName, artist_name: artistName, spotify_tempo: 0, found: false };
      }
      
      const track = searchResults.tracks.items[0];
      console.log(`✅ Found track: ${track.name} by ${track.artists[0].name}`);
      
      // Get audio features with BPM
      const audioFeatures = await spotifyService.getAudioFeatures(track.id);
      
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
   * Get workout track based on BPM using the same logic as AnimatedPTNarrative
   */
  static getWorkoutTrackFromBPM(bpm: number): string {
    if (bpm >= 160) return 'sprint_intervals';
    if (bpm >= 140) return 'sprint_intervals';
    if (bpm >= 120) return 'jumps';
    if (bpm >= 95) return 'hills';
    if (bpm >= 85) return 'resistance';
    if (bpm >= 80) return 'climb';
    if (bpm >= 70) return 'warmup';
    if (bpm >= 60) return 'cooldown';
    return 'recovery';
  }
  
  /**
   * Get BPM ranges for a workout track
   */
  static getBPMRangesForWorkoutTrack(workoutTrack: string): {min: number, max: number} {
    switch (workoutTrack) {
      case 'sprint_intervals': return {min: 140, max: 200};
      case 'jumps': return {min: 120, max: 139};
      case 'hills': return {min: 95, max: 119};
      case 'resistance': return {min: 85, max: 94};
      case 'climb': return {min: 80, max: 84};
      case 'warmup': return {min: 70, max: 79};
      case 'cooldown': return {min: 60, max: 69};
      case 'recovery': return {min: 70, max: 90};
      default: return {min: 70, max: 90};
    }
  }
}