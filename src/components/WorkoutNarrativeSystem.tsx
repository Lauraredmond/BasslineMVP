import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { narrativeEngine, TrackAnalysis } from '@/lib/narrative-engine'
import { dbAdmin } from '@/lib/database-admin'

interface WorkoutNarrativeSystemProps {
  isWorkoutActive: boolean
  currentPhase: 'warmup' | 'sprint' | 'hills' | 'resistance' | 'jumps' | 'climb' | 'cooldown'
  currentTrack?: {
    name: string
    artist: string
    tempo: number
    duration_ms: number
  }
  onNarrativeTriggered?: (narrative: string) => void
}

export const WorkoutNarrativeSystem = ({ 
  isWorkoutActive, 
  currentPhase, 
  currentTrack,
  onNarrativeTriggered 
}: WorkoutNarrativeSystemProps) => {
  const [currentNarrative, setCurrentNarrative] = useState<string | null>(null)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [isInitialized, setIsInitialized] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const phaseStartTime = useRef<number>(0)

  // Initialize narratives when workout starts or phase changes
  useEffect(() => {
    if (isWorkoutActive && currentPhase === 'warmup') {
      initializeWarmupNarratives()
    }
  }, [isWorkoutActive, currentPhase])

  // Start/stop timing based on workout state
  useEffect(() => {
    if (isWorkoutActive && currentPhase === 'warmup' && isInitialized) {
      startPhaseTimer()
    } else {
      stopPhaseTimer()
    }

    return () => stopPhaseTimer()
  }, [isWorkoutActive, currentPhase, isInitialized])

  const initializeWarmupNarratives = async () => {
    try {
      console.log('🎵 Initializing ONLY your 2 specific warmup narratives...')
      
      // FIRST: Clear any existing narratives completely
      console.log('🧹 Clearing all existing warmup narratives...')
      await dbAdmin.clearNarrativesForPhase('spinning', 'warmup')
      
      // SECOND: Insert ONLY your 2 specific narratives
      console.log('📝 Inserting ONLY the 2 specific narratives...')
      const result = await dbAdmin.insertWarmupNarratives()
      
      if (!result.success) {
        console.error('❌ Failed to insert narratives:', result.error)
        return
      }
      
      console.log('✅ Successfully inserted your 2 narratives')
      
      // THIRD: Load narratives into engine
      console.log('🔄 Loading narratives into engine...')
      await narrativeEngine.loadNarratives('spinning', 'warmup')
      
      // FOURTH: Verify we only have 2 narratives
      const loadedNarratives = await dbAdmin.getNarrativesForPhase('spinning', 'warmup')
      console.log(`📊 Loaded ${loadedNarratives.length} narratives:`, loadedNarratives.map(n => n.text))
      
      if (loadedNarratives.length !== 2) {
        console.error(`❌ Expected 2 narratives, got ${loadedNarratives.length}`)
        return
      }
      
      // Set up track analysis
      if (currentTrack) {
        const trackAnalysis: TrackAnalysis = {
          duration: currentTrack.duration_ms / 1000,
          tempo: currentTrack.tempo || 120,
          timeSignature: 4,
          trackId: (currentTrack as any).trackId // Include Spotify track ID for advanced analysis
        }
        
        await narrativeEngine.setTrack(trackAnalysis)
        console.log('🎵 Track set for narrative timing:', trackAnalysis)
      } else {
        // Use default track for testing
        await narrativeEngine.setTrack({
          duration: 180, // 3 minutes
          tempo: 120,
          timeSignature: 4
        })
        console.log('🎵 Using default track for narrative timing')
      }
      
      setIsInitialized(true)
      console.log('✅ ONLY your 2 warmup narratives are ready!')
      
    } catch (error) {
      console.error('❌ Error initializing warmup narratives:', error)
    }
  }

  const startPhaseTimer = () => {
    phaseStartTime.current = Date.now()
    setElapsedTime(0)
    setCurrentNarrative(null)
    
    console.log('🎵 Starting warmup phase timer')
    
    intervalRef.current = setInterval(() => {
      const now = Date.now()
      const elapsed = (now - phaseStartTime.current) / 1000
      setElapsedTime(elapsed)
      
      // Check for narrative triggers
      const narrative = narrativeEngine.checkTriggers(now)
      if (narrative) {
        console.log('🎵 Narrative triggered:', narrative)
        setCurrentNarrative(narrative)
        onNarrativeTriggered?.(narrative)
        
        // Clear narrative after 5 seconds
        setTimeout(() => {
          setCurrentNarrative(null)
        }, 5000)
      }
    }, 100) // Check every 100ms for precise timing
  }

  const stopPhaseTimer = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    narrativeEngine.reset()
    setElapsedTime(0)
    setCurrentNarrative(null)
    setIsInitialized(false)
    console.log('🎵 Phase timer stopped')
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Don't render anything if not in warmup phase
  if (currentPhase !== 'warmup') {
    return null
  }

  return (
    <div className="fixed top-4 left-4 right-4 z-50 pointer-events-none">
      {/* Current Narrative Display */}
      {currentNarrative && (
        <Card className="mb-4 pointer-events-auto border-2 border-green-500 bg-green-50 shadow-lg">
          <CardContent className="p-4">
            <div className="text-lg font-bold text-green-800 text-center">
              🎵 {currentNarrative}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Musical Timing Analysis */}
      {isWorkoutActive && (
        <Card className="pointer-events-auto bg-white/90 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex justify-between items-center">
              <span>🎵 Warmup Phase - Musical Analysis</span>
              <Badge variant="secondary">{formatTime(elapsedTime)}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-xs text-gray-600 space-y-1">
              <div><strong>Track:</strong> {currentTrack?.name || 'Test Warmup Song'}</div>
              <div><strong>Tempo:</strong> {currentTrack?.tempo || 120} BPM</div>
              <div><strong>Duration:</strong> {formatTime((currentTrack?.duration_ms || 180000) / 1000)}</div>
              <div><strong>Status:</strong> {isInitialized ? '✅ 2 Narratives Ready' : '⏳ Initializing...'}</div>
            </div>
            
            {/* Musical timing markers */}
            {isInitialized && (
              <div className="mt-2 text-xs space-y-1">
                <div className="flex justify-between">
                  <span>📍 "Legs warming up" at:</span>
                  <Badge variant="outline">~{((currentTrack?.tempo || 120) ? (60 / (currentTrack?.tempo || 120) * 16).toFixed(1) : '8.0')}s</Badge>
                </div>
                <div className="flex justify-between">
                  <span>📍 "Chorus in 7 seconds" at:</span>
                  <Badge variant="outline">~{((currentTrack?.duration_ms || 180000) / 1000 * 0.25 - 7).toFixed(1)}s</Badge>
                </div>
              </div>
            )}
            
            {/* Progress bar with timing markers */}
            <div className="mt-2 relative">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-600 h-2 rounded-full transition-all duration-100"
                  style={{ 
                    width: currentTrack 
                      ? `${(elapsedTime / (currentTrack.duration_ms / 1000)) * 100}%`
                      : `${(elapsedTime / 180) * 100}%`
                  }}
                />
              </div>
              
              {/* Timing markers on progress bar */}
              {isInitialized && (
                <div className="absolute top-0 w-full h-2">
                  {/* First narrative marker */}
                  <div 
                    className="absolute top-0 w-0.5 h-2 bg-blue-500"
                    style={{ 
                      left: currentTrack 
                        ? `${((60 / (currentTrack.tempo || 120) * 16) / (currentTrack.duration_ms / 1000)) * 100}%`
                        : `${(8 / 180) * 100}%`
                    }}
                  />
                  {/* Second narrative marker */}
                  <div 
                    className="absolute top-0 w-0.5 h-2 bg-red-500"
                    style={{ 
                      left: currentTrack 
                        ? `${(((currentTrack.duration_ms / 1000) * 0.25 - 7) / (currentTrack.duration_ms / 1000)) * 100}%`
                        : `${((180 * 0.25 - 7) / 180) * 100}%`
                    }}
                  />
                </div>
              )}
            </div>
            
            <div className="mt-1 text-xs text-gray-500 flex justify-between">
              <span>🔵 1st Narrative</span>
              <span>🔴 2nd Narrative</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Simple wrapper for testing the system
export const WorkoutNarrativeTest = () => {
  const [isWorkoutActive, setIsWorkoutActive] = useState(false)
  const [narrativeLog, setNarrativeLog] = useState<string[]>([])

  const mockTrack = {
    name: "Test Warmup Song",
    artist: "Bassline", 
    tempo: 120,
    duration_ms: 180000, // 3 minutes
    trackId: "4iV5W9uYEdYUVa79Axb7Rh" // Example: "Happy" by Pharrell Williams for testing
  }

  const handleNarrativeTriggered = (narrative: string) => {
    setNarrativeLog(prev => [`${new Date().toLocaleTimeString()}: ${narrative}`, ...prev])
  }

  const startWorkout = () => {
    setIsWorkoutActive(true)
    setNarrativeLog([])
    console.log('🏋️ Starting workout - warmup phase')
  }

  const stopWorkout = () => {
    setIsWorkoutActive(false)
    console.log('🏋️ Stopping workout')
  }

  return (
    <Card className="w-full max-w-2xl mx-auto mt-8">
      <CardHeader>
        <CardTitle>Automatic Warmup Narratives</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button 
            onClick={isWorkoutActive ? stopWorkout : startWorkout}
            variant={isWorkoutActive ? "destructive" : "default"}
          >
            {isWorkoutActive ? 'Stop Workout' : 'Start Warmup Workout'}
          </Button>
        </div>

        <div className="text-sm text-gray-600">
          <p><strong>How it works:</strong></p>
          <ul className="list-disc list-inside space-y-1">
            <li>Click "Start Warmup Workout" to begin</li>
            <li>Narratives automatically trigger based on musical timing</li>
            <li>First narrative: After 4 bars (~5.3s at 120 BPM)</li>
            <li>Second narrative: 7 seconds before chorus (~43s)</li>
          </ul>
        </div>

        {narrativeLog.length > 0 && (
          <div>
            <h4 className="font-semibold mb-2">Narrative Log:</h4>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {narrativeLog.map((log, index) => (
                <div key={index} className="text-sm p-2 bg-gray-100 rounded">
                  {log}
                </div>
              ))}
            </div>
          </div>
        )}

        <WorkoutNarrativeSystem
          isWorkoutActive={isWorkoutActive}
          currentPhase="warmup"
          currentTrack={mockTrack}
          onNarrativeTriggered={handleNarrativeTriggered}
        />
      </CardContent>
    </Card>
  )
}