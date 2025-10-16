/**
 * Spotify Playback Regression Tester
 * Tests the complete playlist start workflow to ensure no regressions
 */

import { secureSpotifyService } from './spotify-secure';

export interface PlaybackTestResult {
  step: string;
  success: boolean;
  error?: string;
  data?: any;
}

/**
 * Comprehensive test of the playlist start workflow
 */
export async function testPlaylistStartWorkflow(playlistId?: string): Promise<PlaybackTestResult[]> {
  const results: PlaybackTestResult[] = [];
  
  console.log('🧪 [PLAYBACK TEST] Starting comprehensive playlist workflow test...');
  
  // Step 1: Check Spotify authentication
  try {
    const isAuth = await secureSpotifyService.isAuthenticated();
    results.push({
      step: 'Spotify Authentication Check',
      success: isAuth,
      error: isAuth ? undefined : 'Not authenticated with Spotify',
      data: { authenticated: isAuth }
    });
    
    if (!isAuth) {
      console.error('❌ [PLAYBACK TEST] Spotify not authenticated - cannot continue');
      return results;
    }
  } catch (error) {
    results.push({
      step: 'Spotify Authentication Check',
      success: false,
      error: error.message,
      data: error
    });
    return results;
  }
  
  // Step 2: Get available devices
  try {
    const devices = await secureSpotifyService.getDevices();
    const hasDevices = devices && devices.length > 0;
    
    results.push({
      step: 'Get Spotify Devices',
      success: hasDevices,
      error: hasDevices ? undefined : 'No Spotify devices available',
      data: { deviceCount: devices?.length || 0, devices }
    });
    
    if (!hasDevices) {
      console.error('❌ [PLAYBACK TEST] No Spotify devices available');
      return results;
    }
  } catch (error) {
    results.push({
      step: 'Get Spotify Devices',
      success: false,
      error: error.message,
      data: error
    });
    return results;
  }
  
  // Step 3: Get user's playlists (if no playlist specified)
  let testPlaylistId = playlistId;
  if (!testPlaylistId) {
    try {
      const playlists = await secureSpotifyService.getUserPlaylists();
      const hasPlaylists = playlists && playlists.length > 0;
      
      results.push({
        step: 'Get User Playlists',
        success: hasPlaylists,
        error: hasPlaylists ? undefined : 'No user playlists found',
        data: { playlistCount: playlists?.length || 0 }
      });
      
      if (hasPlaylists) {
        testPlaylistId = playlists[0].id;
        console.log(`🎵 [PLAYBACK TEST] Using first playlist: ${playlists[0].name}`);
      } else {
        console.error('❌ [PLAYBACK TEST] No playlists available for testing');
        return results;
      }
    } catch (error) {
      results.push({
        step: 'Get User Playlists',
        success: false,
        error: error.message,
        data: error
      });
      return results;
    }
  }
  
  // Step 4: Get playlist tracks
  try {
    const tracks = await secureSpotifyService.getPlaylistTracks(testPlaylistId);
    const hasTracks = tracks && tracks.length > 0;
    
    results.push({
      step: 'Get Playlist Tracks',
      success: hasTracks,
      error: hasTracks ? undefined : 'Playlist has no tracks',
      data: { trackCount: tracks?.length || 0, playlistId: testPlaylistId }
    });
    
    if (!hasTracks) {
      console.error('❌ [PLAYBACK TEST] Playlist has no tracks');
      return results;
    }
  } catch (error) {
    results.push({
      step: 'Get Playlist Tracks',
      success: false,
      error: error.message,
      data: error
    });
    return results;
  }
  
  // Step 5: Test startPlaylistPlayback (the critical function)
  try {
    const devices = await secureSpotifyService.getDevices();
    const activeDevice = devices.find(d => d.is_active) || devices[0];

    if (!activeDevice) {
      throw new Error('No active device available for playback test');
    }

    console.log(`🎵 [PLAYBACK TEST] Testing playback start on device: ${activeDevice.name}`);

    const playbackStarted = await secureSpotifyService.startPlaylistPlayback(testPlaylistId, activeDevice.id);
    
    results.push({
      step: 'Start Playlist Playback',
      success: playbackStarted,
      error: playbackStarted ? undefined : 'Failed to start playlist playback',
      data: { 
        playlistId: testPlaylistId,
        deviceId: activeDevice.id,
        deviceName: activeDevice.name,
        playbackStarted
      }
    });
    
    // Step 6: Verify playback state
    if (playbackStarted) {
      try {
        // Wait a moment for playback to start
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const playbackState = await secureSpotifyService.getCurrentPlayback();
        const isPlaying = playbackState?.is_playing || false;
        
        results.push({
          step: 'Verify Playback State',
          success: isPlaying,
          error: isPlaying ? undefined : 'Playback not detected as active',
          data: {
            is_playing: playbackState?.is_playing,
            track_name: playbackState?.item?.name,
            device_name: playbackState?.device?.name
          }
        });
        
      } catch (error) {
        results.push({
          step: 'Verify Playback State',
          success: false,
          error: error.message,
          data: error
        });
      }
    }
    
  } catch (error) {
    results.push({
      step: 'Start Playlist Playback',
      success: false,
      error: error.message,
      data: error
    });
  }
  
  // Summary
  const totalSteps = results.length;
  const successfulSteps = results.filter(r => r.success).length;
  const failedSteps = totalSteps - successfulSteps;
  
  console.log(`\n📊 [PLAYBACK TEST] Test Results: ${successfulSteps}/${totalSteps} steps passed`);
  
  results.forEach(result => {
    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${result.step}${result.error ? `: ${result.error}` : ''}`);
  });
  
  if (failedSteps === 0) {
    console.log('🎉 [PLAYBACK TEST] All tests passed! Spotify playback is working correctly.');
  } else {
    console.log(`⚠️ [PLAYBACK TEST] ${failedSteps} test(s) failed. Check the errors above.`);
  }
  
  return results;
}

/**
 * Quick test to verify core Spotify functionality
 */
export async function quickSpotifyTest(): Promise<boolean> {
  try {
    console.log('⚡ [QUICK TEST] Running quick Spotify test...');
    
    if (!await secureSpotifyService.isAuthenticated()) {
      console.error('❌ [QUICK TEST] Not authenticated');
      return false;
    }

    const devices = await secureSpotifyService.getDevices();
    if (!devices || devices.length === 0) {
      console.error('❌ [QUICK TEST] No devices available');
      return false;
    }
    
    console.log('✅ [QUICK TEST] Basic Spotify functionality working');
    return true;
    
  } catch (error) {
    console.error('❌ [QUICK TEST] Failed:', error.message);
    return false;
  }
}

// Expose test functions globally for debugging
if (typeof window !== 'undefined') {
  (window as any).testPlaylistStartWorkflow = testPlaylistStartWorkflow;
  (window as any).quickSpotifyTest = quickSpotifyTest;
}