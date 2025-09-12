/**
 * Phase Resolution System for Bassline MVP
 * Maps track BPM to workout phases with quality validation
 */

import { supabase } from '../supabase';
import { spotifyService } from '../spotify';

export type PhaseMatch = {
  bpm: number | null;
  bpmConfidence: number | null;
  bpmSource: 'section' | 'track' | 'vendor_api' | 'unknown';
  phase_code: string | null;
  phase_name: string | null;
  reason: string;
};

interface StreamingVendorAttribute {
  id: string;
  track_id: string | null;
  vendor: string;
  track_name: string;
  artist_name: string;
  spotify_tempo: number | null;
  tempo_source: 'spotify_api' | 'computed' | 'manual' | 'unknown' | null;
  tempo_confidence: number | null;
  tempo_last_verified_at: string | null;
  section_type: string | null;
  section_start_ms: number | null;
  section_end_ms: number | null;
  timestamp_ms: number | null;
  updated_at: string;
}

interface WorkoutPhase {
  id: string;
  workout_track: string; // This is our "phase_code"
  target_tempo_min: number;
  target_tempo_max: number;
  created_at: string;
}

interface InstructionNarrative {
  id: string;
  workout_track: string;
  song_component: string;
  text: string;
  created_at: string;
}

/**
 * Resolves the workout phase for a given track at a specific position
 * Implements the tempo quality validation system
 */
export async function resolvePhaseForTrack(args: {
  trackId: string;
  vendor: 'spotify';
  positionMs?: number;
}): Promise<PhaseMatch> {
  const { trackId, vendor, positionMs = 0 } = args;
  
  console.log(`🎯 [PHASE RESOLVER] Resolving phase for trackId: ${trackId}, position: ${positionMs}ms`);
  
  try {
    // Step 1: Get effective BPM (with quality checks)
    const bpmResult = await getEffectiveBPM(trackId, vendor, positionMs);
    
    if (!bpmResult.bpm) {
      console.warn(`⚠️ [PHASE RESOLVER] No valid BPM found for track ${trackId}`);
      return {
        bpm: null,
        bpmConfidence: null,
        bpmSource: 'unknown',
        phase_code: 'recovery', // Safe default
        phase_name: 'Recovery',
        reason: 'No valid BPM data - defaulted to recovery phase'
      };
    }

    // Step 2: Find matching workout phases
    const phaseResult = await findMatchingPhase(bpmResult.bpm);
    
    // Step 3: Construct result
    const result: PhaseMatch = {
      bpm: bpmResult.bpm,
      bpmConfidence: bpmResult.confidence,
      bpmSource: bpmResult.source,
      phase_code: phaseResult.phase_code,
      phase_name: phaseResult.phase_name,
      reason: `${bpmResult.source} tempo ${bpmResult.bpm}${bpmResult.verified ? ' (verified)' : ''} → ${phaseResult.phase_name} ${phaseResult.bpm_min}–${phaseResult.bmp_max}`
    };

    console.log(`✅ [PHASE RESOLVER] Resolved: ${result.reason}`);
    return result;

  } catch (error) {
    console.error(`❌ [PHASE RESOLVER] Error resolving phase for track ${trackId}:`, error);
    
    return {
      bpm: null,
      bpmConfidence: null,
      bpmSource: 'unknown',
      phase_code: 'recovery',
      phase_name: 'Recovery',
      reason: 'Error during phase resolution - defaulted to recovery phase'
    };
  }
}

/**
 * Gets the effective BPM for a track at a specific position with quality validation
 */
async function getEffectiveBPM(trackId: string, vendor: string, positionMs: number) {
  // Step 1: Try section-level BPM first (preferred)
  const sectionBpm = await getSectionBPM(trackId, vendor, positionMs);
  if (sectionBpm) {
    console.log(`📍 [PHASE RESOLVER] Using section BPM: ${sectionBpm.bpm} at ${positionMs}ms`);
    return sectionBpm;
  }

  // Step 2: Try track-level BPM
  const trackBpm = await getTrackBPM(trackId, vendor);
  if (trackBpm) {
    console.log(`🎵 [PHASE RESOLVER] Using track BPM: ${trackBpm.bpm}`);
    return trackBpm;
  }

  // Step 3: Try vendor API verification (if allowed and low confidence)
  const verifiedBpm = await verifyBPMFromVendorAPI(trackId, vendor);
  if (verifiedBpm) {
    console.log(`🔍 [PHASE RESOLVER] Using verified BPM: ${verifiedBpm.bpm}`);
    return verifiedBpm;
  }

  console.warn(`⚠️ [PHASE RESOLVER] No BPM found for track ${trackId}`);
  return null;
}

