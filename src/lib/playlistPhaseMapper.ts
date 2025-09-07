/**
 * Playlist Phase Mapper for Bassline MVP
 * Maps tracks to workout phases at playlist selection time and locks mappings for the session
 */

import { supabase } from './supabase';
import { spotifyService } from './spotify';

export interface TrackPhaseMapping {
  trackId: string;
  trackName: string;
  artistName: string;
  bpm: number | null;
  phase_code: string | null;
  phase_name: string | null;
  reason: string;
  validBpm: boolean;
}

export interface PlaylistPhaseResult {
  mappings: TrackPhaseMapping[];
  sessionId: string;
  totalTracks: number;
  validTracks: number;
  skippedTracks: number;
}

/**
 * Maps all tracks in a playlist to workout phases based on track-level BPM
 * Called once when playlist is confirmed - saves mappings for the session
 */
export async function mapPlaylistToPhases(args: {
  trackIds: string[];
  userId: string;
  routineKey?: string;
  sessionDate?: string;
}): Promise<PlaylistPhaseResult> {
  const { trackIds, userId, routineKey = 'playlist_session', sessionDate = new Date().toISOString().split('T')[0] } = args;
  
  console.log(`🎯 [PLAYLIST MAPPER] Starting playlist mapping for ${trackIds.length} tracks`);
  
  const mappings: TrackPhaseMapping[] = [];
  let validTracks = 0;
  let skippedTracks = 0;

  // Step 1: Get workout phases from database
  const workoutPhases = await getWorkoutPhases();
  
  if (workoutPhases.length === 0) {
    throw new Error('No workout phases found in database');
  }

  console.log(`📊 [PLAYLIST MAPPER] Loaded ${workoutPhases.length} workout phases`);

  // Step 2: Process each track
  for (const trackId of trackIds) {
    try {
      const mapping = await mapTrackToPhase(trackId, workoutPhases);
      mappings.push(mapping);
      
      if (mapping.validBpm && mapping.phase_code) {
        validTracks++;
      } else {
        skippedTracks++;
      }
      
    } catch (error) {
      console.error(`❌ [PLAYLIST MAPPER] Error mapping track ${trackId}:`, error);
      
      // Add error mapping
      mappings.push({
        trackId,
        trackName: 'Unknown Track',
        artistName: 'Unknown Artist',
        bpm: null,
        phase_code: null,
        phase_name: null,
        reason: 'Error during track mapping',
        validBpm: false
      });
      skippedTracks++;
    }
  }

  // Step 3: Create and save session
  const sessionId = await savePlaylistSession({
    userId,
    routineKey,
    sessionDate,
    mappings: mappings.filter(m => m.validBpm) // Only save valid mappings
  });

  const result: PlaylistPhaseResult = {
    mappings,
    sessionId,
    totalTracks: trackIds.length,
    validTracks,
    skippedTracks
  };

  console.log(`✅ [PLAYLIST MAPPER] Completed: ${validTracks}/${trackIds.length} tracks mapped successfully`);
  return result;
}

/**
 * Maps a single track to a workout phase based on its BPM
 */
