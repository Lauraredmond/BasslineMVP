import { supabase } from './supabase'
import { advancedMusicAnalysis, MusicalStructure } from './advanced-music-analysis'

export interface NarrativeCue {
  id: string
  text: string
  timing: 'bar_start' | 'chorus' | 'verse' | 'pre_chorus' | 'build_up' | 'drop'
  interval_beats?: number
  triggered: boolean
  triggerTime?: number // When this should be triggered (in seconds)
}

export interface TrackAnalysis {
  duration: number // seconds
  tempo: number // BPM
  timeSignature: number // typically 4
  chorusStart?: number // estimated seconds
  verseStart?: number // estimated seconds
  trackId?: string // For advanced analysis
}

export class NarrativeEngine {
  private narrativeCues: NarrativeCue[] = []
  private currentTrack: TrackAnalysis | null = null
  private musicalStructure: MusicalStructure | null = null
  private startTime: number = 0
  private interval4BarsTriggered: boolean = false

  // Load narratives for the current workout phase
  async loadNarratives(workoutType: string, phaseType: string) {
    try {
      const { data, error } = await supabase
        .from('instruction_narratives')
        .select(`
          id,
          text,
          timing,
          interval_beats,
          sort_order,
          workout_phases!inner(
            phase_type,
            workout_types!inner(name)
          )
        `)
        .eq('workout_phases.workout_types.name', workoutType)
        .eq('workout_phases.phase_type', phaseType)
        .eq('narrative_type', 'beat_cue')
        .order('sort_order')

      if (error) {
        console.error('Error loading narratives:', error)
        return
      }

      this.narrativeCues = (data || []).map(item => ({
        id: item.id,
        text: item.text,
        timing: item.timing as NarrativeCue['timing'],
        interval_beats: item.interval_beats,
        triggered: false
      }))

      console.log('Loaded narratives:', this.narrativeCues)
    } catch (error) {
      console.error('Error in loadNarratives:', error)
    }
  }

  // Set current track information and perform advanced analysis
  async setTrack(track: TrackAnalysis) {
    this.currentTrack = track
    this.startTime = Date.now()
    this.interval4BarsTriggered = false
    this.musicalStructure = null
    
    // Reset all triggered states
    this.narrativeCues.forEach(cue => {
      cue.triggered = false
      cue.triggerTime = undefined
    })

    // If we have a track ID, use advanced Spotify analysis
    if (track.trackId) {
      console.log('🎵 Performing advanced musical analysis...')
      this.musicalStructure = await advancedMusicAnalysis.analyzeTrackStructure(track.trackId)
      
      if (this.musicalStructure) {
        console.log('✅ Using advanced musical structure for precise timing')
        advancedMusicAnalysis.printAnalysis(this.musicalStructure)
        this.calculateAdvancedTriggerTimes()
      } else {
        console.warn('⚠️ Advanced analysis failed, falling back to basic timing')
        this.calculateTriggerTimes()
      }
    } else {
      console.log('🎵 Using basic musical timing (no track ID provided)')
      this.calculateTriggerTimes()
    }
  }

  // Calculate when each narrative should trigger based on musical analysis
  private calculateTriggerTimes() {
    if (!this.currentTrack) return

    const { tempo, duration } = this.currentTrack
    const secondsPerBeat = 60 / tempo
    const secondsPer4Bars = secondsPerBeat * 16 // 4 bars * 4 beats per bar (16 beats total)

    console.log(`🎵 Musical timing calculation:`)
    console.log(`   Tempo: ${tempo} BPM`)
    console.log(`   Seconds per beat: ${secondsPerBeat.toFixed(2)}s`)
    console.log(`   Seconds per 4 bars: ${secondsPer4Bars.toFixed(2)}s`)

    this.narrativeCues.forEach(cue => {
      switch (cue.timing) {
        case 'bar_start':
          if (cue.interval_beats === 4) {
            // Trigger AFTER the first 4 bars have completed
            cue.triggerTime = secondsPer4Bars
            console.log(`   📍 "${cue.text}" will trigger after first 4 bars: ${cue.triggerTime.toFixed(2)}s`)
          }
          break
        
        case 'pre_chorus':
          // For warmup testing: estimate chorus starts around 25% into song
          // Trigger 7 seconds before that point
          const estimatedChorusStart = duration * 0.25
          cue.triggerTime = Math.max(0, estimatedChorusStart - 7)
          console.log(`   📍 "${cue.text}" will trigger 7s before chorus: ${cue.triggerTime.toFixed(2)}s (chorus estimated at ${estimatedChorusStart.toFixed(2)}s)`)
          break
        
        // Remove other timing cases to ensure only our 2 narratives trigger
      }
    })

    console.log('🎵 Final trigger schedule:', this.narrativeCues.map(c => ({
      text: c.text,
      timing: c.timing,
      triggerTime: c.triggerTime?.toFixed(2) + 's'
    })))
  }

