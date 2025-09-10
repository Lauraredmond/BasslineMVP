/**
 * Spotify-Phase Integration
 * Integrates current Spotify track with workout phase mapping
 * Implements the runtime behavior from primer.md
 */

import { spotifyService, SpotifyPlaybackState } from './spotify';
import { getLockedPhaseForTrack } from './workoutPhaseMapper';
import { supabase } from './supabase';

export interface CurrentTrackPhase {
  track_id: string;
  track_uri: string;
  track_name: string;
  artist_name: string;
  progress_ms: number;
  duration_ms: number;
  workout_track: string | null;
  section_type: string | null;
  phase_locked: boolean;
  session_id: string | null;
  error: string | null;
}

export interface TrackChangeEvent {
  previous_track_id: string | null;
  current_track_id: string;
  recomputed: boolean;
  phase_changed: boolean;
  error: string | null;
}

/**
 * Monitors Spotify playback and manages workout phase state
 */
export class SpotifyPhaseManager {
  private currentTrackId: string | null = null;
  private currentSessionId: string | null = null;
  private currentPhase: CurrentTrackPhase | null = null;
  private listeners: Array<(phase: CurrentTrackPhase | null) => void> = [];

  /**
   * Process Spotify playback state and update workout phase
   * Called by the polling system when track changes
   */
  async processPlaybackState(
    playbackState: SpotifyPlaybackState | null,
    sessionId: string | null
  ): Promise<TrackChangeEvent | null> {
    const previousTrackId = this.currentTrackId;
    
    // Handle no playback
    if (!playbackState?.item?.id || !playbackState.is_playing) {
      console.log(`⏸️ [SPOTIFY-PHASE] No active playback`);
      this.updateCurrentPhase(null);
      return null;
    }

    const currentTrackId = playbackState.item.id;
    this.currentSessionId = sessionId;

    // Check if track changed
    const trackChanged = currentTrackId !== previousTrackId;
    
    if (!trackChanged) {
      // Same track, just update section if needed
      if (this.currentPhase) {
        this.currentPhase.progress_ms = playbackState.progress_ms || 0;
        this.currentPhase.section_type = await this.detectCurrentSection(
          currentTrackId,
          playbackState.progress_ms || 0
        );
        this.notifyListeners(this.currentPhase);
      }
      return null;
    }

    console.log(`🎵 [SPOTIFY-PHASE] Track changed: ${previousTrackId} → ${currentTrackId}`);
    this.currentTrackId = currentTrackId;

    // Recompute phase for new track
    const recomputeResult = await this.recomputePhaseForTrack(currentTrackId, playbackState);
    
    return {
      previous_track_id: previousTrackId,
      current_track_id: currentTrackId,
      recomputed: true,
      phase_changed: recomputeResult.phase_changed,
      error: recomputeResult.error
    };
  }

