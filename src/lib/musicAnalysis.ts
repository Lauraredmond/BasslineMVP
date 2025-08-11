// Music Analysis and Narrative Mapping for Spinning Workouts
import { SpotifyTrack, SpotifyAudioFeatures } from './spotify';

export interface WorkoutPhase {
  type: 'warmup' | 'sprint' | 'hills' | 'resistance' | 'jumps' | 'climb' | 'cooldown';
  name: string;
  duration: number; // in seconds
  targetTempo: number;
  energyLevel: 'low' | 'medium' | 'high';
  narratives: string[];
  beatCues: BeatCue[];
}

export interface BeatCue {
  timing: 'bar_start' | 'chorus' | 'verse' | 'pre_chorus' | 'build_up' | 'drop';
  interval?: number; // for recurring cues (e.g., every 4 bars)
  text: string;
}

export interface TrackPhaseMapping {
  track: SpotifyTrack;
  phase: WorkoutPhase;
  startTime: number; // when this phase starts in the track (seconds)
  endTime: number; // when this phase ends in the track (seconds)
  confidence: number; // 0-1 confidence score for the mapping
}

export interface WorkoutPlan {
  totalDuration: number; // in seconds
  phases: TrackPhaseMapping[];
  playlistId: string;
  workoutType: 'spinning';
}

class MusicAnalysisEngine {
  private readonly TEMPO_RANGES = {
    warmup: { min: 70, max: 100 },
    sprint: { min: 120, max: 160 },
    hills: { min: 80, max: 110 },
    resistance: { min: 60, max: 90 },
    jumps: { min: 125, max: 150 },
    climb: { min: 90, max: 120 },
    cooldown: { min: 60, max: 85 }
  };

  private readonly ENERGY_RANGES = {
    warmup: { min: 0.3, max: 0.6 },
    sprint: { min: 0.7, max: 1.0 },
    hills: { min: 0.5, max: 0.8 },
    resistance: { min: 0.4, max: 0.7 },
    jumps: { min: 0.8, max: 1.0 },
    climb: { min: 0.6, max: 0.85 },
    cooldown: { min: 0.1, max: 0.5 }
  };

  // Spinning-specific narratives mapped to musical cues
  private readonly SPINNING_NARRATIVES = {
    warmup: {
      general: [
        "Settle into {tempo} BPM. Light resistance, smooth cadence, shoulders relaxed.",
        "Easy spin at {tempo} BPM. Let your body warm up naturally.",
        "Find your rhythm at {tempo} BPM. Deep breaths, loose grip on the bars."
      ],
      beatCues: [
        { timing: 'bar_start', interval: 4, text: "Add a touch of resistance, keep breathing easy." },
        { timing: 'bar_start', interval: 8, text: "Check your posture—tall spine, soft shoulders." },
        { timing: 'build_up', text: "Feel the music building—stay controlled." }
      ]
    },
    sprint: {
      general: [
        "High cadence at {tempo} BPM. Control on verses, unleash on choruses.",
        "Sprint time! {tempo} BPM—quick legs, strong core.",
        "Fast spin at {tempo} BPM. Light resistance, maximum speed."
      ],
      beatCues: [
        { timing: 'pre_chorus', text: "Get ready to tuck in—sprint coming!" },
        { timing: 'chorus', text: "GO! Point your toes, race with the music!" },
        { timing: 'bar_start', interval: 2, text: "Keep those legs flying—quick, quick!" },
        { timing: 'verse', text: "Back it down—recover on the verse." }
      ]
    },
    hills: {
      general: [
        "Heavy but rhythmic climb at {tempo} BPM. Core braced, drive from your glutes.",
        "Hill climb at {tempo} BPM. Strong legs, steady breathing.",
        "Climbing mode—{tempo} BPM with serious resistance."
      ],
      beatCues: [
        { timing: 'bar_start', interval: 4, text: "Quarter turn resistance—stay tall!" },
        { timing: 'bar_start', interval: 8, text: "Drive through your heels—power from the glutes!" },
        { timing: 'build_up', text: "Push through this climb—you've got this!" }
      ]
    },
    resistance: {
      general: [
        "Slower cadence, feel that bass. Dip the heels, full pedal stroke.",
        "Heavy resistance at {tempo} BPM. Let the bass drive your legs.",
        "Strength work—{tempo} BPM, maximum resistance you can control."
      ],
      beatCues: [
        { timing: 'bar_start', interval: 4, text: "Quarter turn on—dip those heels!" },
        { timing: 'bar_start', interval: 8, text: "Full pedal stroke—push and pull through." },
        { timing: 'chorus', text: "This is your power section—own it!" }
      ]
    },
    jumps: {
      general: [
        "High-tempo transitions! 8-count up, 8-count down—ride the beat.",
        "Jump time at {tempo} BPM! Up for 8, down for 8.",
        "Explosive jumps at {tempo} BPM. Stay with the rhythm."
      ],
      beatCues: [
        { timing: 'bar_start', interval: 2, text: "Switch position—hips over pedals!" },
        { timing: 'bar_start', interval: 4, text: "8 up, 8 down—keep it smooth!" },
        { timing: 'drop', text: "Big energy here—use the music!" }
      ]
    },
    climb: {
      general: [
        "Steady climb at {tempo} BPM. Alternate 30s seated, 30s standing.",
        "Long climb at {tempo} BPM. Mix seated and standing positions.",
        "Endurance climb—{tempo} BPM, find your sustainable power."
      ],
      beatCues: [
        { timing: 'build_up', text: "Add resistance for this push!" },
        { timing: 'bar_start', interval: 16, text: "Switch it up—seated to standing!" },
        { timing: 'chorus', text: "This is your mountain—climb it strong!" }
      ]
    },
    cooldown: {
      general: [
        "Ease down to {tempo} BPM. Long exhales—incredible work today.",
        "Cool down at {tempo} BPM. Let your heart rate settle gently.",
        "Recovery spin—{tempo} BPM, minimal resistance."
      ],
      beatCues: [
        { timing: 'bar_start', interval: 8, text: "Deep breaths—in through nose, out through mouth." },
        { timing: 'build_up', text: "Take off resistance—just spin it out." }
      ]
    }
  };