  // Calculate precise trigger times using advanced Spotify musical analysis
  private calculateAdvancedTriggerTimes() {
    if (!this.musicalStructure) return

    console.log('🎵 Advanced musical timing calculation using Spotify analysis:')

    this.narrativeCues.forEach(cue => {
      switch (cue.timing) {
        case 'bar_start':
          if (cue.interval_beats === 4) {
            // Use precise 4th bar end time from Spotify analysis
            if (this.musicalStructure!.fourthBarEnd !== null) {
              cue.triggerTime = this.musicalStructure!.fourthBarEnd
              console.log(`   📍 "${cue.text}" PRECISE timing: ${cue.triggerTime.toFixed(2)}s (end of 4th bar)`)
            }
          }
          break
        
        case 'pre_chorus':
          // Use precise chorus detection from Spotify sections analysis
          if (this.musicalStructure!.chorusApproach !== null) {
            cue.triggerTime = this.musicalStructure!.chorusApproach
            console.log(`   📍 "${cue.text}" PRECISE timing: ${cue.triggerTime.toFixed(2)}s (7s before detected chorus at ${this.musicalStructure!.chorusStart?.toFixed(2)}s)`)
          }
          break
      }
    })

    console.log('🎵 ADVANCED trigger schedule:', this.narrativeCues.map(c => ({
      text: c.text,
      timing: c.timing,
      triggerTime: c.triggerTime?.toFixed(2) + 's',
      source: 'Spotify Analysis'
    })))
  }

  // Check if any narratives should be triggered now
  checkTriggers(currentTime: number): string | null {
    if (!this.currentTrack || !this.startTime) return null

    const elapsedSeconds = (currentTime - this.startTime) / 1000

    for (const cue of this.narrativeCues) {
      if (!cue.triggered && cue.triggerTime !== undefined && elapsedSeconds >= cue.triggerTime) {
        
        // ULTRA-STRICT VERIFICATION: Only allow EXACTLY these 2 narratives
        const EXACT_ALLOWED_NARRATIVES = [
          "We're just warming up the legs here",
          "Chorus in 7 seconds"
        ]
        
        if (!EXACT_ALLOWED_NARRATIVES.includes(cue.text)) {
          console.error(`🚫 BLOCKING UNAUTHORIZED NARRATIVE: "${cue.text}"`)
          console.error(`🚫 This should NEVER appear! Only allowed: ${EXACT_ALLOWED_NARRATIVES.join(', ')}`)
          cue.triggered = true // Mark as triggered to prevent it showing again
          continue
        }
        
        // Special handling for 4-bar interval (only trigger once)
        if (cue.timing === 'bar_start' && cue.interval_beats === 4) {
          if (this.interval4BarsTriggered) continue
          this.interval4BarsTriggered = true
        }

        cue.triggered = true
        console.log(`✅ TRIGGERING AUTHORIZED NARRATIVE: "${cue.text}" at ${elapsedSeconds.toFixed(1)}s`)
        console.log(`🎵 Musical context: ${cue.timing}${cue.interval_beats ? ` (${cue.interval_beats} bars)` : ''}`)
        console.log(`🎵 Source: Supabase database (not hardcoded)`)
        return cue.text
      }
    }

    return null
  }

  // Get next upcoming narrative (for preview/debugging)
  getNextNarrative(): { text: string, timeUntil: number } | null {
    if (!this.currentTrack || !this.startTime) return null

    const currentTime = Date.now()
    const elapsedSeconds = (currentTime - this.startTime) / 1000

    const upcomingCues = this.narrativeCues
      .filter(cue => !cue.triggered && cue.triggerTime !== undefined && cue.triggerTime > elapsedSeconds)
      .sort((a, b) => (a.triggerTime! - b.triggerTime!))

    if (upcomingCues.length === 0) return null

    const nextCue = upcomingCues[0]
    return {
      text: nextCue.text,
      timeUntil: nextCue.triggerTime! - elapsedSeconds
    }
  }

  // Reset the engine
  reset() {
    this.narrativeCues = []
    this.currentTrack = null
    this.startTime = 0
    this.interval4BarsTriggered = false
  }
}

export const narrativeEngine = new NarrativeEngine()