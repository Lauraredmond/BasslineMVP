import { SpotifyAudioAnalysis, SpotifySection, SpotifyBar, spotifyService } from './spotify'

export interface MusicalStructure {
  trackId: string
  duration: number
  tempo: number
  timeSignature: number
  
  // Precise timing data from Spotify
  bars: { start: number; duration: number; confidence: number }[]
  sections: { 
    start: number; 
    duration: number; 
    type: 'intro' | 'verse' | 'chorus' | 'bridge' | 'outro' | 'unknown';
    confidence: number;
    tempo: number;
    loudness: number;
  }[]
  
  // Derived timing for narratives
  fourthBarEnd: number | null  // When the 4th bar ends
  chorusStart: number | null   // When the first chorus starts
  chorusApproach: number | null // 7 seconds before chorus
}

export class AdvancedMusicAnalysis {
  
  // Analyze a track's musical structure using Spotify's detailed analysis
  async analyzeTrackStructure(trackId: string): Promise<MusicalStructure | null> {
    try {
      console.log('🎵 Fetching advanced audio analysis for track:', trackId)
      
      const analysis = await spotifyService.getAudioAnalysis(trackId)
      if (!analysis) {
        console.error('❌ Failed to get audio analysis')
        return null
      }

      console.log('🎵 Processing musical structure...')
      
      // Extract basic track info
      const structure: MusicalStructure = {
        trackId,
        duration: analysis.track.duration,
        tempo: analysis.track.tempo,
        timeSignature: analysis.track.time_signature,
        bars: analysis.bars.map(bar => ({
          start: bar.start,
          duration: bar.duration,
          confidence: bar.confidence
        })),
        sections: [],
        fourthBarEnd: null,
        chorusStart: null,
        chorusApproach: null
      }

      // Calculate precise 4th bar timing
      if (analysis.bars.length >= 4) {
        const fourthBar = analysis.bars[3] // 0-indexed, so 3 = 4th bar
        structure.fourthBarEnd = fourthBar.start + fourthBar.duration
        console.log(`📍 4th bar ends at: ${structure.fourthBarEnd.toFixed(2)}s`)
      }

      // Analyze sections to find chorus
      structure.sections = this.analyzeSections(analysis.sections)
      
      // Find the first chorus
      const firstChorus = structure.sections.find(section => section.type === 'chorus')
      if (firstChorus) {
        structure.chorusStart = firstChorus.start
        structure.chorusApproach = Math.max(0, firstChorus.start - 7)
        console.log(`📍 Chorus starts at: ${structure.chorusStart.toFixed(2)}s`)
        console.log(`📍 "Chorus in 7 seconds" triggers at: ${structure.chorusApproach.toFixed(2)}s`)
      } else {
        console.warn('⚠️ No chorus section detected, falling back to estimation')
        // Fallback to estimation if no chorus detected
        const estimatedChorus = structure.duration * 0.25
        structure.chorusStart = estimatedChorus
        structure.chorusApproach = Math.max(0, estimatedChorus - 7)
      }

      console.log('✅ Musical structure analysis complete:', {
        bars: structure.bars.length,
        sections: structure.sections.length,
        fourthBarEnd: structure.fourthBarEnd?.toFixed(2),
        chorusStart: structure.chorusStart?.toFixed(2)
      })

      return structure
      
    } catch (error) {
      console.error('❌ Error analyzing track structure:', error)
      return null
    }
  }

  // Analyze sections to identify musical parts
  private analyzeSections(sections: SpotifySection[]) {
    return sections.map((section, index) => {
      const sectionType = this.identifySectionType(section, index, sections.length)
      
      return {
        start: section.start,
        duration: section.duration,
        type: sectionType,
        confidence: section.confidence,
        tempo: section.tempo,
        loudness: section.loudness
      }
    })
  }

  // Heuristics to identify section types based on position and characteristics
  private identifySectionType(
    section: SpotifySection, 
    index: number, 
    totalSections: number
  ): 'intro' | 'verse' | 'chorus' | 'bridge' | 'outro' | 'unknown' {
    
    // First section is usually intro
    if (index === 0) {
      return 'intro'
    }
    
    // Last section is usually outro
    if (index === totalSections - 1) {
      return 'outro'
    }
    
    // Chorus detection heuristics:
    // - Higher loudness typically indicates chorus
    // - Sections that repeat (similar tempo/key patterns)
    // - Usually appears after the first section (intro/verse)
    
    const isLoud = section.loudness > -10 // Relatively loud section
    const hasHighConfidence = section.confidence > 0.5
    const isInChorusPosition = index >= 1 && index <= totalSections - 2 // Not first or last
    
    if (isLoud && hasHighConfidence && isInChorusPosition) {
      // Simple heuristic: if it's loud and in a typical chorus position
      if (index === 1 || index === 3 || index === 5) { // Common chorus positions
        return 'chorus'
      }
    }
    
    // Middle sections with lower energy might be verses or bridges
    if (section.loudness < -15 && isInChorusPosition) {
      return index % 2 === 1 ? 'verse' : 'bridge'
    }
    
    // Default fallback
    return 'unknown'
  }

  // Get narrative timing based on musical structure
  getNarrativeTiming(structure: MusicalStructure) {
    return {
      'We\'re just warming up the legs here': structure.fourthBarEnd,
      'Chorus in 7 seconds': structure.chorusApproach
    }
  }

  // Debug function to print detailed musical analysis
  printAnalysis(structure: MusicalStructure) {
    console.log('🎵 DETAILED MUSICAL ANALYSIS')
    console.log('=' * 50)
    console.log(`Track: ${structure.trackId}`)
    console.log(`Duration: ${structure.duration.toFixed(2)}s`)
    console.log(`Tempo: ${structure.tempo} BPM`)
    console.log(`Time Signature: ${structure.timeSignature}/4`)
    console.log('')
    
    console.log('📊 BARS:')
    structure.bars.slice(0, 8).forEach((bar, i) => {
      console.log(`  Bar ${i + 1}: ${bar.start.toFixed(2)}s - ${(bar.start + bar.duration).toFixed(2)}s (${bar.duration.toFixed(2)}s)`)
    })
    
    console.log('\n🎼 SECTIONS:')
    structure.sections.forEach((section, i) => {
      console.log(`  ${i + 1}. ${section.type.toUpperCase()}: ${section.start.toFixed(2)}s - ${(section.start + section.duration).toFixed(2)}s`)
      console.log(`     Loudness: ${section.loudness.toFixed(1)}dB, Confidence: ${section.confidence.toFixed(2)}`)
    })
    
    console.log('\n⏰ NARRATIVE TIMING:')
    console.log(`  "Legs warming up": ${structure.fourthBarEnd?.toFixed(2)}s`)
    console.log(`  "Chorus in 7s": ${structure.chorusApproach?.toFixed(2)}s`)
    console.log(`  Actual chorus: ${structure.chorusStart?.toFixed(2)}s`)
  }
}

export const advancedMusicAnalysis = new AdvancedMusicAnalysis()