async function mapTrackToPhase(trackId: string, workoutPhases: any[]): Promise<TrackPhaseMapping> {
  // Step 1: Get track-level BPM from database
  let bpm = await getTrackBPMFromDatabase(trackId);
  let trackName = 'Unknown Track';
  let artistName = 'Unknown Artist';
  
  // Step 2: If no BPM in database, try to get track info and backfill
  if (!bpm) {
    console.log(`🔍 [PLAYLIST MAPPER] No BPM found for ${trackId}, attempting backfill`);
    const backfillResult = await backfillTrackBPM(trackId);
    
    if (backfillResult) {
      bpm = backfillResult.bpm;
      trackName = backfillResult.trackName;
      artistName = backfillResult.artistName;
    }
  } else {
    // Get track metadata
    const metadata = await getTrackMetadata(trackId);
    if (metadata) {
      trackName = metadata.trackName;
      artistName = metadata.artistName;
    }
  }

  // Step 3: Validate BPM
  const isValidBpm = bpm !== null && bpm >= 40 && bpm <= 220;
  
  if (!isValidBpm) {
    if (bpm !== null) {
      console.warn(`⚠️ [PLAYLIST MAPPER] Invalid BPM ${bpm} for track ${trackId} (${trackName}) - outside range 40-220`);
    }
    
    return {
      trackId,
      trackName,
      artistName,
      bpm,
      phase_code: null,
      phase_name: null,
      reason: bpm === null ? 'No BPM data available' : `Invalid BPM ${bpm} (outside 40-220 range)`,
      validBpm: false
    };
  }

  // Step 4: Find workout phase match using inclusive range: target_tempo_min <= BPM <= target_tempo_max
  const matchingPhases = workoutPhases.filter(phase => 
    bpm >= phase.target_tempo_min && bpm <= phase.target_tempo_max
  );

  if (matchingPhases.length === 0) {
    console.warn(`⚠️ [PLAYLIST MAPPER] No phase match for BPM ${bpm} (${trackName})`);
    return {
      trackId,
      trackName,
      artistName,
      bpm,
      phase_code: null,
      phase_name: null,
      reason: `No workout phase matches BPM ${bpm}`,
      validBpm: true
    };
  }

  // Step 5: Apply tie-breaking if multiple matches (narrowest range wins)
  const bestPhase = matchingPhases.reduce((best, current) => {
    const bestRange = best.target_tempo_max - best.target_tempo_min;
    const currentRange = current.target_tempo_max - current.target_tempo_min;
    return currentRange < bestRange ? current : best;
  });

  const phaseName = getPhaseDisplayName(bestPhase.workout_track);

  console.log(`🔒 [PLAYLIST MAPPER] Locked "${trackName}" (${bpm} BPM) → ${bestPhase.workout_track}`);

  return {
    trackId,
    trackName,
    artistName,
    bpm: bpm,
    phase_code: bestPhase.workout_track,
    phase_name: phaseName,
    reason: `BPM ${bpm} → ${phaseName} (${bestPhase.target_tempo_min}-${bestPhase.target_tempo_max})`,
    validBpm: true
  };
}

/**
 * Gets track-level BPM from streaming_vendor_attributes (ignores section BPM)
 */
async function getTrackBPMFromDatabase(trackId: string): Promise<number | null> {
  try {
    const { data, error } = await supabase
      .from('streaming_vendor_attributes')
      .select('spotify_tempo, track_name, artist_name')
      .or(`track_id.eq.${trackId},spotify_track_id.eq.${trackId}`) // Handle both track_id fields
      .is('section_type', null) // Only track-level records, not section records  
      .not('spotify_tempo', 'is', null)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return null;
    }

    console.log(`📊 [PLAYLIST MAPPER] Found full-track BPM: ${data.spotify_tempo} for ${trackId}`);
    return data.spotify_tempo;

  } catch (error) {
    console.warn(`⚠️ [PLAYLIST MAPPER] Error fetching BPM for ${trackId}:`, error);
    return null;
  }
}

/**
 * Gets track metadata from streaming_vendor_attributes
 */
async function getTrackMetadata(trackId: string): Promise<{trackName: string, artistName: string} | null> {
  try {
    const { data, error } = await supabase
      .from('streaming_vendor_attributes')
      .select('track_name, artist_name')
      .eq('track_id', trackId)
      .limit(1)
      .single();

    if (error || !data) {
      return null;
    }

    return {
      trackName: data.track_name,
      artistName: data.artist_name
    };

  } catch (error) {
    return null;
  }
}

/**
 * Attempts to backfill BPM for a track using Spotify Web API
 */
async function backfillTrackBPM(trackId: string): Promise<{bpm: number, trackName: string, artistName: string} | null> {
  try {
    if (!spotifyService.isAuthenticated()) {
      console.warn(`⚠️ [PLAYLIST MAPPER] Spotify not authenticated, cannot backfill BPM for ${trackId}`);
      return null;
    }

    // Get track info
    const track = await spotifyService.getTrack(trackId);
    if (!track) {
      return null;
    }

    // Get audio features
    const audioFeatures = await spotifyService.getAudioFeatures([trackId]);
    if (!audioFeatures || !audioFeatures[0]?.tempo) {
      return null;
    }

    const bpm = audioFeatures[0].tempo;
    const trackName = track.name;
    const artistName = track.artists[0]?.name || 'Unknown Artist';

    // Save to database for future use
    await upsertTrackBPM(trackId, trackName, artistName, bpm);

    console.log(`✅ [PLAYLIST MAPPER] Backfilled BPM: ${bpm} for "${trackName}" by ${artistName}`);

    return { bpm, trackName, artistName };

  } catch (error) {
    console.error(`❌ [PLAYLIST MAPPER] Error backfilling BPM for ${trackId}:`, error);
    return null;
  }
}

