/**
 * Persistent Narrative Service for Bassline MVP
 * Ensures PT narratives persist for the full duration of each workout_track
 * Fixes issue where narratives only show for first ~5 seconds
 */

import { supabase } from './supabase';

interface TrackNarrativeCache {
  trackId: string;
  workoutTrack: string;
  narrativeText: string;
  sectionType: string;
  timestamp: number;
  locked: boolean; // Whether this is from locked playlist phase or dynamic
}

/**
 * Manages persistent narratives that stay for full workout_track duration
 */
export class PersistentNarrativeService {
  private static cache = new Map<string, TrackNarrativeCache>();
  private static readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes max cache
  
  /**
   * Gets narrative for current track and ensures it persists for full workout_track duration
   * Key difference: narrative stays the same for entire track, only changes on track change
   */
  static async getNarrativeForTrack(args: {
    trackId: string;
    trackName: string;
    artistName: string;
    currentSectionType?: string;
    sessionId?: string;
    forceRefresh?: boolean;
  }): Promise<{
    narrativeText: string;
    workoutTrack: string;
    sectionType: string;
    persistent: boolean;
    source: 'locked' | 'dynamic' | 'cache';
  } | null> {
    
    const { trackId, trackName, artistName, currentSectionType = 'verse', sessionId, forceRefresh = false } = args;
    
    // Check cache first unless forced refresh or track changed
    const cacheKey = `${trackId}:${sessionId || 'no-session'}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && !forceRefresh && (Date.now() - cached.timestamp) < this.CACHE_DURATION) {
      console.log(`📋 [PERSISTENT NARRATIVE] Using cached narrative for ${trackName}`);
      return {
        narrativeText: cached.narrativeText,
        workoutTrack: cached.workoutTrack,
        sectionType: cached.sectionType,
        persistent: true,
        source: 'cache'
      };
    }
    
    console.log(`🔄 [PERSISTENT NARRATIVE] Loading narrative for "${trackName}" by ${artistName}`);
    
    let result = null;
    
    // Step 1: Try locked playlist mapping first (highest priority)
    if (sessionId) {
      result = await this.getLockedNarrative(trackId, trackName, currentSectionType, sessionId);
      if (result) {
        console.log(`🔒 [PERSISTENT NARRATIVE] Using locked narrative: ${trackName} → ${result.workoutTrack}`);
      }
    }
    
    // Step 2: Fallback to dynamic BPM-based mapping
    if (!result) {
      result = await this.getDynamicNarrative(trackName, artistName, currentSectionType);
      if (result) {
        console.log(`⚡ [PERSISTENT NARRATIVE] Using dynamic narrative: ${trackName} → ${result.workoutTrack}`);
      }
    }
    
    // Step 3: Final fallback to default narrative
    if (!result) {
      console.warn(`⚠️ [PERSISTENT NARRATIVE] No narrative found, using default for ${trackName}`);
      result = {
        narrativeText: "Keep up the great work! Match your effort to the music and stay focused on your form.",
        workoutTrack: 'resistance',
        sectionType: currentSectionType,
        persistent: true,
        source: 'cache' as const
      };
    }
    
    // Cache the result so it persists for this track
    this.cache.set(cacheKey, {
      trackId,
      workoutTrack: result.workoutTrack,
      narrativeText: result.narrativeText,
      sectionType: result.sectionType,
      timestamp: Date.now(),
      locked: result.source === 'locked'
    });
    
    console.log(`✅ [PERSISTENT NARRATIVE] Cached narrative for ${trackName} - will persist until track change`);
    
    return result;
  }
  
  /**
   * Gets narrative from locked playlist phase mapping
   */
  private static async getLockedNarrative(
    trackId: string, 
    trackName: string, 
    sectionType: string, 
    sessionId: string
  ): Promise<{
    narrativeText: string;
    workoutTrack: string;
    sectionType: string;
    persistent: boolean;
    source: 'locked';
  } | null> {
    
    try {
      // Get locked phase mapping from session_phase_tracks
      const { data: phaseData, error: phaseError } = await supabase
        .from('session_phase_tracks')
        .select(`
          phase_key,
          track_id,
          track_name,
          artist_name
        `)
        .eq('track_id', trackId)
        .eq('session_id', sessionId)
        .single();
      
      if (phaseError || !phaseData) {
        console.log(`🔍 [PERSISTENT NARRATIVE] No locked mapping found for track ${trackId} in session ${sessionId}`);
        return null;
      }
      
      // Convert phase_key to workout_track
      const workoutTrack = this.convertPhaseKeyToWorkoutTrack(phaseData.phase_key);
      
      // Get narrative text for this workout_track + section combination
      const narrativeText = await this.getNarrativeText(workoutTrack, sectionType);
      
      return {
        narrativeText,
        workoutTrack,
        sectionType,
        persistent: true,
        source: 'locked'
      };
      
    } catch (error) {
      console.error(`❌ [PERSISTENT NARRATIVE] Error getting locked narrative:`, error);
      return null;
    }
  }
  
  /**
   * Gets narrative using dynamic BPM-based mapping from database
   */
  private static async getDynamicNarrative(
    trackName: string,
    artistName: string, 
    sectionType: string
  ): Promise<{
    narrativeText: string;
    workoutTrack: string;
    sectionType: string;
    persistent: boolean;
    source: 'dynamic';
  } | null> {
    
    try {
      // Step 1: Get BPM from streaming_vendor_attributes
      const { data: bpmData, error: bpmError } = await supabase
        .from('streaming_vendor_attributes')
        .select('spotify_tempo')
        .eq('track_name', trackName)
        .eq('artist_name', artistName)
        .is('section_type', null) // Full-track BPM only
        .not('spotify_tempo', 'is', null)
        .single();
      
      if (bpmError || !bpmData || !bpmData.spotify_tempo) {
        console.log(`🔍 [PERSISTENT NARRATIVE] No BPM found for "${trackName}" by ${artistName}`);
        return null;
      }
      
      const bpm = bpmData.spotify_tempo;
      console.log(`🎵 [PERSISTENT NARRATIVE] Found BPM: ${bpm} for "${trackName}"`);
      
      // Step 2: Map BPM to workout phase using database workout_phases table
      const { data: phaseData, error: phaseError } = await supabase
        .from('workout_phases')
        .select('workout_track, target_tempo_min, target_tempo_max')
        .lte('target_tempo_min', bpm)
        .gte('target_tempo_max', bpm)
        .order('target_tempo_min');
      
      if (phaseError || !phaseData || phaseData.length === 0) {
        console.warn(`⚠️ [PERSISTENT NARRATIVE] No workout phase matches BPM ${bpm} for "${trackName}"`);
        return null;
      }
      
      // Use narrowest range if multiple matches (tie-breaking)
      const bestPhase = phaseData.reduce((best, current) => {
        const bestRange = best.target_tempo_max - best.target_tempo_min;
        const currentRange = current.target_tempo_max - current.target_tempo_min;
        return currentRange < bestRange ? current : best;
      });
      
      console.log(`🎯 [PERSISTENT NARRATIVE] Mapped BPM ${bpm} → workout_track: ${bestPhase.workout_track}`);
      
      // Step 3: Get narrative text
      const narrativeText = await this.getNarrativeText(bestPhase.workout_track, sectionType);
      
      return {
        narrativeText,
        workoutTrack: bestPhase.workout_track,
        sectionType,
        persistent: true,
        source: 'dynamic'
      };
      
    } catch (error) {
      console.error(`❌ [PERSISTENT NARRATIVE] Error getting dynamic narrative:`, error);
      return null;
    }
  }
  
  /**
   * Gets narrative text from instruction_narratives table with fallbacks
   */
  private static async getNarrativeText(workoutTrack: string, sectionType: string): Promise<string> {
    try {
      // Try exact match first
      let { data, error } = await supabase
        .from('instruction_narratives')
        .select('text')
        .eq('workout_track', workoutTrack)
        .eq('song_component', sectionType)
        .single();
      
      if (data?.text) {
        console.log(`✅ [PERSISTENT NARRATIVE] Found exact narrative: ${workoutTrack} + ${sectionType}`);
        return data.text;
      }
      
      // Fallback 1: Try generic 'verse' for any verse variant
      if (sectionType.includes('verse')) {
        ({ data, error } = await supabase
          .from('instruction_narratives')
          .select('text')
          .eq('workout_track', workoutTrack)
          .eq('song_component', 'verse')
          .single());
        
        if (data?.text) {
          console.log(`📝 [PERSISTENT NARRATIVE] Using verse fallback for ${workoutTrack}`);
          return data.text;
        }
      }
      
      // Fallback 2: Try generic 'chorus' for any chorus variant
      if (sectionType.includes('chorus')) {
        ({ data, error } = await supabase
          .from('instruction_narratives')
          .select('text')
          .eq('workout_track', workoutTrack)
          .eq('song_component', 'chorus')
          .single());
        
        if (data?.text) {
          console.log(`📝 [PERSISTENT NARRATIVE] Using chorus fallback for ${workoutTrack}`);
          return data.text;
        }
      }
      
      // Fallback 3: Try any narrative for this workout_track
      ({ data, error } = await supabase
        .from('instruction_narratives')
        .select('text')
        .eq('workout_track', workoutTrack)
        .limit(1)
        .single());
      
      if (data?.text) {
        console.log(`📝 [PERSISTENT NARRATIVE] Using any-section fallback for ${workoutTrack}`);
        return data.text;
      }
      
      // Fallback 4: Default resistance narrative
      ({ data, error } = await supabase
        .from('instruction_narratives')
        .select('text')
        .eq('workout_track', 'resistance')
        .limit(1)
        .single());
      
      if (data?.text) {
        console.log(`📝 [PERSISTENT NARRATIVE] Using resistance fallback`);
        return data.text;
      }
      
      // Final fallback: Generic message
      return "Stay strong and match your effort to the music. Keep your form clean and your focus sharp.";
      
    } catch (error) {
      console.error(`❌ [PERSISTENT NARRATIVE] Error getting narrative text:`, error);
      return "Keep up the great work! Stay focused and match your effort to the music.";
    }
  }
  
  /**
   * Converts phase_key from session to workout_track format
   */
  private static convertPhaseKeyToWorkoutTrack(phaseKey: string): string {
    const phaseKeyMap: Record<string, string> = {
      'warm_up': 'warmup',
      'sprint': 'sprint_intervals',
      'climb': 'climb', 
      'resistance_track': 'resistance',
      'sprint_jumps': 'jumps',
      'cool_down': 'cooldown',
      'hills': 'hills',
      'recovery': 'recovery'
    };
    
    return phaseKeyMap[phaseKey] || 'resistance';
  }
  
  /**
   * Clears cache when track changes - called when new track starts playing
   */
  static onTrackChange(newTrackId: string): void {
    console.log(`🔄 [PERSISTENT NARRATIVE] Track changed to ${newTrackId} - clearing irrelevant cache`);
    
    // Keep only the cache entry for the new track
    const cacheEntries = Array.from(this.cache.entries());
    this.cache.clear();
    
    // Restore cache entry for new track if it exists
    cacheEntries.forEach(([key, value]) => {
      if (key.includes(newTrackId)) {
        this.cache.set(key, value);
        console.log(`📋 [PERSISTENT NARRATIVE] Kept cache for current track: ${newTrackId}`);
      }
    });
  }
  
  /**
   * Forces refresh of narrative for current track - useful for testing
   */
  static async refreshCurrentTrack(args: {
    trackId: string;
    trackName: string;
    artistName: string;
    currentSectionType?: string;
    sessionId?: string;
  }) {
    return await this.getNarrativeForTrack({
      ...args,
      forceRefresh: true
    });
  }
  
  /**
   * Gets cache stats for debugging
   */
  static getCacheStats() {
    const entries = Array.from(this.cache.entries());
    return {
      totalEntries: entries.length,
      entries: entries.map(([key, value]) => ({
        key,
        workoutTrack: value.workoutTrack,
        age: Date.now() - value.timestamp,
        locked: value.locked
      }))
    };
  }
  
  /**
   * Clears all cache - useful for testing
   */
  static clearCache(): void {
    this.cache.clear();
    console.log(`🧹 [PERSISTENT NARRATIVE] Cache cleared`);
  }
}