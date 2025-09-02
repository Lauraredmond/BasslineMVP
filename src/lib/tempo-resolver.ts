import { supabase } from './supabase';
import { spotifyService } from './spotify';
import { secureRapidSoundnetService } from './rapid-soundnet-secure';

export interface TempoResult {
  bpm: number;
  source: 'database' | 'spotify' | 'rapidapi' | 'fallback';
  adjusted: boolean;
  confidence: 'high' | 'medium' | 'low';
  originalValue?: number;
  trackId?: string;
  timestamp: string;
}

export interface TempoResolverOptions {
  trackId?: string;
  trackName: string;
  artistName: string;
  forceRefresh?: boolean;
  previousTempo?: number;
}

class TempoResolver {
  private cache = new Map<string, TempoResult>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  async resolveTempo(options: TempoResolverOptions): Promise<TempoResult> {
    const { trackId, trackName, artistName, forceRefresh = false, previousTempo } = options;
    const cacheKey = `${trackName}:${artistName}`.toLowerCase();
    
    console.log(`🎯 [TEMPO RESOLVER] Resolving tempo for: "${trackName}" by "${artistName}"`);
    
    // Check cache first (unless force refresh)
    if (!forceRefresh && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)!;
      const age = Date.now() - new Date(cached.timestamp).getTime();
      if (age < this.CACHE_TTL) {
        console.log(`📚 [TEMPO RESOLVER] Using cached result: ${cached.bpm} BPM (${cached.source})`);
        return cached;
      }
    }

    // Step 1: Try database first (fastest)
    const dbResult = await this.getTempoFromDatabase(trackName, artistName);
    if (dbResult) {
      const result = this.validateAndCorrectTempo(dbResult, 'database', previousTempo);
      this.cache.set(cacheKey, result);
      return result;
    }

    // Step 2: Try Spotify audio features (preferred API)
    if (trackId) {
      const spotifyResult = await this.getTempoFromSpotify(trackId);
      if (spotifyResult) {
        const result = this.validateAndCorrectTempo(spotifyResult, 'spotify', previousTempo);
        this.cache.set(cacheKey, result);
        
        // Update database for future use
        this.updateDatabaseTempo(trackName, artistName, result.bpm, trackId);
        return result;
      }
    }

    // Step 3: Try RapidAPI (fallback)
    const rapidResult = await this.getTempoFromRapidAPI(trackName, artistName);
    if (rapidResult) {
      const result = this.validateAndCorrectTempo(rapidResult, 'rapidapi', previousTempo);
      this.cache.set(cacheKey, result);
      
      // Update database for future use
      this.updateDatabaseTempo(trackName, artistName, result.bmp, trackId);
      return result;
    }

    // Step 4: Intelligent fallback based on genre/previous tempo
    const fallbackTempo = this.generateFallbackTempo(trackName, artistName, previousTempo);
    const result: TempoResult = {
      bpm: fallbackTempo,
      source: 'fallback',
      adjusted: false,
      confidence: 'low',
      timestamp: new Date().toISOString()
    };
    
