// Database schema inspection function
// Queries the actual database to return exact table structures
const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Server configuration error - missing Supabase credentials' })
      };
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get table list first
    const { data: tableListData, error: tableListError } = await supabase
      .rpc('sql', {
        query: `
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name IN ('streaming_vendor_attributes', 'instruction_narratives', 'workout_phases')
          ORDER BY table_name;
        `
      });

    if (tableListError) {
      console.error('Table list error:', tableListError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Cannot query table list: ' + tableListError.message })
      };
    }

    // Get detailed schema for each target table
    const targetTables = ['streaming_vendor_attributes', 'instruction_narratives', 'workout_phases'];
    const schemaResults = {};

    for (const tableName of targetTables) {
      try {
        // Get column information
        const { data: columnData, error: columnError } = await supabase
          .rpc('sql', {
            query: `
              SELECT 
                column_name,
                data_type,
                is_nullable,
                column_default,
                character_maximum_length,
                numeric_precision,
                numeric_scale
              FROM information_schema.columns 
              WHERE table_schema = 'public' 
              AND table_name = '${tableName}'
              ORDER BY ordinal_position;
            `
          });

        if (columnError) {
          schemaResults[tableName] = { error: columnError.message };
        } else {
          // Get table constraints (primary keys, foreign keys, etc.)
          const { data: constraintData, error: constraintError } = await supabase
            .rpc('sql', {
              query: `
                SELECT 
                  tc.constraint_name,
                  tc.constraint_type,
                  kcu.column_name
                FROM information_schema.table_constraints tc
                JOIN information_schema.key_column_usage kcu 
                  ON tc.constraint_name = kcu.constraint_name
                WHERE tc.table_schema = 'public' 
                AND tc.table_name = '${tableName}'
                ORDER BY tc.constraint_type, kcu.column_name;
              `
            });

          // Get sample data to understand actual content
          const { data: sampleData, error: sampleError } = await supabase
            .from(tableName)
            .select('*')
            .limit(3);

          schemaResults[tableName] = {
            exists: columnData && columnData.length > 0,
            columns: columnData || [],
            constraints: constraintData || [],
            sampleData: sampleData || [],
            sampleDataError: sampleError?.message,
            totalRows: 0 // Will be populated below
          };

          // Get row count
          const { count, error: countError } = await supabase
            .from(tableName)
            .select('*', { count: 'exact', head: true });

          if (!countError) {
            schemaResults[tableName].totalRows = count;
          }
        }
      } catch (error) {
        schemaResults[tableName] = { error: error.message };
      }
    }

    // Get relationship information
    const relationshipQuery = `
      SELECT 
        tc.constraint_name,
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
      AND (tc.table_name IN ('streaming_vendor_attributes', 'instruction_narratives', 'workout_phases')
        OR ccu.table_name IN ('streaming_vendor_attributes', 'instruction_narratives', 'workout_phases'));
    `;

    const { data: relationshipData, error: relationshipError } = await supabase
      .rpc('sql', { query: relationshipQuery });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        timestamp: new Date().toISOString(),
        availableTables: tableListData?.map(row => row.table_name) || [],
        schemas: schemaResults,
        relationships: relationshipData || [],
        relationshipError: relationshipError?.message,
        summary: {
          streaming_vendor_attributes: {
            exists: schemaResults.streaming_vendor_attributes?.exists || false,
            columnCount: schemaResults.streaming_vendor_attributes?.columns?.length || 0,
            rowCount: schemaResults.streaming_vendor_attributes?.totalRows || 0
          },
          instruction_narratives: {
            exists: schemaResults.instruction_narratives?.exists || false,
            columnCount: schemaResults.instruction_narratives?.columns?.length || 0,
            rowCount: schemaResults.instruction_narratives?.totalRows || 0
          },
          workout_phases: {
            exists: schemaResults.workout_phases?.exists || false,
            columnCount: schemaResults.workout_phases?.columns?.length || 0,
            rowCount: schemaResults.workout_phases?.totalRows || 0
          }
        }
      })
    };

  } catch (error) {
    console.error('Schema inspection error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: error.message,
        stack: error.stack 
      })
    };
  }
};