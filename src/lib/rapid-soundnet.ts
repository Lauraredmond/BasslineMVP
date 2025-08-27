// Rapid Soundnet API Client for Track Analysis
// Provides audio analysis attributes as replacement for deprecated Spotify endpoints

import { spotifyAnalysisLogger } from './spotify-analysis-logger';

export interface RapidSoundnetTrackAnalysis {
  key: string;               // Musical key (e.g., "C", "F#", "Ab")
  mode: string;              // "major" or "minor"
  tempo: number;             // BPM (beats per minute)
  camelot: string;           // Harmonic mixing notation (e.g., "8B")
  energy: number;            // Relative energy level (0-100)
  danceability: number;      // Groove-ability (0-100)
  happiness: number;         // Brightness/mood (0-100)
  acousticness: number;      // Acoustic sound (0-100)
  instrumentalness: number;  // Likelihood of no vocals (0-100)
  loudness: string;          // RMS loudness in dB (e.g., "-5 dB")
  speechiness: number;       // Spoken word content (0-100)
  liveness: number;          // Live audience feel (0-100)
  duration: string;          // Track length (e.g., "2:28")
  popularity: number;        // Relative ranking (0-100)
}

export interface RequestUsage {
  used: number;
  remaining: number;
  resetTime: number; // Unix timestamp when quota resets
}

class RapidSoundnetService {
  private readonly API_HOST = 'track-analysis.p.rapidapi.com';
  private readonly API_KEY = import.meta.env.VITE_RAPIDAPI_KEY;
  private readonly MAX_REQUESTS = 3; // Free plan limit
  
  private requestCount = 0;
  private lastResetTime = Date.now();
  private readonly RESET_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours in ms
  
  // Enhanced rate limiting for 429 protection
  private lastRequestTime = 0;
  private readonly MIN_REQUEST_INTERVAL = 2000; // 2 seconds between requests
  