    this.cache.set(cacheKey, result);
    return result;
  }

  private async getTempoFromDatabase(trackName: string, artistName: string): Promise<number | null> {
    try {
      const { data, error } = await supabase
        .from('streaming_vendor_attributes')
        .select('spotify_tempo')
        .eq('track_name', trackName)
        .eq('artist_name', artistName)
        .not('spotify_tempo', 'is', null)
        .limit(1)
        .single();

      if (error || !data?.spotify_tempo) {
        return null;
      }

      console.log(`📊 [TEMPO RESOLVER] Database tempo: ${data.spotify_tempo} BPM`);
      return data.spotify_tempo;
    } catch (error) {
      console.warn(`⚠️ [TEMPO RESOLVER] Database lookup failed:`, error);
      return null;
    }
  }

  private async getTempoFromSpotify(trackId: string): Promise<number | null> {
    try {
      if (!spotifyService.isAuthenticated()) {
        return null;
      }

      const audioFeatures = await spotifyService.getAudioFeatures([trackId]);
      if (audioFeatures && audioFeatures[0]?.tempo) {
        console.log(`🎵 [TEMPO RESOLVER] Spotify API tempo: ${audioFeatures[0].tempo} BPM`);
        return audioFeatures[0].tempo;
      }
      
      return null;
    } catch (error) {
      console.warn(`⚠️ [TEMPO RESOLVER] Spotify API failed:`, error);
      return null;
    }
  }

  private async getTempoFromRapidAPI(trackName: string, artistName: string): Promise<number | null> {
    try {
      const analysis = await secureRapidSoundnetService.getTrackAnalysis(trackName, artistName, true);
      if (analysis?.tempo) {
        console.log(`🚀 [TEMPO RESOLVER] RapidAPI tempo: ${analysis.tempo} BPM`);
        return analysis.tempo;
      }
      
      return null;
    } catch (error) {
      console.warn(`⚠️ [TEMPO RESOLVER] RapidAPI failed:`, error);
      return null;
    }
  }

  private validateAndCorrectTempo(rawTempo: number, source: string, previousTempo?: number): TempoResult {
    const originalValue = rawTempo;
    let adjustedTempo = rawTempo;
    let adjusted = false;
    let confidence: 'high' | 'medium' | 'low' = 'high';

    // Rule 1: Detect half/double tempo errors
    if (rawTempo < 80 && previousTempo && previousTempo > 140) {
      // Likely half-tempo error
      adjustedTempo = rawTempo * 2;
      adjusted = true;
      confidence = 'medium';
      console.log(`🔧 [TEMPO RESOLVER] Half-tempo correction: ${rawTempo} → ${adjustedTempo} BPM`);
    } else if (rawTempo > 180 && previousTempo && previousTempo < 100) {
      // Likely double-tempo error  
      adjustedTempo = rawTempo / 2;
      adjusted = true;
      confidence = 'medium';
      console.log(`🔧 [TEMPO RESOLVER] Double-tempo correction: ${rawTempo} → ${adjustedTempo} BPM`);
    }

    // Rule 2: Validate reasonable range (60-200 BPM for fitness music)
    if (adjustedTempo < 60 || adjustedTempo > 200) {
      console.warn(`⚠️ [TEMPO RESOLVER] Tempo ${adjustedTempo} outside reasonable range for fitness`);
      confidence = 'low';
      
      // Clamp to reasonable bounds
      if (adjustedTempo < 60) adjustedTempo = 70;
      if (adjustedTempo > 200) adjustedTempo = 180;
      adjusted = true;
    }

    // Rule 3: Database and Spotify sources are high confidence
    if (source === 'database' || source === 'spotify') {
      confidence = adjusted ? 'medium' : 'high';
    } else if (source === 'rapidapi') {
      confidence = adjusted ? 'low' : 'medium';
    }

    return {
      bpm: Math.round(adjustedTempo),
      source: source as any,
      adjusted,
      confidence,
      originalValue: adjusted ? originalValue : undefined,
      timestamp: new Date().toISOString()
    };
  }

  private generateFallbackTempo(trackName: string, artistName: string, previousTempo?: number): number {
    // Use previous tempo if available and reasonable
    if (previousTempo && previousTempo >= 80 && previousTempo <= 180) {
      return previousTempo;
    }

    // Genre-based fallback tempos
    const text = `${trackName} ${artistName}`.toLowerCase();
    
    if (text.includes('slow') || text.includes('ballad') || text.includes('acoustic')) {
      return 80; // climb range
    } else if (text.includes('rock') || text.includes('metal') || text.includes('punk')) {
      return 150; // sprint_intervals range
    } else if (text.includes('dance') || text.includes('electronic') || text.includes('edm')) {
      return 128; // jumps range
    } else if (text.includes('hip hop') || text.includes('rap')) {
      return 110; // resistance range
    }
    
    // Default to mid-range resistance tempo
    return 100;
  }

  private async updateDatabaseTempo(trackName: string, artistName: string, tempo: number, trackId?: string): Promise<void> {
    try {
      const updateData: any = {
        spotify_tempo: tempo,
        updated_at: new Date().toISOString()
      };
      
      if (trackId) {
        updateData.spotify_track_id = trackId;
      }

      await supabase
        .from('streaming_vendor_attributes')
        .update(updateData)
        .eq('track_name', trackName)
        .eq('artist_name', artistName);
        
      console.log(`💾 [TEMPO RESOLVER] Updated database: ${tempo} BPM for "${trackName}"`);
    } catch (error) {
      console.error(`❌ [TEMPO RESOLVER] Failed to update database:`, error);
    }
  }

  // Public method to get tempo for current track (for UI use)
  async getCurrentTrackTempo(trackId?: string, trackName?: string, artistName?: string): Promise<TempoResult | null> {
    if (!trackName || !artistName) {
      console.warn('🚨 [TEMPO RESOLVER] Missing track name or artist');
      return null;
    }

    return this.resolveTempo({
      trackId,
      trackName,
      artistName
    });
  }

  // Clear cache (for testing)
  clearCache(): void {
    this.cache.clear();
    console.log('🗑️ [TEMPO RESOLVER] Cache cleared');
  }

  // Get cache stats
  getCacheStats() {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.entries()).map(([key, value]) => ({
        key,
        bpm: value.bpm,
        source: value.source,
        age: Date.now() - new Date(value.timestamp).getTime()
      }))
    };
  }
}

export const tempoResolver = new TempoResolver();