  /**
   * Recompute phase for current track (called once when track becomes current)
   */
  private async recomputePhaseForTrack(
    trackId: string,
    playbackState: SpotifyPlaybackState
  ): Promise<{ phase_changed: boolean; error: string | null }> {
    console.log(`🔄 [SPOTIFY-PHASE] Recomputing phase for track: ${trackId}`);

    try {
      const previousPhase = this.currentPhase?.workout_track || null;
      let newPhase: CurrentTrackPhase;

      // Try to get locked phase first (if in a session)
      if (this.currentSessionId) {
        const lockedMapping = await getLockedPhaseForTrack(trackId, this.currentSessionId);
        
        if (lockedMapping && !lockedMapping.error) {
          console.log(`🔒 [SPOTIFY-PHASE] Using locked phase: ${lockedMapping.workout_track}`);
          
          newPhase = {
            track_id: trackId,
            track_uri: `spotify:track:${trackId}`,
            track_name: playbackState.item.name,
            artist_name: playbackState.item.artists[0]?.name || '',
            progress_ms: playbackState.progress_ms || 0,
            duration_ms: playbackState.item.duration_ms,
            workout_track: lockedMapping.workout_track,
            section_type: await this.detectCurrentSection(trackId, playbackState.progress_ms || 0),
            phase_locked: true,
            session_id: this.currentSessionId,
            error: null
          };
        } else {
          // No locked mapping found - explicit error per primer.md
          const error = `No locked phase mapping found for track_id=${trackId} in session=${this.currentSessionId}`;
          console.error(`❌ [SPOTIFY-PHASE] ${error}`);
          
          newPhase = {
            track_id: trackId,
            track_uri: `spotify:track:${trackId}`,
            track_name: playbackState.item.name,
            artist_name: playbackState.item.artists[0]?.name || '',
            progress_ms: playbackState.progress_ms || 0,
            duration_ms: playbackState.item.duration_ms,
            workout_track: null,
            section_type: null,
            phase_locked: false,
            session_id: this.currentSessionId,
            error
          };
        }
      } else {
        // No session - cannot map to phase
        const error = `No session active; unable to map phase for track_id=${trackId}`;
        console.error(`❌ [SPOTIFY-PHASE] ${error}`);
        
        newPhase = {
          track_id: trackId,
          track_uri: `spotify:track:${trackId}`,
          track_name: playbackState.item.name,
          artist_name: playbackState.item.artists[0]?.name || '',
          progress_ms: playbackState.progress_ms || 0,
          duration_ms: playbackState.item.duration_ms,
          workout_track: null,
          section_type: null,
          phase_locked: false,
          session_id: null,
          error
        };
      }

      this.updateCurrentPhase(newPhase);
      
      const phaseChanged = newPhase.workout_track !== previousPhase;
      if (phaseChanged) {
        console.log(`🔄 [SPOTIFY-PHASE] Phase changed: ${previousPhase} → ${newPhase.workout_track}`);
      }

      return { phase_changed: phaseChanged, error: newPhase.error };

    } catch (error) {
      const errorMsg = `Error recomputing phase for track ${trackId}: ${error.message}`;
      console.error(`💥 [SPOTIFY-PHASE] ${errorMsg}`, error);
      
      this.updateCurrentPhase({
        track_id: trackId,
        track_uri: `spotify:track:${trackId}`,
        track_name: playbackState.item.name,
        artist_name: playbackState.item.artists[0]?.name || '',
        progress_ms: playbackState.progress_ms || 0,
        duration_ms: playbackState.item.duration_ms,
        workout_track: null,
        section_type: null,
        phase_locked: false,
        session_id: this.currentSessionId,
        error: errorMsg
      });

      return { phase_changed: false, error: errorMsg };
    }
  }

  /**
   * Detect current section type based on track progress
   */
  private async detectCurrentSection(trackId: string, progressMs: number): Promise<string | null> {
    try {
      // Try to find section from streaming_vendor_attributes
      const { data, error } = await supabase
        .from('streaming_vendor_attributes')
        .select('section_type, timestamp_ms')
        .eq('track_id', trackId)
        .not('section_type', 'is', null)
        .not('timestamp_ms', 'is', null)
        .lte('timestamp_ms', progressMs)
        .order('timestamp_ms', { ascending: false })
        .limit(1)
        .single();

      if (error || !data) {
        // No section data - return null per primer.md (no fallbacks)
        return null;
      }

      console.log(`📍 [SPOTIFY-PHASE] Current section: ${data.section_type} at ${progressMs}ms`);
      return data.section_type;

    } catch (error) {
      console.warn(`⚠️ [SPOTIFY-PHASE] Error detecting section:`, error);
      return null;
    }
  }

  /**
   * Update current phase and notify listeners
   */
  private updateCurrentPhase(phase: CurrentTrackPhase | null): void {
    this.currentPhase = phase;
    this.notifyListeners(phase);
  }

  /**
   * Notify all listeners of phase changes
   */
  private notifyListeners(phase: CurrentTrackPhase | null): void {
    this.listeners.forEach(listener => {
      try {
        listener(phase);
      } catch (error) {
        console.error(`❌ [SPOTIFY-PHASE] Listener error:`, error);
      }
    });
  }

  /**
   * Subscribe to phase changes
   */
  onPhaseChange(callback: (phase: CurrentTrackPhase | null) => void): () => void {
    this.listeners.push(callback);
    
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  /**
   * Get current phase state
   */
  getCurrentPhase(): CurrentTrackPhase | null {
    return this.currentPhase;
  }

  /**
   * Set session ID for locked phase lookups
   */
  setSessionId(sessionId: string | null): void {
    console.log(`🏷️ [SPOTIFY-PHASE] Session ID set: ${sessionId}`);
    this.currentSessionId = sessionId;
  }

  /**
   * Clear current state (e.g., when playlist ends)
   */
  reset(): void {
    console.log(`🔄 [SPOTIFY-PHASE] Resetting state`);
    this.currentTrackId = null;
    this.currentSessionId = null;
    this.updateCurrentPhase(null);
  }
}

// Export singleton instance
export const spotifyPhaseManager = new SpotifyPhaseManager();