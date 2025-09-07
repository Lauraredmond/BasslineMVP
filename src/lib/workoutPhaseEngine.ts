/**
 * Workout Phase Engine for Bassline MVP
 * Unified module combining phase mapping and narrative lookup
 * Implements primer.md specification for Workout-phase ⇄ BPM ⇄ PT-narrative mapping
 */

import { mapPlaylistToPhases, getLockedPhaseForTrack, TrackPhaseMapping, PlaylistPhaseResult } from './playlistPhaseMapper';
import { getNarrativeForCurrentTrack, NarrativeLookupResult } from './narrativeLookup';

// Re-export types for convenience
export type { TrackPhaseMapping, PlaylistPhaseResult, NarrativeLookupResult };

/**
 * Maps a playlist to workout phases at selection time
 * This is the "lock at selection time" step from primer.md
 */
export async function lockPlaylistToPhases(args: {
  trackIds: string[];
  userId: string;
  routineKey?: string;
  sessionDate?: string;
}): Promise<PlaylistPhaseResult> {
  console.log(`🎯 [WORKOUT ENGINE] Locking ${args.trackIds.length} tracks to workout phases`);
  
  return await mapPlaylistToPhases(args);
}

/**
 * Gets the narrative for the current track and section during playback
 * This is the "runtime narrative lookup" step from primer.md
 */
export async function getCurrentNarrative(args: {
  trackId: string;
  currentSectionType: string;
  sessionId?: string;
}): Promise<NarrativeLookupResult> {
  console.log(`🎵 [WORKOUT ENGINE] Getting narrative for ${args.trackId} section: ${args.currentSectionType}`);
  
  return await getNarrativeForCurrentTrack(args);
}

/**
 * Gets the locked phase mapping for a specific track
 * Useful for debugging or displaying current phase information
 */
export async function getTrackPhaseMapping(
  trackId: string, 
  sessionId: string
): Promise<TrackPhaseMapping | null> {
  console.log(`🔍 [WORKOUT ENGINE] Getting locked phase mapping for track ${trackId}`);
  
  return await getLockedPhaseForTrack(trackId, sessionId);
}

/**
 * Complete workflow: Lock playlist and get narrative for current playback
 * This combines both primer.md steps in a single function call
 */
