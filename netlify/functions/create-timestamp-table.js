const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

exports.handler = async (event, context) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    console.log('🔨 Creating streaming_vendor_attributes table...');

    // Simple table creation using raw SQL
    const { data, error } = await supabase
      .from('streaming_vendor_attributes')
      .select('*')
      .limit(1);

    if (error && error.code === 'PGRST116') {
      // Table doesn't exist, let's create it via direct SQL
      console.log('📋 Table does not exist, attempting to create it...');
      
      // Try to insert sample data which will show us if table exists
      const { data: insertData, error: insertError } = await supabase
        .from('streaming_vendor_attributes')
        .insert([{
          track_name: 'Test Track',
          artist_name: 'Test Artist',
          timestamp_ms: 0,
          event_type: 'section_change',
          section_type: 'intro',
          section_number: 1,
          energy_level: 50,
          intensity_level: 50,
          notes: 'Test entry to verify table exists',
          captured_by: 'table_creation_test',
          capture_session_id: crypto.randomUUID()
        }])
        .select();

      if (insertError) {
        console.error('❌ Table creation needed. Error:', insertError.message);
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: false,
            message: 'Table does not exist and needs to be created manually',
            error: insertError.message,
            instructions: 'Please create the streaming_vendor_attributes table using the SQL in database-updates/create-streaming-vendor-attributes-table.sql'
          })
        };
      }

      console.log('✅ Test insert successful, table exists');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'Table exists and is accessible',
          testData: insertData
        })
      };

    } else if (error) {
      console.error('❌ Database error:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Database error',
          details: error.message
        })
      };
    }

    console.log('✅ Table exists and is accessible');
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'streaming_vendor_attributes table exists and is accessible',
        rowCount: data?.length || 0
      })
    };

  } catch (error) {
    console.error('❌ Function error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        details: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
};