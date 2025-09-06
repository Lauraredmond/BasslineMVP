# Playlist Phase Mapper Test Specifications

## Test Cases for Track-Level BPM → Workout Phases Mapping

### Core Functionality Tests

1. **Track-Level BPM Mapping**
   ```typescript
   // Test: Maps known BPMs to correct phases
   const testTrack173 = { id: 'test_173', name: 'High Energy Track', bpm: 173 };
   expect(await mapTrackToPhase(testTrack173, workoutPhases))
     .toMatchObject({
       phase_code: 'sprint_intervals',
       bpm: 173,
       validBpm: true
     });
   ```

2. **Boundary Condition Tests**
   ```typescript
   // Test: bmp_min <= BPM < bmp_max (exclusive upper bound)
   const testTrack140 = { bpm: 140 }; // Should match sprint_intervals (140-200)
   const testTrack200 = { bpm: 200 }; // Should NOT match sprint_intervals (exclusive)
   
   expect(mapTrackToPhase(testTrack140)).phase_code).toBe('sprint_intervals');
   expect(mapTrackToPhase(testTrack200)).phase_code).toBe('out_of_range');
   ```

3. **Input Validation Tests**
   ```typescript
   // Test: BPM <40 or >220 marked as invalid
   const testTrackLow = { bpm: 30 };
   const testTrackHigh = { bmp: 250 };
   
   expect(mapTrackToPhase(testTrackLow)).validBmp).toBe(false);
   expect(mapTrackToPhase(testTrackHigh)).validBmp).toBe(false);
   expect(mapTrackToPhase(testTrackLow)).reason).toContain('outside 40-220');
   ```

### Playlist Mapping Integration Tests

4. **Full Playlist Processing**
   ```typescript
   // Test: Complete playlist mapping workflow
   const testPlaylist = ['track1', 'track2', 'track3'];
   const result = await mapPlaylistToPhases({
     trackIds: testPlaylist,
     userId: 'test_user'
   });
   
   expect(result.totalTracks).toBe(3);
   expect(result.mappings).toHaveLength(3);
   expect(result.sessionId).toBeDefined();
   ```

5. **Session Locking Persistence**
   ```typescript
   // Test: Locked mappings remain constant during playback
   const sessionId = 'test_session_123';
   const trackId = 'track_abc';
   
   const initialMapping = await getLockedPhaseForTrack(trackId, sessionId);
   // ... simulate time passing or track changes ...
   const laterMapping = await getLockedPhaseForTrack(trackId, sessionId);
   
   expect(initialMapping).toEqual(laterMapping);
   expect(initialMapping.reason).toContain('Locked:');
   ```

### Section vs Track BPM Priority Tests

6. **Section BPM Ignored (Per Requirements)**
   ```typescript
   // Test: Section BPM data is completely ignored
   const trackData = {
     trackLevel: { bpm: 140, section_type: null },
     sectionLevel: { bpm: 180, section_type: 'chorus' }
   };
   
   // Should use track-level 140 BPM, not section-level 180 BPM
   expect(getTrackBPMFromDatabase(trackData)).toBe(140);
   expect(getTrackBPMFromDatabase(trackData)).not.toBe(180);
   ```

### NULL BPM Backfill Tests

7. **Spotify API Backfill**
   ```typescript
   // Test: NULL BPM triggers Spotify Web API backfill
   const nullBmpTrack = { id: 'no_bpm_track', spotify_tempo: null };
   
   // Mock Spotify API response
   const mockAudioFeatures = { tempo: 128 };
   spotifyService.getAudioFeatures.mockResolvedValue([mockAudioFeatures]);
   
   const result = await backfillTrackBMP(nullBmpTrack.id);
   expect(result.bmp).toBe(128);
   expect(result.source).toBe('spotify_api');
   ```

8. **Database UPSERT After Backfill**
   ```typescript
   // Test: Successful backfill updates database
   await backfillTrackBMP('track_123');
   
   expect(supabase.from).toHaveBeenCalledWith('streaming_vendor_attributes');
   expect(mockUpsert).toHaveBeenCalledWith(expect.objectContaining({
     track_id: 'track_123',
     spotify_tempo: expect.any(Number),
     tempo_source: 'spotify_api',
     tempo_confidence: 0.9
   }));
   ```

### Workout Phase Range Tests

9. **Correct Phase Assignment**
   ```typescript
   const testCases = [
     { bpm: 65, expected: 'cooldown' },    // 60-69
     { bpm: 75, expected: 'warmup' },      // 70-79  
     { bpm: 85, expected: 'climb' },       // 80-94
     { bmp: 105, expected: 'hills' },      // 95-119
     { bpm: 130, expected: 'jumps' },      // 120-139
     { bpm: 150, expected: 'sprint_intervals' }, // 140-200
   ];
   
   testCases.forEach(({ bpm, expected }) => {
     expect(mapBmpToPhase(bpm)).toBe(expected);
   });
   ```

