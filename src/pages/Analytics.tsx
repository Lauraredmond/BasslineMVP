import React, { useState } from "react";
import { BottomNavigation } from "@/components/BottomNavigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, LineChart, Line, ScatterChart, Scatter } from "recharts";
import { ChevronDown, ChevronUp, Music, Activity, Shield, TrendingUp, Target } from "lucide-react";

const Analytics = () => {
  const [openSections, setOpenSections] = useState({
    sync: true,
    privacy: false,
    progress: false,
    correlation: false
  });

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Mock data for charts
  const workoutData = [
    { format: "Spinning", sessions: 24, avgBPM: 128 },
    { format: "HIIT", sessions: 18, avgBPM: 142 },
    { format: "Pilates", sessions: 15, avgBPM: 95 },
    { format: "Circuits", sessions: 12, avgBPM: 135 }
  ];

  const progressData = [
    { week: "W1", workouts: 3, intensity: 7.2, goalHit: true },
    { week: "W2", workouts: 4, intensity: 7.8, goalHit: true },
    { week: "W3", workouts: 2, intensity: 6.5, goalHit: false },
    { week: "W4", workouts: 5, intensity: 8.1, goalHit: true },
    { week: "W5", workouts: 4, intensity: 7.9, goalHit: true },
    { week: "W6", workouts: 3, intensity: 7.4, goalHit: true },
    { week: "W7", workouts: 4, intensity: 8.3, goalHit: true },
    { week: "W8", workouts: 5, intensity: 8.7, goalHit: true }
  ];

  const correlationData = [
    { bpm: 120, performance: 7.2, time: "Morning" },
    { bpm: 135, performance: 8.1, time: "Morning" },
    { bpm: 145, performance: 8.9, time: "Afternoon" },
    { bpm: 128, performance: 7.8, time: "Evening" },
    { bpm: 142, performance: 8.5, time: "Afternoon" },
    { bpm: 95, performance: 6.8, time: "Evening" },
    { bpm: 138, performance: 8.2, time: "Morning" },
    { bpm: 125, performance: 7.5, time: "Evening" }
  ];

  const topPlaylists = [
    { name: "High Energy HIIT", uses: 16, avgBPM: 145 },
    { name: "Spin Classics", uses: 14, avgBPM: 128 },
    { name: "Power Flow", uses: 12, avgBPM: 110 }
  ];

  const chartConfig = {
    sessions: { label: "Sessions", color: "hsl(var(--burgundy))" },
    workouts: { label: "Workouts", color: "hsl(var(--burgundy))" },
    intensity: { label: "Intensity", color: "hsl(var(--burgundy-accent))" },
    performance: { label: "Performance", color: "hsl(var(--burgundy))" }
  };

  return (
    <div className="min-h-screen bg-premium-texture pb-20">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-cream mb-2">Analytics Dashboard</h1>
          <p className="text-cream/80">Your music-powered fitness insights</p>
        </div>

        <div className="space-y-6">
          {/* Workout & Music Sync Insights */}
          <Card className="bg-card-texture border-cream/20">
            <Collapsible open={openSections.sync} onOpenChange={() => toggleSection('sync')}>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-cream/5 transition-smooth">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Music className="w-6 h-6 text-burgundy" />
                      <div>
                        <CardTitle className="text-burgundy">Workout & Music Sync</CardTitle>
                        <CardDescription>How your music powers your fitness</CardDescription>
                      </div>
                    </div>
                    {openSections.sync ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-6">
                  {/* Exercise Format Distribution */}
                  <div>
                    <h3 className="text-lg font-semibold text-burgundy mb-4">Your Exercise Formats</h3>
                    <ChartContainer config={chartConfig} className="h-64">
                      <BarChart data={workoutData}>
                        <XAxis dataKey="format" />
                        <YAxis />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="sessions" fill="var(--color-sessions)" radius={4} />
                      </BarChart>
                    </ChartContainer>
                  </div>

                  {/* Top Playlists */}
                  <div>
                    <h3 className="text-lg font-semibold text-burgundy mb-4">Top 3 Playlists Powering Your Sessions</h3>
                    <div className="grid gap-3">
                      {topPlaylists.map((playlist, index) => (
                        <div key={playlist.name} className="flex items-center justify-between p-4 bg-cream/10 rounded-lg">
                          <div className="flex items-center gap-3">
                            <Badge variant="secondary" className="bg-burgundy text-cream">#{index + 1}</Badge>
                            <div>
                              <p className="font-medium text-burgundy">{playlist.name}</p>
                              <p className="text-sm text-muted-foreground">{playlist.uses} sessions • {playlist.avgBPM} BPM avg</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* BPM Distribution */}
                  <div>
                    <h3 className="text-lg font-semibold text-burgundy mb-4">Average BPM by Workout Phase</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center p-4 bg-cream/10 rounded-lg">
                        <p className="text-2xl font-bold text-burgundy">95</p>
                        <p className="text-sm text-muted-foreground">Warm Up</p>
                      </div>
                      <div className="text-center p-4 bg-cream/10 rounded-lg">
                        <p className="text-2xl font-bold text-burgundy">145</p>
                        <p className="text-sm text-muted-foreground">Sprint</p>
                      </div>
                      <div className="text-center p-4 bg-cream/10 rounded-lg">
                        <p className="text-2xl font-bold text-burgundy">128</p>
                        <p className="text-sm text-muted-foreground">Rolling Hills</p>
                      </div>
                      <div className="text-center p-4 bg-cream/10 rounded-lg">
                        <p className="text-2xl font-bold text-burgundy">85</p>
                        <p className="text-sm text-muted-foreground">Cool Down</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>

          {/* Data Privacy Snapshot */}
          <Card className="bg-card-texture border-cream/20">
            <Collapsible open={openSections.privacy} onOpenChange={() => toggleSection('privacy')}>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-cream/5 transition-smooth">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Shield className="w-6 h-6 text-burgundy" />
                      <div>
                        <CardTitle className="text-burgundy">Data Privacy Snapshot</CardTitle>
                        <CardDescription>Your workout & music data is safe</CardDescription>
                      </div>
                    </div>
                    {openSections.privacy ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-6">
                    <div className="text-center p-6 bg-cream/10 rounded-lg">
                      <p className="text-3xl font-bold text-burgundy mb-2">2,847</p>
                      <p className="text-sm text-muted-foreground">Data Points Stored</p>
                    </div>
                    <div className="text-center p-6 bg-cream/10 rounded-lg">
                      <p className="text-3xl font-bold text-burgundy mb-2">2,847</p>
                      <p className="text-sm text-muted-foreground">Data Points Anonymised</p>
                    </div>
                    <div className="text-center p-6 bg-cream/10 rounded-lg">
                      <p className="text-lg font-semibold text-burgundy mb-2">Dec 15, 2024</p>
                      <p className="text-sm text-muted-foreground">Last DSAR/ROPA Report</p>
                    </div>
                  </div>
                  <div className="mt-6 p-4 bg-green-100 border border-green-200 rounded-lg">
                    <p className="text-green-800 font-medium">✓ All data encrypted and GDPR compliant</p>
                    <p className="text-green-700 text-sm mt-1">Your privacy is our priority. Data is processed locally and anonymised before any analysis.</p>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>

          {/* Time Series Progress Tracker */}
          <Card className="bg-card-texture border-cream/20">
            <Collapsible open={openSections.progress} onOpenChange={() => toggleSection('progress')}>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-cream/5 transition-smooth">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <TrendingUp className="w-6 h-6 text-burgundy" />
                      <div>
                        <CardTitle className="text-burgundy">Progress Tracker</CardTitle>
                        <CardDescription>Your fitness journey over time</CardDescription>
                      </div>
                    </div>
                    {openSections.progress ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="text-center p-6 bg-cream/10 rounded-lg">
                      <p className="text-3xl font-bold text-burgundy mb-2">8/10</p>
                      <p className="text-sm text-muted-foreground">Goals Hit This Month</p>
                    </div>
                    <div className="text-center p-6 bg-cream/10 rounded-lg">
                      <p className="text-3xl font-bold text-burgundy mb-2">7.9</p>
                      <p className="text-sm text-muted-foreground">Average Intensity Score</p>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-semibold text-burgundy mb-4">Weekly Workout Intensity</h3>
                    <ChartContainer config={chartConfig} className="h-64">
                      <LineChart data={progressData}>
                        <XAxis dataKey="week" />
                        <YAxis />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Line 
                          type="monotone" 
                          dataKey="intensity" 
                          stroke="var(--color-intensity)" 
                          strokeWidth={3}
                          dot={{ fill: "var(--color-intensity)", strokeWidth: 2, r: 4 }}
                        />
                      </LineChart>
                    </ChartContainer>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>

          {/* Correlation Analysis */}
          <Card className="bg-card-texture border-cream/20">
            <Collapsible open={openSections.correlation} onOpenChange={() => toggleSection('correlation')}>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-cream/5 transition-smooth">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Target className="w-6 h-6 text-burgundy" />
                      <div>
                        <CardTitle className="text-burgundy">Performance Correlation</CardTitle>
                        <CardDescription>What drives your best performance?</CardDescription>
                      </div>
                    </div>
                    {openSections.correlation ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-burgundy mb-4">BPM vs Performance Score</h3>
                    <ChartContainer config={chartConfig} className="h-64">
                      <ScatterChart data={correlationData}>
                        <XAxis dataKey="bpm" name="BPM" />
                        <YAxis dataKey="performance" name="Performance" />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Scatter dataKey="performance" fill="var(--color-performance)" />
                      </ScatterChart>
                    </ChartContainer>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-burgundy mb-4">Key Insights</h3>
                    <div className="space-y-3">
                      <div className="p-4 bg-cream/10 rounded-lg">
                        <p className="font-medium text-burgundy">🎵 Optimal BPM Range</p>
                        <p className="text-sm text-muted-foreground">Your best performances occur at 135-145 BPM during afternoon sessions</p>
                      </div>
                      <div className="p-4 bg-cream/10 rounded-lg">
                        <p className="font-medium text-burgundy">⏰ Peak Performance Time</p>
                        <p className="text-sm text-muted-foreground">Afternoon workouts show 23% higher intensity scores than evening sessions</p>
                      </div>
                      <div className="p-4 bg-cream/10 rounded-lg">
                        <p className="font-medium text-burgundy">🎼 Genre Impact</p>
                        <p className="text-sm text-muted-foreground">Electronic and Rock genres correlate with your longest sprint durations</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        </div>
      </div>

      <BottomNavigation />
    </div>
  );
};

export default Analytics;