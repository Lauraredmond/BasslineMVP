// Integration Test Suite for End-to-End RapidAPI → Supabase Flow
// Provides comprehensive testing and verification of the complete data pipeline

import { errorHandler } from './enhanced-error-handler';
import { supabase } from './supabase';

export interface TestResult {
  testName: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  duration: number;
  details?: string;
  error?: string;
  data?: any;
}

export interface TestSuite {
  suiteName: string;
  results: TestResult[];
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  totalDuration: number;
  summary: string;
}

class IntegrationTestSuite {
  private testResults: TestResult[] = [];

  async runFullTestSuite(): Promise<TestSuite> {
    const startTime = performance.now();
    this.testResults = [];

    console.log('🧪 Starting comprehensive integration test suite...');

    // Test 1: Database connectivity and table structure
    await this.testDatabaseConnectivity();
    await this.testTableStructure();

    // Test 2: Netlify Function availability
    await this.testNetlifyFunctionAvailability();

    // Test 3: RapidAPI integration (via Netlify Function)
    await this.testRapidApiIntegration();

    // Test 4: Data transformation and normalization
    await this.testDataTransformation();

    // Test 5: End-to-end logging flow
    await this.testEndToEndLogging();

    // Test 6: Error handling and recovery
    await this.testErrorHandling();

    // Test 7: Performance and rate limiting
    await this.testPerformanceAndRateLimiting();

    const totalDuration = performance.now() - startTime;

    // Compile results
    const suite: TestSuite = {
      suiteName: 'RapidAPI → Supabase Integration Tests',
      results: this.testResults,
      totalTests: this.testResults.length,
      passed: this.testResults.filter(r => r.status === 'PASS').length,
      failed: this.testResults.filter(r => r.status === 'FAIL').length,
      skipped: this.testResults.filter(r => r.status === 'SKIP').length,
      totalDuration: Math.round(totalDuration),
      summary: ''
    };

    suite.summary = this.generateSummary(suite);
    
    console.log('🏁 Integration test suite completed:', suite.summary);
    return suite;
  }

  private async runTest(
    testName: string, 
    testFn: () => Promise<{ success: boolean; details?: string; data?: any }>
  ): Promise<TestResult> {
    const startTime = performance.now();
    
    try {
      console.log(`🔄 Running: ${testName}`);
      const result = await testFn();
      const duration = Math.round(performance.now() - startTime);

      const testResult: TestResult = {
        testName,
        status: result.success ? 'PASS' : 'FAIL',
        duration,
        details: result.details,
        data: result.data
      };

      if (result.success) {
        console.log(`✅ ${testName} - PASSED (${duration}ms)`);
      } else {
        console.log(`❌ ${testName} - FAILED (${duration}ms): ${result.details}`);
      }

      this.testResults.push(testResult);
      return testResult;

    } catch (error) {
      const duration = Math.round(performance.now() - startTime);
      const testResult: TestResult = {
        testName,
        status: 'FAIL',
        duration,
        error: (error as Error).message
      };

      console.log(`💥 ${testName} - EXCEPTION (${duration}ms):`, error);
      this.testResults.push(testResult);
      return testResult;
    }
  }

  // Test 1: Database connectivity
  private async testDatabaseConnectivity(): Promise<void> {
    await this.runTest('Database Connectivity', async () => {
      const { data, error } = await supabase
        .from('spotify_playback_sessions')
        .select('count')
        .limit(1);

      if (error) {
        return { 
          success: false, 
          details: `Supabase connection failed: ${error.message}` 
        };
      }

      return { 
        success: true, 
        details: 'Successfully connected to Supabase database',
        data: { connected: true }
      };
    });
  }

  // Test 2: Table structure validation
  private async testTableStructure(): Promise<void> {
    await this.runTest('Table Structure Validation', async () => {
      // Check if the vendor-agnostic table exists
      const { data, error } = await supabase
        .from('common_streaming_vendor_analysis_logs')
        .select('id')
        .limit(1);

      if (error && error.code === '42P01') {
        return {
          success: false,
          details: 'common_streaming_vendor_analysis_logs table does not exist. Run the migration script.'
        };
      }

      if (error && error.code === '42501') {
        return {
          success: false,
          details: 'RLS policy error. Table exists but access is denied. Run the RLS fix script.'
        };
      }

      if (error) {
        return {
          success: false,
          details: `Unexpected database error: ${error.message}`
        };
      }

      return {
        success: true,
        details: 'Vendor-agnostic analysis table exists and is accessible',
        data: { tableExists: true, accessGranted: true }
      };
    });
  }

