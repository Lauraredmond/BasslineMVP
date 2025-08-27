// Enhanced Rapid Soundnet API Client with Time-Based Analysis
// Leverages sectional and temporal data for moment-by-moment workout guidance

import { rapidSoundnetService, RapidSoundnetTrackAnalysis } from './rapid-soundnet';
import { enhancedAnalysisLogger } from './enhanced-analysis-logger';

export interface TimeBasedSection {
  start: number;           // Start time in seconds
  duration: number;        // Duration in seconds
  confidence: number;      // Confidence score (0-1)
  tempo: number;          // BPM for this section
  key: number;            // Musical key (0-11)
  mode: number;           // Major (1) or Minor (0)
  time_signature: number; // Time signature
  loudness: number;       // Loudness in dB
  sectionType?: 'verse' | 'chorus' | 'bridge' | 'intro' | 'outro' | 'unknown';
}

export interface TimeBasedSegment {
  start: number;           // Start time in seconds
  duration: number;        // Duration in seconds
  confidence: number;      // Segmentation confidence
  loudness_start: number;  // Loudness at segment start
  loudness_max: number;    // Peak loudness in segment
  loudness_end: number;    // Loudness at segment end
  pitches: number[];       // Pitch class profiles (12 values)
  timbre: number[];        // Timbral texture (12 values)
}

export interface RhythmicStructure {
  bars: { start: number; duration: number; confidence: number }[];
  beats: { start: number; duration: number; confidence: number }[];
  tatums: { start: number; duration: number; confidence: number }[];
}

export interface DetailedTrackAnalysis extends RapidSoundnetTrackAnalysis {
  sections: TimeBasedSection[];
  segments: TimeBasedSegment[];
  rhythmic: RhythmicStructure;
  meta: {
    trackDuration: number;
    analysisVersion: string;
    timestamp: string;
  };
}

export interface WorkoutMoment {
  timeMs: number;
  phaseType: 'warmup' | 'sprint' | 'hills' | 'resistance' | 'jumps' | 'climb' | 'cooldown';
  intensity: number;      // 0-100 intensity level
  tempo: number;          // Current BPM
  loudness: number;       // Current loudness
  narrative: string;      // Workout instruction for this moment
  beatCue?: string;       // Optional beat-specific cue
}

class EnhancedRapidSoundnetService {
  
  // Get detailed time-based analysis (this is what the API actually returns)
  async getDetailedTrackAnalysis(trackTitle: string, artistName?: string, enableDatabaseLogging: boolean = true): Promise<DetailedTrackAnalysis | null> {
    try {
      console.log('🎯 Starting detailed track analysis for:', trackTitle);
      
      // Use the enhanced Netlify function that gets full API response
      const response = await this.makeEnhancedApiCall(trackTitle, artistName);
      
      let analysis: DetailedTrackAnalysis | null = null;
      
      if (!response) {
        console.warn('⚠️ No detailed analysis available, falling back to basic analysis');
        const basic = await rapidSoundnetService.getTrackAnalysis(trackTitle, artistName);
        analysis = basic ? this.convertBasicToDetailed(basic, trackTitle) : null;
      } else {
        analysis = this.processDetailedResponse(response, trackTitle);
      }
      
      // Trigger enhanced database logging if we got analysis
      if (analysis && enableDatabaseLogging) {
        try {
          console.log('🗄️ Triggering enhanced database logging for sections:', analysis.sections.length);
          
          // Generate workout moments for database logging
          const workoutMoments = this.generateWorkoutMomentsFromAnalysis(analysis);
          
          // Log detailed analysis to database (creates multiple rows)
          await enhancedAnalysisLogger.logDetailedTrackAnalysis(
            trackTitle,
            artistName || '',
            analysis,
            workoutMoments
          );
          
          console.log('✅ Enhanced database logging completed');
          
        } catch (loggingError) {
          console.error('⚠️ Enhanced database logging failed (continuing with analysis):', loggingError);
          // Don't fail the entire operation if logging fails
        }
      }
      
      return analysis;
      
    } catch (error) {
      console.error('💥 Enhanced analysis failed:', error);
      return null;
    }
  }

  // Generate workout moments for entire track (public API)
  async generateWorkoutMoments(trackTitle: string, artistName?: string, workoutDuration?: number): Promise<WorkoutMoment[]> {
    const analysis = await this.getDetailedTrackAnalysis(trackTitle, artistName, false); // Disable logging to avoid recursion
    
    if (!analysis) {
      console.warn('⚠️ No analysis available for workout moments');
      return [];
    }
    
    return this.generateWorkoutMomentsFromAnalysis(analysis, workoutDuration);
  }

