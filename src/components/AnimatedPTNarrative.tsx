import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import basslineLogoYellow from '../assets/bassline-logo-yellow.png';

interface PTNarrativeProps {
  currentSection?: {
    sectionType: string;
    sectionNumber?: number;
    rawSectionType?: string;
  };
  currentTrack?: {
    name: string;
    artists: Array<{ name: string }>;
    audio_features?: {
      tempo?: number;
    };
  };
}

interface InstructionNarrative {
  id: string;
  workout_track: string;
  song_component: string;
  text: string;
}

export const AnimatedPTNarrative: React.FC<PTNarrativeProps> = ({ 
  currentSection, 
  currentTrack 
}) => {
  const [narrative, setNarrative] = useState<string>('');
  const [workoutTrack, setWorkoutTrack] = useState<string>('');
  // Animation key removed to prevent pulsing effects
  const [showNarrative, setShowNarrative] = useState<boolean>(false);
  const [detectedBPM, setDetectedBPM] = useState<number | null>(null);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const updateTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // Map section_type to song_component
  const mapSectionToComponent = (sectionType: string, sectionNumber?: number): string => {
    const section = sectionType.toLowerCase();
    
    if (section.includes('verse')) {
      if (sectionNumber === 2 || section.includes('2')) return 'verse_2';
      if (sectionNumber === 3 || section.includes('3')) return 'verse_3';
      return 'verse';
    }
    
    if (section.includes('chorus')) {
      if (sectionNumber === 2 || section.includes('2')) return 'chorus_2';
      if (sectionNumber === 3 || section.includes('3')) return 'chorus_3';
      return 'chorus';
    }
    
    if (section.includes('pre_chorus') || section.includes('prechorus')) return 'pre_chorus';
    if (section.includes('breakdown')) return 'breakdown';
    if (section.includes('end_of_bar') || section.includes('bar_end')) return 'end_of_bar';
    if (section.includes('bridge')) return 'bridge';
    if (section.includes('intro')) return 'intro';
    if (section.includes('outro')) return 'outro';
    
    return section;
  };

  // Get BPM from streaming_vendor_attributes table for the current track
  const fetchTrackBPM = async (trackName: string, artistName: string): Promise<number | null> => {
    try {
      console.log(`🎵 Fetching BPM for: "${trackName}" by "${artistName}"`);
      
      const { data, error } = await supabase
        .from('streaming_vendor_attributes')
        .select('spotify_tempo')
        .eq('track_name', trackName)
        .eq('artist_name', artistName)
        .not('spotify_tempo', 'is', null)
        .limit(1)
        .single();

      if (error || !data?.spotify_tempo) {
        console.log('⚠️ No BPM found in streaming_vendor_attributes, using fallback');
        return null;
      }

      console.log(`✅ Found BPM in database: ${data.spotify_tempo}`);
      return data.spotify_tempo;
    } catch (err) {
      console.error('❌ Error fetching BPM:', err);
      return null;
    }
  };

  // Intelligent workout track mapping based on BPM ranges from workout_phases table
  const getWorkoutTrackFromTempo = async (tempo?: number): Promise<string> => {
    // If no tempo, try to get it from database first
    if (!tempo && currentTrack) {
      const dbBPM = await fetchTrackBPM(
        currentTrack.name,
        currentTrack.artists?.[0]?.name || ''
      );
      setDetectedBPM(dbBPM);
      tempo = dbBPM || undefined;
    }
    
    if (!tempo) {
      console.log('❌ CRITICAL: No BPM available for workout mapping!');
      console.log('🔍 Available data:', { 
        trackName: currentTrack?.name, 
        dbBPM, 
        spotifyBPM: currentTrack?.audio_features?.tempo,
        fallbackBPM: currentTrack?.tempo 
      });
      console.log('⚠️ Defaulting to recovery - this is the bug!');
      return 'recovery';
    }
    
    console.log(`🎯 Mapping BPM ${tempo} to workout track`);
    
    // Updated BPM ranges to handle high-energy rock songs like The Pretender (172 BPM)
    if (tempo >= 160) {
      console.log(`✅ Mapped to sprint_intervals (160+ BPM) - High energy like The Pretender ${tempo}`);
      return 'sprint_intervals';
    }
    if (tempo >= 140 && tempo < 160) {
      console.log('✅ Mapped to sprint_intervals (140-159 BPM)');
      return 'sprint_intervals';  
    }
    if (tempo >= 120 && tempo < 140) {
      console.log('✅ Mapped to jumps (120-139 BPM)');
      return 'jumps';
    }
    if (tempo >= 95 && tempo < 120) {
      console.log('✅ Mapped to hills (95-119 BPM)');
      return 'hills';
    }
    if (tempo >= 85 && tempo < 95) {
      console.log('✅ Mapped to resistance (85-94 BPM)');
      return 'resistance';
    }
    if (tempo >= 80 && tempo < 85) {
      console.log('✅ Mapped to climb (80-84 BPM)');
      return 'climb';
    }
    if (tempo >= 70 && tempo < 80) {
      console.log('✅ Mapped to warmup (70-79 BPM)');
      return 'warmup';
    }
    if (tempo >= 60 && tempo < 70) {
      console.log('✅ Mapped to cooldown (60-69 BPM)');
      return 'cooldown';
    }
    
    console.log(`⚠️ BPM ${tempo} doesn't fit standard ranges, using recovery`);
    return 'recovery';
  };

  // Fetch narrative from database
  const fetchNarrative = async (workoutTrack: string, songComponent: string) => {
    try {
      console.log(`🎯 Fetching narrative: ${workoutTrack} + ${songComponent}`);
      
      const { data, error } = await supabase
        .from('instruction_narratives')
        .select('text')
        .eq('workout_track', workoutTrack)
        .eq('song_component', songComponent)
        .single();

      if (error) {
        console.warn('⚠️ No narrative found:', error.message);
        return `Keep going with ${workoutTrack} energy!`;
      }

      return data?.text || `Power through this ${songComponent} section!`;
    } catch (err) {
      console.error('❌ Error fetching narrative:', err);
      return `Stay strong during this ${songComponent}!`;
    }
  };

  // Update narrative when section changes (with debounce to prevent seek/skip issues)
  useEffect(() => {
    if (!currentSection?.sectionType) return;

    // Clear any pending updates
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }

    // Debounce updates to prevent narrative disappearing on seeks (500ms grace period)
    updateTimeoutRef.current = setTimeout(async () => {
      setIsUpdating(true);
      
      const updateNarrative = async () => {
        const tempo = currentTrack?.audio_features?.tempo || currentTrack?.tempo;
        const newWorkoutTrack = await getWorkoutTrackFromTempo(tempo);
        const songComponent = mapSectionToComponent(
          currentSection.rawSectionType || currentSection.sectionType, 
          currentSection.sectionNumber
        );

        setWorkoutTrack(newWorkoutTrack);

        const narrativeText = await fetchNarrative(newWorkoutTrack, songComponent);
        
        // Instead of hiding during animation, show loading state
        if (!showNarrative) {
          setShowNarrative(true);
        }
        
        setNarrative(narrativeText);
        setIsUpdating(false);
      };

      await updateNarrative();
    }, 500); // 500ms debounce to handle rapid seeks
    
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, [currentSection?.sectionType, currentSection?.sectionNumber, currentTrack?.name, currentTrack?.artists]);

  // Debug panel (guarded by VITE_DEBUG)
  useEffect(() => {
    if (import.meta.env.VITE_DEBUG === '1') {
      setDebugInfo({
        trackId: currentTrack?.name,
        trackName: currentTrack?.name,
        artistName: currentTrack?.artists?.[0]?.name,
        detectedBPM,
        spotifyTempo: currentTrack?.audio_features?.tempo,
        computedWorkoutPhase: workoutTrack,
        currentSectionType: currentSection?.sectionType,
        narrativeVisible: showNarrative,
        narrativeText: narrative?.substring(0, 50) + '...',
        timestamp: new Date().toISOString()
      });
    }
  }, [currentTrack, detectedBPM, workoutTrack, currentSection, showNarrative, narrative]);

  if (!narrative || !currentSection) {
    // Show debug info even when narrative is hidden
    if (import.meta.env.VITE_DEBUG === '1') {
      return (
        <div className="mt-4 p-4 bg-red-100 border border-red-300 rounded">
          <h4 className="font-bold text-red-800">🐛 PT Narrative Debug - HIDDEN</h4>
          <div className="text-sm text-red-600">
            <div>Reason: {!narrative ? 'No narrative' : 'No current section'}</div>
            <div>Track: {currentTrack?.name || 'None'}</div>
            <div>BPM: {detectedBPM || currentTrack?.audio_features?.tempo || 'Unknown'}</div>
            <div>Phase: {workoutTrack || 'None'}</div>
            <div>Section: {currentSection?.sectionType || 'None'}</div>
          </div>
        </div>
      );
    }
    return null;
  }

  return (
    <div className="mt-4">
      {/* TESTING: This should be visible */}
      <div className="bg-red-500 text-white p-4 mb-2 text-center font-bold">
        🚨 ANIMATEDPTNARRATIVE COMPONENT IS RENDERING 🚨
      </div>
      
      {/* PT Narrative Display with Animations */}
      <div className="">
        <div className="relative">
          {/* Artistic Background with Yellow Logo */}
          <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-primary/30 to-primary/20 rounded-2xl" />
          <div className="absolute top-6 right-6 opacity-50">
            <div className="bg-yellow-400/20 p-4 rounded-xl">
              <img 
                src={basslineLogoYellow} 
                alt="Bassline Background" 
                className="h-40 w-40 transform rotate-12 drop-shadow-2xl"
                onError={(e) => {
                  console.error('Failed to load background yellow logo:', e);
                  e.currentTarget.parentElement.innerHTML = '<div class="text-yellow-400 text-6xl">N</div>';
                }}
                onLoad={() => console.log('Background yellow logo loaded successfully')}
              />
            </div>
          </div>
          
          {/* Main Content */}
          <div className="relative bg-gradient-to-r from-primary/95 to-primary/80 text-white p-12 rounded-2xl border-4 border-primary/60 shadow-2xl overflow-hidden">
            {/* Header with Workout Track */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="bg-yellow-400 p-2 rounded-lg">
                  <div className="text-black font-bold text-xs">LOGO HERE:</div>
                  <img 
                    src={basslineLogoYellow} 
                    alt="Bassline Logo" 
                    className="h-16 w-16"
                    onError={(e) => {
                      console.error('❌ HEADER LOGO FAILED TO LOAD:', basslineLogoYellow);
                      e.currentTarget.outerHTML = '<div class="h-16 w-16 bg-red-500 flex items-center justify-center text-white font-bold">FAIL</div>';
                    }}
                    onLoad={() => console.log('✅ HEADER LOGO LOADED:', basslineLogoYellow)}
                  />
                </div>
                <span className="text-lg uppercase tracking-wide font-bold opacity-90">
                  {workoutTrack.replace('_', ' ')}
                </span>
              </div>
              {(detectedBPM || currentTrack?.audio_features?.tempo || currentTrack?.tempo) && (
                <span className="text-lg bg-white/20 px-4 py-2 rounded-lg font-semibold">
                  {Math.round(detectedBPM || currentTrack?.audio_features?.tempo || currentTrack?.tempo || 0)} BPM
                </span>
              )}
            </div>
            
            {/* Animated Narrative Text with loading state */}
            <div className="pt-narrative-text text-2xl font-bold leading-relaxed">
              {isUpdating ? (
                <span className="italic text-white/70">Loading...</span>
              ) : (
                <span className="italic">"{narrative}"</span>
              )}
            </div>
            
            {/* Animated Bottom Bar */}
            <div className="mt-6 h-2 bg-gradient-to-r from-white/0 via-white/80 to-white/0 rounded-full" />
          </div>
          
          {/* Clean animations without emoticons */}
        </div>
      </div>
      
      {/* Debug Panel (VITE_DEBUG=1 only) */}
      {import.meta.env.VITE_DEBUG === '1' && debugInfo && (
        <div className="mt-4 p-4 bg-yellow-100 border border-yellow-300 rounded text-black text-xs">
          <h4 className="font-bold text-yellow-800 mb-2">🐛 PT Narrative Debug Panel</h4>
          <div className="grid grid-cols-2 gap-2">
            <div><strong>Track:</strong> {debugInfo.trackName}</div>
            <div><strong>Artist:</strong> {debugInfo.artistName}</div>
            <div><strong>DB BPM:</strong> {debugInfo.detectedBPM || 'None'}</div>
            <div><strong>Spotify BPM:</strong> {debugInfo.spotifyTempo || 'None'}</div>
            <div><strong>Computed Phase:</strong> {debugInfo.computedWorkoutPhase}</div>
            <div><strong>Section:</strong> {debugInfo.currentSectionType}</div>
            <div><strong>Narrative Visible:</strong> {debugInfo.narrativeVisible ? 'Yes' : 'No'}</div>
            <div><strong>Narrative:</strong> {debugInfo.narrativeText}</div>
          </div>
          <div className="mt-2 text-xs text-yellow-700">
            Last updated: {debugInfo.timestamp}
          </div>
        </div>
      )}
      
      {/* Section Info */}
      <div className="mt-2 text-center">
        <span className="text-xs text-gray-400 bg-black/20 px-2 py-1 rounded">
          {currentSection.rawSectionType || currentSection.sectionType}
          {currentSection.sectionNumber && currentSection.sectionNumber > 1 && ` ${currentSection.sectionNumber}`}
        </span>
      </div>
    </div>
  );
};