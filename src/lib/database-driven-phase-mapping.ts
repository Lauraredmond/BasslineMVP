/**
 * Database-Driven Phase Mapping Service
 * Replaces ALL hardcoded BPM ranges with dynamic Supabase queries
 * 
 * This service ensures the frontend always uses current database ranges
 * from the workout_phases table instead of hardcoded values.
 */

import { supabase } from './supabase';

export interface WorkoutPhaseRange {
  id: string;
  workout_track: string;
  target_tempo_min: number;
  target_tempo_max: number;
  created_at: string;
  workout_type_id: string | null;
}

export interface BPMMapping {
  bpm: number;
  workout_track: string;
  range: {
    min: number;
    max: number;
  };
  confidence: number; // 1.0 = perfect match, 0.5 = fallback
}

class DatabaseDrivenPhaseMappingService {
  private static instance: DatabaseDrivenPhaseMappingService;
  private phaseCache: WorkoutPhaseRange[] | null = null;
  private lastCacheUpdate: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  private constructor() {}

  public static getInstance(): DatabaseDrivenPhaseMappingService {
    if (!DatabaseDrivenPhaseMappingService.instance) {
      DatabaseDrivenPhaseMappingService.instance = new DatabaseDrivenPhaseMappingService();
    }
    return DatabaseDrivenPhaseMappingService.instance;
  }

  /**
   * Get workout_track for a given BPM by querying workout_phases table
   * This replaces ALL hardcoded BPM mapping functions
   */
  public async getWorkoutTrackForBPM(bpm: number): Promise<BPMMapping | null> {
    try {
      const phases = await this.getWorkoutPhases();
      
      // Find exact matches first (BPM within range)
      const exactMatches = phases.filter(phase => 
        bpm >= phase.target_tempo_min && bpm <= phase.target_tempo_max
      );

      if (exactMatches.length > 0) {
        // If multiple matches, prefer the narrowest range
        const bestMatch = exactMatches.reduce((best, current) => {
          const bestRange = best.target_tempo_max - best.target_tempo_min;
          const currentRange = current.target_tempo_max - current.target_tempo_min;
          return currentRange < bestRange ? current : best;
        });

        console.log(`🎯 [DB PHASE MAPPING] BPM ${bpm} → ${bestMatch.workout_track} (${bestMatch.target_tempo_min}-${bestMatch.target_tempo_max})`);
        
        return {
          bpm,
          workout_track: bestMatch.workout_track,
          range: {
            min: bestMatch.target_tempo_min,
            max: bestMatch.target_tempo_max
          },
          confidence: 1.0
        };
      }

      // Fallback: Find closest range
      let closestPhase: WorkoutPhaseRange | null = null;
      let minDistance = Infinity;

      for (const phase of phases) {
        const rangeMid = (phase.target_tempo_min + phase.target_tempo_max) / 2;
        const distance = Math.abs(bpm - rangeMid);
        
        if (distance < minDistance) {
          minDistance = distance;
          closestPhase = phase;
        }
      }

      if (closestPhase) {
        console.log(`⚠️ [DB PHASE MAPPING] BPM ${bpm} → ${closestPhase.workout_track} (fallback - closest range)`);
        
        return {
          bpm,
          workout_track: closestPhase.workout_track,
          range: {
            min: closestPhase.target_tempo_min,
            max: closestPhase.target_tempo_max
          },
          confidence: 0.5
        };
      }

      console.error(`❌ [DB PHASE MAPPING] No workout phase found for BPM ${bpm}`);
      return null;

    } catch (error) {
      console.error(`❌ [DB PHASE MAPPING] Error mapping BPM ${bpm}:`, error);
      return null;
    }
  }

  /**
   * Get all workout phases from database with caching
   */
  private async getWorkoutPhases(): Promise<WorkoutPhaseRange[]> {
    const now = Date.now();
    
    // Return cached data if still valid
    if (this.phaseCache && (now - this.lastCacheUpdate) < this.CACHE_DURATION) {
      return this.phaseCache;
    }

    try {
      console.log('📊 [DB PHASE MAPPING] Fetching workout phases from database...');
      
      const { data: phases, error } = await supabase
        .from('workout_phases')
        .select('id, workout_track, target_tempo_min, target_tempo_max, created_at, workout_type_id')
        .order('target_tempo_min');

      if (error) {
        throw error;
      }

      if (!phases || phases.length === 0) {
        throw new Error('No workout phases found in database');
      }

      // Update cache
      this.phaseCache = phases;
      this.lastCacheUpdate = now;

      console.log(`✅ [DB PHASE MAPPING] Loaded ${phases.length} workout phases from database`);
      phases.forEach(phase => {
        console.log(`  - ${phase.workout_track}: ${phase.target_tempo_min}-${phase.target_tempo_max} BPM`);
      });

      return phases;

    } catch (error) {
      console.error('❌ [DB PHASE MAPPING] Failed to fetch workout phases:', error);
      
      // Return cached data even if stale, if available
      if (this.phaseCache) {
        console.warn('⚠️ [DB PHASE MAPPING] Using stale cached data due to fetch error');
        return this.phaseCache;
      }
      
      throw error;
    }
  }

  /**
   * Clear cache to force refresh from database
   */
  public clearCache(): void {
    console.log('🗑️ [DB PHASE MAPPING] Cache cleared - will refresh from database on next request');
    this.phaseCache = null;
    this.lastCacheUpdate = 0;
  }

  /**
   * Get display name for workout_track
   */
  public getDisplayName(workoutTrack: string): string {
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

    return displayNames[workoutTrack] || workoutTrack.charAt(0).toUpperCase() + workoutTrack.slice(1);
  }

  /**
   * Validate that a BPM falls within expected ranges from database
   */
  public async validateBPMRange(bpm: number): Promise<{
    valid: boolean;
    expectedRanges: Array<{ workout_track: string; min: number; max: number }>;
    message: string;
  }> {
    try {
      const phases = await this.getWorkoutPhases();
      const ranges = phases.map(phase => ({
        workout_track: phase.workout_track,
        min: phase.target_tempo_min,
        max: phase.target_tempo_max
      }));

      const validRanges = ranges.filter(range => bpm >= range.min && bpm <= range.max);
      
      return {
        valid: validRanges.length > 0,
        expectedRanges: ranges,
        message: validRanges.length > 0 
          ? `BPM ${bpm} is valid for: ${validRanges.map(r => r.workout_track).join(', ')}`
          : `BPM ${bpm} doesn't match any database ranges. Closest ranges: ${ranges.map(r => `${r.workout_track} (${r.min}-${r.max})`).join(', ')}`
      };
    } catch (error) {
      return {
        valid: false,
        expectedRanges: [],
        message: `Error validating BPM ${bpm}: ${error}`
      };
    }
  }
}

// Export singleton instance
export const databasePhaseMappingService = DatabaseDrivenPhaseMappingService.getInstance();

// Export helper functions for easy replacement of hardcoded functions
export async function getWorkoutTrackForBPM(bpm: number): Promise<string | null> {
  const result = await databasePhaseMappingService.getWorkoutTrackForBPM(bpm);
  return result?.workout_track || null;
}

export async function mapBPMToPhase(bpm: number): Promise<BPMMapping | null> {
  return databasePhaseMappingService.getWorkoutTrackForBPM(bpm);
}

export function clearPhaseCache(): void {
  databasePhaseMappingService.clearCache();
}