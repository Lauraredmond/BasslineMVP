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

  // Update narrative when section changes
  useEffect(() => {
    if (!currentSection?.sectionType) return;

    const updateNarrative = async () => {
      const tempo = currentTrack?.audio_features?.tempo || currentTrack?.tempo;
      const newWorkoutTrack = await getWorkoutTrackFromTempo(tempo);
      const songComponent = mapSectionToComponent(
        currentSection.rawSectionType || currentSection.sectionType, 
        currentSection.sectionNumber
      );

      setWorkoutTrack(newWorkoutTrack);

      const narrativeText = await fetchNarrative(newWorkoutTrack, songComponent);
      setShowNarrative(false); // Start exit animation
      
      setTimeout(() => {
        setNarrative(narrativeText);
        // Animation key increment removed
        setShowNarrative(true); // Start enter animation
      }, 300);
    };

    updateNarrative();
  }, [currentSection?.sectionType, currentSection?.sectionNumber, currentTrack?.name, currentTrack?.artists]);

  if (!narrative || !currentSection) return null;

  return (
    <div className="mt-4">
      {/* PT Narrative Display with Animations */}
      <div className="">
        <div className="relative">
          {/* Artistic Background with Yellow Logo */}
          <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-primary/30 to-primary/20 rounded-2xl" />
          <div className="absolute top-4 right-4 opacity-10">
            <img 
              src={basslineLogoYellow} 
              alt="Bassline Background" 
              className="h-24 w-24 transform rotate-12"
            />
          </div>
          
          {/* Main Content */}
          <div className="relative bg-gradient-to-r from-primary/95 to-primary/80 text-white p-12 rounded-2xl border-4 border-primary/60 shadow-2xl overflow-hidden">
            {/* Header with Workout Track */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <img 
                  src={basslineLogoYellow} 
                  alt="Bassline" 
                  className="h-8 w-8 opacity-90 drop-shadow-lg"
                />
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
            
            {/* Animated Narrative Text */}
            <div className="pt-narrative-text text-2xl font-bold leading-relaxed">
              <span className="italic">"{narrative}"</span>
            </div>
            
            {/* Animated Bottom Bar */}
            <div className="mt-6 h-2 bg-gradient-to-r from-white/0 via-white/80 to-white/0 rounded-full" />
          </div>
          
          {/* Clean animations without emoticons */}
        </div>
      </div>
      
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