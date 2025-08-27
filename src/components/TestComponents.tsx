import React from 'react';
import { testSuite, errorHandler } from '@/lib/integration-test-suite';
import type { TestSuite, TestResult } from '@/lib/integration-test-suite';

export const DebugPanel: React.FC = () => {
  const [testResults, setTestResults] = React.useState<TestSuite | null>(null);
  const [healthResults, setHealthResults] = React.useState<any>(null);
  const [isRunning, setIsRunning] = React.useState(false);

  const runFullTests = async () => {
    setIsRunning(true);
    try {
      const results = await testSuite.runFullTestSuite();
      setTestResults(results);
      console.log('🧪 Full Test Results:', results);
    } catch (error) {
      console.error('Test suite failed:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const runHealthCheck = async () => {
    try {
      const health = await testSuite.quickHealthCheck();
      setHealthResults(health);
      console.log('🏥 Health Check:', health);
    } catch (error) {
      console.error('Health check failed:', error);
    }
  };

  const exportLogs = () => {
    const logs = errorHandler.exportLogs();
    console.log('📊 Exported Logs:', logs);
    
    // Download as file
    const blob = new Blob([logs], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bassline-logs-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  };

  const testEnhancedAnalysis = async () => {
    try {
      console.log('🧪 Testing Enhanced Analysis with Database Logging...');
      
      // Import the enhanced service
      const { enhancedRapidSoundnetService } = await import('@/lib/enhanced-rapid-soundnet');
      
      // Test with a popular song
      const testTrack = 'Blinding Lights';
      const testArtist = 'The Weeknd';
      
      console.log(`🎯 Starting enhanced analysis for: ${testTrack} by ${testArtist}`);
      
      // This should create multiple database entries
      const analysis = await enhancedRapidSoundnetService.getDetailedTrackAnalysis(testTrack, testArtist);
      
      if (analysis) {
        console.log('✅ Enhanced analysis successful:', {
          totalSections: analysis.sections.length,
          hasSegments: !!analysis.segments?.length,
          hasRhythmic: !!analysis.rhythmic?.bars.length,
          expectedDbRows: analysis.sections.length + 1
        });
        
        alert(`✅ Enhanced analysis completed!\n\nSections found: ${analysis.sections.length}\nDatabase rows created: ${analysis.sections.length + 1}\n\nCheck console for details and verify database entries.`);
      } else {
        console.error('❌ Enhanced analysis failed - no data returned');
        alert('❌ Enhanced analysis test failed - check console for details');
      }
      
    } catch (error) {
      console.error('💥 Enhanced analysis test error:', error);
      alert(`💥 Enhanced analysis test error: ${error.message}`);
    }
  };

  const testSecureRapidApi = async () => {
    try {
      console.log('🧪 Testing Secure RapidAPI Integration...');
      
      // Import the secure service
      const { secureRapidSoundnetService } = await import('@/lib/rapid-soundnet-secure');
      
      // Test with a sample track
      const result = await secureRapidSoundnetService.getTrackAnalysis('Test Song', 'Test Artist');
      
      console.log('✅ Secure RapidAPI Test Result:', result);
      
      // Check if we got a valid response structure
      const hasRequiredFields = result && result.key && result.mode && result.tempo;
      
      if (hasRequiredFields) {
        console.log('✅ Secure RapidAPI integration is working correctly!');
        alert('✅ Secure RapidAPI Test PASSED!\n\nResponse includes:\n- Key: ' + result.key + '\n- Mode: ' + result.mode + '\n- Tempo: ' + result.tempo + '\n- Energy: ' + result.energy);
      } else {
        console.warn('⚠️ Secure RapidAPI returned unexpected format:', result);
        alert('⚠️ Secure RapidAPI Test: Unexpected response format');
      }
      
    } catch (error) {
      console.error('❌ Secure RapidAPI Test Failed:', error);
      alert('❌ Secure RapidAPI Test FAILED:\n\n' + (error as Error).message);
    }
  };

  return (
    <div 
      style={{
        position: 'fixed',
        bottom: '80px', // Above the bottom navigation
        right: '20px',
        background: 'white',
        padding: '15px',
        border: '2px solid #007bff',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        zIndex: 9999,
        maxWidth: '300px'
      }}
    >
      <h4 style={{ margin: '0 0 10px 0', color: '#007bff', fontSize: '14px' }}>🔧 Debug Panel</h4>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <button 
          onClick={runFullTests}
          disabled={isRunning}
          style={{
            padding: '6px 10px',
            background: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isRunning ? 'not-allowed' : 'pointer',
            fontSize: '12px'
          }}
        >
          {isRunning ? '🔄 Running...' : '🧪 Run All Tests'}
        </button>
        
        <button 
          onClick={runHealthCheck}
          style={{
            padding: '6px 10px',
            background: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          🏥 Quick Health Check
        </button>
        
        <button 
          onClick={testSecureRapidApi}
          style={{
            padding: '6px 10px',
            background: '#17a2b8',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          🔐 Test Secure API
        </button>
        
        <button 
          onClick={testEnhancedAnalysis}
          style={{
            padding: '6px 10px',
            background: '#6f42c1',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          🎵 Enhanced Analysis
        </button>
        
        <button 
          onClick={exportLogs}
          style={{
            padding: '6px 10px',
            background: '#ffc107',
            color: 'black',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          📊 Export Logs
        </button>
      </div>

      {testResults && (
        <div style={{ marginTop: '8px', fontSize: '10px', padding: '6px', background: '#f8f9fa', borderRadius: '4px' }}>
          <strong>Last Test Results:</strong>
          <div style={{ color: testResults.failed === 0 ? 'green' : 'red', fontWeight: 'bold' }}>
            {testResults.summary}
          </div>
          <div style={{ color: '#666' }}>
            Duration: {testResults.totalDuration}ms<br/>
            {testResults.passed} passed, {testResults.failed} failed
          </div>
        </div>
      )}

      {healthResults && (
        <div style={{ marginTop: '8px', fontSize: '10px', padding: '6px', background: '#f8f9fa', borderRadius: '4px' }}>
          <strong>Health Status:</strong>
          <div style={{ color: healthResults.healthy ? 'green' : 'red', fontWeight: 'bold' }}>
            {healthResults.healthy ? '✅ Healthy' : `❌ ${healthResults.issues.length} Issues`}
          </div>
          {healthResults.issues.length > 0 && (
            <div style={{ color: '#666', marginTop: '4px' }}>
              <strong>Issues:</strong>
              <ul style={{ margin: '2px 0', paddingLeft: '12px' }}>
                {healthResults.issues.slice(0, 2).map((issue: string, i: number) => (
                  <li key={i} style={{ fontSize: '9px' }}>{issue}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
      
      <div style={{ marginTop: '8px', fontSize: '9px', color: '#666', textAlign: 'center' }}>
        Tests run in browser console.<br/>
        Check Console for details.
      </div>
    </div>
  );
};

// Quick Test Button for immediate verification
export const QuickTestButton: React.FC = () => {
  const [isVisible, setIsVisible] = React.useState(false);
  
  React.useEffect(() => {
    // Show the test button only in development or when URL contains ?debug=true
    const isDev = process.env.NODE_ENV === 'development';
    const hasDebugParam = new URLSearchParams(window.location.search).get('debug') === 'true';
    setIsVisible(isDev || hasDebugParam);
  }, []);

  if (!isVisible) return null;

  return (
    <div style={{
      position: 'fixed',
      top: '80px',
      right: '20px',
      zIndex: 9999
    }}>
      <button
        onClick={async () => {
          console.log('🧪 Running Quick Integration Test...');
          try {
            const { testSuite } = await import('@/lib/integration-test-suite');
            const health = await testSuite.quickHealthCheck();
            
            if (health.healthy) {
              alert('✅ SYSTEM HEALTHY!\n\nAll critical components are working correctly.');
            } else {
              alert('⚠️ ISSUES DETECTED!\n\nIssues found:\n' + health.issues.join('\n') + '\n\nRecommendations:\n' + health.recommendations.join('\n'));
            }
          } catch (error) {
            alert('❌ Test Failed: ' + (error as Error).message);
          }
        }}
        style={{
          padding: '8px 12px',
          background: '#28a745',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
        }}
      >
        🧪 Quick Test
      </button>
    </div>
  );
};