// Enhanced Analysis Logger - Creates multiple database entries per track
// Shows changing attributes throughout song duration

import { spotifyAnalysisLogger } from './spotify-analysis-logger';
import { DetailedTrackAnalysis, TimeBasedSection, WorkoutMoment } from './enhanced-rapid-soundnet';
import { secureDatabaseService } from './secure-database-service';

export interface SectionAnalysisEntry {
  // Track identification
  trackId: string;
  trackName: string;
  artistName: string;
  
  // Section timing
  sectionIndex: number;
  sectionStartTime: number; // seconds
  sectionDuration: number;  // seconds
  sectionEndTime: number;   // calculated
  sectionType: string;      // verse, chorus, bridge, etc.
  confidence: number;       // section detection confidence
  
  // Changing musical attributes per section
  tempo: number;
  key: number;
  mode: number; // 0=minor, 1=major
  timeSignature: number;
  loudness: number;
  
  // Derived attributes (calculated from section data)
  energy: number;           // derived from loudness and tempo
  danceability: number;     // derived from tempo and rhythmic consistency
  valence: number;          // derived from key, mode, and loudness
  
  // Workout mapping
  workoutPhase: string;     // warmup, sprint, hills, etc.
  workoutIntensity: number; // 0-100
  workoutNarrative: string; // instruction for this section
  
  // Metadata
  sessionId: string;
  timestamp: string;
  dataSource: 'enhanced-rapidapi';
  analysisVersion: string;
}

class EnhancedAnalysisLogger {
  
