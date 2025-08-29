import { supabase } from './supabase';

/**
 * Automatically captures and stores Spotify BPM when tracks play
 * This ensures streaming_vendor_attributes always has BPM data for workout mapping
 * OVERWRITES existing data for each song & artist combination as requested
 */
export class AutomaticBPMCapture {
  
  /**
   * Store BPM for a track when it starts playing
   * OVERWRITES all existing data for the song & artist combination
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
      console.log(`🎵 OVERWRITING streaming_vendor_attributes for: ${spotifyTempo} BPM "${trackName}" by "${artistName}"`);
      
      // STEP 1: DELETE all existing records for this song & artist combination
      const { error: deleteError } = await supabase
        .from('streaming_vendor_attributes')
        .delete()
        .eq('track_name', trackName)
        .eq('artist_name', artistName);
      
      if (deleteError) {
        console.error('❌ Error deleting existing records:', deleteError);
        return;
      }
      
      console.log(`🗑️ Cleared all existing records for "${trackName}" by "${artistName}"`);
      
      // STEP 2: INSERT fresh record with Spotify tempo
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
            data_source: 'spotify_api_realtime',
            spotify_tempo: spotifyTempo,
            track_duration_ms: trackDurationMs,
            captured_by: 'automatic_realtime_capture',
            notes: `Auto-captured from Spotify API on ${new Date().toISOString()}`
          }
        ]);
      
      if (error) {
        console.error('❌ Error inserting fresh track record:', error);
        return;
      }
      
      console.log(`✅ OVERWRITE COMPLETE: Fresh record created with BPM ${spotifyTempo} for "${trackName}"`);
      
    } catch (error) {
      console.error('❌ Error in automatic BPM capture overwrite:', error);
    }
  }

  /**
   * Add additional section data from streaming analysis (preserves BPM)
   * This supplements the basic intro record with detailed section timing
   */
  static async addSectionData(
    trackName: string,
    artistName: string,
    sectionData: Array<{
      timestamp_ms: number;
      section_type: string;
      section_number?: number;
      energy_level?: number;
      intensity_level?: number;
    }>
  ): Promise<void> {
    if (!trackName || !artistName || !sectionData?.length) {
      console.log('⚠️ Missing section data, skipping');
      return;
    }

    try {
      console.log(`🎵 Adding ${sectionData.length} section records for "${trackName}" by "${artistName}"`);

      // Get the spotify_tempo from the existing intro record (preserve it)
      const { data: existing } = await supabase
        .from('streaming_vendor_attributes')
        .select('spotify_tempo, track_duration_ms')
        .eq('track_name', trackName)
        .eq('artist_name', artistName)
        .limit(1)
        .single();

      const preservedTempo = existing?.spotify_tempo;
      const preservedDuration = existing?.track_duration_ms;

      if (!preservedTempo) {
        console.warn('⚠️ No existing spotify_tempo found to preserve');
        return;
      }

      // Delete existing records (they'll be replaced with detailed ones)
      await supabase
        .from('streaming_vendor_attributes')
        .delete()
        .eq('track_name', trackName)
        .eq('artist_name', artistName);

      // Insert all section records with preserved BPM
      const recordsToInsert = sectionData.map(section => ({
        track_name: trackName,
        artist_name: artistName,
        timestamp_ms: section.timestamp_ms,
        event_type: 'section_change',
        section_type: section.section_type,
        section_number: section.section_number || 1,
        energy_level: section.energy_level || 50,
        intensity_level: section.intensity_level || 50,
        data_source: 'enhanced_analysis',
        spotify_tempo: preservedTempo, // PRESERVE the BPM
        track_duration_ms: preservedDuration,
        captured_by: 'automatic_section_analysis'
      }));

      const { error } = await supabase
        .from('streaming_vendor_attributes')
        .insert(recordsToInsert);

      if (error) {
        console.error('❌ Error inserting section records:', error);
        return;
      }

      console.log(`✅ Added ${recordsToInsert.length} detailed section records (BPM preserved: ${preservedTempo})`);

    } catch (error) {
      console.error('❌ Error adding section data:', error);
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