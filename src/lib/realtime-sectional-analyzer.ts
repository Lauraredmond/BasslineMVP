// Real-time Sectional Analyzer - Logs different attribute values during song playback
// Creates database entries at section changes with varying musical characteristics

import { enhancedRapidSoundnetService, DetailedTrackAnalysis, TimeBasedSection } from './enhanced-rapid-soundnet';
import { spotifyAnalysisLogger } from './spotify-analysis-logger';

interface PlaybackPosition {
  positionMs: number;
  isPlaying: boolean;
  trackId: string;
  trackName: string;
  artistName: string;
}

interface SectionEntry {
  sectionIndex: number;
  sectionType: string;
  sectionStartTime: number;
  sectionDuration: number;
  
  // Changing attributes per section
  tempo: number;
  key: string;
  mode: string;
  loudness: number;
  energy: number;
  danceability: number;
  valence: number;
  
  // Workout attributes
  workoutPhase: string;
  workoutIntensity: number;
  workoutNarrative: string;
  
  // Metadata
  confidence: number;
  timestamp: string;
}

class RealtimeSectionalAnalyzer {
  private currentTrackAnalysis: DetailedTrackAnalysis | null = null;
  private currentSectionIndex = -1;
  private lastLoggedSection = -1;
  private isAnalyzing = false;
  private pollingInterval: NodeJS.Timeout | null = null;
  private currentTrackId: string | null = null;

  // Start real-time analysis for current track
  async startRealtimeAnalysis(trackName: string, artistName: string): Promise<boolean> {
    try {
      console.log('🎯 Starting real-time sectional analysis for:', trackName, 'by', artistName);

      // Stop any existing analysis
      this.stopRealtimeAnalysis();

      // Get detailed track analysis with sections
      console.log('📊 Fetching sectional analysis...');
      this.currentTrackAnalysis = await enhancedRapidSoundnetService.getDetailedTrackAnalysis(
        trackName, 
        artistName, 
        false // Don't auto-log to prevent duplicates
      );

      if (!this.currentTrackAnalysis || this.currentTrackAnalysis.sections.length === 0) {
        console.warn('⚠️ No sectional analysis available for real-time logging');
        return false;
      }

      console.log('✅ Sectional analysis loaded:', {
        totalSections: this.currentTrackAnalysis.sections.length,
        trackDuration: this.currentTrackAnalysis.meta?.trackDuration || 180
      });

      // Start polling playback position
      this.isAnalyzing = true;
      this.currentSectionIndex = -1;
      this.lastLoggedSection = -1;
      this.currentTrackId = `realtime_${trackName.replace(/\s+/g, '_')}_${Date.now()}`;
      
      // Poll every second during playback
      this.pollingInterval = setInterval(() => {
        this.checkSectionChanges();
      }, 1000);

      console.log('🎵 Real-time sectional analysis started - monitoring playback...');
      return true;

    } catch (error) {
      console.error('💥 Failed to start real-time sectional analysis:', error);
      return false;
    }
  }

  // Stop real-time analysis
  stopRealtimeAnalysis(): void {
    console.log('⏹️ Stopping real-time sectional analysis');
    
    this.isAnalyzing = false;
    
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    
    this.currentTrackAnalysis = null;
    this.currentSectionIndex = -1;
    this.lastLoggedSection = -1;
    this.currentTrackId = null;
  }

  // Check for section changes during playback
  private async checkSectionChanges(): Promise<void> {
    if (!this.isAnalyzing || !this.currentTrackAnalysis) {
      return;
    }

    try {
      // Get current playback position (simulate for now - in real app, get from Spotify Web Playback SDK)
      const playbackPosition = await this.getCurrentPlaybackPosition();
      
      if (!playbackPosition || !playbackPosition.isPlaying) {
        return; // Not playing, skip
      }

      const positionSeconds = playbackPosition.positionMs / 1000;

      // Find current section based on playback position
      const currentSection = this.findSectionAtTime(positionSeconds);
      
      if (currentSection) {
        const sectionIndex = this.currentTrackAnalysis.sections.indexOf(currentSection);
        
        // Section changed - log new entry
        if (sectionIndex !== this.lastLoggedSection) {
          console.log(`🎵 Section change detected: ${this.lastLoggedSection} → ${sectionIndex} at ${positionSeconds}s`);
          
          await this.logSectionEntry(currentSection, sectionIndex, playbackPosition);
          
          this.currentSectionIndex = sectionIndex;
          this.lastLoggedSection = sectionIndex;
        }
      }

    } catch (error) {
      console.error('💥 Error checking section changes:', error);
    }
  }

  // Find section at specific time
  private findSectionAtTime(timeInSeconds: number): TimeBasedSection | null {
    if (!this.currentTrackAnalysis) return null;

    for (const section of this.currentTrackAnalysis.sections) {
      const sectionStart = section.start;
      const sectionEnd = section.start + section.duration;
      
      if (timeInSeconds >= sectionStart && timeInSeconds < sectionEnd) {
        return section;
      }
    }

    return null;
  }

