// Spotify Analysis Data Viewer Component
// Displays logged Spotify audio analysis data for research and pattern study

import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ScrollArea } from './ui/scroll-area';
import { supabase } from '../lib/supabase';
import { SpotifyAnalysisLoggerDemo } from './SpotifyAnalysisLoggerDemo';
import { AlertCircle, Download, Filter, RefreshCw } from 'lucide-react';

interface AnalysisLog {
  id: string;
  session_id: string;
  track_id: string;
  track_name: string;
  artist_name: string;
  timestamp: string;
  playback_position_ms: number;
  
  // Track-level attributes
  track_loudness: number;
  track_tempo: number;
  tempo_confidence: number;
  time_signature: number;
  track_key: number;
  track_mode: number;
  
  // Current section attributes
  current_section_loudness: number;
  current_section_tempo: number;
  current_section_key: number;
  current_section_mode: number;
  current_section_confidence: number;
  
  // Current segment attributes
  current_segment_loudness_start: number;
  current_segment_loudness_max: number;
  current_segment_loudness_end: number;
  current_segment_confidence: number;
  current_segment_pitches: number[];
  current_segment_timbre: number[];
  
  // Beat/Bar/Tatum
  current_beat_confidence: number;
  current_bar_confidence: number;
  current_tatum_confidence: number;
  
  // Fitness context
  fitness_phase: string;
  workout_intensity: number;
  user_notes: string;
}

interface PlaybackSession {
  id: string;
  session_name: string;
  workout_type: string;
  start_time: string;
  end_time: string;
  log_count: number;
}

interface SpotifyAnalysisViewerProps {
  autoStart?: boolean;
}

