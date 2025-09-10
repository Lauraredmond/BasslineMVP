/**
 * Workout Phase Mapper - Implements the exact model from primer.md
 * Maps Spotify tracks to workout phases using only Supabase data
 * No fallback, no heuristics, no hardcoded values
 */

import { supabase } from './supabase';

export interface WorkoutPhaseMapping {
  track_id: string;
  track_name: string;
  artist_name: string;
  spotify_tempo: number | null;
  workout_phase_id: string | null;
  workout_track: string | null;
  phase_name: string | null;
  bpm_range: string | null;
  error: string | null;
}

export interface PlaylistPhaseMappingResult {
  success: boolean;
  mappings: WorkoutPhaseMapping[];
  errors: string[];
  session_id: string | null;
}

/**
 * Maps a single Spotify track to workout phase per primer.md algorithm
 * Returns explicit error if required data is missing
 */
export async function mapTrackToWorkoutPhase(trackId: string): Promise<WorkoutPhaseMapping> {
  console.log(`🎯 [PHASE MAPPER] Mapping track ID: ${trackId}`);

  try {
    // Step 1: Get track-level BPM from streaming_vendor_attributes
    const { data: svaData, error: svaError } = await supabase
      .from('streaming_vendor_attributes')
      .select('track_id, track_name, artist_name, spotify_tempo')
      .eq('track_id', trackId)
      .is('section_type', null) // Full-track row only, ignore per-section variants
      .order('timestamp_ms', { nulls: 'last' })
      .limit(1)
      .single();

    console.log(`📊 [PHASE MAPPER] SVA query result:`, { data: svaData, error: svaError });

    if (svaError || !svaData) {
      const error = `Missing SVA data for track_id=${trackId}; unable to map phase`;
      console.error(`❌ [PHASE MAPPER] ${error}`);
      return {
        track_id: trackId,
        track_name: 'Unknown',
        artist_name: 'Unknown',
        spotify_tempo: null,
        workout_phase_id: null,
        workout_track: null,
        phase_name: null,
        bpm_range: null,
        error
      };
    }

    if (svaData.spotify_tempo === null || svaData.spotify_tempo === undefined) {
      const error = `Missing SVA.spotify_tempo for track_id=${trackId}; unable to map phase`;
      console.error(`❌ [PHASE MAPPER] ${error}`);
      return {
        track_id: trackId,
        track_name: svaData.track_name || 'Unknown',
        artist_name: svaData.artist_name || 'Unknown',
        spotify_tempo: null,
        workout_phase_id: null,
        workout_track: null,
        phase_name: null,
        bpm_range: null,
        error
      };
    }

    // Step 2: Find best-fit workout phase using primer.md algorithm
    const phaseResult = await findBestFitPhase(svaData.spotify_tempo);

    if (!phaseResult.workout_phase_id) {
      const error = `No workout phase matches BPM ${svaData.spotify_tempo} for track_id=${trackId}`;
      console.error(`❌ [PHASE MAPPER] ${error}`);
      return {
        track_id: trackId,
        track_name: svaData.track_name || 'Unknown',
        artist_name: svaData.artist_name || 'Unknown',
        spotify_tempo: svaData.spotify_tempo,
        workout_phase_id: null,
        workout_track: null,
        phase_name: null,
        bmp_range: null,
        error
      };
    }

    console.log(`✅ [PHASE MAPPER] Success: ${svaData.track_name} (${svaData.spotify_tempo} BPM) → ${phaseResult.workout_track}`);

    return {
      track_id: trackId,
      track_name: svaData.track_name || 'Unknown',
      artist_name: svaData.artist_name || 'Unknown',
      spotify_tempo: svaData.spotify_tempo,
      workout_phase_id: phaseResult.workout_phase_id,
      workout_track: phaseResult.workout_track,
      phase_name: phaseResult.phase_name,
      bpm_range: `${phaseResult.target_tempo_min}-${phaseResult.target_tempo_max}`,
      error: null
    };

  } catch (error) {
    const errorMsg = `Database error mapping track_id=${trackId}: ${error.message}`;
    console.error(`💥 [PHASE MAPPER] ${errorMsg}`, error);
    return {
      track_id: trackId,
      track_name: 'Unknown',
      artist_name: 'Unknown',
      spotify_tempo: null,
      workout_phase_id: null,
      workout_track: null,
      phase_name: null,
      bpm_range: null,
      error: errorMsg
    };
  }
}

/**
 * Find best-fit workout phase per primer.md algorithm:
 * 1. Find all phases where target_tempo_min <= BPM <= target_tempo_max
 * 2. If multiple match, choose the one with narrowest range
 */
async function findBestFitPhase(bpm: number) {
  console.log(`🔍 [PHASE MAPPER] Finding phase for BPM: ${bpm}`);

  const { data: phases, error } = await supabase
    .from('workout_phases')
    .select('workout_phase_id, workout_track, target_tempo_min, target_tempo_max')
    .lte('target_tempo_min', bpm)
    .gte('target_tempo_max', bpm);

  console.log(`📊 [PHASE MAPPER] Phase query result:`, { data: phases, error });

  if (error) {
    throw new Error(`Failed to query workout_phases: ${error.message}`);
  }

  if (!phases || phases.length === 0) {
    return {
      workout_phase_id: null,
      workout_track: null,
      phase_name: null,
      target_tempo_min: null,
      target_tempo_max: null
    };
  }

  // Find the phase with the narrowest range (primer.md tie-breaking rule)
  const bestPhase = phases.reduce((best, current) => {
    const bestRange = best.target_tempo_max - best.target_tempo_min;
    const currentRange = current.target_tempo_max - current.target_tempo_min;
    return currentRange < bestRange ? current : best;
  });

  const phaseName = getPhaseDisplayName(bestPhase.workout_track);

  console.log(`🎯 [PHASE MAPPER] Best fit: ${bestPhase.workout_track} (${bestPhase.target_tempo_min}-${bestPhase.target_tempo_max})`);

  return {
    workout_phase_id: bestPhase.workout_phase_id,
    workout_track: bestPhase.workout_track,
    phase_name: phaseName,
    target_tempo_min: bestPhase.target_tempo_min,
    target_tempo_max: bestPhase.target_tempo_max
  };
}