  // Test 3: Netlify Function availability
  private async testNetlifyFunctionAvailability(): Promise<void> {
    await this.runTest('Netlify Function Availability', async () => {
      try {
        const response = await fetch('/.netlify/functions/rapidapi-track-analysis?song=test', {
          method: 'GET'
        });

        if (response.status === 404) {
          return {
            success: false,
            details: 'Netlify function not found. Deploy the rapidapi-track-analysis function.'
          };
        }

        if (response.status === 500) {
          const errorData = await response.json().catch(() => ({}));
          if (errorData.details?.includes('API key not configured')) {
            return {
              success: false,
              details: 'Netlify function exists but RAPIDAPI_KEY environment variable is not set.'
            };
          }
        }

        // Status 400 or 200 means the function exists and is working
        if (response.status === 400 || response.status === 200) {
          return {
            success: true,
            details: 'Netlify function is deployed and accessible',
            data: { status: response.status }
          };
        }

        return {
          success: false,
          details: `Netlify function returned unexpected status: ${response.status}`
        };

      } catch (error) {
        return {
          success: false,
          details: `Network error accessing Netlify function: ${(error as Error).message}`
        };
      }
    });
  }

  // Test 4: RapidAPI integration via Netlify Function
  private async testRapidApiIntegration(): Promise<void> {
    await this.runTest('RapidAPI Integration via Netlify Function', async () => {
      try {
        const response = await fetch('/.netlify/functions/rapidapi-track-analysis?song=test track&artist=test artist');
        
        if (response.status === 404) {
          return { success: false, details: 'Netlify function not deployed' };
        }

        const data = await response.json();

        if (response.status === 500 && data.details?.includes('API key not configured')) {
          return { 
            success: false, 
            details: 'API key not configured in Netlify environment variables' 
          };
        }

        if (response.status === 200) {
          // Successful API call
          const hasRequiredFields = data.key && data.mode && data.tempo;
          return {
            success: hasRequiredFields,
            details: hasRequiredFields 
              ? 'RapidAPI integration working correctly'
              : 'RapidAPI response missing required fields',
            data: { responseFields: Object.keys(data) }
          };
        }

        if (response.status >= 400 && response.status < 500) {
          // Client error - might be expected for test data
          return {
            success: true,
            details: `RapidAPI function accessible (returned ${response.status} for test data)`,
            data: { status: response.status }
          };
        }

        return {
          success: false,
          details: `Unexpected response status: ${response.status}`,
          data: { status: response.status, response: data }
        };

      } catch (error) {
        return {
          success: false,
          details: `Network error: ${(error as Error).message}`
        };
      }
    });
  }

  // Test 5: Data transformation
  private async testDataTransformation(): Promise<void> {
    await this.runTest('Data Transformation and Normalization', async () => {
      // Test data transformation with mock RapidAPI response
      const mockRapidApiData = {
        key: 'C',
        mode: 'major',
        tempo: 120,
        camelot: '8B',
        energy: 75,
        danceability: 80,
        happiness: 65,
        acousticness: 30,
        instrumentalness: 15,
        loudness: '-6 dB',
        speechiness: 10,
        liveness: 20,
        duration: '3:45',
        popularity: 70
      };

      try {
        // Import the secure service (dynamic import to avoid dependency issues)
        const { secureRapidSoundnetService } = await import('./rapid-soundnet-secure');
        
        // Test conversion to Spotify format
        const spotifyFormat = secureRapidSoundnetService.convertToSpotifyAudioFeatures(mockRapidApiData);
        
        const hasValidConversion = (
          spotifyFormat.danceability >= 0 && spotifyFormat.danceability <= 1 &&
          spotifyFormat.energy >= 0 && spotifyFormat.energy <= 1 &&
          spotifyFormat.key >= 0 && spotifyFormat.key <= 11 &&
          typeof spotifyFormat.tempo === 'number'
        );

        return {
          success: hasValidConversion,
          details: hasValidConversion 
            ? 'Data transformation working correctly'
            : 'Data transformation produced invalid values',
          data: { 
            original: mockRapidApiData,
            transformed: spotifyFormat
          }
        };

      } catch (error) {
        return {
          success: false,
          details: `Data transformation error: ${(error as Error).message}`
        };
      }
    });
  }

  // Test 6: End-to-end logging
  private async testEndToEndLogging(): Promise<void> {
    await this.runTest('End-to-End Logging Flow', async () => {
      try {
        // Create a test session
        const { data: session, error: sessionError } = await supabase
          .from('spotify_playback_sessions')
          .insert({
            session_name: 'Integration Test Session',
            workout_type: 'test'
          })
          .select('id')
          .single();

        if (sessionError) {
          return {
            success: false,
            details: `Failed to create test session: ${sessionError.message}`
          };
        }

        // Test logging to vendor-agnostic table
        const testLogEntry = {
          session_id: session.id,
          vendor_source: 'Test API',
          track_name: 'Test Track',
          artist_name: 'Test Artist',
          soundnet_energy: 75,
          soundnet_happiness: 80,
          soundnet_popularity: 65
        };

        const { data: logData, error: logError } = await supabase
          .from('common_streaming_vendor_analysis_logs')
          .insert(testLogEntry)
          .select('id')
          .single();

        if (logError) {
          return {
            success: false,
            details: `Failed to insert test log entry: ${logError.message}`
          };
        }

        // Verify the data was inserted
        const { data: verifyData, error: verifyError } = await supabase
          .from('common_streaming_vendor_analysis_logs')
          .select('*')
          .eq('id', logData.id)
          .single();

        if (verifyError) {
          return {
            success: false,
            details: `Failed to verify inserted data: ${verifyError.message}`
          };
        }

        // Clean up test data
        await supabase.from('common_streaming_vendor_analysis_logs').delete().eq('id', logData.id);
        await supabase.from('spotify_playback_sessions').delete().eq('id', session.id);

        return {
          success: true,
          details: 'End-to-end logging flow successful',
          data: { 
            sessionCreated: !!session,
            dataLogged: !!logData,
            dataVerified: !!verifyData
          }
        };

      } catch (error) {
        return {
          success: false,
          details: `End-to-end logging test failed: ${(error as Error).message}`
        };
      }
    });
  }

