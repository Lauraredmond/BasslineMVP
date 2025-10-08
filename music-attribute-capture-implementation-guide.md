# Music Attribute Capture Implementation Guide for Bassline

## Overview
This document outlines steps to implement a system that captures music attributes through audio analysis by:
1. Triggering album playback from Bassline (Mac) to iPhone 
2. Capturing streamed audio via Mac microphone
3. Real-time analysis using open-source MIR libraries
4. Storing results in Supabase with Spotify song IDs

## Technical Architecture

### Components
- **Bassline Web App** (Mac): Trigger & control interface
- **iPhone Spotify**: Audio playback source  
- **Mac Audio Capture**: Microphone input processing
- **Python MIR Service**: Real-time audio analysis
- **Supabase Database**: Attribute storage

## Implementation Steps

### Phase 1: Audio Analysis Service Setup

#### Step 1.1: Create Python MIR Service
```bash
# Create new Python service directory
mkdir bassline-audio-analysis
cd bassline-audio-analysis
python -m venv venv
source venv/bin/activate
```

#### Step 1.2: Install Required Libraries
```bash
pip install beatnet madmom librosa sounddevice numpy scipy supabase
pip install real-time-beat-tracking  # If available via pip
```

#### Step 1.3: Audio Capture Module
Create `audio_capture.py`:
- Use `sounddevice` for Mac microphone input
- Real-time audio streaming with circular buffer
- Configure sample rate (44.1kHz recommended)

#### Step 1.4: Beat Analysis Module  
Create `beat_analyzer.py`:
- **BeatNet integration**: Real-time beat/downbeat/tempo tracking
- **madmom integration**: Onset detection and meter analysis
- **Custom PLP algorithm**: Zero-latency beat tracking
- Output: timestamps, BPM, beat positions, meter

### Phase 2: Bassline Integration

#### Step 2.1: Add Audio Analysis API Endpoints
In Netlify serverless functions, create:
- `start-audio-analysis.js`: Initialize analysis session
- `stop-audio-analysis.js`: End session and process results
- `get-analysis-results.js`: Retrieve real-time data

#### Step 2.2: Extend Supabase Schema
Add to `streaming_vendor_attributes` table:
```sql
-- New columns for captured attributes
ALTER TABLE streaming_vendor_attributes ADD COLUMN 
captured_tempo DECIMAL,
beat_timestamps JSONB,
downbeat_timestamps JSONB, 
meter_signature VARCHAR(10),
onset_timestamps JSONB,
analysis_session_id UUID,
captured_at TIMESTAMP;
```

#### Step 2.3: Update Music-Sync Page
Modify existing music-sync interface:
- Add "Capture Mode" toggle
- Audio analysis start/stop controls
- Real-time visualization of detected beats
- Progress indicator for capture session

### Phase 3: Cross-Device Communication

#### Step 3.1: Remote Playback Trigger
Options for Mac → iPhone control:
- **Option A**: Spotify Connect API (if available)
- **Option B**: iOS Shortcuts integration via URL schemes
- **Option C**: Manual coordination with visual cues

#### Step 3.2: Session Synchronization
- Generate unique session IDs
- Store playback start timestamp
- Sync audio capture timing with Spotify track position

### Phase 4: Real-Time Processing Pipeline

#### Step 4.1: Audio Processing Flow
```python
# Pseudo-code structure
while audio_session_active:
    audio_chunk = capture_microphone_input()
    
    # Run multiple analysis algorithms
    beats = beatnet.process_realtime(audio_chunk)
    onsets = madmom.detect_onsets(audio_chunk) 
    tempo = estimate_tempo(audio_chunk)
    
    # Store timestamped results
    store_analysis_data(session_id, timestamp, beats, onsets, tempo)
```

#### Step 4.2: Data Aggregation
- Accumulate per-song analysis results
- Calculate confidence scores
- Handle tempo variations within tracks

### Phase 5: Database Integration

#### Step 5.1: Analysis Results Storage
Create functions to:
- Map Spotify track IDs to analysis sessions
- Store timestamped attribute data
- Calculate aggregate track-level metrics
- Update existing `streaming_vendor_attributes` records

#### Step 5.2: Quality Assurance
- Compare captured BPM with existing data sources
- Flag inconsistent results for manual review
- Maintain analysis confidence scores

## Implementation Using Claude Code

### Command Sequence

1. **Setup Python Service**
```bash
claude-code "Create Python audio analysis service with BeatNet and madmom integration for real-time beat tracking"
```

2. **Extend Bassline Backend**
```bash
claude-code "Add Netlify serverless functions for audio analysis session management and Supabase integration"
```

3. **Update Frontend Interface** 
```bash
claude-code "Modify music-sync page to include audio capture controls and real-time beat visualization"
```

4. **Database Schema Updates**
```bash
claude-code "Extend streaming_vendor_attributes table schema for captured audio analysis data"
```

5. **Integration Testing**
```bash
claude-code "Create test scripts to validate audio capture → analysis → database pipeline"
```

## Technical Considerations

### Audio Quality Requirements
- Minimum 16-bit, 44.1kHz capture rate
- Noise reduction for optimal analysis accuracy
- Calibration for microphone sensitivity

### Latency Management
- Buffer size optimization (128-512 samples)
- Real-time processing constraints
- Network latency for database writes

### Accuracy Validation
- Cross-reference with existing BPM data
- Manual verification workflows
- Confidence scoring algorithms

## Expected Outcomes

### Data Enhancement
- High-precision BPM measurements
- Beat-accurate section timestamps
- Meter signature detection
- Onset timing precision

### Workflow Integration
- Seamless capture during playlist selection
- Automatic attribute population
- Enhanced workout phase mapping accuracy

## Limitations & Alternatives

### Technical Constraints
- Audio quality dependent on microphone/environment
- iPhone → Mac audio transmission quality
- Real-time processing computational requirements

### Fallback Strategies
- Manual BPM entry interface
- Alternative API integration (RapidAPI, etc.)
- Hybrid manual/automated analysis workflow

## Next Steps

1. **Proof of Concept**: Basic audio capture + BeatNet integration
2. **MVP Integration**: Single-track analysis workflow  
3. **Full Implementation**: Batch playlist analysis
4. **Production Optimization**: Performance tuning and error handling

---

*This implementation leverages existing Bassline architecture while adding sophisticated audio analysis capabilities through proven open-source MIR libraries.*