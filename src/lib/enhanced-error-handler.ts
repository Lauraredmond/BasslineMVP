// Enhanced Error Handler and Logging System
// Provides comprehensive error tracking, telemetry, and debugging for the MVP

export interface ErrorContext {
  component: string;
  operation: string;
  timestamp: string;
  userId?: string;
  sessionId?: string;
  metadata?: Record<string, any>;
}

export interface ApiError extends Error {
  status?: number;
  code?: string;
  endpoint?: string;
  context?: ErrorContext;
}

export interface LogEntry {
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  context: ErrorContext;
  stack?: string;
  data?: any;
}

class EnhancedErrorHandler {
  private logs: LogEntry[] = [];
  private maxLogs = 1000; // Keep last 1000 log entries
  private errorCount = 0;
  private startTime = Date.now();

  // Create enhanced error with context
  createError(
    message: string, 
    context: ErrorContext, 
    originalError?: Error
  ): ApiError {
    const error = new Error(message) as ApiError;
    error.context = {
      ...context,
      timestamp: new Date().toISOString()
    };
    
    if (originalError) {
      error.stack = originalError.stack;
      error.cause = originalError;
    }
    
    this.logError(error);
    return error;
  }

  // Enhanced logging with different levels
  log(level: LogEntry['level'], message: string, context: Partial<ErrorContext>, data?: any) {
    const entry: LogEntry = {
      level,
      message,
      context: {
        component: context.component || 'unknown',
        operation: context.operation || 'unknown',
        timestamp: new Date().toISOString(),
        ...context
      },
      data
    };

    this.logs.push(entry);
    
    // Maintain log size limit
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Console output with enhanced formatting
    this.consoleLog(entry);

    // Store critical errors in localStorage for persistence
    if (level === 'error') {
      this.persistError(entry);
    }
  }

  // Specialized error logging
  logError(error: ApiError | Error) {
    this.errorCount++;
    
    const context = (error as ApiError).context || {
      component: 'unknown',
      operation: 'unknown',
      timestamp: new Date().toISOString()
    };

    this.log('error', error.message, context, {
      stack: error.stack,
      name: error.name,
      cause: error.cause
    });
  }

  // API-specific error handling
  handleApiError(
    endpoint: string,
    response: Response,
    context: Partial<ErrorContext>
  ): ApiError {
    const error = this.createError(
      `API request failed: ${response.status} ${response.statusText}`,
      {
        component: context.component || 'api',
        operation: context.operation || 'request',
        ...context
      }
    ) as ApiError;

    error.status = response.status;
    error.endpoint = endpoint;

    return error;
  }

  // RapidAPI specific error handling
  handleRapidApiError(
    trackTitle: string,
    artistName: string | undefined,
    error: Error,
    context: Partial<ErrorContext> = {}
  ): void {
    this.log('error', 'RapidAPI request failed', {
      component: 'rapid-api',
      operation: 'track-analysis',
      ...context
    }, {
      trackTitle,
      artistName,
      originalError: error.message,
      stack: error.stack
    });
  }

  // Supabase specific error handling
  handleSupabaseError(
    operation: string,
    table: string,
    error: any,
    context: Partial<ErrorContext> = {}
  ): void {
    this.log('error', 'Supabase operation failed', {
      component: 'supabase',
      operation,
      ...context
    }, {
      table,
      errorCode: error.code,
      errorMessage: error.message,
      errorDetails: error.details,
      errorHint: error.hint
    });
  }

  // Network connectivity testing
  async testConnectivity(): Promise<{
    rapidApi: boolean;
    supabase: boolean;
    netlify: boolean;
    details: Record<string, any>;
  }> {
    const results = {
      rapidApi: false,
      supabase: false,
      netlify: false,
      details: {} as Record<string, any>
    };

    // Test Netlify Function
    try {
      const response = await fetch('/.netlify/functions/rapidapi-track-analysis?song=test', {
        method: 'GET'
      });
      results.netlify = response.status !== 404; // 404 means function doesn't exist
      results.details.netlify = {
        status: response.status,
        available: results.netlify
      };
    } catch (error) {
      results.details.netlify = { error: (error as Error).message };
    }

    // Test Supabase connection (via a simple query)
    try {
      const { supabase } = await import('./supabase');
      const { data, error } = await supabase
        .from('spotify_playback_sessions')
        .select('count')
        .limit(1);
      
      results.supabase = !error;
      results.details.supabase = {
        connected: results.supabase,
        error: error?.message
      };
    } catch (error) {
      results.details.supabase = { error: (error as Error).message };
    }

    // Test RapidAPI (via Netlify function if available)
    if (results.netlify) {
      try {
        const response = await fetch('/.netlify/functions/rapidapi-track-analysis?song=test&artist=test');
        results.rapidApi = response.status === 200 || response.status === 400; // 400 is ok (bad request but function works)
        results.details.rapidApi = {
          status: response.status,
          available: results.rapidApi
        };
      } catch (error) {
        results.details.rapidApi = { error: (error as Error).message };
      }
    }

    this.log('info', 'Connectivity test completed', {
      component: 'connectivity',
      operation: 'test'
    }, results);

    return results;
  }

