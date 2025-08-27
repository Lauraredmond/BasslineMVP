// Add Section Columns to Common Streaming Vendor Analysis Logs Table
// Based on the current schema from your Downloads CSV export

import { supabase } from './supabase';

export async function addSectionColumnsToVendorTable() {
  console.log('🗄️ Adding section columns to common_streaming_vendor_analysis_logs table...');

  try {
    // Add multiple section-related columns to make analysis easier
    const addColumnsSQL = `
      -- Add section indicator column (human-readable)
      ALTER TABLE common_streaming_vendor_analysis_logs 
      ADD COLUMN IF NOT EXISTS section_indicator TEXT;
      
      -- Add section index for easier querying/sorting
      ALTER TABLE common_streaming_vendor_analysis_logs 
      ADD COLUMN IF NOT EXISTS section_index INTEGER;
      
      -- Add section type (intro, verse, chorus, bridge, outro)
      ALTER TABLE common_streaming_vendor_analysis_logs 
      ADD COLUMN IF NOT EXISTS section_type TEXT;
      
      -- Add section narrative (workout instruction for this section)
      ALTER TABLE common_streaming_vendor_analysis_logs 
      ADD COLUMN IF NOT EXISTS section_narrative TEXT;
      
      -- Add comments explaining the new columns
      COMMENT ON COLUMN common_streaming_vendor_analysis_logs.section_indicator 
      IS 'Human-readable section identifier (e.g., "Section 0: intro (0s-30s)")';
      
      COMMENT ON COLUMN common_streaming_vendor_analysis_logs.section_index 
      IS 'Numeric section index (0, 1, 2, 3...) for sorting and analysis';
      
      COMMENT ON COLUMN common_streaming_vendor_analysis_logs.section_type 
      IS 'Section type (intro, verse, chorus, bridge, outro, unknown)';
      
      COMMENT ON COLUMN common_streaming_vendor_analysis_logs.section_narrative 
      IS 'Workout instruction/narrative for this section';
      
      -- Create indexes for faster section-based queries
      CREATE INDEX IF NOT EXISTS idx_vendor_analysis_section_indicator 
      ON common_streaming_vendor_analysis_logs(section_indicator);
      
      CREATE INDEX IF NOT EXISTS idx_vendor_analysis_section_index 
      ON common_streaming_vendor_analysis_logs(section_index);
      
      CREATE INDEX IF NOT EXISTS idx_vendor_analysis_section_type 
      ON common_streaming_vendor_analysis_logs(section_type);
      
      -- Create composite index for track + section queries
      CREATE INDEX IF NOT EXISTS idx_vendor_analysis_track_section 
      ON common_streaming_vendor_analysis_logs(track_name, section_index);
    `;

    const { error: addError } = await supabase.rpc('exec_sql', { sql: addColumnsSQL });

    if (addError) {
      console.error('❌ Failed to add section columns:', addError);
      return { success: false, error: addError };
    }

    console.log('✅ Section columns added successfully!');

    // Update existing records to populate section info from current_section_* columns
    const updateExistingSQL = `
      -- Update existing records to populate section info
      UPDATE common_streaming_vendor_analysis_logs 
      SET 
        section_index = CASE 
          WHEN current_section_start IS NOT NULL THEN 
            COALESCE(ROUND(current_section_start/30), 0)::INTEGER
          ELSE NULL
        END,
        section_type = CASE 
          WHEN current_section_start IS NOT NULL THEN 
            CASE 
              WHEN current_section_start < 15 THEN 'intro'
              WHEN current_section_start > (
                SELECT MAX(current_section_start + current_section_duration) * 0.85 
                FROM common_streaming_vendor_analysis_logs t2 
                WHERE t2.track_name = common_streaming_vendor_analysis_logs.track_name
              ) THEN 'outro'
              WHEN current_section_loudness > -5 THEN 'chorus'
              WHEN current_section_tempo < 100 THEN 'bridge'
              ELSE 'verse'
            END
          ELSE 'unknown'
        END,
        section_indicator = CASE 
          WHEN current_section_start IS NOT NULL THEN 
            'Section ' || COALESCE(ROUND(current_section_start/30), 0) || ': ' ||
            CASE 
              WHEN current_section_start < 15 THEN 'intro'
              WHEN current_section_start > (
                SELECT MAX(current_section_start + current_section_duration) * 0.85 
                FROM common_streaming_vendor_analysis_logs t2 
                WHERE t2.track_name = common_streaming_vendor_analysis_logs.track_name
              ) THEN 'outro'
              WHEN current_section_loudness > -5 THEN 'chorus'
              WHEN current_section_tempo < 100 THEN 'bridge'
              ELSE 'verse'
            END ||
            ' (' || COALESCE(current_section_start, 0) || 's-' || 
            COALESCE(current_section_start + current_section_duration, 30) || 's)'
          ELSE 'Legacy Entry (no section data)'
        END,
        section_narrative = CASE 
          WHEN current_section_start IS NOT NULL THEN 
            CASE 
              WHEN current_section_start < 15 THEN 'Warming up - let your body ease into the rhythm'
              WHEN current_section_loudness > -5 THEN 'Sprint time! High energy section - push your limits'
              WHEN current_section_tempo < 100 THEN 'Recovery section - controlled breathing and steady pace'
              ELSE 'Steady climb - find your sustainable power'
            END
          ELSE 'Continue your workout'
        END
      WHERE (section_indicator IS NULL OR section_index IS NULL OR section_type IS NULL);
    `;

    const { error: updateError } = await supabase.rpc('exec_sql', { sql: updateExistingSQL });

    if (updateError) {
      console.warn('⚠️ Failed to update existing records (this is OK for new tables):', updateError);
    } else {
      console.log('✅ Updated existing records with section information');
    }

    // Verify the columns were added by checking table structure
    const verifySQL = `
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'common_streaming_vendor_analysis_logs' 
      AND column_name IN ('section_indicator', 'section_index', 'section_type', 'section_narrative')
      ORDER BY column_name;
    `;

    const { data: columnData, error: verifyError } = await supabase.rpc('exec_sql', { sql: verifySQL });

    if (verifyError) {
      console.warn('⚠️ Failed to verify columns (but they may still have been added):', verifyError);
    } else {
      console.log('✅ Column verification:', columnData);
    }

    // Test by counting records with section info
    const { data: countData, error: countError } = await supabase
      .from('common_streaming_vendor_analysis_logs')
      .select('id, section_indicator, section_type')
      .not('section_indicator', 'is', null)
      .limit(5);

    if (countError) {
      console.warn('⚠️ Could not test section data:', countError);
    } else {
      console.log('✅ Sample records with section info:', countData?.length || 0);
      if (countData && countData.length > 0) {
        console.log('Sample data:', countData);
      }
    }

    return { 
      success: true, 
      message: 'Section columns added successfully to vendor table',
      columnsAdded: ['section_indicator', 'section_index', 'section_type', 'section_narrative'],
      recordsWithSectionInfo: countData?.length || 0
    };

  } catch (error) {
    console.error('💥 Section columns migration failed:', error);
    return { success: false, error };
  }
}

