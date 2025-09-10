/**
 * Quick Spotify Playback Debugger
 * Simple functions to test Spotify functionality step by step
 */

import { spotifyService } from './spotify';

/**
 * Quick diagnosis of why Spotify playback might be failing
 */
export async function diagnoseSpotifyPlayback(): Promise<void> {
  console.log('🩺 [SPOTIFY DEBUG] Starting quick diagnosis...');
  
  // Check 1: Authentication
  const isAuth = spotifyService.isAuthenticated();
  console.log(`🔐 Authentication: ${isAuth ? '✅ OK' : '❌ FAILED'}`);
  
  if (!isAuth) {
    console.log('❌ DIAGNOSIS: User not logged into Spotify');
    return;
  }
  
  try {
    // Check 2: Get devices
    const devices = await spotifyService.getDevices();
    console.log(`🎧 Devices: ${devices?.length || 0} found`);
    
    if (!devices || devices.length === 0) {
      console.log('❌ DIAGNOSIS: No Spotify devices available. Open Spotify app on phone/computer.');
      return;
    }
    
    const activeDevice = devices.find(d => d.is_active);
    console.log(`📱 Active device: ${activeDevice ? activeDevice.name : 'None'}`);
    
    // Check 3: Get playlists
    const playlists = await spotifyService.getUserPlaylists();
    console.log(`🎵 Playlists: ${playlists?.length || 0} found`);
    
    if (!playlists || playlists.length === 0) {
      console.log('❌ DIAGNOSIS: No playlists found');
      return;
    }
    
    // Check 4: Try to get tracks from first playlist
    const firstPlaylist = playlists[0];
    const tracks = await spotifyService.getPlaylistTracks(firstPlaylist.id);
    console.log(`🎼 Tracks in "${firstPlaylist.name}": ${tracks?.length || 0}`);
    
    if (!tracks || tracks.length === 0) {
      console.log('❌ DIAGNOSIS: First playlist has no tracks');
      return;
    }
    
    console.log('✅ DIAGNOSIS: Basic Spotify functionality appears to be working');
    console.log('🔍 Next: Check browser console when clicking "Start Your Playlist" for specific errors');
    
  } catch (error) {
    console.error('❌ DIAGNOSIS: Error during checks:', error);
  }
}

/**
 * Test specific playlist playback
 */
export async function testPlaylistPlayback(playlistId: string): Promise<void> {
  console.log(`🧪 [SPOTIFY DEBUG] Testing playlist: ${playlistId}`);
  
  try {
    const devices = await spotifyService.getDevices();
    const device = devices?.find(d => d.is_active) || devices?.[0];
    
    if (!device) {
      console.error('❌ No device available for playback test');
      return;
    }
    
    console.log(`🎯 Attempting playback on: ${device.name}`);
    const result = await spotifyService.startPlaylistPlayback(playlistId, device.id);
    console.log(`🎵 Playback result: ${result ? '✅ Started' : '❌ Failed'}`);
    
  } catch (error) {
    console.error('❌ Playback test failed:', error);
  }
}

// Expose functions globally for console use
if (typeof window !== 'undefined') {
  (window as any).diagnoseSpotifyPlayback = diagnoseSpotifyPlayback;
  (window as any).testPlaylistPlayback = testPlaylistPlayback;
}