  // Performance monitoring
  startOperation(operationId: string, context: Partial<ErrorContext>): () => void {
    const startTime = performance.now();
    
    this.log('debug', `Starting operation: ${operationId}`, {
      component: context.component || 'performance',
      operation: operationId,
      ...context
    });

    return () => {
      const duration = performance.now() - startTime;
      this.log('debug', `Completed operation: ${operationId}`, {
        component: context.component || 'performance', 
        operation: operationId,
        ...context
      }, { duration: Math.round(duration) });
    };
  }

  // Get system health status
  getHealthStatus(): {
    uptime: number;
    errorCount: number;
    errorRate: number;
    memoryUsage?: number;
    recentErrors: LogEntry[];
  } {
    const uptime = Date.now() - this.startTime;
    const recentErrors = this.logs
      .filter(log => log.level === 'error')
      .slice(-10);

    return {
      uptime,
      errorCount: this.errorCount,
      errorRate: this.errorCount / (uptime / 60000), // errors per minute
      memoryUsage: (performance as any).memory?.usedJSHeapSize,
      recentErrors
    };
  }

  // Export logs for debugging
  exportLogs(): string {
    return JSON.stringify({
      exportTime: new Date().toISOString(),
      healthStatus: this.getHealthStatus(),
      logs: this.logs
    }, null, 2);
  }

  // Clear logs
  clearLogs(): void {
    this.logs = [];
    this.errorCount = 0;
    localStorage.removeItem('bassline_error_logs');
    this.log('info', 'Logs cleared', {
      component: 'error-handler',
      operation: 'clear-logs'
    });
  }

  // Console logging with enhanced formatting
  private consoleLog(entry: LogEntry) {
    const emoji = {
      debug: '🔍',
      info: 'ℹ️',
      warn: '⚠️',
      error: '❌'
    };

    const prefix = `${emoji[entry.level]} [${entry.context.component}:${entry.context.operation}]`;
    
    if (entry.level === 'error') {
      console.error(prefix, entry.message, entry.data);
      if (entry.stack) {
        console.error('Stack trace:', entry.stack);
      }
    } else if (entry.level === 'warn') {
      console.warn(prefix, entry.message, entry.data);
    } else if (entry.level === 'debug') {
      console.debug(prefix, entry.message, entry.data);
    } else {
      console.log(prefix, entry.message, entry.data);
    }
  }

  // Persist critical errors to localStorage
  private persistError(entry: LogEntry) {
    try {
      const persistedErrors = JSON.parse(
        localStorage.getItem('bassline_error_logs') || '[]'
      );
      
      persistedErrors.push(entry);
      
      // Keep only last 50 errors
      if (persistedErrors.length > 50) {
        persistedErrors.splice(0, persistedErrors.length - 50);
      }
      
      localStorage.setItem('bassline_error_logs', JSON.stringify(persistedErrors));
    } catch (error) {
      // Ignore localStorage errors
    }
  }

  // Recovery suggestions based on error patterns
  getRecoverySuggestions(): string[] {
    const recentErrors = this.logs
      .filter(log => log.level === 'error')
      .slice(-5);

    const suggestions: string[] = [];

    // Check for API connectivity issues
    if (recentErrors.some(e => e.message.includes('API request failed'))) {
      suggestions.push('Check your internet connection');
      suggestions.push('Verify API endpoints are accessible');
    }

    // Check for RLS policy issues
    if (recentErrors.some(e => e.data?.errorCode === '42501')) {
      suggestions.push('Run the database migration script to fix RLS policies');
      suggestions.push('Check Supabase table permissions');
    }

    // Check for missing environment variables
    if (recentErrors.some(e => e.message.includes('not configured'))) {
      suggestions.push('Add required environment variables to Netlify');
      suggestions.push('Check .env file configuration');
    }

    // Check for missing tables
    if (recentErrors.some(e => e.data?.errorCode === '42P01')) {
      suggestions.push('Run the complete database migration script');
      suggestions.push('Create missing database tables');
    }

    return suggestions;
  }
}

// Create and export singleton instance
export const errorHandler = new EnhancedErrorHandler();

// Global error handler for unhandled errors
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    errorHandler.logError(event.error);
  });

  window.addEventListener('unhandledrejection', (event) => {
    errorHandler.logError(new Error(`Unhandled promise rejection: ${event.reason}`));
  });
}

// Utility functions for common error scenarios
export const withErrorHandling = <T extends (...args: any[]) => any>(
  fn: T,
  context: Partial<ErrorContext>
): T => {
  return ((...args: any[]) => {
    try {
      const result = fn(...args);
      
      // Handle async functions
      if (result instanceof Promise) {
        return result.catch((error) => {
          errorHandler.logError(
            errorHandler.createError(`Error in ${context.operation || 'function'}`, context as ErrorContext, error)
          );
          throw error;
        });
      }
      
      return result;
    } catch (error) {
      errorHandler.logError(
        errorHandler.createError(`Error in ${context.operation || 'function'}`, context as ErrorContext, error as Error)
      );
      throw error;
    }
  }) as T;
};

export const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000,
  context: Partial<ErrorContext> = {}
): Promise<T> => {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      errorHandler.log('warn', `Retry attempt ${attempt}/${maxRetries} failed`, {
        component: 'retry-handler',
        operation: context.operation || 'retry',
        ...context
      }, { attempt, error: lastError.message });
      
      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt - 1); // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw errorHandler.createError(
    `All ${maxRetries} retry attempts failed`,
    context as ErrorContext,
    lastError
  );
};