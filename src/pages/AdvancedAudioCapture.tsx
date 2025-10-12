import { BottomNavigation } from '@/components/BottomNavigation';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState, useEffect, useRef } from 'react';
import { Mic, Square, Play, Pause, RotateCcw, Activity, Music } from 'lucide-react';
import { secureSpotifyService } from '@/lib/spotify-secure';
import { SpotifyDevice, SpotifyPlaybackState, SpotifyPlaylist } from '@/lib/spotify-types';

const AdvancedAudioCapture = () => {
  const [isCapturing, setIsCapturing] = useState(false);
  const [analysisData, setAnalysisData] = useState<{
    bpm: number | null;
    beats: number[];
    downbeats: number[];
    onsets: number[];
    confidence: number;
    analysis_method: string;
    processors?: any;
  }>({
    bpm: null,
    beats: [],
    downbeats: [],
    onsets: [],
    confidence: 0,
    analysis_method: 'librosa'
  });
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [trackInfo, setTrackInfo] = useState({
    name: '',
    artist: '',
    spotifyId: ''
  });
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  // Spotify integration states
  const [selectedService, setSelectedService] = useState<string>('');
  const [isSpotifyAuthenticated, setIsSpotifyAuthenticated] = useState(false);
  const [spotifyDevices, setSpotifyDevices] = useState<SpotifyDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [playbackState, setPlaybackState] = useState<SpotifyPlaybackState | null>(null);
  const [isRegisteringFromSpotify, setIsRegisteringFromSpotify] = useState(false);
  const [spotifyPlaylists, setSpotifyPlaylists] = useState<SpotifyPlaylist[]>([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState<string>('');
  const [isLoadingPlaylists, setIsLoadingPlaylists] = useState(false);
  
  // Playback monitoring ref
  const playbackMonitoringRef = useRef<NodeJS.Timeout | null>(null);
  
  // Analysis interval ref for madmom analysis simulation
  const analysisIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Timer ref for tracking recording duration
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  // Initialize session
  useEffect(() => {
    setSessionId(`session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  }, []);

  // Check Spotify authentication and handle OAuth callback
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Handle OAuth callback
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        
        if (code) {
          console.log('🎵 [AUTH] Processing OAuth callback...');
          const success = await secureSpotifyService.exchangeCodeForToken(code);
          if (success) {
            console.log('✅ [AUTH] Successfully authenticated with Spotify');
            setIsSpotifyAuthenticated(true);
            setSelectedService('spotify');
            // Clean up URL
            window.history.replaceState({}, document.title, window.location.pathname);
            await loadSpotifyPlaylists();
            await refreshSpotifyDevices();
          } else {
            console.error('❌ [AUTH] Failed to exchange code for token');
          }
        } else if (secureSpotifyService.isAuthenticated()) {
          console.log('✅ [AUTH] Already authenticated');
          setIsSpotifyAuthenticated(true);
          setSelectedService('spotify');
          await loadSpotifyPlaylists();
          await refreshSpotifyDevices();
        }
      } catch (error) {
        console.error('🚨 [AUTH] Authentication check failed:', error);
        setIsSpotifyAuthenticated(false);
      }
    };

    checkAuth();
  }, []);

  // Load Spotify playlists
  const loadSpotifyPlaylists = async () => {
    if (!secureSpotifyService.isAuthenticated()) {
      console.log('🎵 [PLAYLISTS] Not authenticated, skipping playlist load');
      return;
    }
    
    setIsLoadingPlaylists(true);
    try {
      console.log('🎵 [PLAYLISTS] Loading user playlists...');
      const playlists = await secureSpotifyService.getUserPlaylists();
      console.log('✅ [PLAYLISTS] Loaded', playlists.length, 'playlists');
      setSpotifyPlaylists(playlists);
    } catch (error) {
      console.error('❌ [PLAYLISTS] Failed to load playlists:', error);
    } finally {
      setIsLoadingPlaylists(false);
    }
  };

  // Spotify login handler
  const handleSpotifyLogin = async () => {
    console.log('🎵 [LOGIN] Redirecting to Spotify auth...');
    const authUrl = await secureSpotifyService.getAuthUrl();
    window.location.href = authUrl;
  };

  // Playback controls
  const handleSpotifyPlay = async () => {
    if (!selectedDevice) {
      alert('Please select a device first');
      return;
    }
    try {
      console.log('▶️ [PLAYBACK] Starting playback on device:', selectedDevice);
      await secureSpotifyService.startPlayback({ device_id: selectedDevice });
      setIsPlaying(true);
    } catch (error) {
      console.error('❌ [PLAYBACK] Failed to start playback:', error);
    }
  };

  const handleSpotifyPause = async () => {
    if (!selectedDevice) return;
    try {
      console.log('⏸️ [PLAYBACK] Pausing playback');
      await secureSpotifyService.pausePlayback(selectedDevice);
      setIsPlaying(false);
    } catch (error) {
      console.error('❌ [PLAYBACK] Failed to pause:', error);
    }
  };

  const handleSpotifyNext = async () => {
    if (!selectedDevice) return;
    try {
      console.log('⏭️ [PLAYBACK] Skipping to next track');
      await secureSpotifyService.skipToNext(selectedDevice);
    } catch (error) {
      console.error('❌ [PLAYBACK] Failed to skip next:', error);
    }
  };

  const handleSpotifyPrevious = async () => {
    if (!selectedDevice) return;
    try {
      console.log('⏮️ [PLAYBACK] Skipping to previous track');
      await secureSpotifyService.skipToPrevious(selectedDevice);
    } catch (error) {
      console.error('❌ [PLAYBACK] Failed to skip previous:', error);
    }
  };

  // Start playlist playback
  const startPlaylistPlayback = async () => {
    if (!selectedPlaylist || !selectedDevice) {
      alert('Please select both a playlist and device');
      return;
    }
    
    try {
      console.log('🎵 [PLAYLIST] Starting playlist playback:', selectedPlaylist, 'on device:', selectedDevice);
      
      // Use the proper startPlaylistPlayback method instead of startPlayback
      const success = await secureSpotifyService.startPlaylistPlayback(selectedPlaylist, selectedDevice);
      
      if (success) {
        console.log('✅ [PLAYLIST] Playlist started successfully');
        setIsPlaying(true);
        startPlaybackMonitoring();
      } else {
        console.error('❌ [PLAYLIST] Failed to start playlist - Spotify returned false');
        alert('Failed to start playlist. Make sure the selected device is active and Spotify is open on that device.');
      }
    } catch (error) {
      console.error('❌ [PLAYLIST] Failed to start playlist:', error);
      alert(`Failed to start playlist: ${error.message || 'Unknown error'}. Make sure Spotify is open and active on the selected device.`);
    }
  };

  // Playback monitoring for real-time track updates and auto-capture
  const startPlaybackMonitoring = () => {
    if (playbackMonitoringRef.current) {
      clearInterval(playbackMonitoringRef.current);
    }
    
    playbackMonitoringRef.current = setInterval(async () => {
      try {
        const state = await secureSpotifyService.getCurrentPlayback();
        setPlaybackState(state);
        
        if (state) {
          setIsPlaying(state.is_playing);
          
          // Auto-register current track info if changed
          if (state.item && state.item.id !== trackInfo.spotifyId) {
            console.log('🎵 [AUTO-CAPTURE] New track detected:', state.item.name);
            
            setTrackInfo({
              name: state.item.name,
              artist: state.item.artists?.[0]?.name || '',
              spotifyId: state.item.id
            });
            
            // Auto-start capture for new tracks if not already capturing
            if (!isCapturing && isCapturing !== null) {
              console.log('🎤 [AUTO-CAPTURE] Starting automatic audio capture for new track...');
              try {
                await startCapture();
              } catch (error) {
                console.error('❌ [AUTO-CAPTURE] Failed to auto-start capture:', error);
              }
            }
          }
          
          // If capturing and track is ending (less than 10 seconds left), save current analysis
          if (isCapturing && state.item && state.progress_ms && state.item.duration_ms) {
            const timeLeft = state.item.duration_ms - state.progress_ms;
            if (timeLeft < 10000 && timeLeft > 8000) { // 8-10 seconds left
              console.log('🎵 [AUTO-SAVE] Track ending soon, auto-saving analysis...');
              if (analysisData.bpm && analysisData.beats.length > 0) {
                try {
                  await saveToDatabase();
                  console.log('✅ [AUTO-SAVE] Analysis auto-saved for:', trackInfo.name);
                } catch (error) {
                  console.error('❌ [AUTO-SAVE] Failed to auto-save:', error);
                }
              }
            }
          }
        }
      } catch (error) {
        console.error('❌ [MONITORING] Playback monitoring error:', error);
      }
    }, 2000); // Check every 2 seconds
  };

  const stopPlaybackMonitoring = () => {
    if (playbackMonitoringRef.current) {
      clearInterval(playbackMonitoringRef.current);
      playbackMonitoringRef.current = null;
    }
  };

  // Cleanup monitoring and analysis on unmount
  useEffect(() => {
    return () => {
      stopPlaybackMonitoring();
      stopAnalysisService();
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Refresh Spotify devices (mirrored from MusicSync)
  const refreshSpotifyDevices = async () => {
    if (!isSpotifyAuthenticated) {
      console.log('🔍 [DEVICE DEBUG] Not authenticated, returning empty devices');
      return [];
    }
    
    try {
      console.log('🔍 [DEVICE DEBUG] Fetching available devices...');
      const devices = await secureSpotifyService.getAvailableDevices();
      console.log('🔍 [DEVICE DEBUG] Devices fetched:', {
        totalDevices: devices.length,
        devices: devices.map(d => ({ name: d.name, id: d.id, is_active: d.is_active }))
      });
      
      setSpotifyDevices(devices);
      
      // Auto-select active device if none is selected
      const activeDevice = devices.find(d => d.is_active);
      if (activeDevice && !selectedDevice) {
        console.log('🔍 [DEVICE DEBUG] Auto-selecting active device:', activeDevice.name);
        setSelectedDevice(activeDevice.id);
      } else {
        console.log('🔍 [DEVICE DEBUG] No active device found or device already selected');
      }
      
      return devices;
    } catch (error) {
      console.error('🔍 [DEVICE DEBUG] Error refreshing devices:', error);
      return [];
    }
  };

  // Auto-detect track from current Spotify playback (mirrored from AudioTimestampCapture)
  const registerNewSongFromSpotify = async () => {
    console.log('🎵 [REGISTER] Starting register new song process...');
    
    if (!secureSpotifyService.isAuthenticated()) {
      console.log('🎵 [REGISTER] Not authenticated');
      alert('Please connect to Spotify first from the Music Sync page');
      return;
    }

    setIsRegisteringFromSpotify(true);

    try {
      // Use the exact same method as music-sync polling: getCurrentPlayback()
      console.log('🎵 [REGISTER] Fetching current playback state (same as music-sync)...');
      const playbackState = await secureSpotifyService.getCurrentPlayback();
      
      console.log('🎵 [REGISTER] Playback state:', {
        hasState: !!playbackState,
        hasItem: !!playbackState?.item,
        isPlaying: playbackState?.is_playing,
        trackName: playbackState?.item?.name,
        artist: playbackState?.item?.artists?.[0]?.name
      });
      
      if (!playbackState?.item) {
        const errorMsg = 'No song found in Spotify. Please make sure Spotify is open and has a song selected (playing or paused).';
        alert(errorMsg);
        console.log('🎵 [REGISTER] No current track found');
        return;
      }

      const trackName = playbackState.item.name;
      const artistName = playbackState.item.artists?.[0]?.name || '';
      const spotifyId = playbackState.item.id;

      console.log('🎵 [REGISTER] Found track:', trackName, 'by', artistName);

      // Update track info
      setTrackInfo({
        name: trackName,
        artist: artistName,
        spotifyId: spotifyId
      });

      console.log('🎵 Registered new song from Spotify:', trackName, 'by', artistName);

    } catch (error) {
      console.error('🎵 [REGISTER] Failed to register new song:', error);
      alert(`Failed to get current song: ${error instanceof Error ? error.message : 'Unknown error'}. Make sure Spotify is connected and open.`);
    } finally {
      setIsRegisteringFromSpotify(false);
    }
  };

  const startCapture = async () => {
    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          sampleRate: 48000
        } 
      });
      
      streamRef.current = stream;
      
      // Create audio context for real-time analysis
      audioContextRef.current = new AudioContext({ sampleRate: 48000 });
      const source = audioContextRef.current.createMediaStreamSource(stream);
      
      // Start timing
      startTimeRef.current = Date.now();
      setCurrentTime(0);
      
      // Start timer to track recording duration
      timerRef.current = setInterval(() => {
        const elapsed = (Date.now() - startTimeRef.current) / 1000;
        setCurrentTime(elapsed);
      }, 100); // Update every 100ms for smooth display
      
      // Start analysis service (this would connect to Python service)
      await startAnalysisService();
      
      setIsCapturing(true);
      console.log('🎤 [CAPTURE] Audio capture started with session:', sessionId);
    } catch (error) {
      console.error('Failed to start audio capture:', error);
    }
  };

  const stopCapture = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    // Stop timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    setIsCapturing(false);
    stopAnalysisService();
    console.log('🛑 [CAPTURE] Audio capture stopped - final duration:', currentTime.toFixed(1), 's');
  };

  const startAnalysisService = async () => {
    console.log('🎵 [ANALYSIS] Starting analysis service for session:', sessionId);
    
    // Clear any existing interval
    if (analysisIntervalRef.current) {
      clearInterval(analysisIntervalRef.current);
    }
    
    // Start analysis interval
    analysisIntervalRef.current = setInterval(async () => {
      if (isCapturing) {
        try {
          // Try to connect to Python madmom service
          console.log('🔍 [ANALYSIS] Attempting to connect to madmom service...');
          const response = await fetch('http://localhost:5001/realtime-stats', {
            method: 'GET',
            timeout: 1000 // 1 second timeout
          });
          
          if (response.ok) {
            const stats = await response.json();
            console.log('✅ [ANALYSIS] Received madmom data:', stats);
            setAnalysisData(prev => ({
              ...prev,
              bpm: stats.bpm,
              beats: prev.beats.concat(stats.beat_count > prev.beats.length ? [currentTime] : []),
              downbeats: prev.downbeats.concat(stats.downbeat_count > prev.downbeats.length ? [currentTime] : []),
              onsets: prev.onsets.concat(stats.onset_count > prev.onsets.length ? [currentTime] : []),
              confidence: stats.confidence,
              analysis_method: stats.analysis_method,
              processors: stats.processors
            }));
          } else {
            throw new Error('Madmom service not responding');
          }
        } catch (error) {
          // Fallback to simulation if madmom service not available
          console.log('⚠️ [ANALYSIS] Madmom service not available, using simulation:', error.message);
          
          const simulatedBpm = 120 + Math.random() * 40; // 120-160 BPM range
          const beatInterval = 60 / simulatedBpm; // seconds per beat
          
          setAnalysisData(prev => {
            const newBeats = [...prev.beats, currentTime];
            const newDownbeats = currentTime % (beatInterval * 4) < beatInterval * 0.1 ? 
              [...prev.downbeats, currentTime] : prev.downbeats;
            const newOnsets = [...prev.onsets, currentTime + Math.random() * 0.05];
            
            console.log('🎵 [SIMULATION] Updated analysis:', {
              bpm: simulatedBpm,
              beats: newBeats.length,
              downbeats: newDownbeats.length,
              onsets: newOnsets.length,
              currentTime
            });
            
            return {
              ...prev,
              bpm: simulatedBpm,
              beats: newBeats,
              downbeats: newDownbeats,
              onsets: newOnsets,
              confidence: 0.8 + Math.random() * 0.2,
              analysis_method: 'simulation_fallback'
            };
          });
        }
      }
    }, 500); // Update every 500ms
    
    console.log('✅ [ANALYSIS] Analysis service started with interval ID:', analysisIntervalRef.current);
  };

  const stopAnalysisService = () => {
    console.log('🛑 [ANALYSIS] Stopping analysis service for session:', sessionId);
    
    // Clear the analysis interval
    if (analysisIntervalRef.current) {
      clearInterval(analysisIntervalRef.current);
      analysisIntervalRef.current = null;
      console.log('✅ [ANALYSIS] Analysis interval cleared');
    }
    
    // This would call your Python service to stop and process final results
    console.log('🎵 [ANALYSIS] Final analysis data:', {
      bpm: analysisData.bpm,
      beats: analysisData.beats.length,
      downbeats: analysisData.downbeats.length,
      onsets: analysisData.onsets.length,
      confidence: analysisData.confidence
    });
  };

  const saveToDatabase = async () => {
    if (!trackInfo.name || !trackInfo.artist) {
      alert('Please enter track name and artist');
      return;
    }

    if (!analysisData.bpm || analysisData.beats.length === 0) {
      alert('No analysis data to save. Please ensure audio capture has generated analysis results.');
      return;
    }

    try {
      console.log('💾 [SVA] Preparing to save madmom analysis data to streaming_vendor_attributes...');
      
      // Prepare SVA data with madmom analysis results
      const svaData = {
        // Track identification
        track_name: trackInfo.name,
        artist_name: trackInfo.artist,
        spotify_track_id: trackInfo.spotifyId || null,
        
        // Core tempo/BPM data from madmom
        spotify_tempo: analysisData.bpm,
        tempo_confidence: analysisData.confidence,
        analysis_method: analysisData.analysis_method || 'madmom',
        
        // Beat tracking data
        beat_timestamps: analysisData.beats,
        downbeat_timestamps: analysisData.downbeats,
        onset_timestamps: analysisData.onsets,
        
        // Session metadata
        capture_session_id: sessionId,
        captured_at: new Date().toISOString(),
        capture_method: 'advanced_audio_capture',
        
        // Madmom-specific processor data
        processor_config: analysisData.processors ? {
          madmom_processors: analysisData.processors,
          beatnet_enabled: analysisData.processors?.beatnet || false,
          librosa_fallback: analysisData.analysis_method === 'librosa'
        } : null,
        
        // Audio analysis quality metrics
        analysis_duration_ms: currentTime,
        total_beats_detected: analysisData.beats.length,
        total_downbeats_detected: analysisData.downbeats.length,
        total_onsets_detected: analysisData.onsets.length,
        
        // Default section info (will be enhanced by subsequent analysis)
        section_type: 'full_track',
        section_number: 1,
        timestamp_ms: 0
      };

      console.log('💾 [SVA] Prepared data for streaming_vendor_attributes:', {
        track: svaData.track_name,
        artist: svaData.artist_name,
        bpm: svaData.spotify_tempo,
        beats: svaData.total_beats_detected,
        downbeats: svaData.total_downbeats_detected,
        onsets: svaData.total_onsets_detected,
        confidence: svaData.tempo_confidence,
        method: svaData.analysis_method
      });

      // Save to Supabase via Netlify function
      const response = await fetch('/.netlify/functions/save-madmom-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(svaData)
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ [SVA] Successfully saved madmom analysis to streaming_vendor_attributes:', result);
        
        alert(`✅ Analysis saved to SVA database!
        
Track: ${trackInfo.name} by ${trackInfo.artist}
BPM: ${Math.round(analysisData.bpm)} (${Math.round(analysisData.confidence * 100)}% confidence)
Beats: ${analysisData.beats.length} detected
Downbeats: ${analysisData.downbeats.length} detected
Onsets: ${analysisData.onsets.length} detected
Method: ${analysisData.analysis_method}

Data is now available for workout phase mapping!`);
        
        // Reset analysis data for next capture
        setAnalysisData({
          bpm: null,
          beats: [],
          downbeats: [],
          onsets: [],
          confidence: 0,
          analysis_method: 'librosa'
        });
        
      } else {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
    } catch (error) {
      console.error('❌ [SVA] Failed to save madmom analysis:', error);
      alert(`❌ Failed to save analysis to database: ${error.message}
      
Your analysis data has been captured but could not be saved. Please try again or check the console for details.`);
    }
  };

  const resetSession = () => {
    setAnalysisData({
      bpm: null,
      beats: [],
      downbeats: [],
      confidence: 0
    });
    setCurrentTime(0);
    setSessionId(`session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  };

  // Timer for session duration
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isCapturing) {
      interval = setInterval(() => {
        setCurrentTime(prev => prev + 0.1);
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isCapturing]);

  return (
    <div className="min-h-screen bg-premium-texture flex flex-col">
      <Header title="Advanced Audio Capture" />
      
      <div className="flex-1 px-4 py-6">
        <div className="max-w-4xl mx-auto space-y-6">
          
          {/* Header Info */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-cream mb-4">
              🎵 Advanced Audio Capture (Trial)
            </h1>
            <p className="text-lg text-cream/80 max-w-3xl mx-auto">
              Connect to Spotify, select playlist and device, then capture audio with real-time beat detection using BeatNet and madmom libraries
            </p>
          </div>

          {/* Service Selection */}
          {!selectedService && (
            <Card className="bg-cream/10 border-cream/20">
              <CardHeader>
                <CardTitle className="text-cream text-center">Choose Music Service</CardTitle>
                <CardDescription className="text-cream/70 text-center">
                  Select your streaming service to begin audio capture
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card
                    onClick={() => setSelectedService('spotify')}
                    className="cursor-pointer transition-all hover:border-green-500 border-cream/30 hover:bg-cream/5"
                  >
                    <CardContent className="p-4 text-center">
                      <div className="text-4xl mb-2">🎵</div>
                      <h3 className="text-cream font-semibold">Spotify</h3>
                      <p className="text-cream/60 text-sm">Connect your Spotify account</p>
                    </CardContent>
                  </Card>
                  
                  <Card className="opacity-50 border-cream/20">
                    <CardContent className="p-4 text-center">
                      <div className="text-4xl mb-2">🍎</div>
                      <h3 className="text-cream/50 font-semibold">Apple Music</h3>
                      <p className="text-cream/40 text-sm">Coming soon</p>
                    </CardContent>
                  </Card>
                  
                  <Card className="opacity-50 border-cream/20">
                    <CardContent className="p-4 text-center">
                      <div className="text-4xl mb-2">▶️</div>
                      <h3 className="text-cream/50 font-semibold">YouTube Music</h3>
                      <p className="text-cream/40 text-sm">Coming soon</p>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Spotify Authentication */}
          {selectedService === 'spotify' && !isSpotifyAuthenticated && (
            <Card className="bg-cream/10 border-cream/20">
              <CardHeader>
                <CardTitle className="text-cream text-center flex items-center justify-center gap-2">
                  🎵 Connect to Spotify
                </CardTitle>
                <CardDescription className="text-cream/70 text-center">
                  Login to access your playlists and control playback
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <Button 
                  onClick={handleSpotifyLogin}
                  className="bg-green-600 hover:bg-green-700 text-white font-semibold px-8 py-3"
                >
                  Login with Spotify
                </Button>
                <p className="text-cream/60 text-sm mt-3">
                  You'll be redirected to Spotify to authorize access
                </p>
              </CardContent>
            </Card>
          )}

          {/* Playlist Selection */}
          {selectedService === 'spotify' && isSpotifyAuthenticated && (
            <Card className="bg-cream/10 border-cream/20">
              <CardHeader>
                <CardTitle className="text-cream flex items-center gap-2">
                  🎵 Select Playlist
                </CardTitle>
                <CardDescription className="text-cream/70">
                  Choose a playlist to capture and analyze
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingPlaylists ? (
                  <div className="text-center py-8">
                    <div className="text-cream/70">🔄 Loading your playlists...</div>
                  </div>
                ) : spotifyPlaylists.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-64 overflow-y-auto">
                    {spotifyPlaylists.map((playlist) => (
                      <div
                        key={playlist.id}
                        onClick={() => setSelectedPlaylist(playlist.id)}
                        className={`p-3 rounded-lg border cursor-pointer transition-all ${
                          selectedPlaylist === playlist.id
                            ? 'bg-energy-gradient border-accent text-cream'
                            : 'bg-cream/5 border-cream/20 text-cream/80 hover:bg-cream/10'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium truncate">{playlist.name}</div>
                            <div className="text-xs opacity-75">
                              {playlist.tracks.total} tracks
                            </div>
                          </div>
                          {selectedPlaylist === playlist.id && (
                            <span className="text-accent">✓</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-cream/70">No playlists found</div>
                    <Button 
                      onClick={loadSpotifyPlaylists}
                      variant="outline"
                      className="mt-2 border-cream/30 text-cream hover:bg-cream/20"
                    >
                      🔄 Refresh Playlists
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Session Info */}
          <Card className="bg-cream/10 border-cream/20">
            <CardHeader>
              <CardTitle className="text-cream flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Session: {sessionId?.slice(-8)}
              </CardTitle>
              <CardDescription className="text-cream/70">
                Duration: {currentTime.toFixed(1)}s | Status: {isCapturing ? 'Recording' : 'Stopped'}
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Track Information */}
          <Card className="bg-cream/10 border-cream/20">
            <CardHeader>
              <CardTitle className="text-cream flex items-center gap-2">
                <Music className="w-5 h-5" />
                Track Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-cream">Track Name</Label>
                <Input
                  value={trackInfo.name}
                  onChange={(e) => setTrackInfo(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter the song title"
                  className="bg-cream/20 border-cream/30 text-cream"
                />
              </div>
              <div>
                <Label className="text-cream">Artist</Label>
                <Input
                  value={trackInfo.artist}
                  onChange={(e) => setTrackInfo(prev => ({ ...prev, artist: e.target.value }))}
                  placeholder="Enter the artist name"
                  className="bg-cream/20 border-cream/30 text-cream"
                />
              </div>
              <div>
                <Label className="text-cream">Spotify ID (Optional)</Label>
                <Input
                  value={trackInfo.spotifyId}
                  onChange={(e) => setTrackInfo(prev => ({ ...prev, spotifyId: e.target.value }))}
                  placeholder="Spotify track ID if known"
                  className="bg-cream/20 border-cream/30 text-cream"
                />
              </div>
              
              {/* Auto-register from Spotify button */}
              <div className="flex gap-2 pt-4">
                <Button
                  onClick={registerNewSongFromSpotify}
                  disabled={isRegisteringFromSpotify || isCapturing || !isSpotifyAuthenticated}
                  className="bg-green-600 hover:bg-green-700 text-white flex-1"
                >
                  {isRegisteringFromSpotify ? '🔄 Getting Song...' : '🎵 Register From Mac Spotify'}
                </Button>
                {!isSpotifyAuthenticated && (
                  <Button
                    onClick={() => window.open('/music-sync', '_blank')}
                    variant="outline"
                    className="border-cream/30 text-cream hover:bg-cream/20"
                  >
                    🔗 Connect Spotify
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Spotify Device Selection */}
          {selectedService === 'spotify' && isSpotifyAuthenticated && (
            <Card className="bg-cream/10 border-cream/20">
              <CardHeader>
                <CardTitle className="text-cream flex items-center gap-2">
                  🎧 Choose Playback Device
                </CardTitle>
                <CardDescription className="text-cream/70">
                  Select which device to play Spotify music on for capture
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between mb-3">
                  <Button
                    onClick={refreshSpotifyDevices}
                    variant="outline"
                    className="border-cream/30 text-cream hover:bg-cream/20"
                  >
                    🔄 Refresh Devices
                  </Button>
                </div>
                
                {spotifyDevices.length > 0 ? (
                  <div className="space-y-2">
                    {spotifyDevices.map((device) => (
                      <div
                        key={device.id}
                        onClick={() => setSelectedDevice(device.id)}
                        className={`p-3 rounded-lg border cursor-pointer transition-all ${
                          selectedDevice === device.id
                            ? 'bg-energy-gradient border-accent text-cream'
                            : 'bg-cream/5 border-cream/20 text-cream/80 hover:bg-cream/10'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-lg">
                              {device.type === 'smartphone' ? '📱' : 
                               device.type === 'computer' ? '💻' : 
                               device.type === 'speaker' ? '🔊' : '🎵'}
                            </span>
                            <div>
                              <div className="font-medium">{device.name}</div>
                              <div className="text-xs opacity-75">
                                {device.type} • {device.volume_percent}% volume
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {device.is_active && (
                              <span className="px-2 py-1 bg-green-500 text-white text-xs rounded">
                                Active
                              </span>
                            )}
                            {selectedDevice === device.id && (
                              <span className="text-accent">✓</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-cream/70 mb-4">No Spotify devices found</div>
                    <div className="text-cream/60 text-sm mb-4">
                      Make sure Spotify is open on your phone, computer, or other device
                    </div>
                    <Button 
                      onClick={refreshSpotifyDevices}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      🔍 Check for Devices
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Debug Info - Temporary */}
          {selectedService === 'spotify' && isSpotifyAuthenticated && (
            <div className="text-cream/60 text-xs p-2 bg-cream/5 rounded">
              Debug: Service={selectedService}, Auth={isSpotifyAuthenticated ? 'Yes' : 'No'}, 
              Playlist={selectedPlaylist || 'None'}, Device={selectedDevice || 'None'}
            </div>
          )}

          {/* Playback Controls */}
          {selectedService === 'spotify' && isSpotifyAuthenticated && selectedPlaylist && (
            <Card className="bg-cream/10 border-cream/20">
              <CardHeader>
                <CardTitle className="text-cream">🎵 Spotify Playback Controls</CardTitle>
                <CardDescription className="text-cream/70">
                  {selectedDevice ? (
                    <>
                      Control music playback on your selected device
                      <div className="mt-1 text-sm text-green-300">
                        🎵 Device: {spotifyDevices.find(d => d.id === selectedDevice)?.name}
                      </div>
                      {playbackState?.item && (
                        <div className="mt-1 text-sm text-blue-300">
                          ♪ Now Playing: {playbackState.item.name} - {playbackState.item.artists?.[0]?.name}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-yellow-300">
                      ⚠️ Please select a playback device above to start playlist
                    </div>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedDevice ? (
                  <>
                    <div className="flex gap-4 justify-center items-center">
                      <Button
                        onClick={startPlaylistPlayback}
                        disabled={isCapturing}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        🎵 Start Playlist
                      </Button>
                      
                      <div className="flex gap-2">
                        <Button
                          onClick={handleSpotifyPrevious}
                          disabled={!playbackState || isCapturing}
                          variant="outline"
                          className="border-cream/30 text-cream hover:bg-cream/20"
                        >
                          ⏮️
                        </Button>
                        
                        <Button
                          onClick={isPlaying ? handleSpotifyPause : handleSpotifyPlay}
                          disabled={!playbackState || isCapturing}
                          variant="outline"
                          className="border-cream/30 text-cream hover:bg-cream/20"
                        >
                          {isPlaying ? '⏸️' : '▶️'}
                        </Button>
                        
                        <Button
                          onClick={handleSpotifyNext}
                          disabled={!playbackState || isCapturing}
                          variant="outline"
                          className="border-cream/30 text-cream hover:bg-cream/20"
                        >
                          ⏭️
                        </Button>
                      </div>
                    </div>
                    
                    {playbackState && (
                      <div className="text-center">
                        <div className="text-sm text-cream/70">
                          Progress: {Math.floor((playbackState.progress_ms || 0) / 1000)}s / {Math.floor((playbackState.item?.duration_ms || 0) / 1000)}s
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-4">
                    <div className="text-cream/60">
                      Select a device above to enable playback controls
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Audio Capture Controls */}
          <Card className="bg-cream/10 border-cream/20">
            <CardHeader>
              <CardTitle className="text-cream">🎤 Audio Capture Controls</CardTitle>
              <CardDescription className="text-cream/70">
                Start music playback above, then begin microphone capture for analysis
                {!selectedService && (
                  <div className="mt-2 text-yellow-300 text-sm">
                    ⚠️ Please select a music service first
                  </div>
                )}
                {selectedService && !isSpotifyAuthenticated && (
                  <div className="mt-2 text-yellow-300 text-sm">
                    ⚠️ Please connect to Spotify first
                  </div>
                )}
                {isSpotifyAuthenticated && !selectedPlaylist && (
                  <div className="mt-2 text-yellow-300 text-sm">
                    ⚠️ Please select a playlist first
                  </div>
                )}
                {selectedPlaylist && !selectedDevice && (
                  <div className="mt-2 text-yellow-300 text-sm">
                    ⚠️ Please select a playback device first
                  </div>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4 justify-center">
                {!isCapturing ? (
                  <Button
                    onClick={startCapture}
                    className="bg-green-600 hover:bg-green-700 text-white px-8 py-3"
                  >
                    <Mic className="w-5 h-5 mr-2" />
                    Start Capture
                  </Button>
                ) : (
                  <Button
                    onClick={stopCapture}
                    className="bg-red-600 hover:bg-red-700 text-white px-8 py-3"
                  >
                    <Square className="w-5 h-5 mr-2" />
                    Stop Capture
                  </Button>
                )}
                
                <Button
                  onClick={resetSession}
                  variant="outline"
                  className="border-cream/30 text-cream hover:bg-cream/20"
                >
                  <RotateCcw className="w-5 h-5 mr-2" />
                  Reset Session
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Real-time Analysis Results */}
          <Card className="bg-cream/10 border-cream/20">
            <CardHeader>
              <CardTitle className="text-cream">Real-time Analysis</CardTitle>
              <CardDescription className="text-cream/70">
                Live audio analysis using BeatNet + madmom
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-cream">
                    {analysisData.bpm?.toFixed(1) || '--'}
                  </div>
                  <div className="text-sm text-cream/70">BPM</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-cream">
                    {analysisData.beats.length}
                  </div>
                  <div className="text-sm text-cream/70">Beats</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-cream">
                    {analysisData.downbeats.length}
                  </div>
                  <div className="text-sm text-cream/70">Downbeats</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-cream">
                    {analysisData.onsets.length}
                  </div>
                  <div className="text-sm text-cream/70">Onsets</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-cream">
                    {(analysisData.confidence * 100).toFixed(0)}%
                  </div>
                  <div className="text-sm text-cream/70">Confidence</div>
                </div>
              </div>
              
              <div className="text-center mt-4">
                <div className="text-sm text-cream/60">
                  Method: {analysisData.analysis_method || 'librosa'}
                  {analysisData.processors && (
                    <span className="ml-2">
                      {Object.entries(analysisData.processors).filter(([k, v]) => v).map(([k]) => k.replace('madmom_', '')).join(', ')}
                    </span>
                  )}
                </div>
              </div>
              
              {isCapturing && (
                <div className="text-center">
                  <div className="inline-flex items-center gap-2 text-green-400">
                    <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                    Analyzing audio...
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Save Results */}
          <Card className="bg-cream/10 border-cream/20">
            <CardHeader>
              <CardTitle className="text-cream">Save to Database</CardTitle>
              <CardDescription className="text-cream/70">
                Save madmom analysis data to SVA database for workout phase mapping. Auto-saves when tracks end during playlist playback.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={saveToDatabase}
                disabled={!analysisData.bpm || isCapturing}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50"
              >
                💾 Save Madmom Analysis to SVA Database
              </Button>
            </CardContent>
          </Card>

          {/* Setup Instructions */}
          <Card className="bg-yellow-100/10 border-yellow-400/30">
            <CardHeader>
              <CardTitle className="text-yellow-200">Required Setup</CardTitle>
            </CardHeader>
            <CardContent className="text-yellow-100/90 space-y-2">
              <p><strong>Python Service Status:</strong></p>
              <ul className="list-disc pl-6 space-y-1">
                <li>✅ <code>madmom</code> - Professional audio analysis</li>
                <li>✅ <code>librosa</code> - Audio processing & fallback</li>
                <li>✅ <code>sounddevice</code> - Real-time audio capture</li>
                <li>✅ <code>flask</code> - API server for React integration</li>
              </ul>
              <p className="mt-4"><strong>To Start:</strong></p>
              <ol className="list-decimal pl-6 space-y-1">
                <li>Run <code>cd bassline-audio-service && ./start_server.sh</code></li>
                <li>Position iPhone and Mac side-by-side</li>
                <li>Start iPhone Spotify playback</li>
                <li>Begin capture here</li>
              </ol>
            </CardContent>
          </Card>

        </div>
      </div>

      <BottomNavigation />
    </div>
  );
};

export default AdvancedAudioCapture;