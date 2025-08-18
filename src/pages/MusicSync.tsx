import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useLocation, useNavigate } from "react-router-dom";
import { BottomNavigation } from "@/components/BottomNavigation";
import { Header } from "@/components/Header";
import { spotifyService, SpotifyPlaylist, SpotifyTrack, SpotifyDevice, SpotifyPlaybackState, formatTrackUri } from "@/lib/spotify";
import { musicAnalysisEngine, WorkoutPlan, TrackPhaseMapping } from "@/lib/musicAnalysis";
import { narrativeEngine } from "@/lib/narrative-engine";
import { dbAdmin } from "@/lib/database-admin";
import { advancedMusicAnalysis } from "@/lib/advanced-music-analysis";
import { spotifyAnalysisLogger } from "@/lib/spotify-analysis-logger";
import heroMusicEmpowerment from "../assets/hero-music-empowerment.jpg";

const MusicSync = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [selectedService, setSelectedService] = useState<string>("");
  const [selectedPlaylist, setSelectedPlaylist] = useState<string>("");
  const [isWorkoutActive, setIsWorkoutActive] = useState<boolean>(false);
  const [currentPhase, setCurrentPhase] = useState<number>(0);
  const [currentNarrative, setCurrentNarrative] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [phaseProgress, setPhaseProgress] = useState<number>(0);
  const [showWorkoutCompleteModal, setShowWorkoutCompleteModal] = useState<boolean>(false);
  const [workoutShareData, setWorkoutShareData] = useState({
    comment: "",
    shareWith: "friends" // "friends", "community", or "trainer"
  });
  const [spotifyPlaylists, setSpotifyPlaylists] = useState<SpotifyPlaylist[]>([]);
  const [isLoadingPlaylists, setIsLoadingPlaylists] = useState(false);
  const [isSpotifyAuthenticated, setIsSpotifyAuthenticated] = useState(false);
  const [workoutPlan, setWorkoutPlan] = useState<WorkoutPlan | null>(null);
  const [isAnalyzingPlaylist, setIsAnalyzingPlaylist] = useState(false);
  const [currentTrackPhase, setCurrentTrackPhase] = useState<TrackPhaseMapping | null>(null);
  const [spotifyDevices, setSpotifyDevices] = useState<SpotifyDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [playbackState, setPlaybackState] = useState<SpotifyPlaybackState | null>(null);
  const [showDeviceSelector, setShowDeviceSelector] = useState(false);
  
  // Database-driven narratives
  const [databaseNarratives, setDatabaseNarratives] = useState<any[]>([]);
  const [currentDatabaseNarrative, setCurrentDatabaseNarrative] = useState<string | null>(null);
  const [narrativeEngineReady, setNarrativeEngineReady] = useState(false);
  
  // Advanced music analysis cache
  const [trackAnalysisCache, setTrackAnalysisCache] = useState<Map<string, any>>(new Map());
  
  // Track timing state
  const [currentTrackId, setCurrentTrackId] = useState<string | null>(null);
  const [narrativeStates, setNarrativeStates] = useState<{[key: string]: boolean}>({});
  
  // Persistent narrative display
  const [displayedNarrative, setDisplayedNarrative] = useState<{text: string, timestamp: number} | null>(null);
  
  // Workout start timestamp for fallback timing
  const [workoutStartTime, setWorkoutStartTime] = useState<number | null>(null);

  const handleBack = () => {
    navigate(-1);
  };
  
  const workoutData = location.state || {};
  
  // Default to Spinning if no format is available
  const workoutFormat = workoutData.format || 'Spinning';
  const workoutIntensity = workoutData.intensity;

  const streamingServices = [
    { id: 'spotify', name: 'Spotify', icon: '🎵', color: 'bg-green-500' },
    { id: 'apple', name: 'Apple Music', icon: '🍎', color: 'bg-red-500' },
    { id: 'youtube', name: 'YouTube Music', icon: '▶️', color: 'bg-red-600' }
  ];

  const getPlaylistsByService = (serviceId: string) => {
    if (serviceId === 'spotify' && spotifyPlaylists.length > 0) {
      return spotifyPlaylists.map(playlist => ({
        id: playlist.id,
        name: playlist.name,
        tracks: playlist.tracks.total,
        genre: playlist.description || 'Spotify Playlist'
      }));
    } else if (serviceId === 'spotify') {
      return [
        { id: 'login', name: '🎵 Connect your Spotify account to see playlists', tracks: 0, genre: 'Authentication Required' }
      ];
    }
    return [
      { id: '1', name: 'Beast Mode 💪', tracks: 45, genre: 'Hip-Hop/Electronic' },
      { id: '2', name: 'Cardio Blast', tracks: 32, genre: 'Pop/Dance' },
      { id: '3', name: 'Power Hour', tracks: 28, genre: 'Rock/Metal' },
      { id: '4', name: 'Zen Flow', tracks: 20, genre: 'Ambient/Electronic' }
    ];
  };

  const getCoachingNarratives = (phaseName: string) => {
    // Use intelligent narratives if workout plan is available
    if (workoutPlan && currentTrackPhase) {
      return currentTrackPhase.phase.narratives;
    }
    
    // FOR WARMUP: Use database narratives ONLY
    if (phaseName === 'Warm Up' && databaseNarratives.length > 0) {
      return databaseNarratives.map(n => n.text);
    }
    
    // Fallback to static narratives for NON-WARMUP phases only
    const narratives = {
      'Sprint': [
        "Push the pace — fast legs now, hold for 20 seconds!",
        "Start to build the legs, point the toes, tuck in, GO!",
        "Feel that power! Drive from your core!",
        "Ease off — slow the legs, control your breathing.",
        "One more burst! Everything you've got!"
      ],
      'Rolling Hills': [
        "Add resistance, stand up, climb that hill.",
        "Find your climbing rhythm, steady and strong.",
        "Use your whole body — engage those glutes!",
        "Breathe with the climb, you're in control.",
        "Feel the burn in your legs — that's strength building!"
      ],
      'Resistance Track': [
        "Keep it heavy, push through, power in the core.",
        "This is where champions are made — dig deep!",
        "Heavy resistance, but your legs are stronger.",
        "Focus on form — quality over speed right now.",
        "Feel that strength growing with every pedal stroke!"
      ],
      'Sprint Jumps': [
        "Alternate between seated and standing, explode on the beat!",
        "Quick transitions — seated, standing, feel the music!",
        "Jump on the beat drop — explosive power!",
        "Fast legs in the saddle, power standing!",
        "Final sprint — leave everything on this bike!"
      ],
      'Cool Down': [
        "Slow it down, easy spin, stretch the legs, breathe it out.",
        "Amazing work! Take a moment to appreciate what you just did.",
        "Gentle spinning now, let your heart rate come down.",
        "Stretch those legs, roll those shoulders back.",
        "You are stronger than you were 30 minutes ago!"
      ]
    };
    
    // If warmup but no database narratives, show fallback message
    if (phaseName === 'Warm Up') {
      return ["Loading warm-up instructions..."];
    }
    
    return narratives[phaseName] || ["Keep going, you're doing great!"];
  };

  const getNowPlayingSongs = () => {
    // Use actual track info if available from workout plan
    if (workoutPlan && currentTrackPhase) {
      const track = currentTrackPhase.track;
      return `${track.artists.map(a => a.name).join(', ')} – ${track.name}`;
    }
    
    // Fallback to static songs
    const songs = [
      "Kylie Minogue – My Oh My",
      "Sabrina Carpenter – Busy Woman", 
      "Spice Girls – Spice Up Your Life",
      "Sam Cooke – Twisting the Night Away",
      "Dua Lipa – Physical",
      "Whitney Houston – I Wanna Dance with Somebody"
    ];
    return songs[currentPhase] || songs[0];
  };

  const getWorkoutPhases = (format: string) => {
    // Use intelligent workout plan if available
    if (workoutPlan) {
      return workoutPlan.phases.map((phase, index) => ({
        name: phase.phase.name,
        duration: `${Math.round(phase.phase.duration / 60)} min`,
        tempo: phase.phase.targetTempo,
        energy: phase.phase.energyLevel,
        track: `${phase.track.artists.map(a => a.name).join(', ')} – ${phase.track.name}`
      }));
    }
    
    // Fallback to static phases
    if (format === 'Spinning') {
      return [
        { name: 'Warm Up', duration: '5 min' },
        { name: 'Sprint', duration: '3 min' },
        { name: 'Rolling Hills', duration: '8 min' },
        { name: 'Resistance Track', duration: '6 min' },
        { name: 'Sprint Jumps', duration: '4 min' },
        { name: 'Cool Down', duration: '5 min' }
      ];
    }
    return [
      { name: 'Warm-up', duration: '5 min' },
      { name: 'Main workout', duration: '25 min' },
      { name: 'Cool down', duration: '5 min' }
    ];
  };

  const workoutPhases = getWorkoutPhases(workoutFormat);

  const refreshSpotifyDevices = async () => {
    if (!isSpotifyAuthenticated) return [];
    
    try {
      const devices = await spotifyService.getAvailableDevices();
      setSpotifyDevices(devices);
      
      // Auto-select active device if available
      const activeDevice = devices.find(d => d.is_active);
      if (activeDevice && !selectedDevice) {
        setSelectedDevice(activeDevice.id);
      }
      
      return devices;
    } catch (error) {
      console.error('Error refreshing devices:', error);
      return [];
    }
  };

  // Initialize database narratives for warmup
  const initializeDatabaseNarratives = async () => {
    try {
      // Clear existing narratives and insert ONLY your 2 specific ones
      const result = await dbAdmin.insertWarmupNarratives();
      if (!result.success) {
        return false;
      }
      
      // Load narratives from database
      const narratives = await dbAdmin.getNarrativesForPhase('spinning', 'warmup');
      
      // Verify we have exactly 2 narratives
      if (narratives.length !== 2) {
        return false;
      }
      
      // Verify they are the correct narratives
      const expectedTexts = [
        "We're just warming up the legs here",
        "Chorus in 7 seconds"
      ];
      
      const actualTexts = narratives.map(n => n.text);
      const hasCorrectNarratives = expectedTexts.every(text => actualTexts.includes(text));
      
      if (!hasCorrectNarratives) {
        return false;
      }
      
      setDatabaseNarratives(narratives);
      return true;
      
    } catch (error) {
      return false;
    }
  };

  const handleStartWorkout = async () => {
    
    // Try to initialize database narratives, but don't block workout if it fails
    try {
      const allPhasesResult = await dbAdmin.insertNarrativesForAllPhases();
      if (allPhasesResult.success) {
        // Try to load warmup narratives specifically
        const narrativesReady = await initializeDatabaseNarratives();
        if (!narrativesReady) {
          console.warn('Database narratives failed to load, will use fallback narratives');
        }
      } else {
        console.warn('Database setup failed, will use fallback narratives');
      }
    } catch (error) {
      console.warn('Database initialization failed, proceeding with fallback narratives:', error);
    }

    if (!selectedPlaylist || selectedService !== 'spotify') {
      // Fallback to non-Spotify workout with database narratives
      
      // Auto-start analysis logging session
      await spotifyAnalysisLogger.startWorkoutSession(workoutFormat || 'general');
      
      setIsWorkoutActive(true);
      setCurrentPhase(0);
      setCurrentNarrative(0);
      setIsPlaying(true);
      setPhaseProgress(0);
      setNarrativeEngineReady(true);
      
      // Initialize narrative states for fallback timing
      setWorkoutStartTime(Date.now());
      setNarrativeStates({
        first_shown: false,
        second_shown: false
      });
      setDisplayedNarrative(null);
      
      return;
    }

    setIsAnalyzingPlaylist(true);
    try {
      // Refresh device list first
      const devices = await refreshSpotifyDevices();
      
      if (devices.length === 0) {
        setShowDeviceSelector(true);
        setIsAnalyzingPlaylist(false);
        return;
      }

      // Auto-select active device or first available
      const activeDevice = devices.find(d => d.is_active) || devices[0];
      const deviceToUse = selectedDevice ? devices.find(d => d.id === selectedDevice) || activeDevice : activeDevice;
      setSelectedDevice(deviceToUse.id);

      // Get playlist tracks with audio features
      const tracks = await spotifyService.getPlaylistTracks(selectedPlaylist);
      
      // Generate intelligent workout plan
      const plan = musicAnalysisEngine.generateWorkoutPlan(tracks, selectedPlaylist);
      setWorkoutPlan(plan);
      
      if (plan.phases.length > 0) {
        // Start playlist playback on Spotify
        const playbackStarted = await spotifyService.startPlaylistPlayback(selectedPlaylist, deviceToUse.id);
        
        if (playbackStarted) {
          // Auto-start analysis logging session
          await spotifyAnalysisLogger.startWorkoutSession(workoutFormat || 'spotify');
          
          setCurrentTrackPhase(plan.phases[0]);
          setIsWorkoutActive(true);
          setCurrentPhase(0);
          setCurrentNarrative(0);
          setIsPlaying(true);
          setPhaseProgress(0);
          setNarrativeEngineReady(true);
          
          // Initialize timing for database narratives
          setWorkoutStartTime(Date.now());
          setNarrativeStates({
            first_shown: false,
            second_shown: false
          });
          
          // Start monitoring playback state
          startPlaybackMonitoring();
        } else {
          alert('Could not start Spotify playback. Please make sure music is playing in Spotify and try again.');
        }
      }
    } catch (error) {
      console.error('Error starting workout:', error);
      alert('Error starting workout. Please check your Spotify connection.');
    } finally {
      setIsAnalyzingPlaylist(false);
    }
  };

  const handleSpotifyLogin = async () => {
    const authUrl = await spotifyService.getAuthUrl();
    window.location.href = authUrl;
  };

  const loadSpotifyPlaylists = async () => {
    if (!spotifyService.isAuthenticated()) return;
    
    setIsLoadingPlaylists(true);
    try {
      const playlists = await spotifyService.getUserPlaylists();
      setSpotifyPlaylists(playlists);
    } catch (error) {
      console.error('Failed to load playlists:', error);
    } finally {
      setIsLoadingPlaylists(false);
    }
  };

  // Check authentication status (callback is handled by SpotifyCallback.tsx)
  useEffect(() => {
    const checkAuth = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const spotifyConnected = urlParams.get('spotify_connected');
      const error = urlParams.get('error');
      
      if (error) {
        console.error('Spotify connection error:', error);
        // Could show an error message to user here
      }
      
      if (spotifyConnected === 'true' || spotifyService.isAuthenticated()) {
        setIsSpotifyAuthenticated(true);
        await loadSpotifyPlaylists();
        
        // Clean up URL parameters
        if (spotifyConnected || error) {
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      }
    };

    checkAuth();
  }, []);

  // Load playlists and devices when Spotify is selected and authenticated
  useEffect(() => {
    if (selectedService === 'spotify' && isSpotifyAuthenticated) {
      if (spotifyPlaylists.length === 0) {
        loadSpotifyPlaylists();
      }
      // Also refresh devices periodically
      refreshSpotifyDevices();
      
      const deviceRefreshInterval = setInterval(refreshSpotifyDevices, 10000); // Every 10 seconds
      return () => clearInterval(deviceRefreshInterval);
    }
  }, [selectedService, isSpotifyAuthenticated]);

  // Playback monitoring
  const playbackMonitoringRef = useRef<NodeJS.Timeout | null>(null);
  
  const startPlaybackMonitoring = () => {
    if (playbackMonitoringRef.current) {
      clearInterval(playbackMonitoringRef.current);
    }
    
    playbackMonitoringRef.current = setInterval(async () => {
      try {
        const state = await spotifyService.getCurrentPlayback();
        setPlaybackState(state);
        
        if (state) {
          setIsPlaying(state.is_playing);
          
          // Update playback position for logging
          if (state.progress_ms && spotifyAnalysisLogger.isCurrentlyLogging()) {
            spotifyAnalysisLogger.updatePlaybackPosition(state.progress_ms);
          }
          
          // Sync workout phases with track changes
          if (workoutPlan && state.item) {
            const currentTrackIndex = workoutPlan.phases.findIndex(
              phase => phase.track.id === state.item.id
            );
            if (currentTrackIndex >= 0 && currentTrackIndex !== currentPhase) {
              setCurrentPhase(currentTrackIndex);
            }
          }
        }
      } catch (error) {
        console.error('Error monitoring playback:', error);
      }
    }, 2000); // Check every 2 seconds
  };
  
  const stopPlaybackMonitoring = () => {
    if (playbackMonitoringRef.current) {
      clearInterval(playbackMonitoringRef.current);
      playbackMonitoringRef.current = null;
    }
  };
  
  // Cleanup on unmount
  useEffect(() => {
    return () => stopPlaybackMonitoring();
  }, []);

  // Spotify playback controls
  const handleSpotifyPlay = async () => {
    if (selectedDevice) {
      await spotifyService.startPlayback({ device_id: selectedDevice });
    }
  };
  
  const handleSpotifyPause = async () => {
    if (selectedDevice) {
      await spotifyService.pausePlayback(selectedDevice);
    }
  };
  
  const handleSpotifyNext = async () => {
    if (selectedDevice) {
      await spotifyService.skipToNext(selectedDevice);
    }
  };
  
  const handleSpotifyPrevious = async () => {
    if (selectedDevice) {
      await spotifyService.skipToPrevious(selectedDevice);
    }
  };

  // Intelligent beat-based narrative changes
  useEffect(() => {
    if (!isWorkoutActive || !isPlaying) return;

    let narrativeInterval: NodeJS.Timeout;
    let progressInterval: NodeJS.Timeout;

    if (workoutPlan && currentTrackPhase && playbackState) {
      // Intelligent timing based on track tempo and structure
      const track = currentTrackPhase.track;
      const tempo = track.audio_features?.tempo || 120;
      const beatsPerSecond = tempo / 60;
      
      // Change narrative every 8-16 beats (more musical timing)
      const narrativeBeatInterval = Math.random() > 0.5 ? 8 : 16;
      const narrativeTimeInterval = (narrativeBeatInterval / beatsPerSecond) * 1000;
      
      narrativeInterval = setInterval(() => {
        setCurrentNarrative(prev => {
          const maxNarratives = currentTrackPhase.phase.narratives.length;
          return (prev + 1) % maxNarratives;
        });
      }, Math.max(3000, Math.min(8000, narrativeTimeInterval))); // Clamp between 3-8 seconds

      // Progress based on actual track progress if available
      progressInterval = setInterval(() => {
        if (playbackState && playbackState.progress_ms && playbackState.item) {
          const trackProgress = playbackState.progress_ms / playbackState.item.duration_ms;
          const phaseProgress = trackProgress * 100;
          setPhaseProgress(phaseProgress);
        } else {
          setPhaseProgress(prev => Math.min(prev + 1.5, 100));
        }
      }, 1000);
    } else {
      // Fallback to time-based for non-Spotify
      narrativeInterval = setInterval(() => {
        setCurrentNarrative(prev => {
          const maxNarratives = getCoachingNarratives(workoutPhases[currentPhase]?.name).length;
          return (prev + 1) % maxNarratives;
        });
      }, 5000); // Slightly longer for fallback

      progressInterval = setInterval(() => {
        setPhaseProgress(prev => Math.min(prev + 2, 100));
      }, 1000);
    }

    return () => {
      clearInterval(narrativeInterval);
      clearInterval(progressInterval);
    };
  }, [isWorkoutActive, isPlaying, currentPhase, workoutPhases, workoutPlan, currentTrackPhase, playbackState]);


  // Reset narrative and progress when phase changes
  useEffect(() => {
    setCurrentNarrative(0);
    setPhaseProgress(0);
    
    // Reset narrative states when phase changes for fallback timing
    setNarrativeStates({
      first_shown: false,
      second_shown: false
    });
    setDisplayedNarrative(null);
    
    // Update current track phase when using intelligent workout plan
    if (workoutPlan && workoutPlan.phases[currentPhase]) {
      setCurrentTrackPhase(workoutPlan.phases[currentPhase]);
    }
  }, [currentPhase, workoutPlan]);

  const handleEndWorkout = async () => {
    // Pause Spotify playback
    if (selectedService === 'spotify' && selectedDevice) {
      await spotifyService.pausePlayback(selectedDevice);
    }
    stopPlaybackMonitoring();
    setShowWorkoutCompleteModal(true);
  };

  const getSelectedPlaylistName = () => {
    if (!selectedService || !selectedPlaylist) return "Unknown Playlist";
    const playlists = getPlaylistsByService(selectedService);
    const playlist = playlists.find(p => p.id === selectedPlaylist);
    return playlist?.name || "Unknown Playlist";
  };

  const handleShareWorkout = async () => {
    // Prepare complete workout data for sharing
    const completeWorkoutData = {
      soundtrack: getSelectedPlaylistName(),
      intensity: workoutIntensity || "Medium",
      exerciseFormat: workoutFormat,
      comment: workoutShareData.comment,
      shareWith: workoutShareData.shareWith,
      duration: `${workoutPhases.reduce((total, phase) => total + parseInt(phase.duration), 0)} min`,
      timestamp: new Date().toISOString()
    };
    
    
    // Auto-end analysis logging session
    await spotifyAnalysisLogger.endWorkoutSession();
    
    setShowWorkoutCompleteModal(false);
    setIsWorkoutActive(false);
    navigate('/community');
  };

  const handleCloseModal = async () => {
    // Auto-end analysis logging session
    await spotifyAnalysisLogger.endWorkoutSession();
    
    setShowWorkoutCompleteModal(false);
    setIsWorkoutActive(false);
    stopPlaybackMonitoring();
  };

  const getCurrentNarrative = () => {
    if (workoutPlan && currentTrackPhase) {
      const narratives = currentTrackPhase.phase.narratives;
      return narratives[currentNarrative] || narratives[0];
    }
    
    const phaseName = workoutPhases[currentPhase]?.name;
    const narratives = getCoachingNarratives(phaseName);
    return narratives[currentNarrative] || narratives[0];
  };
  
  // Get current database-driven narrative (works in ALL phases now)
  const getCurrentDatabaseNarrative = () => {
    
    // Show database narratives in ALL phases (not just warmup)
    if (databaseNarratives.length > 0) {
      
      // FALLBACK: If no Spotify playback, show narratives based on simple timing
      if (!playbackState || !playbackState.progress_ms || !playbackState.item) {
        
        // Simple time-based logic (show first narrative after 10 seconds, second after 30 seconds)
        if (!workoutStartTime) {
          return null;
        }
        
        const phaseStartTime = workoutStartTime + (currentPhase * 60000); // Each phase is 1 min
        const phaseElapsed = Date.now() - phaseStartTime; // Time within current phase
        
        if (phaseElapsed >= 10000 && phaseElapsed < 20000 && !narrativeStates.first_shown) {
          const firstNarrative = databaseNarratives.find(n => n.text === "We're just warming up the legs here");
          if (firstNarrative) {
            setNarrativeStates(prev => ({ ...prev, first_shown: true }));
            setDisplayedNarrative({ text: firstNarrative.text, timestamp: Date.now() });
            return { text: firstNarrative.text };
          }
        } else if (phaseElapsed >= 30000 && phaseElapsed < 40000 && !narrativeStates.second_shown) {
          const secondNarrative = databaseNarratives.find(n => n.text === "Chorus in 7 seconds");
          if (secondNarrative) {
            setNarrativeStates(prev => ({ ...prev, second_shown: true }));
            setDisplayedNarrative({ text: secondNarrative.text, timestamp: Date.now() });
            return { text: secondNarrative.text };
          }
        }
        
        // Show persisted narrative for entire track/phase
        if (displayedNarrative) {
          return { text: displayedNarrative.text };
        }
        
        return null;
      }
      
      // Use intelligent timing based on track structure (Spotify mode)
      if (playbackState && playbackState.progress_ms && playbackState.item) {
        
        // Reset narrative states when track changes
        if (currentTrackId !== playbackState.item.id) {
          setCurrentTrackId(playbackState.item.id);
          setNarrativeStates({
            first_shown: false,
            second_shown: false
          });
          
          // Start Spotify analysis logging for the new track
          if (isWorkoutActive && isSpotifyAuthenticated) {
            const startTrackLogging = async () => {
              try {
                console.log('🎵 📊 Starting analysis logging for:', playbackState.item.name);
                
                // Try to get audio analysis data from Spotify
                const analysisData = await spotifyService.getAudioAnalysis(playbackState.item.id);
                if (analysisData) {
                  console.log('✅ Got full analysis data, starting detailed logging');
                  // Store the analysis data
                  await spotifyAnalysisLogger.storeTrackAnalysis(
                    playbackState.item.id,
                    playbackState.item.name,
                    playbackState.item.artists.map(a => a.name).join(', '),
                    analysisData
                  );
                  
                  // Start logging with current playback context
                  const context = {
                    trackId: playbackState.item.id,
                    trackName: playbackState.item.name,
                    artistName: playbackState.item.artists.map(a => a.name).join(', '),
                    positionMs: playbackState.progress_ms || 0,
                    fitnessPhase: workoutPhases[currentPhase]?.name || `phase_${currentPhase}`,
                    workoutIntensity: 7
                  };
                  
                  spotifyAnalysisLogger.startTrackLogging(context);
                } else {
                  console.warn('⚠️ No detailed analysis data available, trying basic track features');
                  
                  // Fallback: try to get basic audio features
                  try {
                    const audioFeatures = await spotifyService.getAudioFeatures([playbackState.item.id]);
                    if (audioFeatures && audioFeatures.length > 0) {
                      const features = audioFeatures[0];
                      console.log('✅ Got basic audio features, starting basic logging');
                      
                      // Create minimal analysis data structure for basic logging
                      const minimalAnalysis = {
                        track: {
                          loudness: -10, // Default values
                          tempo: features.tempo,
                          tempo_confidence: 0.8,
                          time_signature: features.time_signature,
                          key: features.key,
                          mode: features.mode,
                          duration: playbackState.item.duration_ms / 1000
                        },
                        sections: [{
                          start: 0,
                          duration: playbackState.item.duration_ms / 1000,
                          confidence: 0.7,
                          loudness: -10,
                          tempo: features.tempo,
                          key: features.key,
                          mode: features.mode,
                          time_signature: features.time_signature
                        }],
                        segments: [{
                          start: 0,
                          duration: 1.0,
                          confidence: 0.7,
                          loudness_start: -10,
                          loudness_max: -8,
                          loudness_end: -10,
                          pitches: [0.5, 0.3, 0.2, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1],
                          timbre: [30, -10, 0, 5, -2, 8, 12, -5, 3, 1, -3, 7]
                        }],
                        bars: [{ start: 0, duration: 60/features.tempo * 4, confidence: 0.8 }],
                        beats: [{ start: 0, duration: 60/features.tempo, confidence: 0.8 }],
                        tatums: [{ start: 0, duration: 60/features.tempo/2, confidence: 0.8 }],
                        meta: { analyzer_version: '4.0.0', timestamp: Date.now()/1000 }
                      };
                      
                      await spotifyAnalysisLogger.storeTrackAnalysis(
                        playbackState.item.id,
                        playbackState.item.name,
                        playbackState.item.artists.map(a => a.name).join(', '),
                        minimalAnalysis
                      );
                      
                      const context = {
                        trackId: playbackState.item.id,
                        trackName: playbackState.item.name,
                        artistName: playbackState.item.artists.map(a => a.name).join(', '),
                        positionMs: playbackState.progress_ms || 0,
                        fitnessPhase: workoutPhases[currentPhase]?.name || `phase_${currentPhase}`,
                        workoutIntensity: 7
                      };
                      
                      spotifyAnalysisLogger.startTrackLogging(context);
                    } else {
                      console.warn('⚠️ No audio features available either');
                    }
                  } catch (featuresError) {
                    console.error('❌ Error getting audio features:', featuresError);
                  }
                }
              } catch (error) {
                console.error('❌ Error in track logging setup:', error);
              }
            };
            
            startTrackLogging();
          }
        }
        
        const trackProgressSeconds = playbackState.progress_ms / 1000;
        const track = currentTrackPhase?.track || playbackState.item;
        const tempo = track?.audio_features?.tempo || 120;
        
        // Calculate precise bar timing (4 beats per bar)
        const beatsPerSecond = tempo / 60;
        const secondsPer4Bars = (4 * 4) / beatsPerSecond; // 16 beats = 4 bars
        
        // ADVANCED CHORUS DETECTION: Try multiple methods
        const trackDuration = (track?.duration_ms || 180000) / 1000;
        let chorusStartTime;
        let chorusApproachTime;
        
        // Method 1: Use advanced Spotify audio analysis if available (PRECISE!)
        if (track?.id && isSpotifyAuthenticated) {
          const cachedAnalysis = trackAnalysisCache.get(track.id);
          if (cachedAnalysis) {
            if (cachedAnalysis.chorusStart !== null) {
              chorusStartTime = cachedAnalysis.chorusStart;
              chorusApproachTime = Math.max(secondsPer4Bars + 5, chorusStartTime - 7);
            }
          } else {
            // Trigger background analysis for future use
            advancedMusicAnalysis.analyzeTrackStructure(track.id).then(analysis => {
              if (analysis) {
                setTrackAnalysisCache(prev => new Map(prev.set(track.id, analysis)));
              }
            }).catch(err => {});
          }
        }
        
        // Method 2: Improved estimation (only if precise analysis not available)
        if (!chorusStartTime) {
          if (trackDuration < 120) { // Short songs (< 2 min)
            chorusStartTime = trackDuration * 0.35; // Chorus later in short songs
          } else if (trackDuration < 240) { // Medium songs (2-4 min)
            chorusStartTime = trackDuration * 0.28; // Typical pop structure
          } else { // Long songs (> 4 min)
            chorusStartTime = trackDuration * 0.22; // Earlier chorus in long songs
          }
          
          // Method 3: Use tempo-based adjustments
          if (tempo > 140) { // High-energy songs
            chorusStartTime *= 0.9; // Chorus comes earlier
          } else if (tempo < 80) { // Slow songs
            chorusStartTime *= 1.1; // Chorus comes later
          }
          
          chorusApproachTime = Math.max(secondsPer4Bars + 5, chorusStartTime - 7);
        }
        
        const inFirstWindow = trackProgressSeconds >= secondsPer4Bars && trackProgressSeconds < chorusApproachTime;
        const inSecondWindow = trackProgressSeconds >= chorusApproachTime && trackProgressSeconds < chorusStartTime + 3;
        
        // Check which narrative should show (with state tracking to prevent repeats)
        if (inFirstWindow && !narrativeStates.first_shown) {
          // Show first narrative: "We're just warming up the legs here"
          const firstNarrative = databaseNarratives.find(n => n.text === "We're just warming up the legs here");
          if (firstNarrative) {
            setNarrativeStates(prev => ({ ...prev, first_shown: true }));
            setDisplayedNarrative({ text: firstNarrative.text, timestamp: Date.now() });
            return { text: firstNarrative.text };
          }
        } else if (inSecondWindow && !narrativeStates.second_shown) {
          // Show second narrative: "Chorus in 7 seconds" (with 3-second buffer after chorus starts)
          const secondNarrative = databaseNarratives.find(n => n.text === "Chorus in 7 seconds");
          if (secondNarrative) {
            setNarrativeStates(prev => ({ ...prev, second_shown: true }));
            setDisplayedNarrative({ text: secondNarrative.text, timestamp: Date.now() });
            return { text: secondNarrative.text };
          }
        }
        
        // Show persisted narrative for entire track/phase
        if (displayedNarrative) {
          return { text: displayedNarrative.text };
        }
      }
    }
    
    return null;
  };

  return (
    <div className="min-h-screen bg-premium-texture flex flex-col">
      {/* Header */}
      <Header title="Music Sync" />
      
      <div className="flex-1 px-4">

        <div className="relative text-center mb-8">
          <div className="relative w-full h-48 rounded-xl overflow-hidden mb-6 shadow-glow">
            <img 
              src={heroMusicEmpowerment} 
              alt="Woman mastering her music-powered fitness journey" 
              className="w-full h-full object-cover transform hover:scale-105 transition-smooth"
            />
            <div className="absolute inset-0 bg-glow-gradient opacity-20"></div>
          </div>
          <h1 className="text-3xl font-bold text-cream mb-4">
            Sync to Your Playlist
          </h1>
          <p className="text-lg text-cream/80">
            Let's match your music to your workout rhythm
          </p>
        </div>

        {/* Workout Reference Section */}
        <div className="mb-8">
          <div className="bg-card-texture rounded-xl p-6 shadow-card border border-cream/20">
            <h3 className="text-lg font-semibold text-primary mb-3 flex items-center gap-2">
              🎯 Your Selected Workout
            </h3>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-medium text-primary">Format:</span>
                <span className="text-primary/80 font-semibold">{workoutFormat}</span>
              </div>
              {workoutIntensity && (
                <div className="flex justify-between items-center">
                  <span className="font-medium text-primary">Intensity:</span>
                  <span className="text-primary/80 font-semibold">{workoutIntensity}</span>
                </div>
              )}
              {workoutData.selectedDays && (
                <div className="flex justify-between items-center">
                  <span className="font-medium text-primary">Days Selected:</span>
                  <span className="text-primary/80 font-semibold">{workoutData.selectedDays.length} days/week</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Streaming Service Selection */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-4 text-cream">Pick Streaming Service</h3>
          <div className="grid grid-cols-1 gap-3">
            {streamingServices.map((service) => (
              <Card
                key={service.id}
                onClick={() => setSelectedService(service.id)}
                className={`
                  cursor-pointer transition-smooth shadow-card border-2 bg-card-texture
                  ${selectedService === service.id
                    ? 'border-cream bg-glow-gradient/20'
                    : 'border-cream/30 hover:border-cream/60'
                  }
                `}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-lg ${service.color} flex items-center justify-center`}>
                      <span className="text-white text-lg">{service.icon}</span>
                    </div>
                    <span className="font-medium text-lg text-primary">{service.name}</span>
                    <div className="ml-auto">
                      <div className={`
                        w-6 h-6 rounded-full border-2 flex items-center justify-center
                        ${selectedService === service.id
                          ? 'border-primary bg-primary'
                          : 'border-cream/50'
                        }
                      `}>
                        {selectedService === service.id && (
                          <span className="text-primary-foreground text-sm">✓</span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Playlist Selection */}
        {selectedService && !isWorkoutActive && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4 text-cream">Choose Playlist</h3>
            
            {/* Spotify Authentication Required */}
            {selectedService === 'spotify' && !isSpotifyAuthenticated && (
              <Card className="shadow-card border-2 border-cream/30 bg-card-texture mb-4">
                <CardContent className="p-6 text-center">
                  <div className="mb-4">
                    <div className="text-4xl mb-2">🎵</div>
                    <h4 className="text-lg font-medium text-primary mb-2">Connect to Spotify</h4>
                    <p className="text-primary/70 text-sm mb-4">
                      Sign in to see your personal playlists and create the perfect workout soundtrack
                    </p>
                  </div>
                  <Button 
                    onClick={handleSpotifyLogin}
                    className="bg-green-500 hover:bg-green-600 text-white font-semibold px-6"
                  >
                    Login with Spotify
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Loading State */}
            {selectedService === 'spotify' && isSpotifyAuthenticated && isLoadingPlaylists && (
              <Card className="shadow-card border-2 border-cream/30 bg-card-texture mb-4">
                <CardContent className="p-6 text-center">
                  <div className="text-2xl mb-2">🎵</div>
                  <p className="text-primary">Loading your playlists...</p>
                </CardContent>
              </Card>
            )}

            {/* Playlist List */}
            <div className="grid grid-cols-1 gap-3">
              {getPlaylistsByService(selectedService).map((playlist) => {
                const isLoginRequired = playlist.id === 'login';
                return (
                  <Card
                    key={playlist.id}
                    onClick={() => {
                      if (isLoginRequired) {
                        handleSpotifyLogin();
                      } else {
                        setSelectedPlaylist(playlist.id);
                      }
                    }}
                    className={`
                      cursor-pointer transition-smooth shadow-card border-2 bg-card-texture
                      ${selectedPlaylist === playlist.id && !isLoginRequired
                        ? 'border-cream bg-glow-gradient/20'
                        : isLoginRequired
                        ? 'border-green-500/50 hover:border-green-500'
                        : 'border-cream/30 hover:border-cream/60'
                      }
                    `}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-lg text-primary">{playlist.name}</h4>
                          <p className="text-sm text-primary/70">
                            {playlist.tracks > 0 ? `${playlist.tracks} tracks • ` : ''}{playlist.genre}
                          </p>
                        </div>
                        {!isLoginRequired && (
                          <div className={`
                            w-6 h-6 rounded-full border-2 flex items-center justify-center
                            ${selectedPlaylist === playlist.id
                              ? 'border-primary bg-primary'
                              : 'border-cream/50'
                            }
                          `}>
                            {selectedPlaylist === playlist.id && (
                              <span className="text-primary-foreground text-sm">✓</span>
                            )}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Music Analysis Preview */}
        {selectedService && selectedPlaylist && !isWorkoutActive && (
          <div className="mb-8">
            {isAnalyzingPlaylist ? (
              <Card className="shadow-card border-0 bg-card-texture border border-cream/20">
                <CardContent className="p-6 text-center">
                  <div className="text-4xl mb-4">🎵</div>
                  <h3 className="text-lg font-semibold text-primary mb-2">
                    Analyzing Your Playlist...
                  </h3>
                  <p className="text-sm text-primary/80 mb-4">
                    Mapping track energy, tempo, and characteristics to create your personalized spinning experience
                  </p>
                  <div className="flex justify-center gap-1 mt-4">
                    {[...Array(8)].map((_, i) => (
                      <div
                        key={i}
                        className="w-1 bg-energy-gradient rounded-full animate-pulse"
                        style={{
                          height: `${Math.random() * 20 + 10}px`,
                          animationDelay: `${i * 0.1}s`
                        }}
                      ></div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="shadow-card border-0 bg-card-texture border border-cream/20">
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-primary mb-4">
                    🎵 Intelligent Workout Preview
                  </h3>
                  <p className="text-sm text-primary/80 mb-4">
                    Your personalized {workoutFormat} workout will analyze your playlist and sync narratives to track characteristics:
                  </p>
                  <div className="space-y-3">
                    <div className="bg-cream/10 rounded-lg p-4 border border-cream/20">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-energy-primary">🚀</span>
                            <span className="text-primary/80">High-energy tracks → Sprint phases</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-energy-primary">⛰️</span>
                            <span className="text-primary/80">Mid-tempo builds → Hill climbs</span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-energy-primary">💪</span>
                            <span className="text-primary/80">Bass-heavy tracks → Resistance</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-energy-primary">🧘</span>
                            <span className="text-primary/80">Chill tracks → Warm-up/Cool-down</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="text-center pt-2">
                      <p className="text-xs text-primary/60">
                        Click "Start Your Workout" to analyze your playlist and create a personalized experience!
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Active Workout Display */}
        {isWorkoutActive && (
          <div className="mb-8">
            <Card className="shadow-card border-0 bg-card-texture border border-cream/20">
              <CardContent className="p-6">
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold text-primary mb-2">
                    {workoutPlan && currentTrackPhase ? currentTrackPhase.phase.name : workoutPhases[currentPhase]?.name}
                  </h3>
                  <div className="text-sm text-primary/70 mb-4">
                    <p>Phase {currentPhase + 1} of {workoutPhases.length} • {workoutPhases[currentPhase]?.duration}</p>
                    {workoutPlan && currentTrackPhase && (
                      <p className="text-xs mt-1">
                        Target: {currentTrackPhase.phase.targetTempo} BPM • {currentTrackPhase.phase.energyLevel} energy
                      </p>
                    )}
                  </div>
                  <div className="space-y-3">
                    {/* Coaching Narrative Display */}
                    {(() => {
                      // Try database narratives first, fallback to regular narratives
                      const dbNarrative = getCurrentDatabaseNarrative();
                      const fallbackNarrative = getCurrentNarrative();
                      const narrativeToShow = dbNarrative ? dbNarrative.text : fallbackNarrative;
                      
                      return narrativeToShow ? (
                        <div className="bg-cream/20 rounded-lg p-4 border border-cream/30 min-h-[60px] flex items-center justify-center">
                          <p className="text-primary font-medium text-center leading-relaxed">
                            {narrativeToShow}
                          </p>
                        </div>
                      ) : null;
                    })()}
                    
                    {/* Enhanced Music Player */}
                    <div className="bg-burgundy-dark/30 rounded-lg p-5 border border-cream/30">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 bg-energy-gradient rounded-full flex items-center justify-center animate-pulse ${isPlaying ? 'shadow-glow' : ''}`}>
                        <span className="text-cream text-lg">{isPlaying ? '▶️' : '⏸️'}</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-cream font-medium">Now Playing</p>
                        <p className="text-cream/70 text-sm">{getNowPlayingSongs()}</p>
                        {selectedService === 'spotify' && selectedDevice && (
                          <p className="text-cream/50 text-xs mt-1">
                            Playing on: {spotifyDevices.find(d => d.id === selectedDevice)?.name || 'Spotify'}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {selectedService === 'spotify' && spotifyDevices.length > 0 && (
                        <>
                          <button
                            onClick={handleSpotifyPrevious}
                            className="text-cream/80 hover:text-cream transition-smooth p-1"
                            title="Previous track"
                          >
                            ⏮️
                          </button>
                          <button 
                            onClick={isPlaying ? handleSpotifyPause : handleSpotifyPlay}
                            className="text-cream/80 hover:text-cream transition-smooth p-1 text-lg"
                            title={isPlaying ? 'Pause' : 'Play'}
                          >
                            {isPlaying ? '⏸️' : '▶️'}
                          </button>
                          <button
                            onClick={handleSpotifyNext}
                            className="text-cream/80 hover:text-cream transition-smooth p-1"
                            title="Next track"
                          >
                            ⏭️
                          </button>
                        </>
                      )}
                      {selectedService !== 'spotify' && (
                        <button 
                          onClick={() => setIsPlaying(!isPlaying)}
                          className="text-cream/80 hover:text-cream transition-smooth"
                        >
                          {isPlaying ? '⏸️' : '▶️'}
                        </button>
                      )}
                      <span className="text-cream/70 text-sm">🎵</span>
                    </div>
                  </div>
                  
                  {/* Phase Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-cream/70 text-xs">
                      <span>Phase Progress</span>
                      <span>{Math.round(phaseProgress)}%</span>
                    </div>
                    <div className="w-full bg-cream/20 rounded-full h-3">
                      <div 
                        className="bg-energy-gradient h-3 rounded-full transition-all duration-1000 shadow-glow" 
                        style={{ width: `${phaseProgress}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Beat Visualization */}
                  <div className="flex justify-center mt-4 gap-1">
                    {[...Array(8)].map((_, i) => (
                      <div
                        key={i}
                        className={`w-1 bg-energy-gradient rounded-full transition-all duration-300 ${
                          isPlaying ? 'animate-pulse' : 'opacity-50'
                        }`}
                        style={{
                          height: `${Math.random() * 20 + 10}px`,
                          animationDelay: `${i * 0.1}s`
                        }}
                      ></div>
                    ))}
                  </div>
                </div>
                </div>
                </div>

                {/* Phase Navigation */}
                <div className="space-y-3 mt-6">
                  <div className="flex gap-3">
                    <Button
                      onClick={async () => {
                        const newPhase = Math.max(0, currentPhase - 1);
                        setCurrentPhase(newPhase);
                        
                        // Update fitness phase for logging
                        const phaseName = workoutPhases[newPhase]?.name || `phase_${newPhase}`;
                        spotifyAnalysisLogger.setCurrentFitnessPhase(phaseName);
                        
                        // If using Spotify with workout plan, skip to the previous track
                        if (selectedService === 'spotify' && workoutPlan && selectedDevice) {
                          const previousPhaseTrack = workoutPlan.phases[newPhase];
                          if (previousPhaseTrack) {
                            try {
                              // Navigate to the specific track for this phase
                              await spotifyService.playTrackFromPlaylist(
                                selectedPlaylist, 
                                `spotify:track:${previousPhaseTrack.track.id}`,
                                selectedDevice
                              );
                            } catch (error) {
                              await spotifyService.skipToPrevious(selectedDevice);
                            }
                          }
                        }
                      }}
                      disabled={currentPhase === 0}
                      className="flex-1 bg-burgundy-dark/50 hover:bg-burgundy-dark/70 text-cream border border-cream/30"
                    >
                      Previous Phase
                    </Button>
                    <Button
                      onClick={async () => {
                        const newPhase = Math.min(workoutPhases.length - 1, currentPhase + 1);
                        setCurrentPhase(newPhase);
                        
                        // Update fitness phase for logging
                        const phaseName = workoutPhases[newPhase]?.name || `phase_${newPhase}`;
                        spotifyAnalysisLogger.setCurrentFitnessPhase(phaseName);
                        
                        // If using Spotify with workout plan, skip to the next track
                        if (selectedService === 'spotify' && workoutPlan && selectedDevice) {
                          const nextPhaseTrack = workoutPlan.phases[newPhase];
                          if (nextPhaseTrack) {
                            try {
                              // Navigate to the specific track for this phase
                              await spotifyService.playTrackFromPlaylist(
                                selectedPlaylist, 
                                `spotify:track:${nextPhaseTrack.track.id}`,
                                selectedDevice
                              );
                            } catch (error) {
                              await spotifyService.skipToNext(selectedDevice);
                            }
                          } else {
                            // Fallback to regular next track
                            await spotifyService.skipToNext(selectedDevice);
                          }
                        }
                      }}
                      disabled={currentPhase === workoutPhases.length - 1}
                      className="flex-1 bg-energy-gradient hover:opacity-90 text-cream"
                    >
                      Next Phase
                    </Button>
                  </div>
                  
                  {/* Spotify Manual Sync */}
                  {selectedService === 'spotify' && workoutPlan && playbackState && (
                    <div className="text-center">
                      <Button
                        onClick={() => {
                          // Find phase matching current playing track
                          const matchingPhaseIndex = workoutPlan.phases.findIndex(
                            phase => phase.track.id === playbackState.item?.id
                          );
                          if (matchingPhaseIndex >= 0) {
                            setCurrentPhase(matchingPhaseIndex);
                          }
                        }}
                        variant="outline"
                        className="text-xs border-cream/40 text-cream/80 hover:bg-cream/10"
                      >
                        🔄 Sync with Current Track
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Spotify Device Selection */}
        {selectedService === 'spotify' && isSpotifyAuthenticated && !isWorkoutActive && spotifyDevices.length > 0 && (
          <div className="mb-6">
            <Card className="shadow-card border-0 bg-card-texture border border-cream/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-primary flex items-center gap-2">
                    🎧 Choose Playback Device
                  </h4>
                  <Button
                    onClick={refreshSpotifyDevices}
                    variant="outline"
                    className="text-xs border-cream/40 text-cream/80 hover:bg-cream/10 px-2 py-1"
                  >
                    🔄 Refresh
                  </Button>
                </div>
                <div className="space-y-2">
                  {spotifyDevices.map((device) => (
                    <div
                      key={device.id}
                      onClick={() => setSelectedDevice(device.id)}
                      className={`
                        cursor-pointer p-3 rounded-lg border transition-smooth
                        ${
                          selectedDevice === device.id
                            ? 'border-cream bg-cream/10 text-cream'
                            : 'border-cream/30 text-cream/80 hover:border-cream/50'
                        }
                      `}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-lg">
                            {device.type === 'Computer' ? '💻' : 
                             device.type === 'Smartphone' ? '📱' : 
                             device.type === 'Speaker' ? '🔊' : '🎵'}
                          </span>
                          <div>
                            <p className="font-medium">{device.name}</p>
                            <p className="text-xs opacity-70">
                              {device.type} {device.is_active ? '(Active)' : ''}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs opacity-60">{device.volume_percent}%</span>
                          {selectedDevice === device.id && (
                            <span className="text-sm">✓</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-cream/60 mt-3 text-center">
                  Don't see your device? Open Spotify and play any song, then click Refresh.
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Start Workout Button */}
        <div className="mb-20">
          {!isWorkoutActive ? (
            <div className="space-y-3">
              <Button 
                onClick={handleStartWorkout}
                disabled={!selectedService || !selectedPlaylist || isAnalyzingPlaylist}
                className="w-full h-14 text-lg bg-energy-gradient hover:opacity-90 shadow-button transition-smooth disabled:opacity-50 text-cream font-semibold"
              >
                {isAnalyzingPlaylist ? (
                  <>
                    <div className="animate-spin w-5 h-5 border-2 border-cream border-t-transparent rounded-full mr-2"></div>
                    Analyzing Playlist...
                  </>
                ) : (
                  '🎵 Start Your Playlist'
                )}
              </Button>
              
              {selectedService === 'spotify' && selectedPlaylist && (
                <p className="text-xs text-center text-cream/60">
                  🎵 Music will play in your Spotify app while narratives appear here
                </p>
              )}
            </div>
          ) : (
            <Button 
              onClick={handleEndWorkout}
              className="w-full h-14 text-lg bg-burgundy-dark hover:bg-burgundy-dark/80 shadow-button transition-smooth text-cream font-semibold border border-cream/30"
            >
              End Workout
            </Button>
          )}
        </div>
      </div>

      {/* Workout Complete Modal */}
      {/* Device Activation Dialog */}
      <Dialog open={showDeviceSelector} onOpenChange={setShowDeviceSelector}>
        <DialogContent className="bg-premium-texture border-cream/20 text-cream max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-cream flex items-center gap-2">
              🎵 Activate Spotify Device
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            <p className="text-cream/80">
              No active Spotify devices found. To control playbook during your workout, please:
            </p>
            
            <div className="bg-burgundy-dark/30 rounded-lg p-4 space-y-3">
              <div className="flex items-start gap-3">
                <span className="text-cream font-bold">1.</span>
                <div>
                  <p className="text-cream font-medium">Open Spotify</p>
                  <p className="text-cream/70 text-sm">On your phone, computer, or web browser</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <span className="text-cream font-bold">2.</span>
                <div>
                  <p className="text-cream font-medium">Play any song</p>
                  <p className="text-cream/70 text-sm">This activates the device for remote control</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <span className="text-cream font-bold">3.</span>
                <div>
                  <p className="text-cream font-medium">Come back here</p>
                  <p className="text-cream/70 text-sm">Click "Check for Devices" to try again</p>
                </div>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <Button 
                onClick={() => setShowDeviceSelector(false)}
                variant="outline"
                className="flex-1 border-cream/40 text-cream hover:bg-cream/10"
              >
                Cancel
              </Button>
              <Button 
                onClick={async () => {
                  const devices = await refreshSpotifyDevices();
                  if (devices.length > 0) {
                    setShowDeviceSelector(false);
                    // Automatically proceed with workout
                    handleStartWorkout();
                  }
                }}
                className="flex-1 bg-energy-gradient hover:opacity-90 text-cream font-semibold"
              >
                🔍 Check for Devices
              </Button>
            </div>
            
            <p className="text-xs text-cream/60 text-center">
              💡 Tip: Spotify Premium is required for device control
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Workout Complete Modal */}
      <Dialog open={showWorkoutCompleteModal} onOpenChange={setShowWorkoutCompleteModal}>
        <DialogContent className="bg-premium-texture border-cream/20 text-cream max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-cream">Share Your Workout</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 mt-4">
            {/* Workout Summary */}
            <div className="bg-burgundy-dark/30 rounded-lg p-4 border border-cream/20">
              <h3 className="text-lg font-semibold text-cream mb-3">Your Workout Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-cream/70">Soundtrack:</span>
                  <span className="text-cream font-medium">{getSelectedPlaylistName()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-cream/70">Format:</span>
                  <span className="text-cream font-medium">{workoutFormat}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-cream/70">Intensity:</span>
                  <span className="text-cream font-medium">{workoutIntensity || "Medium"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-cream/70">Duration:</span>
                  <span className="text-cream font-medium">
                    ~{workoutPhases.reduce((total, phase) => total + parseInt(phase.duration), 0)} min
                  </span>
                </div>
              </div>
            </div>

            {/* Share With Selection */}
            <div>
              <Label className="text-cream/90 text-base font-medium">Share with</Label>
              <div className="grid grid-cols-3 gap-3 mt-2">
                <button
                  onClick={() => setWorkoutShareData(prev => ({ ...prev, shareWith: "friends" }))}
                  className={`p-3 rounded-lg border-2 transition-smooth text-center ${
                    workoutShareData.shareWith === "friends"
                      ? "border-cream bg-cream/10 text-cream"
                      : "border-cream/40 text-cream/70 hover:border-cream/60"
                  }`}
                >
                  <div className="text-lg mb-1">👥</div>
                  <div className="font-medium text-sm">Friends Only</div>
                  <div className="text-xs opacity-80">Share with your network</div>
                </button>
                <button
                  onClick={() => setWorkoutShareData(prev => ({ ...prev, shareWith: "community" }))}
                  className={`p-3 rounded-lg border-2 transition-smooth text-center ${
                    workoutShareData.shareWith === "community"
                      ? "border-cream bg-cream/10 text-cream"
                      : "border-cream/40 text-cream/70 hover:border-cream/60"
                  }`}
                >
                  <div className="text-lg mb-1">🌍</div>
                  <div className="font-medium text-sm">Open Community</div>
                  <div className="text-xs opacity-80">Share with everyone</div>
                </button>
                <button
                  onClick={() => setWorkoutShareData(prev => ({ ...prev, shareWith: "trainer" }))}
                  className={`p-3 rounded-lg border-2 transition-smooth text-center ${
                    workoutShareData.shareWith === "trainer"
                      ? "border-cream bg-cream/10 text-cream"
                      : "border-cream/40 text-cream/70 hover:border-cream/60"
                  }`}
                >
                  <div className="text-lg mb-1">🏋️</div>
                  <div className="font-medium text-sm">Personal trainer</div>
                  <div className="text-xs opacity-80">Share with trainer on Bassline</div>
                </button>
              </div>
            </div>

            {/* Comment Section */}
            <div>
              <Label htmlFor="comment" className="text-cream/90 text-base font-medium">Add a comment (Optional)</Label>
              <Textarea
                id="comment"
                value={workoutShareData.comment}
                onChange={(e) => setWorkoutShareData(prev => ({ ...prev, comment: e.target.value }))}
                placeholder="How did it feel? Any thoughts to share?"
                className="bg-burgundy-dark/20 border-cream/30 text-cream placeholder:text-cream/60 mt-2"
                rows={3}
              />
            </div>

            <div className="flex gap-3 mt-6">
              <Button 
                onClick={handleCloseModal}
                variant="outline"
                className="flex-1 border-cream/40 text-cream hover:bg-cream/10"
              >
                Skip Sharing
              </Button>
              <Button 
                onClick={handleShareWorkout}
                className="flex-1 bg-energy-gradient hover:opacity-90 text-cream font-semibold"
              >
                Share Workout
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <BottomNavigation />
    </div>
  );
};

export default MusicSync;