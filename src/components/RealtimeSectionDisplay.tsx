import React, { useState, useEffect } from 'react';

interface SectionData {
  sectionIndex: number;
  sectionType: string;
  sectionStartTime: number; // seconds
  sectionDuration: number;  // seconds
  sectionEndTime: number;
  sectionIndicator: string;
  energy: number;
  tempo: number;
  loudness: number;
}

interface RealtimeSectionDisplayProps {
  currentTrack?: {
    name: string;
    artists: Array<{ name: string }>;
  };
  currentPositionMs?: number;
  isPlaying?: boolean;
  className?: string;
}

export const RealtimeSectionDisplay: React.FC<RealtimeSectionDisplayProps> = ({
  currentTrack,
  currentPositionMs = 0,
  isPlaying = false,
  className = ""
}) => {
  const [currentSection, setCurrentSection] = useState<SectionData | null>(null);
  const [sections, setSections] = useState<SectionData[]>([]);
  const [lastFetchedTrack, setLastFetchedTrack] = useState<string>('');

  // Fetch sectional data for the current track
  const fetchSectionalData = async (trackName: string, artistName: string) => {
    try {
      console.log('🎯 Fetching sectional data for real-time display:', trackName);
      
      // Query the database for sectional analysis data for this track
      const response = await fetch('/netlify/functions/get-sectional-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackName, artistName })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.sections && data.sections.length > 0) {
          console.log('✅ Found sectional data:', data.sections.length, 'sections');
          setSections(data.sections);
          return;
        }
      }

      console.log('⚠️ No sectional data found, using estimated sections');
      // Fallback: Create estimated sections if no database data
      const estimatedSections = createEstimatedSections(trackName);
      setSections(estimatedSections);

    } catch (error) {
      console.error('❌ Error fetching sectional data:', error);
      // Fallback to estimated sections
      const estimatedSections = createEstimatedSections(trackName || 'Unknown');
      setSections(estimatedSections);
    }
  };

  // Create estimated sections as fallback
  const createEstimatedSections = (trackName: string): SectionData[] => {
    const estimatedDuration = 240; // 4 minutes default
    
    return [
      {
        sectionIndex: 0,
        sectionType: 'intro',
        sectionStartTime: 0,
        sectionDuration: 27,
        sectionEndTime: 27,
        sectionIndicator: 'Section 0: intro (0s-27s)',
        energy: 70,
        tempo: 120,
        loudness: -8
      },
      {
        sectionIndex: 1,
        sectionType: 'verse',
        sectionStartTime: 27,
        sectionDuration: 67,
        sectionEndTime: 94,
        sectionIndicator: 'Section 1: verse (27s-94s)',
        energy: 75,
        tempo: 120,
        loudness: -6
      },
      {
        sectionIndex: 2,
        sectionType: 'chorus',
        sectionStartTime: 94,
        sectionDuration: 81,
        sectionEndTime: 175,
        sectionIndicator: 'Section 2: chorus (94s-175s)',
        energy: 95,
        tempo: 120,
        loudness: -4
      },
      {
        sectionIndex: 3,
        sectionType: 'verse',
        sectionStartTime: 175,
        sectionDuration: 67,
        sectionEndTime: 242,
        sectionIndicator: 'Section 3: verse (175s-242s)',
        energy: 75,
        tempo: 120,
        loudness: -6
      },
      {
        sectionIndex: 4,
        sectionType: 'outro',
        sectionStartTime: 242,
        sectionDuration: 27,
        sectionEndTime: 269,
        sectionIndicator: 'Section 4: outro (242s-269s)',
        energy: 70,
        tempo: 120,
        loudness: -8
      }
    ];
  };

  // Update current section based on playback position
  useEffect(() => {
    if (!isPlaying || sections.length === 0) {
      return;
    }

    const currentPositionSeconds = currentPositionMs / 1000;
    
    // Find the current section based on playback position
    const activeSection = sections.find(section => 
      currentPositionSeconds >= section.sectionStartTime && 
      currentPositionSeconds < section.sectionEndTime
    );

    if (activeSection && activeSection !== currentSection) {
      console.log('🎵 Section changed to:', activeSection.sectionType, 'at', currentPositionSeconds + 's');
      setCurrentSection(activeSection);
    }
  }, [currentPositionMs, isPlaying, sections, currentSection]);

  // Fetch sectional data when track changes
  useEffect(() => {
    if (currentTrack?.name && currentTrack.artists?.[0]?.name) {
      const trackKey = `${currentTrack.name}_${currentTrack.artists[0].name}`;
      if (trackKey !== lastFetchedTrack) {
        console.log('🔄 Track changed, fetching sectional data...');
        fetchSectionalData(currentTrack.name, currentTrack.artists[0].name);
        setLastFetchedTrack(trackKey);
      }
    }
  }, [currentTrack?.name, currentTrack?.artists?.[0]?.name, lastFetchedTrack]);

  // Get section styling based on type
  const getSectionStyling = (sectionType: string) => {
    const baseStyles = "px-4 py-2 rounded-lg font-medium text-sm transition-all duration-500 border-2";
    
    switch (sectionType?.toLowerCase()) {
      case 'intro':
        return `${baseStyles} bg-blue-500/20 border-blue-400 text-blue-100`;
      case 'verse':
        return `${baseStyles} bg-green-500/20 border-green-400 text-green-100`;
      case 'chorus':
        return `${baseStyles} bg-red-500/20 border-red-400 text-red-100 animate-pulse`;
      case 'bridge':
        return `${baseStyles} bg-purple-500/20 border-purple-400 text-purple-100`;
      case 'outro':
        return `${baseStyles} bg-orange-500/20 border-orange-400 text-orange-100`;
      default:
        return `${baseStyles} bg-gray-500/20 border-gray-400 text-gray-100`;
    }
  };

  if (!currentTrack || !isPlaying || !currentSection) {
    return null;
  }

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className={getSectionStyling(currentSection.sectionType)}>
        <div className="flex items-center gap-2">
          <span className="text-lg">
            {currentSection.sectionType === 'chorus' ? '🎤' :
             currentSection.sectionType === 'verse' ? '🎵' :
             currentSection.sectionType === 'intro' ? '🎶' :
             currentSection.sectionType === 'bridge' ? '🌉' :
             currentSection.sectionType === 'outro' ? '🎭' : '🎼'}
          </span>
          <span className="capitalize font-bold">
            {currentSection.sectionType}
          </span>
          <span className="text-xs opacity-80">
            {Math.round(currentSection.sectionStartTime)}s-{Math.round(currentSection.sectionEndTime)}s
          </span>
        </div>
      </div>
    </div>
  );
};