  // Analyze track and determine best workout phase match
  analyzeTrackForPhase(track: SpotifyTrack): { phase: WorkoutPhase['type'], confidence: number } {
    if (!track.audio_features) {
      return { phase: 'warmup', confidence: 0.1 };
    }

    const features = track.audio_features;
    const scores: { [key in WorkoutPhase['type']]: number } = {
      warmup: 0,
      sprint: 0, 
      hills: 0,
      resistance: 0,
      jumps: 0,
      climb: 0,
      cooldown: 0
    };

    // Score each phase based on tempo and energy
    Object.keys(this.TEMPO_RANGES).forEach(phaseType => {
      const phase = phaseType as WorkoutPhase['type'];
      const tempoRange = this.TEMPO_RANGES[phase];
      const energyRange = this.ENERGY_RANGES[phase];

      // Tempo score (0-1)
      let tempoScore = 0;
      if (features.tempo >= tempoRange.min && features.tempo <= tempoRange.max) {
        tempoScore = 1 - Math.abs((features.tempo - (tempoRange.min + tempoRange.max) / 2) / ((tempoRange.max - tempoRange.min) / 2));
      } else {
        const distance = Math.min(Math.abs(features.tempo - tempoRange.min), Math.abs(features.tempo - tempoRange.max));
        tempoScore = Math.max(0, 1 - distance / 50); // Penalty decreases with distance
      }

      // Energy score (0-1)
      let energyScore = 0;
      if (features.energy >= energyRange.min && features.energy <= energyRange.max) {
        energyScore = 1 - Math.abs((features.energy - (energyRange.min + energyRange.max) / 2) / ((energyRange.max - energyRange.min) / 2));
      } else {
        const distance = Math.min(Math.abs(features.energy - energyRange.min), Math.abs(features.energy - energyRange.max));
        energyScore = Math.max(0, 1 - distance / 0.5);
      }

      // Additional factors
      let bonusScore = 0;

      // Sprint bonus for high danceability + high energy
      if (phase === 'sprint' && features.danceability > 0.7 && features.energy > 0.8) {
        bonusScore += 0.2;
      }

      // Resistance bonus for low energy + strong bass (estimated by low acousticness)
      if (phase === 'resistance' && features.energy < 0.6 && features.acousticness < 0.3) {
        bonusScore += 0.15;
      }

      // Jumps bonus for high energy + high danceability + good tempo
      if (phase === 'jumps' && features.energy > 0.8 && features.danceability > 0.8) {
        bonusScore += 0.25;
      }

      // Hills/climb bonus for moderate-high energy + good tempo consistency
      if ((phase === 'hills' || phase === 'climb') && features.energy > 0.6 && features.tempo > 90) {
        bonusScore += 0.1;
      }

      // Cooldown bonus for low energy + higher valence (positive mood)
      if (phase === 'cooldown' && features.energy < 0.5 && features.valence > 0.4) {
        bonusScore += 0.2;
      }

      scores[phase] = (tempoScore * 0.4 + energyScore * 0.4 + bonusScore * 0.2);
    });

    // Find best match
    const bestPhase = Object.keys(scores).reduce((a, b) => 
      scores[a as WorkoutPhase['type']] > scores[b as WorkoutPhase['type']] ? a : b
    ) as WorkoutPhase['type'];

    return { phase: bestPhase, confidence: scores[bestPhase] };
  }

