/**
 * Netlify Function: Backfill BPM
 * Fetches and updates NULL Spotify_tempo values using Spotify Web API
 */

import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Use service role key for server-side operations
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface BackfillRequest {
  trackIds?: string[];
  limit?: number;
  spotifyAccessToken: string;
}

interface BackfillResponse {
  processed: number;
  updated: number;
  errors: number;
  results: Array<{
    trackId: string;
    trackName: string;
    artistName: string;
    bmp: number | null;
    status: 'updated' | 'error' | 'already_exists' | 'invalid_bmp';
    error?: string;
  }>;
}

export const handler: Handler = async (event, context) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed. Use POST.' })
    };
  }

  try {
    // Parse request
    const body: BackfillRequest = event.body ? JSON.parse(event.body) : {};
    const { trackIds, limit = 50, spotifyAccessToken } = body;

    if (!spotifyAccessToken) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'spotifyAccessToken is required' })
      };
    }

    console.log(`🔄 [BACKFILL BMP] Starting backfill process`);

    // Get tracks that need BPM backfill
    const tracksToProcess = await getTracksNeedingBMP(trackIds, limit);
    
    if (tracksToProcess.length === 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          processed: 0,
          updated: 0,
          errors: 0,
          results: [],
          message: 'No tracks found needing BPM backfill'
        })
      };
    }

    console.log(`📊 [BACKFILL BPM] Found ${tracksToProcess.length} tracks needing BPM backfill`);

    // Process tracks in batches (Spotify API allows up to 100 tracks per request)
    const results: BackfillResponse['results'] = [];
    let updated = 0;
    let errors = 0;

    const batchSize = 50; // Conservative batch size
    for (let i = 0; i < tracksToProcess.length; i += batchSize) {
      const batch = tracksToProcess.slice(i, i + batchSize);
      const batchResults = await processBatch(batch, spotifyAccessToken);
      
      results.push(...batchResults);
      updated += batchResults.filter(r => r.status === 'updated').length;
      errors += batchResults.filter(r => r.status === 'error').length;

      // Small delay between batches to respect rate limits
      if (i + batchSize < tracksToProcess.length) {
        await delay(100);
      }
    }

    const response: BackfillResponse = {
      processed: tracksToProcess.length,
      updated,
      errors,
      results
    };

    console.log(`✅ [BACKFILL BPM] Completed: ${updated}/${tracksToProcess.length} tracks updated`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response)
    };

  } catch (error) {
    console.error('❌ [BACKFILL BPM] Unexpected error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? (error as Error).message : 'Server error'
      })
    };
  }
};

/**
 * Gets tracks that need BPM backfill (NULL spotify_tempo)
 */
async function getTracksNeedingBMP(trackIds?: string[], limit: number = 50) {
  try {
    let query = supabase
      .from('streaming_vendor_attributes')
      .select('track_id, track_name, artist_name')
      .is('spotify_tempo', null)
      .is('section_type', null) // Only track-level records, not sections
      .not('track_id', 'is', null);

    if (trackIds && trackIds.length > 0) {
      query = query.in('track_id', trackIds);
    }

    const { data, error } = await query
      .limit(limit)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    // Remove duplicates (same track might have multiple entries)
    const uniqueTracks = data?.reduce((acc: any[], track) => {
      const exists = acc.find(t => t.track_id === track.track_id);
      if (!exists) {
        acc.push(track);
      }
      return acc;
    }, []) || [];

    return uniqueTracks;

  } catch (error) {
    console.error('❌ [BACKFILL BPM] Error getting tracks needing BPM:', error);
    return [];
  }
}

/**
 * Processes a batch of tracks to fetch BPM from Spotify Web API
 */
