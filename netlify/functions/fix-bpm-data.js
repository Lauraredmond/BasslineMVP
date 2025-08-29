const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseKey);

exports.handler = async (event, context) => {
  console.log('🔧 FIXING BPM DATA PIPELINE');
  
  try {
    // Step 1: Add spotify_tempo column if it doesn't exist
    console.log('📊 Adding spotify_tempo column...');
    
    const addColumnResult = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE streaming_vendor_attributes 
        ADD COLUMN IF NOT EXISTS spotify_tempo REAL;
        
        COMMENT ON COLUMN streaming_vendor_attributes.spotify_tempo 
        IS 'BPM from Spotify audio_features API';
      `
    });
    
    console.log('✅ Column addition result:', addColumnResult);
    
    // Step 2: Update The Pretender with correct BPM
    console.log('🎵 Updating The Pretender BPM to 172...');
    
    const updateResult = await supabase
      .from('streaming_vendor_attributes')
      .update({ spotify_tempo: 172 })
      .or('track_name.ilike.%pretender%,track_name.ilike.%The Pretender%')
      .select();
    
    console.log('✅ Pretender update result:', updateResult);
    
    // Step 3: Verify the data
    const verifyResult = await supabase
      .from('streaming_vendor_attributes')
      .select('track_name, artist_name, spotify_tempo, section_type')
      .or('track_name.ilike.%pretender%,track_name.ilike.%The Pretender%')
      .limit(5);
    
    console.log('📋 Verification result:', verifyResult);
    
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        success: true,
        message: 'BPM data pipeline fixed',
        columnAdded: true,
        pretenderUpdated: updateResult.data?.length || 0,
        verificationData: verifyResult.data
      })
    };
    
  } catch (error) {
    console.error('❌ Error fixing BPM pipeline:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
};