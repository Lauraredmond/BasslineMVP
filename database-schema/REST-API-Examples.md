# Bassline MVP REST API Examples

## Overview
These examples show how to query the Supabase database via REST API to get workout phases with type names and verify the "Slide Away" BPM=100 mapping.

## Base URL
Replace `YOUR_SUPABASE_URL` with your actual Supabase URL:
```
https://YOUR_SUPABASE_URL.supabase.co/rest/v1/
```

## Authentication
Include your anon key in the `apikey` header:
```
apikey: YOUR_SUPABASE_ANON_KEY
```

---

## 1. Get All Workout Phases with Type Names

**GET** `/v_workout_phases`

```bash
curl -H "apikey: YOUR_SUPABASE_ANON_KEY" \
  "https://YOUR_SUPABASE_URL.supabase.co/rest/v1/v_workout_phases"
```

**Expected Response:**
```json
[
  {
    "workout_phase_id": "uuid-here",
    "workout_track": "warmup", 
    "target_tempo_min": 50,
    "target_tempo_max": 70,
    "description": "Gentle warm-up to prepare the body for exercise",
    "phase_type_name": "Warm Up",
    "bmp_range": "50-70 BPM",
    "narrative_count": 1,
    "available_sections": "verse"
  },
  {
    "workout_phase_id": "uuid-here",
    "workout_track": "climb",
    "target_tempo_min": 90,
    "target_tempo_max": 120, 
    "description": "Sustained climbing efforts - THIS IS WHERE BPM=100 MAPS",
    "phase_type_name": "Endurance Climb",
    "bpm_range": "90-120 BPM",
    "narrative_count": 3,
    "available_sections": "chorus, intro, verse"
  }
]
```

---

## 2. Find Phase for Specific BPM (e.g., BPM=100)

**GET** `/workout_phases?target_tempo_min=lte.100&target_tempo_max=gte.100`

```bash
curl -H "apikey: YOUR_SUPABASE_ANON_KEY" \
  "https://YOUR_SUPABASE_URL.supabase.co/rest/v1/workout_phases?target_tempo_min=lte.100&target_tempo_max=gte.100"
```

**Expected Response for BPM=100:**
```json
[
  {
    "workout_phase_id": "uuid-here",
    "workout_track": "climb",
    "target_tempo_min": 90,
    "target_tempo_max": 120,
    "description": "Sustained climbing efforts - THIS IS WHERE BPM=100 MAPS"
  },
  {
    "workout_phase_id": "uuid-here", 
    "workout_track": "hills",
    "target_tempo_min": 100,
    "target_tempo_max": 140,
    "description": "Rolling hill climbs with varying resistance"
  }
]
```

**Note:** If multiple phases match, choose the one with the narrowest range per primer.md spec.

---

## 3. Get Narratives for a Specific Phase + Section

**GET** `/instruction_narratives?workout_track=eq.climb&section_type=eq.chorus`

```bash
curl -H "apikey: YOUR_SUPABASE_ANON_KEY" \
  "https://YOUR_SUPABASE_URL.supabase.co/rest/v1/instruction_narratives?workout_track=eq.climb&section_type=eq.chorus"
```

**Expected Response:**
```json
[
  {
    "narrative_id": "uuid-here",
    "workout_track": "climb", 
    "section_type": "chorus",
    "narrative_text": "This is your mountain! Push through this climb with power and control.",
    "created_at": "2025-09-07T22:48:12.000Z"
  }
]
```

---

## 4. Verify "Slide Away" Track Data

**GET** `/streaming_vendor_attributes?track_name=eq.Slide Away&is.section_type.null`

```bash
curl -H "apikey: YOUR_SUPABASE_ANON_KEY" \
  "https://YOUR_SUPABASE_URL.supabase.co/rest/v1/streaming_vendor_attributes?track_name=eq.Slide%20Away&is.section_type.null"
```

**Expected Response:**
```json
[
  {
    "id": "uuid-here",
    "track_id": "slide_away_test_id",
    "track_name": "Slide Away", 
    "artist_name": "Test Artist",
    "spotify_tempo": 100,
    "section_type": null,
    "created_at": "2025-09-07T22:48:12.000Z"
  }
]
```

---

## 5. Complete Phase Mapping Query (implements primer.md algorithm)

**GET** Complex query to find the best phase for "Slide Away" BPM=100:

```bash
curl -H "apikey: YOUR_SUPABASE_ANON_KEY" \
  -H "Prefer: params=single-object" \
  "https://YOUR_SUPABASE_URL.supabase.co/rest/v1/rpc/find_phase_for_bpm" \
  -d '{"input_bpm": 100, "track_name": "Slide Away"}'
```

*Note: This would require a custom RPC function in Supabase. Alternatively, do the logic client-side.*

---

## Expected Validation Results

✅ **"Slide Away" with BPM=100 should map to "climb" phase (90-120 BPM range)**  
✅ **The view v_workout_phases should return phases with user-friendly type names**  
✅ **No PGRST200 errors when querying workout_phases table**

## Troubleshooting PGRST200 Errors

If you get PGRST200 errors:

1. **Table doesn't exist**: Run the `setup-database.sql` script
2. **Permission denied**: Check RLS policies are created
3. **Column not found**: Verify table schema matches the queries  
4. **Wrong API key**: Make sure you're using the correct anon key

## Testing in Supabase Dashboard

You can also test these queries directly in the Supabase SQL Editor:

```sql
-- Quick test: Does BPM=100 map to climb?
SELECT workout_track, target_tempo_min, target_tempo_max
FROM workout_phases 
WHERE 100 BETWEEN target_tempo_min AND target_tempo_max
ORDER BY (target_tempo_max - target_tempo_min) ASC
LIMIT 1;

-- Expected result: workout_track = 'climb'
```