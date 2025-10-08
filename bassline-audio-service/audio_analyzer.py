#!/usr/bin/env python3
"""
Advanced Audio Analysis Service for Bassline
Uses madmom + librosa for professional-grade real-time audio analysis
"""

import numpy as np
import librosa
import madmom
import sounddevice as sd
import threading
import time
import json
from collections import deque
from typing import Dict, List, Optional, Tuple
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class BasslineAudioAnalyzer:
    def __init__(self, 
                 sample_rate: int = 48000,
                 buffer_size: int = 2048,
                 hop_length: int = 512):
        """
        Initialize the audio analyzer with madmom + librosa
        
        Args:
            sample_rate: Audio sample rate (Hz)
            buffer_size: Audio buffer size for real-time processing
            hop_length: Hop length for analysis
        """
        self.sample_rate = sample_rate
        self.buffer_size = buffer_size
        self.hop_length = hop_length
        self.is_recording = False
        self.audio_buffer = deque(maxlen=sample_rate * 10)  # 10 second buffer
        self.analysis_results = {
            'session_id': None,
            'bpm': None,
            'beats': [],
            'downbeats': [],
            'onsets': [],
            'tempo_history': [],
            'confidence': 0.0,
            'recording_duration': 0.0,
            'analysis_method': 'madmom+librosa'
        }
        self.stream = None
        self.analysis_thread = None
        self.start_time = None
        
        # Initialize madmom processors
        self._init_madmom_processors()

    def _init_madmom_processors(self):
        """Initialize madmom processors for enhanced analysis"""
        try:
            # Check available madmom features
            logger.info(f"madmom version: {madmom.__version__}")
            
            # Beat tracking - try different API versions
            try:
                from madmom.features.beats import RNNBeatProcessor, BeatTrackingProcessor
                self.beat_processor = RNNBeatProcessor()
                self.beat_tracker = BeatTrackingProcessor(fps=100)
                logger.info("✅ Beat processors initialized")
            except (ImportError, AttributeError) as e:
                logger.warning(f"Beat processors failed: {e}")
                self.beat_processor = None
                self.beat_tracker = None
            
            # Downbeat tracking
            try:
                from madmom.features.downbeats import RNNDownBeatProcessor, DBNDownBeatTrackingProcessor
                self.downbeat_processor = RNNDownBeatProcessor()
                self.downbeat_tracker = DBNDownBeatTrackingProcessor(beats_per_bar=4, fps=100)
                logger.info("✅ Downbeat processors initialized")
            except (ImportError, AttributeError) as e:
                logger.warning(f"Downbeat processors failed: {e}")
                self.downbeat_processor = None
                self.downbeat_tracker = None
            
            # Onset detection
            try:
                from madmom.features.onsets import RNNOnsetProcessor, OnsetPeakPickingProcessor
                self.onset_processor = RNNOnsetProcessor()
                self.onset_detector = OnsetPeakPickingProcessor(fps=100)
                logger.info("✅ Onset processors initialized")
            except (ImportError, AttributeError) as e:
                logger.warning(f"Onset processors failed: {e}")
                self.onset_processor = None
                self.onset_detector = None
            
            # Tempo estimation
            try:
                from madmom.features.tempo import TempoEstimationProcessor
                self.tempo_processor = TempoEstimationProcessor(fps=100)
                logger.info("✅ Tempo processor initialized")
            except (ImportError, AttributeError) as e:
                logger.warning(f"Tempo processor failed: {e}")
                self.tempo_processor = None
            
            # Check if any processors were successfully initialized
            if any([self.beat_processor, self.downbeat_processor, self.onset_processor]):
                logger.info("✅ Some madmom processors initialized successfully")
            else:
                logger.warning("❌ No madmom processors available, using librosa only")
            
        except Exception as e:
            logger.warning(f"madmom initialization failed, falling back to librosa: {e}")
            self.beat_processor = None
            self.beat_tracker = None
            self.downbeat_processor = None
            self.downbeat_tracker = None
            self.onset_processor = None
            self.onset_detector = None
            self.tempo_processor = None

    def audio_callback(self, indata, frames, time, status):
        """Callback function for real-time audio input"""
        if status:
            logger.warning(f"Audio callback status: {status}")
        
        # Convert to mono and add to buffer
        mono_audio = np.mean(indata, axis=1) if indata.ndim > 1 else indata.flatten()
        self.audio_buffer.extend(mono_audio)

    def start_capture(self, session_id: str) -> bool:
        """Start real-time audio capture"""
        try:
            self.analysis_results['session_id'] = session_id
            self.start_time = time.time()
            self.is_recording = True
            
            # Start audio stream
            self.stream = sd.InputStream(
                samplerate=self.sample_rate,
                channels=1,
                blocksize=self.buffer_size,
                callback=self.audio_callback,
                dtype=np.float32
            )
            self.stream.start()
            
            # Start analysis thread
            self.analysis_thread = threading.Thread(target=self._analysis_loop)
            self.analysis_thread.start()
            
            logger.info(f"Audio capture started for session: {session_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to start audio capture: {e}")
            return False

    def stop_capture(self) -> Dict:
        """Stop audio capture and return final results"""
        self.is_recording = False
        
        if self.stream:
            self.stream.stop()
            self.stream.close()
            self.stream = None
        
        if self.analysis_thread:
            self.analysis_thread.join(timeout=5.0)
        
        # Final analysis on complete buffer
        if len(self.audio_buffer) > 0:
            self._perform_final_analysis()
        
        logger.info("Audio capture stopped")
        return self.get_results()

    def _analysis_loop(self):
        """Main analysis loop running in separate thread"""
        while self.is_recording:
            try:
                if len(self.audio_buffer) >= self.sample_rate * 2:  # At least 2 seconds
                    self._perform_realtime_analysis()
                time.sleep(0.5)  # Analysis every 500ms
            except Exception as e:
                logger.error(f"Analysis error: {e}")

    def _perform_realtime_analysis(self):
        """Perform real-time audio analysis using madmom + librosa"""
        try:
            # Get recent audio data
            recent_data = np.array(list(self.audio_buffer)[-self.sample_rate * 3:])  # Last 3 seconds
            
            if len(recent_data) < self.sample_rate:
                return
            
            # Update recording duration
            self.analysis_results['recording_duration'] = time.time() - self.start_time
            current_time_offset = time.time() - self.start_time
            
            # Use madmom if available, fallback to librosa
            if self.beat_processor is not None:
                self._madmom_analysis(recent_data, current_time_offset)
            else:
                self._librosa_analysis(recent_data, current_time_offset)
            
            # Update confidence based on tempo stability
            self._update_confidence()
            
        except Exception as e:
            logger.error(f"Real-time analysis error: {e}")

    def _madmom_analysis(self, audio_data: np.ndarray, time_offset: float):
        """Enhanced analysis using madmom algorithms"""
        try:
            # Beat detection with madmom's superior RNN-based algorithm
            if self.beat_processor and self.beat_tracker:
                beat_activations = self.beat_processor(audio_data)
                beats = self.beat_tracker(beat_activations)
                
                if len(beats) > 0:
                    # Convert to time and adjust offset
                    beat_times = beats + (time_offset - 3.0)
                    self.analysis_results['beats'].extend([float(t) for t in beat_times if t > 0])
                    
                    # Estimate BPM from beat intervals
                    if len(beats) > 1:
                        intervals = np.diff(beats)
                        if len(intervals) > 0:
                            avg_interval = np.median(intervals)
                            bpm = 60.0 / avg_interval if avg_interval > 0 else 0
                            self.analysis_results['bpm'] = float(bpm)
                            self.analysis_results['tempo_history'].append({
                                'timestamp': time_offset,
                                'bpm': float(bpm)
                            })

            # Downbeat detection (measure boundaries)
            if self.downbeat_processor and self.downbeat_tracker:
                downbeat_activations = self.downbeat_processor(audio_data)
                downbeats = self.downbeat_tracker(downbeat_activations)
                
                if len(downbeats) > 0:
                    downbeat_times = downbeats + (time_offset - 3.0)
                    self.analysis_results['downbeats'].extend([float(t) for t in downbeat_times if t > 0])

            # Onset detection with madmom's RNN
            if self.onset_processor and self.onset_detector:
                onset_activations = self.onset_processor(audio_data)
                onsets = self.onset_detector(onset_activations)
                
                if len(onsets) > 0:
                    onset_times = onsets + (time_offset - 3.0)
                    self.analysis_results['onsets'].extend([float(t) for t in onset_times if t > 0])

        except Exception as e:
            logger.warning(f"madmom analysis error, falling back to librosa: {e}")
            self._librosa_analysis(audio_data, time_offset)

    def _librosa_analysis(self, audio_data: np.ndarray, time_offset: float):
        """Fallback analysis using librosa"""
        try:
            # Tempo and beat tracking
            tempo, beats = librosa.beat.beat_track(
                y=audio_data,
                sr=self.sample_rate,
                hop_length=self.hop_length,
                units='time'
            )
            
            if tempo > 0:
                self.analysis_results['bpm'] = float(tempo)
                self.analysis_results['tempo_history'].append({
                    'timestamp': time_offset,
                    'bpm': float(tempo)
                })
            
            if len(beats) > 0:
                beat_times = beats + (time_offset - 3.0)
                self.analysis_results['beats'].extend([float(t) for t in beat_times if t > 0])
            
            # Onset detection
            onsets = librosa.onset.onset_detect(
                y=audio_data,
                sr=self.sample_rate,
                hop_length=self.hop_length,
                units='time'
            )
            
            if len(onsets) > 0:
                onset_times = onsets + (time_offset - 3.0)
                self.analysis_results['onsets'].extend([float(t) for t in onset_times if t > 0])
                
        except Exception as e:
            logger.error(f"librosa analysis error: {e}")

    def _update_confidence(self):
        """Update confidence score based on tempo stability and detection consistency"""
        try:
            confidence_factors = []
            
            # Tempo stability (40% weight)
            if len(self.analysis_results['tempo_history']) > 3:
                recent_tempos = [h['bpm'] for h in self.analysis_results['tempo_history'][-5:]]
                tempo_std = np.std(recent_tempos)
                tempo_confidence = max(0.0, min(1.0, 1.0 - (tempo_std / 15.0)))
                confidence_factors.append(tempo_confidence * 0.4)
            
            # Beat detection consistency (30% weight)
            if len(self.analysis_results['beats']) > 4:
                recent_beats = self.analysis_results['beats'][-10:]
                if len(recent_beats) > 1:
                    intervals = np.diff(recent_beats)
                    interval_std = np.std(intervals)
                    beat_confidence = max(0.0, min(1.0, 1.0 - (interval_std / 0.3)))
                    confidence_factors.append(beat_confidence * 0.3)
            
            # Onset detection rate (30% weight)
            if self.analysis_results['recording_duration'] > 2.0:
                onset_rate = len(self.analysis_results['onsets']) / self.analysis_results['recording_duration']
                # Expect 1-10 onsets per second for music
                onset_confidence = max(0.0, min(1.0, min(onset_rate / 5.0, 2.0 - onset_rate / 5.0)))
                confidence_factors.append(onset_confidence * 0.3)
            
            # Calculate overall confidence
            if confidence_factors:
                self.analysis_results['confidence'] = sum(confidence_factors)
            
        except Exception as e:
            logger.error(f"Confidence calculation error: {e}")

    def _perform_final_analysis(self):
        """Perform final analysis on complete audio buffer"""
        try:
            audio_data = np.array(list(self.audio_buffer))
            
            # Comprehensive tempo analysis
            tempo, beats = librosa.beat.beat_track(
                y=audio_data,
                sr=self.sample_rate,
                hop_length=self.hop_length,
                units='time'
            )
            
            if tempo > 0:
                self.analysis_results['bpm'] = float(tempo)
            
            # Final beat positions
            self.analysis_results['beats'] = [float(t) for t in beats]
            
            # Final onset detection
            onsets = librosa.onset.onset_detect(
                y=audio_data,
                sr=self.sample_rate,
                hop_length=self.hop_length,
                units='time'
            )
            self.analysis_results['onsets'] = [float(t) for t in onsets]
            
            # Calculate final confidence
            if len(self.analysis_results['tempo_history']) > 0:
                all_tempos = [h['bpm'] for h in self.analysis_results['tempo_history']]
                tempo_std = np.std(all_tempos)
                self.analysis_results['confidence'] = max(0.0, min(1.0, 1.0 - (tempo_std / 15.0)))
            
            logger.info(f"Final analysis complete: BPM={self.analysis_results['bpm']:.1f}, "
                       f"Beats={len(self.analysis_results['beats'])}, "
                       f"Confidence={self.analysis_results['confidence']:.2f}")
            
        except Exception as e:
            logger.error(f"Final analysis error: {e}")

    def get_results(self) -> Dict:
        """Get current analysis results"""
        return self.analysis_results.copy()

    def get_realtime_stats(self) -> Dict:
        """Get real-time statistics for UI updates"""
        return {
            'session_id': self.analysis_results['session_id'],
            'bpm': self.analysis_results['bpm'],
            'beat_count': len(self.analysis_results['beats']),
            'downbeat_count': len(self.analysis_results['downbeats']),
            'onset_count': len(self.analysis_results['onsets']),
            'confidence': self.analysis_results['confidence'],
            'recording_duration': self.analysis_results['recording_duration'],
            'analysis_method': self.analysis_results['analysis_method'],
            'is_recording': self.is_recording
        }

    def save_to_supabase(self, track_name: str, artist: str, spotify_id: Optional[str] = None):
        """Save analysis results to Supabase database"""
        try:
            from supabase import create_client, Client
            import os
            
            # This would use your Supabase credentials
            # For now, just log the data that would be saved
            save_data = {
                'session_id': self.analysis_results['session_id'],
                'track_name': track_name,
                'artist': artist,
                'spotify_id': spotify_id,
                'captured_bpm': self.analysis_results['bpm'],
                'beat_timestamps': self.analysis_results['beats'],
                'downbeat_timestamps': self.analysis_results['downbeats'],
                'onset_timestamps': self.analysis_results['onsets'],
                'confidence_score': self.analysis_results['confidence'],
                'recording_duration': self.analysis_results['recording_duration'],
                'analysis_method': self.analysis_results['analysis_method'],
                'tempo_history': self.analysis_results['tempo_history'],
                'captured_at': time.strftime('%Y-%m-%d %H:%M:%S')
            }
            
            logger.info(f"Would save to Supabase: {json.dumps(save_data, indent=2)}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to save to Supabase: {e}")
            return False


def main():
    """Test the audio analyzer"""
    analyzer = BasslineAudioAnalyzer()
    
    print("Bassline Audio Analyzer Test")
    print("Press Enter to start recording...")
    input()
    
    session_id = f"test_session_{int(time.time())}"
    analyzer.start_capture(session_id)
    
    print("Recording... Press Enter to stop")
    input()
    
    results = analyzer.stop_capture()
    print("\nAnalysis Results:")
    print(json.dumps(results, indent=2))

if __name__ == "__main__":
    main()