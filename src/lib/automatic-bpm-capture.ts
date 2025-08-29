import { supabase } from './supabase';

/**
 * Automatically captures and stores Spotify BPM when tracks play
 * This ensures streaming_vendor_attributes always has BPM data for workout mapping
 */
export class AutomaticBPMCapture {
  
  /**
   * Store BPM for a track when it starts playing
   */
  static async captureBPMForTrack(
    trackName: string, 
    artistName: string, 
    spotifyTempo?: number
  ): Promise<void> {
    if (!spotifyTempo || !trackName || !artistName) {
      console.log('⚠️ Missing BPM or track info, skipping capture');
      return;
    }
    
    try {
      console.log(`🎵 Auto-capturing BPM: ${spotifyTempo} for "${trackName}" by "${artistName}"`);
      
      // First check if we already have this track with BPM
      const { data: existing } = await supabase
        .from('streaming_vendor_attributes')
        .select('id, spotify_tempo')
        .eq('track_name', trackName)
        .eq('artist_name', artistName)
        .not('spotify_tempo', 'is', null)
        .limit(1);
      
      if (existing && existing.length > 0) {
        console.log('✅ BPM already captured for this track');
        return;
      }
      
      // Update all records for this track with BPM
      const { data, error } = await supabase
        .from('streaming_vendor_attributes')
        .update({ spotify_tempo: spotifyTempo })
        .eq('track_name', trackName)
        .eq('artist_name', artistName);
      
      if (error) {
        console.error('❌ Error updating BPM:', error);
        return;
      }
      
      console.log(`✅ Successfully captured BPM ${spotifyTempo} for "${trackName}"`);
      
    } catch (error) {
      console.error('❌ Error in automatic BPM capture:', error);
    }
  }
  
  /**
   * Get workout track for BPM (same logic as AnimatedPTNarrative)
   */
  static getWorkoutTrackFromBPM(bpm: number): string {
    if (bpm >= 140) return 'sprint_intervals'; // The Pretender @ 172 BPM
    if (bpm >= 120) return 'jumps';
    if (bpm >= 95) return 'hills';
    if (bpm >= 85) return 'resistance';
    if (bpm >= 80) return 'climb';
    if (bpm >= 70) return 'warmup';
    if (bpm >= 60) return 'cooldown';
    return 'recovery';
  }
  
  /**
   * Force update BPM for a specific track (for manual fixes)
   */
  static async forceUpdateTrackBPM(
    trackName: string, 
    artistName: string, 
    bpm: number
  ): Promise<boolean> {
    try {
      console.log(`🔧 Force updating "${trackName}" to ${bpm} BPM`);
      
      const { data, error } = await supabase
        .from('streaming_vendor_attributes')
        .update({ spotify_tempo: bpm })
        .or(`track_name.ilike.%${trackName}%,track_name.eq.${trackName}`)
        .or(`artist_name.ilike.%${artistName}%,artist_name.eq.${artistName}`);
      
      if (error) {
        console.error('❌ Force update failed:', error);
        return false;
      }
      
      console.log(`✅ Force updated BPM for "${trackName}"`);
      return true;
      
    } catch (error) {
      console.error('❌ Error in force update:', error);
      return false;
    }
  }
}