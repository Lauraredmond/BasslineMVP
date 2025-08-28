// Local storage solution for audio timestamps while Netlify functions are being debugged
// This allows you to capture timestamp data immediately and export it later

export interface TimestampEvent {
  id: string;
  timestamp: number;
  eventType: 'section_change' | 'custom';
  sectionType?: string;
  sectionNumber?: number;
  energyLevel?: number;
  intensityLevel?: number;
  notes?: string;
}

export interface CaptureSession {
  id: string;
  trackName: string;
  artistName: string;
  startTime: number;
  events: TimestampEvent[];
  createdAt: string;
}

export class LocalTimestampStorage {
  private static readonly STORAGE_KEY = 'bassline_audio_timestamps';

  static saveSession(session: CaptureSession): void {
    try {
      const existingSessions = this.getAllSessions();
      existingSessions.push({
        ...session,
        createdAt: new Date().toISOString()
      });
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(existingSessions));
      console.log('✅ Session saved locally:', session.id);
    } catch (error) {
      console.error('❌ Error saving session locally:', error);
      throw new Error('Failed to save session to local storage');
    }
  }

  static getAllSessions(): CaptureSession[] {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('❌ Error reading sessions from local storage:', error);
      return [];
    }
  }

  static getSessionsByTrack(trackName: string, artistName: string): CaptureSession[] {
    return this.getAllSessions().filter(
      session => session.trackName === trackName && session.artistName === artistName
    );
  }

  static deleteSession(sessionId: string): void {
    try {
      const sessions = this.getAllSessions().filter(session => session.id !== sessionId);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(sessions));
      console.log('🗑️ Session deleted:', sessionId);
    } catch (error) {
      console.error('❌ Error deleting session:', error);
      throw new Error('Failed to delete session');
    }
  }

  static exportToJSON(): string {
    return JSON.stringify(this.getAllSessions(), null, 2);
  }

  static exportToCSV(): string {
    const sessions = this.getAllSessions();
    if (sessions.length === 0) return 'No data to export';

    const csvRows: string[] = [];
    
    // CSV Header
    csvRows.push([
      'session_id',
      'track_name',
      'artist_name',
      'session_created_at',
      'timestamp_ms',
      'event_type',
      'section_type',
      'section_number',
      'energy_level',
      'intensity_level',
      'notes'
    ].join(','));

    // CSV Data
    sessions.forEach(session => {
      session.events.forEach(event => {
        csvRows.push([
          session.id,
          `"${session.trackName}"`,
          `"${session.artistName}"`,
          session.createdAt,
          event.timestamp,
          event.eventType,
          event.sectionType || '',
          event.sectionNumber || '',
          event.energyLevel || '',
          event.intensityLevel || '',
          `"${event.notes || ''}"`
        ].join(','));
      });
    });

    return csvRows.join('\n');
  }

  static clearAllData(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
      console.log('🧹 All timestamp data cleared');
    } catch (error) {
      console.error('❌ Error clearing data:', error);
    }
  }

  static getStorageInfo(): { sessionCount: number; totalEvents: number; storageSize: string } {
    const sessions = this.getAllSessions();
    const totalEvents = sessions.reduce((total, session) => total + session.events.length, 0);
    const storageSize = new Blob([JSON.stringify(sessions)]).size + ' bytes';

    return {
      sessionCount: sessions.length,
      totalEvents,
      storageSize
    };
  }
}