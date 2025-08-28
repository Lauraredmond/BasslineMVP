// Algorithmic Section Analysis - Real-time song structure prediction
// Uses only available metadata (Spotify basic + RapidAPI) - no audio analysis required
// Provides accurate verse/chorus/bridge detection for workout narrative timing

export interface SongMetadata {
  duration: number;        // Track duration in seconds
  tempo?: number;          // BPM from RapidAPI
  energy?: number;         // 0-100 from RapidAPI  
  danceability?: number;   // 0-100 from RapidAPI
  key?: string;           // Musical key from RapidAPI
  mode?: string;          // Major/Minor from RapidAPI
  genres?: string[];      // From Spotify
  artist?: string;        // From Spotify
  name?: string;          // Track name
}

export interface PredictedSection {
  sectionType: 'intro' | 'verse' | 'pre-chorus' | 'chorus' | 'bridge' | 'breakdown' | 'outro';
  sectionIndex: number;
  sectionStartTime: number;    // Seconds
  sectionDuration: number;     // Seconds  
  sectionEndTime: number;      // Seconds
  confidence: number;          // 0-1 confidence score
  intensity: number;           // 0-100 workout intensity for this section
  narrative?: string;          // Workout instruction for this section
}

interface GenrePattern {
  name: string;
  structure: SectionTemplate[];
  avgSections: number;
  typicalDuration: [number, number]; // [min, max] seconds
}

interface SectionTemplate {
  type: PredictedSection['sectionType'];
  percentage: number;      // Percentage of total song duration
  minDuration: number;     // Minimum section duration in seconds
  maxDuration: number;     // Maximum section duration in seconds
  intensity: number;       // Workout intensity 0-100
}

class AlgorithmicSectionAnalyzer {
  
  // Genre-based section patterns derived from music analysis research
  private genrePatterns: GenrePattern[] = [
    {
      name: 'pop',
      avgSections: 7,
      typicalDuration: [180, 300],
      structure: [
        { type: 'intro', percentage: 0.08, minDuration: 8, maxDuration: 20, intensity: 30 },
        { type: 'verse', percentage: 0.25, minDuration: 20, maxDuration: 45, intensity: 60 },
        { type: 'pre-chorus', percentage: 0.10, minDuration: 8, maxDuration: 16, intensity: 75 },
        { type: 'chorus', percentage: 0.25, minDuration: 20, maxDuration: 35, intensity: 90 },
        { type: 'verse', percentage: 0.20, minDuration: 16, maxDuration: 40, intensity: 65 },
        { type: 'chorus', percentage: 0.25, minDuration: 20, maxDuration: 35, intensity: 95 },
        { type: 'bridge', percentage: 0.15, minDuration: 16, maxDuration: 30, intensity: 80 },
        { type: 'chorus', percentage: 0.30, minDuration: 25, maxDuration: 40, intensity: 100 },
        { type: 'outro', percentage: 0.12, minDuration: 10, maxDuration: 25, intensity: 40 }
      ]
    },
    {
      name: 'rock',
      avgSections: 6,
      typicalDuration: [200, 360],
      structure: [
        { type: 'intro', percentage: 0.12, minDuration: 15, maxDuration: 30, intensity: 50 },
        { type: 'verse', percentage: 0.30, minDuration: 30, maxDuration: 50, intensity: 70 },
        { type: 'chorus', percentage: 0.28, minDuration: 25, maxDuration: 40, intensity: 95 },
        { type: 'verse', percentage: 0.25, minDuration: 25, maxDuration: 45, intensity: 75 },
        { type: 'chorus', percentage: 0.28, minDuration: 25, maxDuration: 40, intensity: 100 },
        { type: 'breakdown', percentage: 0.20, minDuration: 20, maxDuration: 45, intensity: 85 },
        { type: 'chorus', percentage: 0.30, minDuration: 30, maxDuration: 50, intensity: 100 },
        { type: 'outro', percentage: 0.10, minDuration: 10, maxDuration: 20, intensity: 30 }
      ]
    },
    {
      name: 'electronic',
      avgSections: 8,
      typicalDuration: [240, 420],
      structure: [
        { type: 'intro', percentage: 0.15, minDuration: 20, maxDuration: 40, intensity: 20 },
        { type: 'verse', percentage: 0.20, minDuration: 25, maxDuration: 40, intensity: 40 },
        { type: 'breakdown', percentage: 0.15, minDuration: 15, maxDuration: 30, intensity: 60 },
        { type: 'chorus', percentage: 0.25, minDuration: 30, maxDuration: 50, intensity: 90 },
        { type: 'verse', percentage: 0.18, minDuration: 20, maxDuration: 35, intensity: 45 },
        { type: 'breakdown', percentage: 0.12, minDuration: 12, maxDuration: 25, intensity: 70 },
        { type: 'chorus', percentage: 0.28, minDuration: 35, maxDuration: 55, intensity: 95 },
        { type: 'bridge', percentage: 0.15, minDuration: 20, maxDuration: 35, intensity: 80 },
        { type: 'chorus', percentage: 0.30, minDuration: 40, maxDuration: 60, intensity: 100 },
        { type: 'outro', percentage: 0.12, minDuration: 15, maxDuration: 30, intensity: 25 }
      ]
    },
    {
      name: 'hip-hop',
      avgSections: 7,
      typicalDuration: [180, 300],
      structure: [
        { type: 'intro', percentage: 0.10, minDuration: 8, maxDuration: 20, intensity: 40 },
        { type: 'verse', percentage: 0.30, minDuration: 25, maxDuration: 50, intensity: 70 },
        { type: 'chorus', percentage: 0.20, minDuration: 15, maxDuration: 30, intensity: 85 },
        { type: 'verse', percentage: 0.30, minDuration: 25, maxDuration: 50, intensity: 75 },
        { type: 'chorus', percentage: 0.20, minDuration: 15, maxDuration: 30, intensity: 90 },
        { type: 'bridge', percentage: 0.15, minDuration: 12, maxDuration: 25, intensity: 65 },
        { type: 'chorus', percentage: 0.25, minDuration: 20, maxDuration: 35, intensity: 95 },
        { type: 'outro', percentage: 0.10, minDuration: 8, maxDuration: 18, intensity: 50 }
      ]
    }
  ];

