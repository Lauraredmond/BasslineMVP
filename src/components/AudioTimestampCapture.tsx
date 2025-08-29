import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LocalTimestampStorage } from '@/lib/local-timestamp-storage';
import { SpotifyBPMFetcher } from '@/lib/spotify-bpm-fetcher';

interface TimestampEvent {
  id: string;
  timestamp: number;
  eventType: 'section_change' | 'custom';
  sectionType?: string;
  sectionNumber?: number;
  energyLevel?: number;
  intensityLevel?: number;
  notes?: string;
}

interface CaptureSession {
  id: string;
  trackName: string;
  artistName: string;
  startTime: number;
  events: TimestampEvent[];
  audioBlob?: Blob;
}

interface AudioTimestampCaptureProps {
  spotifyTempo?: number;
  trackInfo?: {
    name: string;
    artist: string;
  };
}

export const AudioTimestampCapture: React.FC<AudioTimestampCaptureProps> = ({ spotifyTempo, trackInfo }) => {
  // Audio recording state
  const [isRecording, setIsRecording] = useState(false);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordingStartTime, setRecordingStartTime] = useState<number | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  
  // Session state
  const [currentSession, setCurrentSession] = useState<CaptureSession | null>(null);
  const [trackName, setTrackName] = useState(trackInfo?.name || 'The Pretender');
  const [artistName, setArtistName] = useState(trackInfo?.artist || 'Foo Fighters');
  const [fetchedBPM, setFetchedBPM] = useState<number | null>(null);
  const [isLoadingBPM, setIsLoadingBPM] = useState(false);
  
  // Event capture state - Focus only on section changes (bar changes are too granular for manual capture)
  const [eventType, setEventType] = useState<'section_change' | 'custom'>('section_change');
  const [sectionType, setSectionType] = useState('');
  const [sectionNumber, setSectionNumber] = useState(1);
  const [energyLevel, setEnergyLevel] = useState(50);
  const [intensityLevel, setIntensityLevel] = useState(50);
  const [notes, setNotes] = useState('');
  
  // UI state
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [localSessions, setLocalSessions] = useState<any[]>([]);
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Load local sessions on component mount
  useEffect(() => {
    setLocalSessions(LocalTimestampStorage.getAllSessions());
  }, []);

  // Export functions
  const exportAsJSON = () => {
    const data = LocalTimestampStorage.exportToJSON();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bassline-timestamps-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportAsCSV = () => {
    const data = LocalTimestampStorage.exportToCSV();
    const blob = new Blob([data], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bassline-timestamps-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Timer update effect
  useEffect(() => {
    if (isRecording && recordingStartTime) {
      timerRef.current = setInterval(() => {
        setCurrentTime(Date.now() - recordingStartTime);
      }, 100);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRecording, recordingStartTime]);

  // Start recording
  const startRecording = async () => {
    try {
      setError(null);
      
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        }
      });
      
      setAudioStream(stream);
      
      // Create media recorder
      const recorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      const audioChunks: Blob[] = [];
      
      recorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };
      
      recorder.onstop = () => {
        const blob = new Blob(audioChunks, { type: 'audio/webm;codecs=opus' });
        setAudioBlob(blob);
        
        // Create audio URL for playback
        const audioUrl = URL.createObjectURL(blob);
        if (audioRef.current) {
          audioRef.current.src = audioUrl;
        }
      };
      
      setMediaRecorder(recorder);
      
      // Start recording
      recorder.start(1000); // Collect data every second
      setIsRecording(true);
      const startTime = Date.now();
      setRecordingStartTime(startTime);
      
      // Create new session
      const sessionId = crypto.randomUUID();
      setCurrentSession({
        id: sessionId,
        trackName,
        artistName,
        startTime,
        events: []
      });
      
      console.log('🎤 Recording started for:', trackName, 'by', artistName);
      
    } catch (err) {
      setError(`Failed to start recording: ${err instanceof Error ? err.message : 'Unknown error'}`);
      console.error('Recording error:', err);
    }
  };

  // Stop recording
  const stopRecording = () => {
    console.log('🛑 Stopping recording...');
    
    try {
      if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
        console.log('📹 MediaRecorder stopped');
      }
      
      if (audioStream) {
        audioStream.getTracks().forEach(track => {
          track.stop();
          console.log('🎤 Audio track stopped');
        });
        setAudioStream(null);
      }
      
      setIsRecording(false);
      setRecordingStartTime(null);
      setCurrentTime(0);
      
      console.log('✅ Recording stopped successfully');
    } catch (error) {
      console.error('❌ Error stopping recording:', error);
      // Force stop the recording state even if there's an error
      setIsRecording(false);
      setRecordingStartTime(null);
      setCurrentTime(0);
      setError('Recording stopped with minor errors');
    }
  };

  // Capture timestamp event
  const captureTimestamp = () => {
    if (!isRecording || !recordingStartTime || !currentSession) {
      setError('Recording must be active to capture timestamps');
      return;
    }
    
    const timestamp = Date.now() - recordingStartTime;
    const eventId = crypto.randomUUID();
    
    const newEvent: TimestampEvent = {
      id: eventId,
      timestamp,
      eventType,
      notes: notes || undefined
    };
    
    // Add type-specific data
    if (eventType === 'section_change') {
      newEvent.sectionType = sectionType;
      newEvent.sectionNumber = sectionNumber;
      newEvent.energyLevel = energyLevel;
      newEvent.intensityLevel = intensityLevel;
    }
    
    // Update session
    const updatedSession = {
      ...currentSession,
      events: [...currentSession.events, newEvent]
    };
    setCurrentSession(updatedSession);
    
    // Auto-increment counters
    if (eventType === 'section_change' && sectionType) {
      // Keep same section type, increment number
      setSectionNumber(prev => prev + 1);
    }
    
    // Clear notes
    setNotes('');
    
    console.log('⏰ Timestamp captured:', {
      time: formatTime(timestamp),
      type: eventType,
      data: newEvent
    });
  };

  // Save session (with fallback to local storage)
  const saveSession = async () => {
    if (!currentSession) {
      setError('No session to save');
      return;
    }
    
    try {
      console.log('💾 Attempting to save session...');
      
      // First, save locally as backup
      LocalTimestampStorage.saveSession(currentSession);
      console.log('✅ Session saved locally as backup');
      
      // Prepare data for database
      const sessionData = {
        trackName: currentSession.trackName,
        artistName: currentSession.artistName,
        sessionId: currentSession.id,
        spotifyTempo: fetchedBPM || spotifyTempo,
        events: currentSession.events.map(event => ({
          timestamp_ms: event.timestamp,
          event_type: event.eventType,
          section_type: event.sectionType,
          section_number: event.sectionNumber,
          energy_level: event.energyLevel,
          intensity_level: event.intensityLevel,
          notes: event.notes,
          captured_by: 'manual_audio_capture',
          capture_session_id: currentSession.id
        }))
      };
      
      // Try to save to database with multiple endpoint attempts
      const urls = [
        '/.netlify/functions/save-audio-timestamps',
        '/api/save-audio-timestamps', 
        '/netlify/functions/save-audio-timestamps'
      ];
      
      let response: Response | null = null;
      let lastError: string = '';
      
      for (const url of urls) {
        try {
          console.log('📡 Attempting database save to:', url);
          
          response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(sessionData)
          });
          
          if (response.ok || response.status !== 404) {
            break; // Found working endpoint or got real error (not 404)
          }
          
          console.log(`⚠️ Endpoint ${url} returned 404, trying next...`);
          
        } catch (error) {
          lastError = `${url}: ${error}`;
          console.log(`❌ Failed to reach ${url}:`, error);
          continue;
        }
      }
      
      if (response && response.ok) {
        const result = await response.json();
        console.log('✅ Session saved to database:', result);
        alert(`✅ Session saved to database! ${sessionData.events.length} timestamps recorded.`);
      } else if (response) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      } else {
        throw new Error(`All endpoints failed. Last error: ${lastError}`);
      }
      
    } catch (err) {
      console.warn('⚠️ Database save failed, but data is saved locally:', err);
      alert(`⚠️ Database save failed, but your ${currentSession.events.length} timestamps are saved locally!\n\nYou can export them using the "Export Data" button below.`);
    }
  };

  // Format time display
  const formatTime = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    const centiseconds = Math.floor((ms % 1000) / 10);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🎤 Audio Timestamp Capture Tool
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Track Information */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="trackName">Track Name</Label>
                <Input
                  id="trackName"
                  value={trackName}
                  onChange={(e) => setTrackName(e.target.value)}
                  disabled={isRecording}
                />
              </div>
              <div>
                <Label htmlFor="artistName">Artist Name</Label>
                <Input
                  id="artistName"
                  value={artistName}
                  onChange={(e) => setArtistName(e.target.value)}
                  disabled={isRecording}
                />
              </div>
            </div>

            {/* BPM Fetch & Display */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-blue-800">🎵 <strong>Song BPM:</strong></span>
                  {(fetchedBPM || spotifyTempo) ? (
                    <span className="text-sm font-bold text-blue-900">
                      {Math.round(fetchedBPM || spotifyTempo)} BPM 
                      <span className="ml-2 text-xs">
                        → {SpotifyBPMFetcher.getWorkoutTrackFromBPM(fetchedBPM || spotifyTempo).replace('_', ' ')}
                      </span>
                    </span>
                  ) : (
                    <span className="text-sm text-blue-600">Not detected</span>
                  )}
                </div>
                
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    if (!trackName || !artistName) return;
                    setIsLoadingBPM(true);
                    try {
                      const bpmData = await SpotifyBPMFetcher.fetchBPMForTrack(trackName, artistName);
                      if (bpmData.found) {
                        setFetchedBPM(bpmData.spotify_tempo);
                      }
                    } catch (error) {
                      console.error('Failed to fetch BPM:', error);
                    }
                    setIsLoadingBPM(false);
                  }}
                  disabled={isLoadingBPM || !trackName || !artistName}
                >
                  {isLoadingBPM ? '⏳' : '🔍'} Fetch BPM
                </Button>
              </div>
            </div>

            {/* Recording Controls */}
            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex gap-2">
                <Button 
                  onClick={startRecording} 
                  disabled={isRecording}
                  className="bg-red-500 hover:bg-red-600"
                >
                  🎤 Start Recording
                </Button>
                <Button 
                  onClick={stopRecording} 
                  disabled={!isRecording}
                  variant="outline"
                >
                  ⏹️ Stop Recording
                </Button>
              </div>
              
              {isRecording && (
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                  <span className="font-mono text-lg font-bold">
                    {formatTime(currentTime)}
                  </span>
                </div>
              )}
            </div>

            {/* Timestamp Capture */}
            {isRecording && (
              <Tabs value={eventType} onValueChange={(value) => setEventType(value as any)}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="section_change">Section Change</TabsTrigger>
                  <TabsTrigger value="custom">Custom Event</TabsTrigger>
                </TabsList>

                <TabsContent value="section_change" className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label>Section Type</Label>
                      <Select value={sectionType} onValueChange={setSectionType}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select section" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="intro">Intro</SelectItem>
                          <SelectItem value="verse">Verse</SelectItem>
                          <SelectItem value="pre-chorus">Pre-Chorus</SelectItem>
                          <SelectItem value="chorus">Chorus</SelectItem>
                          <SelectItem value="bridge">Bridge</SelectItem>
                          <SelectItem value="breakdown">Breakdown</SelectItem>
                          <SelectItem value="outro">Outro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Section Number</Label>
                      <Input
                        type="number"
                        value={sectionNumber}
                        onChange={(e) => setSectionNumber(Number(e.target.value))}
                        min="1"
                      />
                    </div>
                    <div>
                      <Label>Energy Level (0-100)</Label>
                      <Input
                        type="range"
                        min="0"
                        max="100"
                        value={energyLevel}
                        onChange={(e) => setEnergyLevel(Number(e.target.value))}
                        className="slider"
                      />
                      <span className="text-sm text-gray-600">{energyLevel}</span>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="custom" className="space-y-4">
                  <div>
                    <Label>Custom Event Notes</Label>
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Describe this timestamp event..."
                    />
                  </div>
                </TabsContent>

                <div className="space-y-4">
                  <div>
                    <Label>Notes (Optional)</Label>
                    <Input
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Add notes about this timestamp..."
                    />
                  </div>
                  
                  <Button 
                    onClick={captureTimestamp}
                    className="w-full bg-blue-500 hover:bg-blue-600"
                    size="lg"
                  >
                    ⏰ Capture Timestamp ({formatTime(currentTime)})
                  </Button>
                </div>
              </Tabs>
            )}

            {/* Session Summary */}
            {currentSession && (
              <Card>
                <CardHeader>
                  <CardTitle>Current Session</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p><strong>Track:</strong> {currentSession.trackName} by {currentSession.artistName}</p>
                    <p><strong>Events Captured:</strong> {currentSession.events.length}</p>
                    
                    {currentSession.events.length > 0 && (
                      <div className="space-y-1">
                        <p><strong>Recent Events:</strong></p>
                        <div className="max-h-32 overflow-y-auto text-sm space-y-1">
                          {currentSession.events.slice(-5).map((event) => (
                            <div key={event.id} className="flex justify-between p-2 bg-gray-50 rounded">
                              <span>{formatTime(event.timestamp)}</span>
                              <span>{event.eventType}</span>
                              <span>{event.sectionType || event.barNumber || 'Custom'}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <Button 
                      onClick={saveSession}
                      disabled={currentSession.events.length === 0}
                      className="w-full"
                    >
                      💾 Save Session to Database
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Audio Playback */}
            {audioBlob && (
              <Card>
                <CardHeader>
                  <CardTitle>Recorded Audio</CardTitle>
                </CardHeader>
                <CardContent>
                  <audio ref={audioRef} controls className="w-full">
                    Your browser does not support the audio element.
                  </audio>
                </CardContent>
              </Card>
            )}

            {/* Local Storage Management */}
            {localSessions.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Saved Sessions ({localSessions.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="text-sm text-gray-600">
                      You have {LocalTimestampStorage.getStorageInfo().totalEvents} timestamps saved locally.
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <Button onClick={exportAsJSON} variant="outline">
                        📥 Export JSON
                      </Button>
                      <Button onClick={exportAsCSV} variant="outline">
                        📊 Export CSV
                      </Button>
                    </div>
                    
                    <div className="space-y-2">
                      {localSessions.slice(-3).map((session) => (
                        <div key={session.id} className="p-2 bg-gray-50 rounded text-sm">
                          <strong>{session.trackName}</strong> by {session.artistName}
                          <br />
                          {session.events.length} timestamps • {new Date(session.createdAt).toLocaleString()}
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Error Display */}
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};