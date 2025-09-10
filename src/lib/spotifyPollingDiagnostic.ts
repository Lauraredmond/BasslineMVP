/**
 * Spotify Polling Diagnostic Tool
 * Tests if Spotify polling is working and displays current track info
 */

import { spotifyService } from './spotify';

/**
 * Check if Spotify polling is retrieving current track correctly
 */
export async function diagnoseSpotifyPolling(): Promise<void> {
  console.log('🔍 [POLLING DIAGNOSTIC] Testing Spotify current track retrieval...');
  
  try {
    // Test 1: Get current playback
    const playback = await spotifyService.getCurrentPlayback();
    
    if (!playback) {
      console.log('❌ [POLLING DIAGNOSTIC] No playback state returned');
      console.log('📋 [SOLUTION] Make sure music is playing in Spotify');
      return;
    }
    
    console.log('✅ [POLLING DIAGNOSTIC] Playback state retrieved successfully');
    
    // Test 2: Check track info
    if (!playback.item) {
      console.log('❌ [POLLING DIAGNOSTIC] Playback state has no track item');
      return;
    }
    
    console.log('🎵 [CURRENT TRACK] Track info:');
    console.log(`  📀 Name: "${playback.item.name}"`);
    console.log(`  🎤 Artist: "${playback.item.artists?.[0]?.name || 'Unknown'}"`);
    console.log(`  🆔 Track ID: ${playback.item.id}`);
    console.log(`  ⏱️ Duration: ${Math.round(playback.item.duration_ms / 1000)}s`);
    console.log(`  ▶️ Is Playing: ${playback.is_playing}`);
    console.log(`  📍 Progress: ${Math.round((playback.progress_ms || 0) / 1000)}s`);
    console.log(`  🎧 Device: ${playback.device?.name || 'Unknown'}`);
    
    // Test 3: Check if this matches what UI should show
    const expectedDisplayName = `${playback.item.artists?.[0]?.name || 'Unknown'} – ${playback.item.name}`;
    console.log(`🖥️ [UI EXPECTED] Display name should be: "${expectedDisplayName}"`);
    
    console.log('✅ [POLLING DIAGNOSTIC] All tests passed - polling should be working');
    
  } catch (error) {
    console.error('❌ [POLLING DIAGNOSTIC] Error during polling test:', error);
  }
}

/**
 * Monitor polling for 30 seconds to see track changes
 */
export async function monitorSpotifyPolling(durationSeconds: number = 30): Promise<void> {
  console.log(`🔄 [POLLING MONITOR] Starting ${durationSeconds}s monitoring session...`);
  
  let lastTrackId: string | null = null;
  let pollCount = 0;
  
  const monitor = async () => {
    try {
      pollCount++;
      const playback = await spotifyService.getCurrentPlayback();
      
      const currentTrackId = playback?.item?.id || null;
      const trackName = playback?.item?.name || 'No track';
      const artistName = playback?.item?.artists?.[0]?.name || 'No artist';
      
      const trackChanged = currentTrackId !== lastTrackId;
      const status = trackChanged ? '🔄 [TRACK CHANGED]' : '📍 [SAME TRACK]';
      
      console.log(`${status} Poll #${pollCount}: "${artistName} – ${trackName}"`);
      
      if (trackChanged && lastTrackId !== null) {
        console.log(`  🎵 Previous: ${lastTrackId}`);
        console.log(`  🎵 Current:  ${currentTrackId}`);
      }
      
      lastTrackId = currentTrackId;
      
    } catch (error) {
      console.error(`❌ [POLLING MONITOR] Poll #${pollCount} failed:`, error);
    }
  };
  
  // Initial poll
  await monitor();
  
  // Set up monitoring interval (every 3 seconds for testing)
  const interval = setInterval(monitor, 3000);
  
  // Stop after specified duration
  setTimeout(() => {
    clearInterval(interval);
    console.log(`⏹️ [POLLING MONITOR] Monitoring stopped after ${durationSeconds}s (${pollCount} polls)`);
  }, durationSeconds * 1000);
}

// Expose functions globally for console debugging
if (typeof window !== 'undefined') {
  (window as any).diagnoseSpotifyPolling = diagnoseSpotifyPolling;
  (window as any).monitorSpotifyPolling = monitorSpotifyPolling;
}