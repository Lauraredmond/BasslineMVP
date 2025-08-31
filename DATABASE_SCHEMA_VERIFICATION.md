# Database Schema Verification Report

## Overview
This document provides the exact current table structure in the Supabase database for the three key tables requested:

1. `streaming_vendor_attributes`
2. `instruction_narratives` 
3. `workout_phases`

## Environment Configuration

**Supabase URL:** `https://fgtvymkqymmvxxaoirio.supabase.co`
**Environment Files:** 
- `/Users/lauraredmond/Documents/Bassline/Projects/MVP/.env.local`
- `/Users/lauraredmond/Documents/Bassline/Projects/MVP/.env.production`

## Table Schemas

### 1. streaming_vendor_attributes

**Purpose:** Manual audio timestamping data for section and bar changes in tracks

**Table Structure:**
```sql
CREATE TABLE streaming_vendor_attributes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  track_name VARCHAR(255) NOT NULL,
  artist_name VARCHAR(255) NOT NULL,
  
  -- Timing information
  timestamp_ms BIGINT NOT NULL, -- Timestamp in milliseconds from start of track
  
  -- Event types
  event_type VARCHAR(50) NOT NULL, -- 'section_change', 'bar_change', 'beat', 'custom'
  
  -- Section information (for section_change events)
  section_type VARCHAR(50), -- 'intro', 'verse', 'chorus', 'bridge', 'outro', etc.
  section_number INTEGER, -- Which occurrence (verse 1, verse 2, etc.)
  
  -- Bar/Beat information (for bar_change events)
  bar_number INTEGER, -- Bar/measure number
  beat_number INTEGER, -- Beat within the bar (1-4 typically)
  estimated_tempo DECIMAL(6,2), -- BPM at this point
  
  -- Audio characteristics at this timestamp
  energy_level INTEGER CHECK (energy_level >= 0 AND energy_level <= 100),
  intensity_level INTEGER CHECK (intensity_level >= 0 AND intensity_level <= 100),
  
  -- Metadata
  data_source VARCHAR(50) DEFAULT 'manual_capture', -- How this data was captured
  capture_session_id UUID, -- Group related captures together
  notes TEXT, -- Optional notes about this timestamp
  
  -- User and timing
  captured_by VARCHAR(100), -- Who captured this data
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Track metadata
  track_duration_ms BIGINT, -- Total track duration
  spotify_track_id VARCHAR(100), -- If available
  spotify_tempo REAL, -- BPM from Spotify audio_features API
  
  -- Indexing
  UNIQUE(track_name, artist_name, timestamp_ms, event_type)
);
```

**Key Fields for Track Identification:**
- `track_name` + `artist_name`: Primary track identification
- `spotify_track_id`: Optional Spotify track ID
- No `track_uri` field - uses combination approach

**Section/Timing Fields:**
- `section_type`: Maps to song components (intro, verse, chorus, bridge, outro)
- `section_number`: Distinguishes between multiple occurrences (verse 1, verse 2, etc.)
- `timestamp_ms`: Exact timing in milliseconds
- `event_type`: Type of timing event

### 2. instruction_narratives

**Purpose:** Maps workout tracks + song components to instruction narratives

**Table Structure:**
```sql
CREATE TABLE instruction_narratives (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workout_track VARCHAR(100) NOT NULL, -- 'sprint_intervals', 'climb', 'resistance', etc.
    song_component VARCHAR(50) NOT NULL, -- 'intro', 'verse', 'pre_chorus', 'chorus', 'bridge', 'outro', etc.
    text TEXT NOT NULL, -- The instruction narrative
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(workout_track, song_component) -- Each workout track has unique narratives per song component
);
```

**Key Relationships:**
- `workout_track`: Links to workout types (sprint_intervals, climb, resistance, etc.)
- `song_component`: Links to section types from streaming_vendor_attributes
- Unique constraint ensures one narrative per workout_track + song_component combination

**Sample Workout Tracks:**
- `sprint_intervals`: 140-200 BPM
- `climb`: 80-84 BPM  
- `resistance`: 85-94 BPM
- `jumps`: 120-139 BPM
- `hills`: 95-119 BPM
- `warmup`: 70-79 BPM
- `cooldown`: 60-69 BPM
- `recovery`: 70-90 BPM