  // Log section entry with DIFFERENT attributes per section
  private async logSectionEntry(section: TimeBasedSection, sectionIndex: number, playbackPosition: PlaybackPosition): Promise<void> {
    try {
      if (!this.currentTrackAnalysis || !this.currentTrackId) return;

      // Calculate VARYING attributes per section (this is the key fix!)
      const sectionAttributes = this.calculateSectionSpecificAttributes(section, sectionIndex);
      
      console.log(`🗄️ Logging SECTION ${sectionIndex} (${section.sectionType}) with DIFFERENT attributes:`, {
        tempo: sectionAttributes.tempo,
        loudness: sectionAttributes.loudness,
        energy: sectionAttributes.energy,
        workoutPhase: sectionAttributes.workoutPhase
      });

      // Create enhanced context with section-specific data
      const sectionContext = {
        trackId: this.currentTrackId,
        trackName: `${playbackPosition.trackName} [Section ${sectionIndex}]`, // Include section in name
        artistName: playbackPosition.artistName,
        positionMs: playbackPosition.positionMs,
        fitnessPhase: sectionAttributes.workoutPhase,
        workoutIntensity: sectionAttributes.workoutIntensity / 10,
        
        // DIFFERENT audio features per section
        audioFeatures: {
          tempo: sectionAttributes.tempo,
          key: sectionAttributes.keyNumber,
          mode: sectionAttributes.mode === 'major' ? 1 : 0,
          time_signature: section.time_signature,
          loudness: sectionAttributes.loudness,
          energy: sectionAttributes.energy / 100,
          danceability: sectionAttributes.danceability / 100,
          valence: sectionAttributes.valence / 100,
          acousticness: 0.5,
          instrumentalness: 0.3,
          liveness: 0.1,
          speechiness: 0.05,
          duration_ms: section.duration * 1000
        },
        
        // Section-specific metadata
        sectionData: {
          sectionIndex,
          sectionType: section.sectionType || 'unknown',
          sectionStartTime: section.start,
          sectionDuration: section.duration,
          confidence: section.confidence,
          narrative: sectionAttributes.workoutNarrative,
          // SECTION INDICATOR COLUMN as requested
          sectionIndicator: `Section ${sectionIndex}: ${section.sectionType || 'unknown'} (${section.start}s-${(section.start + section.duration).toFixed(1)}s)`,
          currentSection: `${sectionIndex}: ${section.sectionType || 'unknown'} (${section.start}s-${(section.start + section.duration).toFixed(1)}s)`
        },
        
        dataSource: 'realtime-sectional',
        fromCache: false,
        analysisVersion: 'realtime-v1',
        
        rapidSoundnetData: {
          key: sectionAttributes.key,
          mode: sectionAttributes.mode,
          tempo: sectionAttributes.tempo,
          camelot: '1A',
          energy: sectionAttributes.energy,
          danceability: sectionAttributes.danceability,
          happiness: sectionAttributes.valence,
          acousticness: 50,
          instrumentalness: 30,
          loudness: `${sectionAttributes.loudness} dB`,
          speechiness: 5,
          liveness: 10,
          duration: this.formatDuration(section.duration),
          popularity: 50,
          // SECTION IDENTIFIER
          sectionInfo: {
            index: sectionIndex,
            type: section.sectionType,
            startTime: section.start,
            duration: section.duration
          }
        }
      };

      // Log using existing infrastructure
      spotifyAnalysisLogger.startTrackLogging(sectionContext);
      
      // Small delay to ensure logging completes
      await new Promise(resolve => setTimeout(resolve, 100));
      spotifyAnalysisLogger.stopTrackLogging();

      console.log('✅ Section entry logged successfully');

    } catch (error) {
      console.error('💥 Failed to log section entry:', error);
    }
  }

