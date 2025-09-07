/**
 * Narrative Lookup Service for Bassline MVP
 * Runtime narrative lookup using locked workout_phase + section_type
 * Implements the specification from primer.md
 */

import { supabase } from './supabase';

export interface NarrativeLookupResult {
  narrativeText: string | null;
  workoutTrack: string | null;
  sectionType: string;
  success: boolean;
  error?: string;
}

export interface TrackPlaylistMapping {
  trackId: string;
  workoutPhaseId: string;
  workoutTrack: string;
  sessionId: string;
}

/**
 * Gets the narrative for current track and section during playback
 * Uses the locked workout phase mapping + current section type
 */
export async function getNarrativeForCurrentTrack(args: {
  trackId: string;
  currentSectionType: string;
  sessionId?: string;
}): Promise<NarrativeLookupResult> {
  const { trackId, currentSectionType, sessionId } = args;

  try {
    console.log(`🔍 [NARRATIVE LOOKUP] Looking up narrative for track ${trackId}, section ${currentSectionType}`);

    // Step 1: Get the locked workout phase mapping for this track
    let lockedMapping: TrackPlaylistMapping | null = null;

    if (sessionId) {
      // Try session-specific lookup first
      lockedMapping = await getLockedMappingFromSession(trackId, sessionId);
    }

    if (!lockedMapping) {
      // Fallback: get most recent mapping for this track
      lockedMapping = await getLockedMappingForTrack(trackId);
    }

    if (!lockedMapping) {
      console.warn(`⚠️ [NARRATIVE LOOKUP] No locked phase mapping found for track ${trackId}`);
      return {
        narrativeText: null,
        workoutTrack: null,
        sectionType: currentSectionType,
        success: false,
        error: 'No locked phase mapping found for track'
      };
    }

    console.log(`📊 [NARRATIVE LOOKUP] Found locked mapping: ${trackId} → ${lockedMapping.workoutTrack}`);

    // Step 2: Look up narrative using (workout_track, section_type)
    const narrativeText = await lookupNarrative(
      lockedMapping.workoutTrack,
      currentSectionType
    );

    if (!narrativeText) {
      console.warn(`⚠️ [NARRATIVE LOOKUP] No narrative found for ${lockedMapping.workoutTrack} + ${currentSectionType}`);
      
      // Try fallback strategies
      const fallbackNarrative = await tryNarrativeFallbacks(
        lockedMapping.workoutTrack,
        currentSectionType
      );

      if (fallbackNarrative) {
        console.log(`✅ [NARRATIVE LOOKUP] Using fallback narrative for ${lockedMapping.workoutTrack}`);
        return {
          narrativeText: fallbackNarrative,
          workoutTrack: lockedMapping.workoutTrack,
          sectionType: currentSectionType,
          success: true
        };
      }

      return {
        narrativeText: null,
        workoutTrack: lockedMapping.workoutTrack,
        sectionType: currentSectionType,
        success: false,
        error: `No narrative found for ${lockedMapping.workoutTrack} + ${currentSectionType}`
      };
    }

    console.log(`✅ [NARRATIVE LOOKUP] Found narrative for ${lockedMapping.workoutTrack} + ${currentSectionType}`);

    return {
      narrativeText,
      workoutTrack: lockedMapping.workoutTrack,
      sectionType: currentSectionType,
      success: true
    };

  } catch (error) {
    console.error(`❌ [NARRATIVE LOOKUP] Error during lookup:`, error);
    return {
      narrativeText: null,
      workoutTrack: null,
      sectionType: currentSectionType,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Gets locked phase mapping from a specific session
 */
async function getLockedMappingFromSession(
  trackId: string, 
  sessionId: string
): Promise<TrackPlaylistMapping | null> {
  try {
    const { data, error } = await supabase
      .from('session_phase_tracks')
      .select(`
        track_id,
        phase_key,
        session_id
      `)
      .eq('track_id', trackId)
      .eq('session_id', sessionId)
      .single();

    if (error || !data) {
      return null;
    }

    // Get workout_track from workout_phases table
    const { data: phaseData, error: phaseError } = await supabase
      .from('workout_phases')
      .select('id, workout_track')
      .eq('workout_track', data.phase_key)
      .single();

    if (phaseError || !phaseData) {
      console.warn(`⚠️ [NARRATIVE LOOKUP] No workout phase found for ${data.phase_key}`);
      return null;
    }

    return {
      trackId: data.track_id,
      workoutPhaseId: phaseData.id,
      workoutTrack: phaseData.workout_track,
      sessionId: data.session_id
    };

  } catch (error) {
    console.error(`❌ [NARRATIVE LOOKUP] Error getting session mapping:`, error);
    return null;
  }
}

/**
 * Gets most recent locked phase mapping for a track (fallback)
 */
async function getLockedMappingForTrack(trackId: string): Promise<TrackPlaylistMapping | null> {
  try {
    const { data, error } = await supabase
      .from('session_phase_tracks')
      .select(`
        track_id,
        phase_key,
        session_id,
        created_at
      `)
      .eq('track_id', trackId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return null;
    }

    // Get workout_track from workout_phases table
    const { data: phaseData, error: phaseError } = await supabase
      .from('workout_phases')
      .select('id, workout_track')
      .eq('workout_track', data.phase_key)
      .single();

    if (phaseError || !phaseData) {
      console.warn(`⚠️ [NARRATIVE LOOKUP] No workout phase found for ${data.phase_key}`);
      return null;
    }

    return {
      trackId: data.track_id,
      workoutPhaseId: phaseData.id,
      workoutTrack: phaseData.workout_track,
      sessionId: data.session_id
    };

  } catch (error) {
    console.error(`❌ [NARRATIVE LOOKUP] Error getting track mapping:`, error);
    return null;
  }
}

/**
 * Looks up narrative text for a specific workout_track + section_type combination
 */
async function lookupNarrative(
  workoutTrack: string,
  sectionType: string
): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('instruction_narratives')
      .select('text')
      .eq('workout_track', workoutTrack)
      .eq('song_component', sectionType)
      .single();

    if (error || !data) {
      return null;
    }

    return data.text;

  } catch (error) {
    console.error(`❌ [NARRATIVE LOOKUP] Error looking up narrative:`, error);
    return null;
  }
}

/**
 * Implements fallback strategies when no exact narrative match is found
 * 1. (workout_track, 'verse') if requesting specific verse variant
 * 2. (workout_track, 'chorus') if requesting specific chorus variant  
 * 3. ('resistance', section_type) as default workout track
 * 4. Global default narrative
 */
async function tryNarrativeFallbacks(
  workoutTrack: string,
  sectionType: string
): Promise<string | null> {
  const fallbackStrategies = [
    // Strategy 1: Try generic verse for specific verse variants
    ...(sectionType.startsWith('verse') ? [{ workoutTrack, sectionType: 'verse' }] : []),
    
    // Strategy 2: Try generic chorus for specific chorus variants  
    ...(sectionType.startsWith('chorus') ? [{ workoutTrack, sectionType: 'chorus' }] : []),
    
    // Strategy 3: Try default resistance workout track with same section
    { workoutTrack: 'resistance', sectionType },
    
    // Strategy 4: Try resistance + verse as ultimate fallback
    { workoutTrack: 'resistance', sectionType: 'verse' }
  ];

  for (const strategy of fallbackStrategies) {
    try {
      const narrative = await lookupNarrative(strategy.workoutTrack, strategy.sectionType);
      if (narrative) {
        console.log(`📝 [NARRATIVE LOOKUP] Fallback success: ${strategy.workoutTrack} + ${strategy.sectionType}`);
        return narrative;
      }
    } catch (error) {
      console.warn(`⚠️ [NARRATIVE LOOKUP] Fallback failed for ${strategy.workoutTrack} + ${strategy.sectionType}:`, error);
    }
  }

  // Final fallback: return a generic message
  console.log(`📝 [NARRATIVE LOOKUP] Using global fallback narrative`);
  return "Keep up the great work! Stay focused and match your effort to the music.";
}

/**
 * Validates that the database has the expected schema structure
 */
export async function validateNarrativeSchema(): Promise<{
  valid: boolean;
  errors: string[];
}> {
  const errors: string[] = [];

  try {
    // Check if instruction_narratives table exists and has expected structure
    const { data: narrativeColumns, error: narrativeError } = await supabase
      .rpc('get_table_columns', { table_name: 'instruction_narratives' });

    if (narrativeError) {
      errors.push(`Cannot access instruction_narratives table: ${narrativeError.message}`);
    } else {
      const expectedColumns = ['workout_track', 'song_component', 'text'];
      const actualColumns = narrativeColumns?.map((col: any) => col.column_name) || [];
      
      for (const col of expectedColumns) {
        if (!actualColumns.includes(col)) {
          errors.push(`Missing column '${col}' in instruction_narratives table`);
        }
      }
    }

    // Check if workout_phases table exists
    const { data: workoutPhases, error: workoutError } = await supabase
      .from('workout_phases')
      .select('workout_track')
      .limit(1);

    if (workoutError) {
      errors.push(`Cannot access workout_phases table: ${workoutError.message}`);
    }

    // Check if session_phase_tracks table exists
    const { data: sessionTracks, error: sessionError } = await supabase
      .from('session_phase_tracks')
      .select('track_id, phase_key')
      .limit(1);

    if (sessionError) {
      errors.push(`Cannot access session_phase_tracks table: ${sessionError.message}`);
    }

  } catch (error) {
    errors.push(`Schema validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}