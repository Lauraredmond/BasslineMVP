// Web Audio Analysis Logger - Replaces Spotify Analysis Logger
// Provides real-time music intelligence logging using Web Audio API

import { supabase } from './supabase';
import WebAudioMusicIntelligence, { WebAudioFeatures, WebAudioAnalysis } from './web-audio-music-intelligence';

export interface WebAudioPlaybackContext {
  trackName: string;
  artistName: string;
  trackId: string;
  trackUri: string;
  positionMs: number;
  isPlaying: boolean;
  
  // Fitness context
  fitnessPhase?: string;
  workoutIntensity?: number;
  userNotes?: string;
  
  // Real-time Web Audio analysis
  audioFeatures?: WebAudioFeatures;
  audioAnalysis?: WebAudioAnalysis;
}

export class WebAudioAnalysisLogger {
  private musicIntelligence: WebAudioMusicIntelligence;
  private isLogging = false;
  private loggingInterval: number | null = null;
  private sessionId: string | null = null;
  private currentContext: WebAudioPlaybackContext | null = null;
  
  // Auto-session management
  private autoSessionStarted = false;
  private currentWorkoutType: string | null = null;

  constructor() {
    this.musicIntelligence = new WebAudioMusicIntelligence();
  }

  // Initialize connection to system audio (including Spotify)
  async initialize(): Promise<void> {
    try {
      await this.musicIntelligence.connectToSpotifyAudio();
      console.log('🎵 Web Audio Music Intelligence initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Web Audio Intelligence:', error);
      throw error;
    }
  }

  // Start a new logging session
  async startLoggingSession(sessionName?: string, workoutType?: string): Promise<string> {
    try {
      const { data, error } = await supabase
        .from('spotify_playback_sessions')
        .insert({
          session_name: sessionName || `Web Audio Session ${new Date().toISOString()}`,
          workout_type: workoutType || 'web_audio_analysis',
          start_time: new Date().toISOString()
        })
        .select('id')
        .single();

      if (error) throw error;

      this.sessionId = data.id;
      console.log('🎵 Started Web Audio logging session:', this.sessionId);
      return this.sessionId;
    } catch (error) {
      console.error('❌ Error starting logging session:', error);
      throw error;
    }
  }

  // Start real-time track logging with Web Audio analysis
  async startTrackLogging(context: WebAudioPlaybackContext): Promise<void> {
    if (!this.sessionId) {
      throw new Error('No active session. Start a logging session first.');
    }

    console.log('🎵 Starting Web Audio track logging for:', context.trackName);
    this.currentContext = context;
    this.isLogging = true;

    // Start real-time analysis loop (every 100ms for precise timing)
    this.loggingInterval = window.setInterval(() => {
      this.logCurrentState();
    }, 100);

    console.log('✅ Web Audio analysis logging started');
  }

  // Stop track logging
  stopTrackLogging(): void {
    this.isLogging = false;
    if (this.loggingInterval) {
      clearInterval(this.loggingInterval);
      this.loggingInterval = null;
    }
    console.log('⏹️ Web Audio track logging stopped');
  }

  // Update playback context (called by Spotify integration)
  updatePlaybackContext(context: Partial<WebAudioPlaybackContext>): void {
    if (this.currentContext) {
      this.currentContext = { ...this.currentContext, ...context };
    }
  }

