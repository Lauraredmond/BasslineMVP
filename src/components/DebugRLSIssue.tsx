import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';

/**
 * Component to debug RLS policy violations for Death in Vegas track
 */
export const DebugRLSIssue: React.FC = () => {
  const [readResult, setReadResult] = useState<string>('');
  const [insertResult, setInsertResult] = useState<string>('');
  const [updateResult, setUpdateResult] = useState<string>('');

  const testRead = async () => {
    setReadResult('Testing read access...');
    
    try {
      const { data, error } = await supabase
        .from('streaming_vendor_attributes')
        .select('track_name, artist_name, spotify_tempo')
        .eq('track_name', 'Death in Vegas')
        .limit(1);
        
      if (error) {
        setReadResult(`❌ Read failed: ${error.code} - ${error.message}`);
      } else {
        setReadResult(`✅ Read success: Found ${data?.length || 0} records. Data: ${JSON.stringify(data)}`);
      }
    } catch (err) {
      setReadResult(`❌ Read error: ${err}`);
    }
  };

  const testInsert = async () => {
    setInsertResult('Testing insert access...');
    
    try {
      // Try to insert a test record
      const { data, error } = await supabase
        .from('streaming_vendor_attributes')
        .insert([{
          track_name: 'Test Track RLS',
          artist_name: 'Test Artist RLS', 
          spotify_tempo: 120,
          timestamp_ms: 0,
          event_type: 'section_change',
          section_type: 'intro',
          section_number: 1,
          energy_level: 50,
          intensity_level: 50,
          data_source: 'rls_test',
          captured_by: 'rls_debug'
        }])
        .select();
        
      if (error) {
        setInsertResult(`❌ Insert failed: ${error.code} - ${error.message}`);
      } else {
        setInsertResult(`✅ Insert success: ${JSON.stringify(data)}`);
        
        // Clean up test record
        await supabase
          .from('streaming_vendor_attributes')
          .delete()
          .eq('track_name', 'Test Track RLS');
      }
    } catch (err) {
      setInsertResult(`❌ Insert error: ${err}`);
    }
  };

  const testUpdate = async () => {
    setUpdateResult('Testing update access...');
    
    try {
      const { data, error } = await supabase
        .from('streaming_vendor_attributes')
        .update({ spotify_tempo: 58 })
        .eq('track_name', 'Death in Vegas')
        .eq('artist_name', 'Dirge');
        
      if (error) {
        setUpdateResult(`❌ Update failed: ${error.code} - ${error.message}`);
      } else {
        setUpdateResult(`✅ Update success: ${JSON.stringify(data)}`);
      }
    } catch (err) {
      setUpdateResult(`❌ Update error: ${err}`);
    }
  };

  return (
    <div className="p-4 bg-yellow-100 border border-yellow-300 rounded">
      <h3 className="font-bold text-yellow-800 mb-2">🔍 Debug RLS Issue for Death in Vegas</h3>
      
      <div className="grid grid-cols-1 gap-3">
        <div>
          <button onClick={testRead} className="bg-blue-600 text-white px-3 py-1 rounded text-sm">
            Test Read
          </button>
          <div className="mt-2 text-xs">{readResult}</div>
        </div>
        
        <div>
          <button onClick={testInsert} className="bg-green-600 text-white px-3 py-1 rounded text-sm">
            Test Insert
          </button>
          <div className="mt-2 text-xs">{insertResult}</div>
        </div>
        
        <div>
          <button onClick={testUpdate} className="bg-orange-600 text-white px-3 py-1 rounded text-sm">
            Test Update
          </button>
          <div className="mt-2 text-xs">{updateResult}</div>
        </div>
      </div>
      
      <div className="mt-3 p-2 bg-gray-100 rounded text-xs">
        <strong>Expected behavior:</strong> Read should work, Insert/Update might fail due to missing RLS policies
      </div>
    </div>
  );
};