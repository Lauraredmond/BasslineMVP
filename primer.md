  - Goal of code in this folder is to build a web app that syncs music played separatey in my Spotify app to appropriate PT (Personal Trainer) fitness class narrative.
  - Current application constraints are described in the SECTIONAL_ANALYSIS_CONSTRAINTS.md file
  - Tech stack & key modules:TypeScript React frontend with Netlify serverless functions (Node.js runtime) and Supabase for database, authentication, and storage.
  
## Technical Constraints & API Limitations
  - **Spotify Audio Features API**: The audio features endpoint that provided BPM/tempo data is deprecated and no longer available. Use alternative BPM sources (RapidAPI, manual entry, etc.) for tempo data collection.
  - There is a model comprising 3 tables in Supabase which maps song components (like intro,verse,chorus etc) to PT narratives that is core to how the application implements cueing of PT narratives for songs played in Spotify. This model relies on mapping tables called "streaming_vendor_attributes","workout_phases" and "instruction_narratives". It is the mapping across the joining of these tables that achieves the song component to PT narrative mapping. As the MVP develops, more attributes will need to feed into this model as it adapts to handle greater variety of data input structures. The mapping of workout_phases to songs should be established in the music-sync page of the application, when the user selects the playlist. BPM of an individual song, as indicated by the spotify_tempo field in the streaming_vendor_attributes table will determine the workout_phase mapped to a song when it matches the range indicated by the target_tempo_min and target_tempo_max fields in the workout_phases table. This, then, ultimately drives the PT narratives that will get mapped to the currently playing song when the song_component and workout_track fields can be matched on the SVA.section_type and workout_phases.workout_track fields of the joined SVA and WP tables.
  Developer spec of above model description: 
  Workout-phase ⇄ BPM ⇄ PT-narrative mapping (Bassline backend)
Goal (one-liner)
When a user selects a playlist on music-sync, lock each track to a workout_phase based on its BPM, then use song section + workout track to choose the correct PT narrative during playback.
Tables (minimum required fields)
streaming_vendor_attributes (SVA)
track_id, track_name
spotify_tempo (BPM for full track)
section_type (e.g., intro, verse, chorus, bridge, drop, outro)
(optional: section_number, timestamp_ms, etc.)
workout_phases (WP)
workout_phase_id
workout_track (phase label used for matching, e.g., warmup, sprint, resistance, jumps, cooldown)
target_tempo_min, target_tempo_max (inclusive BPM range for phase)
instruction_narratives (IN)
narrative_id
workout_track (same label as WP.workout_track)
section_type (same vocabulary as SVA.section_type)
narrative_text (or reference to asset)
Core rules
Lock at selection time: When the user picks a playlist on music-sync, compute and persist a per-track mapping:
track_id -> workout_phase_id (via BPM range match)
This mapping does not change during playback.
BPM→phase: Use SVA.spotify_tempo (full-track BPM). Find the single WP row where:
WP.target_tempo_min <= SVA.spotify_tempo <= WP.target_tempo_max
If multiple match, choose the one with the narrowest range; if none match, fall back per "edge cases" below.
**Note: Spotify's audio features endpoint is deprecated and no longer provides BPM data. Use alternative BPM sources (RapidAPI, etc.) for spotify_tempo field population.**
Narrative selection at runtime: While the track plays, when you know the current section (e.g., chorus) choose the narrative by joining on (section_type, workout_track):
(current_track’s locked workout_phase).workout_track
+ current_section_type
  → IN.narrative_text
Vocabulary alignment: SVA.section_type and IN.section_type share the same controlled vocabulary. WP.workout_track and IN.workout_track share the same controlled vocabulary.
Algorithm (backend)
A) On playlist selection (one-off, persisted)
For each track_id in playlist:
Read SVA.spotify_tempo for that track (full-track row; ignore per-section variants).
Find best-fit WP row by BPM range (narrowest range wins).
Persist playlist_phase_map(track_id, workout_phase_id, workout_track, locked_at).
Optionally cache per-track section_type timeline if you need it later.
B) During playback (live lookup)
Get track_id (from player) → read playlist_phase_map.
Detect current section_type (from SVA’s section timeline or player hooks).
Fetch narrative:
SELECT IN.narrative_text
FROM instruction_narratives IN
WHERE IN.workout_track = :mapped_workout_track
  AND IN.section_type   = :current_section_type
LIMIT 1;
Example SQL (phase lock + narrative join)
Lock track to phase (on selection):
-- Pick best-fit phase by BPM (example uses DISTINCT ON/narrowest span)
WITH bpm AS (
  SELECT :track_id::uuid AS track_id,
         (SELECT spotify_tempo
          FROM streaming_vendor_attributes
          WHERE track_id = :track_id
          ORDER BY timestamp_ms NULLS LAST
          LIMIT 1) AS tempo
),
candidates AS (
  SELECT
    wp.workout_phase_id,
    wp.workout_track,
    (wp.target_tempo_max - wp.target_tempo_min) AS span
  FROM bpm
  JOIN workout_phases wp
    ON bpm.tempo BETWEEN wp.target_tempo_min AND wp.target_tempo_max
)
SELECT workout_phase_id, workout_track
FROM candidates
ORDER BY span ASC
LIMIT 1;
Runtime narrative lookup (given current section):
SELECT inarr.narrative_text
FROM playlist_phase_map ppm
JOIN workout_phases wp
  ON wp.workout_phase_id = ppm.workout_phase_id