/**
 * Maps playlist tracks to phases and locks the mappings (per primer.md)
 * Called once when playlist is selected
 */
export async function lockPlaylistPhases(trackIds: string[]): Promise<PlaylistPhaseMappingResult> {
  console.log(`🔒 [PHASE MAPPER] Locking playlist phases for ${trackIds.length} tracks`);

  const mappings: WorkoutPhaseMapping[] = [];
  const errors: string[] = [];

  // Step 1: Map each track
  for (const trackId of trackIds) {
    try {
      const mapping = await mapTrackToWorkoutPhase(trackId);
      mappings.push(mapping);

      if (mapping.error) {
        errors.push(mapping.error);
      }
    } catch (error) {
      const errorMsg = `Failed to map track ${trackId}: ${error.message}`;
      errors.push(errorMsg);
      console.error(`❌ [PHASE MAPPER] ${errorMsg}`);
    }
  }

  // Step 2: Save locked mappings to playlist_phase_map
  let sessionId: string | null = null;
  const validMappings = mappings.filter(m => m.workout_phase_id && !m.error);

  if (validMappings.length > 0) {
    try {
      sessionId = await saveLockedMappings(validMappings);
      console.log(`💾 [PHASE MAPPER] Saved ${validMappings.length} locked mappings to session: ${sessionId}`);
    } catch (error) {
      const errorMsg = `Failed to save locked mappings: ${error.message}`;
      errors.push(errorMsg);
      console.error(`❌ [PHASE MAPPER] ${errorMsg}`);
    }
  }

  const success = errors.length === 0 && validMappings.length > 0;

  console.log(`🏁 [PHASE MAPPER] Playlist locking complete: ${validMappings.length}/${trackIds.length} tracks mapped, ${errors.length} errors`);

  return {
    success,
    mappings,
    errors,
    session_id: sessionId
  };
}

/**
 * Save locked mappings to playlist_phase_map table
 */
async function saveLockedMappings(mappings: WorkoutPhaseMapping[]): Promise<string> {
  const sessionId = crypto.randomUUID();
  const now = new Date().toISOString();

  const insertData = mappings.map(mapping => ({
    track_id: mapping.track_id,
    workout_phase_id: mapping.workout_phase_id,
    workout_track: mapping.workout_track,
    session_identifier: sessionId,
    locked_at: now
  }));

  const { error } = await supabase
    .from('playlist_phase_map')
    .insert(insertData);

  if (error) {
    throw new Error(`Failed to insert playlist_phase_map: ${error.message}`);
  }

  return sessionId;
}

/**
 * Get locked phase for a track from current session
 */
export async function getLockedPhaseForTrack(trackId: string, sessionId: string): Promise<WorkoutPhaseMapping | null> {
  console.log(`🔍 [PHASE MAPPER] Getting locked phase for track ${trackId} in session ${sessionId}`);

  try {
    const { data, error } = await supabase
      .from('playlist_phase_map')
      .select(`
        track_id,
        workout_phase_id,
        workout_track,
        locked_at
      `)
      .eq('track_id', trackId)
      .eq('session_identifier', sessionId)
      .single();

    if (error || !data) {
      console.log(`📭 [PHASE MAPPER] No locked mapping found for track ${trackId}`);
      return null;
    }

    // Get the original track data for display
    const originalMapping = await mapTrackToWorkoutPhase(trackId);

    return {
      ...originalMapping,
      workout_phase_id: data.workout_phase_id,
      workout_track: data.workout_track,
      phase_name: getPhaseDisplayName(data.workout_track),
      error: null
    };

  } catch (error) {
    console.error(`❌ [PHASE MAPPER] Error getting locked phase:`, error);
    return null;
  }
}

/**
 * Convert workout_track codes to display names
 */
function getPhaseDisplayName(workout_track: string): string {
  const displayNames: { [key: string]: string } = {
    'warmup': 'Warm Up',
    'resistance': 'Resistance',
    'climb': 'Climb',
    'jumps': 'Jumps', 
    'sprint_intervals': 'Sprint Intervals',
    'hills': 'Hills',
    'recovery': 'Recovery',
    'cooldown': 'Cool Down'
  };

  return displayNames[workout_track] || workout_track;
}

/**
 * Get current playing track and map to phase (for runtime narrative selection)
 */
export async function getCurrentTrackPhase(sessionId: string): Promise<{
  track_id: string | null;
  workout_track: string | null;
  section_type: string | null;
  error: string | null;
} | null> {
  console.log(`🎵 [PHASE MAPPER] Getting current track phase for session ${sessionId}`);

  try {
    // This would need to integrate with Spotify polling to get current track
    // For now, return structure that the narrative system expects
    return {
      track_id: null,
      workout_track: null,
      section_type: null,
      error: 'Current track detection not implemented'
    };
  } catch (error) {
    console.error(`❌ [PHASE MAPPER] Error getting current track phase:`, error);
    return null;
  }
}