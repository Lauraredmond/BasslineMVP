import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { dbAdmin } from '@/lib/database-admin'
import { narrativeEngine, TrackAnalysis } from '@/lib/narrative-engine'

export const NarrativeTest = () => {
  const [narratives, setNarratives] = useState<any[]>([])
  const [currentNarrative, setCurrentNarrative] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [nextNarrative, setNextNarrative] = useState<{text: string, timeUntil: number} | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Mock track for testing (simulates a 3-minute song at 120 BPM)
  const mockTrack: TrackAnalysis = {
    duration: 180, // 3 minutes
    tempo: 120, // 120 BPM
    timeSignature: 4
  }

  // Load narratives and set up the engine
  const setupNarratives = async () => {
    try {
      // First, insert the warmup narratives
      await dbAdmin.insertWarmupNarratives()
      
      // Load narratives for spinning warmup
      await narrativeEngine.loadNarratives('spinning', 'warmup')
      
      // Get narratives for display
      const loaded = await dbAdmin.getNarrativesForPhase('spinning', 'warmup')
      setNarratives(loaded)
      
    } catch (error) {
      console.error('Setup error:', error)
    }
  }

  // Start the simulation
  const startSimulation = () => {
    setIsPlaying(true)
    setElapsedTime(0)
    setCurrentNarrative(null)
    
    // Set the track in the narrative engine
    narrativeEngine.setTrack(mockTrack)
    
    // Start the timer
    intervalRef.current = setInterval(() => {
      setElapsedTime(prev => {
        const newTime = prev + 0.1 // Update every 100ms
        
        // Check for narrative triggers
        const narrative = narrativeEngine.checkTriggers(Date.now())
        if (narrative) {
          setCurrentNarrative(narrative)
          // Clear after 5 seconds
          setTimeout(() => setCurrentNarrative(null), 5000)
        }
        
        // Update next narrative info
        const next = narrativeEngine.getNextNarrative()
        setNextNarrative(next)
        
        return newTime
      })
    }, 100)
  }

  // Stop the simulation
  const stopSimulation = () => {
    setIsPlaying(false)
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    narrativeEngine.reset()
    setElapsedTime(0)
    setCurrentNarrative(null)
    setNextNarrative(null)
  }

  // Reset narratives (for testing)
  const resetNarratives = async () => {
    await dbAdmin.clearNarrativesForPhase('spinning', 'warmup')
    setNarratives([])
    setCurrentNarrative(null)
  }

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <Card className="w-full max-w-2xl mx-auto mt-8">
      <CardHeader>
        <CardTitle>Smart Narrative Timing Test</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Controls */}
        <div className="flex gap-2 flex-wrap">
          <Button onClick={setupNarratives} variant="outline">
            Load Warmup Narratives
          </Button>
          <Button 
            onClick={isPlaying ? stopSimulation : startSimulation}
            disabled={narratives.length === 0}
          >
            {isPlaying ? 'Stop' : 'Start'} Simulation
          </Button>
          <Button onClick={resetNarratives} variant="destructive" size="sm">
            Reset DB
          </Button>
        </div>

        {/* Track Info */}
        {isPlaying && (
          <div className="p-4 bg-gray-100 rounded">
            <div className="flex justify-between items-center">
              <div>
                <strong>Mock Track:</strong> 120 BPM, 3:00 duration
              </div>
              <Badge variant="secondary">
                {formatTime(elapsedTime)} / 3:00
              </Badge>
            </div>
            
            {/* Timeline visualization */}
            <div className="mt-2 w-full bg-gray-300 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-100"
                style={{ width: `${(elapsedTime / 180) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Current Narrative Display */}
        {currentNarrative && (
          <div className="p-4 bg-green-100 border-l-4 border-green-500 rounded">
            <div className="text-lg font-bold text-green-800">
              🎵 {currentNarrative}
            </div>
          </div>
        )}

        {/* Next Narrative Preview */}
        {nextNarrative && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded">
            <div className="text-sm text-blue-700">
              <strong>Next:</strong> "{nextNarrative.text}" in {nextNarrative.timeUntil.toFixed(1)}s
            </div>
          </div>
        )}

        {/* Loaded Narratives */}
        {narratives.length > 0 && (
          <div>
            <h3 className="font-bold mb-2">Loaded Warmup Narratives:</h3>
            {narratives.map((narrative, index) => (
              <div key={narrative.id} className="p-2 bg-gray-50 rounded mb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <strong>{index + 1}.</strong> {narrative.text}
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {narrative.timing}
                    {narrative.interval_beats && ` (${narrative.interval_beats} bars)`}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Instructions */}
        <div className="text-sm text-gray-600">
          <p><strong>Test:</strong></p>
          <ul className="list-disc list-inside space-y-1">
            <li>Narrative 1 triggers after first 4 bars (~5.3 seconds at 120 BPM)</li>
            <li>Narrative 2 triggers 7 seconds before estimated chorus (~43 seconds)</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}