# Workout Phase Mapping Implementation

This implementation follows the exact model defined in `primer.md` for mapping Spotify tracks to workout phases using only Supabase data.

## Core Algorithm

**Track → Phase Mapping:**
1. Get track-level BPM from `streaming_vendor_attributes.spotify_tempo` (full-track row only)
2. Find workout phase where `target_tempo_min <= BPM <= target_tempo_max` 
3. If multiple matches, choose narrowest range (tie-breaking per primer.md)
4. Lock mapping at playlist selection time - no remapping during playback

**No Fallbacks:** If required data is missing, surface explicit UI error instead of guessing.

## Key Files

### Core Mapping Logic
- **`src/lib/workoutPhaseMapper.ts`** - Implements exact primer.md algorithm
  - `mapTrackToWorkoutPhase()` - Maps single track via BPM lookup
  - `lockPlaylistPhases()` - Locks all playlist tracks at selection time
  - `getLockedPhaseForTrack()` - Retrieves locked phase for runtime

### Runtime Integration  
- **`src/lib/spotifyPhaseIntegration.ts`** - Manages current track → phase state
  - Detects track changes and maintains locked phase consistency
  - Handles section detection for narrative selection
- **`src/hooks/useWorkoutPhaseTracking.ts`** - React hook for UI integration
  - Provides phase state to components with error handling

### Database Schema
- **`streaming_vendor_attributes`** - Track metadata including `spotify_tempo` (BPM)
- **`workout_phases`** - Phase definitions with `target_tempo_min/max` ranges  
- **`instruction_narratives`** - PT narratives mapped by `workout_track` + `section_type`
- **`playlist_phase_map`** - Locked track→phase mappings per session

## Usage

```typescript
// Test single track mapping
await window.testSingleTrackMapping('track_id_here');

// Run full validation test suite  
await window.testWorkoutPhaseMapping();

// Map playlist and lock phases (called on playlist selection)
const result = await lockPlaylistPhases(['track1', 'track2', 'track3']);
```

## Error Handling

The system shows explicit errors for missing data:
- `"Missing SVA data for track_id=X; unable to map phase"`
- `"Missing SVA.spotify_tempo for track_id=X; unable to map phase"`  
- `"No workout phase matches BPM X for track_id=Y"`

No guessing or fallback values are used per primer.md requirements.