  // Generate workout plan from playlist
  generateWorkoutPlan(tracks: SpotifyTrack[], playlistId: string, targetDuration?: number): WorkoutPlan {
    const mappings: TrackPhaseMapping[] = [];
    let currentTime = 0;

    // Define target spinning class structure (proper cycling workout progression)
    const workoutStructure = [
      { phase: 'warmup', percentage: 0.12, name: 'Warm Up' },
      { phase: 'sprint', percentage: 0.15, name: 'Sprint Intervals' },
      { phase: 'hills', percentage: 0.18, name: 'Rolling Hills' },
      { phase: 'resistance', percentage: 0.16, name: 'Resistance Power' },
      { phase: 'climb', percentage: 0.14, name: 'Endurance Climb' },
      { phase: 'jumps', percentage: 0.12, name: 'Sprint Jumps' },
      { phase: 'hills', percentage: 0.08, name: 'Recovery Hills' },
      { phase: 'cooldown', percentage: 0.05, name: 'Cool Down' }
    ];

    // Calculate total available duration
    const playlistDuration = tracks.reduce((total, track) => total + (track.duration_ms / 1000), 0);
    const workoutDuration = targetDuration || Math.min(playlistDuration, 2700); // Max 45 min

    // Group tracks by best phase match
    const phaseGroups: { [key in WorkoutPhase['type']]: { track: SpotifyTrack, confidence: number }[] } = {
      warmup: [],
      sprint: [],
      hills: [],
      resistance: [],
      jumps: [],
      climb: [],
      cooldown: []
    };

    tracks.forEach(track => {
      const analysis = this.analyzeTrackForPhase(track);
      phaseGroups[analysis.phase].push({ track, confidence: analysis.confidence });
    });

    // Sort each group by confidence
    Object.values(phaseGroups).forEach(group => {
      group.sort((a, b) => b.confidence - a.confidence);
    });

    // Build workout plan with better track distribution
    const usedTracks = new Set<string>(); // Track IDs we've already used
    
    workoutStructure.forEach(({ phase, percentage, name }) => {
      const phaseDuration = workoutDuration * percentage;
      const availableTracks = phaseGroups[phase as WorkoutPhase['type']]
        .filter(({ track }) => !usedTracks.has(track.id)); // Don't reuse tracks
      
      let remainingTime = phaseDuration;
      let trackIndex = 0;

      // Try to use the best matching track for this phase
      while (remainingTime > 20 && trackIndex < availableTracks.length) { // Minimum 20s per segment
        const { track, confidence } = availableTracks[trackIndex];
        const trackDuration = track.duration_ms / 1000;
        
        // Use the full track if it fits, otherwise use what we can
        const useDuration = Math.min(remainingTime, trackDuration);

        const workoutPhase = this.createWorkoutPhase(phase as WorkoutPhase['type'], track);
        // Override the name with the specific phase name
        workoutPhase.name = name || workoutPhase.name;

        mappings.push({
          track,
          phase: workoutPhase,
          startTime: currentTime,
          endTime: currentTime + useDuration,
          confidence
        });

        // Mark this track as used
        usedTracks.add(track.id);
        
        currentTime += useDuration;
        remainingTime -= useDuration;
        trackIndex++;
      }
      
      // If we didn't find enough tracks for this phase, use fallback tracks
      if (remainingTime > 20 && availableTracks.length === 0) {
        // Find unused tracks from any phase as fallback
        const fallbackTracks = tracks
          .filter(track => !usedTracks.has(track.id))
          .map(track => ({ track, confidence: 0.3 }));
          
        if (fallbackTracks.length > 0) {
          const { track } = fallbackTracks[0];
          const trackDuration = track.duration_ms / 1000;
          const useDuration = Math.min(remainingTime, trackDuration);
          
          const workoutPhase = this.createWorkoutPhase(phase as WorkoutPhase['type'], track);
          workoutPhase.name = name || workoutPhase.name;
          
          mappings.push({
            track,
            phase: workoutPhase,
            startTime: currentTime,
            endTime: currentTime + useDuration,
            confidence: 0.3
          });
          
          usedTracks.add(track.id);
          currentTime += useDuration;
        }
      }
    });

    return {
      totalDuration: currentTime,
      phases: mappings,
      playlistId,
      workoutType: 'spinning'
    };
  }

  private createWorkoutPhase(phaseType: WorkoutPhase['type'], track: SpotifyTrack): WorkoutPhase {
    const tempo = track.audio_features?.tempo || 120;
    const narrativeSet = this.SPINNING_NARRATIVES[phaseType];
    
    return {
      type: phaseType,
      name: this.getPhaseDisplayName(phaseType),
      duration: track.duration_ms / 1000,
      targetTempo: Math.round(tempo),
      energyLevel: this.getEnergyLevel(track.audio_features?.energy || 0.5),
      narratives: narrativeSet.general.map(n => n.replace('{tempo}', Math.round(tempo).toString())),
      beatCues: narrativeSet.beatCues.map(cue => ({
        timing: cue.timing as BeatCue['timing'],
        interval: cue.interval,
        text: cue.text
      }))
    };
  }

  private getPhaseDisplayName(phaseType: WorkoutPhase['type']): string {
    const names = {
      warmup: 'Warm Up',
      sprint: 'Sprint Intervals',
      hills: 'Rolling Hills',
      resistance: 'Resistance Power',
      jumps: 'Sprint Jumps',
      climb: 'Endurance Climb',
      cooldown: 'Cool Down'
    };
    return names[phaseType];
  }

  private getEnergyLevel(energy: number): 'low' | 'medium' | 'high' {
    if (energy < 0.4) return 'low';
    if (energy < 0.7) return 'medium';
    return 'high';
  }
}

export const musicAnalysisEngine = new MusicAnalysisEngine();