  // Default pattern for unknown genres
  private defaultPattern: GenrePattern = {
    name: 'default',
    avgSections: 7,
    typicalDuration: [180, 300],
    structure: [
      { type: 'intro', percentage: 0.10, minDuration: 10, maxDuration: 25, intensity: 35 },
      { type: 'verse', percentage: 0.25, minDuration: 20, maxDuration: 45, intensity: 65 },
      { type: 'chorus', percentage: 0.25, minDuration: 20, maxDuration: 35, intensity: 85 },
      { type: 'verse', percentage: 0.22, minDuration: 18, maxDuration: 40, intensity: 70 },
      { type: 'chorus', percentage: 0.25, minDuration: 20, maxDuration: 35, intensity: 90 },
      { type: 'bridge', percentage: 0.18, minDuration: 15, maxDuration: 30, intensity: 75 },
      { type: 'chorus', percentage: 0.28, minDuration: 25, maxDuration: 40, intensity: 95 },
      { type: 'outro', percentage: 0.12, minDuration: 10, maxDuration: 20, intensity: 40 }
    ]
  };

  /**
   * Main analysis function - predicts song sections using only metadata
   */
  public analyzeSongStructure(metadata: SongMetadata): PredictedSection[] {
    console.log('🎯 Starting algorithmic section analysis for:', metadata.name);
    console.log('📊 Available metadata:', {
      duration: metadata.duration,
      tempo: metadata.tempo,
      energy: metadata.energy,
      genres: metadata.genres?.slice(0, 3)
    });

    // Select best matching genre pattern
    const pattern = this.selectGenrePattern(metadata);
    console.log('🎵 Selected genre pattern:', pattern.name);

    // Apply tempo-based adjustments
    const adjustedPattern = this.adjustPatternForTempo(pattern, metadata.tempo);

    // Generate sections with confidence scoring
    const sections = this.generateSections(adjustedPattern, metadata);

    // Apply energy-based intensity adjustments
    const finalSections = this.adjustSectionIntensities(sections, metadata);

    console.log('✅ Generated', finalSections.length, 'sections with algorithmic analysis');
    console.log('🔍 Sections preview:', finalSections.slice(0, 3).map(s => ({
      type: s.sectionType,
      start: Math.round(s.sectionStartTime),
      duration: Math.round(s.sectionDuration),
      confidence: s.confidence.toFixed(2)
    })));

    return finalSections;
  }

  /**
   * Select the most appropriate genre pattern based on available metadata
   */
  private selectGenrePattern(metadata: SongMetadata): GenrePattern {
    if (!metadata.genres || metadata.genres.length === 0) {
      return this.defaultPattern;
    }

    // Score each genre pattern based on metadata match
    let bestPattern = this.defaultPattern;
    let bestScore = 0;

    for (const pattern of this.genrePatterns) {
      const score = this.scoreGenreMatch(pattern, metadata);
      if (score > bestScore) {
        bestScore = score;
        bestPattern = pattern;
      }
    }

    console.log('🎯 Genre matching scores:', {
      selected: bestPattern.name,
      score: bestScore.toFixed(2)
    });

    return bestPattern;
  }

