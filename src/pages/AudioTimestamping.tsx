import { AudioTimestampCapture } from '@/components/AudioTimestampCapture';
import { BottomNavigation } from '@/components/BottomNavigation';
import { Header } from '@/components/Header';
import { useState, useEffect } from 'react';
import { useSpotifyPolling } from '@/hooks/useSpotifyPolling';

const AudioTimestamping = () => {
  // Use Spotify polling to get current track data
  const { playbackState } = useSpotifyPolling({
    enabled: true,
    routeActive: true
  });

  // Check if we have current track data with Spotify tempo in session storage
  const [spotifyTempo, setSpotifyTempo] = useState<number | undefined>();
  const [trackInfo, setTrackInfo] = useState<{name: string, artist: string} | undefined>();

  useEffect(() => {
    // Use current playback state from Spotify polling first
    if (playbackState?.item && playbackState.is_playing) {
      setTrackInfo({
        name: playbackState.item.name,
        artist: playbackState.item.artists?.[0]?.name || ''
      });
      
      // If we have audio features from the track, use the tempo
      if (playbackState.item.audio_features?.tempo) {
        setSpotifyTempo(playbackState.item.audio_features.tempo);
      }
      return;
    }

    // Fallback to session storage if no active playback
    const currentTrackData = sessionStorage.getItem('currentTrack');
    if (currentTrackData) {
      try {
        const track = JSON.parse(currentTrackData);
        if (track.audio_features?.tempo) {
          setSpotifyTempo(track.audio_features.tempo);
          setTrackInfo({
            name: track.name,
            artist: track.artists?.[0]?.name || ''
          });
        }
      } catch (e) {
        console.log('No current track data available');
      }
    }
  }, [playbackState]);

  return (
    <div className="min-h-screen bg-premium-texture flex flex-col">
      <Header title="Audio Timestamping" />
      
      <div className="flex-1 px-4 py-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-cream mb-4">
              Audio Timestamp Capture Tool
            </h1>
            <p className="text-lg text-cream/80 max-w-2xl mx-auto">
              {playbackState?.item ? (
                <>Record the currently playing song from Spotify and manually capture section changes to build streaming vendor attribute data.</>
              ) : (
                <>Record any song and manually capture section changes, bar changes, and beats to build streaming vendor attribute data.</>
              )}
            </p>
            {playbackState?.item && (
              <div className="mt-4 p-3 bg-green-900/30 rounded-lg inline-block">
                <p className="text-green-300 text-sm">
                  🎵 Currently playing: <span className="font-semibold">{playbackState.item.name}</span> by <span className="font-semibold">{playbackState.item.artists?.[0]?.name}</span>
                </p>
              </div>
            )}
          </div>
          
          <AudioTimestampCapture 
            spotifyTempo={spotifyTempo}
            trackInfo={trackInfo}
          />
        </div>
      </div>

      <BottomNavigation />
    </div>
  );
};

export default AudioTimestamping;