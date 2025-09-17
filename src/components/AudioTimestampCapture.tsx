import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LocalTimestampStorage } from '@/lib/local-timestamp-storage';
import { SpotifyBPMFetcher } from '@/lib/spotify-bpm-fetcher';
import { spotifyService } from '@/lib/spotify';

interface TimestampEvent {
  id: string;
  timestamp: number;
  eventType: 'section_change' | 'bar_start' | 'rhythm_taps' | 'loudness' | 'custom';
  sectionType?: string;
  sectionNumber?: number;
  energyLevel?: number;
  intensityLevel?: number;
  notes?: string;
  barStartTimestamp?: number;
  rhythmTaps?: number[];
  loudnessTimestamp?: number;
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
  currentPhase?: {
    track_name: string;
    artist_name: string;
    track_id?: string;
  } | null;
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
  const [trackName, setTrackName] = useState('');
  const [artistName, setArtistName] = useState('');
  const [fetchedBPM, setFetchedBPM] = useState<number | null>(null);
  const [isLoadingBPM, setIsLoadingBPM] = useState(false);
  const [isRegisteringSpotify, setIsRegisteringSpotify] = useState(false);
  
  // Event capture state
  const [sectionType, setSectionType] = useState('');
  const [sectionNumber, setSectionNumber] = useState(1);
  const [energyLevel, setEnergyLevel] = useState(50);
  const [intensityLevel, setIntensityLevel] = useState(50);
  const [notes, setNotes] = useState('');
  
  // New event capture state
  const [rhythmTaps, setRhythmTaps] = useState<number[]>([]);
  const [isCapturingRhythm, setIsCapturingRhythm] = useState(false);
  
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

  // Update track and artist names when Spotify data is available
  useEffect(() => {
    if (trackInfo?.name) {
      setTrackName(trackInfo.name);
    }
    if (trackInfo?.artist) {
      setArtistName(trackInfo.artist);
    }
  }, [trackInfo]);

  // Register new song from current Spotify playback - using the same method as music-sync polling
  const registerNewSong = async () => {
    console.log('🎵 [REGISTER] Starting register new song process...');
    
    if (!spotifyService.isAuthenticated()) {
      setError('Please connect to Spotify first from the Music Sync page');
      console.log('🎵 [REGISTER] Not authenticated');
      return;
    }

    setIsRegisteringSpotify(true);
    setError(null);

    try {
      // Use the exact same method as music-sync polling: getCurrentPlayback()
      console.log('🎵 [REGISTER] Fetching current playback state (same as music-sync)...');
      const playbackState = await spotifyService.getCurrentPlayback();
      
      console.log('🎵 [REGISTER] Playback state:', {
        hasState: !!playbackState,
        hasItem: !!playbackState?.item,
        isPlaying: playbackState?.is_playing,
        trackName: playbackState?.item?.name,
        artist: playbackState?.item?.artists?.[0]?.name
      });
      
      if (!playbackState?.item) {
        const errorMsg = 'No song found in Spotify. Please make sure Spotify is open and has a song selected (playing or paused).';
        setError(errorMsg);
        console.log('🎵 [REGISTER] No current track found');
        return;
      }

      const trackName = playbackState.item.name;
      const artistName = playbackState.item.artists?.[0]?.name || '';

      console.log('🎵 [REGISTER] Found track:', trackName, 'by', artistName);

      // Update track info
      setTrackName(trackName);
      setArtistName(artistName);

      console.log('🎵 Registered new song from Spotify:', trackName, 'by', artistName);
      
      // Try to fetch BPM automatically
      if (trackName && artistName) {
        try {
          console.log('🎵 [REGISTER] Fetching BPM...');
          const bpmData = await SpotifyBPMFetcher.fetchBPMForTrack(trackName, artistName);
          if (bpmData.found) {
            setFetchedBPM(bpmData.spotify_tempo);
            console.log('✅ Also fetched BPM:', bpmData.spotify_tempo);
          }
        } catch (bmpError) {
          console.warn('Failed to fetch BPM:', bmpError);
        }
      }

    } catch (error) {
      console.error('🎵 [REGISTER] Failed to register new song:', error);
      setError(`Failed to get current song: ${error instanceof Error ? error.message : 'Unknown error'}. Make sure Spotify is connected and open.`);
    } finally {
      setIsRegisteringSpotify(false);
    }
  };

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