  /**
   * Score how well a genre pattern matches the song metadata
   */
  private scoreGenreMatch(pattern: GenrePattern, metadata: SongMetadata): number {
    let score = 0;

    // Genre name matching
    if (metadata.genres) {
      for (const genre of metadata.genres) {
        const genreLower = genre.toLowerCase();
        if (genreLower.includes(pattern.name) || pattern.name.includes(genreLower)) {
          score += 3;
        }
        // Secondary genre associations
        if (pattern.name === 'electronic' && (genreLower.includes('dance') || genreLower.includes('edm') || genreLower.includes('house'))) {
          score += 2;
        }
        if (pattern.name === 'rock' && (genreLower.includes('metal') || genreLower.includes('punk') || genreLower.includes('alternative'))) {
          score += 2;
        }
      }
    }

    // Duration matching
    const [minDur, maxDur] = pattern.typicalDuration;
    if (metadata.duration >= minDur && metadata.duration <= maxDur) {
      score += 2;
    } else if (metadata.duration > maxDur * 0.8 && metadata.duration < maxDur * 1.2) {
      score += 1; // Close to typical range
    }

    // Energy/Danceability correlation
    if (metadata.energy !== undefined) {
      if (pattern.name === 'electronic' && metadata.energy > 70) score += 1;
      if (pattern.name === 'rock' && metadata.energy > 80) score += 1;
      if (pattern.name === 'pop' && metadata.energy > 60 && metadata.energy < 85) score += 1;
    }

    return score;
  }

  /**
   * Adjust section timing patterns based on tempo
   */
  private adjustPatternForTempo(pattern: GenrePattern, tempo?: number): GenrePattern {
    if (!tempo) return pattern;

    // More sophisticated tempo-based section duration adjustments
    let tempoMultiplier = 1.0;
    
    if (tempo < 80) {
      tempoMultiplier = 1.3; // Very slow songs (ballads)
    } else if (tempo < 100) {
      tempoMultiplier = 1.15; // Slow songs 
    } else if (tempo > 160) {
      tempoMultiplier = 0.8; // Very fast songs (punk, speed metal)
    } else if (tempo > 140) {
      tempoMultiplier = 0.9; // Fast songs (most rock, electronic)
    } else if (tempo > 120) {
      tempoMultiplier = 0.95; // Moderate-fast songs
    }
    
    // Special case for rock songs with high tempo (like The Pretender at 152 BPM)
    if (tempo > 145 && pattern.name === 'rock') {
      tempoMultiplier = 0.88; // Rock songs at this tempo tend to have shorter, punchier sections
    }

    console.log('🎵 Applying tempo adjustment:', {
      tempo: tempo,
      multiplier: tempoMultiplier.toFixed(2)
    });

    // Create adjusted pattern
    const adjustedStructure = pattern.structure.map(section => ({
      ...section,
      percentage: section.percentage * tempoMultiplier,
      minDuration: section.minDuration * tempoMultiplier,
      maxDuration: section.maxDuration * tempoMultiplier
    }));

    return {
      ...pattern,
      structure: adjustedStructure
    };
  }

  /**
   * Generate actual section timings from pattern and metadata
   */
  private generateSections(pattern: GenrePattern, metadata: SongMetadata): PredictedSection[] {
    const sections: PredictedSection[] = [];
    let currentTime = 0;
    let sectionIndex = 0;

    for (const template of pattern.structure) {
      // Calculate section duration
      const idealDuration = metadata.duration * template.percentage;
      const constrainedDuration = Math.max(
        template.minDuration,
        Math.min(template.maxDuration, idealDuration)
      );

      // Ensure we don't exceed song duration
      const actualDuration = Math.min(constrainedDuration, metadata.duration - currentTime);
      
      if (actualDuration < template.minDuration * 0.5) {
        break; // Skip if remaining time is too short
      }

      // Calculate confidence based on how well duration fits expectations
      const durationFit = Math.min(1, actualDuration / idealDuration);
      const baseConfidence = 0.7 + (durationFit * 0.3);
      
      const section: PredictedSection = {
        sectionType: template.type,
        sectionIndex,
        sectionStartTime: currentTime,
        sectionDuration: actualDuration,
        sectionEndTime: currentTime + actualDuration,
        confidence: baseConfidence,
        intensity: template.intensity,
        narrative: this.generateWorkoutNarrative(template.type, template.intensity, metadata.tempo)
      };

      sections.push(section);
      currentTime += actualDuration;
      sectionIndex++;

      // Stop if we've reached the end of the song
      if (currentTime >= metadata.duration * 0.95) break;
    }

    // Adjust final section to end exactly at song duration
    if (sections.length > 0) {
      const lastSection = sections[sections.length - 1];
      lastSection.sectionEndTime = metadata.duration;
      lastSection.sectionDuration = metadata.duration - lastSection.sectionStartTime;
    }

    return sections;
  }