  // Generate workout moments from existing analysis (internal method)
  private generateWorkoutMomentsFromAnalysis(analysis: DetailedTrackAnalysis, workoutDuration?: number): WorkoutMoment[] {
    console.log('🎯 Generating workout moments from analysis with', analysis.sections.length, 'sections');

    const moments: WorkoutMoment[] = [];
    const trackDurationMs = (workoutDuration || analysis.meta?.trackDuration || 180) * 1000;
    
    // Process sections for major phase changes
    analysis.sections.forEach((section, index) => {
      const sectionStartMs = section.start * 1000;
      const sectionEndMs = (section.start + section.duration) * 1000;
      
      // Skip if section is beyond our workout duration
      if (sectionStartMs >= trackDurationMs) return;
      
      // Determine workout phase based on section characteristics
      const phaseType = this.determinePhaseFromSection(section, index, analysis.sections.length);
      const intensity = this.calculateIntensity(section);
      
      // Generate moment at section start
      moments.push({
        timeMs: sectionStartMs,
        phaseType,
        intensity,
        tempo: section.tempo,
        loudness: section.loudness,
        narrative: this.generateNarrativeForSection(section, phaseType),
        beatCue: this.generateBeatCue(section, phaseType)
      });
      
      // Generate intermediate moments within longer sections
      if (section.duration > 30) { // Sections longer than 30s get intermediate cues
        const midPoint = sectionStartMs + (section.duration * 500); // Middle of section
        if (midPoint < trackDurationMs) {
          moments.push({
            timeMs: midPoint,
            phaseType,
            intensity: Math.min(100, intensity + 10), // Slight intensity increase
            tempo: section.tempo,
            loudness: section.loudness,
            narrative: this.generateMidSectionNarrative(phaseType, section.tempo),
            beatCue: this.generateMidSectionBeatCue(phaseType)
          });
        }
      }
    });

    // Add beat-level cues for high-energy sections
    analysis.rhythmic.bars.forEach((bar, index) => {
      const barTimeMs = bar.start * 1000;
      
      if (barTimeMs >= trackDurationMs) return;
      
      // Add cues every 8 bars for sprints and jumps
      if (index > 0 && index % 8 === 0) {
        const currentSection = this.findSectionAtTime(analysis.sections, bar.start);
        if (currentSection) {
          const phaseType = this.determinePhaseFromSection(currentSection, 0, 1);
          
          if (phaseType === 'sprint' || phaseType === 'jumps') {
            moments.push({
              timeMs: barTimeMs,
              phaseType,
              intensity: this.calculateIntensity(currentSection),
              tempo: currentSection.tempo,
              loudness: currentSection.loudness,
              narrative: '',
              beatCue: phaseType === 'sprint' ? 'Quick legs! Stay with the beat!' : 'Switch it up - 8 counts!'
            });
          }
        }
      }
    });

    // Sort moments by time and return
    return moments.sort((a, b) => a.timeMs - b.timeMs);
  }