export async function initializeWorkoutSession(args: {
  // Step 1: Lock playlist to phases
  trackIds: string[];
  userId: string;
  routineKey?: string;
  sessionDate?: string;
  
  // Step 2: Get initial narrative
  currentTrackId?: string;
  currentSectionType?: string;
}): Promise<{
  sessionResult: PlaylistPhaseResult;
  initialNarrative?: NarrativeLookupResult;
}> {
  const { trackIds, userId, routineKey, sessionDate, currentTrackId, currentSectionType } = args;
  
  console.log(`🚀 [WORKOUT ENGINE] Initializing workout session with ${trackIds.length} tracks`);
  
  // Step 1: Lock all tracks to workout phases
  const sessionResult = await lockPlaylistToPhases({
    trackIds,
    userId,
    routineKey,
    sessionDate
  });
  
  console.log(`✅ [WORKOUT ENGINE] Session locked: ${sessionResult.validTracks}/${sessionResult.totalTracks} tracks mapped`);
  
  // Step 2: Get initial narrative if track is currently playing
  let initialNarrative: NarrativeLookupResult | undefined;
  
  if (currentTrackId && currentSectionType) {
    initialNarrative = await getCurrentNarrative({
      trackId: currentTrackId,
      currentSectionType,
      sessionId: sessionResult.sessionId
    });
    
    if (initialNarrative.success) {\n      console.log(`🎯 [WORKOUT ENGINE] Initial narrative ready for ${currentTrackId}`);\n    }\n  }\n\n  return {\n    sessionResult,\n    initialNarrative\n  };\n}\n\n/**\n * Validates the complete workflow implementation\n * Tests that both phase locking and narrative lookup work correctly\n */\nexport async function validateWorkoutPhaseEngine(args: {\n  testTrackId: string;\n  testSectionType: string;\n}): Promise<{\n  valid: boolean;\n  errors: string[];\n  testResults?: {\n    phaseMapping?: TrackPhaseMapping;\n    narrative?: NarrativeLookupResult;\n  };\n}> {\n  const { testTrackId, testSectionType } = args;\n  const errors: string[] = [];\n  let testResults: any = {};\n\n  try {\n    console.log(`🧪 [WORKOUT ENGINE] Validating workflow with track ${testTrackId}`);\n\n    // Test 1: Create a minimal session with one track\n    const sessionResult = await lockPlaylistToPhases({\n      trackIds: [testTrackId],\n      userId: 'test-user',\n      routineKey: 'validation-test'\n    });\n\n    if (sessionResult.validTracks === 0) {\n      errors.push(`Failed to map test track ${testTrackId} to any workout phase`);\n    } else {\n      testResults.phaseMapping = sessionResult.mappings[0];\n      console.log(`✅ [WORKOUT ENGINE] Phase mapping test passed: ${testTrackId} → ${testResults.phaseMapping?.phase_code}`);\n    }\n\n    // Test 2: Try to get narrative for the mapped track\n    const narrativeResult = await getCurrentNarrative({\n      trackId: testTrackId,\n      currentSectionType: testSectionType,\n      sessionId: sessionResult.sessionId\n    });\n\n    if (!narrativeResult.success) {\n      errors.push(`Failed to get narrative for ${testTrackId} + ${testSectionType}: ${narrativeResult.error}`);\n    } else {\n      testResults.narrative = narrativeResult;\n      console.log(`✅ [WORKOUT ENGINE] Narrative lookup test passed: ${testSectionType} → \"${narrativeResult.narrativeText?.substring(0, 50)}...\"`);\n    }\n\n  } catch (error) {\n    errors.push(`Validation failed with error: ${error instanceof Error ? error.message : 'Unknown error'}`);\n  }\n\n  const valid = errors.length === 0;\n  \n  if (valid) {\n    console.log(`✅ [WORKOUT ENGINE] Validation complete - all tests passed`);\n  } else {\n    console.error(`❌ [WORKOUT ENGINE] Validation failed:`, errors);\n  }\n\n  return {\n    valid,\n    errors,\n    ...(Object.keys(testResults).length > 0 && { testResults })\n  };\n}\n\n/**\n * Utility function to get available workout phases and their BPM ranges\n * Useful for debugging and displaying phase information to users\n */\nexport async function getWorkoutPhaseInfo(): Promise<{\n  phases: Array<{\n    workoutTrack: string;\n    displayName: string;\n    tempoRange: string;\n    tempoMin: number;\n    tempoMax: number;\n  }>;\n  totalPhases: number;\n}> {\n  try {\n    const { supabase } = await import('./supabase');\n    \n    const { data: phases, error } = await supabase\n      .from('workout_phases')\n      .select('workout_track, target_tempo_min, target_tempo_max')\n      .order('target_tempo_min');\n\n    if (error || !phases) {\n      throw new Error(`Failed to fetch workout phases: ${error?.message}`);\n    }\n\n    const phaseInfo = phases.map(phase => ({\n      workoutTrack: phase.workout_track,\n      displayName: getPhaseDisplayName(phase.workout_track),\n      tempoRange: `${phase.target_tempo_min}-${phase.target_tempo_max} BPM`,\n      tempoMin: phase.target_tempo_min,\n      tempoMax: phase.target_tempo_max\n    }));\n\n    console.log(`📊 [WORKOUT ENGINE] Loaded ${phaseInfo.length} workout phases`);\n\n    return {\n      phases: phaseInfo,\n      totalPhases: phaseInfo.length\n    };\n\n  } catch (error) {\n    console.error(`❌ [WORKOUT ENGINE] Error fetching phase info:`, error);\n    throw error;\n  }\n}\n\n/**\n * Helper function to convert workout_track codes to display names\n * Matches the logic from playlistPhaseMapper.ts\n */\nfunction getPhaseDisplayName(workout_track: string): string {\n  const displayNames: { [key: string]: string } = {\n    'warmup': 'Warm Up',\n    'sprint_intervals': 'Sprint Intervals', \n    'jumps': 'Sprint Jumps',\n    'hills': 'Rolling Hills',\n    'resistance': 'Resistance Power',\n    'climb': 'Endurance Climb',\n    'cooldown': 'Cool Down',\n    'recovery': 'Recovery'\n  };\n\n  return displayNames[workout_track] || workout_track.charAt(0).toUpperCase() + workout_track.slice(1);\n}