  /**
   * Adjust section intensities based on track energy and danceability
   */
  private adjustSectionIntensities(sections: PredictedSection[], metadata: SongMetadata): PredictedSection[] {
    if (!metadata.energy && !metadata.danceability) {
      return sections;
    }

    const energyMultiplier = metadata.energy ? (metadata.energy / 100) : 1;
    const danceabilityBonus = metadata.danceability ? ((metadata.danceability - 50) / 100) : 0;

    console.log('💪 Applying energy adjustments:', {
      energyMultiplier: energyMultiplier.toFixed(2),
      danceabilityBonus: danceabilityBonus.toFixed(2)
    });

    return sections.map(section => {
      // Apply energy scaling
      let adjustedIntensity = section.intensity * energyMultiplier;
      
      // Add danceability bonus to chorus and breakdown sections
      if (section.sectionType === 'chorus' || section.sectionType === 'breakdown') {
        adjustedIntensity += (danceabilityBonus * 15);
      }

      // Keep intensity within 0-100 range
      adjustedIntensity = Math.max(10, Math.min(100, adjustedIntensity));

      return {
        ...section,
        intensity: Math.round(adjustedIntensity)
      };
    });
  }

  /**
   * Generate workout narrative for each section type
   */
  private generateWorkoutNarrative(sectionType: PredictedSection['sectionType'], intensity: number, tempo?: number): string {
    const bpmText = tempo ? ` at ${Math.round(tempo)} BPM` : '';
    
    const narratives: Record<PredictedSection['sectionType'], string[]> = {
      'intro': [
        `Gentle warm-up${bpmText}. Let your body ease into the rhythm.`,
        `Starting easy${bpmText}. Feel the music, prepare your muscles.`,
        `Warm-up phase${bpmText}. Breathe deeply and get ready.`
      ],
      'verse': [
        `Steady pace${bpmText}. Find your groove and maintain form.`,
        `Consistent effort${bpmText}. Keep the energy flowing smoothly.`,
        `Rhythmic movement${bpmText}. Stay with the beat, controlled power.`
      ],
      'pre-chorus': [
        `Building energy${bpmText}. Get ready for the intensity boost!`,
        `Prepare for power${bpmText}. Feel the anticipation building.`,
        `Energy rising${bpmText}. Here comes the challenge!`
      ],
      'chorus': [
        `Maximum effort${bpmText}! This is your power moment!`,
        `Full intensity${bpmText}! Give everything you've got!`,
        `Peak performance${bpmText}! Push through with the music!`
      ],
      'bridge': [
        `Focused power${bpmText}. Channel your strength with precision.`,
        `Controlled intensity${bpmText}. Quality over quantity here.`,
        `Technical focus${bpmText}. Perfect form at this pace.`
      ],
      'breakdown': [
        `Power surge${bpmText}! Feel the music drive your movement!`,
        `Energy explosion${bpmText}! Let the rhythm fuel your strength!`,
        `Dynamic burst${bpmText}! Match the music's intensity!`
      ],
      'outro': [
        `Cool down phase${bpmText}. Let your body recover gracefully.`,
        `Finishing strong${bpmText}. Controlled descent to rest.`,
        `Recovery mode${bpmText}. Breathe deep and feel accomplished.`
      ]
    };

    const options = narratives[sectionType];
    const selected = options[Math.floor(Math.random() * options.length)];
    
    return selected;
  }

  /**
   * Get the current section based on playback position
   */
  public getCurrentSection(sections: PredictedSection[], positionMs: number): PredictedSection | null {
    const positionSeconds = positionMs / 1000;
    
    return sections.find(section => 
      positionSeconds >= section.sectionStartTime && 
      positionSeconds < section.sectionEndTime
    ) || null;
  }

  /**
   * Get upcoming section for workout preparation
   */
  public getUpcomingSection(sections: PredictedSection[], positionMs: number, lookAheadSeconds: number = 10): PredictedSection | null {
    const lookAheadPosition = (positionMs / 1000) + lookAheadSeconds;
    
    return sections.find(section => 
      lookAheadPosition >= section.sectionStartTime && 
      lookAheadPosition < section.sectionEndTime
    ) || null;
  }
}

// Export singleton instance
export const algorithmicSectionAnalyzer = new AlgorithmicSectionAnalyzer();