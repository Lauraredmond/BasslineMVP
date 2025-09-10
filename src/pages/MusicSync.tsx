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
import basslineLogoYellowTransparent from '../assets/bassline-logo-yellow-transparent.png';
import { dbAdmin } from "@/lib/database-admin";
import { supabase } from "@/lib/supabase";
import { advancedMusicAnalysis } from "@/lib/advanced-music-analysis";
import { spotifyAnalysisLogger } from "@/lib/spotify-analysis-logger";
// Removed WebAudioAnalysisLogger - eliminated Web Audio capture
// Removed SpotifyAnalysisViewer - eliminated Analysis tab
import { RealtimeSectionDisplay } from "@/components/RealtimeSectionDisplay";
import { AutomaticBPMCapture } from "@/lib/automatic-bpm-capture";
import { secureRapidSoundnetService } from "@/lib/rapid-soundnet-secure";
import { databaseMigrator } from "@/lib/database-migrator";
import { DebugPanel, QuickTestButton } from "@/components/TestComponents";
import heroMusicEmpowerment from "../assets/hero-music-empowerment.jpg";
import { lockSessionForToday, getSessionSnapshot } from "@/lib/session-lock";
import { tempoResolver } from "@/lib/tempo-resolver";
import { resolvePhaseForTrack, PhaseMatch } from "@/lib/musicAnalysis/phaseResolver";
import { mapPlaylistToPhases, getLockedPhaseForTrack, TrackPhaseMapping } from "@/lib/playlistPhaseMapper";
import { PersistentNarrativeService } from "@/lib/persistentNarrative";
import { useWorkoutPhaseTracking } from "@/hooks/useWorkoutPhaseTracking";
import { lockPlaylistPhases, mapTrackToWorkoutPhase } from "@/lib/workoutPhaseMapper";
import { runAllTests as runWorkoutPhaseTests } from "@/lib/workoutPhaseMapperTest";
import { testPlaylistStartWorkflow, quickSpotifyTest } from "@/lib/spotifyPlaybackTester";

