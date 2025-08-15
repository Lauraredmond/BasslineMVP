import { useEffect, useState } from 'react';
import { testDatabaseConnection, getSpinningPhases } from '@/lib/database-test';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface WorkoutType {
  id: string;
  name: string;
  display_name: string;
  description: string;
}

interface TestResult {
  success: boolean;
  data?: WorkoutType[];
  error?: any;
}

export const DatabaseTest = () => {
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [phases, setPhases] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const runTest = async () => {
    setLoading(true);
    try {
      const result = await testDatabaseConnection();
      setTestResult(result);
      
      if (result.success) {
        const spinningPhases = await getSpinningPhases();
        setPhases(spinningPhases);
      }
    } catch (error) {
      setTestResult({ success: false, error });
    }
    setLoading(false);
  };

  return (
    <Card className="w-full max-w-2xl mx-auto mt-8">
      <CardHeader>
        <CardTitle>Database Connection Test</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={runTest} 
          disabled={loading}
          className="w-full"
        >
          {loading ? 'Testing...' : 'Test Database Connection'}
        </Button>

        {testResult && (
          <div className={`p-4 rounded ${testResult.success ? 'bg-green-100' : 'bg-red-100'}`}>
            {testResult.success ? (
              <div>
                <h3 className="font-bold text-green-800">✅ Connection Successful!</h3>
                <p className="text-green-700">Found {testResult.data?.length || 0} workout types</p>
                {testResult.data?.map((type) => (
                  <div key={type.id} className="mt-2 p-2 bg-white rounded">
                    <strong>{type.display_name}</strong>: {type.description}
                  </div>
                ))}
              </div>
            ) : (
              <div>
                <h3 className="font-bold text-red-800">❌ Connection Failed</h3>
                <pre className="text-red-700 text-sm mt-2">
                  {JSON.stringify(testResult.error, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}

        {phases.length > 0 && (
          <div className="mt-4">
            <h3 className="font-bold mb-2">Spinning Workout Phases:</h3>
            {phases.map((phase, index) => (
              <div key={phase.id} className="p-2 bg-gray-100 rounded mb-2">
                <strong>{index + 1}. {phase.display_name}</strong>
                <br />
                <small>Tempo: {phase.target_tempo_min}-{phase.target_tempo_max} BPM | Energy: {phase.energy_level}</small>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};