async function processBatch(tracks: any[], spotifyAccessToken: string) {
  const results: BackfillResponse['results'] = [];

  try {
    // Get track IDs for API call
    const trackIds = tracks.map(t => t.track_id).filter(Boolean);
    
    if (trackIds.length === 0) {
      return tracks.map(track => ({
        trackId: track.track_id || 'unknown',
        trackName: track.track_name,
        artistName: track.artist_name,
        bmp: null,
        status: 'error' as const,
        error: 'No valid track ID'
      }));
    }

    // Fetch audio features from Spotify
    const audioFeatures = await fetchSpotifyAudioFeatures(trackIds, spotifyAccessToken);
    
    if (!audioFeatures) {
      return tracks.map(track => ({
        trackId: track.track_id,
        trackName: track.track_name,
        artistName: track.artist_name,
        bmp: null,
        status: 'error' as const,
        error: 'Failed to fetch audio features from Spotify'
      }));
    }

    // Process each track
    for (let i = 0; i < tracks.length; i++) {
      const track = tracks[i];
      const features = audioFeatures[i];

      if (!features || !features.tempo) {
        results.push({
          trackId: track.track_id,
          trackName: track.track_name,
          artistName: track.artist_name,
          bmp: null,
          status: 'error',
          error: 'No audio features returned from Spotify'
        });
        continue;
      }

      const bpm = Math.round(features.tempo);

      // Validate BPM
      if (bpm < 40 || bpm > 220) {
        console.warn(`⚠️ [BACKFILL BPM] Invalid BPM ${bpm} for ${track.track_name} - outside range 40-220`);
        results.push({
          trackId: track.track_id,
          trackName: track.track_name,
          artistName: track.artist_name,
          bmp: bpm,
          status: 'invalid_bpm',
          error: `BPM ${bpm} outside valid range 40-220`
        });
        continue;
      }

      // Update database
      const updateSuccess = await updateTrackBMP(track.track_id, track.track_name, track.artist_name, bpm);
      
      results.push({
        trackId: track.track_id,
        trackName: track.track_name,
        artistName: track.artist_name,
        bmp: bpm,
        status: updateSuccess ? 'updated' : 'error',
        error: updateSuccess ? undefined : 'Failed to update database'
      });
    }

  } catch (error) {
    console.error('❌ [BACKFILL BPM] Error processing batch:', error);
    
    return tracks.map(track => ({
      trackId: track.track_id,
      trackName: track.track_name,
      artistName: track.artist_name,
      bpm: null,
      status: 'error' as const,
      error: `Batch processing error: ${(error as Error).message}`
    }));
  }

  return results;
}

/**
 * Fetches audio features from Spotify Web API
 */
async function fetchSpotifyAudioFeatures(trackIds: string[], accessToken: string) {
  try {
    const url = `https://api.spotify.com/v1/audio-features?ids=${trackIds.join(',')}`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ [BACKFILL BPM] Spotify API error: ${response.status} - ${errorText}`);
      return null;
    }

    const data = await response.json();
    return data.audio_features || [];

  } catch (error) {
    console.error('❌ [BACKFILL BPM] Error fetching from Spotify API:', error);
    return null;
  }
}

/**
 * Updates Spotify_tempo in the database
 */
async function updateTrackBMP(trackId: string, trackName: string, artistName: string, bpm: number): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('streaming_vendor_attributes')
      .update({
        spotify_tempo: bpm,
        tempo_source: 'spotify_api',
        tempo_confidence: 0.9,
        tempo_last_verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('track_id', trackId)
      .eq('track_name', trackName)
      .eq('artist_name', artistName)
      .is('section_type', null); // Only update track-level records

    if (error) {
      console.error(`❌ [BACKFILL BPM] Database update error for ${trackId}:`, error);
      return false;
    }

    console.log(`💾 [BACKFILL BPM] Updated ${trackName} with BPM ${bpm}`);
    return true;

  } catch (error) {
    console.error(`❌ [BACKFILL BPM] Error updating database for ${trackId}:`, error);
    return false;
  }
}

/**
 * Simple delay utility
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}