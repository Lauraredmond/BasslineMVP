import { useState, useEffect, useRef, useCallback } from 'react';
import { spotifyService, SpotifyPlaybackState } from '@/lib/spotify';

interface UseSpotifyPollingOptions {
  enabled?: boolean;
  routeActive?: boolean;
  onPlaybackChange?: (state: SpotifyPlaybackState | null) => void;
}

interface PollingState {
  playbackState: SpotifyPlaybackState | null;
  isPolling: boolean;
  consecutiveNoChanges: number;
  lastStateHash: string | null;
}

export const useSpotifyPolling = (options: UseSpotifyPollingOptions = {}) => {
  const { enabled = true, routeActive = true, onPlaybackChange } = options;
  
  const [state, setState] = useState<PollingState>({
    playbackState: null,
    isPolling: false,
    consecutiveNoChanges: 0,
    lastStateHash: null
  });
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const pausedTimeRef = useRef<number | null>(null);
  const windowFocusedRef = useRef<boolean>(true);
  
  // Track window focus state
  useEffect(() => {
    const handleFocus = () => {
      windowFocusedRef.current = true;
      console.log('🔍 [POLLING] Window focused');
    };
    
    const handleBlur = () => {
      windowFocusedRef.current = false;
      console.log('⏸️ [POLLING] Window blurred');
    };
    
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);
  
  // Determine if we should poll
  const shouldPoll = useCallback((): boolean => {
    if (!enabled || !routeActive) return false;
    
    const visibilityGatingEnabled = import.meta.env.VITE_SPOTIFY_VISIBILITY_GATING !== '0';
    
    if (visibilityGatingEnabled) {
      if (document.hidden || document.visibilityState !== 'visible') return false;
      if (!navigator.onLine) return false;
      if (!windowFocusedRef.current) return false;
    }
    
    return true;
  }, [enabled, routeActive]);
  
  // Calculate backoff interval
  const getPollingInterval = useCallback(() => {
    const baseInterval = parseInt(import.meta.env.VITE_SPOTIFY_POLL_INTERVAL_MS) || 60000;
    const consecutiveNoChanges = state.consecutiveNoChanges;
    
    if (consecutiveNoChanges >= 5) return Math.min(300000, baseInterval * 5); // 5 min cap
    if (consecutiveNoChanges >= 3) return baseInterval * 2; // 120s
    return baseInterval; // 60s
  }, [state.consecutiveNoChanges]);
  
  // Create state hash for change detection
  const createStateHash = (playbackState: SpotifyPlaybackState | null): string => {
    if (!playbackState?.item) return 'no-track';
    return `${playbackState.item.id}-${playbackState.is_playing}-${Math.floor((playbackState.progress_ms || 0) / 5000)}`;
  };
  
  // Polling function
  const poll = useCallback(async () => {
    if (!shouldPoll()) {
      console.log('⏸️ [POLLING] Skipping poll - conditions not met');
      return;
    }
    
    try {
      if (import.meta.env.VITE_DEBUG_FUNCTIONS === 'true') {
        console.log('📊 [FUNCTION_USAGE] spotify.getCurrentPlayback called', {
          timestamp: new Date().toISOString(),
          consecutiveNoChanges: state.consecutiveNoChanges,
          interval: getPollingInterval()
        });
      }
      
      const newState = await spotifyService.getCurrentPlayback();
      const newStateHash = createStateHash(newState);
      
      // Check for pause suspension (>30s paused)
      if (newState && !newState.is_playing) {
        if (!pausedTimeRef.current) {
          pausedTimeRef.current = Date.now();
        } else if (Date.now() - pausedTimeRef.current > 30000) {
          console.log('⏸️ [POLLING] Suspending poll - paused >30s');
          return;
        }
      } else {
        pausedTimeRef.current = null;
      }
      
      // Update state and detect changes
      const hasChanged = newStateHash !== state.lastStateHash;
      
      setState(prev => ({
        playbackState: newState,
        isPolling: true,
        consecutiveNoChanges: hasChanged ? 0 : prev.consecutiveNoChanges + 1,
        lastStateHash: newStateHash
      }));
      
      if (hasChanged && onPlaybackChange) {
        onPlaybackChange(newState);
      }
      
      console.log('🔍 [POLLING] Poll result:', {
        hasChanged,
        consecutiveNoChanges: hasChanged ? 0 : state.consecutiveNoChanges + 1,
        nextInterval: hasChanged ? getPollingInterval() : getPollingInterval()
      });
      
    } catch (error) {
      console.error('❌ [POLLING] Failed:', error);
    }
  }, [shouldPoll, state.consecutiveNoChanges, state.lastStateHash, onPlaybackChange, getPollingInterval]);
  
  // Start/stop polling based on conditions
  useEffect(() => {
    if (!enabled || !routeActive) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        setState(prev => ({ ...prev, isPolling: false }));
      }
      return;
    }
    
    const startPolling = () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      
      // Initial poll
      poll();
      
      // Set up interval with current backoff
      const interval = getPollingInterval();
      intervalRef.current = setInterval(poll, interval);
      
      console.log(`🔄 [POLLING] Started with ${interval}ms interval`);
    };
    
    startPolling();
    
    // Restart polling when backoff changes
    const backoffInterval = setInterval(() => {
      const newInterval = getPollingInterval();
      if (intervalRef.current && newInterval !== (intervalRef.current as any)._interval) {
        console.log(`🔄 [POLLING] Adjusting interval to ${newInterval}ms`);
        startPolling();
      }
    }, 5000);
    
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      clearInterval(backoffInterval);
    };
  }, [enabled, routeActive, poll, getPollingInterval]);
  
  // Handle visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && shouldPoll()) {
        console.log('👁️ [POLLING] Page visible - triggering immediate poll');
        poll();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', poll);
    window.addEventListener('offline', () => {
      console.log('📵 [POLLING] Going offline');
    });
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', poll);
      window.removeEventListener('offline', () => {});
    };
  }, [poll, shouldPoll]);
  
  return {
    playbackState: state.playbackState,
    isPolling: state.isPolling,
    consecutiveNoChanges: state.consecutiveNoChanges,
    currentInterval: getPollingInterval(),
    manualPoll: poll
  };
};