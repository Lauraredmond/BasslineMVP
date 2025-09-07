# Bassline MVP Database Schema

## Summary of Changes

Following the `/docs/ai/primer.md` specification, I've created a complete database schema that fixes the PGRST200 errors and implements the proper workout-phase ⇄ BPM ⇄ PT-narrative mapping system.

## Files Created

### 1. Core Schema Files
- **`01-create-tables.sql`** - Creates all tables with proper foreign key relationships
- **`02-create-view-v_workout_phases.sql`** - Creates the v_workout_phases view with type names
- **`03-rls-policies.sql`** - Enables RLS and creates read policies for public access
- **`04-seed-data.sql`** - Inserts workout phases, narratives, and test data
- **`05-slide-away-test.sql`** - SQL snippet to verify "Slide Away" BPM=100 maps to climb

### 2. Setup and Documentation
- **`setup-database.sql`** - Complete all-in-one setup script
- **`deploy-schema.sh`** - Deployment script for applying changes
- **`REST-API-Examples.md`** - REST API examples showing phases with type names
- **`README.md`** - This documentation file

## Key Features Implemented

### ✅ Fixed Supabase FK/Joins Structure
- Proper foreign key relationships between tables
- `instruction_narratives.workout_track` → `workout_phases.workout_track`
- `playlist_phase_map.workout_phase_id` → `workout_phases.workout_phase_id`

### ✅ Created v_workout_phases View
```sql
SELECT * FROM v_workout_phases;
```
Returns phases with:
- `phase_type_name` (e.g., "Endurance Climb" instead of "climb")
- `bpm_range` (e.g., "90-120 BPM")
- `narrative_count` and `available_sections`

### ✅ Added RLS Read Policies
All tables have public read access for anonymous and authenticated users:
- `streaming_vendor_attributes` - track data and BPM
- `workout_phases` - phase definitions
- `instruction_narratives` - PT narratives  
- `playlist_phase_map` - locked phase mappings

### ✅ REST API Examples
Complete examples in `REST-API-Examples.md` showing:
- Get all phases with type names
- Find phase for specific BPM
- Get narratives for phase + section
- Verify track data

### ✅ Slide Away BPM=100 → Climb Verification

**SQL Confirmation:**
```sql
-- This query confirms Slide Away BPM=100 maps to climb phase
SELECT workout_track, target_tempo_min, target_tempo_max
FROM workout_phases 
WHERE 100 BETWEEN target_tempo_min AND target_tempo_max
ORDER BY (target_tempo_max - target_tempo_min) ASC
LIMIT 1;
-- Expected: workout_track = 'climb', range 90-120
```

**REST API Confirmation:**
```bash
curl -H "apikey: YOUR_SUPABASE_ANON_KEY" \
  "https://YOUR_SUPABASE_URL.supabase.co/rest/v1/workout_phases?target_tempo_min=lte.100&target_tempo_max=gte.100"
```

## Database Tables Created

### streaming_vendor_attributes (SVA)
- Holds track metadata including `spotify_tempo` (BPM)
- Section-level data with `section_type` (intro, verse, chorus, etc.)

### workout_phases (WP)  
- Defines workout phases with BPM ranges
- `climb` phase: 90-120 BPM (includes BPM=100)
- Proper constraints and validation

### instruction_narratives (IN)
- PT narratives for each phase + section combination
- Foreign key to workout_phases.workout_track

### playlist_phase_map
- Locks tracks to phases at playlist selection time
- Implements primer.md algorithm A (lock at selection)

## Deployment

### Option 1: Run Individual Scripts
```bash
# In Supabase SQL Editor, run files in order:
# 1. 01-create-tables.sql
# 2. 02-create-view-v_workout_phases.sql  
# 3. 03-rls-policies.sql
# 4. 04-seed-data.sql
```

### Option 2: All-in-One Setup
```bash
# In Supabase SQL Editor:
# Run setup-database.sql (includes everything)
```

### Option 3: Command Line Deploy
```bash
# Set environment variables:
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Run deployment script:
./deploy-schema.sh
```

## Verification Steps

1. **Check PGRST200 Errors**: Should be gone when querying workout_phases
2. **Test BPM=100 Mapping**: Query should return "climb" phase
3. **Verify View Access**: v_workout_phases should return data with type names
4. **Test REST API**: Examples in REST-API-Examples.md should work

## Primer.md Compliance

✅ **Tables**: All required fields per spec  
✅ **Foreign Keys**: Proper relationships established  
✅ **BPM Ranges**: Inclusive ranges with narrowest-wins tie-breaking  
✅ **Algorithm A**: playlist_phase_map for locked mappings  
✅ **Algorithm B**: Runtime narrative lookup via joins  
✅ **Edge Cases**: Proper fallbacks and validation  
✅ **Vocabulary**: Consistent section_type and workout_track values

## Technical Details

- **Database**: PostgreSQL (Supabase)
- **Authentication**: RLS policies for anon/authenticated access
- **Performance**: Proper indexes on lookup columns
- **Data Integrity**: Foreign keys and check constraints
- **API Access**: REST API via Supabase auto-generated endpoints