/**
 * Gets BPM from section data at specific position
 */
async function getSectionBPM(trackId: string, vendor: string, positionMs: number) {
  try {
    const { data, error } = await supabase
      .from('streaming_vendor_attributes')
      .select('spotify_tempo, tempo_confidence, tempo_source, section_type')
      .eq('track_id', trackId)
      .eq('vendor', vendor)
      .not('spotify_tempo', 'is', null)
      .not('section_start_ms', 'is', null)
      .not('section_end_ms', 'is', null)
      .gte('section_end_ms', positionMs)
      .lte('section_start_ms', positionMs)
      .order('section_end_ms', { ascending: true }) // Prefer narrower sections
      .limit(1)
      .single();

    if (error || !data) {
      return null;
    }

    return validateBPM(data.spotify_tempo, {
      source: 'section',
      confidence: data.tempo_confidence || 0.7,
      tempo_source: data.tempo_source || 'unknown',
      verified: false
    });

  } catch (error) {
    console.warn(`⚠️ [PHASE RESOLVER] Section BPM lookup failed:`, error);
    return null;
  }
}

/**
 * Gets track-level BPM
 */
async function getTrackBPM(trackId: string, vendor: string) {
  try {
    const { data, error } = await supabase
      .from('streaming_vendor_attributes')
      .select('spotify_tempo, tempo_confidence, tempo_source, track_name, artist_name')
      .eq('track_id', trackId)
      .eq('vendor', vendor)
      .not('spotify_tempo', 'is', null)
      .is('section_type', null) // Track-level records
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return null;
    }

    return validateBPM(data.spotify_tempo, {
      source: 'track',
      confidence: data.tempo_confidence || 0.6,
      tempo_source: data.tempo_source || 'unknown',
      verified: false
    });

  } catch (error) {
    console.warn(`⚠️ [PHASE RESOLVER] Track BPM lookup failed:`, error);
    return null;
  }
}

/**
 * Verifies BPM from vendor API (Spotify Web API)
 * Only called for low-confidence tempos per primer.md policy
 */
async function verifyBPMFromVendorAPI(trackId: string, vendor: string) {
  // Only verify if we have Spotify auth and low confidence in existing data
  if (vendor !== 'spotify' || !spotifyService.isAuthenticated()) {
    return null;
  }

  try {
    console.log(`🔍 [PHASE RESOLVER] Verifying BPM via Spotify Web API for ${trackId}`);
    
    const audioFeatures = await spotifyService.getAudioFeatures([trackId]);
    if (!audioFeatures?.[0]?.tempo) {
      return null;
    }

    const bpm = audioFeatures[0].tempo;
    
    // Update database with verified tempo
    await updateVerifiedTempo(trackId, vendor, bpm);

    return validateBPM(bpm, {
      source: 'vendor_api',
      confidence: 0.9, // High confidence from Spotify API
      tempo_source: 'spotify_api',
      verified: true
    });

  } catch (error) {
    console.warn(`⚠️ [PHASE RESOLVER] Vendor API verification failed:`, error);
    return null;
  }
}

/**
 * Validates BPM quality and detects suspicious patterns
 */
function validateBPM(rawBpm: number | null, metadata: {
  source: 'section' | 'track' | 'vendor_api';
  confidence: number;
  tempo_source: string;
  verified: boolean;
}) {
  if (!rawBpm || isNaN(rawBpm)) {
    return null;
  }

  let validatedBpm = rawBpm;
  let adjustedConfidence = metadata.confidence;
  
  // Rule 1: Check for implausible range (fitness music context)
  if (rawBpm < 40 || rawBpm > 220) {
    console.warn(`⚠️ [PHASE RESOLVER] BPM ${rawBpm} outside plausible range (40-220)`);
    adjustedConfidence *= 0.3; // Severely reduce confidence
    
    // Don't use completely implausible tempos
    if (rawBpm < 30 || rawBpm > 250) {
      return null;
    }
  }

  // Rule 2: Check for "defaulty" values that might be hardcoded
  const suspiciousValues = [120, 128, 100, 110, 140]; // Common default BPMs
  if (suspiciousValues.includes(Math.round(rawBpm))) {
    console.log(`🤔 [PHASE RESOLVER] Potentially defaulty BPM: ${rawBpm}`);
    adjustedConfidence *= 0.7; // Reduce confidence for suspicious values
  }

  // Rule 3: Source-based confidence adjustment
  if (metadata.tempo_source === 'unknown' || metadata.tempo_source === 'computed') {
    adjustedConfidence *= 0.8;
  }

  // Rule 4: Minimum confidence threshold
  if (adjustedConfidence < 0.3) {
    console.warn(`⚠️ [PHASE RESOLVER] BPM confidence too low: ${adjustedConfidence}`);
    return null;
  }

  return {
    bpm: Math.round(validatedBpm),
    confidence: Math.round(adjustedConfidence * 100) / 100,
    source: metadata.source,
    verified: metadata.verified
  };
}