10. **Tie-breaking Rules**
    ```typescript
    // Test: Overlapping ranges → narrowest wins
    // If BPM fits multiple ranges, choose smallest (bmp_max - bmp_min)
    
    const overlappingPhases = [
      { name: 'wide_range', bmp_min: 90, bmp_max: 130 },    // Range: 40
      { name: 'narrow_range', bmp_min: 95, bmp_max: 105 }   // Range: 10
    ];
    
    const result = findBestPhaseMatch(100, overlappingPhases);
    expect(result.name).toBe('narrow_range');
    ```

### Error Handling Tests

11. **Missing Workout Phases**
    ```typescript
    // Test: No phases in database → error
    const emptyPhases = [];
    await expect(mapPlaylistToPhases({ trackIds: ['test'], userId: 'test' }))
      .rejects.toThrow('No workout phases found');
    ```

12. **Spotify API Errors**
    ```typescript
    // Test: Spotify API failure → graceful degradation
    spotifyService.getAudioFeatures.mockRejectedValue(new Error('API Error'));
    
    const result = await backfillTrackBMP('failing_track');
    expect(result).toBeNull();
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('API Error'));
    ```

### Performance Tests

13. **Batch Processing Efficiency**
    ```typescript
    // Test: Large playlists processed efficiently
    const largePlaylist = Array.from({ length: 100 }, (_, i) => `track_${i}`);
    const startTime = performance.now();
    
    await mapPlaylistToPhases({ trackIds: largePlaylist, userId: 'test' });
    
    const duration = performance.now() - startTime;
    expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
    ```

14. **Database Query Optimization**
    ```typescript
    // Test: Efficient database queries (no N+1 problems)
    const trackIds = ['track1', 'track2', 'track3'];
    await mapPlaylistToPhases({ trackIds, userId: 'test' });
    
    // Should batch queries, not make individual calls per track
    expect(mockSupabaseSelect).toHaveBeenCalledTimes(1); // Single batch query
    ```

## Mock Data Setup

```typescript
const mockWorkoutPhases = [
  { workout_track: 'cooldown', target_tempo_min: 60, target_tempo_max: 70 },
  { workout_track: 'warmup', target_tempo_min: 70, target_tempo_max: 80 },
  { workout_track: 'climb', target_tempo_min: 80, target_tempo_max: 95 },
  { workout_track: 'hills', target_tempo_min: 95, target_tempo_max: 120 },
  { workout_track: 'jumps', target_tempo_min: 120, target_tempo_max: 140 },
  { workout_track: 'sprint_intervals', target_tempo_min: 140, target_tempo_max: 200 }
];

const mockTrackData = [
  { 
    track_id: 'track_173', 
    track_name: 'The Pretender', 
    artist_name: 'Foo Fighters',
    spotify_tempo: 173,
    section_type: null  // Track-level record
  }
];
```

## Integration Test Scenarios

15. **End-to-End Playlist Workflow**
    ```typescript
    // Test: Complete user workflow from playlist selection to locked phases
    const playlistTracks = ['track1_140bpm', 'track2_120bpm', 'track3_80bpm'];
    
    // Step 1: User selects playlist
    const mappingResult = await mapPlaylistToPhases({
      trackIds: playlistTracks,
      userId: 'user123'
    });
    
    expect(mappingResult.sessionId).toBeDefined();
    
    // Step 2: During workout, phases are locked
    const lockedPhase = await getLockedPhaseForTrack('track1_140bpm', mappingResult.sessionId);
    expect(lockedPhase.phase_code).toBe('sprint_intervals');
    expect(lockedPhase.reason).toContain('Locked:');
    
    // Step 3: Phases never change during playback
    // ... simulate track playing for 30 seconds ...
    const stillLockedPhase = await getLockedPhaseForTrack('track1_140bmp', mappingResult.sessionId);
    expect(stillLockedPhase).toEqual(lockedPhase);
    ```

## Test Environment Setup

```bash
# Prerequisites
npm install -D vitest @vitest/ui jsdom
npm install -D @types/jest

# Add to package.json
"scripts": {
  "test": "vitest",
  "test:ui": "vitest --ui",
  "test:playlist": "vitest src/lib/playlistPhaseMapper"
}

# Run tests
npm run test:playlist
```

## Expected Results

- ✅ Track-level BPM correctly mapped to workout phases
- ✅ Section-level BPM completely ignored 
- ✅ Phase mappings locked at playlist selection time
- ✅ No dynamic resolution during playback
- ✅ NULL BPM tracks backfilled via Spotify Web API
- ✅ Invalid BPM values (<40 or >220) properly handled
- ✅ No regression to "everything = Resistance"
- ✅ Deterministic and reproducible results