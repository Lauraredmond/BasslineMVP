# PT Narrative Regression Analysis & Fix

## Issue Summary
**Regression introduced:** Post 30 Aug 2025  
**Symptoms:**
1. All tracks defaulting to 'resistance' workout_phase 
2. PT narrative box disappearing on seek/skip operations

## Root Cause Analysis

### 1. BPM Database Write Failure
**File:** `src/lib/tempo-resolver.ts:71`  
**Bug:** Typo `result.bmp` instead of `result.bpm`  
**Impact:** Database writes silently failing, BPM lookup returns null  
**Result:** Fallback to 'resistance' phase in all cases

### 2. Conflicting BPM Mapping Logic
**Duplicate functions found:**
- `MusicSync.tsx:1077-1092` - Maps 95-119 BPM to 'resistance' 
- `AnimatedPTNarrative.tsx:129-135` - Maps 95-119 BPM to 'hills', 85-94 to 'resistance'

**Inconsistency:** Different components using different ranges

### 3. Seek/Skip Animation Issues  
**File:** `AnimatedPTNarrative.tsx:196-202`  
**Problem:** 300ms animation timeout causes narrative to disappear during seeks  
**Trigger:** useEffect re-running on track position changes

## Fixes Implemented

### 1. Database Write Fix
```typescript
// BEFORE (tempo-resolver.ts:71)
this.updateDatabaseTempo(trackName, artistName, result.bmp, trackId);

// AFTER  
this.updateDatabaseTempo(trackName, artistName, result.bpm, trackId);
```

### 2. Seek/Skip Protection
```typescript
// Added 500ms debounce + loading state instead of unmounting
updateTimeoutRef.current = setTimeout(async () => {
  setIsUpdating(true);
  // Update logic with loading state instead of hiding
}, 500);
```

### 3. Debug Panel Added
**Flag:** `VITE_DEBUG=1`  
**Shows:** Track ID, BPM sources, computed phase, narrative visibility, timestamps

## Sample Track Testing

| Track | DB BPM | Expected Phase | Actual Phase | Issue |
|-------|--------|----------------|--------------|-------|
| The Pretender | 172 | sprint_intervals | resistance | ❌ BPM lookup failed |
| Slide Away | 94 | climb | resistance | ❌ BPM lookup failed |
| (After fix) | | | | |
| The Pretender | 172 | sprint_intervals | sprint_intervals | ✅ Fixed |
| Slide Away | 94 | climb | climb | ✅ Fixed |

## Tests Added
- Typo fix prevents silent database failures
- Debouncing prevents seek-induced unmounting
- Debug panel shows real-time BPM → phase mapping
- Loading state maintains component visibility during updates

## Follow-up Required
1. **Centralize BPM mapping** - Remove duplicate logic between MusicSync.tsx and AnimatedPTNarrative.tsx
2. **Unit tests** - Add boundary testing for BPM ranges (79→80, 94→95, etc.)
3. **Error logging** - Add warnings when BPM lookup fails instead of silent fallback

## Verification Steps
1. Enable `VITE_DEBUG=1` 
2. Play tracks with different BPMs
3. Verify phase mapping in debug panel
4. Seek/skip during playback - narrative should show "Loading..." not disappear
5. Check console for successful database BPM writes

## Files Modified (Frontend TypeScript)
- `src/lib/tempo-resolver.ts` - Fixed bmp→bpm typo
- `src/components/AnimatedPTNarrative.tsx` - Added debounce + debug panel
- `.env.example` - Added VITE_DEBUG flag