  // Capture timestamp event for sections
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
      eventType: 'section_change',
      sectionType: sectionType,
      sectionNumber: sectionNumber,
      energyLevel: energyLevel,
      intensityLevel: intensityLevel,
      notes: notes || undefined
    };
    
    // Update session
    const updatedSession = {
      ...currentSession,
      events: [...currentSession.events, newEvent]
    };
    setCurrentSession(updatedSession);
    
    // Auto-increment section number
    setSectionNumber(prev => prev + 1);
    
    // Clear notes
    setNotes('');
    
    console.log('⏰ Section timestamp captured:', {
      time: formatTime(timestamp),
      section: sectionType,
      data: newEvent
    });
  };

  // Capture bar start
  const captureBarStart = () => {
    if (!isRecording || !recordingStartTime || !currentSession) {
      setError('Recording must be active to capture timestamps');
      return;
    }
    
    const timestamp = Date.now() - recordingStartTime;
    const eventId = crypto.randomUUID();
    
    const newEvent: TimestampEvent = {
      id: eventId,
      timestamp,
      eventType: 'bar_start',
      barStartTimestamp: timestamp,
      notes: notes || undefined
    };
    
    // Update session
    const updatedSession = {
      ...currentSession,
      events: [...currentSession.events, newEvent]
    };
    setCurrentSession(updatedSession);
    
    // Clear notes
    setNotes('');
    
    console.log('🎵 Bar start captured:', {
      time: formatTime(timestamp),
      data: newEvent
    });
  };

  // Capture rhythm tap
  const captureRhythmTap = () => {
    if (!isRecording || !recordingStartTime) {
      setError('Recording must be active to capture rhythm taps');
      return;
    }
    
    if (rhythmTaps.length >= 8) {
      setError('Maximum 8 rhythm taps allowed');
      return;
    }
    
    const timestamp = Date.now() - recordingStartTime;
    const newTaps = [...rhythmTaps, timestamp];
    setRhythmTaps(newTaps);
    
    console.log('🥁 Rhythm tap captured:', {
      tapNumber: newTaps.length,
      time: formatTime(timestamp),
      allTaps: newTaps.map(t => formatTime(t))
    });
    
    // If we have 8 taps, automatically create the event
    if (newTaps.length === 8) {
      finishRhythmCapture(newTaps);
    }
  };

  // Finish rhythm capture and create event
  const finishRhythmCapture = (taps: number[]) => {
    if (!currentSession) return;
    
    const eventId = crypto.randomUUID();
    const avgTimestamp = taps.reduce((sum, tap) => sum + tap, 0) / taps.length;
    
    const newEvent: TimestampEvent = {
      id: eventId,
      timestamp: avgTimestamp,
      eventType: 'rhythm_taps',
      rhythmTaps: taps,
      notes: notes || undefined
    };
    
    // Update session
    const updatedSession = {
      ...currentSession,
      events: [...currentSession.events, newEvent]
    };
    setCurrentSession(updatedSession);
    
    // Clear taps and notes
    setRhythmTaps([]);
    setNotes('');
    
    console.log('🎵 Rhythm sequence completed:', {
      taps: taps.length,
      sequence: taps.map(t => formatTime(t)),
      data: newEvent
    });
  };

  // Capture loudness change
  const captureLoudness = () => {
    if (!isRecording || !recordingStartTime || !currentSession) {
      setError('Recording must be active to capture timestamps');
      return;
    }
    
    const timestamp = Date.now() - recordingStartTime;
    const eventId = crypto.randomUUID();
    
    const newEvent: TimestampEvent = {
      id: eventId,
      timestamp,
      eventType: 'loudness',
      loudnessTimestamp: timestamp,
      notes: notes || undefined
    };
    
    // Update session
    const updatedSession = {
      ...currentSession,
      events: [...currentSession.events, newEvent]
    };
    setCurrentSession(updatedSession);
    
    // Clear notes
    setNotes('');
    
    console.log('🔊 Loudness change captured:', {
      time: formatTime(timestamp),
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
          bar_start_timestamp: event.barStartTimestamp,
          rhythm_taps: event.rhythmTaps,
          loudness_timestamp: event.loudnessTimestamp,
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
            {/* Track Information - Auto-populated from Spotify */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Track Information</h3>
                <Button
                  onClick={registerNewSong}
                  disabled={isRegisteringSpotify || isRecording}
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 text-white border-green-600 hover:border-green-700"
                >
                  {isRegisteringSpotify ? '🔄 Getting Song...' : '🎵 Register New Song'}
                </Button>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="trackName">Track Name</Label>
                  <div className="relative">
                    <Input
                      id="trackName"
                      value={trackName}
                      onChange={(e) => setTrackName(e.target.value)}
                      disabled={isRecording}
                      placeholder="Enter track name or use 'Register New Song'"
                      className={trackInfo?.name ? "bg-green-50 border-green-200" : ""}
                    />
                    {trackInfo?.name && (
                      <div className="absolute right-2 top-2 text-xs text-green-600">
                        🎵 From Spotify
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <Label htmlFor="artistName">Artist Name</Label>
                  <div className="relative">
                    <Input
                      id="artistName"
                      value={artistName}
                      onChange={(e) => setArtistName(e.target.value)}
                      disabled={isRecording}
                      placeholder="Enter artist name or use 'Register New Song'"
                      className={trackInfo?.artist ? "bg-green-50 border-green-200" : ""}
                    />
                    {trackInfo?.artist && (
                      <div className="absolute right-2 top-2 text-xs text-green-600">
                        🎵 From Spotify
                      </div>
                    )}
                  </div>
                </div>
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
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span className="font-mono text-lg font-bold">
                    {formatTime(currentTime)}
                  </span>
                </div>
              )}
            </div>

            {/* Timestamp Capture */}
            {isRecording && (
              <div className="space-y-6">
                <div className="space-y-4">
                  {/* Section Type Selection */}
                  <div>
                    <Label className="text-base font-semibold">Section Types</Label>
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      {['intro', 'verse', 'pre-chorus', 'chorus', 'bridge', 'breakdown', 'outro'].map((section) => (
                        <Button
                          key={section}
                          type="button"
                          variant={sectionType === section ? "default" : "outline"}
                          size="sm"
                          onClick={() => setSectionType(section)}
                          className={`text-sm ${sectionType === section ? 'bg-blue-500 text-white border-blue-500' : 'bg-white text-gray-800 border-gray-300 hover:bg-gray-50'}`}
                        >
                          {section === 'pre-chorus' ? 'Pre-Chorus' : section.charAt(0).toUpperCase() + section.slice(1)}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Section Details for Selected Section */}
                  {sectionType && (
                    <div className="grid grid-cols-2 gap-4 p-3 bg-blue-50 rounded-lg">
                      <div>
                        <Label>Section Number</Label>
                        <Input
                          type="number"
                          value={sectionNumber}
                          onChange={(e) => setSectionNumber(Number(e.target.value))}
                          min="1"
                          size={3}
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
                  )}

                  {/* All Capture Buttons */}
                  <div>
                    <Label className="text-base font-semibold">Capture Timestamps</Label>
                    <div className="grid grid-cols-2 gap-3 mt-2">
                      {/* Section Capture - only show if section selected */}
                      {sectionType && (
                        <Button 
                          onClick={() => captureTimestamp()}
                          className="bg-blue-500 hover:bg-blue-600 text-white"
                          size="lg"
                        >
                          🎵 Capture {sectionType.charAt(0).toUpperCase() + sectionType.slice(1)}
                        </Button>
                      )}

                      {/* Bar Start */}
                      <Button 
                        onClick={() => captureBarStart()}
                        className="bg-orange-500 hover:bg-orange-600 text-white"
                        size="lg"
                      >
                        🎵 Bar Start
                      </Button>

                      {/* Rhythm Tap */}
                      <Button 
                        onClick={() => captureRhythmTap()}
                        disabled={rhythmTaps.length >= 8}
                        className="bg-purple-500 hover:bg-purple-600 text-white"
                        size="lg"
                      >
                        🥁 Rhythm Tap ({rhythmTaps.length}/8)
                      </Button>

                      {/* Loudness */}
                      <Button 
                        onClick={() => captureLoudness()}
                        className="bg-red-500 hover:bg-red-600 text-white"
                        size="lg"
                      >
                        🔊 Loudness
                      </Button>
                    </div>
                  </div>

                  {/* Rhythm Tap Controls */}
                  {rhythmTaps.length > 0 && (
                    <div className="p-3 bg-purple-50 rounded-lg space-y-3">
                      <div className="flex gap-2 justify-center">
                        {rhythmTaps.length > 0 && rhythmTaps.length < 8 && (
                          <Button 
                            onClick={() => finishRhythmCapture(rhythmTaps)}
                            className="bg-green-500 hover:bg-green-600 text-white"
                            size="sm"
                          >
                            ✅ Finish Rhythm ({rhythmTaps.length} taps)
                          </Button>
                        )}
                        
                        <Button 
                          onClick={() => setRhythmTaps([])}
                          variant="outline"
                          size="sm"
                        >
                          🔄 Clear Taps
                        </Button>
                      </div>
                      
                      <div className="bg-white p-2 rounded">
                        <p className="text-sm font-medium mb-1">Captured rhythm taps:</p>
                        <div className="text-xs text-gray-600 space-y-1">
                          {rhythmTaps.map((tap, index) => (
                            <span key={index} className="inline-block mr-3">
                              {index + 1}: {formatTime(tap)}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  <div>
                    <Label>Notes (Optional)</Label>
                    <Input
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Add notes about this timestamp..."
                    />
                  </div>
                </div>
              </div>
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