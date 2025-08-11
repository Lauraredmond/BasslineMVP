import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { spotifyService } from '@/lib/spotify';

const SpotifyCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const error = urlParams.get('error');

      if (error) {
        console.error('Spotify authorization error:', error);
        navigate('/music-sync?error=' + error);
        return;
      }

      if (code) {
        try {
          const success = await spotifyService.exchangeCodeForToken(code);
          if (success) {
            // Redirect back to music sync page
            navigate('/music-sync?spotify_connected=true');
          } else {
            navigate('/music-sync?error=token_exchange_failed');
          }
        } catch (error) {
          console.error('Token exchange error:', error);
          navigate('/music-sync?error=token_exchange_error');
        }
      } else {
        navigate('/music-sync?error=no_code');
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-premium-texture flex items-center justify-center">
      <div className="text-center">
        <div className="text-4xl mb-4">🎵</div>
        <h2 className="text-xl font-bold text-cream mb-2">Connecting to Spotify...</h2>
        <p className="text-cream/70">Please wait while we set up your music.</p>
      </div>
    </div>
  );
};

export default SpotifyCallback;