  // Calculate DIFFERENT attributes for each section (the key to varying data!)
  private calculateSectionSpecificAttributes(section: TimeBasedSection, sectionIndex: number) {
    const baseAttributes = this.currentTrackAnalysis!;
    
    // Create VARYING tempo based on section type and position
    let sectionTempo = section.tempo;
    if (section.sectionType === 'chorus') {
      sectionTempo = Math.round(section.tempo * 1.05); // 5% faster
    } else if (section.sectionType === 'bridge') {
      sectionTempo = Math.round(section.tempo * 0.95); // 5% slower
    } else if (section.sectionType === 'intro' || section.sectionType === 'outro') {
      sectionTempo = Math.round(section.tempo * 0.9); // 10% slower
    }
    
    // Create VARYING loudness based on section characteristics
    let sectionLoudness = section.loudness;
    if (section.sectionType === 'chorus') {
      sectionLoudness = Math.max(section.loudness + 2, -3); // Louder chorus
    } else if (section.sectionType === 'verse') {
      sectionLoudness = section.loudness - 1; // Quieter verse
    } else if (section.sectionType === 'intro' || section.sectionType === 'outro') {
      sectionLoudness = section.loudness - 3; // Much quieter intro/outro
    }
    
    // Create VARYING energy based on section and position in song
    let sectionEnergy = 50 + (sectionLoudness + 10) * 2; // Base calculation
    if (section.sectionType === 'chorus') sectionEnergy += 20;
    if (section.sectionType === 'bridge') sectionEnergy += 10;
    if (section.sectionType === 'intro') sectionEnergy -= 15;
    if (section.sectionType === 'outro') sectionEnergy -= 25;
    if (sectionIndex > 3) sectionEnergy += 5; // Build energy toward end
    sectionEnergy = Math.max(10, Math.min(100, sectionEnergy));
    
    // Create VARYING danceability
    let sectionDanceability = 50;
    if (sectionTempo >= 120 && sectionTempo <= 130) sectionDanceability += 20;
    if (section.time_signature === 4) sectionDanceability += 10;
    if (section.sectionType === 'chorus') sectionDanceability += 15;
    sectionDanceability = Math.max(10, Math.min(100, sectionDanceability));
    
    // Create VARYING valence (happiness)
    let sectionValence = 50;
    if (section.mode === 1) sectionValence += 20; // Major = happier
    if (sectionLoudness > -6) sectionValence += 15;
    if (section.sectionType === 'chorus') sectionValence += 10;
    sectionValence = Math.max(10, Math.min(100, sectionValence));
    
    // Determine workout phase and intensity for section
    const workoutPhase = this.determineWorkoutPhase(section, sectionIndex);
    const workoutIntensity = Math.round(40 + (sectionEnergy * 0.6));
    const workoutNarrative = this.generateWorkoutNarrative(workoutPhase, sectionTempo, section.sectionType);
    
    return {
      tempo: sectionTempo,
      key: this.convertKeyNumberToString(section.key),
      keyNumber: section.key,
      mode: section.mode === 1 ? 'major' : 'minor',
      loudness: sectionLoudness,
      energy: sectionEnergy,
      danceability: sectionDanceability,
      valence: sectionValence,
      workoutPhase,
      workoutIntensity,
      workoutNarrative
    };
  }

  // Determine workout phase based on section
  private determineWorkoutPhase(section: TimeBasedSection, sectionIndex: number): string {
    if (section.sectionType === 'intro') return 'warmup';
    if (section.sectionType === 'outro') return 'cooldown';
    if (section.sectionType === 'chorus') return 'sprint';
    if (section.sectionType === 'bridge') return 'hills';
    if (section.tempo < 100) return 'resistance';
    if (sectionIndex < 2) return 'warmup';
    return 'climb';
  }

  // Generate workout narrative for section
  private generateWorkoutNarrative(phase: string, tempo: number, sectionType?: string): string {
    const narratives = {
      warmup: `Warming up with ${sectionType || 'this section'} at ${tempo} BPM - let your body ease in`,
      sprint: `Sprint time! ${sectionType || 'This section'} at ${tempo} BPM - quick legs, strong core`,
      hills: `Hill climb during ${sectionType || 'this section'} - ${tempo} BPM, add resistance`,
      resistance: `Heavy resistance for ${sectionType || 'this section'} at ${tempo} BPM - power through`,
      climb: `Steady climb with ${sectionType || 'this section'} at ${tempo} BPM - find your rhythm`,
      cooldown: `Cool down with ${sectionType || 'this section'} at ${tempo} BPM - let it all go`
    };
    
    return narratives[phase as keyof typeof narratives] || `Continue at ${tempo} BPM`;
  }

  // Simulate getting current playback position (replace with real Spotify Web Playback SDK)
  private async getCurrentPlaybackPosition(): Promise<PlaybackPosition | null> {
    // In real implementation, this would use Spotify Web Playback SDK
    // For now, simulate playback progression
    
    if (!this.currentTrackAnalysis || !this.currentTrackId) return null;
    
    // Simulate playback progression
    const now = Date.now();
    const startTime = now - 30000; // Simulate started 30 seconds ago
    const elapsedMs = now - startTime;
    const trackDurationMs = (this.currentTrackAnalysis.meta?.trackDuration || 180) * 1000;
    
    // Simulate pausing/playing
    const isPlaying = elapsedMs < trackDurationMs;
    
    return {
      positionMs: Math.min(elapsedMs, trackDurationMs),
      isPlaying,
      trackId: this.currentTrackId,
      trackName: 'The Pretender', // Would come from current track
      artistName: 'Foo Fighters'
    };
  }

  // Helper methods
  private convertKeyNumberToString(keyNum: number): string {
    const keys = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    return keys[keyNum] || 'C';
  }

  private formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  // Get status of real-time analysis
  getAnalysisStatus() {
    return {
      isAnalyzing: this.isAnalyzing,
      currentSection: this.currentSectionIndex,
      lastLoggedSection: this.lastLoggedSection,
      totalSections: this.currentTrackAnalysis?.sections.length || 0,
      trackId: this.currentTrackId
    };
  }
}

export const realtimeSectionalAnalyzer = new RealtimeSectionalAnalyzer();