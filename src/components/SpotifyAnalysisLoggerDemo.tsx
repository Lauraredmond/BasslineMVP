// Demo component showing how to integrate Spotify Analysis Logger
// This demonstrates how to start logging, store analysis data, and log during playback

import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { spotifyAnalysisLogger, SpotifyAnalysisData } from '../lib/spotify-analysis-logger';
import { Play, Square, FlaskConical, Database } from 'lucide-react';

export const SpotifyAnalysisLoggerDemo: React.FC = () => {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLogging, setIsLogging] = useState(false);
  const [fitnessPhase, setFitnessPhase] = useState('warmup');
  const [workoutIntensity, setWorkoutIntensity] = useState(5);
  const [notes, setNotes] = useState('');
  const [currentPosition, setCurrentPosition] = useState(0);
  
  // Demo track data (you would get this from Spotify API)
  const demoTrack = {
    id: 'demo_track_123',
    name: 'Demo Song for Analysis',
    artist: 'Test Artist'
  };

  // Mock Spotify analysis data (you would get this from Spotify's audio analysis API)
  const mockAnalysisData: SpotifyAnalysisData = {
    meta: {
      analyzer_version: "4.0.0",
      platform: "Linux",
      detailed_status: "OK",
      status_code: 0,
      timestamp: Date.now() / 1000,
      analysis_time: 6.93906,
      input_process: "libvorbisfile L+R 44100->22050"
    },
    track: {
      duration: 207.95918,
      num_samples: 4601544,
      loudness: -5.883,
      tempo: 118.211,
      tempo_confidence: 0.73,
      time_signature: 4,
      time_signature_confidence: 0.994,
      key: 9,
      key_confidence: 0.408,
      mode: 1,
      mode_confidence: 0.485
    },
    bars: [
      { start: 0.49567, duration: 2.02993, confidence: 0.398 },
      { start: 2.52560, duration: 2.02993, confidence: 0.717 },
      // ... more bars would be here
    ],
    beats: [
      { start: 0.49567, duration: 0.50748, confidence: 0.398 },
      { start: 1.00315, duration: 0.50748, confidence: 0.645 },
      // ... more beats would be here
    ],
    tatums: [
      { start: 0.49567, duration: 0.25374, confidence: 0.398 },
      { start: 0.74941, duration: 0.25374, confidence: 0.330 },
      // ... more tatums would be here
    ],
    sections: [
      {
        start: 0.0,
        duration: 25.43424,
        confidence: 1.0,
        loudness: -9.525,
        tempo: 118.211,
        tempo_confidence: 0.73,
        key: 9,
        key_confidence: 0.408,
        mode: 1,
        mode_confidence: 0.485,
        time_signature: 4,
        time_signature_confidence: 0.994
      },
      // ... more sections would be here
    ],
    segments: [
      {
        start: 0.0,
        duration: 0.49567,
        confidence: 0.0,
        loudness_start: -60.0,
        loudness_max: -35.146,
        loudness_max_time: 0.24784,
        loudness_end: -43.052,
        pitches: [0.647, 0.269, 0.061, 0.015, 0.016, 0.021, 0.01, 0.003, 0.004, 0.004, 0.009, 0.015],
        timbre: [42.115, 17.846, -6.434, 16.925, -11.269, -0.745, -2.845, -0.645, 0.768, 0.485, -0.201, 0.059]
      },
      // ... more segments would be here
    ]
  };

  const handleStartSession = async () => {
    try {
      const newSessionId = await spotifyAnalysisLogger.startLoggingSession(
        `Demo Session ${new Date().toLocaleTimeString()}`,
        'demo'
      );
      setSessionId(newSessionId);
      
      // Store the mock analysis data
      await spotifyAnalysisLogger.storeTrackAnalysis(
        demoTrack.id,
        demoTrack.name,
        demoTrack.artist,
        mockAnalysisData
      );
    } catch (error) {
      console.error('Error starting session:', error);
    }
  };

  const handleStartLogging = () => {
    if (!sessionId) return;
    
    setIsLogging(true);
    spotifyAnalysisLogger.startTrackLogging({
      trackId: demoTrack.id,
      trackName: demoTrack.name,
      artistName: demoTrack.artist,
      positionMs: currentPosition,
      fitnessPhase,
      workoutIntensity,
      userNotes: notes
    });
  };

  const handleStopLogging = () => {
    setIsLogging(false);
    spotifyAnalysisLogger.stopLogging();
  };

  const handleEndSession = async () => {
    await spotifyAnalysisLogger.endSession();
    setSessionId(null);
    setIsLogging(false);
    setCurrentPosition(0);
  };

  // Simulate playback position advancing
  useEffect(() => {
    if (isLogging) {
      const interval = setInterval(() => {
        setCurrentPosition(prev => prev + 1000); // Advance 1 second
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isLogging]);

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="bg-card-texture border-cream/20">
      <CardHeader>
        <div className="flex items-center gap-3">
          <FlaskConical className="w-6 h-6 text-burgundy" />
          <div>
            <CardTitle className="text-burgundy">Spotify Analysis Logger Demo</CardTitle>
            <CardDescription>Test the audio analysis logging system</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Session Management */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-burgundy">Session Management</h3>
          <div className="flex items-center gap-4">
            {!sessionId ? (
              <Button
                onClick={handleStartSession}
                className="bg-energy-gradient text-cream font-semibold hover:opacity-90"
              >
                <Database className="w-4 h-4 mr-2" />
                Start New Session
              </Button>
            ) : (
              <div className="flex items-center gap-4">
                <Badge variant="secondary" className="bg-burgundy text-cream">
                  Session Active: {sessionId.slice(0, 8)}...
                </Badge>
                <Button
                  onClick={handleEndSession}
                  variant="outline"
                  className="text-burgundy border-burgundy hover:bg-burgundy hover:text-cream"
                >
                  End Session
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Demo Track Playback */}
        {sessionId && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-burgundy">Demo Track Playback</h3>
            <div className="p-4 bg-cream/10 rounded-lg">
              <p className="font-medium text-burgundy">{demoTrack.name}</p>
              <p className="text-sm text-muted-foreground">{demoTrack.artist}</p>
              <p className="text-sm text-muted-foreground">Position: {formatTime(currentPosition)}</p>
            </div>
            
            <div className="flex items-center gap-4">
              {!isLogging ? (
                <Button
                  onClick={handleStartLogging}
                  className="bg-energy-gradient text-cream font-semibold hover:opacity-90"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Start Logging
                </Button>
              ) : (
                <Button
                  onClick={handleStopLogging}
                  variant="outline"
                  className="text-burgundy border-burgundy hover:bg-burgundy hover:text-cream"
                >
                  <Square className="w-4 h-4 mr-2" />
                  Stop Logging
                </Button>
              )}
              
              {isLogging && (
                <Badge variant="secondary" className="bg-green-100 text-green-800 animate-pulse">
                  Recording Analysis Data...
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Fitness Context */}
        {sessionId && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-burgundy">Fitness Context</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phase" className="text-burgundy">Fitness Phase</Label>
                <select
                  id="phase"
                  value={fitnessPhase}
                  onChange={(e) => setFitnessPhase(e.target.value)}
                  className="w-full p-2 rounded-md border border-cream/30 bg-card-texture text-burgundy"
                >
                  <option value="warmup">Warm Up</option>
                  <option value="cardio">Cardio</option>
                  <option value="strength">Strength</option>
                  <option value="hiit">HIIT</option>
                  <option value="cooldown">Cool Down</option>
                </select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="intensity" className="text-burgundy">Workout Intensity (1-10)</Label>
                <Input
                  id="intensity"
                  type="number"
                  min="1"
                  max="10"
                  value={workoutIntensity}
                  onChange={(e) => setWorkoutIntensity(parseInt(e.target.value))}
                  className="bg-card-texture text-burgundy border-cream/30"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="notes" className="text-burgundy">Research Notes</Label>
              <Input
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notes about this song's effect on your workout..."
                className="bg-card-texture text-burgundy border-cream/30"
              />
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="p-4 bg-burgundy/10 rounded-lg">
          <h4 className="font-semibold text-burgundy mb-2">How to Use</h4>
          <ol className="text-sm text-muted-foreground space-y-1">
            <li>1. Start a new logging session</li>
            <li>2. Set your fitness context (phase, intensity, notes)</li>
            <li>3. Start logging to record analysis data every second</li>
            <li>4. View the collected data in the Research Lab above</li>
            <li>5. Export data as CSV for external analysis</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
};