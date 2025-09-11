# Phase Mapping Debug Log

## Current Issue: Incorrect workout_track Selection

**Date:** 2025-09-11  
**Status:** UNRESOLVED - Still needs investigation

### Problem Description
- **Oasis tracks** are showing "Hills" as workout_track instead of correct phase
- **The Dirge tracks** are showing "Hills" as workout_track instead of correct phase
- Expected behavior: BPM from SVA table should map to correct workout_track via workout_phases table

### Expected BPM Values (from SVA table)
- **Oasis:** 100 BPM
- **The Dirge:** 58 BPM

### Issues Fixed in This Session
1. ✅ **Infinite polling loop** - Disabled useWorkoutPhaseTracking causing 1.3M console messages
2. ✅ **406 Range errors** - Fixed .lte() query in streaming_vendor_attributes causing SVA failures
3. ✅ **400 workout_types errors** - Removed redundant workout_types table references
4. ✅ **Cached BPM data** - Replaced tempo resolver with direct SVA table queries

### Current State - STILL BROKEN
- ❌ **Cached BPM data still being used** for both Oasis and The Dirge tracks
- ❌ **400 Supabase error** preventing SVA table access for these tracks
- ❌ **No rows found** in streaming_vendor_attributes for Oasis and Dirge
- Enhanced logging added to workoutPhaseMapper.ts

### Specific Error Found
**Supabase 400 Error for Oasis and Dirge tracks:**
```json
{
    "code": "PGRST116",
    "details": "The result contains 0 rows",
    "hint": null,
    "message": "Cannot coerce the result to a single JSON object"
}
```

**Root Cause:** The SVA table queries are returning 0 rows for these specific tracks, which means:
1. The track_id values don't exist in streaming_vendor_attributes table, OR
2. The query filters are too restrictive and missing the data, OR  
3. The track names/artists don't match exactly between Spotify API and SVA table

### Next Investigation Steps
1. **PRIORITY: Fix SVA table data access**
   - Verify track_id values for Oasis and Dirge tracks exist in streaming_vendor_attributes
   - Check if track names/artists match exactly between Spotify API and database
   - Remove `.single()` query constraint that's causing "0 rows" error

2. **Investigate cached BPM source**
   - Find where cached BPM data is still being used instead of SVA table
   - Ensure all tempo resolver calls are disabled/bypassed

3. **Database verification commands:**
   ```sql
   SELECT track_id, track_name, artist_name, spotify_tempo 
   FROM streaming_vendor_attributes 
   WHERE track_name ILIKE '%oasis%' OR artist_name ILIKE '%oasis%';
   
   SELECT track_id, track_name, artist_name, spotify_tempo 
   FROM streaming_vendor_attributes 
   WHERE track_name ILIKE '%dirge%' OR artist_name ILIKE '%dirge%';
   ```

### Key Files Modified
- `src/lib/workoutPhaseMapper.ts` - Enhanced logging, removed 406 Range errors
- `src/pages/MusicSync.tsx` - Removed workout_types references, fixed cached BPM issue
- `src/components/RealtimeSectionDisplay.tsx` - Fixed loading state and track change detection

### Debugging Commands Available in Browser Console
```javascript
// Test current track phase mapping
diagnoseSpotifyPlayback()

// Test Supabase connectivity  
testSupabaseConnection()

// Test specific BPM range queries
testBPMRangeQuery(100)  // For Oasis
testBPMRangeQuery(58)   // For The Dirge
```

### Expected Console Output When Working
```
📊 [PHASE MAPPER] SVA query result for "track_id": trackName: "Oasis Song", spotify_tempo: 100
📊 [PHASE MAPPER] All available phases: ["hills (X-Y BPM)", "climb (A-B BPM)", ...]
🎯 [PHASE MAPPER] BPM 100 matches: ["correct_phase (range)", ...]
✅ [PHASE MAPPER] Success: Oasis Song (100 BPM) → correct_workout_track
```

### If Issue Persists
The problem may be in:
1. **Data integrity** - Wrong BPM values in SVA table
2. **Range logic** - Incorrect target_tempo_min/max in workout_phases table  
3. **Track ID matching** - SVA queries not finding the right track records
4. **Tie-breaking** - Multiple phases matching but wrong one selected

**Continue debugging from enhanced console logs to identify exact failure point.**