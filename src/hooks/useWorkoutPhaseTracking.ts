/**
 * Workout Phase Tracking Hook
 * Integrates the primer.md phase mapping model with Spotify playback state
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { spotifyService, SpotifyPlaybackState } from '@/lib/spotify';
import { spotifyPhaseManager, CurrentTrackPhase, TrackChangeEvent } from '@/lib/spotifyPhaseIntegration';
import { lockPlaylistPhases, PlaylistPhaseMappingResult } from '@/lib/workoutPhaseMapper';

export interface WorkoutPhaseState {
  currentPhase: CurrentTrackPhase | null;
  sessionId: string | null;
  isPolling: boolean;
  lastTrackChange: TrackChangeEvent | null;
  error: string | null;
}

export interface UseWorkoutPhaseTrackingOptions {
  enabled?: boolean;
  pollingInterval?: number;
  onPhaseChange?: (phase: CurrentTrackPhase | null) => void;
  onTrackChange?: (event: TrackChangeEvent) => void;
  onError?: (error: string) => void;
}

/**
 * Hook for tracking workout phases based on current Spotify playback
 * Implements the runtime behavior from primer.md
 */
export function useWorkoutPhaseTracking(options: UseWorkoutPhaseTrackingOptions = {}) {
  const {
    enabled = true,
    pollingInterval = 8000, // 8s for music-sync per primer.md
    onPhaseChange,
    onTrackChange,
    onError
  } = options;

  const [state, setState] = useState<WorkoutPhaseState>({
    currentPhase: null,
    sessionId: null,
    isPolling: false,
    lastTrackChange: null,
    error: null
  });

  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const previousTrackId = useRef<string | null>(null);

  /**
   * Start Spotify polling and phase tracking
   */
  const startPolling = useCallback(() => {
    if (!enabled || pollingIntervalRef.current) return;

    console.log('🔄 [PHASE TRACKING] Starting polling with interval:', pollingInterval);

    const poll = async () => {
      try {
        if (!spotifyService.isAuthenticated()) {
          setState(prev => ({ ...prev, error: 'Spotify not authenticated', isPolling: false }));
          return;
        }

        // Get current playback state
        const playbackState = await spotifyService.getCurrentPlayback();
        
        // Process through phase manager
        const trackChangeEvent = await spotifyPhaseManager.processPlaybackState(
          playbackState,
          state.sessionId
        );

        // Update state
        setState(prev => ({
          ...prev,
          currentPhase: spotifyPhaseManager.getCurrentPhase(),
          lastTrackChange: trackChangeEvent || prev.lastTrackChange,
          isPolling: true,
          error: null
        }));

        // Notify callbacks
        if (trackChangeEvent && onTrackChange) {
          onTrackChange(trackChangeEvent);
        }

        // Log current status
        const currentPhase = spotifyPhaseManager.getCurrentPhase();
        if (currentPhase) {
          console.log(`🎵 [PHASE TRACKING] Current: ${currentPhase.track_name} → ${currentPhase.workout_track || 'NO PHASE'}`);
          if (currentPhase.error) {
            console.error(`❌ [PHASE TRACKING] Phase error: ${currentPhase.error}`);
            if (onError) onError(currentPhase.error);
          }
        }

      } catch (error) {
        const errorMsg = `Polling error: ${error.message}`;
        console.error(`❌ [PHASE TRACKING] ${errorMsg}`, error);
        setState(prev => ({ ...prev, error: errorMsg, isPolling: false }));
        if (onError) onError(errorMsg);
      }
    };

    // Initial poll
    poll();
    
    // Set up interval
    pollingIntervalRef.current = setInterval(poll, pollingInterval);
    setState(prev => ({ ...prev, isPolling: true }));

  }, [enabled, pollingInterval, state.sessionId, onTrackChange, onError]);

  /**
   * Stop polling
   */
  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      console.log('⏹️ [PHASE TRACKING] Stopping polling');
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
      setState(prev => ({ ...prev, isPolling: false }));
    }
  }, []);

  /**
   * Set session ID for locked phase lookups
   */
  const setSessionId = useCallback((sessionId: string | null) => {
    console.log(`🏷️ [PHASE TRACKING] Setting session ID: ${sessionId}`);
    setState(prev => ({ ...prev, sessionId }));
    spotifyPhaseManager.setSessionId(sessionId);
  }, []);

  /**
   * Lock playlist phases (called when playlist is selected)
   */
  const lockPlaylistForSession = useCallback(async (trackIds: string[]): Promise<PlaylistPhaseMappingResult> => {
    console.log(`🔒 [PHASE TRACKING] Locking ${trackIds.length} tracks for session`);
    
    try {
      const result = await lockPlaylistPhases(trackIds);
      
      if (result.success && result.session_id) {
        setSessionId(result.session_id);
        console.log(`✅ [PHASE TRACKING] Playlist locked successfully with session: ${result.session_id}`);
      } else {
        console.error(`❌ [PHASE TRACKING] Playlist locking failed:`, result.errors);
        if (onError) onError(`Failed to lock playlist: ${result.errors.join(', ')}`);
      }
      
      return result;
    } catch (error) {
      const errorMsg = `Error locking playlist: ${error.message}`;
      console.error(`❌ [PHASE TRACKING] ${errorMsg}`, error);
      if (onError) onError(errorMsg);
      throw error;
    }
  }, [setSessionId, onError]);

  /**
   * Reset phase tracking (e.g., when workout ends)
   */
  const reset = useCallback(() => {
    console.log('🔄 [PHASE TRACKING] Resetting');
    stopPolling();
    spotifyPhaseManager.reset();
    setState({
      currentPhase: null,
      sessionId: null,
      isPolling: false,
      lastTrackChange: null,
      error: null
    });
  }, [stopPolling]);

  // Set up phase change listener
  useEffect(() => {
    const unsubscribe = spotifyPhaseManager.onPhaseChange((phase) => {
      setState(prev => ({ ...prev, currentPhase: phase }));
      if (onPhaseChange) onPhaseChange(phase);
    });

    return unsubscribe;
  }, [onPhaseChange]);

  // Auto-start/stop polling based on enabled state
  useEffect(() => {
    if (enabled) {
      startPolling();
    } else {
      stopPolling();
    }

    return () => stopPolling();
  }, [enabled, startPolling, stopPolling]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  return {
    // Current state
    currentPhase: state.currentPhase,
    sessionId: state.sessionId,
    isPolling: state.isPolling,
    lastTrackChange: state.lastTrackChange,
    error: state.error,

    // Actions
    startPolling,
    stopPolling,
    setSessionId,
    lockPlaylistForSession,
    reset,

    // Computed values
    hasActiveTrack: !!state.currentPhase?.track_id,
    hasValidPhase: !!state.currentPhase?.workout_track && !state.currentPhase?.error,
    isTrackLocked: !!state.currentPhase?.phase_locked,
    currentWorkoutTrack: state.currentPhase?.workout_track || null,
    currentSectionType: state.currentPhase?.section_type || null
  };
}