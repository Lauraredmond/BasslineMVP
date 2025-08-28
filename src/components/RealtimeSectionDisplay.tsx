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
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch sectional data for the current track
  const fetchSectionalData = async (trackName: string, artistName: string) => {
    if (!trackName || !artistName) {
      console.warn('⚠️ Missing track or artist name, using estimated sections');
      const estimatedSections = createEstimatedSections(trackName || 'Unknown');
      setSections(estimatedSections);
      return;
    }

    setIsLoading(true);
    setError(null);
    
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
        if (data.sections && Array.isArray(data.sections) && data.sections.length > 0) {
          console.log('✅ Found sectional data:', data.sections.length, 'sections');
          // Validate sections data before setting
          const validSections = data.sections.filter(section => 
            section && 
            typeof section.sectionType === 'string' && 
            typeof section.sectionStartTime === 'number' &&
            typeof section.sectionEndTime === 'number'
          );
          setSections(validSections);
          setError(null);
          return;
        }
      }

      console.log('⚠️ No sectional data found, using estimated sections');
      // Fallback: Create estimated sections if no database data
      const estimatedSections = createEstimatedSections(trackName);
      setSections(estimatedSections);
      setError(null);

    } catch (error) {
      console.error('❌ Error fetching sectional data:', error);
      setError(`Failed to fetch data: ${error instanceof Error ? error.message : 'Unknown error'}`);
      // Fallback to estimated sections
      const estimatedSections = createEstimatedSections(trackName || 'Unknown');
      setSections(estimatedSections);
    } finally {
      setIsLoading(false);
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
    try {
      if (!isPlaying || sections.length === 0 || !currentPositionMs || currentPositionMs < 0) {
        return;
      }

      const currentPositionSeconds = currentPositionMs / 1000;
      
      // Find the current section based on playback position
      const activeSection = sections.find(section => 
        section && 
        currentPositionSeconds >= section.sectionStartTime && 
        currentPositionSeconds < section.sectionEndTime
      );

      if (activeSection && activeSection !== currentSection) {
        console.log('🎵 Section changed to:', activeSection.sectionType, 'at', currentPositionSeconds + 's');
        setCurrentSection(activeSection);
      }
    } catch (error) {
      console.error('❌ Error updating current section:', error);
    }
  }, [currentPositionMs, isPlaying, sections, currentSection]);

  // Fetch sectional data when track changes
  useEffect(() => {
    try {
      if (currentTrack?.name && currentTrack.artists?.[0]?.name) {
        const trackKey = `${currentTrack.name}_${currentTrack.artists[0].name}`;
        if (trackKey !== lastFetchedTrack) {
          console.log('🔄 Track changed, fetching sectional data...');
          fetchSectionalData(currentTrack.name, currentTrack.artists[0].name);
          setLastFetchedTrack(trackKey);
        }
      }
    } catch (error) {
      console.error('❌ Error in track change effect:', error);
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

  // SAFE RENDERING: Add multiple checks to prevent crashes
  try {
    // Show loading state
    if (isLoading) {
      return (
        <div className={`flex items-center justify-center ${className}`}>
          <div className="px-4 py-2 rounded-lg bg-gray-500/20 border border-gray-400 text-gray-100">
            <div className="flex items-center gap-2">
              <div className="animate-spin w-4 h-4 border-2 border-gray-300 border-t-transparent rounded-full"></div>
              <span className="text-sm">Loading sections...</span>
            </div>
          </div>
        </div>
      );
    }

    // Show error state but don't crash
    if (error) {
      console.warn('⚠️ RealtimeSectionDisplay error (non-blocking):', error);
      // Don't show error to user, just continue with fallback
    }

    // Early returns for various states
    if (!currentTrack) {
      console.log('🔍 RealtimeSectionDisplay: No current track');
      return null;
    }

    if (!isPlaying) {
      console.log('🔍 RealtimeSectionDisplay: Not playing');
      return null;
    }

    if (!currentSection || !currentSection.sectionType) {
      console.log('🔍 RealtimeSectionDisplay: No current section', { currentSection, sectionsCount: sections.length });
      return null;
    }

    // Valid render
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
              {currentSection.sectionType || 'unknown'}
            </span>
            <span className="text-xs opacity-80">
              {Math.round(currentSection.sectionStartTime || 0)}s-{Math.round(currentSection.sectionEndTime || 0)}s
            </span>
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error('❌ Critical error rendering RealtimeSectionDisplay:', error);
    // Return a safe fallback instead of crashing
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <div className="px-4 py-2 rounded-lg bg-red-500/20 border border-red-400 text-red-100 text-sm">
          Section display error
        </div>
      </div>
    );
  }
};