// Simple database schema inspection using anon key
// This function queries the database schema for the three target tables
const { createClient } = require('@supabase/supabase-js');

export const handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Missing Supabase configuration' })
      };
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const results = {};
    const targetTables = ['streaming_vendor_attributes', 'instruction_narratives', 'workout_phases'];

    // For each table, try to get sample data and infer structure
    for (const tableName of targetTables) {
      try {
        console.log(`Querying table: ${tableName}`);
        
        // Try to get sample data (this will also tell us if the table exists)
        const { data, error, count } = await supabase
          .from(tableName)
          .select('*', { count: 'exact' })
          .limit(3);

        if (error) {
          results[tableName] = {
            exists: false,
            error: error.message,
            columns: [],
            sampleData: []
          };
        } else {
          // Infer column structure from first row
          const columns = [];
          if (data && data.length > 0) {
            const firstRow = data[0];
            for (const [key, value] of Object.entries(firstRow)) {
              columns.push({
                column_name: key,
                data_type: typeof value === 'number' ? 
                  (Number.isInteger(value) ? 'integer' : 'decimal') :
                  typeof value === 'boolean' ? 'boolean' :
                  value instanceof Date ? 'timestamp' :
                  'text',
                sample_value: value
              });
            }
          }

          results[tableName] = {
            exists: true,
            totalRows: count || 0,
            columns: columns,
            sampleData: data || [],
            columnCount: columns.length
          };
        }
      } catch (tableError) {
        results[tableName] = {
          exists: false,
          error: tableError.message,
          columns: [],
          sampleData: []
        };
      }
    }

    // Special analysis for track/URI fields and relationships
    const analysis = {
      streaming_vendor_attributes: {
        hasTrackIdField: results.streaming_vendor_attributes?.columns?.some(col => 
          col.column_name.toLowerCase().includes('track_id') || 
          col.column_name.toLowerCase().includes('track_uri')
        ) || false,
        sectionFields: results.streaming_vendor_attributes?.columns?.filter(col => 
          col.column_name.toLowerCase().includes('section')
        ).map(col => col.column_name) || [],
        sampleSections: results.streaming_vendor_attributes?.sampleData?.map(row => ({
          section_type: row.section_type,
          section_number: row.section_number,
          event_type: row.event_type
        })) || []
      },
      instruction_narratives: {
        workoutTrackField: results.instruction_narratives?.columns?.find(col => 
          col.column_name.toLowerCase().includes('workout_track')
        )?.column_name || null,
        songComponentField: results.instruction_narratives?.columns?.find(col => 
          col.column_name.toLowerCase().includes('song_component') ||
          col.column_name.toLowerCase().includes('component')
        )?.column_name || null,
        sampleMappings: results.instruction_narratives?.sampleData?.map(row => ({
          workout_track: row.workout_track,
          song_component: row.song_component,
          text: row.text?.substring(0, 50) + '...'
        })) || []
      },
      workout_phases: {
        hasPhaseKey: results.workout_phases?.columns?.some(col => 
          col.column_name.toLowerCase().includes('phase_key')
        ) || false,
        workoutTrackField: results.workout_phases?.columns?.find(col => 
          col.column_name.toLowerCase().includes('workout_track')
        )?.column_name || null,
        tempoFields: results.workout_phases?.columns?.filter(col => 
          col.column_name.toLowerCase().includes('tempo') ||
          col.column_name.toLowerCase().includes('bpm')
        ).map(col => col.column_name) || [],
        samplePhases: results.workout_phases?.sampleData?.map(row => ({
          workout_track: row.workout_track,
          target_tempo_min: row.target_tempo_min,
          target_tempo_max: row.target_tempo_max
        })) || []
      }
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        timestamp: new Date().toISOString(),
        tableSchemas: results,
        relationshipAnalysis: analysis,
        summary: {
          tablesFound: targetTables.filter(table => results[table]?.exists).length,
          totalRows: targetTables.reduce((sum, table) => sum + (results[table]?.totalRows || 0), 0),
          tablesWithData: targetTables.filter(table => (results[table]?.totalRows || 0) > 0)
        }
      })
    };

  } catch (error) {
    console.error('Schema query error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
};