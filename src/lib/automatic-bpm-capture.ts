import { supabase } from './supabase';

/**
 * Automatically captures and stores BPM from RapidAPI SoundNet when tracks play
 * ONLY updates spotify_tempo field - preserves all existing section data
 * Does NOT overwrite any existing timing, sections, or energy levels
 */
export class AutomaticBPMCapture {
  
  /**
   * Update ONLY the spotify_tempo field for existing track records
   * Preserves all existing section data, timing, and energy levels
   */
  static async captureBPMForTrack(
    trackName: string, 
    artistName: string, 
    spotifyTempo?: number,
    trackDurationMs?: number
  ): Promise<void> {
    if (!spotifyTempo || !trackName || !artistName) {
      console.log('⚠️ Missing BPM or track info, skipping capture');
      return;
    }
    
    try {
      console.log(`🎵 UPDATING ONLY spotify_tempo: ${spotifyTempo} BPM for "${trackName}" by "${artistName}"`);
      
      // Check if records exist for this track
      const { data: existing } = await supabase
        .from('streaming_vendor_attributes')
        .select('id')
        .eq('track_name', trackName)
        .eq('artist_name', artistName)
        .limit(1);
      
      if (existing && existing.length > 0) {
        // UPDATE existing records - ONLY the spotify_tempo field
        const { data, error } = await supabase
          .from('streaming_vendor_attributes')
          .update({ 
            spotify_tempo: spotifyTempo,
            track_duration_ms: trackDurationMs || null,
            updated_at: new Date().toISOString()
          })
          .eq('track_name', trackName)
          .eq('artist_name', artistName);
        
        if (error) {
          console.error('❌ Error updating BPM:', error);
          return;
        }
        
        console.log(`✅ UPDATED spotify_tempo to ${spotifyTempo} for "${trackName}" (preserved all section data)`);
      } else {
        // Only create minimal record if NO records exist (rare case)
        const { data, error } = await supabase
          .from('streaming_vendor_attributes')
          .insert([
            {
              track_name: trackName,
              artist_name: artistName,
              timestamp_ms: 0,
              event_type: 'section_change',
              section_type: 'intro',
              section_number: 1,
              energy_level: 50,
              intensity_level: 50,
              data_source: 'spotify_api_minimal',
              spotify_tempo: spotifyTempo,
              track_duration_ms: trackDurationMs,
              captured_by: 'automatic_bpm_only',
              notes: `Minimal record - BPM only from ${new Date().toISOString()}`
            }
          ]);
        
        if (error) {
          console.error('❌ Error inserting minimal track record:', error);
          return;
        }
        
        console.log(`✅ CREATED minimal record with BPM ${spotifyTempo} for "${trackName}" (no existing data found)`);
      }
      
    } catch (error) {
      console.error('❌ Error in BPM-only capture:', error);
    }
  }

  /**
   * DISABLED: Add additional section data from streaming analysis
   * This function is disabled to preserve manual section data in SVA table
   * Only BPM updates are allowed via captureBPMForTrack()
   */
  static async addSectionData(
    trackName: string,
    artistName: string,
    sectionData: Array<any>
  ): Promise<void> {
    console.warn(`⚠️ addSectionData DISABLED to preserve existing section data for "${trackName}"`);
    console.log('🔒 Only BPM updates allowed - section data will not be modified');
    return;
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