export const SpotifyAnalysisViewer: React.FC<SpotifyAnalysisViewerProps> = ({ autoStart = false }) => {
  const [sessions, setSessions] = useState<PlaybackSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [analysisLogs, setAnalysisLogs] = useState<AnalysisLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('demo');
  const [liveData, setLiveData] = useState<AnalysisLog[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [monitorInterval, setMonitorInterval] = useState<number | null>(null);

  // Load all sessions
  const loadSessions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('spotify_playback_sessions')
        .select(`
          *,
          log_count:spotify_analysis_logs(count)
        `)
        .order('start_time', { ascending: false });

      if (error) throw error;

      setSessions(data.map(session => ({
        ...session,
        log_count: session.log_count?.[0]?.count || 0
      })));
    } catch (error) {
      console.error('Error loading sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load analysis logs for a session
  const loadAnalysisLogs = async (sessionId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('spotify_analysis_logs')
        .select('*')
        .eq('session_id', sessionId)
        .order('playback_position_ms', { ascending: true });

      if (error) throw error;

      setAnalysisLogs(data || []);
      setSelectedSession(sessionId);
      setActiveTab('data');
    } catch (error) {
      console.error('Error loading analysis logs:', error);
    } finally {
      setLoading(false);
    }
  };

  // Export data as CSV
  const exportToCSV = () => {
    if (analysisLogs.length === 0) return;

    const headers = [
      'timestamp', 'track_name', 'artist_name', 'playback_position_ms',
      'track_loudness', 'track_tempo', 'tempo_confidence', 'time_signature',
      'track_key', 'track_mode', 'current_section_loudness', 'current_section_tempo',
      'current_section_key', 'current_section_mode', 'current_segment_loudness_max',
      'current_segment_pitches', 'current_segment_timbre', 'fitness_phase',
      'workout_intensity', 'user_notes'
    ];

    const csvContent = [
      headers.join(','),
      ...analysisLogs.map(log => [
        log.timestamp,
        `"${log.track_name}"`,
        `"${log.artist_name}"`,
        log.playback_position_ms,
        log.track_loudness,
        log.track_tempo,
        log.tempo_confidence,
        log.time_signature,
        log.track_key,
        log.track_mode,
        log.current_section_loudness,
        log.current_section_tempo,
        log.current_section_key,
        log.current_section_mode,
        log.current_segment_loudness_max,
        `"${log.current_segment_pitches?.join(';') || ''}"`,
        `"${log.current_segment_timbre?.join(';') || ''}"`,
        log.fitness_phase || '',
        log.workout_intensity || '',
        `"${log.user_notes || ''}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `spotify-analysis-${selectedSession}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Format time position
  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Format musical key
  const formatKey = (key: number, mode: number) => {
    const keys = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const modes = ['minor', 'major'];
    return `${keys[key] || 'Unknown'} ${modes[mode] || 'unknown'}`;
  };

  // Monitor for live data
  const startLiveMonitoring = async () => {
    setIsMonitoring(true);
    setActiveTab('live');
    
    // Poll for recent data every 2 seconds
    const pollInterval = window.setInterval(async () => {
      try {
        console.log('🔍 Polling for live data...');
        const { data, error } = await supabase
          .from('spotify_analysis_logs')
          .select('*')
          .gte('created_at', new Date(Date.now() - 300000).toISOString()) // Last 5 minutes
          .order('created_at', { ascending: false })
          .limit(20);

        if (error) {
          console.error('❌ Database query error:', error);
          throw error;
        }
        
        console.log('📊 Found', data?.length || 0, 'recent analysis logs');
        if (data && data.length > 0) {
          console.log('🎵 Latest log:', data[0]);
        }
        
        setLiveData(data || []);
      } catch (error) {
        console.error('❌ Error fetching live data:', error);
      }
    }, 2000);

    setMonitorInterval(pollInterval);
  };

  const stopLiveMonitoring = () => {
    setIsMonitoring(false);
    setLiveData([]);
    if (monitorInterval) {
      clearInterval(monitorInterval);
      setMonitorInterval(null);
    }
  };

  useEffect(() => {
    loadSessions();
    
    // Auto-start live monitoring if requested
    if (autoStart && !isMonitoring) {
      startLiveMonitoring();
    }
  }, [autoStart]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (monitorInterval) {
        clearInterval(monitorInterval);
      }
    };
  }, [monitorInterval]);

  return (
    <div className="w-full max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-cream">Spotify Analysis Research Lab</h1>
          <p className="text-cream/90">Study audio analysis patterns for fitness narrative mapping</p>
        </div>
        <Button
          onClick={loadSessions}
          disabled={loading}
          variant="outline"
          className="text-cream border-cream hover:bg-cream hover:text-maroon"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-5 w-full max-w-3xl">
          <TabsTrigger value="demo">Demo Logger</TabsTrigger>
          <TabsTrigger value="live">Live Data</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
          <TabsTrigger value="data">Analysis Data</TabsTrigger>
          <TabsTrigger value="patterns">Patterns</TabsTrigger>
        </TabsList>

        <TabsContent value="demo" className="space-y-4">
          <SpotifyAnalysisLoggerDemo />
        </TabsContent>

        <TabsContent value="live" className="space-y-4">
          <Card className="bg-card-texture border-cream/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-cream">Live Analysis Stream</CardTitle>
                  <CardDescription className="text-cream/90">
                    Real-time Spotify attribute logging during workout playback
                  </CardDescription>
                </div>
                <Button
                  onClick={isMonitoring ? stopLiveMonitoring : startLiveMonitoring}
                  className={isMonitoring 
                    ? "bg-red-600 hover:bg-red-700 text-white"
                    : "bg-green-600 hover:bg-green-700 text-white"
                  }
                >
                  {isMonitoring ? 'Stop Monitoring' : 'Start Live Monitor'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-3">
                  {liveData.length > 0 ? (
                    liveData.map((log, index) => (
                      <Card key={log.id} className="border-green-500/30 bg-green-950/20">
                        <CardContent className="p-3">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                            <div>
                              <p className="text-green-400 font-semibold">{log.track_name}</p>
                              <p className="text-cream/80 text-xs">{formatTime(log.playback_position_ms)}</p>
                            </div>
                            <div>
                              <p className="text-cream">Tempo: <span className="text-yellow-400">{log.track_tempo?.toFixed(1)} BPM</span></p>
                              <p className="text-cream">Key: <span className="text-blue-400">{formatKey(log.track_key, log.track_mode)}</span></p>
                            </div>
                            <div>
                              <p className="text-cream">Loudness: <span className="text-red-400">{log.current_section_loudness?.toFixed(1)} dB</span></p>
                              <p className="text-cream">Phase: <span className="text-purple-400">{log.fitness_phase || 'N/A'}</span></p>
                            </div>
                            <div className="text-right">
                              <p className="text-cream/70 text-xs">
                                {new Date(log.created_at || log.timestamp || Date.now()).toLocaleTimeString()}
                              </p>
                              <Badge variant="outline" className="text-xs text-green-400 border-green-400">
                                LIVE
                              </Badge>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <div className="text-center py-8 text-cream/80">
                      <AlertCircle className="w-12 h-12 mx-auto mb-4 text-cream/60" />
                      <p>
                        {isMonitoring 
                          ? 'Waiting for live analysis data...'
                          : 'Click "Start Live Monitor" to view real-time analysis data'
                        }
                      </p>
                      <p className="text-sm text-cream/70 mt-2">
                        Start a workout with Spotify playback to see live attribute values
                      </p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sessions" className="space-y-4">
          <Card className="bg-card-texture border-cream/20">
            <CardHeader>
              <CardTitle className="text-cream">Playback Sessions</CardTitle>
              <CardDescription className="text-cream/90">
                Click a session to view its detailed analysis data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-3">
                  {sessions.map((session) => (
                    <Card
                      key={session.id}
                      className="cursor-pointer hover:bg-burgundy-accent/20 transition-colors border-cream/10"
                      onClick={() => loadAnalysisLogs(session.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold text-cream">{session.session_name}</h3>
                            <p className="text-sm text-cream/90">
                              {new Date(session.start_time).toLocaleString()}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="secondary" className="text-xs">
                                {session.workout_type}
                              </Badge>
                              <Badge variant="outline" className="text-xs text-cream border-cream/50">
                                {session.log_count} data points
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {sessions.length === 0 && !loading && (
                    <div className="text-center py-8 text-cream/80">
                      <AlertCircle className="w-12 h-12 mx-auto mb-4 text-cream/60" />
                      <p className="text-cream">No analysis sessions recorded yet</p>
                      <p className="text-sm text-cream/90">Start playing music with analysis logging enabled</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="data" className="space-y-4">
          {selectedSession && (
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-cream">
                Analysis Data ({analysisLogs.length} entries)
              </h2>
              <div className="flex gap-2">
                <Button
                  onClick={exportToCSV}
                  disabled={analysisLogs.length === 0}
                  variant="outline"
                  className="text-cream border-cream hover:bg-cream hover:text-maroon"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </div>
          )}

          <Card className="bg-card-texture border-cream/20">
            <CardContent className="p-0">
              <ScrollArea className="h-96">
                <div className="p-4">
                  {analysisLogs.length > 0 ? (
                    <div className="space-y-4">
                      {analysisLogs.map((log, index) => (
                        <Card key={log.id} className="border-cream/10">
                          <CardContent className="p-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                              <div>
                                <h4 className="font-semibold text-cream mb-2">Track Info</h4>
                                <p className="text-cream">{log.track_name}</p>
                                <p className="text-cream/90">{log.artist_name}</p>
                                <p className="text-cream/90">Position: {formatTime(log.playback_position_ms)}</p>
                              </div>
                              
                              <div>
                                <h4 className="font-semibold text-cream mb-2">Musical Attributes</h4>
                                <p className="text-cream">Tempo: {log.track_tempo?.toFixed(1)} BPM</p>
                                <p className="text-cream">Key: {formatKey(log.track_key, log.track_mode)}</p>
                                <p className="text-cream">Time Sig: {log.time_signature}/4</p>
                                <p className="text-cream">Loudness: {log.track_loudness?.toFixed(1)} dB</p>
                              </div>
                              
                              <div>
                                <h4 className="font-semibold text-cream mb-2">Current Section</h4>
                                <p className="text-cream">Tempo: {log.current_section_tempo?.toFixed(1)} BPM</p>
                                <p className="text-cream">Loudness: {log.current_section_loudness?.toFixed(1)} dB</p>
                                <p className="text-cream">Confidence: {(log.current_section_confidence * 100)?.toFixed(1)}%</p>
                              </div>
                              
                              <div>
                                <h4 className="font-semibold text-cream mb-2">Current Segment</h4>
                                <p className="text-cream">Max Loudness: {log.current_segment_loudness_max?.toFixed(1)} dB</p>
                                <p className="text-cream">Confidence: {(log.current_segment_confidence * 100)?.toFixed(1)}%</p>
                              </div>
                              
                              <div>
                                <h4 className="font-semibold text-cream mb-2">Fitness Context</h4>
                                <p className="text-cream">Phase: {log.fitness_phase || 'Not set'}</p>
                                <p className="text-cream">Intensity: {log.workout_intensity || 'Not set'}</p>
                              </div>
                              
                              <div>
                                <h4 className="font-semibold text-cream mb-2">Timing</h4>
                                <p className="text-cream">Beat Confidence: {(log.current_beat_confidence * 100)?.toFixed(1)}%</p>
                                <p className="text-cream">Bar Confidence: {(log.current_bar_confidence * 100)?.toFixed(1)}%</p>
                              </div>
                            </div>
                            
                            {log.user_notes && (
                              <div className="mt-4 p-3 bg-burgundy-dark/20 rounded-lg">
                                <h4 className="font-semibold text-cream mb-1">Notes</h4>
                                <p className="text-cream text-sm">{log.user_notes}</p>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-cream/80">
                      <Filter className="w-12 h-12 mx-auto mb-4 text-cream/60" />
                      <p className="text-cream">Select a session to view analysis data</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="patterns" className="space-y-4">
          <Card className="bg-card-texture border-cream/20">
            <CardHeader>
              <CardTitle className="text-cream">Pattern Analysis</CardTitle>
              <CardDescription className="text-cream/90">
                Study correlations between audio attributes and fitness phases
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-cream/80">
                <AlertCircle className="w-12 h-12 mx-auto mb-4 text-cream/60" />
                <p className="text-cream">Pattern analysis coming soon</p>
                <p className="text-sm text-cream/90">Will include tempo/loudness trends, key changes, and fitness phase correlations</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};