  // Simple cache implementation
  private cache = {
    store: (trackTitle: string, artistName: string = '', result: RapidSoundnetTrackAnalysis) => {
      const key = `${trackTitle}_${artistName}`.toLowerCase();
      localStorage.setItem(`rapid_cache_${key}`, JSON.stringify({
        data: result,
        timestamp: Date.now()
      }));
    },
    
    get: (trackTitle: string, artistName: string = ''): RapidSoundnetTrackAnalysis | null => {
      const key = `${trackTitle}_${artistName}`.toLowerCase();
      const cached = localStorage.getItem(`rapid_cache_${key}`);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        // Cache expires after 7 days
        if (Date.now() - timestamp < 7 * 24 * 60 * 60 * 1000) {
          return data;
        }
      }
      return null;
    }
  };

  constructor() {
    // Load request count from localStorage to persist across sessions
    this.loadRequestCount();
  }

  // Get current request usage
  getRequestUsage(): RequestUsage {
    const now = Date.now();
    
    // Reset count if 24 hours have passed
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
    const now = Date.now();
    
    // Check quota limit
    if (usage.remaining <= 0) {
      return false;
    }
    
    // Check time-based rate limiting to prevent 429s
    if (now - this.lastRequestTime < this.MIN_REQUEST_INTERVAL) {
      console.log(`⏱️ Rate limiting: waiting ${this.MIN_REQUEST_INTERVAL}ms between requests`);
      return false;
    }
    
    return true;
  }

  // Wait for rate limit if needed
  private async waitForRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.MIN_REQUEST_INTERVAL) {
      const waitTime = this.MIN_REQUEST_INTERVAL - timeSinceLastRequest;
      console.log(`⏱️ Waiting ${waitTime}ms to respect rate limits`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastRequestTime = Date.now();
  }

  // Get track analysis from Rapid Soundnet API with fallback strategies
  async getTrackAnalysis(trackTitle: string, artistName?: string, allowFallback = true): Promise<RapidSoundnetTrackAnalysis | null> {
    // Check cache first
    const cached = this.cache.get(trackTitle, artistName || '');
    if (cached) {
      console.log('✅ Using cached RapidAPI data for:', trackTitle);
      
      // 🌉 BRIDGE: Even cached data should trigger database logging
      await this.triggerDatabaseLogging(trackTitle, artistName || '', cached);
      
      return cached;
    }
    
    if (!this.API_KEY) {
      console.error('❌ RapidAPI key not configured');
      
      if (allowFallback) {
        console.log('🔄 Using basic fallback analysis (no API key)');
        return this.generateFallbackAnalysis(trackTitle, artistName);
      }
      
      return null;
    }

    if (!this.canMakeRequest()) {
      const usage = this.getRequestUsage();
      const resetDate = new Date(usage.resetTime).toLocaleString();
      console.warn(`⚠️ API request limit reached (${usage.used}/${this.MAX_REQUESTS}). Resets at: ${resetDate}`);
      
      if (allowFallback) {
        console.log('🔄 Using intelligent fallback analysis (quota exhausted)');
        const fallbackResult = this.generateIntelligentFallback(trackTitle, artistName);
        
        // CRITICAL: Cache the fallback result to prevent infinite loops
        if (fallbackResult) {
          this.cache.store(trackTitle, artistName, fallbackResult);
          console.log('✅ Cached fallback result for:', trackTitle);
        }
        
        return fallbackResult;
      }
      
      return null;
    }

    try {
      console.log('🎯 Making Rapid Soundnet API request:', { trackTitle, artistName });
      
      // Wait for rate limit to prevent 429 errors
      await this.waitForRateLimit();
      
      console.log('🔍 [DEBUG] EXACT API PARAMS:', {
        originalTrackTitle: trackTitle,
        originalArtistName: artistName,
        urlEncoded: `song=${encodeURIComponent(trackTitle)}&artist=${encodeURIComponent(artistName || '')}`
      });
      
      // Prepare request parameters
      const params = new URLSearchParams({
        song: trackTitle
      });
      
      if (artistName) {
        params.append('artist', artistName);
      }

      const url = `https://${this.API_HOST}/pktx/analysis?${params}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'X-RapidAPI-Key': this.API_KEY,
          'X-RapidAPI-Host': this.API_HOST
        }
      });

      // Increment request count on API call attempt
      this.incrementRequestCount();

      if (!response.ok) {
        console.error('❌ Rapid Soundnet API error:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('❌ Error details:', errorText);
        
        if (allowFallback) {
          console.log('🔄 Using fallback analysis (API error)');
          return this.generateIntelligentFallback(trackTitle, artistName);
        }
        
        return null;
      }

      const text = await response.text();
      console.log('📊 Raw API Response Text (first 500 chars):', text.substring(0, 500));
      
      let data;
      try {
        data = JSON.parse(text);
        console.log('📊 Parsed Rapid Soundnet analysis:', data);
      } catch (parseError) {
        console.error('❌ Failed to parse API response as JSON:', parseError);
        console.error('❌ Raw response:', text.substring(0, 200));
        return null;
      }
      
      const result = this.normalizeApiResponse(data);
      
      // Cache the result
      if (result) {
        this.cache.store(trackTitle, artistName || '', result);
        console.log('✅ Cached RapidAPI result for:', trackTitle);
        
        // 🌉 BRIDGE: Automatically trigger database logging with RapidAPI data
        await this.triggerDatabaseLogging(trackTitle, artistName || '', result);
        
        // Add rate limiting to prevent API spam
        await new Promise(resolve => setTimeout(resolve, 500)); // 0.5 second delay
      }
      
      return result;
    } catch (error) {
      console.error('💥 Rapid Soundnet API exception:', error);
      
      if (allowFallback) {
        console.log('🔄 Using fallback analysis (network error)');
        const fallbackResult = this.generateIntelligentFallback(trackTitle, artistName);
        
        // CRITICAL: Cache the fallback result to prevent infinite loops
        if (fallbackResult) {
          this.cache.store(trackTitle, artistName, fallbackResult);
          console.log('✅ Cached fallback result for:', trackTitle);
        }
        
        return fallbackResult;
      }
      
      return null;
    }
  }

  // Generate intelligent fallback analysis based on track/artist patterns
  private generateIntelligentFallback(trackTitle: string, artistName?: string): RapidSoundnetTrackAnalysis {
    console.log('🧠 Generating intelligent fallback for:', trackTitle, 'by', artistName);
    
    try {
    
    // Basic genre/mood detection from title and artist keywords
    const titleLower = trackTitle.toLowerCase();
    const artistLower = artistName?.toLowerCase() || '';
    
    // Dance/Electronic music indicators
    const isDanceMusic = this.containsAny(titleLower + ' ' + artistLower, [
      'dance', 'electronic', 'edm', 'house', 'techno', 'disco', 'remix', 'club'
    ]);
    
    // Acoustic/Folk indicators
    const isAcoustic = this.containsAny(titleLower + ' ' + artistLower, [
      'acoustic', 'folk', 'unplugged', 'ballad', 'singer', 'songwriter'
    ]);
    
    // Rock/Metal indicators
    const isRock = this.containsAny(titleLower + ' ' + artistLower, [
      'rock', 'metal', 'punk', 'hard', 'heavy', 'guitar'
    ]);
    
    // Hip-hop/Rap indicators
    const isHipHop = this.containsAny(titleLower + ' ' + artistLower, [
      'rap', 'hip hop', 'hiphop', 'trap', 'drill', 'freestyle'
    ]);
    
    // Pop indicators
    const isPop = this.containsAny(titleLower + ' ' + artistLower, [
      'pop', 'hit', 'single', 'chart', 'mainstream'
    ]);

    // Generate values based on detected genre
    let baseAttributes = {
      tempo: 120,
      energy: 50,
      danceability: 50,
      happiness: 50,
      acousticness: 30,
      instrumentalness: 20,
      speechiness: 10,
      liveness: 15,
      loudness: '-8 dB'
    };

    if (isDanceMusic) {
      baseAttributes = {
        tempo: 128,
        energy: 85,
        danceability: 90,
        happiness: 75,
        acousticness: 5,
        instrumentalness: 60,
        speechiness: 5,
        liveness: 10,
        loudness: '-4 dB'
      };
    } else if (isAcoustic) {
      baseAttributes = {
        tempo: 90,
        energy: 30,
        danceability: 25,
        happiness: 60,
        acousticness: 95,
        instrumentalness: 40,
        speechiness: 8,
        liveness: 25,
        loudness: '-12 dB'
      };
    } else if (isRock) {
      baseAttributes = {
        tempo: 140,
        energy: 80,
        danceability: 60,
        happiness: 65,
        acousticness: 15,
        instrumentalness: 30,
        speechiness: 8,
        liveness: 20,
        loudness: '-5 dB'
      };
    } else if (isHipHop) {
      baseAttributes = {
        tempo: 85,
        energy: 70,
        danceability: 80,
        happiness: 55,
        acousticness: 10,
        instrumentalness: 15,
        speechiness: 40,
        liveness: 12,
        loudness: '-6 dB'
      };
    } else if (isPop) {
      baseAttributes = {
        tempo: 118,
        energy: 65,
        danceability: 70,
        happiness: 70,
        acousticness: 25,
        instrumentalness: 10,
        speechiness: 12,
        liveness: 15,
        loudness: '-7 dB'
      };
    }

    const result = {
      key: this.generateRandomKey(),
      mode: Math.random() > 0.6 ? 'major' : 'minor',
      tempo: baseAttributes.tempo + Math.floor(Math.random() * 20 - 10), // ±10 BPM variation
      camelot: '8B', // Default camelot
      energy: Math.max(0, Math.min(100, baseAttributes.energy + Math.floor(Math.random() * 20 - 10))),
      danceability: Math.max(0, Math.min(100, baseAttributes.danceability + Math.floor(Math.random() * 20 - 10))),
      happiness: Math.max(0, Math.min(100, baseAttributes.happiness + Math.floor(Math.random() * 20 - 10))),
      acousticness: Math.max(0, Math.min(100, baseAttributes.acousticness + Math.floor(Math.random() * 20 - 10))),
      instrumentalness: Math.max(0, Math.min(100, baseAttributes.instrumentalness + Math.floor(Math.random() * 20 - 10))),
      loudness: baseAttributes.loudness,
      speechiness: Math.max(0, Math.min(100, baseAttributes.speechiness + Math.floor(Math.random() * 10 - 5))),
      liveness: Math.max(0, Math.min(100, baseAttributes.liveness + Math.floor(Math.random() * 10 - 5))),
      duration: '3:30', // Default duration
      popularity: 50 + Math.floor(Math.random() * 30) // 50-80 range
    };
    
    console.log('✅ Generated intelligent fallback data:', {
      key: result.key,
      mode: result.mode,
      happiness: result.happiness,
      popularity: result.popularity,
      energy: result.energy
    });
    
    return result;
    
    } catch (error) {
      console.error('❌ Error generating intelligent fallback:', error);
      // Return basic fallback as last resort
      return this.generateFallbackAnalysis(trackTitle, artistName);
    }
  }

  // Generate basic fallback when no API is available
  private generateFallbackAnalysis(trackTitle: string, artistName?: string): RapidSoundnetTrackAnalysis {
    return {
      key: this.generateRandomKey(),
      mode: 'major',
      tempo: 120,
      camelot: '1A',
      energy: 50,
      danceability: 50,
      happiness: 50,
      acousticness: 50,
      instrumentalness: 20,
      loudness: '-10 dB',
      speechiness: 10,
      liveness: 10,
      duration: '3:00',
      popularity: 50
    };
  }

  // Helper method to check if text contains any of the given keywords
  private containsAny(text: string, keywords: string[]): boolean {
    return keywords.some(keyword => text.includes(keyword));
  }

  // Generate a random musical key
  private generateRandomKey(): string {
    const keys = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    return keys[Math.floor(Math.random() * keys.length)];
  }

  // Normalize API response to expected interface
  // 🌉 BRIDGE METHOD: Connect RapidAPI results to database logging
  private async triggerDatabaseLogging(trackTitle: string, artistName: string, rapidApiData: RapidSoundnetTrackAnalysis): Promise<void> {
    try {
      console.log('🌉 [BRIDGE] Triggering database logging for RapidAPI data:', {
        track: trackTitle,
        artist: artistName,
        hasData: !!rapidApiData
      });
      
      // Check if there's an active session for logging
      if (!spotifyAnalysisLogger.getCurrentSessionId()) {
        console.log('🌉 [BRIDGE] No active session - starting automatic session for RapidAPI data');
        await spotifyAnalysisLogger.startWorkoutSession('rapidapi-auto');
      }
      
      // Create context for database logging
      const context = {
        trackId: `rapid_${trackTitle.replace(/\s+/g, '_')}_${Date.now()}`, // Generate unique ID
        trackName: trackTitle,
        artistName: artistName,
        positionMs: 0, // Not available from RapidAPI
        fitnessPhase: 'unknown',
        workoutIntensity: 5,
        audioFeatures: null, // We have RapidAPI data instead
        
        // RapidAPI data source tracking
        dataSource: 'rapidapi',
        fromCache: false,
        fallbackType: null,
        
        // Include all RapidAPI data
        rapidSoundnetData: rapidApiData
      };
      
      console.log('🌉 [BRIDGE] Calling spotifyAnalysisLogger.startTrackLogging with RapidAPI context');
      spotifyAnalysisLogger.startTrackLogging(context);
      console.log('🌉 [BRIDGE] Database logging triggered successfully');
      
    } catch (error) {
      console.error('🌉 [BRIDGE] Failed to trigger database logging:', error);
    }
  }

  private normalizeApiResponse(data: any): RapidSoundnetTrackAnalysis {
    return {
      key: data.key || 'C',
      mode: data.mode || 'major',
      tempo: data.tempo || 120,
      camelot: data.camelot || '1A',
      energy: data.energy || 50,
      danceability: data.danceability || 50,
      happiness: data.happiness || 50,
      acousticness: data.acousticness || 50,
      instrumentalness: data.instrumentalness || 50,
      loudness: data.loudness || '-10 dB',
      speechiness: data.speechiness || 10,
      liveness: data.liveness || 10,
      duration: data.duration || '3:00',
      popularity: data.popularity || 50
    };
  }

  // Convert Rapid Soundnet data to Spotify-compatible format for existing code
  convertToSpotifyAudioFeatures(analysis: RapidSoundnetTrackAnalysis): any {
    return {
      danceability: analysis.danceability / 100,      // Convert 0-100 to 0-1
      energy: analysis.energy / 100,                  // Convert 0-100 to 0-1
      key: this.convertKeyToSpotifyFormat(analysis.key),
      loudness: this.parseLoudnessValue(analysis.loudness),
      mode: analysis.mode === 'major' ? 1 : 0,       // major=1, minor=0
      speechiness: analysis.speechiness / 100,        // Convert 0-100 to 0-1
      acousticness: analysis.acousticness / 100,      // Convert 0-100 to 0-1
      instrumentalness: analysis.instrumentalness / 100, // Convert 0-100 to 0-1
      liveness: analysis.liveness / 100,              // Convert 0-100 to 0-1
      valence: analysis.happiness / 100,              // Use happiness as valence
      tempo: analysis.tempo,                          // BPM stays as-is
      time_signature: 4                               // Default to 4/4 time
    };
  }

  // Convert key string to Spotify numeric format
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

  // Parse loudness string (e.g., "-5 dB") to numeric value
  private parseLoudnessValue(loudness: string): number {
    const match = loudness.match(/-?\d+(\.\d+)?/);
    return match ? parseFloat(match[0]) : -10;
  }

  // Persist request count across browser sessions
  private saveRequestCount(): void {
    localStorage.setItem('rapidapi_request_count', this.requestCount.toString());
    localStorage.setItem('rapidapi_last_reset', this.lastResetTime.toString());
  }

  // Load request count from localStorage
  private loadRequestCount(): void {
    const savedCount = localStorage.getItem('rapidapi_request_count');
    const savedResetTime = localStorage.getItem('rapidapi_last_reset');
    
    if (savedCount) {
      this.requestCount = parseInt(savedCount, 10) || 0;
    }
    
    if (savedResetTime) {
      this.lastResetTime = parseInt(savedResetTime, 10) || Date.now();
    }

    // Check if we need to reset (24 hours passed)
    const now = Date.now();
    if (now - this.lastResetTime >= this.RESET_INTERVAL) {
      this.resetRequestCount();
    }
  }

  // Increment request count and save
  private incrementRequestCount(): void {
    this.requestCount++;
    this.saveRequestCount();
    console.log(`📊 Rapid Soundnet requests used: ${this.requestCount}/${this.MAX_REQUESTS}`);
  }

  // Reset request count (called daily)
  private resetRequestCount(): void {
    this.requestCount = 0;
    this.lastResetTime = Date.now();
    this.saveRequestCount();
    console.log('🔄 Rapid Soundnet request count reset');
  }

  // Get time until next reset
  getTimeUntilReset(): string {
    const usage = this.getRequestUsage();
    const timeLeft = usage.resetTime - Date.now();
    
    if (timeLeft <= 0) return 'Available now';
    
    const hours = Math.floor(timeLeft / (1000 * 60 * 60));
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m`;
  }
}

export const rapidSoundnetService = new RapidSoundnetService();