import React from 'react';
import { testSuite, errorHandler } from '@/lib/integration-test-suite';
import type { TestSuite, TestResult } from '@/lib/integration-test-suite';
import { spotifyService } from '@/lib/spotify';

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
      console.log('🧪 🚨 TESTING ENHANCED SECTIONAL ANALYSIS - This should create section-based rows, not interval-based! 🚨');
      
      // Import the enhanced service
      const { enhancedRapidSoundnetService } = await import('@/lib/enhanced-rapid-soundnet');
      
      // Test with THE PRETENDER specifically (the song user is testing)
      const testTrack = 'The Pretender';
      const testArtist = 'Foo Fighters';
      
      console.log(`🎯 🚨 STARTING ENHANCED SECTIONAL ANALYSIS for: ${testTrack} by ${testArtist} 🚨`);
      console.log('🚨 This should create 5-8 database rows (one per section) with DIFFERENT attribute values per section! 🚨');
      
      // This should create multiple database entries with SECTIONAL data
      const analysis = await enhancedRapidSoundnetService.getDetailedTrackAnalysis(testTrack, testArtist);
      
      if (analysis) {
        console.log('✅ Enhanced sectional analysis successful:', {
          totalSections: analysis.sections.length,
          hasSegments: !!analysis.segments?.length,
          hasRhythmic: !!analysis.rhythmic?.bars.length,
          expectedDbRows: analysis.sections.length + 1,
          sectionalData: analysis.sections.slice(0, 3) // Show first 3 sections
        });
        
        alert(`✅ Enhanced sectional analysis completed for "${testTrack}"!\n\nSections found: ${analysis.sections.length}\nDatabase rows created: ${analysis.sections.length + 1}\n\nEach row should have DIFFERENT tempo/loudness/energy values.\nSection columns should be populated.\n\nCheck database now!`);
      } else {
        console.error('❌ Enhanced sectional analysis failed - no data returned');
        alert('❌ Enhanced sectional analysis test failed - check console for details');
      }
      
    } catch (error) {
      console.error('💥 Enhanced sectional analysis test error:', error);
      alert(`💥 Enhanced sectional analysis test error: ${error.message}`);
    }
  };

  const testRealtimeSectionalAnalysis = async () => {
    try {
      console.log('🧪 Testing Real-time Sectional Analysis...');
      
      // Import the realtime analyzer
      const { realtimeSectionalAnalyzer } = await import('@/lib/realtime-sectional-analyzer');
      
      // Test with "The Pretender" - the song that had static values
      const testTrack = 'The Pretender';
      const testArtist = 'Foo Fighters';
      
      console.log(`🎯 Starting real-time sectional analysis for: ${testTrack} by ${testArtist}`);
      
      // Start real-time analysis
      const success = await realtimeSectionalAnalyzer.startRealtimeAnalysis(testTrack, testArtist);
      
      if (success) {
        console.log('✅ Real-time sectional analysis started!');
        
        // Simulate some time passing
        setTimeout(() => {
          const status = realtimeSectionalAnalyzer.getAnalysisStatus();
          console.log('📊 Analysis status:', status);
          
          // Stop after demo
          setTimeout(() => {
            realtimeSectionalAnalyzer.stopRealtimeAnalysis();
            console.log('⏹️ Real-time analysis stopped');
          }, 5000);
        }, 2000);
        
        alert(`✅ Real-time sectional analysis started!\n\nThis will log different attribute values for each section during playback.\n\nCheck console and database for CHANGING values per section.`);
      } else {
        console.error('❌ Real-time analysis failed to start');
        alert('❌ Real-time sectional analysis test failed - check console for details');
      }
      
    } catch (error) {
      console.error('💥 Real-time sectional analysis test error:', error);
      alert(`💥 Real-time analysis test error: ${error.message}`);
    }
  };

  const addSectionColumnsToVendorTable = async () => {
    try {
      console.log('🧪 Adding section columns to vendor analysis table...');
      
      // Import the migration function
      const { addSectionColumnsToVendorTable, checkSectionColumnsExist, getSampleSectionData } = await import('@/lib/add-section-columns-to-vendor-table');
      
      // Check if columns already exist
      const checkResult = await checkSectionColumnsExist();
      
      if (checkResult.exists) {
        console.log('✅ Section columns already exist');
        
        // Show sample data
        const sampleResult = await getSampleSectionData();
        if (sampleResult.success && sampleResult.data.length > 0) {
          console.log('📊 Sample section data:', sampleResult.data);
          alert(`✅ Section columns already exist!\n\nFound ${sampleResult.data.length} records with section data.\n\nCheck console for sample data.`);
        } else {
          alert('✅ Section columns exist but no section data found.\n\nUse "Real-time Sections" to create sectional data.');
        }
        return;
      }
      
      // Add the columns
      console.log('🗄️ Adding section columns to vendor table...');
      const result = await addSectionColumnsToVendorTable();
      
      if (result.success) {
        console.log('✅ Section columns added successfully');
        console.log('Added columns:', result.columnsAdded);
        
        alert(`✅ Section columns added successfully!\n\nColumns added:\n${result.columnsAdded.join('\n')}\n\nRecords with section info: ${result.recordsWithSectionInfo}`);
        
        // Show sample data if available
        const sampleResult = await getSampleSectionData();
        if (sampleResult.success && sampleResult.data.length > 0) {
          console.log('📊 Sample updated data:', sampleResult.data);
        }
      } else {
        console.error('❌ Failed to add section columns:', result.error);
        alert(`❌ Failed to add columns: ${result.error?.message || 'Unknown error'}`);
      }
      
    } catch (error) {
      console.error('💥 Section columns migration error:', error);
      alert(`💥 Migration error: ${error.message}`);
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

  const testAlgorithmicSectionAnalyzer = async () => {
    try {
      console.log('🧪 Testing Algorithmic Section Analyzer...');
      
      // Import the algorithmic analyzer
      const { algorithmicSectionAnalyzer } = await import('@/lib/algorithmic-section-analyzer');
      
      // Test with "The Pretender" - the song user is testing with
      const testMetadata = {
        name: 'The Pretender',
        artist: 'Foo Fighters',
        duration: 268, // 4:28 actual duration
        tempo: 152, // Actual tempo from RapidAPI
        energy: 85,
        danceability: 45,
        genres: ['rock', 'alternative rock']
      };
      
      console.log(`🎯 Testing algorithmic analysis for: ${testMetadata.name} by ${testMetadata.artist}`);
      console.log('📊 Using metadata:', testMetadata);
      
      // Generate algorithmic sections
      const predictedSections = algorithmicSectionAnalyzer.analyzeSongStructure(testMetadata);
      
      if (predictedSections && predictedSections.length > 0) {
        console.log('✅ Algorithmic analysis successful:', {
          totalSections: predictedSections.length,
          sectionsFound: predictedSections.map(s => `${s.sectionType} (${Math.round(s.sectionStartTime)}s-${Math.round(s.sectionEndTime)}s, intensity: ${s.intensity})`),
          totalDuration: Math.round(predictedSections[predictedSections.length - 1]?.sectionEndTime || 0)
        });
        
        // Test current section detection
        const testPosition = 120000; // 2 minutes in
        const currentSection = algorithmicSectionAnalyzer.getCurrentSection(predictedSections, testPosition);
        const upcomingSection = algorithmicSectionAnalyzer.getUpcomingSection(predictedSections, testPosition, 10);
        
        console.log('🎵 Section detection test at 2:00:', {
          currentSection: currentSection ? `${currentSection.sectionType} (${Math.round(currentSection.sectionStartTime)}s-${Math.round(currentSection.sectionEndTime)}s)` : 'none',
          upcomingSection: upcomingSection ? `${upcomingSection.sectionType} (${Math.round(upcomingSection.sectionStartTime)}s-${Math.round(upcomingSection.sectionEndTime)}s)` : 'none'
        });
        
        alert(`✅ Algorithmic Section Analyzer SUCCESS!\\n\\nTrack: ${testMetadata.name}\\nGenre Pattern: ${predictedSections.length > 0 ? 'rock' : 'default'}\\n\\n📊 Sections Generated: ${predictedSections.length}\\n\\n🎵 Structure Preview:\\n${predictedSections.slice(0, 5).map(s => `• ${s.sectionType} (${Math.round(s.sectionStartTime)}s-${Math.round(s.sectionEndTime)}s) - intensity ${s.intensity}%`).join('\\n')}\\n\\n${predictedSections.length > 5 ? `...and ${predictedSections.length - 5} more sections` : ''}\\n\\n✅ Ready for real-time workout sync!`);
        
      } else {
        console.error('❌ Algorithmic analysis failed - no sections generated');
        alert('❌ Algorithmic analysis test failed - check console for details');
      }
      
    } catch (error) {
      console.error('💥 Algorithmic section analyzer test error:', error);
      alert(`💥 Algorithmic analyzer test error: ${error.message}`);
    }
  };

  const testStreamingVendorSections = async () => {
    try {
      console.log('🧪 Testing Streaming Vendor Attributes Section Data...');
      
      // Test with The Pretender - should have sample data
      const testTrack = 'The Pretender';
      const testArtist = 'Foo Fighters';
      
      console.log(`🎯 Testing streaming vendor sections for: "${testTrack}" by "${testArtist}"`);
      
      const response = await fetch('/netlify/functions/get-streaming-vendor-sections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackName: testTrack, artistName: testArtist })
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Streaming vendor sections response:', data);
        
        if (data.sections && data.sections.length > 0) {
          const sectionsPreview = data.sections.map(s => `${s.sectionType} @${Math.round(s.timestampMs/1000)}s`).join(', ');
          console.log('✅ Found sections:', sectionsPreview);
          alert(`✅ STREAMING VENDOR SECTIONS SUCCESS!\n\nTrack: ${testTrack}\nSections found: ${data.sections.length}\n\n📊 Sections:\n${data.sections.map(s => `• ${s.sectionType} at ${Math.round(s.timestampMs/1000)}s`).join('\n')}\n\n✅ Data source: streaming_vendor_attributes table`);
        } else {
          console.log('⚠️ No streaming vendor sections found');
          alert(`⚠️ No sections found in streaming_vendor_attributes table for "${testTrack}"\n\nThis is expected if manual section data hasn't been added yet.`);
        }
      } else {
        console.error('❌ API request failed:', response.status);
        alert(`❌ API request failed: ${response.status}\n\nCheck console for details.`);
      }
      
    } catch (error) {
      console.error('❌ Streaming vendor sections test failed:', error);
      alert(`❌ Test failed: ${error.message}`);
    }
  };

  const testSpotifyAudioAnalysis = async () => {
    try {
      console.log('🧪 Testing Spotify Audio Analysis API Access...');
      
      // Check if user is authenticated
      const isAuthenticated = spotifyService.isAuthenticated();
      if (!isAuthenticated) {
        alert('❌ Not authenticated with Spotify. Please login first.');
        return;
      }

      // Get current playback to get a track ID
      console.log('🔍 Getting current Spotify playback...');
      const playbackState = await spotifyService.getCurrentPlayback();
      
      if (!playbackState || !playbackState.item) {
        alert('❌ No track currently playing. Please play a song on Spotify first.');
        return;
      }

      const trackId = playbackState.item.id;
      const trackName = playbackState.item.name;
      
      console.log(`🎯 Testing Audio Analysis for: "${trackName}" (ID: ${trackId})`);
      alert(`🧪 Testing Spotify Audio Analysis API...\n\nTrack: ${trackName}\n\nThis will test if we can access detailed sectional data.\n\nCheck console for results!`);

      // Attempt to call the Audio Analysis API
      const audioAnalysis = await spotifyService.getAudioAnalysis(trackId);
      
      if (audioAnalysis) {
        console.log('✅ SPOTIFY AUDIO ANALYSIS SUCCESS!', {
          track: trackName,
          sections: audioAnalysis.sections?.length || 0,
          segments: audioAnalysis.segments?.length || 0,
          bars: audioAnalysis.bars?.length || 0,
          beats: audioAnalysis.beats?.length || 0,
          duration: audioAnalysis.track?.duration || 0
        });

        const sectionTypes = audioAnalysis.sections?.map(s => `${s.start?.toFixed(1)}s: confidence ${s.confidence?.toFixed(2)}`).slice(0, 5) || [];
        
        alert(`✅ SPOTIFY AUDIO ANALYSIS SUCCESS!\n\nTrack: ${trackName}\n\n📊 Data Available:\n• Sections: ${audioAnalysis.sections?.length || 0}\n• Segments: ${audioAnalysis.segments?.length || 0}\n• Bars: ${audioAnalysis.bars?.length || 0}\n• Beats: ${audioAnalysis.beats?.length || 0}\n\n🎵 First 5 Sections:\n${sectionTypes.join('\n')}\n\n✅ We CAN access detailed sectional data!`);
        
      } else {
        console.log('❌ SPOTIFY AUDIO ANALYSIS FAILED - returned null');
        alert('❌ SPOTIFY AUDIO ANALYSIS FAILED\n\nThe API call returned null.\nThis could indicate:\n• 403 Forbidden (Extended Dev Access required)\n• Rate limiting\n• Track not available for analysis\n\nCheck console for detailed error info.');
      }
      
    } catch (error) {
      console.error('❌ Spotify Audio Analysis Test Failed:', error);
      
      // Check for specific error types
      let errorMessage = (error as Error).message;
      if (errorMessage.includes('403')) {
        errorMessage = '403 FORBIDDEN - Extended Developer Access required for Audio Analysis API';
      } else if (errorMessage.includes('429')) {
        errorMessage = '429 RATE LIMITED - Too many requests';
      }
      
      alert(`❌ SPOTIFY AUDIO ANALYSIS TEST FAILED!\n\nError: ${errorMessage}\n\nThis confirms API access restrictions.`);
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
          onClick={testAlgorithmicSectionAnalyzer}
          style={{
            padding: '6px 10px',
            background: '#9c27b0',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          🧠 Test Algorithmic Analyzer
        </button>
        
        <button 
          onClick={testStreamingVendorSections}
          style={{
            padding: '6px 10px',
            background: '#ff6b35',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          📊 Test Vendor Sections
        </button>
        
        <button 
          onClick={testSpotifyAudioAnalysis}
          style={{
            padding: '6px 10px',
            background: '#1db954',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          🎧 Test Spotify Audio Analysis
        </button>
        
        <button 
          onClick={testRealtimeSectionalAnalysis}
          style={{
            padding: '6px 10px',
            background: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          🎯 Real-time Sections
        </button>
        
        <button 
          onClick={addSectionColumnsToVendorTable}
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
          ➕ Add Section Columns
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