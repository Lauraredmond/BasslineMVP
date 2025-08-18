// Spotify Audio Analysis Logger
// Logs all Spotify audio analysis attributes during playback for fitness narrative mapping research

import { supabase } from './supabase';

export interface SpotifyAnalysisData {
  meta: {
    analyzer_version?: string;
    platform?: string;
    detailed_status?: string;
    status_code?: number;
    timestamp?: number;
    analysis_time?: number;
    input_process?: string;
  };
  track: {
    num_samples?: number;
    duration?: number;
    sample_md5?: string;
    offset_seconds?: number;
    window_seconds?: number;
    analysis_sample_rate?: number;
    analysis_channels?: number;
    end_of_fade_in?: number;
    start_of_fade_out?: number;
    loudness?: number;
    tempo?: number;
    tempo_confidence?: number;
    time_signature?: number;
    time_signature_confidence?: number;
    key?: number;
    key_confidence?: number;
    mode?: number;
    mode_confidence?: number;
    codestring?: string;
    code_version?: number;
    echoprintstring?: string;
    echoprint_version?: number;
    synchstring?: string;
    synch_version?: number;
    rhythmstring?: string;
    rhythm_version?: number;
  };
  bars: Array<{
    start: number;
    duration: number;
    confidence: number;
  }>;
  beats: Array<{
    start: number;
    duration: number;
    confidence: number;
  }>;
  tatums: Array<{
    start: number;
    duration: number;
    confidence: number;
  }>;
  sections: Array<{
    start: number;
    duration: number;
    confidence: number;
    loudness: number;
    tempo: number;
    tempo_confidence: number;
    key: number;
    key_confidence: number;
    mode: number;
    mode_confidence: number;
    time_signature: number;
    time_signature_confidence: number;
  }>;
  segments: Array<{
    start: number;
    duration: number;
    confidence: number;
    loudness_start: number;
    loudness_max: number;
    loudness_max_time: number;
    loudness_end: number;
    pitches: number[];
    timbre: number[];
  }>;
}

export interface PlaybackContext {
  trackId: string;
  trackName?: string;
  artistName?: string;
  positionMs: number;
  fitnessPhase?: string;
  workoutIntensity?: number;
  userNotes?: string;
}

class SpotifyAnalysisLogger {
  private sessionId: string | null = null;
  private analysisData: SpotifyAnalysisData | null = null;
  private isLogging = false;
  private logInterval: number | null = null;
  private readonly LOG_INTERVAL_MS = 1000; // Log every second
  private currentWorkoutType: string | null = null;
  private currentFitnessPhase: string | null = null;
  private autoSessionStarted = false;

  // Start a new logging session
  async startLoggingSession(sessionName?: string, workoutType?: string): Promise<string> {
    try {
      const { data, error } = await supabase
        .from('spotify_playback_sessions')
        .insert({
          session_name: sessionName || `Session ${new Date().toISOString()}`,
          workout_type: workoutType || 'general',
          start_time: new Date().toISOString()
        })
        .select('id')
        .single();

      if (error) throw error;

      this.sessionId = data.id;
      console.log('Started logging session:', this.sessionId);
      return this.sessionId;
    } catch (error) {
      console.error('Error starting logging session:', error);
      throw error;
    }
  }

  // Store complete analysis data for a track
  async storeTrackAnalysis(trackId: string, trackName: string, artistName: string, analysisData: SpotifyAnalysisData): Promise<void> {
    try {
      await supabase
        .from('spotify_track_analysis')
        .upsert({
          track_id: trackId,
          track_name: trackName,
          artist_name: artistName,
          analysis_data: analysisData,
          updated_at: new Date().toISOString()
        });

      this.analysisData = analysisData;
      console.log('Stored track analysis for:', trackName);
    } catch (error) {
      console.error('Error storing track analysis:', error);
      throw error;
    }
  }

