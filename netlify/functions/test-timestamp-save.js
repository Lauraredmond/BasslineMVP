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
    console.log('🧪 Testing audio timestamp save functionality...');

    // Test data similar to what the frontend would send
    const testData = {
      trackName: 'The Pretender',
      artistName: 'Foo Fighters',
      sessionId: crypto.randomUUID(),
      events: [
        {
          timestamp_ms: 0,
          event_type: 'section_change',
          section_type: 'intro',
          section_number: 1,
          energy_level: 30,
          intensity_level: 40,
          notes: 'Test intro section',
          captured_by: 'test_function',
          capture_session_id: crypto.randomUUID()
        },
        {
          timestamp_ms: 25000,
          event_type: 'section_change',
          section_type: 'verse',
          section_number: 1,
          energy_level: 65,
          intensity_level: 70,
          notes: 'Test verse section',
          captured_by: 'test_function',
          capture_session_id: crypto.randomUUID()
        }
      ]
    };

    console.log('📊 Test data prepared:', JSON.stringify(testData, null, 2));

    // First check if table exists
    const { data: existingData, error: selectError } = await supabase
      .from('streaming_vendor_attributes')
      .select('*')
      .limit(1);

    if (selectError && selectError.code === 'PGRST116') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Table does not exist',
          message: 'streaming_vendor_attributes table needs to be created first',
          instructions: 'Run the SQL from database-updates/create-streaming-vendor-attributes-table.sql'
        })
      };
    }

    console.log('✅ Table exists, proceeding with test insert...');

    // Prepare records for insertion
    const records = testData.events.map(event => ({
      track_name: testData.trackName,
      artist_name: testData.artistName,
      timestamp_ms: event.timestamp_ms,
      event_type: event.event_type,
      section_type: event.section_type || null,
      section_number: event.section_number || null,
      energy_level: event.energy_level || null,
      intensity_level: event.intensity_level || null,
      notes: event.notes || null,
      data_source: 'test_function',
      capture_session_id: testData.sessionId,
      captured_by: 'test_function',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    console.log('💾 Inserting test records:', records.length);

    // Insert test records
    const { data, error } = await supabase
      .from('streaming_vendor_attributes')
      .insert(records)
      .select();

    if (error) {
      console.error('❌ Insert error:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Database insert failed',
          details: error.message,
          records: records
        })
      };
    }

    console.log('✅ Test records inserted successfully:', data?.length || 0);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Test timestamp save successful',
        recordsInserted: data?.length || records.length,
        testSessionId: testData.sessionId,
        data: data
      })
    };

  } catch (error) {
    console.error('❌ Test function error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Test function failed',
        details: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
};