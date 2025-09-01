import { supabase } from './supabase';

export interface SessionSnapshot {
  session_id: string;
  user_id: string;
  session_date: string;
  routine_key: string;
  phases: SessionPhase[];
}

export interface SessionPhase {
  phase_order: number;
  phase_key: string;
  track_id?: string;
  track_uri?: string;
  track_name: string;
  artist_name: string;
  section_map: any;
}

export interface RoutineDescriptor {
  userId: string;
  date?: string;
  routine_key: string;
  format?: string;
  intensity?: string;
  preferredPlaylists?: string[];
  trackPool?: any[];
}

export interface WorkoutPhase {
  name: string;
  duration: number;
  targetTempo: string;
  energyLevel: string;
}

export async function lockSessionForToday(routineDescriptor: RoutineDescriptor): Promise<SessionSnapshot | null> {
  const { userId, routine_key, format, intensity } = routineDescriptor;
  const sessionDate = routineDescriptor.date || new Date().toISOString().split('T')[0];

  try {
    // Check if session already exists (idempotent)
    const { data: existingSession, error: checkError } = await supabase
      .from('workout_sessions')
      .select(`
        id,
        user_id,
        session_date,
        routine_key,
        session_phase_tracks (
          phase_order,
          phase_key,
          track_id,
          track_uri,
          track_name,
          artist_name,
          section_map
        )
      `)
      .eq('user_id', userId)
      .eq('session_date', sessionDate)
      .single();

    if (!checkError && existingSession) {
      console.log('🔄 Session already exists, returning existing snapshot');
      return {
        session_id: existingSession.id,
        user_id: existingSession.user_id,
        session_date: existingSession.session_date,
        routine_key: existingSession.routine_key,
        phases: existingSession.session_phase_tracks.sort((a: any, b: any) => a.phase_order - b.phase_order)
      };
    }

    // Resolve workout phases for the routine
    const workoutPhases = getWorkoutPhasesForRoutine(routine_key, format);
    
    // Create new session
    const { data: newSession, error: sessionError } = await supabase
      .from('workout_sessions')
      .insert([{
        user_id: userId,
        session_date: sessionDate,
        routine_key: routine_key
      }])
      .select()
      .single();

    if (sessionError || !newSession) {
      console.error('Failed to create workout session:', sessionError);
      return null;
    }

    // Select tracks for each phase using deterministic algorithm
    const sessionPhases: SessionPhase[] = [];
    const seed = `${userId}:${sessionDate}:${routine_key}`;
    
    for (let i = 0; i < workoutPhases.length; i++) {
      const phase = workoutPhases[i];
      const selectedTrack = await selectTrackForPhase(phase, seed + `:${i}`);
      
      if (selectedTrack) {
        const sectionMap = await buildSectionMapForTrack(selectedTrack);
        
        sessionPhases.push({
          phase_order: i,
          phase_key: phase.name.toLowerCase().replace(/\s+/g, '_'),
          track_id: selectedTrack.track_id,
          track_uri: selectedTrack.track_uri,
          track_name: selectedTrack.track_name,
          artist_name: selectedTrack.artist_name,
          section_map: sectionMap
        });
      } else {
        // Mark phase as unavailable but still create session
        console.warn(`⚠️ No suitable track found for phase: ${phase.name}`);
        sessionPhases.push({
          phase_order: i,
          phase_key: phase.name.toLowerCase().replace(/\s+/g, '_'),
          track_name: 'Track Unavailable',
          artist_name: 'System',
          section_map: { sections: [], status: 'unavailable' }
        });
      }
    }

    // Insert all phase tracks
    const { error: phasesError } = await supabase
      .from('session_phase_tracks')
      .insert(sessionPhases.map(phase => ({
        session_id: newSession.id,
        ...phase
      })));

    if (phasesError) {
      console.error('Failed to create session phase tracks:', phasesError);
      // Clean up the session
      await supabase.from('workout_sessions').delete().eq('id', newSession.id);
      return null;
    }

    console.log(`✅ Session locked for ${userId} on ${sessionDate} with ${sessionPhases.length} phases`);
    
    return {
      session_id: newSession.id,
      user_id: newSession.user_id,
      session_date: newSession.session_date,
      routine_key: newSession.routine_key,
      phases: sessionPhases
    };

  } catch (error) {
    console.error('Error in lockSessionForToday:', error);
    return null;
  }
}

