// Track Analysis Cache for Rapid Soundnet API
// Minimizes API calls by caching analysis results with intelligent expiration

import { RapidSoundnetTrackAnalysis } from './rapid-soundnet';

export interface CachedTrackAnalysis {
  analysis: RapidSoundnetTrackAnalysis;
  timestamp: number;
  trackTitle: string;
  artistName?: string;
  source: 'rapidapi' | 'fallback';
}

export interface CacheStats {
  totalEntries: number;
  hits: number;
  misses: number;
  hitRate: number;
  oldestEntry?: Date;
  newestEntry?: Date;
}

class TrackAnalysisCache {
  private readonly STORAGE_KEY = 'track_analysis_cache';
  private readonly MAX_ENTRIES = 1000; // Maximum cache entries
  private readonly CACHE_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 days in ms
  private cache: Map<string, CachedTrackAnalysis> = new Map();
  private stats = {
    hits: 0,
    misses: 0
  };

  constructor() {
    this.loadCacheFromStorage();
    // Clean up expired entries on initialization
    this.cleanupExpiredEntries();
  }

  // Generate cache key from track info
  private getCacheKey(trackTitle: string, artistName?: string): string {
    const normalizedTitle = this.normalizeString(trackTitle);
    const normalizedArtist = artistName ? this.normalizeString(artistName) : '';
    return `${normalizedTitle}|${normalizedArtist}`.toLowerCase();
  }

  // Normalize strings for consistent matching
  private normalizeString(str: string): string {
    return str
      .toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove special characters
      .replace(/\s+/g, ' ')    // Normalize whitespace
      .trim();
  }

  // Check if cache entry is valid (not expired)
  private isEntryValid(entry: CachedTrackAnalysis): boolean {
    const age = Date.now() - entry.timestamp;
    return age < this.CACHE_DURATION;
  }

  // Get cached analysis if available and valid
  getCached(trackTitle: string, artistName?: string): RapidSoundnetTrackAnalysis | null {
    const key = this.getCacheKey(trackTitle, artistName);
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      console.log('❌ Cache miss for:', trackTitle, 'by', artistName);
      return null;
    }

    if (!this.isEntryValid(entry)) {
      // Entry expired, remove it
      this.cache.delete(key);
      this.stats.misses++;
      console.log('⏰ Cache expired for:', trackTitle, 'by', artistName);
      return null;
    }

    this.stats.hits++;
    const age = Math.round((Date.now() - entry.timestamp) / (1000 * 60 * 60 * 24));
    console.log('✅ Cache hit for:', trackTitle, 'by', artistName, `(${age} days old)`);
    return entry.analysis;
  }

  // Store analysis in cache
  setCached(
    trackTitle: string, 
    analysis: RapidSoundnetTrackAnalysis, 
    artistName?: string,
    source: 'rapidapi' | 'fallback' = 'rapidapi'
  ): void {
    const key = this.getCacheKey(trackTitle, artistName);
    
    const entry: CachedTrackAnalysis = {
      analysis,
      timestamp: Date.now(),
      trackTitle,
      artistName,
      source
    };

    this.cache.set(key, entry);
    console.log(`💾 Cached analysis for: ${trackTitle} by ${artistName} (source: ${source})`);

    // Enforce cache size limit
    if (this.cache.size > this.MAX_ENTRIES) {
      this.evictOldestEntries();
    }

    // Persist to storage
    this.saveCacheToStorage();
  }

  // Remove oldest entries when cache is full
  private evictOldestEntries(): void {
    const entries = Array.from(this.cache.entries()).sort(
      ([, a], [, b]) => a.timestamp - b.timestamp
    );

    const entriesToRemove = entries.slice(0, this.cache.size - this.MAX_ENTRIES + 100);
    
    for (const [key] of entriesToRemove) {
      this.cache.delete(key);
    }

    console.log(`🧹 Evicted ${entriesToRemove.length} oldest cache entries`);
  }

  // Clean up expired entries
  private cleanupExpiredEntries(): void {
    const now = Date.now();
    let removedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (!this.isEntryValid(entry)) {
        this.cache.delete(key);
        removedCount++;
      }
    }

    if (removedCount > 0) {
      console.log(`🧹 Cleaned up ${removedCount} expired cache entries`);
      this.saveCacheToStorage();
    }
  }

  // Get cache statistics
  getStats(): CacheStats {
    const entries = Array.from(this.cache.values());
    const timestamps = entries.map(e => e.timestamp);
    
    return {
      totalEntries: this.cache.size,
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: this.stats.hits + this.stats.misses > 0 
        ? this.stats.hits / (this.stats.hits + this.stats.misses) * 100 
        : 0,
      oldestEntry: timestamps.length > 0 ? new Date(Math.min(...timestamps)) : undefined,
      newestEntry: timestamps.length > 0 ? new Date(Math.max(...timestamps)) : undefined
    };
  }

  // Clear all cached data
  clearCache(): void {
    this.cache.clear();
    this.stats.hits = 0;
    this.stats.misses = 0;
    localStorage.removeItem(this.STORAGE_KEY);
    console.log('🗑️ Cache cleared');
  }

  // Find similar cached tracks (fuzzy matching for typos)
  findSimilar(trackTitle: string, artistName?: string): CachedTrackAnalysis[] {
    const normalizedTitle = this.normalizeString(trackTitle);
    const normalizedArtist = artistName ? this.normalizeString(artistName) : '';
    
    const similar: CachedTrackAnalysis[] = [];
    
    for (const entry of this.cache.values()) {
      if (!this.isEntryValid(entry)) continue;
      
      const entryTitle = this.normalizeString(entry.trackTitle);
      const entryArtist = entry.artistName ? this.normalizeString(entry.artistName) : '';
      
      // Simple similarity check
      if (this.stringSimilarity(normalizedTitle, entryTitle) > 0.8 &&
          this.stringSimilarity(normalizedArtist, entryArtist) > 0.8) {
        similar.push(entry);
      }
    }
    
    return similar;
  }

  // Basic string similarity using Levenshtein-like approach
  private stringSimilarity(str1: string, str2: string): number {
    if (str1 === str2) return 1;
    if (str1.length === 0 || str2.length === 0) return 0;
    
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.includes(shorter)) return 0.9;
    
    const distance = this.levenshteinDistance(str1, str2);
    return 1 - distance / longer.length;
  }

  // Levenshtein distance calculation
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + cost
        );
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  // Save cache to localStorage
  private saveCacheToStorage(): void {
    try {
      const cacheData = Object.fromEntries(this.cache);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(cacheData));
    } catch (error) {
      console.error('Failed to save cache to storage:', error);
      // If storage is full, try clearing old entries
      this.cleanupExpiredEntries();
    }
  }

  // Load cache from localStorage
  private loadCacheFromStorage(): void {
    try {
      const cacheData = localStorage.getItem(this.STORAGE_KEY);
      if (cacheData) {
        const parsed = JSON.parse(cacheData);
        this.cache = new Map(Object.entries(parsed));
        console.log(`📚 Loaded ${this.cache.size} cached entries from storage`);
      }
    } catch (error) {
      console.error('Failed to load cache from storage:', error);
      this.cache.clear();
    }
  }
}

export const trackAnalysisCache = new TrackAnalysisCache();