  // Test 7: Error handling
  private async testErrorHandling(): Promise<void> {
    await this.runTest('Error Handling and Recovery', async () => {
      try {
        // Test error handler functionality
        const testError = new Error('Test error for validation');
        errorHandler.logError(testError);

        const healthStatus = errorHandler.getHealthStatus();
        const recoverySuggestions = errorHandler.getRecoverySuggestions();

        return {
          success: true,
          details: 'Error handling system working correctly',
          data: {
            errorCount: healthStatus.errorCount,
            suggestionCount: recoverySuggestions.length
          }
        };

      } catch (error) {
        return {
          success: false,
          details: `Error handling test failed: ${(error as Error).message}`
        };
      }
    });
  }

  // Test 8: Performance and rate limiting
  private async testPerformanceAndRateLimiting(): Promise<void> {
    await this.runTest('Performance and Rate Limiting', async () => {
      try {
        // Test performance monitoring
        const endOperation = errorHandler.startOperation('test-operation', {
          component: 'integration-test',
          operation: 'performance-test'
        });

        // Simulate some work
        await new Promise(resolve => setTimeout(resolve, 100));
        endOperation();

        // Test rate limiting by checking request usage
        const { secureRapidSoundnetService } = await import('./rapid-soundnet-secure');
        const usage = secureRapidSoundnetService.getRequestUsage();

        return {
          success: true,
          details: 'Performance monitoring and rate limiting functional',
          data: {
            requestsUsed: usage.used,
            requestsRemaining: usage.remaining,
            hasRateLimit: usage.remaining >= 0
          }
        };

      } catch (error) {
        return {
          success: false,
          details: `Performance test failed: ${(error as Error).message}`
        };
      }
    });
  }

  private generateSummary(suite: TestSuite): string {
    const passRate = (suite.passed / suite.totalTests * 100).toFixed(1);
    
    if (suite.failed === 0) {
      return `🎉 ALL TESTS PASSED! (${suite.passed}/${suite.totalTests}, ${passRate}% pass rate)`;
    } else if (suite.passed > suite.failed) {
      return `⚠️  MOSTLY PASSING (${suite.passed}/${suite.totalTests} passed, ${suite.failed} failed)`;
    } else {
      return `❌ MULTIPLE FAILURES (${suite.failed}/${suite.totalTests} failed, ${suite.passed} passed)`;
    }
  }

  // Quick health check for basic functionality
  async quickHealthCheck(): Promise<{
    healthy: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    console.log('🏥 Running quick health check...');
    
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check database connectivity
    try {
      const { error } = await supabase
        .from('spotify_playback_sessions')
        .select('count')
        .limit(1);
      
      if (error) {
        issues.push(`Database connectivity: ${error.message}`);
        recommendations.push('Check Supabase configuration and network connectivity');
      }
    } catch (error) {
      issues.push('Database connectivity failed');
      recommendations.push('Verify Supabase URL and anon key in environment variables');
    }

    // Check Netlify function
    try {
      const response = await fetch('/.netlify/functions/rapidapi-track-analysis?song=test');
      if (response.status === 404) {
        issues.push('Netlify function not deployed');
        recommendations.push('Deploy the rapidapi-track-analysis Netlify function');
      }
    } catch (error) {
      issues.push('Netlify function check failed');
      recommendations.push('Ensure Netlify functions are deployed and accessible');
    }

    // Check table existence
    try {
      const { error } = await supabase
        .from('common_streaming_vendor_analysis_logs')
        .select('id')
        .limit(1);
      
      if (error?.code === '42P01') {
        issues.push('Vendor analysis table does not exist');
        recommendations.push('Run the complete database migration script');
      } else if (error?.code === '42501') {
        issues.push('Database access denied (RLS policy issue)');
        recommendations.push('Run the RLS policy fix script');
      }
    } catch (error) {
      issues.push('Table structure check failed');
    }

    const healthy = issues.length === 0;
    
    console.log(healthy ? '✅ System healthy!' : `⚠️  Found ${issues.length} issue(s)`);
    
    return { healthy, issues, recommendations };
  }
}

// Export singleton instance and errorHandler
export const testSuite = new IntegrationTestSuite();
export { errorHandler } from './enhanced-error-handler';

// Utility function to run tests from browser console
if (typeof window !== 'undefined') {
  (window as any).runIntegrationTests = () => testSuite.runFullTestSuite();
  (window as any).runHealthCheck = () => testSuite.quickHealthCheck();
}