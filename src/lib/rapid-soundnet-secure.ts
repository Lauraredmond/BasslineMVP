// Secure Rapid Soundnet API Client (via Netlify Functions)
// Replaces direct RapidAPI calls with secure server-side proxy

import { spotifyAnalysisLogger } from './spotify-analysis-logger';

export interface RapidSoundnetTrackAnalysis {
  key: string;               
  mode: string;              
  tempo: number;             
  camelot: string;           
  energy: number;            
  danceability: number;      
  happiness: number;         
  acousticness: number;      
  instrumentalness: number;  
  loudness: string;          
  speechiness: number;       
  liveness: number;          
  duration: string;          
  popularity: number;
  _metadata?: {
    source: string;
    timestamp: string;
    song: string;
    artist: string | null;
    fromCache: boolean;
  };
}

export interface RequestUsage {
  used: number;
  remaining: number;
  resetTime: number;
}

class SecureRapidSoundnetService {
  private readonly NETLIFY_FUNCTION_URL = '/.netlify/functions/rapidapi-track-analysis';
  private readonly MAX_REQUESTS = 100; // Generous limit since we're now server-side
  
  private requestCount = 0;
  private lastResetTime = Date.now();
  private readonly RESET_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours

  // Enhanced cache with metadata
  private cache = {
    store: (trackTitle: string, artistName: string = '', result: RapidSoundnetTrackAnalysis) => {
      const key = `${trackTitle}_${artistName}`.toLowerCase();
      localStorage.setItem(`rapid_cache_${key}`, JSON.stringify({
        data: result,
        timestamp: Date.now(),
        source: 'secure-api'
      }));
    },
    
    get: (trackTitle: string, artistName: string = ''): RapidSoundnetTrackAnalysis | null => {
      const key = `${trackTitle}_${artistName}`.toLowerCase();
      const cached = localStorage.getItem(`rapid_cache_${key}`);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        // Cache expires after 7 days
        if (Date.now() - timestamp < 7 * 24 * 60 * 60 * 1000) {
          return { ...data, _metadata: { ...data._metadata, fromCache: true } };
        }
      }
      return null;
    }
  };

  constructor() {
    this.loadRequestCount();
  }

  // Get current request usage
  getRequestUsage(): RequestUsage {
    const now = Date.now();
    
    if (now - this.lastResetTime >= this.RESET_INTERVAL) {
      this.resetRequestCount();
    }

    return {
      used: this.requestCount,
      remaining: this.MAX_REQUESTS - this.requestCount,
      resetTime: this.lastResetTime + this.RESET_INTERVAL
    };
  }

  // Check if we can make a request
  canMakeRequest(): boolean {
    const usage = this.getRequestUsage();
    return usage.remaining > 0;
  }

  // Secure API call via Netlify Function
  async getTrackAnalysis(
    trackTitle: string, 
    artistName?: string, 
    allowFallback = true
  ): Promise<RapidSoundnetTrackAnalysis | null> {
    // Feature flag: disable RapidAPI calls
    const rapidApiEnabled = import.meta.env.VITE_FEATURE_RAPIDAPI === 'true';
    if (!rapidApiEnabled) {
      console.log('🚫 RapidAPI disabled via feature flag VITE_FEATURE_RAPIDAPI');
      return allowFallback ? this.generateIntelligentFallback(trackTitle, artistName) : null;
    }

    // Check cache first
    const cached = this.cache.get(trackTitle, artistName || '');
    if (cached) {
      console.log('✅ Using cached secure RapidAPI data for:', trackTitle);
      await this.triggerDatabaseLogging(trackTitle, artistName || '', cached);
      return cached;
    }

    if (!this.canMakeRequest()) {
      const usage = this.getRequestUsage();
      const resetDate = new Date(usage.resetTime).toLocaleString();
      console.warn(`⚠️ Request limit reached (${usage.used}/${this.MAX_REQUESTS}). Resets: ${resetDate}`);
      
      if (allowFallback) {
        return this.generateIntelligentFallback(trackTitle, artistName);
      }
      return null;
    }

    try {
      console.log('🔐 Making secure RapidAPI request via Netlify Function:', { trackTitle, artistName });

      const params = new URLSearchParams({ song: trackTitle });
      if (artistName) params.append('artist', artistName);

      const url = `${this.NETLIFY_FUNCTION_URL}?${params}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      this.incrementRequestCount();

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Netlify Function error:', response.status, errorData);
        
        if (allowFallback) {
          return this.generateIntelligentFallback(trackTitle, artistName);
        }
        return null;
      }

      const data = await response.json();
      console.log('✅ Secure RapidAPI response received:', data);
      
      const result = this.normalizeApiResponse(data);
      
      if (result) {
        this.cache.store(trackTitle, artistName || '', result);
        await this.triggerDatabaseLogging(trackTitle, artistName || '', result);
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 100)); // Shorter delay for server-side
      }
      
      return result;

    } catch (error) {
      console.error('💥 Secure RapidAPI exception:', error);
      
      if (allowFallback) {
        const fallbackResult = this.generateIntelligentFallback(trackTitle, artistName);
        if (fallbackResult) {
          this.cache.store(trackTitle, artistName || '', fallbackResult);
        }
        return fallbackResult;
      }
      
      return null;
    }
  }

  // Generate intelligent fallback analysis
  private generateIntelligentFallback(trackTitle: string, artistName?: string): RapidSoundnetTrackAnalysis {
    console.log('🧠 Generating secure intelligent fallback for:', trackTitle, 'by', artistName);
    
    try {
      const titleLower = trackTitle.toLowerCase();
      const artistLower = artistName?.toLowerCase() || '';
      const combined = titleLower + ' ' + artistLower;

      // Enhanced genre detection patterns
      const patterns = {
        dance: ['dance', 'electronic', 'edm', 'house', 'techno', 'disco', 'remix', 'club', 'beat', 'drop'],
        acoustic: ['acoustic', 'folk', 'unplugged', 'ballad', 'singer', 'songwriter', 'piano', 'guitar'],
        rock: ['rock', 'metal', 'punk', 'hard', 'heavy', 'guitar', 'drums'],
        hiphop: ['rap', 'hip hop', 'hiphop', 'trap', 'drill', 'freestyle', 'beats'],
        pop: ['pop', 'hit', 'single', 'chart', 'mainstream', 'radio'],
        classical: ['classical', 'orchestra', 'symphony', 'concerto', 'sonata', 'quartet', 'philharmonic'],
        jazz: ['jazz', 'blues', 'swing', 'bebop', 'smooth', 'saxophone'],
        ambient: ['ambient', 'chill', 'relaxing', 'meditation', 'peaceful', 'calm'],
        energetic: ['workout', 'fitness', 'cardio', 'energy', 'motivation', 'power', 'intense']
      };

      // Detect primary genre
      let detectedGenre = 'pop'; // default
      let maxMatches = 0;
      
      for (const [genre, keywords] of Object.entries(patterns)) {
        const matches = keywords.filter(keyword => combined.includes(keyword)).length;
        if (matches > maxMatches) {
          maxMatches = matches;
          detectedGenre = genre;
        }
      }

      // Genre-specific attribute templates
      const templates: Record<string, any> = {
        dance: { tempo: 128, energy: 85, danceability: 90, happiness: 75, acousticness: 5, instrumentalness: 60, speechiness: 5, liveness: 10, loudness: '-4 dB' },
        acoustic: { tempo: 90, energy: 30, danceability: 25, happiness: 60, acousticness: 95, instrumentalness: 40, speechiness: 8, liveness: 25, loudness: '-12 dB' },
        rock: { tempo: 140, energy: 80, danceability: 60, happiness: 65, acousticness: 15, instrumentalness: 30, speechiness: 8, liveness: 20, loudness: '-5 dB' },
        hiphop: { tempo: 85, energy: 70, danceability: 80, happiness: 55, acousticness: 10, instrumentalness: 15, speechiness: 40, liveness: 12, loudness: '-6 dB' },
        classical: { tempo: 100, energy: 40, danceability: 20, happiness: 50, acousticness: 85, instrumentalness: 90, speechiness: 2, liveness: 30, loudness: '-10 dB' },
        jazz: { tempo: 110, energy: 50, danceability: 45, happiness: 60, acousticness: 60, instrumentalness: 70, speechiness: 5, liveness: 40, loudness: '-8 dB' },
        ambient: { tempo: 70, energy: 20, danceability: 15, happiness: 70, acousticness: 80, instrumentalness: 85, speechiness: 2, liveness: 5, loudness: '-15 dB' },
        energetic: { tempo: 135, energy: 90, danceability: 85, happiness: 80, acousticness: 10, instrumentalness: 20, speechiness: 10, liveness: 15, loudness: '-3 dB' },
        pop: { tempo: 118, energy: 65, danceability: 70, happiness: 70, acousticness: 25, instrumentalness: 10, speechiness: 12, liveness: 15, loudness: '-7 dB' }
      };

      const baseAttributes = templates[detectedGenre];
      
      // Add intelligent variation (±15% for most attributes)
      const addVariation = (base: number, maxVariation: number = 0.15) => {
        const variation = (Math.random() - 0.5) * 2 * maxVariation;
        return Math.max(0, Math.min(100, Math.round(base * (1 + variation))));
      };

      const result: RapidSoundnetTrackAnalysis = {
        key: this.generateRandomKey(),
        mode: Math.random() > 0.6 ? 'major' : 'minor',
        tempo: addVariation(baseAttributes.tempo, 0.1), // ±10% tempo variation
        camelot: this.generateCamelotKey(),
        energy: addVariation(baseAttributes.energy),
        danceability: addVariation(baseAttributes.danceability),
        happiness: addVariation(baseAttributes.happiness),
        acousticness: addVariation(baseAttributes.acousticness),
        instrumentalness: addVariation(baseAttributes.instrumentalness),
        loudness: baseAttributes.loudness,
        speechiness: addVariation(baseAttributes.speechiness, 0.2), // More variation for speechiness
        liveness: addVariation(baseAttributes.liveness, 0.3), // More variation for liveness
        duration: this.generateDuration(),
        popularity: 40 + Math.floor(Math.random() * 50), // 40-90 range
        _metadata: {
          source: 'Secure Intelligent Fallback',
          timestamp: new Date().toISOString(),
          song: trackTitle,
          artist: artistName || null,
          fromCache: false
        }
      };
      
      console.log('✅ Generated secure intelligent fallback:', {
        detectedGenre,
        key: result.key,
        tempo: result.tempo,
        energy: result.energy,
        happiness: result.happiness
      });
      
      return result;
      
    } catch (error) {
      console.error('❌ Error generating intelligent fallback:', error);
      return this.generateBasicFallback(trackTitle, artistName);
    }
  }

  // Basic fallback when intelligent fallback fails
  private generateBasicFallback(trackTitle: string, artistName?: string): RapidSoundnetTrackAnalysis {
    return {
      key: 'C',
      mode: 'major',
      tempo: 120,
      camelot: '8B',
      energy: 50,
      danceability: 50,
      happiness: 50,
      acousticness: 50,
      instrumentalness: 20,
      loudness: '-10 dB',
      speechiness: 10,
      liveness: 10,
      duration: '3:30',
      popularity: 50,
      _metadata: {
        source: 'Basic Fallback',
        timestamp: new Date().toISOString(),
        song: trackTitle,
        artist: artistName || null,
        fromCache: false
      }
    };
  }

  // Helper methods
  private generateRandomKey(): string {
    const keys = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    return keys[Math.floor(Math.random() * keys.length)];
  }

  private generateCamelotKey(): string {
    const numbers = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
    const letters = ['A', 'B'];
    return numbers[Math.floor(Math.random() * numbers.length)] + 
           letters[Math.floor(Math.random() * letters.length)];
  }

  private generateDuration(): string {
    const minutes = 2 + Math.floor(Math.random() * 4); // 2-5 minutes
    const seconds = Math.floor(Math.random() * 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  // Bridge method for database logging
  private async triggerDatabaseLogging(
    trackTitle: string, 
    artistName: string, 
    rapidApiData: RapidSoundnetTrackAnalysis
  ): Promise<void> {
    try {
      console.log('🌉 [SECURE BRIDGE] Triggering database logging for secure RapidAPI data');
      
      if (!spotifyAnalysisLogger.getCurrentSessionId()) {
        await spotifyAnalysisLogger.startWorkoutSession('secure-rapidapi-auto');
      }
      
      const context = {
        trackId: `secure_rapid_${trackTitle.replace(/\s+/g, '_')}_${Date.now()}`,
        trackName: trackTitle,
        artistName: artistName,
        positionMs: 0,
        fitnessPhase: 'unknown',
        workoutIntensity: 5,
        audioFeatures: null,
        dataSource: 'rapidapi' as const,
        fromCache: rapidApiData._metadata?.fromCache || false,
        fallbackType: rapidApiData._metadata?.source.includes('Fallback') ? 'intelligent' : null,
        rapidSoundnetData: rapidApiData
      };
      
      spotifyAnalysisLogger.startTrackLogging(context);
      console.log('✅ [SECURE BRIDGE] Database logging triggered successfully');
      
    } catch (error) {
      console.error('❌ [SECURE BRIDGE] Failed to trigger database logging:', error);
    }
  }

  // Normalize API response
  private normalizeApiResponse(data: any): RapidSoundnetTrackAnalysis {
    return {
      key: data.key || 'C',
      mode: data.mode || 'major',
      tempo: data.tempo || 120,
      camelot: data.camelot || '8B',
      energy: data.energy || 50,
      danceability: data.danceability || 50,
      happiness: data.happiness || 50,
      acousticness: data.acousticness || 50,
      instrumentalness: data.instrumentalness || 50,
      loudness: data.loudness || '-10 dB',
      speechiness: data.speechiness || 10,
      liveness: data.liveness || 10,
      duration: data.duration || '3:30',
      popularity: data.popularity || 50,
      _metadata: data._metadata || {
        source: 'Secure RapidAPI',
        timestamp: new Date().toISOString(),
        song: data.song || 'Unknown',
        artist: data.artist || null,
        fromCache: false
      }
    };
  }

  // Convert to Spotify format for compatibility
  convertToSpotifyAudioFeatures(analysis: RapidSoundnetTrackAnalysis): any {
    return {
      danceability: analysis.danceability / 100,
      energy: analysis.energy / 100,
      key: this.convertKeyToSpotifyFormat(analysis.key),
      loudness: this.parseLoudnessValue(analysis.loudness),
      mode: analysis.mode === 'major' ? 1 : 0,
      speechiness: analysis.speechiness / 100,
      acousticness: analysis.acousticness / 100,
      instrumentalness: analysis.instrumentalness / 100,
      liveness: analysis.liveness / 100,
      valence: analysis.happiness / 100,
      tempo: analysis.tempo,
      time_signature: 4
    };
  }

  private convertKeyToSpotifyFormat(key: string): number {
    const keyMap: { [key: string]: number } = {
      'C': 0, 'C#': 1, 'Db': 1,
      'D': 2, 'D#': 3, 'Eb': 3,
      'E': 4,
      'F': 5, 'F#': 6, 'Gb': 6,
      'G': 7, 'G#': 8, 'Ab': 8,
      'A': 9, 'A#': 10, 'Bb': 10,
      'B': 11
    };
    return keyMap[key] || 0;
  }

  private parseLoudnessValue(loudness: string): number {
    const match = loudness.match(/-?\d+(\.\d+)?/);
    return match ? parseFloat(match[0]) : -10;
  }

  // Request counting and rate limiting
  private saveRequestCount(): void {
    localStorage.setItem('secure_rapidapi_request_count', this.requestCount.toString());
    localStorage.setItem('secure_rapidapi_last_reset', this.lastResetTime.toString());
  }

  private loadRequestCount(): void {
    const savedCount = localStorage.getItem('secure_rapidapi_request_count');
    const savedResetTime = localStorage.getItem('secure_rapidapi_last_reset');
    
    if (savedCount) this.requestCount = parseInt(savedCount, 10) || 0;
    if (savedResetTime) this.lastResetTime = parseInt(savedResetTime, 10) || Date.now();

    const now = Date.now();
    if (now - this.lastResetTime >= this.RESET_INTERVAL) {
      this.resetRequestCount();
    }
  }

  private incrementRequestCount(): void {
    this.requestCount++;
    this.saveRequestCount();
    console.log(`📊 Secure RapidAPI requests used: ${this.requestCount}/${this.MAX_REQUESTS}`);
  }

  private resetRequestCount(): void {
    this.requestCount = 0;
    this.lastResetTime = Date.now();
    this.saveRequestCount();
    console.log('🔄 Secure RapidAPI request count reset');
  }

  getTimeUntilReset(): string {
    const usage = this.getRequestUsage();
    const timeLeft = usage.resetTime - Date.now();
    
    if (timeLeft <= 0) return 'Available now';
    
    const hours = Math.floor(timeLeft / (1000 * 60 * 60));
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m`;
  }
}

export const secureRapidSoundnetService = new SecureRapidSoundnetService();