  // Start logging for a specific track
  startTrackLogging(context: PlaybackContext): void {
    if (!this.sessionId) {
      console.error('❌ Cannot start logging: no session ID');
      return;
    }
    
    // If no analysis data, create minimal fallback data for basic logging
    if (!this.analysisData) {
      console.warn('⚠️ No analysis data available, creating minimal fallback for basic logging');
      this.createMinimalAnalysisData(context);
    }

    console.log('🎵 Starting track logging for:', context.trackName);
    console.log('📊 Analysis data available:', !!this.analysisData);
    console.log('🔗 Session ID:', this.sessionId);
    
    this.isLogging = true;
    
    // Log immediately
    this.logCurrentState(context);

    // Set up interval logging
    this.logInterval = window.setInterval(() => {
      if (this.isLogging) {
        this.logCurrentState(context);
      }
    }, this.LOG_INTERVAL_MS);

    console.log('✅ Track logging started with', this.LOG_INTERVAL_MS, 'ms interval');
  }

  // Stop logging
  stopLogging(): void {
    this.isLogging = false;
    if (this.logInterval) {
      clearInterval(this.logInterval);
      this.logInterval = null;
    }
    console.log('Stopped logging');
  }

  // End the current session
  async endSession(): Promise<void> {
    this.stopLogging();
    
    if (this.sessionId) {
      try {
        await supabase
          .from('spotify_playback_sessions')
          .update({
            end_time: new Date().toISOString()
          })
          .eq('id', this.sessionId);

        console.log('Ended logging session:', this.sessionId);
        this.sessionId = null;
      } catch (error) {
        console.error('Error ending session:', error);
      }
    }
  }

  // Log the current state based on playback position
  private async logCurrentState(context: PlaybackContext): Promise<void> {
    if (!this.sessionId || !this.analysisData) return;

    try {
      // Use updated position if available, otherwise use context position
      const currentPositionMs = this.currentPlaybackPosition > 0 ? this.currentPlaybackPosition : context.positionMs;
      const positionSeconds = currentPositionMs / 1000;
      
      // Find current section, segment, beat, bar, tatum
      const currentSection = this.findCurrentTimeRange(this.analysisData.sections, positionSeconds);
      const currentSegment = this.findCurrentTimeRange(this.analysisData.segments, positionSeconds);
      const currentBeat = this.findCurrentTimeRange(this.analysisData.beats, positionSeconds);
      const currentBar = this.findCurrentTimeRange(this.analysisData.bars, positionSeconds);
      const currentTatum = this.findCurrentTimeRange(this.analysisData.tatums, positionSeconds);

      const logEntry = {
        session_id: this.sessionId,
        track_id: context.trackId,
        track_name: context.trackName,
        artist_name: context.artistName,
        playback_position_ms: currentPositionMs,
        
        // Meta
        analyzer_version: this.analysisData.meta.analyzer_version,
        platform: this.analysisData.meta.platform,
        detailed_status: this.analysisData.meta.detailed_status,
        status_code: this.analysisData.meta.status_code,
        analysis_timestamp: this.analysisData.meta.timestamp ? new Date(this.analysisData.meta.timestamp * 1000).toISOString() : null,
        analysis_time: this.analysisData.meta.analysis_time,
        input_process: this.analysisData.meta.input_process,
        
        // Track
        num_samples: this.analysisData.track.num_samples,
        duration: this.analysisData.track.duration,
        sample_md5: this.analysisData.track.sample_md5,
        offset_seconds: this.analysisData.track.offset_seconds,
        window_seconds: this.analysisData.track.window_seconds,
        analysis_sample_rate: this.analysisData.track.analysis_sample_rate,
        analysis_channels: this.analysisData.track.analysis_channels,
        end_of_fade_in: this.analysisData.track.end_of_fade_in,
        start_of_fade_out: this.analysisData.track.start_of_fade_out,
        track_loudness: this.analysisData.track.loudness,
        track_tempo: this.analysisData.track.tempo,
        tempo_confidence: this.analysisData.track.tempo_confidence,
        time_signature: this.analysisData.track.time_signature,
        time_signature_confidence: this.analysisData.track.time_signature_confidence,
        track_key: this.analysisData.track.key,
        key_confidence: this.analysisData.track.key_confidence,
        track_mode: this.analysisData.track.mode,
        mode_confidence: this.analysisData.track.mode_confidence,
        
        // Current section
        current_section_start: currentSection?.start,
        current_section_duration: currentSection?.duration,
        current_section_confidence: currentSection?.confidence,
        current_section_loudness: currentSection?.loudness,
        current_section_tempo: currentSection?.tempo,
        current_section_tempo_confidence: currentSection?.tempo_confidence,
        current_section_key: currentSection?.key,
        current_section_key_confidence: currentSection?.key_confidence,
        current_section_mode: currentSection?.mode,
        current_section_mode_confidence: currentSection?.mode_confidence,
        current_section_time_signature: currentSection?.time_signature,
        current_section_time_signature_confidence: currentSection?.time_signature_confidence,
        
        // Current segment
        current_segment_start: currentSegment?.start,
        current_segment_duration: currentSegment?.duration,
        current_segment_confidence: currentSegment?.confidence,
        current_segment_loudness_start: currentSegment?.loudness_start,
        current_segment_loudness_max: currentSegment?.loudness_max,
        current_segment_loudness_max_time: currentSegment?.loudness_max_time,
        current_segment_loudness_end: currentSegment?.loudness_end,
        current_segment_pitches: currentSegment?.pitches,
        current_segment_timbre: currentSegment?.timbre,
        
        // Current beat/bar/tatum
        current_beat_start: currentBeat?.start,
        current_beat_duration: currentBeat?.duration,
        current_beat_confidence: currentBeat?.confidence,
        current_bar_start: currentBar?.start,
        current_bar_duration: currentBar?.duration,
        current_bar_confidence: currentBar?.confidence,
        current_tatum_start: currentTatum?.start,
        current_tatum_duration: currentTatum?.duration,
        current_tatum_confidence: currentTatum?.confidence,
        
        // Fitness context
        fitness_phase: context.fitnessPhase,
        workout_intensity: context.workoutIntensity,
        user_notes: context.userNotes,
        
        // Timestamp for proper ordering
        timestamp: new Date().toISOString()
      };

      console.log('📝 Logging analysis entry for:', context.trackName, 'at position', currentPositionMs, 'ms');
      
      const { error } = await supabase
        .from('spotify_analysis_logs')
        .insert(logEntry);

      if (error) {
        console.error('❌ Error logging analysis data:', error);
      } else {
        console.log('✅ Successfully logged analysis data to database');
      }
    } catch (error) {
      console.error('Error in logCurrentState:', error);
    }
  }