/**
 * Saves or updates track BPM in streaming_vendor_attributes
 */
async function upsertTrackBPM(trackId: string, trackName: string, artistName: string, bpm: number): Promise<void> {
  try {
    const { error } = await supabase
      .from('streaming_vendor_attributes')
      .upsert({
        spotify_track_id: trackId, // Use spotify_track_id field
        track_name: trackName,
        artist_name: artistName,
        spotify_tempo: bpm, // Full-track BPM
        event_type: 'track_metadata',
        timestamp_ms: 0, // 0 for full-track records
        section_type: null, // null = full-track record
        data_source: 'spotify_api',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'track_name,artist_name,timestamp_ms,event_type'
      });

    if (error) {
      console.error(`❌ [PLAYLIST MAPPER] Error saving BPM to database:`, error);
    } else {
      console.log(`💾 [PLAYLIST MAPPER] Saved full-track BPM ${bpm} for "${trackName}" to streaming_vendor_attributes`);
    }

  } catch (error) {
    console.error(`❌ [PLAYLIST MAPPER] Error upserting BPM:`, error);
  }
}

/**
 * Gets workout phases from the database
 */
async function getWorkoutPhases(): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('workout_phases')
      .select('*')
      .order('target_tempo_min');

    if (error) {
      throw error;
    }

    return data || [];

  } catch (error) {
    console.error(`❌ [PLAYLIST MAPPER] Error fetching workout phases:`, error);
    return [];
  }
}

/**
 * Saves the playlist session with track-to-phase mappings
 */
async function savePlaylistSession(args: {
  userId: string;
  routineKey: string;
  sessionDate: string;
  mappings: TrackPhaseMapping[];
}): Promise<string> {
  const { userId, routineKey, sessionDate, mappings } = args;

  try {
    // Create the session
    const { data: session, error: sessionError } = await supabase
      .from('workout_sessions')
      .insert({
        user_id: userId,
        session_date: sessionDate,
        routine_key: routineKey
      })
      .select()
      .single();

    if (sessionError || !session) {
      throw new Error(`Failed to create session: ${sessionError?.message}`);
    }

    // Create phase tracks for each mapping
    const phaseTrackInserts = mappings.map((mapping, index) => ({
      session_id: session.id,
      phase_order: index,
      phase_key: mapping.phase_code,
      track_id: mapping.trackId,
      track_uri: `spotify:track:${mapping.trackId}`,
      track_name: mapping.trackName,
      artist_name: mapping.artistName,
      section_map: { bpm: mapping.bpm, phase: mapping.phase_code, locked: true }
    }));

    const { error: tracksError } = await supabase
      .from('session_phase_tracks')
      .insert(phaseTrackInserts);

    if (tracksError) {
      // Clean up session if tracks insert failed
      await supabase.from('workout_sessions').delete().eq('id', session.id);
      throw new Error(`Failed to create phase tracks: ${tracksError.message}`);
    }

    console.log(`✅ [PLAYLIST MAPPER] Saved session ${session.id} with ${mappings.length} track mappings`);
    return session.id;

  } catch (error) {
    console.error(`❌ [PLAYLIST MAPPER] Error saving session:`, error);
    throw error;
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
 * Gets locked phase mapping for a specific track from the current session
 */
export async function getLockedPhaseForTrack(trackId: string, sessionId: string): Promise<TrackPhaseMapping | null> {
  try {
    const { data, error } = await supabase
      .from('session_phase_tracks')
      .select('*')
      .eq('session_id', sessionId)
      .eq('track_id', trackId)
      .single();

    if (error || !data) {
      return null;
    }

    const sectionMap = typeof data.section_map === 'string' ? JSON.parse(data.section_map) : data.section_map;

    return {
      trackId: data.track_id,
      trackName: data.track_name,
      artistName: data.artist_name,
      bpm: sectionMap.bpm,
      phase_code: data.phase_key,
      phase_name: getPhaseDisplayName(data.phase_key),
      reason: `Locked mapping: BPM ${sectionMap.bpm} → ${getPhaseDisplayName(data.phase_key)}`,
      validBpm: true
    };

  } catch (error) {
    console.error(`❌ [PLAYLIST MAPPER] Error getting locked phase for track ${trackId}:`, error);
    return null;
  }
}