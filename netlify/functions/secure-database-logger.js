// Netlify Function: Secure Database Logger
// Handles all database operations server-side with column introspection
const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
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
    // Use SERVICE ROLE KEY for server-side operations
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    console.log('Environment check:', {
      hasUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey,
      urlPrefix: supabaseUrl ? supabaseUrl.substring(0, 20) + '...' : 'missing'
    });
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase configuration:', {
        hasUrl: !!supabaseUrl,
        hasServiceKey: !!supabaseServiceKey
      });
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Server configuration error',
          details: 'Supabase service key not configured'
        })
      };
    }
    
    console.log('Creating Supabase client with service role key...');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (event.httpMethod === 'POST') {
      const requestBody = JSON.parse(event.body);
      const { action, data } = requestBody;

      switch (action) {
        case 'introspect_table':
          return await introspectTable(supabase, headers);
          
        case 'create_session':
          return await createSession(supabase, headers, data);
          
        case 'log_analysis':
          return await logAnalysis(supabase, headers, data);
          
        default:
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Invalid action' })
          };
      }
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };

  } catch (error) {
    console.error('Secure database logger error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        details: error.message
      })
    };
  }
};

async function introspectTable(supabase, headers) {
  try {
    // Get table schema - exact column names and types
    const { data: columns, error } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', 'common_streaming_vendor_analysis_logs')
      .eq('table_schema', 'public');

    if (error) {
      console.error('Schema introspection error:', error);
      throw error;
    }

    if (!columns || !Array.isArray(columns)) {
      console.error('No columns returned from schema query');
      throw new Error('Table schema not found');
    }

    const validColumns = columns.map(col => ({
      name: col.column_name,
      type: col.data_type,
      nullable: col.is_nullable === 'YES'
    }));

    console.log('Schema introspection success:', {
      columnCount: validColumns.length,
      sampleColumns: validColumns.slice(0, 5).map(c => c.name)
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        columns: validColumns,
        columnNames: validColumns.map(col => col.name)
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Table introspection failed',
        details: error.message
      })
    };
  }
}

async function createSession(supabase, headers, data) {
  try {
    const { data: session, error } = await supabase
      .from('spotify_playback_sessions')
      .insert({
        session_name: data.sessionName || `Session ${new Date().toISOString()}`,
        workout_type: data.workoutType || 'general',
        start_time: new Date().toISOString()
      })
      .select('id')
      .single();

    if (error) throw error;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        sessionId: session.id
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Session creation failed',
        details: error.message
      })
    };
  }
}

async function logAnalysis(supabase, headers, data) {
  try {
    // First get valid columns
    const { data: columns, error: schemaError } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', 'common_streaming_vendor_analysis_logs')
      .eq('table_schema', 'public');

    if (schemaError) {
      console.error('Schema query error:', schemaError);
      throw schemaError;
    }

    if (!columns || !Array.isArray(columns)) {
      console.error('No columns returned for filtering');
      throw new Error('Could not retrieve table schema for column filtering');
    }

    const validColumnNames = new Set(columns.map(col => col.column_name));
    console.log('Valid columns for filtering:', Array.from(validColumnNames).slice(0, 10));
    
    // Filter payload to only valid columns
    const filteredPayload = {};
    Object.keys(data).forEach(key => {
      if (validColumnNames.has(key)) {
        filteredPayload[key] = data[key];
      }
    });

    console.log('Filtered payload keys:', Object.keys(filteredPayload));
    console.log('Original payload size:', Object.keys(data).length);
    console.log('Filtered payload size:', Object.keys(filteredPayload).length);

    // Insert with only valid columns
    const { data: logEntry, error } = await supabase
      .from('common_streaming_vendor_analysis_logs')
      .insert(filteredPayload)
      .select('id')
      .single();

    if (error) throw error;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        logId: logEntry.id,
        filteredFields: Object.keys(filteredPayload).length,
        originalFields: Object.keys(data).length
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Analysis logging failed',
        details: error.message
      })
    };
  }
}