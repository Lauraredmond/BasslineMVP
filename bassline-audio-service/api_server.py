#!/usr/bin/env python3
"""
Flask API Server for Bassline Audio Analysis
Provides REST endpoints for the React frontend
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import threading
import time
import json
import logging
from audio_analyzer import BasslineAudioAnalyzer

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)  # Enable CORS for React frontend

# Global analyzer instance
analyzer = None
analyzer_lock = threading.Lock()

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'bassline-audio-analyzer',
        'timestamp': time.time()
    })

@app.route('/start-session', methods=['POST'])
def start_session():
    """Start a new audio analysis session"""
    global analyzer
    
    try:
        data = request.get_json()
        session_id = data.get('session_id')
        
        if not session_id:
            return jsonify({'error': 'session_id required'}), 400
        
        with analyzer_lock:
            if analyzer and analyzer.is_recording:
                return jsonify({'error': 'Session already running'}), 409
            
            analyzer = BasslineAudioAnalyzer()
            success = analyzer.start_capture(session_id)
            
            if success:
                return jsonify({
                    'status': 'started',
                    'session_id': session_id,
                    'message': 'Audio capture started successfully'
                })
            else:
                return jsonify({'error': 'Failed to start audio capture'}), 500
                
    except Exception as e:
        logger.error(f"Error starting session: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/stop-session', methods=['POST'])
def stop_session():
    """Stop the current audio analysis session"""
    global analyzer
    
    try:
        with analyzer_lock:
            if not analyzer or not analyzer.is_recording:
                return jsonify({'error': 'No active session'}), 400
            
            results = analyzer.stop_capture()
            
            return jsonify({
                'status': 'stopped',
                'results': results,
                'message': 'Audio capture stopped successfully'
            })
            
    except Exception as e:
        logger.error(f"Error stopping session: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/realtime-stats', methods=['GET'])
def get_realtime_stats():
    """Get real-time analysis statistics with enhanced madmom data"""
    global analyzer
    
    try:
        with analyzer_lock:
            if not analyzer:
                return jsonify({'error': 'No analyzer instance'}), 400
            
            stats = analyzer.get_realtime_stats()
            
            # Add processor status for debugging
            stats['processors'] = {
                'madmom_beats': analyzer.beat_processor is not None,
                'madmom_downbeats': analyzer.downbeat_processor is not None,
                'madmom_onsets': analyzer.onset_processor is not None,
                'madmom_tempo': analyzer.tempo_processor is not None
            }
            
            return jsonify(stats)
            
    except Exception as e:
        logger.error(f"Error getting stats: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/session-results', methods=['GET'])
def get_session_results():
    """Get current session results"""
    global analyzer
    
    try:
        with analyzer_lock:
            if not analyzer:
                return jsonify({'error': 'No analyzer instance'}), 400
            
            results = analyzer.get_results()
            return jsonify(results)
            
    except Exception as e:
        logger.error(f"Error getting results: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/save-to-database', methods=['POST'])
def save_to_database():
    """Save analysis results to Supabase"""
    global analyzer
    
    try:
        data = request.get_json()
        track_name = data.get('track_name')
        artist = data.get('artist')
        spotify_id = data.get('spotify_id')
        
        if not track_name or not artist:
            return jsonify({'error': 'track_name and artist required'}), 400
        
        with analyzer_lock:
            if not analyzer:
                return jsonify({'error': 'No analyzer instance'}), 400
            
            success = analyzer.save_to_supabase(track_name, artist, spotify_id)
            
            if success:
                return jsonify({
                    'status': 'saved',
                    'message': 'Analysis results saved successfully'
                })
            else:
                return jsonify({'error': 'Failed to save to database'}), 500
                
    except Exception as e:
        logger.error(f"Error saving to database: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/device-info', methods=['GET'])
def get_device_info():
    """Get audio device information"""
    try:
        import sounddevice as sd
        
        devices = sd.query_devices()
        default_input = sd.default.device[0]
        default_output = sd.default.device[1]
        
        return jsonify({
            'devices': [
                {
                    'id': i,
                    'name': device['name'],
                    'channels': device['max_input_channels'],
                    'sample_rate': device['default_samplerate']
                }
                for i, device in enumerate(devices)
                if device['max_input_channels'] > 0
            ],
            'default_input': default_input,
            'default_output': default_output
        })
        
    except Exception as e:
        logger.error(f"Error getting device info: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/test-microphone', methods=['POST'])
def test_microphone():
    """Test microphone access and basic functionality"""
    try:
        import sounddevice as sd
        import numpy as np
        
        duration = 2.0  # Test for 2 seconds
        sample_rate = 48000
        
        logger.info("Testing microphone access...")
        audio_data = sd.rec(int(duration * sample_rate), 
                           samplerate=sample_rate, 
                           channels=1,
                           dtype=np.float32)
        sd.wait()
        
        # Basic analysis
        max_amplitude = float(np.max(np.abs(audio_data)))
        rms_level = float(np.sqrt(np.mean(audio_data**2)))
        
        return jsonify({
            'status': 'success',
            'duration': duration,
            'max_amplitude': max_amplitude,
            'rms_level': rms_level,
            'has_signal': max_amplitude > 0.001,
            'message': 'Microphone test completed'
        })
        
    except Exception as e:
        logger.error(f"Microphone test error: {e}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    print("Starting Bassline Audio Analysis API Server...")
    print("Endpoints available:")
    print("  GET  /health")
    print("  POST /start-session")
    print("  POST /stop-session")
    print("  GET  /realtime-stats")
    print("  GET  /session-results")
    print("  POST /save-to-database")
    print("  GET  /device-info")
    print("  POST /test-microphone")
    print("\nServer starting on http://localhost:5001")

    app.run(host='0.0.0.0', port=5001, debug=True)