  // Find the current time range item (section, segment, etc.) for a given position
  private findCurrentTimeRange<T extends { start: number; duration: number }>(
    items: T[], 
    positionSeconds: number
  ): T | undefined {
    return items.find(item => 
      positionSeconds >= item.start && 
      positionSeconds < (item.start + item.duration)
    );
  }

  // Update fitness context during playback
  updateContext(context: Partial<PlaybackContext>): void {
    // This could be used to update fitness phase, intensity, etc. during playback
    console.log('Updated context:', context);
  }

  // Get current session ID
  getCurrentSessionId(): string | null {
    return this.sessionId;
  }

  // Check if currently logging
  isCurrentlyLogging(): boolean {
    return this.isLogging;
  }

  // Auto-start session when workout begins
  async startWorkoutSession(workoutType: string, workoutPlan?: any): Promise<void> {
    if (this.autoSessionStarted) return; // Already have an active session

    try {
      const sessionName = `${workoutType} Workout - ${new Date().toLocaleString()}`;
      await this.startLoggingSession(sessionName, workoutType);
      this.currentWorkoutType = workoutType;
      this.autoSessionStarted = true;
      console.log('Auto-started workout logging session:', sessionName);
    } catch (error) {
      console.error('Error auto-starting workout session:', error);
    }
  }

  // Auto-end session when workout completes
  async endWorkoutSession(): Promise<void> {
    if (!this.autoSessionStarted) return;

    this.stopLogging();
    await this.endSession();
    this.autoSessionStarted = false;
    this.currentWorkoutType = null;
    this.currentFitnessPhase = null;
    console.log('Auto-ended workout logging session');
  }

