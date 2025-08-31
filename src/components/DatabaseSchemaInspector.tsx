import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

interface TableSchema {
  exists: boolean;
  columns: any[];
  sampleData: any[];
  totalRows: number;
  error?: string;
}

interface SchemaResults {
  streaming_vendor_attributes?: TableSchema;
  instruction_narratives?: TableSchema;
  workout_phases?: TableSchema;
}

export const DatabaseSchemaInspector: React.FC = () => {
  const [results, setResults] = useState<SchemaResults>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const inspectSchema = async () => {
    setLoading(true);
    setError('');
    const newResults: SchemaResults = {};
    
    const targetTables = ['streaming_vendor_attributes', 'instruction_narratives', 'workout_phases'];

    for (const tableName of targetTables) {
      try {
        console.log(`Querying table: ${tableName}`);
        
        // Try to get sample data
        const { data, error: queryError, count } = await supabase
          .from(tableName)
          .select('*', { count: 'exact' })
          .limit(3);

        if (queryError) {
          newResults[tableName as keyof SchemaResults] = {
            exists: false,
            error: queryError.message,
            columns: [],
            sampleData: [],
            totalRows: 0
          };
        } else {
          // Infer column structure from first row
          const columns: any[] = [];
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

          newResults[tableName as keyof SchemaResults] = {
            exists: true,
            totalRows: count || 0,
            columns: columns,
            sampleData: data || []
          };
        }
      } catch (tableError: any) {
        newResults[tableName as keyof SchemaResults] = {
          exists: false,
          error: tableError.message,
          columns: [],
          sampleData: [],
          totalRows: 0
        };
      }
    }

    setResults(newResults);
    setLoading(false);
  };

  const analyzeRelationships = () => {
    if (!results.streaming_vendor_attributes || !results.instruction_narratives || !results.workout_phases) {
      return null;
    }

    const sva = results.streaming_vendor_attributes;
    const in_table = results.instruction_narratives;
    const wp = results.workout_phases;

    return {
      streaming_vendor_attributes: {
        hasTrackFields: sva.columns.some(col => 
          col.column_name.toLowerCase().includes('track_id') ||
          col.column_name.toLowerCase().includes('track_uri') ||
          col.column_name.toLowerCase().includes('spotify')
        ),
        sectionFields: sva.columns
          .filter(col => col.column_name.toLowerCase().includes('section'))
          .map(col => col.column_name),
        uniqueEventTypes: [...new Set(sva.sampleData.map((row: any) => row.event_type))],
        uniqueSectionTypes: [...new Set(sva.sampleData
          .filter((row: any) => row.section_type)
          .map((row: any) => row.section_type))]
      },
      instruction_narratives: {
        workoutTracks: [...new Set(in_table.sampleData.map((row: any) => row.workout_track))],
        songComponents: [...new Set(in_table.sampleData.map((row: any) => row.song_component))],
        totalNarratives: in_table.totalRows
      },
      workout_phases: {
        workoutTracks: [...new Set(wp.sampleData.map((row: any) => row.workout_track))],
        tempoRanges: wp.sampleData.map((row: any) => ({
          workout_track: row.workout_track,
          min_tempo: row.target_tempo_min,
          max_tempo: row.target_tempo_max
        })),
        hasPhaseKey: wp.columns.some(col => col.column_name.toLowerCase().includes('phase_key'))
      }
    };
  };

  const analysis = analyzeRelationships();

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Database Schema Inspector</h2>
        <button 
          onClick={inspectSchema}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Inspecting...' : 'Inspect Schema'}
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          Error: {error}
        </div>
      )}

      {Object.keys(results).length > 0 && (
        <div className="space-y-6">
          {Object.entries(results).map(([tableName, schema]) => (
            <div key={tableName} className="border rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-2">{tableName}</h3>
              
              {schema?.exists ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><strong>Total Rows:</strong> {schema.totalRows}</div>
                    <div><strong>Columns:</strong> {schema.columns.length}</div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">Column Structure:</h4>
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm border border-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 py-2 border-b text-left">Column Name</th>
                            <th className="px-3 py-2 border-b text-left">Data Type</th>
                            <th className="px-3 py-2 border-b text-left">Sample Value</th>
                          </tr>
                        </thead>
                        <tbody>
                          {schema.columns.map((col, idx) => (
                            <tr key={idx} className="border-b">
                              <td className="px-3 py-2 font-mono">{col.column_name}</td>
                              <td className="px-3 py-2">{col.data_type}</td>
                              <td className="px-3 py-2 max-w-xs truncate">
                                {col.sample_value !== null ? String(col.sample_value) : 'NULL'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {schema.sampleData.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Sample Data:</h4>
                      <pre className="text-xs bg-gray-100 p-3 rounded overflow-x-auto">
                        {JSON.stringify(schema.sampleData, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-red-600">
                  Table does not exist or is not accessible
                  {schema?.error && <div className="mt-2 text-sm">Error: {schema.error}</div>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {analysis && (
        <div className="border rounded-lg p-4 bg-blue-50">
          <h3 className="text-lg font-semibold mb-4">Relationship Analysis</h3>
          
          <div className="space-y-4 text-sm">
            <div>
              <h4 className="font-medium">Track ID Fields in streaming_vendor_attributes:</h4>
              <p>{analysis.streaming_vendor_attributes.hasTrackFields ? 'Found track identification fields' : 'No track ID fields found'}</p>
              <p><strong>Section fields:</strong> {analysis.streaming_vendor_attributes.sectionFields.join(', ') || 'None'}</p>
              <p><strong>Event types:</strong> {analysis.streaming_vendor_attributes.uniqueEventTypes.join(', ')}</p>
              <p><strong>Section types:</strong> {analysis.streaming_vendor_attributes.uniqueSectionTypes.join(', ')}</p>
            </div>

            <div>
              <h4 className="font-medium">instruction_narratives mappings:</h4>
              <p><strong>Workout tracks:</strong> {analysis.instruction_narratives.workoutTracks.join(', ')}</p>
              <p><strong>Song components:</strong> {analysis.instruction_narratives.songComponents.join(', ')}</p>
              <p><strong>Total narratives:</strong> {analysis.instruction_narratives.totalNarratives}</p>
            </div>

            <div>
              <h4 className="font-medium">workout_phases structure:</h4>
              <p><strong>Has phase_key field:</strong> {analysis.workout_phases.hasPhaseKey ? 'Yes' : 'No'}</p>
              <p><strong>Workout tracks:</strong> {analysis.workout_phases.workoutTracks.join(', ')}</p>
              <div className="mt-2">
                <strong>Tempo ranges:</strong>
                <ul className="ml-4 list-disc">
                  {analysis.workout_phases.tempoRanges.map((range, idx) => (
                    <li key={idx}>{range.workout_track}: {range.min_tempo}-{range.max_tempo} BPM</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};