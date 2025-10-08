# Bassline Audio Analysis Service

Real-time audio analysis service for capturing music attributes from iPhone → Mac microphone.

## Features

- **Real-time audio capture** via Mac microphone
- **Beat detection** using librosa
- **Tempo estimation** with confidence scoring
- **Onset detection** for precise timing
- **REST API** for React frontend integration
- **Supabase integration** for storing results

## Installation

The service uses librosa instead of BeatNet/madmom due to compatibility issues.

### Already Installed Libraries:
✅ librosa - Audio analysis algorithms  
✅ sounddevice - Audio capture  
✅ flask + flask-cors - API server  
✅ numpy, scipy - Numerical processing  
✅ supabase - Database integration  

### Missing Libraries (optional advanced features):
❌ BeatNet - Installation issues with Python 3.9/M4 Mac  
❌ madmom - Compilation errors with Cython  

## Usage

### 1. Start the Analysis Service

```bash
cd bassline-audio-service
./start_server.sh
```

This will:
- Activate the Python virtual environment
- Check audio devices
- Start the Flask API server on `http://localhost:5000`

### 2. Test the Service

```bash
# Test microphone access
curl -X POST http://localhost:5000/test-microphone

# Check available audio devices
curl http://localhost:5000/device-info

# Health check
curl http://localhost:5000/health
```

### 3. Use from Bassline React App

The React frontend at `/advanced-audio-capture` will connect to this service.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Service health check |
| POST | `/start-session` | Start audio capture session |
| POST | `/stop-session` | Stop session and get results |
| GET | `/realtime-stats` | Get live analysis stats |
| POST | `/save-to-database` | Save results to Supabase |
| GET | `/device-info` | List audio devices |
| POST | `/test-microphone` | Test mic access |

## Analysis Capabilities

### Current (using librosa):
- ✅ **BPM detection** - Tempo estimation
- ✅ **Beat tracking** - Beat positions in time
- ✅ **Onset detection** - Note/event timing
- ✅ **Confidence scoring** - Based on tempo stability
- ✅ **Real-time analysis** - Updates every 500ms

### Potential Future (if BeatNet/madmom work):
- 🔮 **Downbeat detection** - Measure boundaries
- 🔮 **Meter detection** - Time signature analysis
- 🔮 **Zero-latency tracking** - Immediate response
- 🔮 **Advanced rhythm analysis** - Complex patterns

## Troubleshooting

### Audio Issues:
1. **No microphone access**: Check System Preferences → Security & Privacy → Microphone
2. **No audio devices**: Restart the Terminal and try again
3. **Low signal**: Position iPhone closer to Mac microphone

### Library Issues:
- BeatNet/madmom require older Python versions or complex compilation
- librosa provides 80% of the functionality with easier installation
- For production, consider using Docker with pre-compiled libraries

## Integration with Bassline

### Data Flow:
1. **iPhone plays Spotify** → Air gap audio transmission
2. **Mac microphone captures** → Python service processes  
3. **Real-time analysis** → BPM, beats, onsets detected
4. **Results saved** → Supabase `streaming_vendor_attributes` table
5. **Enhanced workout mapping** → More precise PT narrative timing

### Database Schema:
```sql
-- Additional columns for captured audio analysis
ALTER TABLE streaming_vendor_attributes ADD COLUMN 
captured_bpm DECIMAL,
beat_timestamps JSONB,
onset_timestamps JSONB,
confidence_score DECIMAL,
analysis_session_id UUID,
captured_at TIMESTAMP;
```

## Next Steps

1. **Test the basic service** with `./start_server.sh`
2. **Try microphone capture** from the React frontend
3. **Verify audio quality** between iPhone and Mac
4. **Test database integration** with real Supabase credentials
5. **Consider Docker deployment** for production stability