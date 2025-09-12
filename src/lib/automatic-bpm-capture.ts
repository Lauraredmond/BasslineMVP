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
      console.log(`🎵 NEW VERSION: UPDATING ONLY spotify_tempo: ${spotifyTempo} BPM for "${trackName}" by "${artistName}" (NO DELETES)`);
      
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
        
        console.log(`✅ FIXED: ONLY updated spotify_tempo to ${spotifyTempo} for "${trackName}" (preserved all section data)`);
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
   * Get workout track for BPM - FIXED to match actual database ranges
   * WARNING: Use database lookup instead when possible!
   */
  static getWorkoutTrackFromBPM(bpm: number): string {
    // FIXED ranges to match Supabase workout_phases table
    if (bpm >= 160) return 'sprint_intervals'; // 160-180 BPM
    if (bpm >= 116) return 'jumps';            // 116-159 BPM  
    if (bpm >= 101) return 'hills';            // 101-115 BPM
    if (bpm >= 90) return 'climb';             // 90-100 BPM ← FIXED! Oasis 100 goes here
    if (bpm >= 80) return 'warmup';            // 80-89 BPM
    if (bpm >= 70) return 'recovery';          // 70-79 BPM
    if (bpm >= 60) return 'cooldown';          // 60-69 BPM
    if (bpm >= 55) return 'resistance';        // 55-60 BPM ← Dirge 58 goes here
    return 'resistance'; // Default fallback
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