// Function to check if section columns already exist
export async function checkSectionColumnsExist() {
  try {
    const checkSQL = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'common_streaming_vendor_analysis_logs' 
      AND column_name IN ('section_indicator', 'section_index', 'section_type', 'section_narrative')
      ORDER BY column_name;
    `;

    const { data, error } = await supabase.rpc('exec_sql', { sql: checkSQL });

    if (error) {
      console.error('❌ Failed to check section columns:', error);
      return { exists: false, error };
    }

    const existingColumns = data || [];
    const requiredColumns = ['section_indicator', 'section_index', 'section_type', 'section_narrative'];
    const allExist = requiredColumns.every(col => 
      existingColumns.some(existing => existing.column_name === col)
    );
    
    console.log(allExist ? '✅ All section columns exist' : '⚠️ Some section columns missing');
    console.log('Existing columns:', existingColumns.map(c => c.column_name));
    
    return { 
      exists: allExist, 
      existingColumns: existingColumns.map(c => c.column_name),
      missingColumns: requiredColumns.filter(col => 
        !existingColumns.some(existing => existing.column_name === col)
      )
    };

  } catch (error) {
    console.error('💥 Section columns check failed:', error);
    return { exists: false, error };
  }
}

// Function to get sample section data from the table
export async function getSampleSectionData() {
  try {
    const { data, error } = await supabase
      .from('common_streaming_vendor_analysis_logs')
      .select(`
        track_name, 
        artist_name, 
        section_indicator, 
        section_type, 
        section_index,
        current_section_tempo,
        current_section_loudness,
        timestamp
      `)
      .not('section_indicator', 'is', null)
      .order('track_name, section_index')
      .limit(10);

    if (error) {
      console.error('❌ Failed to get sample data:', error);
      return { success: false, error };
    }

    return { success: true, data: data || [] };

  } catch (error) {
    console.error('💥 Failed to get sample section data:', error);
    return { success: false, error };
  }
}