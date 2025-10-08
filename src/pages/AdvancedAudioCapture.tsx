import { BottomNavigation } from '@/components/BottomNavigation';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState, useEffect, useRef } from 'react';
import { Mic, Square, Play, Pause, RotateCcw, Activity, Music } from 'lucide-react';

const AdvancedAudioCapture = () => {
  const [isCapturing, setIsCapturing] = useState(false);
  const [analysisData, setAnalysisData] = useState<{
    bpm: number | null;
    beats: number[];
    downbeats: number[];
    confidence: number;
  }>({
    bpm: null,
    beats: [],
    downbeats: [],
    confidence: 0
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

  // Initialize session
  useEffect(() => {
    setSessionId(`session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  }, []);

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
    
    // Simulate real-time analysis updates
    const interval = setInterval(() => {
      if (isCapturing) {
        setAnalysisData(prev => ({
          bpm: 128 + Math.random() * 20, // Simulated BPM detection
          beats: [...prev.beats, currentTime],
          downbeats: Math.random() > 0.75 ? [...prev.downbeats, currentTime] : prev.downbeats,
          confidence: 0.7 + Math.random() * 0.3
        }));
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
            </CardContent>
          </Card>

          {/* Capture Controls */}
          <Card className="bg-cream/10 border-cream/20">
            <CardHeader>
              <CardTitle className="text-cream">Audio Capture Controls</CardTitle>
              <CardDescription className="text-cream/70">
                Start iPhone playback, then begin capture
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
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
                    {(analysisData.confidence * 100).toFixed(0)}%
                  </div>
                  <div className="text-sm text-cream/70">Confidence</div>
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
              <p><strong>Python Libraries Needed:</strong></p>
              <ul className="list-disc pl-6 space-y-1">
                <li><code>pip install beatnet</code> - Real-time beat tracking</li>
                <li><code>pip install madmom</code> - Audio analysis algorithms</li>
                <li><code>pip install sounddevice librosa</code> - Audio capture</li>
                <li><code>pip install supabase</code> - Database integration</li>
              </ul>
              <p className="mt-4"><strong>Setup:</strong> Position iPhone and Mac side-by-side for optimal audio capture quality.</p>
            </CardContent>
          </Card>

        </div>
      </div>

      <BottomNavigation />
    </div>
  );
};

export default AdvancedAudioCapture;