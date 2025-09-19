import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { secureSpotifyService } from '@/lib/spotify-secure';

const SpotifyCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      console.log('🔄 [CALLBACK] Starting Spotify callback handling...');
      console.log('🔄 [CALLBACK] Current URL:', window.location.href);
      
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const error = urlParams.get('error');
      
      console.log('🔄 [CALLBACK] URL params:', { code: code?.substring(0, 10) + '...', error });

      if (error) {
        console.error('❌ [CALLBACK] Spotify authorization error:', error);
        navigate('/music-sync?error=' + error);
        return;
      }

      if (code) {
        try {
          console.log('🔄 [CALLBACK] Attempting token exchange...');
          const success = await secureSpotifyService.exchangeCodeForToken(code);
          console.log('🔄 [CALLBACK] Token exchange result:', success);
          
          if (success) {
            console.log('✅ [CALLBACK] Token exchange successful, redirecting...');
            navigate('/music-sync?spotify_connected=true');
          } else {
            console.log('❌ [CALLBACK] Token exchange failed');
            navigate('/music-sync?error=token_exchange_failed');
          }
        } catch (error) {
          console.error('❌ [CALLBACK] Token exchange error:', error);
          navigate('/music-sync?error=token_exchange_error');
        }
      } else {
        console.log('❌ [CALLBACK] No authorization code received');
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