  // Log detailed analysis with multiple entries per track
  async logDetailedTrackAnalysis(
    trackTitle: string,
    artistName: string,
    analysis: DetailedTrackAnalysis,
    workoutMoments: WorkoutMoment[]
  ): Promise<void> {
    try {
      console.log('🗄️ Starting enhanced database logging for:', trackTitle);
      
      // Ensure we have an active session
      if (!spotifyAnalysisLogger.getCurrentSessionId()) {
        console.log('🗄️ No active session - creating enhanced analysis session');
        await spotifyAnalysisLogger.startWorkoutSession('enhanced-analysis');
      }
      
      const sessionId = spotifyAnalysisLogger.getCurrentSessionId();
      if (!sessionId) {
        throw new Error('Could not create or get session ID');
      }
      
      // Generate unique track ID for this analysis
      const trackId = `enhanced_${trackTitle.replace(/\s+/g, '_')}_${Date.now()}`;
      
      console.log('🗄️ Processing sections for database logging:', analysis.sections.length);
      
      // Create entries for each section
      const sectionEntries: SectionAnalysisEntry[] = [];
      
      for (let i = 0; i < analysis.sections.length; i++) {
        const section = analysis.sections[i];
        
        // Find corresponding workout moment for this section
        const sectionTimeMs = section.start * 1000;
        const correspondingMoment = workoutMoments.find(moment => 
          Math.abs(moment.timeMs - sectionTimeMs) < 5000 // Within 5 seconds
        );
        
        // Calculate derived attributes from section data
        const derivedAttributes = this.calculateDerivedAttributes(section, analysis);
        
        const entry: SectionAnalysisEntry = {
          // Track identification
          trackId,
          trackName: trackTitle,
          artistName: artistName || 'Unknown',
          
          // Section timing
          sectionIndex: i,
          sectionStartTime: section.start,
          sectionDuration: section.duration,
          sectionEndTime: section.start + section.duration,
          sectionType: section.sectionType || 'unknown',
          confidence: section.confidence,
          
          // Changing musical attributes
          tempo: section.tempo,
          key: section.key,
          mode: section.mode,
          timeSignature: section.time_signature,
          loudness: section.loudness,
          
          // Derived attributes
          energy: derivedAttributes.energy,
          danceability: derivedAttributes.danceability,
          valence: derivedAttributes.valence,
          
          // Workout mapping
          workoutPhase: correspondingMoment?.phaseType || 'unknown',
          workoutIntensity: correspondingMoment?.intensity || 50,
          workoutNarrative: correspondingMoment?.narrative || 'Continue workout',
          
          // Metadata
          sessionId,
          timestamp: new Date().toISOString(),
          dataSource: 'enhanced-rapidapi',
          analysisVersion: analysis.meta?.analysisVersion || 'v1'
        };
        
        sectionEntries.push(entry);
      }
      
      console.log('🗄️ Created section entries:', sectionEntries.length);
      
      // Log each section entry to database
      for (const entry of sectionEntries) {
        await this.logSectionEntry(entry);
        
        // Add small delay to prevent overwhelming the database
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      console.log('✅ Enhanced database logging completed for:', trackTitle);
      
      // Also log a summary entry for the overall track
      await this.logTrackSummary(trackTitle, artistName, analysis, sectionEntries.length, sessionId);
      
    } catch (error) {
      console.error('💥 Enhanced database logging failed:', error);
      throw error;
    }
  }
  
  // Log individual section entry to database
  private async logSectionEntry(entry: SectionAnalysisEntry): Promise<void> {
    try {
      console.log(`🗄️ Logging section ${entry.sectionIndex} (${entry.sectionType}) at ${entry.sectionStartTime}s`);
      
      // FIXED: Direct database insertion instead of using interval-based logger
      const sectionLogData = {
        session_id: entry.sessionId,
        vendor_source: 'Enhanced RapidAPI Sectional',
        track_name: entry.trackName,
        artist_name: entry.artistName,
        data_source: entry.dataSource,
        from_cache: false,
        fallback_type: null,
        playback_position_ms: Math.round(entry.sectionStartTime * 1000), // FIXED: Convert to integer
        is_playing: true,
        
        // SECTION COLUMNS - Now properly populated
        section_indicator: `Section ${entry.sectionIndex}: ${entry.sectionType} (${entry.sectionStartTime}s-${(entry.sectionStartTime + entry.sectionDuration).toFixed(1)}s)`,
        section_index: entry.sectionIndex,
        section_type: entry.sectionType,
        section_narrative: entry.workoutNarrative,
        
        // CHANGING MUSICAL ATTRIBUTES PER SECTION (not static!) - FIXED: Round decimals to integers
        soundnet_tempo: Math.round(entry.tempo),
        soundnet_key: this.convertKeyToString(entry.key),
        soundnet_mode: entry.mode === 1 ? 'major' : 'minor',
        soundnet_loudness: `${entry.loudness} dB`,
        soundnet_energy: Math.round(entry.energy),
        soundnet_danceability: Math.round(entry.danceability),
        soundnet_happiness: Math.round(entry.valence),
        soundnet_acousticness: 50,  // Could be varied per section
        soundnet_instrumentalness: 30,
        soundnet_speechiness: 5,
        soundnet_liveness: 10,
        soundnet_duration: this.formatDuration(entry.sectionDuration),
        soundnet_popularity: 50,
        soundnet_camelot: '1A',
        
        // RapidAPI raw values (0-100 scale) - FIXED: Round decimals to integers
        rs_energy_raw: Math.round(entry.energy),
        rs_danceability_raw: Math.round(entry.danceability),
        rs_acousticness_raw: 50,
        rs_instrumentalness_raw: 30,
        rs_speechiness_raw: 5,
        rs_liveness_raw: 10,
        rs_happiness: Math.round(entry.valence),
        rs_popularity: 50,
        rs_duration: this.formatDuration(entry.sectionDuration),
        rs_loudness: `${entry.loudness} dB`,
        rs_key: this.convertKeyToString(entry.key),
        rs_mode: entry.mode === 1 ? 'major' : 'minor',
        rs_camelot: '1A',
        
        // Fitness context
        fitness_phase: entry.workoutPhase,
        workout_intensity: Math.round(entry.workoutIntensity / 10), // FIXED: Convert to integer (1-10 scale)
        
        // Metadata
        timestamp: entry.timestamp
      };

      console.log('📝 DIRECT section database insert:', {
        section: `${entry.sectionIndex}: ${entry.sectionType}`,
        tempo: entry.tempo,
        loudness: entry.loudness,
        energy: entry.energy,
        sectionIndicator: sectionLogData.section_indicator
      });

      // Direct database insertion using secure service
      const logId = await secureDatabaseService.logAnalysis(sectionLogData);
      console.log('✅ Successfully logged section', entry.sectionIndex, 'with ID:', logId);
      
    } catch (error) {
      console.error('💥 Failed to log section entry:', error);
    }
  }
  
  // Log summary entry for the complete track
  private async logTrackSummary(
    trackTitle: string, 
    artistName: string, 
    analysis: DetailedTrackAnalysis,
    sectionsLogged: number,
    sessionId: string
  ): Promise<void> {
    try {
      console.log('🗄️ Logging track summary with sections count:', sectionsLogged);
      
      const summaryContext = {
        trackId: `${analysis.meta?.analysisVersion || 'summary'}_${trackTitle.replace(/\s+/g, '_')}_${Date.now()}`,
        trackName: `${trackTitle} (SUMMARY)`,
        artistName: artistName || 'Unknown',
        positionMs: 0,
        fitnessPhase: 'summary',
        workoutIntensity: 5,
        
        audioFeatures: {
          tempo: analysis.tempo,
          key: 0,
          mode: analysis.mode === 'major' ? 1 : 0,
          time_signature: 4,
          loudness: -8,
          energy: analysis.energy / 100,
          danceability: analysis.danceability / 100,
          valence: analysis.happiness / 100,
          acousticness: analysis.acousticness / 100,
          instrumentalness: analysis.instrumentalness / 100,
          liveness: analysis.liveness / 100,
          speechiness: analysis.speechiness / 100,
          duration_ms: (analysis.meta?.trackDuration || 180) * 1000
        },
        
        // Summary metadata
        summaryData: {
          totalSections: sectionsLogged,
          trackDuration: analysis.meta?.trackDuration || 180,
          analysisVersion: analysis.meta?.analysisVersion || 'v1',
          hasSections: analysis.sections.length > 0,
          hasSegments: analysis.segments?.length > 0,
          hasRhythmic: analysis.rhythmic?.bars.length > 0
        },
        
        dataSource: 'enhanced-rapidapi-summary',
        fromCache: false,
        rapidSoundnetData: analysis
      };
      
      spotifyAnalysisLogger.startTrackLogging(summaryContext);
      await new Promise(resolve => setTimeout(resolve, 100));
      spotifyAnalysisLogger.stopTrackLogging();
      
    } catch (error) {
      console.error('💥 Failed to log track summary:', error);
    }
  }
  
  // Calculate derived attributes from section data
  private calculateDerivedAttributes(section: TimeBasedSection, fullAnalysis: DetailedTrackAnalysis) {
    // Energy: derived from loudness and tempo
    let energy = 50; // Base energy
    energy += ((section.loudness + 10) / 20) * 30; // Loudness contribution
    energy += ((section.tempo - 120) / 60) * 20;   // Tempo contribution
    energy = Math.max(0, Math.min(100, energy));
    
    // Danceability: derived from tempo and rhythmic consistency
    let danceability = 50;
    if (section.tempo >= 90 && section.tempo <= 140) {
      danceability += 30; // Good dance tempo
    }
    if (section.time_signature === 4) {
      danceability += 10; // 4/4 time is danceable
    }
    danceability = Math.max(0, Math.min(100, danceability));
    
    // Valence: derived from key, mode, and loudness
    let valence = 50;
    if (section.mode === 1) valence += 20; // Major keys are happier
    if (section.loudness > -8) valence += 15; // Louder is often happier
    // Certain keys are perceived as brighter
    const brightKeys = [0, 2, 4, 7, 9]; // C, D, E, G, A
    if (brightKeys.includes(section.key)) valence += 10;
    valence = Math.max(0, Math.min(100, valence));
    
    return { energy, danceability, valence };
  }
  
  // Helper methods
  private convertKeyToString(keyNum: number): string {
    const keys = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    return keys[keyNum] || 'C';
  }
  
  private formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
  
  // Get session statistics
  async getEnhancedSessionStats(sessionId?: string): Promise<any> {
    try {
      const currentSessionId = sessionId || spotifyAnalysisLogger.getCurrentSessionId();
      if (!currentSessionId) return null;
      
      // This would query the database for enhanced statistics
      // For now, return mock data that shows the concept
      return {
        sessionId: currentSessionId,
        totalTracks: 3,
        totalSections: 15,
        avgSectionsPerTrack: 5,
        uniqueWorkoutPhases: ['warmup', 'sprint', 'hills', 'cooldown'],
        tempoRange: { min: 85, max: 145 },
        energyRange: { min: 25, max: 95 },
        analysisDepth: 'enhanced-sections'
      };
    } catch (error) {
      console.error('💥 Failed to get enhanced session stats:', error);
      return null;
    }
  }
}

export const enhancedAnalysisLogger = new EnhancedAnalysisLogger();