  // Make enhanced API call to get full sectional data
  private async makeEnhancedApiCall(trackTitle: string, artistName?: string): Promise<any> {
    try {
      console.log('🎯 Making enhanced RapidAPI call for:', trackTitle, 'by', artistName);
      
      // Check if we can make the request (respecting rate limits)
      if (!rapidSoundnetService.canMakeRequest()) {
        console.warn('⚠️ Rate limit reached, cannot get enhanced analysis');
        return null;
      }

      const params = new URLSearchParams({ song: trackTitle });
      if (artistName) params.append('artist', artistName);

      console.log('🌐 Calling enhanced Netlify function with params:', params.toString());
      
      // Call our enhanced Netlify function that gets full API response
      const response = await fetch(`/.netlify/functions/enhanced-rapidapi-analysis?${params}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Enhanced API call failed:', response.status, errorText);
        return null;
      }

      const data = await response.json();
      console.log('✅ Enhanced API response received:', {
        hasSections: !!data.sections,
        hasSegments: !!data.segments,
        hasMetadata: !!data._metadata,
        sectionsCount: data.sections?.length || 0,
        segmentsCount: data.segments?.length || 0
      });

      return data;
      
    } catch (error) {
      console.error('💥 Enhanced API call error:', error);
      return null;
    }
  }

  // Convert basic analysis to detailed format with estimated sections
  private convertBasicToDetailed(basic: RapidSoundnetTrackAnalysis, trackTitle: string): DetailedTrackAnalysis {
    const estimatedDuration = this.parseDurationString(basic.duration);
    
    // Create estimated sections based on typical song structure
    const sections: TimeBasedSection[] = [
      { start: 0, duration: estimatedDuration * 0.1, confidence: 0.5, tempo: basic.tempo, key: 0, mode: basic.mode === 'major' ? 1 : 0, time_signature: 4, loudness: -8, sectionType: 'intro' },
      { start: estimatedDuration * 0.1, duration: estimatedDuration * 0.25, confidence: 0.6, tempo: basic.tempo, key: 0, mode: basic.mode === 'major' ? 1 : 0, time_signature: 4, loudness: -6, sectionType: 'verse' },
      { start: estimatedDuration * 0.35, duration: estimatedDuration * 0.3, confidence: 0.7, tempo: basic.tempo, key: 0, mode: basic.mode === 'major' ? 1 : 0, time_signature: 4, loudness: -4, sectionType: 'chorus' },
      { start: estimatedDuration * 0.65, duration: estimatedDuration * 0.25, confidence: 0.6, tempo: basic.tempo, key: 0, mode: basic.mode === 'major' ? 1 : 0, time_signature: 4, loudness: -6, sectionType: 'verse' },
      { start: estimatedDuration * 0.9, duration: estimatedDuration * 0.1, confidence: 0.5, tempo: basic.tempo, key: 0, mode: basic.mode === 'major' ? 1 : 0, time_signature: 4, loudness: -8, sectionType: 'outro' }
    ];

    return {
      ...basic,
      sections,
      segments: [], // Would need actual API response for segments
      rhythmic: { bars: [], beats: [], tatums: [] }, // Would need actual API response
      meta: {
        trackDuration: estimatedDuration,
        analysisVersion: 'estimated-v1',
        timestamp: new Date().toISOString()
      }
    };
  }

  private processDetailedResponse(response: any, trackTitle: string): DetailedTrackAnalysis {
    // Process the actual API response structure
    const sections = response.sections?.map((section: any) => ({
      start: section.start || 0,
      duration: section.duration || 30,
      confidence: section.confidence || 0.5,
      tempo: section.tempo || 120,
      key: section.key || 0,
      mode: section.mode || 1,
      time_signature: section.time_signature || 4,
      loudness: section.loudness || -8,
      sectionType: this.inferSectionType(section)
    })) || [];

    const segments = response.segments?.map((segment: any) => ({
      start: segment.start || 0,
      duration: segment.duration || 2,
      confidence: segment.confidence || 0.5,
      loudness_start: segment.loudness_start || -8,
      loudness_max: segment.loudness_max || -4,
      loudness_end: segment.loudness_end || -8,
      pitches: segment.pitches || new Array(12).fill(0),
      timbre: segment.timbre || new Array(12).fill(0)
    })) || [];

    const rhythmic = {
      bars: response.bars?.map((bar: any) => ({
        start: bar.start || 0,
        duration: bar.duration || 2,
        confidence: bar.confidence || 0.5
      })) || [],
      beats: response.beats?.map((beat: any) => ({
        start: beat.start || 0,
        duration: beat.duration || 0.5,
        confidence: beat.confidence || 0.5
      })) || [],
      tatums: response.tatums?.map((tatum: any) => ({
        start: tatum.start || 0,
        duration: tatum.duration || 0.25,
        confidence: tatum.confidence || 0.5
      })) || []
    };

    return {
      key: response.key || 'C',
      mode: response.mode || 'major',
      tempo: response.tempo || 120,
      camelot: response.camelot || '1A',
      energy: response.energy || 50,
      danceability: response.danceability || 50,
      happiness: response.happiness || 50,
      acousticness: response.acousticness || 50,
      instrumentalness: response.instrumentalness || 50,
      loudness: response.loudness || '-8 dB',
      speechiness: response.speechiness || 10,
      liveness: response.liveness || 10,
      duration: response.duration || '3:00',
      popularity: response.popularity || 50,
      sections,
      segments,
      rhythmic,
      meta: {
        trackDuration: this.parseDurationString(response.duration || '3:00'),
        analysisVersion: 'rapidapi-enhanced-v1',
        timestamp: new Date().toISOString()
      }
    };
  }

  // Helper methods
  private determinePhaseFromSection(section: TimeBasedSection, index: number, totalSections: number): WorkoutMoment['phaseType'] {
    // Determine workout phase based on section position and characteristics
    const position = index / totalSections;
    
    if (position < 0.15) return 'warmup';
    if (position > 0.85) return 'cooldown';
    
    // Middle sections based on tempo and energy
    if (section.tempo > 130) {
      return section.sectionType === 'chorus' ? 'sprint' : 'jumps';
    } else if (section.tempo < 90) {
      return 'resistance';
    } else if (section.loudness > -6) {
      return 'hills';
    }
    
    return 'climb';
  }

  private calculateIntensity(section: TimeBasedSection): number {
    // Calculate intensity (0-100) based on section characteristics
    let intensity = 50; // Base intensity
    
    // Tempo contribution (30% of intensity)
    intensity += ((section.tempo - 120) / 120) * 30;
    
    // Loudness contribution (30% of intensity)  
    intensity += ((section.loudness + 10) / 10) * 30;
    
    // Section type contribution (40% of intensity)
    const sectionBonus = {
      'intro': -20,
      'verse': -10,
      'chorus': 25,
      'bridge': 10,
      'outro': -30,
      'unknown': 0
    };
    intensity += sectionBonus[section.sectionType || 'unknown'];
    
    return Math.max(0, Math.min(100, Math.round(intensity)));
  }

  private generateNarrativeForSection(section: TimeBasedSection, phaseType: WorkoutMoment['phaseType']): string {
    const narratives = {
      warmup: `Easy spin at ${Math.round(section.tempo)} BPM. Let your body warm up naturally.`,
      sprint: `Sprint time! ${Math.round(section.tempo)} BPM - quick legs, strong core.`,
      hills: `Hill climb at ${Math.round(section.tempo)} BPM. Strong legs, steady breathing.`,
      resistance: `Heavy resistance at ${Math.round(section.tempo)} BPM. Let the bass drive your legs.`,
      jumps: `High-tempo transitions! Up for 8, down for 8 - ride the beat at ${Math.round(section.tempo)} BPM.`,
      climb: `Steady climb at ${Math.round(section.tempo)} BPM. Mix seated and standing positions.`,
      cooldown: `Cool down at ${Math.round(section.tempo)} BPM. Let your heart rate settle gently.`
    };
    
    return narratives[phaseType];
  }

  private generateBeatCue(section: TimeBasedSection, phaseType: WorkoutMoment['phaseType']): string {
    const cues = {
      warmup: 'Check your posture - tall spine, soft shoulders.',
      sprint: 'Get ready to fly - this is your speed section!',
      hills: 'Add resistance - drive through your heels!',
      resistance: 'Quarter turn on - dip those heels!',
      jumps: 'Switch positions - hips over pedals!',
      climb: 'Find your sustainable power - you\'ve got this!',
      cooldown: 'Deep breaths - incredible work today.'
    };
    
    return cues[phaseType];
  }

  private generateMidSectionNarrative(phaseType: WorkoutMoment['phaseType'], tempo: number): string {
    return `Keep it going at ${Math.round(tempo)} BPM - you're crushing this ${phaseType} section!`;
  }

  private generateMidSectionBeatCue(phaseType: WorkoutMoment['phaseType']): string {
    const midCues = {
      warmup: 'Feeling good - body warming up nicely.',
      sprint: 'Maintain that speed - stay with the rhythm!',
      hills: 'Power through - strong and steady!',
      resistance: 'Full pedal stroke - push and pull through.',
      jumps: 'Keep switching - smooth transitions!',
      climb: 'Halfway there - maintain that effort!',
      cooldown: 'Let it all go - you earned this recovery.'
    };
    
    return midCues[phaseType];
  }

  private findSectionAtTime(sections: TimeBasedSection[], timeInSeconds: number): TimeBasedSection | null {
    return sections.find(section => 
      timeInSeconds >= section.start && timeInSeconds < (section.start + section.duration)
    ) || null;
  }

  private inferSectionType(section: any): TimeBasedSection['sectionType'] {
    // Logic to infer section type from API data
    // This would need to be refined based on actual API response structure
    if (section.confidence > 0.8 && section.loudness > -5) {
      return 'chorus';
    } else if (section.confidence > 0.6) {
      return 'verse';
    }
    return 'unknown';
  }

  private parseDurationString(duration: string): number {
    // Parse "2:30" format to seconds
    const parts = duration.split(':');
    if (parts.length === 2) {
      return parseInt(parts[0]) * 60 + parseInt(parts[1]);
    }
    return 180; // Default 3 minutes
  }
}

export const enhancedRapidSoundnetService = new EnhancedRapidSoundnetService();