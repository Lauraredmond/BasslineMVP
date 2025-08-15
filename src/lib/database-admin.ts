import { supabase } from './supabase'

// Admin functions for managing database content
export class DatabaseAdmin {
  
  // Insert warm-up narratives (COMPLETELY clears existing first)
  async insertWarmupNarratives() {
    try {
      console.log('🧹 COMPLETELY clearing ALL warmup narratives...')
      
      // AGGRESSIVE CLEAR: Delete ALL existing warmup narratives
      const clearResult = await this.clearNarrativesForPhase('spinning', 'warmup')
      if (!clearResult.success) {
        console.error('❌ Failed to clear existing narratives:', clearResult.error)
      }
      
      // Double-check: Verify they're all gone
      const remaining = await this.getNarrativesForPhase('spinning', 'warmup')
      if (remaining.length > 0) {
        console.warn(`⚠️ Still found ${remaining.length} remaining narratives, force deleting...`)
        // Force delete any remaining ones
        for (const narrative of remaining) {
          await supabase.from('instruction_narratives').delete().eq('id', narrative.id)
        }
      }
      
      // Get the spinning warmup phase ID
      const { data: phases, error: phaseError } = await supabase
        .from('workout_phases')
        .select(`
          id,
          workout_types!inner(name)
        `)
        .eq('workout_types.name', 'spinning')
        .eq('phase_type', 'warmup')
        .single()

      if (phaseError || !phases) {
        console.error('❌ Error finding warmup phase:', phaseError)
        return { success: false, error: phaseError }
      }

      console.log('📝 Inserting EXACTLY 2 narratives ONLY...')
      
      // Insert ONLY the two EXACT narratives you want FOR WARMUP
      const narratives = [
        {
          workout_phase_id: phases.id,
          narrative_type: 'beat_cue',
          text: 'We\'re just warming up the legs here',
          timing: 'bar_start',
          interval_beats: 4,
          sort_order: 1
        },
        {
          workout_phase_id: phases.id,
          narrative_type: 'beat_cue', 
          text: 'Chorus in 7 seconds',
          timing: 'pre_chorus',
          interval_beats: null,
          sort_order: 2
        }
      ]

      const { data, error } = await supabase
        .from('instruction_narratives')
        .insert(narratives)
        .select()

      if (error) {
        console.error('❌ Error inserting narratives:', error)
        return { success: false, error }
      }

      // VERIFY: Check that we have exactly 2 narratives
      const finalCheck = await this.getNarrativesForPhase('spinning', 'warmup')
      console.log(`✅ Final verification: ${finalCheck.length} narratives in database:`)
      finalCheck.forEach((n, i) => console.log(`   ${i + 1}. "${n.text}"`))
      
      if (finalCheck.length !== 2) {
        console.error(`❌ EXPECTED 2 narratives, got ${finalCheck.length}!`)
        return { success: false, error: 'Wrong number of narratives inserted' }
      }

      console.log('✅ SUCCESS: ONLY your 2 warmup narratives are in the database')
      return { success: true, data }

    } catch (error) {
      console.error('❌ Database admin error:', error)
      return { success: false, error }
    }
  }

  // Insert the same 2 narratives for ALL workout phases (for simplicity)
  async insertNarrativesForAllPhases() {
    try {
      console.log('🎵 Setting up the same 2 narratives for ALL workout phases...');
      
      // Get all spinning phases
      const { data: allPhases, error: phaseError } = await supabase
        .from('workout_phases')
        .select(`
          id,
          phase_type,
          workout_types!inner(name)
        `)
        .eq('workout_types.name', 'spinning')

      if (phaseError || !allPhases) {
        console.error('❌ Error finding workout phases:', phaseError)
        return { success: false, error: phaseError }
      }

      console.log(`📊 Found ${allPhases.length} spinning phases:`, allPhases.map(p => p.phase_type));

      // Clear ALL existing narratives for spinning
      for (const phase of allPhases) {
        console.log(`🧹 Clearing narratives for ${phase.phase_type}...`);
        await supabase
          .from('instruction_narratives')
          .delete()
          .eq('workout_phase_id', phase.id)
      }

      // Insert the same 2 narratives for EVERY phase
      const allNarratives = [];
      for (const phase of allPhases) {
        allNarratives.push(
          {
            workout_phase_id: phase.id,
            narrative_type: 'beat_cue',
            text: 'We\'re just warming up the legs here',
            timing: 'bar_start',
            interval_beats: 4,
            sort_order: 1
          },
          {
            workout_phase_id: phase.id,
            narrative_type: 'beat_cue', 
            text: 'Chorus in 7 seconds',
            timing: 'pre_chorus',
            interval_beats: null,
            sort_order: 2
          }
        );
      }

      const { data, error } = await supabase
        .from('instruction_narratives')
        .insert(allNarratives)
        .select()

      if (error) {
        console.error('❌ Error inserting narratives for all phases:', error)
        return { success: false, error }
      }

      console.log(`✅ SUCCESS: Inserted 2 narratives for each of ${allPhases.length} phases (${allNarratives.length} total narratives)`);
      return { success: true, data }

    } catch (error) {
      console.error('❌ Database admin error:', error)
      return { success: false, error }
    }
  }

  // Get all narratives for a specific phase
  async getNarrativesForPhase(workoutType: string, phaseType: string) {
    try {
      const { data, error } = await supabase
        .from('instruction_narratives')
        .select(`
          *,
          workout_phases!inner(
            phase_type,
            workout_types!inner(name)
          )
        `)
        .eq('workout_phases.workout_types.name', workoutType)
        .eq('workout_phases.phase_type', phaseType)
        .order('sort_order')

      if (error) {
        console.error('Error fetching narratives:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Error in getNarrativesForPhase:', error)
      return []
    }
  }

  // Clear existing narratives for a phase (for testing)
  async clearNarrativesForPhase(workoutType: string, phaseType: string) {
    try {
      // First get the phase ID
      const { data: phases } = await supabase
        .from('workout_phases')
        .select(`
          id,
          workout_types!inner(name)
        `)
        .eq('workout_types.name', workoutType)
        .eq('phase_type', phaseType)

      if (!phases || phases.length === 0) {
        return { success: false, error: 'Phase not found' }
      }

      // Delete narratives for this phase
      const { error } = await supabase
        .from('instruction_narratives')
        .delete()
        .eq('workout_phase_id', phases[0].id)

      return { success: !error, error }
    } catch (error) {
      return { success: false, error }
    }
  }
}

export const dbAdmin = new DatabaseAdmin()