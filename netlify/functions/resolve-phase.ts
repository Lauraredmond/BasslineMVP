/**
 * Netlify Function: Resolve Phase
 * Maps track BPM to workout phase with instruction narratives
 */

import { Handler } from '@netlify/functions';
import { resolvePhaseForTrack, getInstructionNarratives, PhaseMatch } from '../../src/lib/musicAnalysis/phaseResolver';

interface ResolvePhaseRequest {
  trackId: string;
  vendor: 'spotify';
  positionMs?: number;
}

interface ResolvePhaseResponse extends PhaseMatch {
  instruction_narratives: Array<{
    id: string;
    workout_track: string;
    song_component: string;
    text: string;
    created_at: string;
  }>;
}

export const handler: Handler = async (event, context) => {
  // Set CORS headers for all responses
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({
        error: 'Method not allowed. Use POST.',
        code: 'METHOD_NOT_ALLOWED'
      })
    };
  }

  try {
    // Parse request body
    if (!event.body) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Request body is required',
          code: 'MISSING_BODY'
        })
      };
    }

    let requestData: ResolvePhaseRequest;
    try {
      requestData = JSON.parse(event.body);
    } catch (parseError) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Invalid JSON in request body',
          code: 'INVALID_JSON'
        })
      };
    }

    // Validate required fields
    const { trackId, vendor, positionMs = 0 } = requestData;
    
    if (!trackId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'trackId is required',
          code: 'MISSING_TRACK_ID'
        })
      };
    }

    if (vendor !== 'spotify') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Only "spotify" vendor is currently supported',
          code: 'UNSUPPORTED_VENDOR'
        })
      };
    }

    // Validate positionMs if provided
    if (positionMs !== undefined && (typeof positionMs !== 'number' || positionMs < 0)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'positionMs must be a non-negative number',
          code: 'INVALID_POSITION'
        })
      };
    }

    console.log(`🎯 [RESOLVE-PHASE API] Processing request: trackId=${trackId}, vendor=${vendor}, position=${positionMs}ms`);

    // Step 1: Resolve the phase
    const phaseMatch = await resolvePhaseForTrack({
      trackId,
      vendor,
      positionMs
    });

    // Step 2: Get instruction narratives for the resolved phase
    let instruction_narratives: any[] = [];
    if (phaseMatch.phase_code) {
      instruction_narratives = await getInstructionNarratives(phaseMatch.phase_code);
    }

    // Step 3: Construct response
    const response: ResolvePhaseResponse = {
      ...phaseMatch,
      instruction_narratives
    };

    console.log(`✅ [RESOLVE-PHASE API] Success: ${phaseMatch.reason}, ${instruction_narratives.length} narratives`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response)
    };

  } catch (error) {
    console.error('❌ [RESOLVE-PHASE API] Unexpected error:', error);
    
    // Don't expose internal error details in production
    const errorMessage = process.env.NODE_ENV === 'development' 
      ? (error as Error).message 
      : 'Internal server error';

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: errorMessage,
        code: 'INTERNAL_ERROR',
        // Include phase_code fallback for graceful degradation
        phase_code: 'recovery',
        phase_name: 'Recovery',
        bpm: null,
        bpmConfidence: null,
        bpmSource: 'unknown',
        reason: 'Error during resolution - defaulted to recovery phase',
        instruction_narratives: []
      })
    };
  }
};

// Export type definitions for use in frontend
export type { ResolvePhaseRequest, ResolvePhaseResponse };