  // Update fitness phase during workout
  setCurrentFitnessPhase(phase: string): void {
    this.currentFitnessPhase = phase;
    console.log('Updated fitness phase:', phase);
  }

  // Auto-start logging when a track plays during workout
  async autoStartTrackLogging(trackId: string, trackName: string, artistName: string): Promise<void> {
    if (!this.autoSessionStarted || !trackId) return;

    try {
      // Get analysis data from Spotify API (this would normally be fetched from Spotify)
      // For now, we'll just start logging with the track info
      if (!this.analysisData) {
        console.log('No analysis data available for track:', trackName);
        // In a real implementation, you'd fetch this from Spotify's audio analysis API
        return;
      }

      const context: PlaybackContext = {
        trackId,
        trackName,
        artistName,
        positionMs: 0, // This would be updated by the playback progress
        fitnessPhase: this.currentFitnessPhase || 'unknown',
        workoutIntensity: 7 // Default intensity, could be dynamic
      };

      this.startTrackLogging(context);
      console.log('Auto-started logging for track:', trackName);
    } catch (error) {
      console.error('Error auto-starting track logging:', error);
    }
  }

  // Create minimal analysis data for basic logging when Spotify API fails
  private createMinimalAnalysisData(context: PlaybackContext): void {
    console.log('🔧 Creating minimal analysis data for:', context.trackName);
    
    // Create minimal structure that satisfies the logging requirements
    this.analysisData = {
      meta: {
        analyzer_version: '4.0.0-fallback',
        platform: 'web-fallback',
        detailed_status: 'OK-fallback',
        status_code: 200,
        timestamp: Date.now() / 1000,
        analysis_time: 0.1,
        input_process: 'fallback'
      },
      track: {
        num_samples: 44100,
        duration: 180, // Default 3 minutes
        sample_md5: 'fallback-md5',
        offset_seconds: 0,
        window_seconds: 0,
        analysis_sample_rate: 44100,
        analysis_channels: 2,
        end_of_fade_in: 0,
        start_of_fade_out: 170,
        loudness: -10,
        tempo: 120, // Default tempo
        tempo_confidence: 0.8,
        time_signature: 4,
        time_signature_confidence: 0.9,
        key: 0,
        key_confidence: 0.7,
        mode: 1,
        mode_confidence: 0.8,
        codestring: 'fallback',
        code_version: 4.0,
        echoprintstring: 'fallback',
        echoprint_version: 4.0,
        synchstring: 'fallback',
        synch_version: 1.0,
        rhythmstring: 'fallback',
        rhythm_version: 1.0
      },
      bars: [{ start: 0, duration: 2.0, confidence: 0.8 }],
      beats: [{ start: 0, duration: 0.5, confidence: 0.8 }],
      sections: [{
        start: 0,
        duration: 180,
        confidence: 0.7,
        loudness: -10,
        tempo: 120,
        tempo_confidence: 0.8,
        key: 0,
        key_confidence: 0.7,
        mode: 1,
        mode_confidence: 0.8,
        time_signature: 4,
        time_signature_confidence: 0.9
      }],
      segments: [{
        start: 0,
        duration: 1.0,
        confidence: 0.7,
        loudness_start: -10,
        loudness_max: -8,
        loudness_max_time: 0.5,
        loudness_end: -10,
        pitches: [0.5, 0.3, 0.2, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1],
        timbre: [30, -10, 0, 5, -2, 8, 12, -5, 3, 1, -3, 7]
      }],
      tatums: [{ start: 0, duration: 0.25, confidence: 0.8 }]
    };
    
    console.log('✅ Created minimal analysis data for basic logging');
  }

  // Update playback position (called by music player)
  updatePlaybackPosition(positionMs: number): void {
    // Update the position for the next log entry - store current position
    this.currentPlaybackPosition = positionMs;
  }
  
  private currentPlaybackPosition = 0;
}

// Export singleton instance
export const spotifyAnalysisLogger = new SpotifyAnalysisLogger();