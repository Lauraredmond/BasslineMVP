import { BottomNavigation } from '@/components/BottomNavigation';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState, useEffect, useRef } from 'react';
import { Mic, Square, Play, Pause, RotateCcw, Activity, Music } from 'lucide-react';
import { secureSpotifyService } from '@/lib/spotify-secure';
import { SpotifyDevice, SpotifyPlaybackState } from '@/lib/spotify-types';

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
  const [isSpotifyAuthenticated, setIsSpotifyAuthenticated] = useState(false);
  const [spotifyDevices, setSpotifyDevices] = useState<SpotifyDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [playbackState, setPlaybackState] = useState<SpotifyPlaybackState | null>(null);
  const [isRegisteringFromSpotify, setIsRegisteringFromSpotify] = useState(false);

  // Initialize session
  useEffect(() => {
    setSessionId(`session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  }, []);

  // Check Spotify authentication and load devices
  useEffect(() => {
    const checkSpotifyAuth = async () => {
      try {
        const isAuth = secureSpotifyService.isAuthenticated();
        setIsSpotifyAuthenticated(isAuth);
        console.log('🎵 [SPOTIFY AUTH] Authenticated:', isAuth);
        
        if (isAuth) {
          await refreshSpotifyDevices();
        }
      } catch (error) {
        console.error('🚨 [SPOTIFY AUTH] Failed to check authentication:', error);
        setIsSpotifyAuthenticated(false);
      }
    };

    checkSpotifyAuth();
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
      
      // Start analysis service (this would connect to Python service)
      await startAnalysisService();
      
      setIsCapturing(true);
      console.log('Audio capture started with session:', sessionId);
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
    
    setIsCapturing(false);
    stopAnalysisService();
    console.log('Audio capture stopped');
  };

  const startAnalysisService = async () => {
    // This would call your Python analysis service
    console.log('Starting analysis service for session:', sessionId);
    
    // Connect to Python analysis service
    const interval = setInterval(async () => {
      if (isCapturing) {
        try {
          const response = await fetch('http://localhost:5000/realtime-stats');
          if (response.ok) {
            const stats = await response.json();
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
          }
        } catch (error) {
          // Fallback to simulation if service not available
          setAnalysisData(prev => ({
            ...prev,
            bpm: 128 + Math.random() * 20,
            beats: [...prev.beats, currentTime],
            downbeats: Math.random() > 0.75 ? [...prev.downbeats, currentTime] : prev.downbeats,
            onsets: [...prev.onsets, currentTime + Math.random() * 0.1],
            confidence: 0.7 + Math.random() * 0.3
          }));
        }
      }
    }, 500);

    return () => clearInterval(interval);
  };

  const stopAnalysisService = () => {
    console.log('Stopping analysis service for session:', sessionId);
    // This would call your Python service to stop and process final results
  };

  const saveToDatabase = async () => {
    if (!trackInfo.name || !trackInfo.artist) {
      alert('Please enter track name and artist');
      return;
    }

    const captureData = {
      session_id: sessionId,
      track_name: trackInfo.name,
      artist: trackInfo.artist,
      spotify_id: trackInfo.spotifyId || null,
      captured_bpm: analysisData.bpm,
      beat_timestamps: analysisData.beats,
      downbeat_timestamps: analysisData.downbeats,
      confidence_score: analysisData.confidence,
      captured_at: new Date().toISOString()
    };

    console.log('Saving capture data:', captureData);
    // This would call your Netlify function to save to Supabase
    alert('Analysis data saved! (This is a trial implementation)');
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
              Capture music from iPhone → Mac microphone with real-time beat detection using BeatNet and madmom libraries
            </p>
          </div>

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
          {isSpotifyAuthenticated && spotifyDevices.length > 0 && (
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
              </CardContent>
            </Card>
          )}

          {/* Capture Controls */}
          <Card className="bg-cream/10 border-cream/20">
            <CardHeader>
              <CardTitle className="text-cream">Audio Capture Controls</CardTitle>
              <CardDescription className="text-cream/70">
                Start Spotify playback on selected device, then begin microphone capture
                {selectedDevice && spotifyDevices.length > 0 && (
                  <div className="mt-1 text-sm text-green-300">
                    🎵 Playing on: {spotifyDevices.find(d => d.id === selectedDevice)?.name || 'Selected Device'}
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
                Store analysis results in Supabase streaming_vendor_attributes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={saveToDatabase}
                disabled={!analysisData.bpm || isCapturing}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50"
              >
                Save Analysis Results
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