JOIN instruction_narratives inarr
  ON inarr.workout_track = wp.workout_track
WHERE ppm.track_id = :current_track_id
  AND inarr.section_type = :current_section_type
LIMIT 1;
Edge cases & fallbacks
Missing spotify_tempo:
Try an alternate tempo source (secondary API/cache).
Else default to a neutral phase (e.g., resistance), or apply nearest-range WP by estimating tempo from SVA section tempos if available.
Log and surface a health flag so you can fix upstream.
Multiple WP matches: choose the one with the smallest (target_tempo_max − target_tempo_min).
No narrative found for (workout_track, section_type):
Fallback order: (workout_track, any), (default_track, section_type), global default.
Vocabulary drift: enforce enum constraints or validation on section_type and workout_track across tables.
Persistence & contracts
playlist_phase_map is the single source of truth for locked mappings created on selection.
Do not recompute mapping mid-song or mid-playlist unless user explicitly re-locks.
All APIs that need a narrative must accept (track_id, current_section_type) and return a single narrative_text.
Acceptance tests (happy path)
Given spotify_tempo = 148, and WP.sprint = [145, 160], the selected phase is sprint.
During chorus of that track, (workout_track=sprint, section_type=chorus) returns a non-null narrative.
Skipping within the same track to verse switches the narrative to the verse-specific one without changing the locked phase.

# Claude Code – Session Rules

Always act as:
- An experienced full-stack developer, QA engineer, and data analyst.

General rules (apply to every task):
1. **Minimal scope** – Only do exactly what I request. Do not modify unrelated or working code.
2. **Frozen code** – Treat all code not mentioned in the request as byte-for-byte frozen.
3. **No regressions** – Do not reformat, rename, or restructure unless explicitly told.
4. **Ask once** – If something is unclear, ask one clarifying question before assuming.
**Ensure clean up of redundant code** – make sure code created to make something work that fails to work is fully removed so that needless serverless function calls are not made on the netlify server, thus needlessly using up bandwidth allocation for the month.
5. **Output style** – Respond with:
   - A short plan (bullets).
   - Diffs or targeted snippets only (no full rewrites unless I ask).
   - Test/verification steps to confirm the change works and avoids breaking existing code.
   - Log a one-liner of what failed in the previous task to the log file (log.md), with timestamp, so as to maintain record of what we've tried historically and what hasn't worked
   - Log brief bullets of what was carried out in the current task to (log.md)
   - provide tech detail, including code files updated and tell me if it's front end typescript or netlify serverless functions (or otherwise) executing the changes made
   - Always deploy changes to Github "BasslineMVP" folder after performing each update using deploy-with-debug.sh shell script

Optional (when relevant):
- Highlight risks if my request could impact other modules.
- Suggest improvements separately, never bundled into the requested change.

Reminder to **LR for session prompt:Follow the Session Rules in primer.md. Please read the primer.md file as a guide to how to operate and help me    │
│   with coding tasks. Please do only as I instruct and ask questions when     │
│   unsure. Don't implement any spoofed or hard-coded behaviour which may      │
│   make it appear as though the application is working as requested when it   │
│   is not. 

# Spotify API Polling Strategy

## Current Standard Mode (No Extended API Access)
- **Polling interval:** 60s (configurable via VITE_SPOTIFY_POLL_INTERVAL_MS)
- **Music-sync exception:** 8s interval (VITE_MUSIC_SYNC_POLL_INTERVAL_MS) for real-time sync requirements
- **Visibility gating:** Only poll when tab visible, online, route active
- **Focus exception:** Music-sync allows polling when window unfocused (real-time sync priority)
- **Backoff logic:** 60s → 120s → 300s on consecutive no-change responses
- **Pause suspension:** Stop polling if playback paused >30s
- **Feature flags:** VITE_SPOTIFY_VISIBILITY_GATING=1, VITE_EXTENDED_SPOTIFY_API=0

## Future Extended Mode (If Extended Spotify API Access Granted)
**⚠️ Only activate if explicitly stated: "we have access to extended Spotify API"**

When VITE_EXTENDED_SPOTIFY_API=1:
- **Event-driven primary:** Web Playback SDK player_state_changed events
- **Confirm polls:** 5-10s intervals only during active workout segments
- **Phase-aware polling:** Short polls during workout screen foreground + active playback
- **ETag support:** If-None-Match headers where available
- **Visibility gating:** Maintained but allows 10s intervals when foregrounded

### Revision Steps (Execute if Extended API access granted):
1. Switch to Web Playback SDK event listeners
2. Reduce polling to 10s during active workout only  
3. Implement ETag/If-None-Match headers
4. Update this document with new intervals and conditions
5. Test that events properly replace most polling needs
