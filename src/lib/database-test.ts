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

// Fetch spinning workout phases for testing
export async function getSpinningPhases() {
  const { data, error } = await supabase
    .from('workout_phases')
    .select(`
      *,
      workout_types(name, display_name)
    `)
    .eq('workout_types.name', 'spinning')
    .order('sort_order')
  
  if (error) {
    console.error('Error fetching spinning phases:', error)
    return []
  }
  
  return data
}