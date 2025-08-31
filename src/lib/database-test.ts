import { supabase } from './supabase'

// Test database connection and fetch workout types
export async function testDatabaseConnection() {
  try {
    const { data, error } = await supabase
      .from('workout_types')
      .select('*')
    
    if (error) {
      console.error('Database error:', error)
      return { success: false, error }
    }
    
    console.log('Database connected! Workout types:', data)
    return { success: true, data }
  } catch (err) {
    console.error('Connection failed:', err)
    return { success: false, error: err }
  }
}

// Verify exact schema for three key tables
export async function verifyTableSchemas() {
  try {
    // Test streaming_vendor_attributes structure
    const { data: svaData, error: svaError } = await supabase
      .from('streaming_vendor_attributes')
      .select('*')
      .limit(1)

    // Test instruction_narratives structure  
    const { data: inData, error: inError } = await supabase
      .from('instruction_narratives')
      .select('*')
      .limit(1)

    // Test workout_phases structure
    const { data: wpData, error: wpError } = await supabase
      .from('workout_phases')
      .select('*')
      .limit(1)

    // Test data for The Pretender and Slide Away
    const { data: pretenderData, error: pretenderError } = await supabase
      .from('streaming_vendor_attributes')
      .select('track_name, artist_name, section_type, section_number, timestamp_ms, spotify_track_id')
      .ilike('track_name', '%pretender%')

    const { data: slideAwayData, error: slideAwayError } = await supabase
      .from('streaming_vendor_attributes')
      .select('track_name, artist_name, section_type, section_number, timestamp_ms, spotify_track_id')
      .ilike('track_name', '%slide%away%')

    return {
      schemas: {
        streaming_vendor_attributes: { data: svaData, error: svaError },
        instruction_narratives: { data: inData, error: inError },
        workout_phases: { data: wpData, error: wpError }
      },
      testData: {
        pretender: { data: pretenderData, error: pretenderError },
        slideAway: { data: slideAwayData, error: slideAwayError }
      }
    }
  } catch (error) {
    console.error('Schema verification failed:', error)
    return { error: error.message }
  }
}

// Fetch spinning workout phases for testing
export async function getSpinningPhases() {
  const { data, error } = await supabase
    .from('workout_phases')
    .select('*')
    .order('target_tempo_min')
  
  if (error) {
    console.error('Error fetching workout phases:', error)
    return []
  }
  
  return data
}