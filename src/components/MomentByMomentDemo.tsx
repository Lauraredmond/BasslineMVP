// Demo Component: Moment-by-Moment Workout Analysis
// Shows how the enhanced RapidAPI integration provides time-based guidance

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { enhancedRapidSoundnetService, WorkoutMoment, DetailedTrackAnalysis } from '../lib/enhanced-rapid-soundnet';

interface DemoState {
  trackTitle: string;
  artistName: string;
  isAnalyzing: boolean;
  analysis: DetailedTrackAnalysis | null;
  workoutMoments: WorkoutMoment[];
  currentTime: number;
  isPlaying: boolean;
  error: string;
}

const MomentByMomentDemo: React.FC = () => {
  const [state, setState] = useState<DemoState>({
    trackTitle: 'Blinding Lights',
    artistName: 'The Weeknd',
    isAnalyzing: false,
    analysis: null,
    workoutMoments: [],
    currentTime: 0,
    isPlaying: false,
    error: ''
  });

  const [simulationTimer, setSimulationTimer] = useState<NodeJS.Timeout | null>(null);

  // Get current workout moment based on playback position
  const getCurrentMoment = (): WorkoutMoment | null => {
    if (state.workoutMoments.length === 0) return null;
    
    const currentTimeMs = state.currentTime * 1000;
    
    // Find the most recent moment that hasn't passed yet
    let currentMoment: WorkoutMoment | null = null;
    for (const moment of state.workoutMoments) {
      if (moment.timeMs <= currentTimeMs) {
        currentMoment = moment;
      } else {
        break;
      }
    }
    
    return currentMoment;
  };

  // Get next upcoming moment
  const getNextMoment = (): WorkoutMoment | null => {
    if (state.workoutMoments.length === 0) return null;
    
    const currentTimeMs = state.currentTime * 1000;
    return state.workoutMoments.find(moment => moment.timeMs > currentTimeMs) || null;
  };

  // Analyze track for moment-by-moment data
  const analyzeTrack = async () => {
    if (!state.trackTitle.trim()) return;

    setState(prev => ({ ...prev, isAnalyzing: true, error: '' }));

    try {
      console.log('🎯 Starting enhanced analysis for:', state.trackTitle, 'by', state.artistName);
      
      // Get detailed analysis with sections
      const analysis = await enhancedRapidSoundnetService.getDetailedTrackAnalysis(
        state.trackTitle, 
        state.artistName || undefined
      );

      if (!analysis) {
        throw new Error('No analysis data received');
      }

      console.log('📊 Analysis received:', analysis);

      // Generate workout moments
      const workoutMoments = await enhancedRapidSoundnetService.generateWorkoutMoments(
        state.trackTitle,
        state.artistName || undefined,
        analysis.meta?.trackDuration
      );

      console.log('⏱️ Generated moments:', workoutMoments.length);

      setState(prev => ({
        ...prev,
        analysis,
        workoutMoments,
        isAnalyzing: false
      }));

    } catch (error) {
      console.error('💥 Analysis failed:', error);
      setState(prev => ({
        ...prev,
        error: `Analysis failed: ${error.message}`,
        isAnalyzing: false
      }));
    }
  };

  // Simulate playback
  const togglePlayback = () => {
    if (state.isPlaying) {
      // Pause
      if (simulationTimer) {
        clearInterval(simulationTimer);
        setSimulationTimer(null);
      }
      setState(prev => ({ ...prev, isPlaying: false }));
    } else {
      // Play
      const timer = setInterval(() => {
        setState(prev => {
          const maxTime = prev.analysis?.meta?.trackDuration || 180;
          const newTime = Math.min(prev.currentTime + 1, maxTime);
          
          if (newTime >= maxTime) {
            // End of track
            if (simulationTimer) clearInterval(simulationTimer);
            return { ...prev, currentTime: 0, isPlaying: false };
          }
          
          return { ...prev, currentTime: newTime };
        });
      }, 1000);
      
      setSimulationTimer(timer);
      setState(prev => ({ ...prev, isPlaying: true }));
    }
  };

  // Reset playback
  const resetPlayback = () => {
    if (simulationTimer) {
      clearInterval(simulationTimer);
      setSimulationTimer(null);
    }
    setState(prev => ({ ...prev, currentTime: 0, isPlaying: false }));
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (simulationTimer) clearInterval(simulationTimer);
    };
  }, [simulationTimer]);

  const currentMoment = getCurrentMoment();
  const nextMoment = getNextMoment();
  const trackDuration = state.analysis?.meta?.trackDuration || 180;
  const progressPercentage = (state.currentTime / trackDuration) * 100;

  // Get phase color for visual feedback
  const getPhaseColor = (phase: string) => {
    const colors = {
      warmup: 'bg-blue-100 text-blue-800',
      sprint: 'bg-red-100 text-red-800',
      hills: 'bg-orange-100 text-orange-800',
      resistance: 'bg-purple-100 text-purple-800',
      jumps: 'bg-pink-100 text-pink-800',
      climb: 'bg-green-100 text-green-800',
      cooldown: 'bg-gray-100 text-gray-800'
    };
    return colors[phase as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>🎵 Moment-by-Moment Workout Analysis</CardTitle>
          <p className="text-sm text-muted-foreground">
            Enhanced RapidAPI integration provides time-based workout guidance using sectional music analysis
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          
          {/* Track Input */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium">Track Title *</label>
              <Input
                value={state.trackTitle}
                onChange={(e) => setState(prev => ({ ...prev, trackTitle: e.target.value }))}
                placeholder="Enter track title"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Artist Name</label>
              <Input
                value={state.artistName}
                onChange={(e) => setState(prev => ({ ...prev, artistName: e.target.value }))}
                placeholder="Enter artist name (optional)"
              />
            </div>
            <div className="flex items-end">
              <Button 
                onClick={analyzeTrack} 
                disabled={state.isAnalyzing || !state.trackTitle.trim()}
                className="w-full"
              >
                {state.isAnalyzing ? 'Analyzing...' : 'Analyze Track'}
              </Button>
            </div>
          </div>

          {/* Error Display */}
          {state.error && (
            <div className="p-3 bg-red-50 text-red-800 rounded-md text-sm">
              {state.error}
            </div>
          )}

          {/* Analysis Results */}
          {state.analysis && (
            <div className="space-y-4">
              
              {/* Track Overview */}
              <Card>
                <CardContent className="pt-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="font-medium">Duration</div>
                      <div className="text-muted-foreground">{state.analysis.duration}</div>
                    </div>
                    <div>
                      <div className="font-medium">Tempo</div>
                      <div className="text-muted-foreground">{state.analysis.tempo} BPM</div>
                    </div>
                    <div>
                      <div className="font-medium">Sections</div>
                      <div className="text-muted-foreground">{state.analysis.sections.length} found</div>
                    </div>
                    <div>
                      <div className="font-medium">Moments</div>
                      <div className="text-muted-foreground">{state.workoutMoments.length} generated</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Playback Controls */}
              <Card>
                <CardContent className="pt-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium">
                        Playback Simulation: {Math.floor(state.currentTime / 60)}:{(state.currentTime % 60).toString().padStart(2, '0')} / {Math.floor(trackDuration / 60)}:{(trackDuration % 60).toString().padStart(2, '0')}
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={togglePlayback} variant={state.isPlaying ? "destructive" : "default"} size="sm">
                          {state.isPlaying ? 'Pause' : 'Play'}
                        </Button>
                        <Button onClick={resetPlayback} variant="outline" size="sm">
                          Reset
                        </Button>
                      </div>
                    </div>
                    <Progress value={progressPercentage} className="w-full" />
                  </div>
                </CardContent>
              </Card>

              {/* Current Workout Guidance */}
              {currentMoment && (
                <Card className="border-2 border-primary">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">Current Instruction</CardTitle>
                      <Badge className={getPhaseColor(currentMoment.phaseType)}>
                        {currentMoment.phaseType.toUpperCase()}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="text-lg font-medium">
                        {currentMoment.narrative}
                      </div>
                      {currentMoment.beatCue && (
                        <div className="p-3 bg-yellow-50 text-yellow-800 rounded-md">
                          <strong>Beat Cue:</strong> {currentMoment.beatCue}
                        </div>
                      )}
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <div className="font-medium">Intensity</div>
                          <div className="text-muted-foreground">{currentMoment.intensity}/100</div>
                        </div>
                        <div>
                          <div className="font-medium">Tempo</div>
                          <div className="text-muted-foreground">{Math.round(currentMoment.tempo)} BPM</div>
                        </div>
                        <div>
                          <div className="font-medium">Time</div>
                          <div className="text-muted-foreground">{Math.floor(currentMoment.timeMs / 1000 / 60)}:{((currentMoment.timeMs / 1000) % 60).toFixed(0).padStart(2, '0')}</div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Next Moment Preview */}
              {nextMoment && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">Coming Up Next</CardTitle>
                      <Badge variant="outline" className={getPhaseColor(nextMoment.phaseType)}>
                        {nextMoment.phaseType.toUpperCase()}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm space-y-2">
                      <div>
                        <strong>At {Math.floor(nextMoment.timeMs / 1000 / 60)}:{((nextMoment.timeMs / 1000) % 60).toFixed(0).padStart(2, '0')}:</strong> {nextMoment.narrative}
                      </div>
                      {nextMoment.beatCue && (
                        <div className="text-muted-foreground">
                          Cue: {nextMoment.beatCue}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* All Moments Timeline */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Complete Workout Timeline</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {state.workoutMoments.map((moment, index) => {
                      const timeSeconds = moment.timeMs / 1000;
                      const isPast = timeSeconds <= state.currentTime;
                      const isCurrent = currentMoment && moment.timeMs === currentMoment.timeMs;
                      
                      return (
                        <div
                          key={index}
                          className={`p-3 rounded-md text-sm ${
                            isCurrent 
                              ? 'bg-primary text-primary-foreground'
                              : isPast 
                                ? 'bg-gray-100 text-gray-600'
                                : 'bg-background border'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <Badge 
                              variant={isCurrent ? "secondary" : "outline"} 
                              className={isCurrent ? "" : getPhaseColor(moment.phaseType)}
                            >
                              {moment.phaseType}
                            </Badge>
                            <span className="text-xs">
                              {Math.floor(timeSeconds / 60)}:{(timeSeconds % 60).toFixed(0).padStart(2, '0')}
                            </span>
                          </div>
                          <div className={isCurrent ? "font-medium" : ""}>
                            {moment.narrative}
                          </div>
                          {moment.beatCue && (
                            <div className={`text-xs mt-1 ${isCurrent ? "opacity-90" : "text-muted-foreground"}`}>
                              {moment.beatCue}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

            </div>
          )}

        </CardContent>
      </Card>
    </div>
  );
};

export default MomentByMomentDemo;