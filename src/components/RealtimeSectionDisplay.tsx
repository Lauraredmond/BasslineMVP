import React, { useState, useEffect } from 'react';
import { algorithmicSectionAnalyzer } from '@/lib/algorithmic-section-analyzer';
import type { PredictedSection, SongMetadata } from '@/lib/algorithmic-section-analyzer';

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
  confidence?: number; // For algorithmic predictions
  intensity?: number;  // Workout intensity
  narrative?: string;  // Workout instruction
}

interface RealtimeSectionDisplayProps {
  currentTrack?: {
    name: string;
    artists: Array<{ name: string }>;
    duration_ms?: number; // Track duration for algorithmic analysis
  };
  currentPositionMs?: number;
  isPlaying?: boolean;
  className?: string;
  spotifyMetadata?: {
    tempo?: number;
    energy?: number;
    danceability?: number;
    key?: string;
    mode?: string;
  };
  rapidApiData?: {
    tempo?: number;
    energy?: number;
    danceability?: number;
    key?: string;
    mode?: string;
  };
}

export const RealtimeSectionDisplay: React.FC<RealtimeSectionDisplayProps> = ({
  currentTrack,
  currentPositionMs = 0,
  isPlaying = false,
  className = "",
  spotifyMetadata,
  rapidApiData
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
          console.log('🔍 Section data preview:', data.sections.slice(0, 3));
          // Validate sections data before setting
          const validSections = data.sections.filter(section => 
            section && 
            typeof section.sectionType === 'string' && 
            typeof section.sectionStartTime === 'number' &&
            typeof section.sectionEndTime === 'number'
          );
          console.log('✅ Using sections:', validSections.map(s => ({
            type: s.sectionType,
            start: s.sectionStartTime,
            end: s.sectionEndTime
          })));
          setSections(validSections);
          setError(null);
          return;
        } else {
          console.log('⚠️ API returned empty sections - database likely missing section_type data');
        }
      }

      console.log('⚠️ No sectional data found, using algorithmic analysis');
      // Enhanced Fallback: Use algorithmic section analyzer
      const algorithmicSections = await createAlgorithmicSections(trackName, artistName);
      setSections(algorithmicSections);
      setError(null);

    } catch (error) {
      console.error('❌ Error fetching sectional data:', error);
      setError(`Failed to fetch data: ${error instanceof Error ? error.message : 'Unknown error'}`);
      // Fallback to algorithmic sections
      const algorithmicSections = await createAlgorithmicSections(trackName || 'Unknown', artistName || 'Unknown');
      setSections(algorithmicSections);
    } finally {
      setIsLoading(false);
    }
  };

  // Create algorithmic sections using metadata analysis
  const createAlgorithmicSections = async (trackName: string, artistName: string): Promise<SectionData[]> => {
    console.log('🧠 Creating algorithmic sections for:', trackName, 'by', artistName);
    
    try {
      // Gather all available metadata
      const metadata: SongMetadata = {
        duration: 240, // Default duration, will be overridden if available
        name: trackName,
        artist: artistName
      };

      // Use track duration if available
      if (currentTrack?.duration_ms) {
        metadata.duration = currentTrack.duration_ms / 1000;
      }

      // Use Spotify metadata if available
      if (spotifyMetadata) {
        metadata.tempo = spotifyMetadata.tempo;
        metadata.energy = spotifyMetadata.energy;
        metadata.danceability = spotifyMetadata.danceability;
        metadata.key = spotifyMetadata.key;
        metadata.mode = spotifyMetadata.mode;
      }

      // Use RapidAPI data if available (may override Spotify data)
      if (rapidApiData) {
        metadata.tempo = rapidApiData.tempo || metadata.tempo;
        metadata.energy = rapidApiData.energy || metadata.energy;
        metadata.danceability = rapidApiData.danceability || metadata.danceability;
        metadata.key = rapidApiData.key || metadata.key;
        metadata.mode = rapidApiData.mode || metadata.mode;
      }

      // Infer genre from artist name if possible
      metadata.genres = inferGenreFromArtist(artistName);

      console.log('🎯 Using metadata for algorithmic analysis:', metadata);

      // Generate algorithmic sections
      const predictedSections = algorithmicSectionAnalyzer.analyzeSongStructure(metadata);
      
      // Convert PredictedSection to SectionData format
      const algorithmicSections: SectionData[] = predictedSections.map((section, index) => ({
        sectionIndex: index,
        sectionType: section.sectionType,
        sectionStartTime: section.sectionStartTime,
        sectionDuration: section.sectionDuration,
        sectionEndTime: section.sectionEndTime,
        sectionIndicator: `Section ${index}: ${section.sectionType} (${Math.round(section.sectionStartTime)}s-${Math.round(section.sectionEndTime)}s)`,
        energy: Math.round((metadata.energy || 75) * (section.intensity / 100)),
        tempo: Math.round(metadata.tempo || 120),
        loudness: -12 + (section.intensity / 10), // Convert intensity to loudness estimate
        confidence: section.confidence,
        intensity: section.intensity,
        narrative: section.narrative
      }));

      console.log('✅ Generated algorithmic sections:', algorithmicSections.length, 'sections');
      console.log('🎵 Algorithmic sections preview:', algorithmicSections.slice(0, 3).map(s => ({
        type: s.sectionType,
        start: Math.round(s.sectionStartTime),
        duration: Math.round(s.sectionDuration),
        intensity: s.intensity
      })));

      // Write algorithmic sections to database for persistence and future use
      await writeAlgorithmicSectionsToDatabase(trackName, artistName, algorithmicSections, metadata);

      return algorithmicSections;
      
    } catch (error) {
      console.error('❌ Error creating algorithmic sections:', error);
      console.log('⚠️ Falling back to basic estimated sections');
      return createEstimatedSections(trackName);
    }
  };

  // Simple genre inference from artist name (can be enhanced)
  const inferGenreFromArtist = (artistName: string): string[] => {
    const artist = artistName.toLowerCase();
    
    // Electronic/EDM artists
    if (artist.includes('deadmau5') || artist.includes('skrillex') || artist.includes('calvin harris') || 
        artist.includes('tiësto') || artist.includes('david guetta') || artist.includes('diplo')) {
      return ['electronic', 'edm'];
    }
    
    // Rock artists
    if (artist.includes('foo fighters') || artist.includes('metallica') || artist.includes('red hot chili') ||
        artist.includes('pearl jam') || artist.includes('nirvana') || artist.includes('green day')) {
      return ['rock', 'alternative rock'];
    }
    
    // Hip-hop artists
    if (artist.includes('drake') || artist.includes('kendrick') || artist.includes('kanye') ||
        artist.includes('eminem') || artist.includes('jay-z') || artist.includes('nas')) {
      return ['hip-hop', 'rap'];
    }
    
    // Pop artists
    if (artist.includes('taylor swift') || artist.includes('ariana grande') || artist.includes('ed sheeran') ||
        artist.includes('justin bieber') || artist.includes('billie eilish')) {
      return ['pop'];
    }
    
    return []; // Let the analyzer use default pattern
  };

  // Write algorithmic sections to database for persistence
  const writeAlgorithmicSectionsToDatabase = async (
    trackName: string, 
    artistName: string, 
    sections: SectionData[], 
    metadata: SongMetadata
  ): Promise<void> => {
    try {
      console.log('💾 Writing algorithmic sections to database...');

      // Prepare section data for database storage
      const sectionEntries = sections.map((section, index) => ({
        track_name: trackName,
        artist_name: artistName,
        analysis_source: 'algorithmic_prediction',
        section_type: section.sectionType,
        section_index: index,
        section_start_time: section.sectionStartTime,
        section_duration: section.sectionDuration,
        section_end_time: section.sectionEndTime,
        section_indicator: section.sectionIndicator,
        tempo: section.tempo,
        energy: section.energy,
        loudness: section.loudness,
        confidence_score: section.confidence || 0.8,
        intensity_level: section.intensity || 75,
        workout_narrative: section.narrative,
        prediction_metadata: JSON.stringify({
          algorithm_version: '1.0',
          genre_pattern_used: metadata.genres?.[0] || 'default',
          source_tempo: metadata.tempo,
          source_energy: metadata.energy,
          source_danceability: metadata.danceability,
          track_duration: metadata.duration
        }),
        created_at: new Date().toISOString(),
        playback_position_ms: 0 // Prediction, not live playback
      }));

      // Write to database via API
      const response = await fetch('/netlify/functions/store-algorithmic-sections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trackName,
          artistName,
          sections: sectionEntries,
          metadata: {
            total_sections: sections.length,
            algorithm_version: '1.0',
            prediction_confidence: sections.reduce((acc, s) => acc + (s.confidence || 0.8), 0) / sections.length
          }
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Successfully wrote', sections.length, 'algorithmic sections to database');
        console.log('📊 Database result:', result);
      } else {
        console.warn('⚠️ Failed to write algorithmic sections to database:', response.status);
      }

    } catch (error) {
      console.error('❌ Error writing algorithmic sections to database:', error);
      // Don't throw - this shouldn't block the workout experience
    }
  };

  // Create estimated sections as fallback - IMPROVED TIMING
  const createEstimatedSections = (trackName: string): SectionData[] => {
    const estimatedDuration = 240; // 4 minutes default
    
    // MORE REALISTIC SECTION TIMING - based on typical song structure
    return [
      {
        sectionIndex: 0,
        sectionType: 'intro',
        sectionStartTime: 0,
        sectionDuration: 15, // Shorter intro
        sectionEndTime: 15,
        sectionIndicator: 'Section 0: intro (0s-15s)',
        energy: 70,
        tempo: 120,
        loudness: -8
      },
      {
        sectionIndex: 1,
        sectionType: 'verse',
        sectionStartTime: 15,
        sectionDuration: 40, // Typical verse length
        sectionEndTime: 55,
        sectionIndicator: 'Section 1: verse (15s-55s)',
        energy: 75,
        tempo: 120,
        loudness: -6
      },
      {
        sectionIndex: 2,
        sectionType: 'chorus',
        sectionStartTime: 55,
        sectionDuration: 35, // Chorus length
        sectionEndTime: 90,
        sectionIndicator: 'Section 2: chorus (55s-90s)',
        energy: 95,
        tempo: 120,
        loudness: -4
      },
      {
        sectionIndex: 3,
        sectionType: 'verse',
        sectionStartTime: 90,
        sectionDuration: 40, // Second verse
        sectionEndTime: 130,
        sectionIndicator: 'Section 3: verse (90s-130s)',
        energy: 75,
        tempo: 120,
        loudness: -6
      },
      {
        sectionIndex: 4,
        sectionType: 'chorus',
        sectionStartTime: 130,
        sectionDuration: 35, // Second chorus
        sectionEndTime: 165,
        sectionIndicator: 'Section 4: chorus (130s-165s)',
        energy: 95,
        tempo: 120,
        loudness: -4
      },
      {
        sectionIndex: 5,
        sectionType: 'bridge',
        sectionStartTime: 165,
        sectionDuration: 25, // Bridge section
        sectionEndTime: 190,
        sectionIndicator: 'Section 5: bridge (165s-190s)',
        energy: 85,
        tempo: 120,
        loudness: -5
      },
      {
        sectionIndex: 6,
        sectionType: 'chorus',
        sectionStartTime: 190,
        sectionDuration: 35, // Final chorus
        sectionEndTime: 225,
        sectionIndicator: 'Section 6: chorus (190s-225s)',
        energy: 100,
        tempo: 120,
        loudness: -3
      },
      {
        sectionIndex: 7,
        sectionType: 'outro',
        sectionStartTime: 225,
        sectionDuration: 15, // Outro
        sectionEndTime: 240,
        sectionIndicator: 'Section 7: outro (225s-240s)',
        energy: 60,
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
        console.log('🎯 Section timing details:', {
          sectionType: activeSection.sectionType,
          expectedStart: activeSection.sectionStartTime,
          expectedEnd: activeSection.sectionEndTime,
          actualPosition: currentPositionSeconds,
          timingOffset: currentPositionSeconds - activeSection.sectionStartTime
        });
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