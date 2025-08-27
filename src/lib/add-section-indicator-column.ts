// Database Migration: Add Section Indicator Column
// Adds a section_indicator column to make sectional analysis data easier to analyze

import { supabase } from './supabase';

export async function addSectionIndicatorColumn() {
  console.log('🗄️ Adding section_indicator column to common_streaming_vendor_analysis_logs...');

  try {
    // Add the section_indicator column
    const addColumnSQL = `
      -- Add section indicator column after fitness context fields
      ALTER TABLE common_streaming_vendor_analysis_logs 
      ADD COLUMN IF NOT EXISTS section_indicator TEXT;
      
      -- Add a comment explaining the column
      COMMENT ON COLUMN common_streaming_vendor_analysis_logs.section_indicator 
      IS 'Human-readable section identifier (e.g., "Section 0: intro (0s-30s)", "Section 1: verse (30s-75s)")';
      
      -- Create index for faster section-based queries
      CREATE INDEX IF NOT EXISTS idx_vendor_analysis_section_indicator 
      ON common_streaming_vendor_analysis_logs(section_indicator);
    `;

    const { error: addError } = await supabase.rpc('exec_sql', { sql: addColumnSQL });

    if (addError) {
      console.error('❌ Failed to add section_indicator column:', addError);
      return { success: false, error: addError };
    }

    console.log('✅ Section indicator column added successfully!');

    // Test the column by updating existing records (if any)
    const updateExistingSQL = `
      -- Update existing records without section indicators
      -- This creates a default indicator for legacy data
      UPDATE common_streaming_vendor_analysis_logs 
      SET section_indicator = CASE 
        WHEN current_section_start IS NOT NULL THEN 
          'Section ' || COALESCE(ROUND(current_section_start/30), 0) || ': unknown (' || 
          COALESCE(current_section_start, 0) || 's-' || 
          COALESCE(current_section_start + current_section_duration, 30) || 's)'
        ELSE 
          'Legacy Entry (no section data)'
      END
      WHERE section_indicator IS NULL;
    `;

    const { error: updateError } = await supabase.rpc('exec_sql', { sql: updateExistingSQL });

    if (updateError) {
      console.warn('⚠️ Failed to update existing records (this is OK for new tables):', updateError);
    } else {
      console.log('✅ Updated existing records with default section indicators');
    }

    // Verify the column was added
    const { data: testData, error: testError } = await supabase
      .from('common_streaming_vendor_analysis_logs')
      .select('id, section_indicator')
      .limit(1);

    if (testError) {
      console.error('❌ Failed to verify column addition:', testError);
      return { success: false, error: testError };
    }

    console.log('✅ Column verification successful');
    
    return { 
      success: true, 
      message: 'Section indicator column added successfully',
      existingRecords: testData?.length || 0
    };

  } catch (error) {
    console.error('💥 Migration failed:', error);
    return { success: false, error };
  }
}

// Function to check if column already exists
export async function checkSectionIndicatorColumn() {
  try {
    const checkSQL = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'common_streaming_vendor_analysis_logs' 
      AND column_name = 'section_indicator';
    `;

    const { data, error } = await supabase.rpc('exec_sql', { sql: checkSQL });

    if (error) {
      console.error('❌ Failed to check column existence:', error);
      return { exists: false, error };
    }

    const exists = data && data.length > 0;
    console.log(exists ? '✅ Section indicator column already exists' : '⚠️ Section indicator column does not exist');
    
    return { exists, data };

  } catch (error) {
    console.error('💥 Column check failed:', error);
    return { exists: false, error };
  }
}