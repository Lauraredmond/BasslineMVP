// Secure Database Service - Client-side interface to server-side database operations
// All database operations happen server-side with proper column validation

export interface DatabaseColumns {
  name: string;
  type: string;
  nullable: boolean;
}

export interface SessionData {
  sessionName?: string;
  workoutType?: string;
}

export interface AnalysisLogData {
  session_id: string;
  vendor_source: string;
  track_name: string;
  artist_name: string;
  
  // RapidAPI/Soundnet data (properly mapped)
  soundnet_tempo?: string;
  soundnet_key?: string;
  soundnet_mode?: string;
  soundnet_camelot?: string;
  soundnet_energy?: number;
  soundnet_danceability?: number;
  soundnet_happiness?: number;
  soundnet_popularity?: number;
  soundnet_acousticness?: number;
  soundnet_instrumentalness?: number;
  soundnet_liveness?: number;
  soundnet_speechiness?: number;
  soundnet_loudness?: string;
  soundnet_duration?: string;
  
  // Playback context
  playback_position_ms?: number;
  is_playing?: boolean;
  
  // Data source tracking
  data_source?: string;
  from_cache?: boolean;
  fallback_type?: string;
  
  // Any other fields will be filtered server-side
  [key: string]: any;
}

class SecureDatabaseService {
  private validColumns: string[] | null = null;
  
  private async callSecureFunction(action: string, data?: any) {
    try {
      const response = await fetch('/.netlify/functions/secure-database-logger', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action, data })
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.details || result.error || 'Database operation failed');
      }
      
      return result;
    } catch (error) {
      console.error('Secure database function call failed:', error);
      throw error;
    }
  }

  async introspectTable(): Promise<DatabaseColumns[]> {
    console.log('🔍 Introspecting database table schema...');
    
    const result = await this.callSecureFunction('introspect_table');
    this.validColumns = result.columnNames;
    
    console.log('✅ Table introspection complete:', {
      totalColumns: result.columns.length,
      columnNames: result.columnNames.slice(0, 10) // Show first 10
    });
    
    return result.columns;
  }

  async createSession(sessionData: SessionData): Promise<string> {
    console.log('🆕 Creating database session...');
    
    const result = await this.callSecureFunction('create_session', sessionData);
    
    console.log('✅ Session created:', result.sessionId);
    return result.sessionId;
  }

  async logAnalysis(logData: AnalysisLogData): Promise<string> {
    console.log('📊 Logging analysis data server-side...');
    console.log('📝 Original payload keys:', Object.keys(logData).length);
    
    // Map RapidAPI data to correct Soundnet columns
    const mappedData = this.mapRapidApiToColumns(logData);
    
    const result = await this.callSecureFunction('log_analysis', mappedData);
    
    console.log('✅ Analysis logged successfully:', {
      logId: result.logId,
      originalFields: result.originalFields,
      filteredFields: result.filteredFields
    });
    
    return result.logId;
  }

  private mapRapidApiToColumns(data: AnalysisLogData): AnalysisLogData {
    console.log('🔀 Mapping RapidAPI data to database columns...');
    
    const mapped = { ...data };
    
    // If we have rapidSoundnetData, extract and map it properly
    if (data.rapidSoundnetData) {
      const rapid = data.rapidSoundnetData as any;
      
      // Map RapidAPI fields to correct database columns (rs_* prefix)
      if (rapid.tempo) mapped.rs_tempo = String(rapid.tempo);
      if (rapid.key) mapped.rs_key = String(rapid.key);
      if (rapid.mode) mapped.rs_mode = String(rapid.mode);
      if (rapid.camelot) mapped.rs_camelot = String(rapid.camelot);
      if (rapid.energy !== undefined) mapped.rs_energy_raw = Number(rapid.energy);
      if (rapid.danceability !== undefined) mapped.rs_danceability_raw = Number(rapid.danceability);
      if (rapid.happiness !== undefined) mapped.rs_happiness = Number(rapid.happiness);
      if (rapid.popularity !== undefined) mapped.rs_popularity = Number(rapid.popularity);
      if (rapid.acousticness !== undefined) mapped.rs_acousticness_raw = Number(rapid.acousticness);
      if (rapid.instrumentalness !== undefined) mapped.rs_instrumentalness_raw = Number(rapid.instrumentalness);
      if (rapid.liveness !== undefined) mapped.rs_liveness_raw = Number(rapid.liveness);
      if (rapid.speechiness !== undefined) mapped.rs_speechiness_raw = Number(rapid.speechiness);
      if (rapid.loudness) mapped.rs_loudness = String(rapid.loudness);
      if (rapid.duration) mapped.rs_duration = String(rapid.duration);
      
      // Remove the raw rapidSoundnetData object
      delete mapped.rapidSoundnetData;
      
      console.log('✅ RapidAPI data mapped to database columns:', {
        rs_tempo: mapped.rs_tempo,
        rs_key: mapped.rs_key,
        rs_energy_raw: mapped.rs_energy_raw,
        rs_camelot: mapped.rs_camelot
      });
    }
    
    // Ensure required fields
    mapped.vendor_source = mapped.vendor_source || 'RapidAPI';
    mapped.data_source = mapped.data_source || 'rapidapi';
    mapped.timestamp = new Date().toISOString();
    
    return mapped;
  }

  getValidColumns(): string[] | null {
    return this.validColumns;
  }
}

export const secureDatabaseService = new SecureDatabaseService();