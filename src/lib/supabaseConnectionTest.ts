/**
 * Simple Supabase Connection Test
 * Tests basic database connectivity to diagnose 406 errors
 */

import { supabase } from './supabase';

/**
 * Test basic Supabase connectivity
 */
export async function testSupabaseConnection(): Promise<void> {
  console.log('🔌 [SUPABASE TEST] Testing database connection...');
  
  try {
    // Test 1: Simple table count (no filters)
    console.log('📊 [SUPABASE TEST] Testing workout_phases table access...');
    const { data: phases, error: phasesError, count } = await supabase
      .from('workout_phases')
      .select('workout_phase_id', { count: 'exact' })
      .limit(1);
    
    if (phasesError) {
      console.error('❌ [SUPABASE TEST] workout_phases access failed:', phasesError);
      return;
    }
    
    console.log(`✅ [SUPABASE TEST] workout_phases accessible: ${count} total rows`);
    
    // Test 2: Simple SVA table access
    console.log('📊 [SUPABASE TEST] Testing streaming_vendor_attributes table access...');
    const { data: sva, error: svaError } = await supabase
      .from('streaming_vendor_attributes')
      .select('track_id')
      .limit(1);
    
    if (svaError) {
      console.error('❌ [SUPABASE TEST] SVA access failed:', svaError);
      return;
    }
    
    console.log(`✅ [SUPABASE TEST] streaming_vendor_attributes accessible`);
    
    // Test 3: Simple query with basic filter
    console.log('📊 [SUPABASE TEST] Testing simple filter query...');
    const { data: filteredPhases, error: filterError } = await supabase
      .from('workout_phases')
      .select('workout_track, target_tempo_min, target_tempo_max')
      .limit(5);
    
    if (filterError) {
      console.error('❌ [SUPABASE TEST] Filter query failed:', filterError);
      return;
    }
    
    console.log(`✅ [SUPABASE TEST] Filter query successful:`, filteredPhases);
    
    console.log('🎉 [SUPABASE TEST] All basic connectivity tests passed!');
    
  } catch (error) {
    console.error('💥 [SUPABASE TEST] Connection test failed:', error);
  }
}

/**
 * Test specific BPM range query that was causing 406 errors
 */
export async function testBPMRangeQuery(testBpm: number = 120): Promise<void> {
  console.log(`🎯 [SUPABASE TEST] Testing BPM range query for ${testBpm} BPM...`);
  
  try {
    // First, get all phases to see what's available
    const { data: allPhases, error: allError } = await supabase
      .from('workout_phases')
      .select('workout_track, target_tempo_min, target_tempo_max');
    
    if (allError) {
      console.error('❌ [SUPABASE TEST] Failed to get all phases:', allError);
      return;
    }
    
    console.log(`📊 [SUPABASE TEST] Total phases in database: ${allPhases?.length || 0}`);
    
    if (allPhases && allPhases.length > 0) {
      // Show available BPM ranges
      console.log('🎵 [SUPABASE TEST] Available BPM ranges:');
      allPhases.forEach(phase => {
        console.log(`  ${phase.workout_track}: ${phase.target_tempo_min}-${phase.target_tempo_max} BPM`);
      });
      
      // Filter in JavaScript (like our fixed mapper)
      const matching = allPhases.filter(phase => 
        phase.target_tempo_min <= testBpm && testBpm <= phase.target_tempo_max
      );
      
      console.log(`🎯 [SUPABASE TEST] Phases matching ${testBpm} BPM: ${matching.length}`);
      matching.forEach(phase => {
        console.log(`  ✅ ${phase.workout_track} (${phase.target_tempo_min}-${phase.target_tempo_max})`);
      });
    }
    
  } catch (error) {
    console.error('💥 [SUPABASE TEST] BPM range query failed:', error);
  }
}

// Expose test functions globally for console debugging
if (typeof window !== 'undefined') {
  (window as any).testSupabaseConnection = testSupabaseConnection;
  (window as any).testBPMRangeQuery = testBPMRangeQuery;
}