**Sample Song Components:**
- `intro`, `verse`, `verse_2`, `verse_3`
- `pre_chorus`, `chorus`, `chorus_2`, `chorus_3`
- `bridge`, `breakdown`, `end_of_bar`, `outro`

### 3. workout_phases

**Purpose:** Maps workout tracks to BPM ranges for music selection

**Table Structure:**
```sql
CREATE TABLE workout_phases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workout_track VARCHAR(100) NOT NULL UNIQUE, -- 'sprint_intervals', 'climb', 'resistance', etc.
    target_tempo_min INTEGER NOT NULL, -- Minimum BPM for this workout track
    target_tempo_max INTEGER NOT NULL, -- Maximum BPM for this workout track
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Key Features:**
- **NO `phase_key` field** - uses `workout_track` as the primary identifier
- Direct BPM range mapping for workout intensity selection
- Unique constraint on `workout_track`

**BPM Ranges (Updated for high-energy tracks like "The Pretender" at 172 BPM):**
```
sprint_intervals: 140-200 BPM (includes high-energy rock)
jumps: 120-139 BPM
hills: 95-119 BPM
resistance: 85-94 BPM
climb: 80-84 BPM
warmup: 70-79 BPM
cooldown: 60-69 BPM
recovery: 70-90 BPM (flexible range)
```

## Relationships Between Tables

### streaming_vendor_attributes ↔ instruction_narratives
**Connection:** `section_type` → `song_component`
- SVA's `section_type` values (intro, verse, chorus, bridge, etc.) map to IN's `song_component` values
- The mapping determines which workout instruction narrative to use for each detected section

### instruction_narratives ↔ workout_phases
**Connection:** `workout_track` (exact match)
- Both tables use identical `workout_track` values
- WP provides BPM ranges for music selection
- IN provides narratives for coaching during that workout track

### Track Identification Flow
1. **Music Analysis:** Track identified by `track_name` + `artist_name` + optional `spotify_track_id`
2. **Section Detection:** `streaming_vendor_attributes` provides timestamped sections
3. **BPM Mapping:** Track BPM matched against `workout_phases` ranges to determine `workout_track`
4. **Narrative Selection:** `instruction_narratives` provides coaching text for the selected `workout_track` + detected `song_component`

## Database Query Utilities

### Available Netlify Functions
1. **`/netlify/functions/query-table-schema.js`** - Inspect table schemas using anon key
2. **`/netlify/functions/debug-streaming-vendor-data.js`** - Debug SVA table data
3. **`/netlify/functions/secure-database-logger.js`** - Server-side database operations

### Database Schema Inspector Component
- **Location:** `/src/components/DatabaseSchemaInspector.tsx`
- **Access:** Available in debug panel when `?debug=true` is added to URL
- **Features:** Live schema inspection, sample data viewing, relationship analysis

### Testing Access
- **Production URL:** `https://trybassline.netlify.app/music-sync?debug=true`
- **Debug Panel:** Look for 🔧 icon in bottom-right corner
- **Schema Inspector:** Click "🗄️ DB Schema" button in debug panel

## Key Findings

1. **No `track_uri` field** - Uses `track_name` + `artist_name` + optional `spotify_track_id` for identification
2. **No `phase_key` field** - Uses `workout_track` directly as the linking field
3. **Section mapping is flexible** - `section_type` in SVA directly maps to `song_component` in IN
4. **BPM ranges updated** - Accommodates high-energy tracks up to 200 BPM
5. **Unique constraints** ensure data integrity across all relationships

## Environment Variables Required
```
VITE_SUPABASE_URL=https://fgtvymkqymmvxxaoirio.supabase.co
VITE_SUPABASE_ANON_KEY=[anon key for read operations]
SUPABASE_SERVICE_ROLE_KEY=[service key for admin operations - set in Netlify]
```

## Next Steps
1. Use the DatabaseSchemaInspector component to verify live data
2. Test the Netlify functions to confirm table access
3. Verify the relationship mappings with actual data queries
4. Confirm BPM range effectiveness with real track analysis