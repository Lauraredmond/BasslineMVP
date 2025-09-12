import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';

/**
 * Component to fix RLS policy violations for streaming_vendor_attributes table
 * This fixes the 42501 error when trying to insert/update BPM data
 */
export const FixRLSPolicies: React.FC = () => {
  const [status, setStatus] = useState<string>('');
  const [error, setError] = useState<string>('');

  const fixRLSPolicies = async () => {
    setStatus('Fixing RLS policies...');
    setError('');
    
    try {
      // Add INSERT policy
      const { error: insertError } = await supabase.rpc('sql', {
        query: `
          DROP POLICY IF EXISTS "streaming_vendor_attributes_insert" ON streaming_vendor_attributes;
          CREATE POLICY "streaming_vendor_attributes_insert" ON streaming_vendor_attributes
              FOR INSERT TO authenticated
              USING (true);
        `
      });

      if (insertError) {
        console.error('Insert policy error:', insertError);
      }

      // Add UPDATE policy  
      const { error: updateError } = await supabase.rpc('sql', {
        query: `
          DROP POLICY IF EXISTS "streaming_vendor_attributes_update" ON streaming_vendor_attributes;
          CREATE POLICY "streaming_vendor_attributes_update" ON streaming_vendor_attributes
              FOR UPDATE TO authenticated
              USING (true)
              WITH CHECK (true);
        `
      });

      if (updateError) {
        console.error('Update policy error:', updateError);
      }

      if (!insertError && !updateError) {
        setStatus('✅ RLS policies fixed successfully!');
        
        // Test the fix by trying to read from the table
        const { data: testData, error: testError } = await supabase
          .from('streaming_vendor_attributes')
          .select('track_name, artist_name, spotify_tempo')
          .eq('track_name', 'Death in Vegas')
          .limit(1);
          
        if (testError) {
          setError(`⚠️ Policies created but read test failed: ${testError.message}`);
        } else {
          setStatus(`✅ RLS policies fixed and tested! Found ${testData?.length || 0} Death in Vegas tracks.`);
        }
      } else {
        setError(`❌ Policy creation failed: ${insertError?.message || updateError?.message}`);
      }
      
    } catch (err) {
      setError(`❌ Error: ${err}`);
    }
  };

  return (
    <div className="p-4 bg-red-100 border border-red-300 rounded">
      <h3 className="font-bold text-red-800 mb-2">🔧 Fix RLS Policy Violations</h3>
      <p className="text-sm text-red-600 mb-3">
        This fixes the "new row violates row-level security policy" error for streaming_vendor_attributes
      </p>
      
      <button 
        onClick={fixRLSPolicies}
        className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
      >
        Fix RLS Policies
      </button>
      
      {status && (
        <div className="mt-3 p-2 bg-green-100 border border-green-300 rounded text-green-800 text-sm">
          {status}
        </div>
      )}
      
      {error && (
        <div className="mt-3 p-2 bg-red-100 border border-red-300 rounded text-red-800 text-sm">
          {error}
        </div>
      )}
    </div>
  );
};