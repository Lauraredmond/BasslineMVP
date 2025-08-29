import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

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
  const [animationKey, setAnimationKey] = useState<number>(0);
  const [showNarrative, setShowNarrative] = useState<boolean>(false);

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

  // Determine workout track based on BPM
  const getWorkoutTrackFromTempo = (tempo?: number): string => {
    if (!tempo) return 'recovery';
    
    if (tempo >= 120 && tempo <= 140) return 'sprint_intervals';
    if (tempo >= 80 && tempo <= 100) return 'climb';
    if (tempo >= 85 && tempo <= 110) return 'resistance';
    if (tempo >= 110 && tempo <= 130) return 'jumps';
    if (tempo >= 95 && tempo <= 115) return 'hills';
    if (tempo >= 60 && tempo <= 85) return 'cooldown';
    if (tempo >= 70 && tempo <= 95) return 'warmup';
    
    return 'recovery'; // Default
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

    const tempo = currentTrack?.audio_features?.tempo || currentTrack?.tempo;
    const newWorkoutTrack = getWorkoutTrackFromTempo(tempo);
    const songComponent = mapSectionToComponent(
      currentSection.rawSectionType || currentSection.sectionType, 
      currentSection.sectionNumber
    );

    setWorkoutTrack(newWorkoutTrack);

    fetchNarrative(newWorkoutTrack, songComponent).then(narrativeText => {
      setShowNarrative(false); // Start exit animation
      
      setTimeout(() => {
        setNarrative(narrativeText);
        setAnimationKey(prev => prev + 1);
        setShowNarrative(true); // Start enter animation
      }, 300); // Half of exit animation duration
    });
  }, [currentSection?.sectionType, currentSection?.sectionNumber, currentTrack?.audio_features?.tempo]);

  if (!narrative || !currentSection) return null;

  return (
    <div className="mt-4">
      {/* PT Narrative Display with Animations */}
      <div 
        key={animationKey}
        className={`${showNarrative ? 'pt-narrative-enter pt-narrative-glow' : ''}`}
      >
        <div className="relative">
          {/* Animated Background Glow */}
          <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-primary/30 to-primary/20 rounded-lg animate-pulse" />
          
          {/* Main Content */}
          <div className="relative bg-gradient-to-r from-primary/95 to-primary/80 text-white p-5 rounded-xl border-3 border-primary/60 shadow-2xl">
            {/* Header with Workout Track */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">🏋️‍♀️</span>
                <span className="text-xs uppercase tracking-wide font-bold opacity-90">
                  {workoutTrack.replace('_', ' ')}
                </span>
              </div>
              {(currentTrack?.audio_features?.tempo || currentTrack?.tempo) && (
                <span className="text-xs bg-white/20 px-2 py-1 rounded">
                  {Math.round(currentTrack?.audio_features?.tempo || currentTrack?.tempo || 0)} BPM
                </span>
              )}
            </div>
            
            {/* Animated Narrative Text */}
            <div className="pt-narrative-text text-base font-semibold leading-relaxed">
              <span className="text-2xl mr-2">💬</span>
              <span className="italic">"{narrative}"</span>
            </div>
            
            {/* Animated Bottom Bar */}
            <div className="mt-3 h-1 bg-gradient-to-r from-white/0 via-white/80 to-white/0 rounded animate-pulse" />
          </div>
          
          {/* Floating Animation Elements */}
          {showNarrative && (
            <>
              <div className="absolute -top-2 -right-2 text-lg animate-bounce delay-300">💪</div>
              <div className="absolute -bottom-2 -left-2 text-lg animate-bounce delay-700">🎵</div>
            </>
          )}
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