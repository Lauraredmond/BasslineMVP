# Phase Resolver Test Specifications

## Test Cases for Phase Resolution System

### BPM to Phase Mapping Tests

1. **148 BPM → Sprint (140–160)**
   ```typescript
   expect(await resolvePhaseForTrack({ trackId: 'test', vendor: 'spotify' }))
     .toHaveProperty('phase_code', 'sprint_intervals');
   ```

2. **Overlap Resolution → Narrowest Range Wins**
   - Setup: 95 BPM fits both hills (95-119) and resistance (85-94)
   - Expected: hills (narrower range: 24 vs 9)

3. **Boundary Checks**
   - `bpm_min <= bpm`: 140 BPM matches sprint_intervals (140-200) ✓
   - `bmp < bpm_max`: 160 BPM does NOT match sprint_intervals (160 is exclusive upper bound) ✗

4. **Invalid/NULL BPM → RECOVERY**
   ```typescript
   expect(await resolvePhaseForTrack({ trackId: 'invalid', vendor: 'spotify' }))
     .toHaveProperty('phase_code', 'recovery');
   ```

### Section vs Track BPM Priority Tests

5. **Section BPM Overrides Track BPM**
   ```typescript
   // Given: track has 120 BPM, but section at 2000ms has 150 BPM
   expect(await resolvePhaseForTrack({ 
     trackId: 'test', vendor: 'spotify', positionMs: 2000 
   })).toHaveProperty('bpmSource', 'section');
   ```

6. **Position-based Section Selection**
   - positionMs: 1500, sections: [0-1000ms, 1000-2000ms, 2000-3000ms]
   - Expected: Use section 1000-2000ms BPM

### Tempo Quality Validation Tests

7. **Low-confidence Tempo Triggers Vendor API Verification**
   ```typescript
   // Mock Spotify API call when confidence < 0.5
   expect(spotifyService.getAudioFeatures).toHaveBeenCalledWith(['track_id']);
   ```

8. **Suspicious "Defaulty" Tempos**
   - 120 BPM (common default) → confidence reduced to 0.7
   - 128 BPM (common default) → confidence reduced to 0.7

9. **Implausible Range Rejection**
   - 30 BPM → rejected (< 40 threshold)
   - 250 BPM → rejected (> 220 threshold)

### Tie-breaking Tests

10. **Order Index Tie-breaking**
    - Setup: Two phases with identical ranges (shouldn't happen in real data)
    - Expected: Lower order_index wins

11. **Empty Narratives → Return Empty Array**
    ```typescript
    expect(await getInstructionNarratives('nonexistent_phase'))
      .toEqual([]);
    ```

### Database Integration Tests

12. **Database Update After Verification**
    ```typescript
    // After successful vendor API verification
    expect(supabase.from).toHaveBeenCalledWith('streaming_vendor_attributes');
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
      tempo_source: 'spotify_api',
      tempo_confidence: 0.9,
      tempo_last_verified_at: expect.any(String)
    }));
    ```

### Error Handling Tests

13. **Database Connection Failure → Safe Fallback**
    ```typescript
    // Mock database error
    expect(result).toHaveProperty('phase_code', 'recovery');
    expect(result).toHaveProperty('reason', expect.stringContaining('Error'));
    ```

14. **Spotify API Rate Limit → Graceful Degradation**
    ```typescript
    // Mock 429 response
    expect(result.bmpSource).toBe('track'); // Falls back to track-level
    ```

## Mock Data Setup

```typescript
// streaming_vendor_attributes test data
const mockSVAData = [
  {
    track_id: 'test_track_1',
    vendor: 'spotify',
    spotify_tempo: 148,
    tempo_confidence: 0.9,
    tempo_source: 'spotify_api',
    section_start_ms: null,
    section_end_ms: null
  },
  {
    track_id: 'test_track_1', 
    vendor: 'spotify',
    spotify_tempo: 160,
    tempo_confidence: 0.8,
    tempo_source: 'computed',
    section_start_ms: 2000,
    section_end_ms: 4000,
    section_type: 'chorus'
  }
];

// workout_phases test data
const mockPhaseData = [
  { workout_track: 'sprint_intervals', target_tempo_min: 140, target_tempo_max: 200 },
  { workout_track: 'hills', target_tempo_min: 95, target_tempo_max: 119 },
  { workout_track: 'resistance', target_tempo_min: 85, target_tempo_max: 94 }
];
```

## Performance Tests

15. **Section Query Performance**
    - Verify correct index usage: `idx_streaming_vendor_sections`
    - Test with large timestamp ranges

16. **Cache Effectiveness**
    - Second call with same trackId should use cached result
    - Cache TTL respected

## Integration Test Scenarios

17. **End-to-End: "The Pretender" at 173 BPM**
    ```typescript
    expect(await resolvePhaseForTrack({ 
      trackId: '4AjcwfgGFZxUMbEjb4saNV', vendor: 'spotify' 
    })).toEqual({
      bpm: 173,
      bmpSource: 'track',
      phase_code: 'sprint_intervals',
      phase_name: 'Sprint Intervals',
      reason: 'track tempo 173 (verified) → Sprint Intervals 140–200'
    });
    ```

## To Run Tests (when Vitest is added):

```bash
# Install Vitest
npm install -D vitest @vitest/ui jsdom

# Add to package.json scripts:
"test": "vitest",
"test:ui": "vitest --ui"

# Run tests
npm test
```