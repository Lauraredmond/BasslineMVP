# Sectional Analysis Implementation Constraints

## Critical Implementation Requirements

Based on user specifications, any sectional analysis solution for this music-sync workout app MUST adhere to these strict constraints:

### ✅ ALLOWED APPROACHES

1. **Spotify Web API (Available endpoints only)**
   - Basic track metadata (name, artist, duration, popularity)
   - Currently playing track information
   - Playback control and position tracking
   - User playlists and saved tracks

2. **RapidAPI Soundnet Integration**
   - Basic track attributes (tempo, key, mode, energy, danceability)
   - Musical metadata extraction from track/artist names
   - No detailed sectional breakdown available from this service

3. **Algorithmic Section Prediction**
   - Genre-based section timing patterns
   - Metadata-driven song structure analysis
   - Real-time section detection using only available data
   - Machine learning-free pattern matching

4. **Database Storage Requirements**
   - All sectional analysis data MUST be written to common streaming vendor analysis log DB table
   - Each section should create individual database entries
   - Section data must be retrievable for real-time workout synchronization

### ❌ FORBIDDEN APPROACHES

1. **Spotify Restricted APIs**
   - **Audio Analysis API (`/v1/audio-analysis`)** - Requires Extended Developer Access
   - **Audio Features API (`/v1/audio-features`)** - Requires Extended Developer Access  
   - These endpoints return 403 Forbidden for apps created after November 27, 2024

2. **Audio Processing Restrictions**
   - **NO Web Audio API usage** - Spotify streams are encrypted/DRM protected
   - **NO audio file uploads** - Licensed music cannot be processed directly
   - **NO client-side audio analysis** - Violates streaming service terms
   - **NO third-party audio analysis libraries** - Cannot access encrypted streams

3. **Prohibited Implementation Patterns**
   - **NO "night before" preprocessing** - Must work in real-time during workout
   - **NO manual track preparation** - Must work with any Spotify track
   - **NO offline audio analysis** - Everything must work with streaming data only

### 🎯 CORE FUNCTIONAL REQUIREMENTS

1. **Real-time Workout Narrative Generation**
   - Section prompts must appear during active workouts
   - Timing must sync with actual track playback position
   - Different sections must trigger different workout intensities
   - Narrative instructions must be contextual to section type

2. **Streaming Integration**
   - Must work with Spotify streaming (no file access)
   - Must support real-time track switching
   - Must handle tracks user has never played before
   - Must work without pre-analysis or preparation

3. **Database Integration**
   - Sectional analysis results must be stored in common vendor DB table
   - Each section detection must create database entries
   - Data must be retrievable for subsequent workout sessions
   - Historical section data should improve future predictions

### 🔄 CURRENT IMPLEMENTATION STATUS

- ✅ **RealtimeSectionDisplay**: Integrated into workout page, shows current section
- ✅ **Algorithmic Section Analyzer**: Genre-based prediction using metadata only
- ✅ **Spotify Integration**: Uses only available/permitted endpoints
- ✅ **RapidAPI Integration**: Extracts tempo, energy, key, mode data
- ⚠️ **Database Writing**: Algorithmic sections NOT currently written to DB
- ⚠️ **Section Persistence**: Generated sections exist only in memory

### 🚨 CRITICAL GAPS TO ADDRESS

1. **Database Writing Missing**: Algorithmic sections must be written to vendor analysis table
2. **Section Persistence**: Generated sections should be stored for reuse
3. **Historical Learning**: Section predictions should improve based on stored data

### 📋 SPOTIFY API ACCESS LIMITATIONS

- **Standard Access**: Basic playback, track info, user library
- **Quota Extension Mode**: Higher rate limits (6+ week approval process)
- **Extended Developer Access**: Restricted endpoints like Audio Analysis (uncertain approval)
- **Current Status**: Only standard access available, pursuing both extensions

This document serves as a permanent reference to prevent repeated exploration of forbidden approaches and ensure all development effort focuses on viable, compliant solutions.

---
*Last Updated: August 28, 2025*
*Next Review: After Spotify API access extension results*