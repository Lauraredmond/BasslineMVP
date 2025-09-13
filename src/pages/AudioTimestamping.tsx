import { AudioTimestampCapture } from '@/components/AudioTimestampCapture';
import { BottomNavigation } from '@/components/BottomNavigation';
import { Header } from '@/components/Header';
import { useState, useEffect } from 'react';

const AudioTimestamping = () => {
  // Check if we have current track data with Spotify tempo in session storage
  const [spotifyTempo, setSpotifyTempo] = useState<number | undefined>();
  const [trackInfo, setTrackInfo] = useState<{name: string, artist: string} | undefined>();

  useEffect(() => {
    // Check for current track data that might have Spotify tempo
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
  }, []);

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
              Record any song and manually capture section changes, bar changes, and beats to build streaming vendor attribute data.
            </p>
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