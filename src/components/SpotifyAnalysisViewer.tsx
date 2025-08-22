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
import { AlertCircle, Download, Filter, RefreshCw, Activity, Clock, Database, TrendingUp } from 'lucide-react';
import { spotifyService } from '../lib/spotify';

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
  current_beat_start: number;
  current_bar_start: number;
  current_section_start: number;
  
  // Audio Features (from Spotify Audio Features API)
  danceability: number;
  energy: number;
  valence: number;
  acousticness: number;
  instrumentalness: number;
  liveness: number;
  speechiness: number;
  
  // Data source info
  data_source: string;
  has_real_audio_features: boolean;
  from_cache: boolean;
  fallback_type: string;
  detected_genre: string;
  api_requests_used: number;
  
  // Rapid Soundnet specific attributes
  rs_key: string;
  rs_mode: string;
  rs_camelot: string;
  rs_happiness: number;
  rs_popularity: number;
  rs_duration: string;
  rs_loudness: string;
  rs_energy_raw: number;
  rs_danceability_raw: number;
  rs_acousticness_raw: number;
  rs_instrumentalness_raw: number;
  rs_speechiness_raw: number;
  rs_liveness_raw: number;
  
  // Fitness context
  fitness_phase: string;
  workout_intensity: number;
  user_notes: string;
  created_at?: string;
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
  const [apiUsage, setApiUsage] = useState<any>(null);
  const [cacheStats, setCacheStats] = useState<any>(null);

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
      'workout_intensity', 'user_notes',
      // Audio Features
      'danceability', 'energy', 'valence', 'acousticness', 'instrumentalness', 
      'liveness', 'speechiness',
      // Data source info
      'data_source', 'has_real_audio_features', 'from_cache', 'fallback_type', 
      'detected_genre', 'api_requests_used',
      // Rapid Soundnet specific
      'rs_key', 'rs_mode', 'rs_camelot', 'rs_happiness', 'rs_popularity', 
      'rs_duration', 'rs_loudness', 'rs_energy_raw', 'rs_danceability_raw',
      'rs_acousticness_raw', 'rs_instrumentalness_raw', 'rs_speechiness_raw', 
      'rs_liveness_raw'
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
        `"${log.user_notes || ''}"`,
        // Audio Features
        log.danceability || '',
        log.energy || '',
        log.valence || '',
        log.acousticness || '',
        log.instrumentalness || '',
        log.liveness || '',
        log.speechiness || '',
        // Data source info
        log.data_source || '',
        log.has_real_audio_features || false,
        log.from_cache || false,
        log.fallback_type || '',
        log.detected_genre || '',
        log.api_requests_used || '',
        // Rapid Soundnet specific
        log.rs_key || '',
        log.rs_mode || '',
        log.rs_camelot || '',
        log.rs_happiness || '',
        log.rs_popularity || '',
        log.rs_duration || '',
        `"${log.rs_loudness || ''}"`,
        log.rs_energy_raw || '',
        log.rs_danceability_raw || '',
        log.rs_acousticness_raw || '',
        log.rs_instrumentalness_raw || '',
        log.rs_speechiness_raw || '',
        log.rs_liveness_raw || ''
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
        
        // First, check if ANY data exists in the table
        const { data: allData, error: allError } = await supabase
          .from('spotify_analysis_logs')
          .select('track_name, created_at, id')
          .order('created_at', { ascending: false })
          .limit(5);
          
        console.log('🗃️ Total recent entries in database:', allData?.length || 0);
        if (allData && allData.length > 0) {
          console.log('📊 Latest database entries:', allData);
        }
        
        const tenMinutesAgo = new Date(Date.now() - 10 * 60000).toISOString(); // Last 10 minutes for testing
        console.log('📅 Searching for logs since:', tenMinutesAgo, '(last 10 minutes)');
        
        // Try both timestamp and created_at columns to be safe
        const { data, error } = await supabase
          .from('spotify_analysis_logs')
          .select('*')
          .or(`created_at.gte.${tenMinutesAgo},timestamp.gte.${tenMinutesAgo}`)
          .order('created_at', { ascending: false })
          .limit(20);

        if (error) {
          console.error('❌ Database query error:', error);
          throw error;
        }
        
        console.log('📊 Found', data?.length || 0, 'recent analysis logs');
        console.log('🚨 RAW DATABASE RESPONSE:', JSON.stringify(data, null, 2));
        if (data && data.length > 0) {
          const sample = data[0];
          console.log('🔍 DETAILED log entry analysis:', {
            trackName: sample.track_name,
            
            // Basic attributes
            tempo: sample.track_tempo,
            key: sample.track_key,
            loudness: sample.track_loudness,
            
            // Audio Features
            hasAudioFeatures: !!(sample.danceability || sample.energy || sample.valence),
            audioFeatures: {
              danceability: sample.danceability,
              energy: sample.energy,
              valence: sample.valence,
              acousticness: sample.acousticness,
              instrumentalness: sample.instrumentalness,
              liveness: sample.liveness,
              speechiness: sample.speechiness
            },
            
            // Advanced Analysis
            hasAdvancedAnalysis: !!(sample.current_section_start !== undefined || sample.current_beat_start !== undefined),
            advancedAnalysis: {
              sectionStart: sample.current_section_start,
              beatStart: sample.current_beat_start,
              sectionTempo: sample.current_section_tempo,
              segmentLoudnessMax: sample.current_segment_loudness_max
            },
            
            // All available columns
            allKeys: Object.keys(sample)
          });
        } else {
          console.log('🔍 No data found - checking if any logs exist at all...');
          // Check if there are ANY logs in the database
          const { data: allLogs, error: allError } = await supabase
            .from('spotify_analysis_logs')
            .select('track_name, created_at')
            .order('created_at', { ascending: false })
            .limit(3);
          
          if (!allError && allLogs) {
            console.log('📋 Total logs in database:', allLogs.length);
            if (allLogs.length > 0) {
              console.log('🎵 Most recent logs:', allLogs);
            }
          }
        }
        
        if (data && data.length > 0) {
          console.log(`✅ Found ${data.length} logs in 10-minute window - updating live stream`);
          setLiveData(data);
        } else if (allData && allData.length > 0) {
          console.log(`🔄 No recent data in time window, showing latest ${allData.length} database entries`);
          // Get full details for the latest entries
          const { data: recentData } = await supabase
            .from('spotify_analysis_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(10);
          setLiveData(recentData || []);
        } else {
          console.log('❌ No data found at all');
          setLiveData([]);
        }
        
        // Test database schema by trying to select Audio Features columns explicitly
        if (data && data.length > 0) {
          console.log('🔬 SCHEMA TEST - Testing if Audio Features columns exist...');
          try {
            const { data: schemaTest, error: schemaError } = await supabase
              .from('spotify_analysis_logs')
              .select('danceability, energy, valence, acousticness')
              .limit(1);
            
            if (schemaError) {
              console.error('❌ SCHEMA ERROR - Audio Features columns missing:', schemaError.message);
              console.error('❌ Database table needs Audio Features columns added!');
            } else {
              console.log('✅ SCHEMA OK - Audio Features columns exist in database');
              console.log('✅ Schema test result:', schemaTest);
            }
          } catch (schemaErr) {
            console.error('❌ SCHEMA TEST FAILED:', schemaErr);
          }
        }
        
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

  // Load API usage statistics
  const loadApiUsage = () => {
    try {
      const usage = spotifyService.getRapidSoundnetUsage();
      const cache = spotifyService.getCacheStats();
      setApiUsage(usage);
      setCacheStats(cache);
    } catch (error) {
      console.error('Error loading API usage:', error);
    }
  };

  // Calculate API usage statistics from database
  const [dataSourceStats, setDataSourceStats] = useState<any>(null);
  
  const loadDataSourceStats = async () => {
    try {
      const { data, error } = await supabase
        .from('spotify_analysis_logs')
        .select('data_source, fallback_type, from_cache, api_requests_used, detected_genre')
        .order('created_at', { ascending: false })
        .limit(1000); // Last 1000 entries

      if (error) throw error;

      if (data) {
        const stats = {
          total: data.length,
          bySource: data.reduce((acc: any, log: any) => {
            acc[log.data_source] = (acc[log.data_source] || 0) + 1;
            return acc;
          }, {}),
          byFallback: data.reduce((acc: any, log: any) => {
            if (log.fallback_type) {
              acc[log.fallback_type] = (acc[log.fallback_type] || 0) + 1;
            }
            return acc;
          }, {}),
          cached: data.filter(log => log.from_cache).length,
          genres: data.reduce((acc: any, log: any) => {
            if (log.detected_genre) {
              acc[log.detected_genre] = (acc[log.detected_genre] || 0) + 1;
            }
            return acc;
          }, {})
        };
        setDataSourceStats(stats);
      }
    } catch (error) {
      console.error('Error loading data source stats:', error);
    }
  };

  useEffect(() => {
    loadSessions();
    loadApiUsage();
    loadDataSourceStats();
    
    // Auto-start live monitoring if requested
    console.log('🔍 SpotifyAnalysisViewer mounted - autoStart:', autoStart, 'isMonitoring:', isMonitoring);
    if (autoStart && !isMonitoring) {
      console.log('✅ Auto-starting live monitoring...');
      setTimeout(() => {
        startLiveMonitoring();
        console.log('🔄 Live monitoring should now be active');
      }, 1000); // Give component time to fully mount
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
        <div className="w-full overflow-x-auto">
          <TabsList className="flex w-full min-w-max gap-1 h-auto p-1">
            <TabsTrigger value="demo" className="text-xs whitespace-nowrap">Demo</TabsTrigger>
            <TabsTrigger value="live" className="text-xs whitespace-nowrap">Live Data</TabsTrigger>
            <TabsTrigger value="sessions" className="text-xs whitespace-nowrap">Sessions</TabsTrigger>
            <TabsTrigger value="data" className="text-xs whitespace-nowrap">Analysis</TabsTrigger>
            <TabsTrigger value="api" className="text-xs whitespace-nowrap bg-purple-600 text-white border-purple-400">🚀 API Usage</TabsTrigger>
            <TabsTrigger value="patterns" className="text-xs whitespace-nowrap">Patterns</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="demo" className="space-y-4">
          <SpotifyAnalysisLoggerDemo />
        </TabsContent>

        <TabsContent value="live" className="space-y-4">
          <Card className="bg-burgundy-dark/30 border-cream/20">
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
                    liveData
                      .sort((a, b) => new Date(b.created_at || b.timestamp || 0).getTime() - new Date(a.created_at || a.timestamp || 0).getTime())
                      .map((log, index) => (
                      <Card key={log.id} className="border-green-500/30 bg-green-950/20">
                        <CardContent className="p-4">
                          <div className="space-y-3">
                            {/* Track Header */}
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="text-green-400 font-semibold text-lg">{log.track_name}</p>
                                <p className="text-cream/90 text-sm">{log.artist_name}</p>
                                <p className="text-cream/70 text-xs">{formatTime(log.playback_position_ms)} • {new Date(log.created_at || log.timestamp || Date.now()).toLocaleTimeString()}</p>
                              </div>
                              <div className="flex gap-2">
                                <Badge variant="outline" className="text-xs text-green-400 border-green-400">Live</Badge>
                                {log.data_source && (
                                  <Badge 
                                    variant="outline" 
                                    className={`text-xs ${
                                      log.data_source === 'spotify' ? 'text-blue-400 border-blue-400' :
                                      log.data_source === 'rapidapi' ? 'text-purple-400 border-purple-400' :
                                      'text-yellow-400 border-yellow-400'
                                    }`}
                                  >
                                    {log.data_source === 'spotify' ? 'Spotify' :
                                     log.data_source === 'rapidapi' ? 'RapidAPI' :
                                     'Fallback'}
                                  </Badge>
                                )}
                                {log.from_cache && (
                                  <Badge variant="outline" className="text-xs text-cyan-400 border-cyan-400">Cache</Badge>
                                )}
                              </div>
                            </div>
                            
                            {/* Basic Track Info */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                              <div>
                                <p className="text-cream/70 text-xs">TEMPO</p>
                                <p className="text-yellow-400 font-bold">{log.track_tempo?.toFixed(1)} BPM</p>
                              </div>
                              <div>
                                <p className="text-cream/70 text-xs">KEY</p>
                                <p className="text-blue-400 font-bold">{formatKey(log.track_key, log.track_mode)}</p>
                              </div>
                              <div>
                                <p className="text-cream/70 text-xs">LOUDNESS</p>
                                <p className="text-red-400 font-bold">{(log.track_loudness || log.current_section_loudness)?.toFixed(1)} dB</p>
                              </div>
                              <div>
                                <p className="text-cream/70 text-xs">PHASE</p>
                                <p className="text-purple-400 font-bold">{log.fitness_phase || 'N/A'}</p>
                              </div>
                            </div>

                            {/* Audio Features */}
                            {(log.danceability || log.energy || log.valence) && (
                              <div>
                                <p className="text-cream font-semibold text-sm mb-2">🎵 Audio Features {log.data_source === 'rapidapi' ? '(RapidAPI)' : '(Spotify)'}</p>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                                  {log.danceability && (
                                    <div>
                                      <p className="text-cream/70">Dance</p>
                                      <p className="text-orange-400 font-bold">{(log.danceability * 100).toFixed(0)}%</p>
                                      {log.rs_danceability_raw && (
                                        <p className="text-cream/50 text-[10px]">Raw: {log.rs_danceability_raw}/100</p>
                                      )}
                                    </div>
                                  )}
                                  {log.energy && (
                                    <div>
                                      <p className="text-cream/70">Energy</p>
                                      <p className="text-red-400 font-bold">{(log.energy * 100).toFixed(0)}%</p>
                                      {log.rs_energy_raw && (
                                        <p className="text-cream/50 text-[10px]">Raw: {log.rs_energy_raw}/100</p>
                                      )}
                                    </div>
                                  )}
                                  {log.valence && (
                                    <div>
                                      <p className="text-cream/70">Mood</p>
                                      <p className="text-green-400 font-bold">{(log.valence * 100).toFixed(0)}%</p>
                                      {log.rs_happiness && (
                                        <p className="text-cream/50 text-[10px]">Happy: {log.rs_happiness}/100</p>
                                      )}
                                    </div>
                                  )}
                                  {log.acousticness && (
                                    <div>
                                      <p className="text-cream/70">Acoustic</p>
                                      <p className="text-blue-400 font-bold">{(log.acousticness * 100).toFixed(0)}%</p>
                                      {log.rs_acousticness_raw && (
                                        <p className="text-cream/50 text-[10px]">Raw: {log.rs_acousticness_raw}/100</p>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Rapid Soundnet Specific Metrics */}
                            {(log.rs_key || log.rs_camelot || log.rs_popularity) && (
                              <div>
                                <p className="text-cream font-semibold text-sm mb-2">🚀 Rapid Soundnet Metrics - {new Date(log.created_at || log.timestamp).toLocaleTimeString()}</p>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                                  {log.rs_key && (
                                    <div>
                                      <p className="text-cream/70">Key & Mode</p>
                                      <p className="text-purple-400 font-bold">{log.rs_key} {log.rs_mode}</p>
                                    </div>
                                  )}
                                  {log.rs_camelot && (
                                    <div>
                                      <p className="text-cream/70">Camelot</p>
                                      <p className="text-purple-400 font-bold">{log.rs_camelot}</p>
                                    </div>
                                  )}
                                  {log.rs_happiness && (
                                    <div>
                                      <p className="text-cream/70">Happiness</p>
                                      <p className="text-purple-400 font-bold">{log.rs_happiness}/100</p>
                                    </div>
                                  )}
                                  {log.rs_popularity && (
                                    <div>
                                      <p className="text-cream/70">Popularity</p>
                                      <p className="text-purple-400 font-bold">{log.rs_popularity}/100</p>
                                    </div>
                                  )}
                                </div>
                                
                                {/* Additional RapidAPI Raw Metrics */}
                                <div className="mt-3 grid grid-cols-3 md:grid-cols-6 gap-2 text-xs">
                                  {log.rs_energy_raw && (
                                    <div>
                                      <p className="text-cream/60">Energy (Raw)</p>
                                      <p className="text-red-300 font-semibold">{log.rs_energy_raw}/100</p>
                                    </div>
                                  )}
                                  {log.rs_danceability_raw && (
                                    <div>
                                      <p className="text-cream/60">Dance (Raw)</p>
                                      <p className="text-orange-300 font-semibold">{log.rs_danceability_raw}/100</p>
                                    </div>
                                  )}
                                  {log.rs_acousticness_raw && (
                                    <div>
                                      <p className="text-cream/60">Acoustic (Raw)</p>
                                      <p className="text-blue-300 font-semibold">{log.rs_acousticness_raw}/100</p>
                                    </div>
                                  )}
                                  {log.rs_speechiness_raw && (
                                    <div>
                                      <p className="text-cream/60">Speech (Raw)</p>
                                      <p className="text-yellow-300 font-semibold">{log.rs_speechiness_raw}/100</p>
                                    </div>
                                  )}
                                  {log.rs_liveness_raw && (
                                    <div>
                                      <p className="text-cream/60">Live (Raw)</p>
                                      <p className="text-green-300 font-semibold">{log.rs_liveness_raw}/100</p>
                                    </div>
                                  )}
                                  {log.rs_instrumentalness_raw && (
                                    <div>
                                      <p className="text-cream/60">Instrumental</p>
                                      <p className="text-indigo-300 font-semibold">{log.rs_instrumentalness_raw}/100</p>
                                    </div>
                                  )}
                                </div>
                                
                                {/* Data Quality Info */}
                                <div className="mt-2 flex gap-2 text-[10px]">
                                  <span className="text-purple-300">
                                    📊 Source: {log.data_source} {log.from_cache ? '(cached)' : '(fresh)'}
                                  </span>
                                  {log.fallback_type && (
                                    <span className="text-yellow-300">
                                      🔄 Type: {log.fallback_type}
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Advanced Analysis */}
                            {(log.current_section_start !== undefined || log.current_beat_start !== undefined) && (
                              <div>
                                <p className="text-cream font-semibold text-sm mb-2">🔬 Advanced Analysis</p>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                                  {log.current_section_start !== undefined && (
                                    <div>
                                      <p className="text-cream/70">Section</p>
                                      <p className="text-cyan-400">{log.current_section_start?.toFixed(1)}s</p>
                                    </div>
                                  )}
                                  {log.current_beat_start !== undefined && (
                                    <div>
                                      <p className="text-cream/70">Beat</p>
                                      <p className="text-pink-400">{log.current_beat_start?.toFixed(2)}s</p>
                                    </div>
                                  )}
                                  {log.current_segment_loudness_max && (
                                    <div>
                                      <p className="text-cream/70">Seg Peak</p>
                                      <p className="text-yellow-400">{log.current_segment_loudness_max?.toFixed(1)} dB</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <div className="text-center py-8 text-cream/80">
                      <AlertCircle className="w-12 h-12 mx-auto mb-4 text-cream/60" />
                      <p className="text-cream">
                        {isMonitoring 
                          ? 'Waiting for live analysis data...'
                          : 'Click "Start Live Monitor" to view real-time analysis data'
                        }
                      </p>
                      <p className="text-sm text-cream/90 mt-2">
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
          <Card className="bg-burgundy-dark/30 border-cream/20">
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
                              <Badge variant="secondary" className="text-xs text-cream bg-burgundy border-cream/50">
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

          <Card className="bg-burgundy-dark/30 border-cream/20">
            <CardContent className="p-0">
              <ScrollArea className="h-96">
                <div className="p-4">
                  {analysisLogs.length > 0 ? (
                    <div className="space-y-4">
                      {analysisLogs.map((log, index) => (
                        <Card key={log.id} className="border-cream/10">
                          <CardContent className="p-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm text-cream">
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
                                <h4 className="font-semibold text-cream mb-2">Audio Features</h4>
                                <p className="text-cream">Danceability: {log.danceability ? `${(log.danceability * 100).toFixed(0)}%` : 'N/A'}</p>
                                <p className="text-cream">Energy: {log.energy ? `${(log.energy * 100).toFixed(0)}%` : 'N/A'}</p>
                                <p className="text-cream">Valence: {log.valence ? `${(log.valence * 100).toFixed(0)}%` : 'N/A'}</p>
                                <p className="text-cream">Acousticness: {log.acousticness ? `${(log.acousticness * 100).toFixed(0)}%` : 'N/A'}</p>
                              </div>
                              
                              <div>
                                <h4 className="font-semibold text-cream mb-2">More Features</h4>
                                <p className="text-cream">Instrumentalness: {log.instrumentalness ? `${(log.instrumentalness * 100).toFixed(0)}%` : 'N/A'}</p>
                                <p className="text-cream">Liveness: {log.liveness ? `${(log.liveness * 100).toFixed(0)}%` : 'N/A'}</p>
                                <p className="text-cream">Speechiness: {log.speechiness ? `${(log.speechiness * 100).toFixed(0)}%` : 'N/A'}</p>
                              </div>
                              
                              <div>
                                <h4 className="font-semibold text-cream mb-2">Timing Analysis</h4>
                                <p className="text-cream">Beat Confidence: {(log.current_beat_confidence * 100)?.toFixed(1)}%</p>
                                <p className="text-cream">Bar Confidence: {(log.current_bar_confidence * 100)?.toFixed(1)}%</p>
                                <p className="text-cream">Section Start: {log.current_section_start?.toFixed(1)}s</p>
                              </div>
                            </div>
                            
                            {log.user_notes && (
                              <div className="mt-4 p-3 bg-burgundy-dark/20 rounded-lg">
                                <h4 className="font-semibold text-cream mb-1">Notes</h4>
                                <p className="text-cream text-sm">{log.user_notes}</p>
                              </div>
                            )}
                            
                            {/* Debug Info */}
                            <div className="mt-4 p-3 bg-red-950/20 rounded-lg border border-red-500/30">
                              <h4 className="font-semibold text-red-400 mb-1">🔧 Debug Status</h4>
                              <div className="text-xs text-cream/80 space-y-1">
                                <p>Audio Features: {(log.danceability || log.energy || log.valence) ? '✅ Available' : '❌ Missing'}</p>
                                <p>Advanced Analysis: {(log.current_section_start !== undefined || log.current_beat_start !== undefined) ? '✅ Available' : '❌ Missing'}</p>
                                <p>Session ID: {log.session_id}</p>
                                <p>Created: {new Date(log.timestamp || log.created_at).toLocaleTimeString()}</p>
                              </div>
                            </div>
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

        <TabsContent value="api" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* API Usage Status */}
            <Card className="bg-burgundy-dark/30 border-cream/20">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-purple-400" />
                  <CardTitle className="text-cream">Rapid Soundnet API Status</CardTitle>
                </div>
                <CardDescription className="text-cream/90">
                  Current API quota and usage statistics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {apiUsage ? (
                    <>
                      <div className="flex items-center justify-between p-4 bg-burgundy-accent/20 rounded-lg">
                        <div>
                          <p className="text-sm text-cream/70">Requests Used</p>
                          <p className="text-2xl font-bold text-purple-400">{apiUsage.used} / 3</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-cream/70">Remaining</p>
                          <p className="text-2xl font-bold text-green-400">{apiUsage.remaining}</p>
                        </div>
                      </div>
                      
                      <div className="p-4 bg-burgundy-accent/20 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Clock className="w-4 h-4 text-cream/70" />
                          <p className="text-sm text-cream/70">Next Reset</p>
                        </div>
                        <p className="text-cream font-semibold">
                          {new Date(apiUsage.resetTime).toLocaleString()}
                        </p>
                      </div>

                      <div className="w-full bg-burgundy-accent/30 rounded-full h-2">
                        <div 
                          className="bg-purple-400 h-2 rounded-full transition-all" 
                          style={{ width: `${(apiUsage.used / 3) * 100}%` }}
                        />
                      </div>
                      <p className="text-xs text-cream/70 text-center">
                        {((apiUsage.used / 3) * 100).toFixed(1)}% quota used
                      </p>
                    </>
                  ) : (
                    <div className="text-center py-8 text-cream/70">
                      <Activity className="w-12 h-12 mx-auto mb-4 text-cream/40" />
                      <p>Loading API usage statistics...</p>
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <Button
                      onClick={loadApiUsage}
                      variant="outline"
                      className="w-full text-cream border-cream hover:bg-cream hover:text-maroon"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Refresh Usage
                    </Button>
                    
                    <Button
                      onClick={async () => {
                        console.log('🧪 TESTING RapidAPI manually...');
                        try {
                          const result = await spotifyService.forceRapidSoundnetAnalysis("Blinding Lights", "The Weeknd");
                          console.log('✅ Manual RapidAPI test result:', result);
                          loadApiUsage(); // Refresh to see if request count increased
                        } catch (error) {
                          console.error('❌ Manual RapidAPI test failed:', error);
                        }
                      }}
                      variant="outline"
                      className="w-full text-purple-400 border-purple-400 hover:bg-purple-400 hover:text-white"
                    >
                      🧪 Test RapidAPI
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Cache Statistics */}
            <Card className="bg-burgundy-dark/30 border-cream/20">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Database className="w-5 h-5 text-blue-400" />
                  <CardTitle className="text-cream">Cache Statistics</CardTitle>
                </div>
                <CardDescription className="text-cream/90">
                  Track analysis cache performance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {cacheStats ? (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-burgundy-accent/20 rounded-lg">
                          <p className="text-sm text-cream/70">Cache Entries</p>
                          <p className="text-xl font-bold text-blue-400">{cacheStats.totalEntries}</p>
                        </div>
                        <div className="p-3 bg-burgundy-accent/20 rounded-lg">
                          <p className="text-sm text-cream/70">Hit Rate</p>
                          <p className="text-xl font-bold text-green-400">{cacheStats.hitRate.toFixed(1)}%</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-burgundy-accent/20 rounded-lg">
                          <p className="text-sm text-cream/70">Cache Hits</p>
                          <p className="text-lg font-semibold text-green-400">{cacheStats.hits}</p>
                        </div>
                        <div className="p-3 bg-burgundy-accent/20 rounded-lg">
                          <p className="text-sm text-cream/70">Cache Misses</p>
                          <p className="text-lg font-semibold text-red-400">{cacheStats.misses}</p>
                        </div>
                      </div>

                      {cacheStats.oldestEntry && (
                        <div className="p-3 bg-burgundy-accent/20 rounded-lg">
                          <p className="text-sm text-cream/70">Cache Age Range</p>
                          <p className="text-sm text-cream">
                            {new Date(cacheStats.oldestEntry).toLocaleDateString()} - {new Date(cacheStats.newestEntry).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-8 text-cream/70">
                      <Database className="w-12 h-12 mx-auto mb-4 text-cream/40" />
                      <p>Loading cache statistics...</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Data Source Statistics */}
            <Card className="bg-burgundy-dark/30 border-cream/20 md:col-span-2">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-yellow-400" />
                  <CardTitle className="text-cream">Data Source Analytics</CardTitle>
                </div>
                <CardDescription className="text-cream/90">
                  Analysis of data sources used in recent logging (last 1000 entries)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {dataSourceStats ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-3">
                        <h4 className="text-sm font-semibold text-cream">Data Sources</h4>
                        {Object.entries(dataSourceStats.bySource).map(([source, count]: [string, any]) => (
                          <div key={source} className="flex justify-between items-center p-2 bg-burgundy-accent/20 rounded">
                            <div className="flex items-center gap-2">
                              <div className={`w-3 h-3 rounded-full ${
                                source === 'spotify' ? 'bg-blue-400' :
                                source === 'rapidapi' ? 'bg-purple-400' :
                                'bg-yellow-400'
                              }`} />
                              <span className="text-cream text-sm capitalize">{source}</span>
                            </div>
                            <div className="text-right">
                              <p className="text-cream font-semibold">{count}</p>
                              <p className="text-xs text-cream/70">{((count / dataSourceStats.total) * 100).toFixed(1)}%</p>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="space-y-3">
                        <h4 className="text-sm font-semibold text-cream">Fallback Types</h4>
                        {Object.entries(dataSourceStats.byFallback).map(([type, count]: [string, any]) => (
                          <div key={type} className="flex justify-between items-center p-2 bg-burgundy-accent/20 rounded">
                            <span className="text-cream text-sm capitalize">{type}</span>
                            <div className="text-right">
                              <p className="text-cream font-semibold">{count}</p>
                              <p className="text-xs text-cream/70">{((count / dataSourceStats.total) * 100).toFixed(1)}%</p>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="space-y-3">
                        <h4 className="text-sm font-semibold text-cream">Detected Genres</h4>
                        {Object.entries(dataSourceStats.genres).slice(0, 5).map(([genre, count]: [string, any]) => (
                          <div key={genre} className="flex justify-between items-center p-2 bg-burgundy-accent/20 rounded">
                            <span className="text-cream text-sm capitalize">{genre}</span>
                            <div className="text-right">
                              <p className="text-cream font-semibold">{count}</p>
                              <p className="text-xs text-cream/70">{((count / dataSourceStats.total) * 100).toFixed(1)}%</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-burgundy-accent/20 rounded-lg">
                      <div>
                        <p className="text-sm text-cream/70">Cache Usage</p>
                        <p className="text-lg font-semibold text-cyan-400">{dataSourceStats.cached} cached entries</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-cream/70">Cache Rate</p>
                        <p className="text-lg font-semibold text-cyan-400">
                          {((dataSourceStats.cached / dataSourceStats.total) * 100).toFixed(1)}%
                        </p>
                      </div>
                    </div>

                    <Button
                      onClick={() => {
                        loadApiUsage();
                        loadDataSourceStats();
                      }}
                      variant="outline"
                      className="w-full text-cream border-cream hover:bg-cream hover:text-maroon"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Refresh All Statistics
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-8 text-cream/70">
                    <TrendingUp className="w-12 h-12 mx-auto mb-4 text-cream/40" />
                    <p>Loading data source statistics...</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="patterns" className="space-y-4">
          <Card className="bg-burgundy-dark/30 border-cream/20">
            <CardHeader>
              <CardTitle className="text-cream font-bold">Pattern Analysis</CardTitle>
              <CardDescription className="text-cream">
                Study correlations between audio attributes and fitness phases
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <AlertCircle className="w-12 h-12 mx-auto mb-4 text-cream/60" />
                <p className="text-cream text-lg font-medium">Pattern analysis coming soon</p>
                <p className="text-cream/90 mt-2">Will include tempo/loudness trends, key changes, and fitness phase correlations</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};