  // Real-time analysis and logging
  private async logCurrentState(): Promise<void> {
    if (!this.isLogging || !this.currentContext || !this.sessionId) {
      return;
    }

    try {
      // Get real-time Web Audio analysis
      const { features, analysis } = this.musicIntelligence.analyzeRealTime();
      
      // Find current musical elements based on position
      const currentPositionSeconds = this.currentContext.positionMs / 1000;
      const currentBeat = this.findCurrentTimeRange(analysis.beats, currentPositionSeconds);
      const currentBar = this.findCurrentTimeRange(analysis.bars, currentPositionSeconds);
      const currentSection = this.findCurrentTimeRange(analysis.sections, currentPositionSeconds);
      const currentSegment = this.findCurrentTimeRange(analysis.segments, currentPositionSeconds);
      const currentTatum = this.findCurrentTimeRange(analysis.tatums, currentPositionSeconds);

      // Create comprehensive log entry matching Spotify structure
      const logEntry = {
        session_id: this.sessionId,
        track_id: this.currentContext.trackId,
        track_name: this.currentContext.trackName,
        artist_name: this.currentContext.artistName,
        track_uri: this.currentContext.trackUri,
        playback_position_ms: this.currentContext.positionMs,
        is_playing: this.currentContext.isPlaying,

        // Track-level attributes (from Web Audio Features)
        track_loudness: features.loudness,
        track_tempo: features.tempo,
        tempo_confidence: 0.8, // Web Audio derived confidence
        time_signature: features.time_signature,
        track_key: features.key,
        track_mode: features.mode,
        
        // Current section (from Web Audio Analysis)
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
        
        // Current segment (from Web Audio Analysis)
        current_segment_start: currentSegment?.start,
        current_segment_duration: currentSegment?.duration,
        current_segment_confidence: currentSegment?.confidence,
        current_segment_loudness_start: currentSegment?.loudness_start,
        current_segment_loudness_max: currentSegment?.loudness_max,
        current_segment_loudness_max_time: currentSegment?.loudness_max_time,
        current_segment_loudness_end: currentSegment?.loudness_end,
        current_segment_pitches: currentSegment?.pitches,
        current_segment_timbre: currentSegment?.timbre,
        
        // Current beat/bar/tatum (from Web Audio Analysis)
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
        fitness_phase: this.currentContext.fitnessPhase,
        workout_intensity: this.currentContext.workoutIntensity,
        user_notes: this.currentContext.userNotes,
        
        // Web Audio Features (replacing Spotify Audio Features)
        danceability: features.danceability,
        energy: features.energy,
        speechiness: features.speechiness,
        acousticness: features.acousticness,
        instrumentalness: features.instrumentalness,
        liveness: features.liveness,
        valence: features.valence,
        
        // Data source identification
        data_source: 'web_audio_api',
        has_real_audio_features: true,
        
        // Timestamp
        timestamp: new Date().toISOString()
      };

      console.log('📝 Logging Web Audio analysis entry for:', this.currentContext.trackName, 'at position', this.currentContext.positionMs, 'ms');
      console.log('📊 CAPTURED WEB AUDIO ATTRIBUTES:', {
        // Basic track info
        track: this.currentContext.trackName,
        artist: this.currentContext.artistName,
        tempo: features.tempo,
        key: features.key,
        loudness_db: features.loudness,
        
        // Web Audio Features
        webAudioFeatures: {
          danceability: features.danceability,
          energy: features.energy,
          valence: features.valence,
          acousticness: features.acousticness,
          instrumentalness: features.instrumentalness,
          liveness: features.liveness,
          speechiness: features.speechiness
        },
        
        // Web Audio Analysis
        webAudioAnalysis: {
          currentSection: currentSection ? {
            start: currentSection.start,
            tempo: currentSection.tempo,
            key: currentSection.key,
            loudness: currentSection.loudness
          } : '❌ NO SECTION DATA',
          
          currentSegment: currentSegment ? {
            start: currentSegment.start,
            loudness_max: currentSegment.loudness_max,
            pitches_count: currentSegment.pitches?.length
          } : '❌ NO SEGMENT DATA',
          
          currentBeat: currentBeat ? {
            start: currentBeat.start,
            confidence: currentBeat.confidence
          } : '❌ NO BEAT DATA'
        }
      });
      
      const { error } = await supabase
        .from('spotify_analysis_logs')
        .insert(logEntry);

      if (error) {
        console.error('❌ Error logging Web Audio analysis data:', error);
        console.error('❌ Error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
      } else {
        console.log('✅ Successfully logged Web Audio analysis data to database');
        console.log('✅ Logged entry included Web Audio Features:', true);
      }
    } catch (error) {
      console.error('💥 Error in Web Audio logCurrentState:', error);
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

  // Auto-start session when workout begins
  async startWorkoutSession(workoutType: string, workoutPlan?: any): Promise<void> {
    if (this.autoSessionStarted) return; // Already have an active session

    try {
      const sessionName = `${workoutType} Workout (Web Audio) - ${new Date().toLocaleString()}`;
      await this.startLoggingSession(sessionName, workoutType);
      this.currentWorkoutType = workoutType;
      this.autoSessionStarted = true;
      console.log('🎵 Auto-started Web Audio workout logging session:', sessionName);
    } catch (error) {
      console.error('❌ Error auto-starting Web Audio workout session:', error);
    }
  }

  // Auto-end session when workout completes
  async endWorkoutSession(): Promise<void> {
    if (!this.autoSessionStarted) return;

    this.stopTrackLogging();
    await this.endSession();
    this.autoSessionStarted = false;
    this.currentWorkoutType = null;
    console.log('🎵 Auto-ended Web Audio workout logging session');
  }

  // End the current session
  async endSession(): Promise<void> {
    if (!this.sessionId) return;

    try {
      const { error } = await supabase
        .from('spotify_playback_sessions')
        .update({ end_time: new Date().toISOString() })
        .eq('id', this.sessionId);

      if (error) throw error;

      console.log('🏁 Web Audio session ended:', this.sessionId);
      this.sessionId = null;
    } catch (error) {
      console.error('❌ Error ending Web Audio session:', error);
    }
  }

  // Check if currently logging
  isCurrentlyLogging(): boolean {
    return this.isLogging;
  }

  // Get current session ID
  getCurrentSessionId(): string | null {
    return this.sessionId;
  }
}

export default WebAudioAnalysisLogger;