#!/bin/bash

echo "🎵 Starting Bassline Audio Analysis Service..."

# Activate virtual environment
source venv/bin/activate

# Check if required libraries are installed
python3 -c "import librosa, sounddevice, flask, numpy; print('✅ All required libraries installed')" 2>/dev/null || {
    echo "❌ Missing required libraries. Please run:"
    echo "   source venv/bin/activate && pip install librosa sounddevice flask flask-cors numpy scipy"
    exit 1
}

echo "🔍 Checking audio devices..."
python3 -c "
import sounddevice as sd
devices = sd.query_devices()
print('Available audio input devices:')
for i, device in enumerate(devices):
    if device['max_input_channels'] > 0:
        print(f'  {i}: {device[\"name\"]} (channels: {device[\"max_input_channels\"]})')
"

echo ""
echo "🚀 Starting API server on http://localhost:5000"
echo "📱 Make sure your Bassline React app can reach this endpoint"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Start the Flask server
python3 api_server.py