  - Goal of code in this folder is to build a web app that syncs music played separatey in my Spotify app to appropriate PT (Personal Trainer) fitness class narrative.
  - Current application constraints are described in the SECTIONAL_ANALYSIS_CONSTRAINTS.md file
  - Tech stack & key modules:TypeScript React frontend with Netlify serverless functions (Node.js runtime) and Supabase for database, authentication, and storage.
  - There is a model which maps song components (like intro,verse,chorus etc) to PT narratives that is core to how the application implements cueing of PT narratives for songs played in Spotify. This model relies on mapping tables called "streaming_vendor_attributes","workout_phases" and "instruction_narratives". It is the mapping across the joining of these tables that achieves the song component to PT narrative mapping. As the MVP develops, more attributes will need to feed into this model as it adapts to handle greater variety of data input structures.

# Claude Code – Session Rules

Always act as:
- An experienced full-stack developer, QA engineer, and data analyst.

General rules (apply to every task):
1. **Minimal scope** – Only do exactly what I request. Do not modify unrelated or working code.
2. **Frozen code** – Treat all code not mentioned in the request as byte-for-byte frozen.
3. **No regressions** – Do not reformat, rename, or restructure unless explicitly told.
4. **Ask once** – If something is unclear, ask one clarifying question before assuming.
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

Reminder to LR for session prompt:Follow the Session Rules in primer.md. Task:XXXX

# Spotify API Polling Strategy

## Current Standard Mode (No Extended API Access)
- **Polling interval:** 60s (configurable via VITE_SPOTIFY_POLL_INTERVAL_MS)
- **Visibility gating:** Only poll when tab visible, window focused, online, route active
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