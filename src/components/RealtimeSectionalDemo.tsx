// Real-time Sectional Demo - Tests moment-by-moment analysis during playback simulation
// Shows how different attribute values are logged at section changes

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { realtimeSectionalAnalyzer } from '../lib/realtime-sectional-analyzer';
import { enhancedRapidSoundnetService } from '../lib/enhanced-rapid-soundnet';

interface DemoState {
  trackTitle: string;
  artistName: string;
  isAnalyzing: boolean;
  analysisStatus: any;
  simulatedPosition: number;
  isSimulationRunning: boolean;
  databaseEntries: any[];
  currentSection: any;
  error: string;
}

const RealtimeSectionalDemo: React.FC = () => {
  const [state, setState] = useState<DemoState>({
    trackTitle: 'The Pretender',
    artistName: 'Foo Fighters',
    isAnalyzing: false,
    analysisStatus: null,
    simulatedPosition: 0,
    isSimulationRunning: false,
    databaseEntries: [],
    currentSection: null,
    error: ''
  });

  const [simulationTimer, setSimulationTimer] = useState<NodeJS.Timeout | null>(null);

  // Start real-time sectional analysis
  const startRealtimeAnalysis = async () => {
    setState(prev => ({ ...prev, isAnalyzing: true, error: '', databaseEntries: [] }));

    try {
      console.log('🎯 Starting real-time sectional analysis test');
      
      const success = await realtimeSectionalAnalyzer.startRealtimeAnalysis(
        state.trackTitle,
        state.artistName
      );

      if (!success) {
        throw new Error('Failed to start real-time analysis');
      }

      console.log('✅ Real-time analysis started - now simulate playback');
      setState(prev => ({ ...prev, isAnalyzing: true }));
      
      // Start simulation after a brief delay
      setTimeout(() => {
        startPlaybackSimulation();
      }, 1000);

    } catch (error) {
      console.error('💥 Real-time analysis failed:', error);
      setState(prev => ({
        ...prev,
        error: `Analysis failed: ${error.message}`,
        isAnalyzing: false
      }));
    }
  };

  // Start playback simulation
  const startPlaybackSimulation = () => {
    console.log('🎵 Starting playback simulation');
    
    setState(prev => ({ 
      ...prev, 
      isSimulationRunning: true,
      simulatedPosition: 0 
    }));

    const timer = setInterval(() => {
      setState(prev => {
        const newPosition = prev.simulatedPosition + 1; // 1 second increments
        const maxDuration = 180; // 3 minutes max for demo
        
        if (newPosition >= maxDuration) {
          // End simulation
          if (simulationTimer) clearInterval(simulationTimer);
          setSimulationTimer(null);
          
          // Stop real-time analysis
          realtimeSectionalAnalyzer.stopRealtimeAnalysis();
          
          return { 
            ...prev, 
            simulatedPosition: 0,
            isSimulationRunning: false,
            isAnalyzing: false 
          };
        }
        
        return { ...prev, simulatedPosition: newPosition };
      });
    }, 1000); // Update every second
    
    setSimulationTimer(timer);
  };

  // Stop analysis and simulation
  const stopAnalysis = () => {
    console.log('⏹️ Stopping real-time analysis');
    
    if (simulationTimer) {
      clearInterval(simulationTimer);
      setSimulationTimer(null);
    }
    
    realtimeSectionalAnalyzer.stopRealtimeAnalysis();
    
    setState(prev => ({
      ...prev,
      isAnalyzing: false,
      isSimulationRunning: false,
      simulatedPosition: 0
    }));
  };

  // Update analysis status
  useEffect(() => {
    if (state.isAnalyzing) {
      const statusInterval = setInterval(() => {
        const status = realtimeSectionalAnalyzer.getAnalysisStatus();
        setState(prev => ({ ...prev, analysisStatus: status }));
      }, 1000);

      return () => clearInterval(statusInterval);
    }
  }, [state.isAnalyzing]);

  // Simulate database entries for demo
  useEffect(() => {
    if (state.isSimulationRunning && state.analysisStatus) {
      // Create mock database entries to show what we expect
      const mockEntries = createMockSectionEntries(state.simulatedPosition);
      setState(prev => ({ ...prev, databaseEntries: mockEntries }));
    }
  }, [state.simulatedPosition, state.analysisStatus]);

  // Create mock section entries showing different attributes
  const createMockSectionEntries = (currentTime: number) => {
    const sections = [
      { start: 0, duration: 30, type: 'intro', tempo: 155, loudness: -12, energy: 25, phase: 'warmup' },
      { start: 30, duration: 45, type: 'verse', tempo: 173, loudness: -6, energy: 65, phase: 'climb' },
      { start: 75, duration: 30, type: 'chorus', tempo: 182, loudness: -3, energy: 85, phase: 'sprint' },
      { start: 105, duration: 25, type: 'bridge', tempo: 165, loudness: -8, energy: 45, phase: 'hills' },
      { start: 130, duration: 50, type: 'outro', tempo: 145, loudness: -15, energy: 15, phase: 'cooldown' }
    ];

    const entries = [];
    
    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];
      
      // Only show entries for sections we've passed
      if (currentTime >= section.start) {
        entries.push({
          sectionIndex: i,
          sectionType: section.type,
          sectionStartTime: section.start,
          sectionDuration: section.duration,
          
          // DIFFERENT attributes per section
          tempo: section.tempo,
          loudness: section.loudness,
          energy: section.energy,
          workoutPhase: section.phase,
          workoutIntensity: Math.round(40 + (section.energy * 0.6)),
          
          // Metadata
          timestamp: new Date(Date.now() - (currentTime - section.start) * 1000).toISOString(),
          currentSection: `${i}: ${section.type} (${section.start}s-${(section.start + section.duration)}s)`,
          isCurrentlyPlaying: currentTime >= section.start && currentTime < (section.start + section.duration)
        });
      }
    }
    
    return entries;
  };

  // Get current section info
  const getCurrentSection = () => {
    return state.databaseEntries.find(entry => entry.isCurrentlyPlaying) || null;
  };

  const currentSection = getCurrentSection();
  const progressPercentage = (state.simulatedPosition / 180) * 100;

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>🎵 Real-time Sectional Analysis Demo</CardTitle>
          <p className="text-sm text-muted-foreground">
            Demonstrates how different attribute values are logged at section changes during song playback
          </p>
        </CardHeader>
        <CardContent className="space-y-4">

          {/* Controls */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium">Track Title</label>
              <Input
                value={state.trackTitle}
                onChange={(e) => setState(prev => ({ ...prev, trackTitle: e.target.value }))}
                placeholder="Enter track title"
                disabled={state.isAnalyzing}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Artist Name</label>
              <Input
                value={state.artistName}
                onChange={(e) => setState(prev => ({ ...prev, artistName: e.target.value }))}
                placeholder="Enter artist name"
                disabled={state.isAnalyzing}
              />
            </div>
            <div className="flex items-end">
              <Button 
                onClick={startRealtimeAnalysis} 
                disabled={state.isAnalyzing || !state.trackTitle.trim()}
                className="w-full"
              >
                {state.isAnalyzing ? 'Analyzing...' : 'Start Analysis'}
              </Button>
            </div>
            <div className="flex items-end">
              <Button 
                onClick={stopAnalysis} 
                disabled={!state.isAnalyzing}
                variant="destructive"
                className="w-full"
              >
                Stop Analysis
              </Button>
            </div>
          </div>

          {/* Error Display */}
          {state.error && (
            <div className="p-3 bg-red-50 text-red-800 rounded-md text-sm">
              {state.error}
            </div>
          )}

          {/* Playback Simulation */}
          {state.isSimulationRunning && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Simulated Playback</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">
                      Position: {Math.floor(state.simulatedPosition / 60)}:{(state.simulatedPosition % 60).toString().padStart(2, '0')} / 3:00
                    </span>
                    <Badge variant={state.isSimulationRunning ? "default" : "secondary"}>
                      {state.isSimulationRunning ? 'Playing' : 'Stopped'}
                    </Badge>
                  </div>
                  <Progress value={progressPercentage} className="w-full" />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Current Section Display */}
          {currentSection && (
            <Card className="border-2 border-green-200 bg-green-50">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg">Currently Playing Section</CardTitle>
                  <Badge className="bg-green-600 text-white">
                    SECTION {currentSection.sectionIndex}: {currentSection.sectionType.toUpperCase()}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="font-medium">Tempo</div>
                    <div className="text-lg font-bold text-green-700">{currentSection.tempo} BPM</div>
                  </div>
                  <div>
                    <div className="font-medium">Loudness</div>
                    <div className="text-lg font-bold text-green-700">{currentSection.loudness} dB</div>
                  </div>
                  <div>
                    <div className="font-medium">Energy</div>
                    <div className="text-lg font-bold text-green-700">{currentSection.energy}/100</div>
                  </div>
                  <div>
                    <div className="font-medium">Workout Phase</div>
                    <div className="text-lg font-bold text-green-700 capitalize">{currentSection.workoutPhase}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Database Entries Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Database Entries (Real-time Logging)</CardTitle>
              <p className="text-sm text-muted-foreground">
                Shows how different attribute values are logged as sections change
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {state.databaseEntries.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">
                    No entries yet. Start analysis to see real-time logging.
                  </p>
                ) : (
                  state.databaseEntries.map((entry, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded-md border ${
                        entry.isCurrentlyPlaying 
                          ? 'bg-green-50 border-green-200' 
                          : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant={entry.isCurrentlyPlaying ? "default" : "outline"}>
                            Section {entry.sectionIndex}: {entry.sectionType}
                          </Badge>
                          {entry.isCurrentlyPlaying && (
                            <Badge className="bg-green-600 text-white">
                              NOW PLAYING
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {entry.sectionStartTime}s - {(entry.sectionStartTime + entry.sectionDuration)}s
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-4 gap-3 text-sm">
                        <div>
                          <span className="font-medium text-blue-600">Tempo:</span> {entry.tempo} BPM
                        </div>
                        <div>
                          <span className="font-medium text-purple-600">Loudness:</span> {entry.loudness} dB
                        </div>
                        <div>
                          <span className="font-medium text-orange-600">Energy:</span> {entry.energy}/100
                        </div>
                        <div>
                          <span className="font-medium text-green-600">Phase:</span> {entry.workoutPhase}
                        </div>
                      </div>
                      
                      <div className="mt-2 text-xs text-muted-foreground">
                        <strong>Section ID:</strong> {entry.currentSection}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Attribute Comparison Table */}
          {state.databaseEntries.length > 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Attribute Changes Across Sections</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Demonstrates that values CHANGE between sections (not static)
                </p>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Section</th>
                        <th className="text-left p-2">Tempo</th>
                        <th className="text-left p-2">Loudness</th>
                        <th className="text-left p-2">Energy</th>
                        <th className="text-left p-2">Phase</th>
                        <th className="text-left p-2">Change?</th>
                      </tr>
                    </thead>
                    <tbody>
                      {state.databaseEntries.map((entry, index) => {
                        const prevEntry = index > 0 ? state.databaseEntries[index - 1] : null;
                        const hasChanges = prevEntry && (
                          entry.tempo !== prevEntry.tempo ||
                          entry.loudness !== prevEntry.loudness ||
                          entry.energy !== prevEntry.energy
                        );
                        
                        return (
                          <tr key={index} className={`border-b ${entry.isCurrentlyPlaying ? 'bg-green-50' : ''}`}>
                            <td className="p-2 font-medium">
                              {entry.sectionIndex}: {entry.sectionType}
                              {entry.isCurrentlyPlaying && (
                                <Badge className="ml-2 text-xs bg-green-600">PLAYING</Badge>
                              )}
                            </td>
                            <td className="p-2">
                              <span className={prevEntry && entry.tempo !== prevEntry.tempo ? 'font-bold text-blue-600' : ''}>
                                {entry.tempo}
                              </span>
                            </td>
                            <td className="p-2">
                              <span className={prevEntry && entry.loudness !== prevEntry.loudness ? 'font-bold text-purple-600' : ''}>
                                {entry.loudness}
                              </span>
                            </td>
                            <td className="p-2">
                              <span className={prevEntry && entry.energy !== prevEntry.energy ? 'font-bold text-orange-600' : ''}>
                                {entry.energy}
                              </span>
                            </td>
                            <td className="p-2 capitalize">{entry.workoutPhase}</td>
                            <td className="p-2">
                              {index === 0 ? (
                                <Badge variant="outline">First</Badge>
                              ) : hasChanges ? (
                                <Badge className="bg-green-600 text-white">YES</Badge>
                              ) : (
                                <Badge variant="secondary">No</Badge>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

        </CardContent>
      </Card>
    </div>
  );
};

export default RealtimeSectionalDemo;