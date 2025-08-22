# Rapid Soundnet API Integration Setup

## Overview

This integration provides track analysis attributes for Spotify songs using the Rapid Soundnet API as a replacement for Spotify's deprecated audio analysis endpoints. The system is designed to maximize your 3 free requests with intelligent caching and fallback strategies.

## Features

✅ **Smart Rate Limiting**: Tracks your 3 daily requests automatically  
✅ **Intelligent Caching**: Stores results for 30 days to avoid repeat requests  
✅ **Genre-Based Fallbacks**: Provides reasonable estimates when API quota is exhausted  
✅ **Spotify Integration**: Seamlessly works with your existing track loading  
✅ **Persistent Storage**: Request counts and cache survive browser restarts

## Setup Steps

### 1. Get Your RapidAPI Key

1. Go to [RapidAPI](https://rapidapi.com/)
2. Sign up for a free account
3. Navigate to the [Track Analysis API](https://rapidapi.com/soundnet-soundnet-default/api/track-analysis)
4. Subscribe to the free plan (3 requests/day)
5. Copy your RapidAPI key from the API settings

### 2. Add Environment Variable

Add to your `.env` file:
```
VITE_RAPIDAPI_KEY=your_rapidapi_key_here
```

### 3. How It Works

The integration automatically activates when:
- Spotify's audio features API returns no data
- Your existing `getPlaylistTracks()` calls will now include Rapid Soundnet data
- No code changes needed in your existing components!

## API Attributes Returned

The Rapid Soundnet API provides these attributes (automatically converted to Spotify format):

| Attribute | Description | Range |
|-----------|-------------|-------|
| `tempo` | BPM (beats per minute) | Number |
| `key` | Musical key (C, F#, etc.) | 0-11 |
| `mode` | Major (1) or Minor (0) | 0-1 |
| `energy` | Track energy level | 0-1 |
| `danceability` | How danceable the track is | 0-1 |
| `valence` | Musical positivity/happiness | 0-1 |
| `acousticness` | How acoustic the track sounds | 0-1 |
| `instrumentalness` | Likelihood of no vocals | 0-1 |
| `speechiness` | Spoken word content | 0-1 |
| `liveness` | Presence of live audience | 0-1 |
| `loudness` | Track loudness in dB | Negative dB |

## Usage Examples

### Check API Usage
```typescript
import { spotifyService } from './lib/spotify';

const usage = spotifyService.getRapidSoundnetUsage();
console.log(`Used: ${usage.used}/${3} requests`);
console.log(`Resets in: ${spotifyService.getTimeUntilReset()}`);
```

### Check Cache Stats
```typescript
const stats = spotifyService.getCacheStats();
console.log(`Cache hit rate: ${stats.hitRate.toFixed(1)}%`);
console.log(`Total cached tracks: ${stats.totalEntries}`);
```

### Force API Request (for testing)
```typescript
const analysis = await spotifyService.forceRapidSoundnetAnalysis(
  "Blinding Lights", 
  "The Weeknd"
);
```

## Fallback Strategies

The system provides intelligent fallbacks when your 3 requests are exhausted:

### 1. **API Available**: Real Rapid Soundnet data
- Most accurate analysis
- Uses one of your 3 daily requests

### 2. **Cached Data**: Previously fetched results
- No API request used
- Data stored for 30 days

### 3. **Intelligent Fallback**: Genre-based estimation
- Analyzes track/artist names for genre clues
- Provides reasonable estimates based on:
  - Dance/Electronic: High energy, danceability
  - Acoustic/Folk: Low energy, high acousticness
  - Rock/Metal: High energy, medium danceability
  - Hip-Hop/Rap: High speechiness, danceability
  - Pop: Balanced attributes

### 4. **Basic Fallback**: Default values
- Used when no API key is configured
- Provides neutral values for all attributes

## Best Practices

### Maximize Your 3 Requests

1. **Use for Popular Tracks**: Focus on tracks you'll analyze multiple times
2. **Cache Everything**: The system automatically caches all results
3. **Check Cache First**: Use cached data when available
4. **Plan Your Usage**: Track your daily quota

### Integration Tips

```typescript
// Your existing code continues to work unchanged
const tracks = await spotifyService.getPlaylistTracks(playlistId);

// Tracks now automatically include Rapid Soundnet data when Spotify fails
tracks.forEach(track => {
  if (track.audio_features) {
    console.log('Got audio features:', track.audio_features);
    // Use tempo, energy, danceability, etc.
  }
});
```

## Monitoring

The system logs all activity to console:
- ✅ Cache hits (no API usage)
- 🎯 API requests (uses quota)
- ⚠️ Quota warnings
- 🔄 Fallback usage
- 📊 Analysis results

## Troubleshooting

### No API Key Error
```
❌ RapidAPI key not configured
```
**Solution**: Add `VITE_RAPIDAPI_KEY` to your `.env` file

### Quota Exhausted
```
⚠️ API request limit reached (3/3). Resets at: [time]
```
**Solution**: Wait for reset or use fallback data (automatic)

### Cache Issues
**Clear cache**: `trackAnalysisCache.clearCache()`

## File Structure

```
src/lib/
├── rapid-soundnet.ts        # API client with rate limiting
├── track-analysis-cache.ts  # Intelligent caching system
└── spotify.ts              # Enhanced with Rapid Soundnet integration
```

## Support

- Check console logs for detailed operation info
- Use fallback strategies when quota is reached
- Cache persists across browser sessions
- All integrations are automatic with existing code