function getWorkoutPhasesForRoutine(routineKey: string, format?: string): WorkoutPhase[] {
  // Default spinning phases if no specific routine
  if (routineKey === 'spontaneous' || format === 'spinning') {
    return [
      { name: 'Warm Up', duration: 300, targetTempo: '70-79', energyLevel: 'low' },
      { name: 'Sprint', duration: 180, targetTempo: '140-200', energyLevel: 'high' },
      { name: 'Rolling Hills', duration: 480, targetTempo: '95-119', energyLevel: 'medium' },
      { name: 'Resistance Track', duration: 360, targetTempo: '85-94', energyLevel: 'medium' },
      { name: 'Sprint Jumps', duration: 240, targetTempo: '120-139', energyLevel: 'high' },
      { name: 'Cool Down', duration: 300, targetTempo: '60-69', energyLevel: 'low' }
    ];
  }

  // Add other routine types as needed
  return [
    { name: 'Warm Up', duration: 300, targetTempo: '70-79', energyLevel: 'low' },
    { name: 'Main Workout', duration: 1500, targetTempo: '95-139', energyLevel: 'high' },
    { name: 'Cool Down', duration: 300, targetTempo: '60-69', energyLevel: 'low' }
  ];
}

async function selectTrackForPhase(phase: WorkoutPhase, seed: string): Promise<any | null> {
  try {
    // Extract BPM range from targetTempo
    const tempoMatch = phase.targetTempo.match(/(\d+)-(\d+)/);
    if (!tempoMatch) return null;
    
    const minBpm = parseInt(tempoMatch[1]);
    const maxBpm = parseInt(tempoMatch[2]);

    // Find tracks with suitable BPM from streaming_vendor_attributes
    const { data: tracks, error } = await supabase
      .from('streaming_vendor_attributes')
      .select('track_name, artist_name, spotify_track_id, spotify_tempo')
      .gte('spotify_tempo', minBpm)
      .lte('spotify_tempo', maxBpm)
      .not('spotify_tempo', 'is', null)
      .limit(50);

    if (error || !tracks || tracks.length === 0) {
      console.warn(`No tracks found for BPM range ${minBpm}-${maxBpm}`);
      return null;
    }

    // Deterministic selection using seed
    const seedHash = hashString(seed);
    const selectedTrack = tracks[Math.abs(seedHash) % tracks.length];

    return {
      track_id: selectedTrack.spotify_track_id,
      track_uri: selectedTrack.spotify_track_id ? `spotify:track:${selectedTrack.spotify_track_id}` : undefined,
      track_name: selectedTrack.track_name,
      artist_name: selectedTrack.artist_name,
      tempo: selectedTrack.spotify_tempo
    };

  } catch (error) {
    console.error('Error selecting track for phase:', error);
    return null;
  }
}

async function buildSectionMapForTrack(selectedTrack: any): Promise<any> {
  try {
    // Get section data from streaming_vendor_attributes
    const { data: sections, error } = await supabase
      .from('streaming_vendor_attributes')
      .select('section_type, section_number, timestamp_ms, event_type')
      .eq('track_name', selectedTrack.track_name)
      .eq('artist_name', selectedTrack.artist_name)
      .eq('event_type', 'section_change')
      .order('timestamp_ms');

    if (error || !sections) {
      console.warn(`No section data found for ${selectedTrack.track_name}`);
      return { sections: [], status: 'no_data' };
    }

    // Build section windows for narratives
    const sectionWindows = [];
    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];
      const nextSection = sections[i + 1];
      
      sectionWindows.push({
        type: section.section_type,
        number: section.section_number || 1,
        start_ms: section.timestamp_ms,
        end_ms: nextSection ? nextSection.timestamp_ms : null
      });
    }

    return {
      sections: sectionWindows,
      total_sections: sections.length,
      status: 'complete'
    };

  } catch (error) {
    console.error('Error building section map:', error);
    return { sections: [], status: 'error' };
  }
}

// Simple hash function for deterministic selection
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash;
}

export async function getSessionSnapshot(userId: string, date?: string): Promise<SessionSnapshot | null> {
  const sessionDate = date || new Date().toISOString().split('T')[0];
  
  try {
    const { data: session, error } = await supabase
      .from('workout_sessions')
      .select(`
        id,
        user_id,
        session_date,
        routine_key,
        session_phase_tracks (
          phase_order,
          phase_key,
          track_id,
          track_uri,
          track_name,
          artist_name,
          section_map
        )
      `)
      .eq('user_id', userId)
      .eq('session_date', sessionDate)
      .single();

    if (error || !session) {
      return null;
    }

    return {
      session_id: session.id,
      user_id: session.user_id,
      session_date: session.session_date,
      routine_key: session.routine_key,
      phases: session.session_phase_tracks.sort((a: any, b: any) => a.phase_order - b.phase_order)
    };

  } catch (error) {
    console.error('Error getting session snapshot:', error);
    return null;
  }
}