const MusicSync = () => {
  
  // 🔧 TEMPORARY: Expose migration functions for debugging
  useEffect(() => {
    (window as any).runMigration = async () => {
      const result = await databaseMigrator.runVendorAgnosticMigration();
      console.log('🔄 Migration result:', result);
      return result;
    };
    
    (window as any).testTable = async () => {
      const result = await databaseMigrator.testTableAccess();
      console.log('🔍 Table test result:', result);
      return result;
    };
    
    (window as any).fixMissingBPMs = async () => {
      console.log('🔧 Fixing missing BPM data...');
      await AutomaticBPMCapture.forceUpdateTrackBPM('Slide Away', 'Oasis', 94);
      await AutomaticBPMCapture.forceUpdateTrackBPM('The Pretender', 'Foo Fighters', 172);
      await AutomaticBPMCapture.forceUpdateTrackBPM('Sandstorm', 'Darude', 136);
      await AutomaticBPMCapture.forceUpdateTrackBPM('Death in Vegas', 'Dirge', 85);
      console.log('✅ Missing BPM data updated');
    };
    
    (window as any).testTempoResolver = async () => {
      console.log('🎯 Testing tempo resolver...');
      
      // Test with known tracks
      const slideAwayResult = await tempoResolver.resolveTempo({
        trackName: 'Slide Away',
        artistName: 'Oasis'
      });
      console.log('Slide Away result:', slideAwayResult);
      
      const pretenderResult = await tempoResolver.resolveTempo({
        trackName: 'The Pretender', 
        artistName: 'Foo Fighters'
      });
      console.log('The Pretender result:', pretenderResult);
      
      // Test cache stats
      console.log('Cache stats:', tempoResolver.getCacheStats());
      
      return { slideAwayResult, pretenderResult };
    };
    
    (window as any).testWorkoutPhaseMapping = async () => {
      console.log('🧪 Running workout phase mapping tests...');
      await runWorkoutPhaseTests();
    };
    
    (window as any).testSingleTrackMapping = async (trackId: string) => {
      console.log(`🎯 Testing single track mapping for: ${trackId}`);
      const result = await mapTrackToWorkoutPhase(trackId);
      console.log('Mapping result:', result);
      return result;
    };
    
    (window as any).testSpotifyPlayback = async (playlistId?: string) => {
      console.log('🎵 Testing Spotify playlist playback workflow...');
      const results = await testPlaylistStartWorkflow(playlistId);
      return results;
    };
    
    (window as any).quickSpotifyTest = async () => {
      console.log('⚡ Running quick Spotify test...');
      const result = await quickSpotifyTest();
      return result;
    };
    
    (window as any).directSpotifyPlayTest = async () => {
      console.log('🎵 Testing direct Spotify playback...');
      
      try {
        // Check auth
        if (!spotifyService.isAuthenticated()) {
          console.error('❌ Not authenticated');
          return false;
        }
        
        // Get devices
        const devices = await spotifyService.getDevices();
        console.log('📱 Devices:', devices);
        
        if (!devices || devices.length === 0) {
          console.error('❌ No devices available');
          return false;
        }
        
        const device = devices[0];
        console.log('📱 Using device:', device.name);
        
        // Test with current selected playlist
        if (selectedPlaylist) {
          console.log(`🎼 Testing with playlist: ${selectedPlaylist}`);
          const result = await spotifyService.startPlaylistPlayback(selectedPlaylist, device.id);
          console.log(`🎵 Direct playback result: ${result}`);
          return result;
        } else {
          console.error('❌ No playlist selected');
          return false;
        }
      } catch (error) {
        console.error('❌ Direct playback test failed:', error);
        return false;
      }
    };
    
    (window as any).validateTempoCorrections = async () => {
      console.log('🔧 Testing tempo correction logic...');
      
      // Test half-tempo correction (should double 47 to 94)
      const halfTempoTest = await tempoResolver.resolveTempo({
        trackName: 'Test Half Tempo',
        artistName: 'Test Artist',
        previousTempo: 150 // High previous tempo to trigger correction
      });
      
      // Test double-tempo correction (should halve 300 to 150)  
      const doubleTempoTest = await tempoResolver.resolveTempo({
        trackName: 'Test Double Tempo',
        artistName: 'Test Artist',
        previousTempo: 80 // Low previous tempo to trigger correction
      });
      
      console.log('Half-tempo test:', halfTempoTest);
      console.log('Double-tempo test:', doubleTempoTest);
      
      return { halfTempoTest, doubleTempoTest };
    };
    
    console.log('🔧 Functions available: window.runMigration(), window.testTable(), window.fixMissingBPMs(), window.testTempoResolver(), window.validateTempoCorrections()');
  }, []);
  
  const location = useLocation();
  const navigate = useNavigate();
  const [selectedService, setSelectedService] = useState<string>("");
  const [selectedPlaylist, setSelectedPlaylist] = useState<string>("");
  const [isWorkoutActive, setIsWorkoutActive] = useState<boolean>(false);
  
  // Debug workout state changes
  useEffect(() => {
    console.log('🏋️ [DEBUG] Workout state changed:', { isWorkoutActive });
  }, [isWorkoutActive]);
  const [currentPhase, setCurrentPhase] = useState<number>(0);
  const [currentNarrative, setCurrentNarrative] = useState<number>(0);
  
  // Track section occurrences for numbered narratives (using ref to avoid async issues)
  const sectionOccurrencesRef = useRef<{[key: string]: number}>({});
  const lastProcessedTrackRef = useRef<string>('');
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
  const [smoothProgress, setSmoothProgress] = useState<number>(0); // Running clock for smooth progress
  const [lastSyncTime, setLastSyncTime] = useState<number>(0); // When we last synced with Spotify
  const [showDeviceSelector, setShowDeviceSelector] = useState(false);
  
  // Database-driven narratives
  const [databaseNarratives, setDatabaseNarratives] = useState<any[]>([]);
  const [currentDatabaseNarrative, setCurrentDatabaseNarrative] = useState<{text: string, workoutTrack?: string, songComponent?: string, bpm?: number} | null>(null);
  const [previousTrackId, setPreviousTrackId] = useState<string | null>(null);
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
  
  // Session locking state
  const [sessionLocked, setSessionLocked] = useState(false);
  const [sessionSnapshot, setSessionSnapshot] = useState<any>(null);
  
  // Phase resolution state (replaced by playlist phase mapping)
  const [currentPhaseMatch, setCurrentPhaseMatch] = useState<PhaseMatch | null>(null);
  
  // Playlist phase mapping state (locks phases at playlist selection time)
  const [playlistPhaseMappings, setPlaylistPhaseMappings] = useState<TrackPhaseMapping[]>([]);
  const [playlistSessionId, setPlaylistSessionId] = useState<string | null>(null);
  
  // NEW: Primer.md phase tracking system
  const phaseTracking = useWorkoutPhaseTracking({
    enabled: isWorkoutActive && isSpotifyAuthenticated,
    pollingInterval: 8000, // 8s for music-sync per primer.md
    onPhaseChange: (phase) => {
      console.log('🎯 [PHASE CHANGE]', phase);
      // Update UI when phase changes
      if (phase?.error) {
        console.error('❌ [PHASE ERROR]', phase.error);
      }
    },
    onTrackChange: (event) => {
      console.log('🎵 [TRACK CHANGE]', event);
      // Handle track change events
    },
    onError: (error) => {
      console.error('❌ [PHASE TRACKING ERROR]', error);
    }
  });
  
  // Research lab integration
  const [showResearchLab, setShowResearchLab] = useState(false);
  const [isAnalysisLogging, setIsAnalysisLogging] = useState(false);
  const [enhancedAnalysisEnabled, setEnhancedAnalysisEnabled] = useState(true);
  
  // Removed Web Audio Analysis Logger - eliminated Web Audio capture

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
    // Use live Spotify playback state first
    if (playbackState?.item) {
      const artists = playbackState.item.artists?.map(a => a.name).join(', ') || 'Unknown Artist';
      return `${artists} – ${playbackState.item.name}`;
    }
    
    // Use actual track info if available from workout plan
    if (workoutPlan && currentTrackPhase) {
      const track = currentTrackPhase.track;
      return `${track.artists.map(a => a.name).join(', ')} – ${track.name}`;
    }
    
    // Last resort fallback
    return "No track playing";
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
    if (!isSpotifyAuthenticated) {
      console.log('🔍 [DEVICE DEBUG] Not authenticated, returning empty devices');
      return [];
    }
    
    try {
      console.log('🔍 [DEVICE DEBUG] Fetching available devices...');
      const devices = await spotifyService.getAvailableDevices();
      console.log('🔍 [DEVICE DEBUG] Devices fetched:', {
        totalDevices: devices.length,
        deviceNames: devices.map(d => d.name),
        activeDevices: devices.filter(d => d.is_active).map(d => d.name)
      });
      
      setSpotifyDevices(devices);
      
      // Auto-select active device if available
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
    console.log('🏋️ [DEBUG] handleStartWorkout called - beginning workout start process');
    console.log('🔍 [DEBUG] Current state:', {
      selectedService,
      selectedPlaylist,
      isSpotifyAuthenticated,
      selectedDevice
    });
    
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

    // CRITICAL CHECK 1: Verify we have Spotify playlist selected
    if (!selectedPlaylist || selectedService !== 'spotify') {
      const errorMsg = `❌ PLAYBACK BLOCKED: selectedPlaylist=${selectedPlaylist}, selectedService=${selectedService}`;
      console.error(errorMsg);
      alert(`Cannot start Spotify playback: ${!selectedPlaylist ? 'No playlist selected' : 'Service is not Spotify'}`);
      return;
    }
    
    // CRITICAL CHECK 2: Verify Spotify authentication
    if (!isSpotifyAuthenticated) {
      const errorMsg = `❌ PLAYBACK BLOCKED: Spotify not authenticated (isSpotifyAuthenticated=${isSpotifyAuthenticated})`;
      console.error(errorMsg);
      alert('Cannot start Spotify playback: Not authenticated with Spotify. Please log in to Spotify first.');
      return;
    }
    
    console.log('✅ [CHECK PASS] Spotify service and playlist validated');

    setIsAnalyzingPlaylist(true);
    try {
      // CRITICAL CHECK 3: Get and validate Spotify devices
      console.log('🔍 [DEVICE CHECK] Refreshing Spotify devices...');
      const devices = await refreshSpotifyDevices();
      console.log(`📱 [DEVICE CHECK] Found ${devices.length} devices:`, devices.map(d => ({ name: d.name, id: d.id, is_active: d.is_active })));
      
      if (devices.length === 0) {
        const errorMsg = '❌ PLAYBACK BLOCKED: No Spotify devices available';
        console.error(errorMsg);
        console.error('💡 [DEVICE CHECK] User needs to open Spotify app on a device');
        alert('Cannot start Spotify playback: No Spotify devices found. Please open Spotify on your phone, computer, or other device first.');
        setShowDeviceSelector(true);
        setIsAnalyzingPlaylist(false);
        return;
      }

      // Auto-select active device or first available
      const activeDevice = devices.find(d => d.is_active) || devices[0];
      const deviceToUse = selectedDevice ? devices.find(d => d.id === selectedDevice) || activeDevice : activeDevice;
      console.log(`📱 [DEVICE CHECK] Selected device: ${deviceToUse.name} (${deviceToUse.id}) - Active: ${deviceToUse.is_active}`);
      setSelectedDevice(deviceToUse.id);

      // CRITICAL CHECK 4: Get and validate playlist tracks
      console.log(`🎼 [TRACKS CHECK] Getting tracks for playlist: ${selectedPlaylist}`);
      const tracks = await spotifyService.getPlaylistTracks(selectedPlaylist);
      console.log(`🎼 [TRACKS CHECK] Found ${tracks.length} tracks in playlist`);
      
      if (!tracks || tracks.length === 0) {
        const errorMsg = `❌ PLAYBACK BLOCKED: Playlist ${selectedPlaylist} has no tracks`;
        console.error(errorMsg);
        alert('Cannot start Spotify playback: The selected playlist is empty or cannot be accessed.');
        setIsAnalyzingPlaylist(false);
        return;
      }
      
      // CRITICAL CHECK 5: Generate workout plan
      console.log(`🎯 [PLAN CHECK] Generating workout plan for ${tracks.length} tracks...`);
      let plan;
      
      try {
        // Remove the complex fallback system - just use the old system for now to isolate the issue
        console.log('🔄 [PLAN CHECK] Using established workout plan generation (bypassing new system)');
        plan = musicAnalysisEngine.generateWorkoutPlan(tracks, selectedPlaylist);
        console.log(`📊 [PLAN CHECK] Generated plan with ${plan.phases.length} phases`);
        
        if (!plan || !plan.phases || plan.phases.length === 0) {
          const errorMsg = `❌ PLAYBACK BLOCKED: Workout plan generation failed - no phases created`;
          console.error(errorMsg);
          console.error('📊 [PLAN CHECK] Plan details:', plan);
          alert('Cannot start Spotify playback: Unable to create workout plan from playlist tracks.');
          setIsAnalyzingPlaylist(false);
          return;
        }
        
      } catch (planError) {
        const errorMsg = `❌ PLAYBACK BLOCKED: Workout plan generation threw error: ${planError.message}`;
        console.error(errorMsg);
        console.error('📊 [PLAN CHECK] Full error:', planError);
        alert(`Cannot start Spotify playback: Error creating workout plan - ${planError.message}`);
        setIsAnalyzingPlaylist(false);
        return;
      }
      
      setWorkoutPlan(plan);
      console.log('✅ [CHECK PASS] Workout plan created and set');
      
      // CRITICAL CHECK 6: Attempt Spotify playback with detailed error reporting
      console.log(`🎵 [SPOTIFY START] === ATTEMPTING SPOTIFY PLAYBACK ===`);
      console.log(`📱 [SPOTIFY START] Device: ${deviceToUse.name} (${deviceToUse.id}) - Active: ${deviceToUse.is_active}`);
      console.log(`🎼 [SPOTIFY START] Playlist ID: ${selectedPlaylist}`);
      console.log(`📊 [SPOTIFY START] Plan phases: ${plan.phases.length}`);
      console.log(`🔐 [SPOTIFY START] Auth status: ${spotifyService.isAuthenticated()}`);
      
      let playbackStarted = false;
      try {
        playbackStarted = await spotifyService.startPlaylistPlayback(selectedPlaylist, deviceToUse.id);
        console.log(`🎵 [SPOTIFY START] startPlaylistPlayback returned: ${playbackStarted}`);
      } catch (spotifyError) {
        const errorMsg = `❌ PLAYBACK BLOCKED: Spotify API call failed: ${spotifyError.message}`;
        console.error(errorMsg);
        console.error('🎵 [SPOTIFY START] Full Spotify error:', spotifyError);
        console.error('🎵 [SPOTIFY START] Error details:', {
          name: spotifyError.name,
          message: spotifyError.message,
          stack: spotifyError.stack,
          status: spotifyError.status,
          statusText: spotifyError.statusText
        });
        alert(`Cannot start Spotify playback: Spotify API error - ${spotifyError.message}`);
        setIsAnalyzingPlaylist(false);
        return;
      }
      
      if (playbackStarted) {
        console.log('✅ [SPOTIFY START] === PLAYBACK STARTED SUCCESSFULLY ===');
          // Auto-start analysis logging session
          console.log('🏋️ STARTING WORKOUT SESSION for analysis logging...');
          await spotifyAnalysisLogger.startWorkoutSession(workoutFormat || 'spotify');
          setIsAnalysisLogging(true);
          console.log('✅ Analysis logging session started, isAnalysisLogging set to true');
          
          // Eliminated Web Audio Analysis Logger - no getDisplayMedia calls
          
          setCurrentTrackPhase(plan.phases[0]);
          console.log('🏋️ [DEBUG] Setting workout as ACTIVE (Spotify path)');
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
          const errorMsg = '❌ PLAYBACK BLOCKED: Spotify startPlaylistPlayback returned false';
          console.error(errorMsg);
          console.error('📱 [SPOTIFY START] Device info:', {
            name: deviceToUse.name,
            id: deviceToUse.id,
            is_active: deviceToUse.is_active,
            type: deviceToUse.type,
            volume_percent: deviceToUse.volume_percent
          });
          console.error('🎼 [SPOTIFY START] Playlist ID:', selectedPlaylist);
          console.error('🔐 [SPOTIFY START] Auth check:', spotifyService.isAuthenticated());
          
          // Let's also check if we can get current playback state
          try {
            const currentState = await spotifyService.getCurrentPlayback();
            console.error('🎵 [SPOTIFY START] Current playback state:', currentState);
          } catch (stateError) {
            console.error('🎵 [SPOTIFY START] Cannot get current playback state:', stateError.message);
          }
          
          alert(`❌ Spotify playback failed to start on device "${deviceToUse.name}". 

Possible issues:
• Device may not be active - try playing something in Spotify first
• Spotify app may be closed - open Spotify on your device
• Device may be busy with other playback
• Premium account required for remote control

Check the console for detailed error information.`);
          setIsAnalyzingPlaylist(false);
          return;
        }
    } catch (error) {
      console.error('💥 [WORKOUT START] Error starting workout:', error);
      console.error('📋 [WORKOUT START] Full error details:', {
        message: error?.message,
        stack: error?.stack,
        name: error?.name,
        cause: error?.cause,
        selectedPlaylist,
        selectedDevice: deviceToUse?.id,
        workoutFormat
      });
      
      // More specific error message based on error type
      let errorMessage = 'Error starting workout. ';
      if (error?.message?.includes('network') || error?.message?.includes('fetch')) {
        errorMessage += 'Please check your internet connection and try again.';
      } else if (error?.message?.includes('auth') || error?.message?.includes('token')) {
        errorMessage += 'Please reconnect to Spotify and try again.';
      } else if (error?.message?.includes('device')) {
        errorMessage += 'Please make sure Spotify is open on your device and try again.';
      } else {
        errorMessage += 'Please check your Spotify connection and try again.';
      }
      
      alert(errorMessage);
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

  // Check and lock session on mount if needed
  useEffect(() => {
    const checkAndLockSession = async () => {
      try {
        // Check if session already exists
        const existingSnapshot = await getSessionSnapshot('anonymous_user');
        
        if (existingSnapshot) {
          console.log('✅ Session already locked, using existing snapshot');
          setSessionLocked(true);
          setSessionSnapshot(existingSnapshot);
          return;
        }
        
        // If no session exists, lock one based on current context
        const routineKey = workoutData.workoutType === 'spontaneous' ? 'spontaneous' : 'existing_plan';
        
        const newSnapshot = await lockSessionForToday({
          userId: 'anonymous_user',
          routine_key: routineKey,
          format: workoutFormat,
          intensity: workoutIntensity
        });
        
        setSessionLocked(true);
        setSessionSnapshot(newSnapshot);
        console.log('🔒 Session locked on MusicSync mount');
        
      } catch (error) {
        console.error('Failed to lock session on mount:', error);
      }
    };
    
    checkAndLockSession();
  }, [workoutFormat, workoutIntensity, workoutData.workoutType]);

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
      
      // Start monitoring playback immediately when authenticated
      console.log('🔄 [AUTO START] Starting playback monitoring due to authentication');
      
      // Get initial playback state immediately
      spotifyService.getCurrentPlayback().then(state => {
        if (state) {
          console.log('🔄 [INITIAL FETCH] Got initial playback state:', state?.item?.name);
          setPlaybackState(state);
          setIsPlaying(state.is_playing);
        }
      }).catch(error => {
        console.error('🚨 [INITIAL FETCH] Failed to get initial playback state:', error);
      });
      
      startPlaybackMonitoring();
      
      const deviceRefreshInterval = setInterval(refreshSpotifyDevices, 10000); // Every 10 seconds
      return () => {
        clearInterval(deviceRefreshInterval);
        stopPlaybackMonitoring();
      };
    }
  }, [selectedService, isSpotifyAuthenticated]);
  
  // Auto-start monitoring when Spotify is authenticated (regardless of service selection)
  useEffect(() => {
    if (isSpotifyAuthenticated && !playbackMonitoringRef.current) {
      console.log('🔄 [FALLBACK START] Auto-starting playback monitoring for authenticated Spotify');
      
      // Get initial state
      spotifyService.getCurrentPlayback().then(state => {
        if (state) {
          console.log('🔄 [FALLBACK FETCH] Got playback state:', state?.item?.name);
          setPlaybackState(state);
          setIsPlaying(state.is_playing);
          
          // Auto-select Spotify service if not already selected
          if (!selectedService) {
            setSelectedService('spotify');
          }
        }
      }).catch(error => {
        console.error('🚨 [FALLBACK FETCH] Failed:', error);
      });
      
      startPlaybackMonitoring();
    }
  }, [isSpotifyAuthenticated, selectedService]);

  // Running clock for smooth progress between polls
  useEffect(() => {
    if (!playbackState?.is_playing || !lastSyncTime) return;

    const interval = setInterval(() => {
      const elapsed = Date.now() - lastSyncTime;
      const newProgress = Math.min(
        (playbackState.progress_ms || 0) + elapsed,
        playbackState.item?.duration_ms || 0
      );
      setSmoothProgress(newProgress);
    }, 100); // Update every 100ms for smooth progress

    return () => clearInterval(interval);
  }, [playbackState?.is_playing, playbackState?.progress_ms, playbackState?.item?.duration_ms, lastSyncTime]);

  // Playback monitoring
  const playbackMonitoringRef = useRef<NodeJS.Timeout | null>(null);
  
  const startPlaybackMonitoring = () => {
    if (playbackMonitoringRef.current) {
      clearInterval(playbackMonitoringRef.current);
    }
    
    playbackMonitoringRef.current = setInterval(async () => {
      // Comprehensive visibility gating
      const visibilityGatingEnabled = import.meta.env.VITE_SPOTIFY_VISIBILITY_GATING !== '0';
      
      if (visibilityGatingEnabled) {
        if (document.hidden || document.visibilityState !== 'visible') {
          console.log('⏸️ [OPTIMIZATION] Skipping poll - page hidden');
          return;
        }
        
        if (!navigator.onLine) {
          console.log('⏸️ [OPTIMIZATION] Skipping poll - offline');
          return;
        }
        
        // Music-sync exception: allow polling when unfocused for real-time sync
        // (Only skip on hidden/offline, not focus loss)
      }

      try {
        // Observability: Log function usage (DEBUG only)
        if (import.meta.env.VITE_DEBUG_FUNCTIONS === 'true') {
          console.log('📊 [FUNCTION_USAGE] getCurrentPlayback called', {
            timestamp: new Date().toISOString(),
            userId: 'anonymous',
            function: 'spotify.getCurrentPlayback',
            fromCache: false
          });
        }

        const state = await spotifyService.getCurrentPlayback();
        
        // Update sync tracking and detect seeks
        if (state?.progress_ms !== undefined) {
          const progressDiff = Math.abs(state.progress_ms - smoothProgress);
          
          // Detect seek (>1500ms jump)
          if (progressDiff > 1500 && import.meta.env.VITE_DEBUG === '1') {
            console.log('🔄 [SEEK DETECTED] Position jump:', {
              previous: smoothProgress,
              new: state.progress_ms,
              diff: progressDiff
            });
          }
          
          setSmoothProgress(state.progress_ms);
          setLastSyncTime(Date.now());
        }
        
        console.log('🔍 [PLAYBACK POLL] Spotify polling result:', {
          timestamp: new Date().toISOString(),
          hasState: !!state,
          hasItem: !!state?.item,
          trackName: state?.item?.name,
          trackId: state?.item?.id,
          artistName: state?.item?.artists?.[0]?.name,
          isPlaying: state?.is_playing,
          progressMs: state?.progress_ms,
          deviceId: state?.device?.id,
          deviceName: state?.device?.name,
          selectedDevice,
          isWorkoutActive,
          currentPhase
        });
        
        // CRITICAL FIX: If we detect music playing but workout state is false, fix it
        let currentWorkoutState = isWorkoutActive;
        if (state?.is_playing && !isWorkoutActive && state?.item) {
          console.log('🔧 [FIX] Music playing but workout state is false - correcting this!');
          setIsWorkoutActive(true);
          currentWorkoutState = true; // Use corrected state immediately
          
          // Force refresh narrative with corrected workout state
          setTimeout(async () => {
            const narrative = await getCurrentDatabaseNarrative();
            setCurrentDatabaseNarrative(narrative);
            console.log('🔄 [FORCED REFRESH] Updated narrative after workout state correction:', narrative);
            
            // Clear persistent narrative cache to force refresh
            PersistentNarrativeService.clearCache();
          }, 100);
        }
        
        // TEMPORARY DEBUG: Check conditions on every poll to see current state
        if (state?.item) {
          const isSpotifyAuthenticated = spotifyService.isAuthenticated();
          console.log('🔍 [DEBUG] CURRENT CONDITIONS:', {
            isWorkoutActive: currentWorkoutState,
            isSpotifyAuthenticated,
            bothConditionsMet: currentWorkoutState && isSpotifyAuthenticated,
            currentTrack: state.item.name
          });
          
          // IMMEDIATE TRIGGER: If both conditions are met, trigger logging immediately
          if (currentWorkoutState && isSpotifyAuthenticated && state.item) {
            console.log('🎯 [TRIGGER] Both conditions met - triggering track logging NOW!');
            // This will trigger the logging that should have happened in track change detection
          }
        }
        
        // Add detailed logging before setting state
        if (state?.item) {
          console.log('🎵 [STATE UPDATE] Setting new playback state:', {
            newTrack: state.item.name,
            newArtist: state.item.artists?.[0]?.name,
            newId: state.item.id,
            previousTrack: playbackState?.item?.name,
            stateChanged: playbackState?.item?.id !== state.item.id
          });
        }
        
        setPlaybackState(state);
        
        // 🎯 CENTRALIZED TEMPO RESOLUTION: Use new tempo resolver
        const shouldCaptureBPM = async () => {
          if (!state?.item) return;

          try {
            const tempoResult = await tempoResolver.resolveTempo({
              trackId: state.item.id,
              trackName: state.item.name,
              artistName: state.item.artists?.[0]?.name || ''
            });
            
            if (tempoResult) {
              console.log(`🎵 RESOLVED TEMPO: ${tempoResult.bpm} BPM (${tempoResult.source}, confidence: ${tempoResult.confidence})`);
              
              // Update database if tempo was resolved from external sources
              if (tempoResult.source !== 'database') {
                AutomaticBPMCapture.captureBPMForTrack(
                  state.item.name,
                  state.item.artists?.[0]?.name || '',
                  tempoResult.bpm,
                  state.item.duration_ms
                ).then(() => {
                  console.log(`✅ Updated database with resolved tempo: ${tempoResult.bpm} BPM`);
                }).catch(error => {
                  console.error(`❌ Failed to update database with tempo:`, error);
                });
              }
            } else {
              console.warn('❌ Tempo resolver returned null - no tempo available');
            }
          } catch (error) {
            console.error('❌ Tempo resolution failed:', error);
          }
        };

        shouldCaptureBPM().catch(error => {
          console.error('❌ shouldCaptureBPM failed:', error);
        });
        
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
        console.error('🚨 [PLAYBACK ERROR] Error monitoring playback:', error);
        
        // Check if it's an auth error
        if (error instanceof Error && (error.message.includes('401') || error.message.includes('403'))) {
          console.error('🔑 [AUTH ERROR] Authentication failed, stopping monitoring');
          setIsSpotifyAuthenticated(false);
          stopPlaybackMonitoring();
        }
      }
    }, parseInt(import.meta.env.VITE_MUSIC_SYNC_POLL_INTERVAL_MS) || 8000); // music-sync needs faster polling for real-time sync
  };
  
  const stopPlaybackMonitoring = () => {
    if (playbackMonitoringRef.current) {
      clearInterval(playbackMonitoringRef.current);
      playbackMonitoringRef.current = null;
    }
  };
  
  // Cleanup on unmount and add page visibility listeners
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && isSpotifyAuthenticated && selectedDevice) {
        console.log('🔄 [VISIBILITY] Page focused, forcing playback refresh');
        // Force immediate refresh when page becomes visible
        spotifyService.getCurrentPlayback().then(state => {
          if (state) {
            console.log('🔄 [FOCUS REFRESH] Updated playback state:', state?.item?.name);
            setPlaybackState(state);
          }
        }).catch(error => {
          console.error('Error refreshing on focus:', error);
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      stopPlaybackMonitoring();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isSpotifyAuthenticated, selectedDevice]);

  // Fetch database narrative when track or position changes
  useEffect(() => {
    // For playlist sessions, ALWAYS show narrative regardless of play/pause state
    // For non-playlist sessions, only show when workout is active (original behavior)
    if (!playbackState?.item) return;
    if (!playlistSessionId && !isWorkoutActive) return;

    const fetchNarrative = async () => {
      console.log(`🔍 [NARRATIVE] Fetching for: "${playbackState.item?.name}" - PlaylistSession: ${playlistSessionId ? 'YES' : 'NO'} - WorkoutActive: ${isWorkoutActive}`);
      const narrative = await getCurrentDatabaseNarrative();
      console.log('📊 Database narrative result:', narrative);
      setCurrentDatabaseNarrative(narrative);
      
      // Handle track changes for persistent narrative service  
      if (playbackState?.item?.id && playbackState.item.id !== previousTrackId) {
        PersistentNarrativeService.onTrackChange(playbackState.item.id);
        setPreviousTrackId(playbackState.item.id);
      }
      
      // Use locked phase mapping instead of dynamic resolution
      if (playlistSessionId) {
        const lockedPhase = await getLockedPhaseForCurrentTrack();
        if (lockedPhase) {
          setCurrentPhaseMatch(lockedPhase);
        }
      } else {
        // Fallback to dynamic resolution if no locked session (backward compatibility)
        await resolveCurrentPhase();
      }
      
      if (!narrative) {
        console.warn('❌ No database narrative found - falling back to hardcoded narratives');
        console.warn('🔍 This is why you see hardcoded text instead of database content');
      }
    };

    fetchNarrative();
  }, [playbackState?.item?.id, playlistSessionId]);

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

    const setupNarrativeTimer = async () => {
      if (workoutPlan && currentTrackPhase && playbackState) {
        // Intelligent timing based on track tempo and structure
        const track = currentTrackPhase.track;
        // Use tempo resolver for accurate BPM data
        const tempoResult = await tempoResolver.getCurrentTrackTempo(
          track.id,
          track.name,
          track.artists?.[0]?.name
        );
        const tempo = tempoResult?.bpm || track.audio_features?.tempo || 120;
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
      }
    };

    if (workoutPlan && currentTrackPhase && playbackState) {
      setupNarrativeTimer();
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
      duration: `${workoutPhases.reduce((total, phase) => total + parseInt(phase.duration || '0'), 0)} min`,
      timestamp: new Date().toISOString()
    };
    
    
    // Auto-end analysis logging session
    await spotifyAnalysisLogger.endWorkoutSession();
    setIsAnalysisLogging(false);
    
    setShowWorkoutCompleteModal(false);
    setIsWorkoutActive(false);
    navigate('/community');
  };

  const handleCloseModal = async () => {
    // Auto-end analysis logging session
    await spotifyAnalysisLogger.endWorkoutSession();
    setIsAnalysisLogging(false);
    
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
  
  // Get workout track from session snapshot for current playing track
  const getWorkoutTrackFromSession = (trackName: string, artistName: string): string | null => {
    if (!sessionSnapshot?.phases) return null;
    
    // Find the phase in the session snapshot that matches this track
    const matchingPhase = sessionSnapshot.phases.find((phase: any) => 
      phase.track_name === trackName && phase.artist_name === artistName
    );
    
    if (matchingPhase) {
      // Convert phase_key back to workout_track format
      const phaseKey = matchingPhase.phase_key;
      const workoutTrackMap: Record<string, string> = {
        'warm_up': 'warmup',
        'sprint': 'sprint_intervals', 
        'climb': 'climb',
        'resistance_track': 'resistance',
        'sprint_jumps': 'jumps',
        'cool_down': 'cooldown'
      };
      return workoutTrackMap[phaseKey] || 'resistance';
    }
    
    return null;
  };

  // Get current database-driven narrative with PERSISTENCE for full workout_track duration  
  const getCurrentDatabaseNarrative = async () => {
    if (!playbackState?.item) return null;

    try {
      // Use PersistentNarrativeService to ensure narrative persists for full track
      const result = await PersistentNarrativeService.getNarrativeForTrack({
        trackId: playbackState.item.id,
        trackName: playbackState.item.name,
        artistName: playbackState.item.artists[0]?.name || 'Unknown Artist',
        currentSectionType: 'verse', // Default section - narrative will persist regardless
        sessionId: playlistSessionId || undefined
      });
      
      if (result) {
        console.log(`✅ [PERSISTENT NARRATIVE] Got ${result.source} narrative that will persist for full track`);
        return {
          text: result.narrativeText,
          workoutTrack: result.workoutTrack,
          songComponent: result.sectionType,
          bpm: null, // Not needed for display
          persistent: result.persistent,
          source: result.source
        };
      }

      // 🔄 FALLBACK: Use dynamic resolution only when no playlist session exists
      console.log(`🔄 [DYNAMIC FALLBACK] No playlist session, using dynamic tempo resolution for "${playbackState.item.name}"`);
      
      const tempoResult = await tempoResolver.getCurrentTrackTempo(
        playbackState.item.id,
        playbackState.item.name,
        playbackState.item.artists[0]?.name
      );
      
      if (!tempoResult) {
        console.warn('❌ Tempo resolver returned null - no tempo available');
        return null;
      }

      const bpm = tempoResult.bpm;
      console.log(`🎵 [FALLBACK] Resolved tempo: ${bpm} BPM (source: ${tempoResult.source}, confidence: ${tempoResult.confidence})`);

      // Use dynamic BPM-based workout track determination (fallback only)
      let workoutTrack: string;
      if (bpm >= 140 && bpm <= 200) {
        workoutTrack = 'sprint_intervals';
      } else if (bpm >= 120 && bpm <= 139) {
        workoutTrack = 'jumps';
      } else if (bpm >= 95 && bpm <= 119) {
        workoutTrack = 'resistance';
      } else if (bpm >= 80 && bpm <= 94) {
        workoutTrack = 'climb';
      } else if (bpm >= 70 && bpm <= 79) {
        workoutTrack = 'warmup';
      } else if (bpm >= 60 && bpm <= 69) {
        workoutTrack = 'cooldown';
      } else {
        console.warn(`⚠️ BPM ${bpm} outside known ranges for track: ${playbackState.item.name}`);
        workoutTrack = 'resistance'; // Default fallback
      }
      console.log(`🎯 [FALLBACK] Dynamic BPM mapping: ${bpm} BPM → workout_track: ${workoutTrack}`);
      
      // Session snapshot override temporarily disabled to ensure BPM-based accuracy
      // TODO: Fix session snapshot data to match BPM ranges

      // Get current song section from streaming_vendor_attributes
      const currentTime = playbackState.progress_ms / 1000;
      const trackName = playbackState.item.name;
      const artistName = playbackState.item.artists[0]?.name;
      
      console.log(`🔍 Looking for section data: "${trackName}" by "${artistName}" at ${playbackState.progress_ms}ms`);
      
      // First check if any data exists for this track
      const { data: trackExists, error: trackExistsError } = await supabase
        .from('streaming_vendor_attributes')
        .select('track_name, artist_name, section_type, section_number, timestamp_ms')
        .eq('track_name', trackName)
        .eq('artist_name', artistName)
        .limit(5);
        
      let songComponent = 'verse'; // Default section
      
      if (trackExists && trackExists.length > 0) {
        console.log(`✅ Found ${trackExists.length} entries for "${trackName}" by "${artistName}":`, trackExists);
        
        // Try to get current section from streaming_vendor_attributes
        const { data: sectionData, error: sectionError } = await supabase
          .from('streaming_vendor_attributes')
          .select('section_type, section_number')
          .eq('track_name', trackName)
          .eq('artist_name', artistName)
          .eq('event_type', 'section_change')
          .lte('timestamp_ms', playbackState.progress_ms)
          .order('timestamp_ms', { ascending: false })
          .limit(1)
          .single();

        if (sectionData?.section_type) {
          const rawSongComponent = sectionData.section_type;
          const sectionNumber = sectionData.section_number || 1;
          
          // Determine the correct song component based on section_number from database
          const baseSection = rawSongComponent.replace('-', '_'); // pre-chorus → pre_chorus
          songComponent = baseSection;
          
          // For verses and choruses beyond the first occurrence, use numbered narratives
          if ((baseSection === 'verse' || baseSection === 'chorus') && sectionNumber > 1) {
            songComponent = `${baseSection}_${sectionNumber}`;
          }
          
          console.log(`🎵 Found section data: ${rawSongComponent} (section ${sectionNumber}) → normalized: ${songComponent}`);
        } else {
          console.log(`🔍 No section data found for current timestamp, using default: ${songComponent}`);
        }
      } else {
        console.log(`🔍 No entries found in streaming_vendor_attributes for "${trackName}" by "${artistName}", using default section: ${songComponent}`);
      }

      // Get narrative from instruction_narratives table with fallback
      let { data: narrativeData, error: narrativeError } = await supabase
        .from('instruction_narratives')
        .select('text')
        .eq('workout_track', workoutTrack)
        .eq('song_component', songComponent)
        .limit(1)
        .single();
      
      // If numbered section not found, fallback to base section
      if (narrativeError && songComponent.includes('_')) {
        console.log(`🔄 Numbered section ${songComponent} not found, trying base section ${baseSection}`);
        const { data: baseData, error: baseError } = await supabase
          .from('instruction_narratives')
          .select('text')
          .eq('workout_track', workoutTrack)
          .eq('song_component', baseSection)
          .limit(1)
          .single();
        
        narrativeData = baseData;
        narrativeError = baseError;
      }

      if (narrativeError || !narrativeData?.text) {
        console.warn(`❌ No narrative found for ${workoutTrack} + ${songComponent} (or base ${baseSection})`);
        return null;
      }

      console.log(`✅ Database narrative: ${narrativeData.text}`);
      return { text: narrativeData.text, workoutTrack, songComponent, bpm };

    } catch (error) {
      console.error('Error fetching database narrative:', error);
      return null;
    }
  };

  // Resolve current track's phase using new phase resolution system
  const resolveCurrentPhase = async () => {
    if (!playbackState?.item) return;

    try {
      console.log(`🎯 [PHASE RESOLUTION] Resolving phase for: "${playbackState.item.name}" by "${playbackState.item.artists[0]?.name}"`);
      
      const phaseMatch = await resolvePhaseForTrack({
        trackId: playbackState.item.id,
        vendor: 'spotify',
        positionMs: playbackState.progress_ms || 0
      });
      
      setCurrentPhaseMatch(phaseMatch);
      console.log(`✅ [PHASE RESOLUTION] Resolved:`, phaseMatch);
      
    } catch (error) {
      console.error('❌ [PHASE RESOLUTION] Error resolving phase:', error);
      setCurrentPhaseMatch({
        bpm: null,
        bmpConfidence: null,
        bmpSource: 'unknown',
        phase_code: 'recovery',
        phase_name: 'Recovery',
        reason: 'Error during phase resolution - defaulted to recovery'
      });
    }
  };

  // Generate workout plan from locked phase mappings (for compatibility with existing UI)
  const generateWorkoutPlanFromMappings = (tracks: SpotifyTrack[], mappings: TrackPhaseMapping[], playlistId: string): WorkoutPlan => {
    const phases: TrackPhaseMapping[] = [];
    let currentTime = 0;
    
    // Create phase mappings for each valid track
    mappings.forEach((mapping) => {
      if (mapping.validBpm && mapping.phase_code) {
        const track = tracks.find(t => t.id === mapping.trackId);
        if (track) {
          const duration = track.duration_ms / 1000;
          
          phases.push({
            track,
            phase: {
              type: mapping.phase_code as any, // Map to old interface
              name: mapping.phase_name || mapping.phase_code,
              duration,
              targetTempo: mapping.bpm || 120,
              energyLevel: getEnergyLevelFromBPM(mapping.bpm || 120),
              narratives: [`${mapping.phase_name}: ${mapping.bpm} BPM - ${mapping.reason}`],
              beatCues: []
            },
            startTime: currentTime,
            endTime: currentTime + duration,
            confidence: 1.0 // Locked mappings have full confidence
          });
          
          currentTime += duration;
        }
      }
    });
    
    console.log(`🎯 [WORKOUT PLAN] Generated plan with ${phases.length} phases from ${mappings.length} mappings`);
    
    // CRITICAL FIX: If no valid phases generated, fallback to basic plan to ensure Spotify works
    if (phases.length === 0) {
      console.warn('⚠️ [WORKOUT PLAN] No valid phases from mapping, creating fallback plan for Spotify playback');
      
      // Create basic phases from tracks to ensure Spotify playback works
      currentTime = 0;
      tracks.slice(0, 5).forEach((track, index) => { // Limit to first 5 tracks for safety
        const duration = track.duration_ms / 1000;
        phases.push({
          track,
          phase: {
            type: 'resistance',
            name: 'Workout',
            duration,
            targetTempo: 120,
            energyLevel: 'medium',
            narratives: ['Keep going!'],
            beatCues: []
          },
          startTime: currentTime,
          endTime: currentTime + duration,
          confidence: 0.5 // Lower confidence for fallback
        });
        currentTime += duration;
      });
    }
    
    return {
      totalDuration: currentTime,
      phases,
      playlistId,
      workoutType: 'spinning'
    };
  };

  // Helper to determine energy level from BPM
  const getEnergyLevelFromBPM = (bpm: number): 'low' | 'medium' | 'high' => {
    if (bpm < 80) return 'low';
    if (bpm < 120) return 'medium';
    return 'high';
  };

  // Get locked phase for current track (replaces dynamic resolution)
  const getLockedPhaseForCurrentTrack = async (): Promise<PhaseMatch | null> => {
    if (!playbackState?.item?.id || !playlistSessionId) return null;

    try {
      const lockedMapping = await getLockedPhaseForTrack(playbackState.item.id, playlistSessionId);
      
      if (lockedMapping) {
        console.log(`🔒 [LOCKED PHASE] Using locked mapping for ${playbackState.item.name}: ${lockedMapping.phase_name}`);
        
        return {
          bpm: lockedMapping.bpm,
          bpmConfidence: 1.0, // Locked mappings have full confidence
          bpmSource: 'track',
          phase_code: lockedMapping.phase_code,
          phase_name: lockedMapping.phase_name,
          reason: `Locked: ${lockedMapping.reason}`
        };
      }
      
      return null;
    } catch (error) {
      console.error('❌ [LOCKED PHASE] Error getting locked phase:', error);
      return null;
    }
  };

  return (
    <div className="min-h-screen bg-premium-texture flex flex-col">
      {/* Header */}
      <Header title="Music Sync" />
      
      <div className="flex-1 px-4">

        {/* Enhanced Analysis Notification */}
        {enhancedAnalysisEnabled && (
          <div className="mx-auto max-w-4xl mb-6">
            <Card className="border-orange-200 bg-orange-50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                    <div>
                      <p className="text-orange-800 font-medium text-sm">
                        ⚠️ Enhanced Analysis Temporarily Disabled
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={() => setEnhancedAnalysisEnabled(false)}
                    variant="ghost"
                    size="sm"
                    className="text-orange-600 hover:text-orange-800"
                  >
                    ×
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

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
                  cursor-pointer transition-smooth shadow-card border-2
                  ${selectedService === service.id
                    ? 'border-burgundy-dark !bg-burgundy-dark'
                    : 'border-cream/30 bg-card-texture hover:border-cream/60'
                  }
                `}
                style={selectedService === service.id ? { backgroundColor: 'hsl(var(--burgundy-dark))' } : {}}
              >
                <CardContent className="p-4" style={selectedService === service.id ? { backgroundColor: 'transparent' } : {}}>
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-lg ${service.color} flex items-center justify-center`}>
                      <span className="text-white text-lg">{service.icon}</span>
                    </div>
                    <span className={`font-medium text-lg ${
                      selectedService === service.id ? 'text-cream' : 'text-primary'
                    }`}>{service.name}</span>
                    <div className="ml-auto">
                      <div className={`
                        w-6 h-6 rounded-full border-2 flex items-center justify-center
                        ${selectedService === service.id
                          ? 'border-cream bg-cream'
                          : 'border-cream/50'
                        }
                      `}>
                        {selectedService === service.id && (
                          <span className="text-burgundy-dark text-sm">✓</span>
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
                      cursor-pointer transition-smooth shadow-card border-2
                      ${selectedPlaylist === playlist.id && !isLoginRequired
                        ? 'border-burgundy-dark !bg-burgundy-dark'
                        : isLoginRequired
                        ? 'border-green-500/50 bg-card-texture hover:border-green-500'
                        : 'border-cream/30 bg-card-texture hover:border-cream/60'
                      }
                    `}
                    style={selectedPlaylist === playlist.id && !isLoginRequired ? { backgroundColor: 'hsl(var(--burgundy-dark))' } : {}}
                  >
                    <CardContent className="p-4" style={selectedPlaylist === playlist.id && !isLoginRequired ? { backgroundColor: 'transparent' } : {}}>
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className={`font-medium text-lg ${
                            selectedPlaylist === playlist.id && !isLoginRequired
                              ? 'text-cream'
                              : 'text-primary'
                          }`}>{playlist.name}</h4>
                          <p className={`text-sm ${
                            selectedPlaylist === playlist.id && !isLoginRequired
                              ? 'text-cream/70'
                              : 'text-primary/70'
                          }`}>
                            {playlist.tracks > 0 ? `${playlist.tracks} tracks • ` : ''}{playlist.genre}
                          </p>
                        </div>
                        {!isLoginRequired && (
                          <div className={`
                            w-6 h-6 rounded-full border-2 flex items-center justify-center
                            ${selectedPlaylist === playlist.id
                              ? 'border-cream bg-cream'
                              : 'border-cream/50'
                            }
                          `}>
                            {selectedPlaylist === playlist.id && (
                              <span className="text-burgundy-dark text-sm">✓</span>
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
                        className="w-1 bg-energy-gradient rounded-full"
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
                  
                  {/* Real-time Section Display - WITHOUT redundant PT narratives */}
                  <div className="mb-6">
                    <RealtimeSectionDisplay
                      currentTrack={playbackState?.item}
                      currentPositionMs={playbackState?.progress_ms}
                      isPlaying={isPlaying}
                      className="mb-4"
                      spotifyMetadata={{
                        tempo: playbackState?.item?.tempo,
                        energy: playbackState?.item?.energy,
                        danceability: playbackState?.item?.danceability,
                        key: playbackState?.item?.key,
                        mode: playbackState?.item?.mode
                      }}
                      rapidApiData={undefined}
                      hidePTNarrative={true}
                    />
                    
                  </div>
                  
                  {/* 🔍 API Data Debug Panel - Only show when ?debug=true */}
                  {new URLSearchParams(window.location.search).get('debug') === 'true' && (
                    <div className="mb-4 p-3 bg-gray-900/50 border border-gray-600 rounded-lg text-xs">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="font-bold text-blue-400 mb-2">🎵 Track Info</div>
                          <div className="space-y-1">
                            <div>Name: {playbackState?.item?.name || 'N/A'}</div>
                            <div>Artist: {playbackState?.item?.artists?.[0]?.name || 'N/A'}</div>
                            <div>Duration: {playbackState?.item?.duration_ms ? Math.round(playbackState.item.duration_ms / 1000) + 's' : 'N/A'}</div>
                            <div>Position: {playbackState?.progress_ms ? Math.round(playbackState.progress_ms / 1000) + 's' : 'N/A'}</div>
                          </div>
                        </div>
                        <div>
                          <div className="font-bold text-green-400 mb-2">🎹 RapidAPI Data</div>
                          <div className="text-yellow-400">No RapidAPI data available</div>
                        </div>
                        <div className="col-span-2 mt-2 pt-2 border-t border-gray-600">
                          <div className="font-bold text-purple-400 mb-2">🧠 Section Analysis Source</div>
                          <div className="text-orange-300">
                            Check console for detailed sectional analysis logs and data sources
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="space-y-3">
                    {/* Coaching Narrative Display */}
                    {(() => {
                      // ONLY show database narratives - no hardcoded fallbacks 
                      const narrativeToShow = currentDatabaseNarrative?.text;
                      
                      return narrativeToShow ? (
                        <div className="relative">
                          
                          {/* Enhanced animation container */}
                          <div 
                            key={`${currentDatabaseNarrative?.text}-${Date.now()}`}
                            className="pt-narrative-container bg-gradient-to-r from-primary/95 to-primary/80 text-white p-12 rounded-2xl border-4 border-primary/60 shadow-2xl relative overflow-hidden"
                          >
                            {/* Workout track indicator */}
                            {currentDatabaseNarrative?.workoutTrack && (
                              <div className="flex items-center justify-between mb-4">
                                <span className="text-lg uppercase tracking-wide font-bold opacity-90 bg-white/20 px-4 py-2 rounded-lg">
                                  {currentDatabaseNarrative.workoutTrack.replace('_', ' ')}
                                </span>
                                {currentDatabaseNarrative.bpm && (
                                  <span className="text-lg bg-white/20 px-4 py-2 rounded-lg font-semibold">
                                    {Math.round(currentDatabaseNarrative.bpm)} BPM
                                  </span>
                                )}
                              </div>
                            )}
                            
                            {/* NEW: Phase Tracking Display */}
                            {phaseTracking.currentPhase && (
                              <div className="mb-4 p-3 bg-white/10 rounded-lg border border-white/20">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-semibold text-white/90">
                                    {phaseTracking.currentPhase.error ? (
                                      <span className="text-red-300">❌ Phase Error</span>
                                    ) : (
                                      phaseTracking.currentPhase.workout_track || 'No Phase'
                                    )}
                                  </span>
                                  {phaseTracking.currentPhase.progress_ms && phaseTracking.currentPhase.duration_ms && (
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm text-white/80">
                                        {Math.floor(phaseTracking.currentPhase.progress_ms / 1000)}s / {Math.floor(phaseTracking.currentPhase.duration_ms / 1000)}s
                                      </span>
                                      {phaseTracking.currentPhase.phase_locked && (
                                        <span className="text-xs px-2 py-1 bg-green-500/30 rounded text-green-200">
                                          LOCKED
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                                <div className="text-xs text-white/70 mt-1">
                                  {phaseTracking.currentPhase.error ? (
                                    <span className="text-red-300">{phaseTracking.currentPhase.error}</span>
                                  ) : (
                                    `Track: ${phaseTracking.currentPhase.track_name} | Section: ${phaseTracking.currentPhase.section_type || 'Unknown'}`
                                  )}
                                </div>
                              </div>
                            )}
                            
                            {/* Legacy Phase Resolution Display (fallback) */}
                            {!phaseTracking.currentPhase && currentPhaseMatch && (
                              <div className="mb-4 p-3 bg-white/10 rounded-lg border border-white/20">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-semibold text-white/90">
                                    {currentPhaseMatch.phase_name || 'Unknown Phase'}
                                  </span>
                                  {currentPhaseMatch.bpm && (
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm text-white/80">
                                        {Math.round(currentPhaseMatch.bpm)} BPM
                                      </span>
                                      {currentPhaseMatch.bpmConfidence && (
                                        <span className="text-xs px-2 py-1 bg-white/20 rounded text-white/80">
                                          {Math.round(currentPhaseMatch.bpmConfidence * 100)}%
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                                <div className="text-xs text-white/70 mt-1">
                                  {currentPhaseMatch.reason}
                                </div>
                              </div>
                            )}
                            
                            {/* Main narrative text with enhanced styling */}
                            <p className="text-2xl font-bold text-center leading-relaxed text-cream">
                              "{narrativeToShow}"
                            </p>
                            
                            {/* Song component indicator */}
                            {currentDatabaseNarrative?.songComponent && (
                              <div className="mt-3 text-center">
                                <span className="text-sm bg-white/30 px-3 py-2 rounded-lg uppercase tracking-wide">
                                  {currentDatabaseNarrative.songComponent.replace('_', ' ')}
                                </span>
                              </div>
                            )}
                            
                            {/* Static bottom bar */}
                            <div className="mt-6 h-2 bg-gradient-to-r from-white/0 via-white/80 to-white/0 rounded-full" />
                          </div>
                          
                          {/* Static glow effect */}
                          <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-primary/30 to-primary/20 rounded-xl -z-10" />
                        </div>
                      ) : null;
                    })()}
                    
                    {/* Enhanced Music Player */}
                    <div className="bg-burgundy-dark/30 rounded-lg p-5 border border-cream/30">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 bg-energy-gradient rounded-full flex items-center justify-center ${isPlaying ? 'shadow-glow' : ''}`}>
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
                          isPlaying ? '' : 'opacity-50'
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
                            ? 'border-burgundy-dark bg-burgundy-dark text-cream'
                            : 'border-cream/30 text-primary hover:border-cream/50'
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
                            <p className={`font-medium ${
                              selectedDevice === device.id
                                ? 'text-cream'
                                : 'text-gray-900'
                            }`}>{device.name}</p>
                            <p className={`text-xs opacity-70 ${
                              selectedDevice === device.id
                                ? 'text-cream/70'
                                : 'text-gray-800'
                            }`}>
                              {device.type} {device.is_active ? '(Active)' : ''}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs opacity-60 ${
                            selectedDevice === device.id
                              ? 'text-cream/60'
                              : 'text-gray-700'
                          }`}>{device.volume_percent}%</span>
                          {selectedDevice === device.id && (
                            <span className="text-sm text-cream">✓</span>
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
                onClick={() => {
                  console.log('🏋️ [DEBUG] Start Workout button clicked!');
                  handleStartWorkout();
                }}
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
                    ~{workoutPhases.reduce((total, phase) => total + parseInt(phase.duration || '0'), 0)} min
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
      
      {/* Eliminated Web Audio Intelligence Status */}
      
      {/* Research Lab Toggle */}
      {isAnalysisLogging && (
        <div className="fixed bottom-20 right-4 z-50">
          <Button
            onClick={() => setShowResearchLab(!showResearchLab)}
            className={showResearchLab 
              ? "bg-red-600 hover:bg-red-700 text-white shadow-lg" 
              : "bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
            }
            size="sm"
          >
            {showResearchLab ? '🔬 Hide Lab' : '🔬 Research Lab'}
          </Button>
        </div>
      )}
      
      {/* Research Lab Overlay */}
      {showResearchLab && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={() => setShowResearchLab(false)}>
          <div className="fixed inset-4 bg-premium-texture rounded-lg shadow-2xl z-50 overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="h-full flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-cream/20">
                <h2 className="text-xl font-bold text-cream">Live Research Lab</h2>
                <Button
                  onClick={() => setShowResearchLab(false)}
                  variant="ghost"
                  size="sm"
                  className="text-cream hover:bg-cream/20"
                >
                  ✕
                </Button>
              </div>
              <div className="flex-1 overflow-hidden">
                {/* Analysis viewer removed per user request */}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Playback Sync Debug Overlay (VITE_DEBUG=1 only) */}
      {import.meta.env.VITE_DEBUG === '1' && (
        <div className="fixed top-4 right-4 bg-black/90 text-white p-4 rounded-lg text-xs font-mono z-50 max-w-sm">
          <h4 className="font-bold text-green-400 mb-2">🔍 Playback Sync Debug</h4>
          <div className="space-y-1">
            <div><strong>Device:</strong> {selectedDevice || 'None'}</div>
            <div><strong>Track ID:</strong> {playbackState?.item?.id || 'None'}</div>
            <div><strong>Track:</strong> {playbackState?.item?.name || 'None'}</div>
            <div><strong>Server Progress:</strong> {playbackState?.progress_ms || 0}ms</div>
            <div><strong>Smooth Progress:</strong> {Math.round(smoothProgress)}ms</div>
            <div><strong>Duration:</strong> {playbackState?.item?.duration_ms || 0}ms</div>
            <div><strong>Playing:</strong> {playbackState?.is_playing ? 'Yes' : 'No'}</div>
            <div><strong>Last Sync:</strong> {lastSyncTime ? new Date(lastSyncTime).toISOString().split('T')[1].split('.')[0] : 'Never'}</div>
            <div><strong>Sync Age:</strong> {lastSyncTime ? Math.round((Date.now() - lastSyncTime) / 1000) : 0}s</div>
            <div><strong>Poll Interval:</strong> {parseInt(import.meta.env.VITE_MUSIC_SYNC_POLL_INTERVAL_MS) || 8000}ms</div>
            <div><strong>Source:</strong> poll:/me/player</div>
            <div><strong>Phase:</strong> {currentDatabaseNarrative?.workoutTrack || 'None'}</div>
            <div><strong>BPM:</strong> {currentDatabaseNarrative?.bpm || 'None'}</div>
            <div><strong>Narrative Visible:</strong> {currentDatabaseNarrative ? 'Yes' : 'No'}</div>
            {Math.abs((smoothProgress || 0) - (playbackState?.progress_ms || 0)) > 1500 && (
              <div className="text-yellow-400"><strong>⚠️ SEEK DETECTED</strong></div>
            )}
          </div>
        </div>
      )}

      {/* Debug Components (only show when explicitly requested with ?debug=true) */}
      {new URLSearchParams(window.location.search).get('debug') === 'true' && (
        <DebugPanel />
      )}
    </div>
  );
};

export default MusicSync;