/**
 * Finds the best matching workout phase for a given BPM
 * Implements tie-breaking rules: narrowest range wins, then lowest order
 */
async function findMatchingPhase(bpm: number) {
  try {
    // Get all active phases that match this BPM
    const { data: phases, error } = await supabase
      .from('workout_phases')
      .select('*')
      .lte('target_tempo_min', bpm)     // target_tempo_min <= BPM  
      .gte('target_tempo_max', bpm)     // target_tempo_max >= BPM
      .order('target_tempo_max', { ascending: true }); // Order by range size (implicit)

    if (error) {
      throw error;
    }

    if (!phases || phases.length === 0) {
      console.warn(`⚠️ [PHASE RESOLVER] No phase found for BPM ${bpm} - using recovery default`);
      return {
        phase_code: 'recovery',
        phase_name: 'Recovery',
        bpm_min: 70,
        bmp_max: 90
      };
    }

    // Apply tie-breaking rules
    let bestPhase = phases[0];
    let smallestRange = bestPhase.target_tempo_max - bestPhase.target_tempo_min;

    for (const phase of phases) {
      const range = phase.target_tempo_max - phase.target_tempo_min;
      
      // Rule 1: Prefer narrower range
      if (range < smallestRange) {
        bestPhase = phase;
        smallestRange = range;
      }
      // Rule 2: On tie, we already have them ordered appropriately by the query
    }

    // Convert workout_track to display name
    const phaseName = getPhaseDisplayName(bestPhase.workout_track);

    console.log(`✅ [PHASE RESOLVER] Matched BPM ${bpm} to phase ${bestPhase.workout_track} (${bestPhase.target_tempo_min}-${bestPhase.target_tempo_max})`);

    return {
      phase_code: bestPhase.workout_track,
      phase_name: phaseName,
      bpm_min: bestPhase.target_tempo_min,
      bmp_max: bestPhase.target_tempo_max
    };

  } catch (error) {
    console.error(`❌ [PHASE RESOLVER] Error finding matching phase:`, error);
    
    // Safe fallback
    return {
      phase_code: 'recovery',
      phase_name: 'Recovery',
      bmp_min: 70,
      bmp_max: 90
    };
  }
}

/**
 * Updates database with verified tempo information
 */
async function updateVerifiedTempo(trackId: string, vendor: string, bpm: number) {
  try {
    const { error } = await supabase
      .from('streaming_vendor_attributes')
      .update({
        spotify_tempo: bpm,
        tempo_source: 'spotify_api',
        tempo_confidence: 0.9,
        tempo_last_verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('track_id', trackId)
      .eq('vendor', vendor);

    if (error) {
      console.warn(`⚠️ [PHASE RESOLVER] Failed to update verified tempo:`, error);
    } else {
      console.log(`💾 [PHASE RESOLVER] Updated verified tempo: ${bpm} BPM for track ${trackId}`);
    }
  } catch (error) {
    console.error(`❌ [PHASE RESOLVER] Error updating verified tempo:`, error);
  }
}

/**
 * Converts workout_track codes to human-readable names
 */
function getPhaseDisplayName(workout_track: string): string {
  const displayNames: { [key: string]: string } = {
    'warmup': 'Warm Up',
    'sprint_intervals': 'Sprint Intervals',
    'jumps': 'Sprint Jumps',
    'hills': 'Rolling Hills',
    'resistance': 'Resistance Power',
    'climb': 'Endurance Climb',
    'cooldown': 'Cool Down',
    'recovery': 'Recovery'
  };

  return displayNames[workout_track] || workout_track.charAt(0).toUpperCase() + workout_track.slice(1);
}

/**
 * Gets instruction narratives for a resolved phase
 * Called by the Netlify function
 */
export async function getInstructionNarratives(phase_code: string): Promise<InstructionNarrative[]> {
  try {
    const { data, error } = await supabase
      .from('instruction_narratives')
      .select('*')
      .eq('workout_track', phase_code)
      .order('song_component');

    if (error) {
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error(`❌ [PHASE RESOLVER] Error fetching narratives for ${phase_code}:`, error);
    return [];
  }
}