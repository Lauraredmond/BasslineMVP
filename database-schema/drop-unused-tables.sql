-- DROP UNUSED TABLES - Bassline MVP Database Cleanup
-- Created: 2025-09-27
-- Purpose: Remove redundant and unused tables to clean up database schema
--
-- WARNING: This script will permanently delete tables and all their data.
-- ALWAYS backup your database before running this script.
-- Review each table carefully before execution.

-- =============================================================================
-- VERIFICATION SECTION - Run these queries first to check table usage
-- =============================================================================

-- Check which tables have actual data (run this first to verify)
-- UNCOMMENT THE LINES BELOW TO VERIFY TABLE USAGE BEFORE DROPPING:

-- SELECT 'auth_audit_log' as table_name, count(*) as row_count FROM auth_audit_log
-- UNION SELECT 'common_streaming_vendor_analysis_logs', count(*) FROM common_streaming_vendor_analysis_logs
-- UNION SELECT 'community_post_likes', count(*) FROM community_post_likes
-- UNION SELECT 'community_posts', count(*) FROM community_posts
-- UNION SELECT 'session_phase_tracks', count(*) FROM session_phase_tracks
-- UNION SELECT 'shared_playlists', count(*) FROM shared_playlists
-- UNION SELECT 'spotify_track_analysis', count(*) FROM spotify_track_analysis
-- UNION SELECT 'spotify_tracks', count(*) FROM spotify_tracks
-- UNION SELECT 'track_phase_mappings', count(*) FROM track_phase_mappings
-- UNION SELECT 'trainer_multidisciplinary_support', count(*) FROM trainer_multidisciplinary_support
-- UNION SELECT 'trainer_specialized_tags', count(*) FROM trainer_specialized_tags
-- UNION SELECT 'trainer_specialties', count(*) FROM trainer_specialties
-- UNION SELECT 'trainers', count(*) FROM trainers
-- UNION SELECT 'user_follows', count(*) FROM user_follows
-- UNION SELECT 'user_weekly_schedule', count(*) FROM user_weekly_schedule
-- UNION SELECT 'user_workout_plans', count(*) FROM user_workout_plans
-- UNION SELECT 'users', count(*) FROM users
-- UNION SELECT 'workout_sessions', count(*) FROM workout_sessions
-- ORDER BY row_count DESC;

-- =============================================================================
-- TABLES TO KEEP (Core MVP functionality)
-- =============================================================================
-- ✅ streaming_vendor_attributes  - Core BPM/track data (mentioned as populated)
-- ✅ workout_phases              - Core phase definitions (mentioned as populated)
-- ✅ instruction_narratives      - Core PT narratives (mentioned as populated)
-- ✅ playlist_phase_map          - Core track-to-phase locking (Algorithm A)
-- ✅ workout_types               - Referenced by workout_phases
-- ✅ spotify_analysis_logs       - Debug/logging for Spotify integration
-- ✅ spotify_playback_sessions   - Session tracking for playback

-- =============================================================================
-- DROP UNUSED TABLES - Execute with caution
-- =============================================================================

-- Community features (not in MVP scope)
DROP TABLE IF EXISTS community_post_likes CASCADE;
DROP TABLE IF EXISTS community_posts CASCADE;
DROP TABLE IF EXISTS shared_playlists CASCADE;
DROP TABLE IF EXISTS user_follows CASCADE;

-- Trainer/coaching features (not in MVP scope)
DROP TABLE IF EXISTS trainer_multidisciplinary_support CASCADE;
DROP TABLE IF EXISTS trainer_specialized_tags CASCADE;
DROP TABLE IF EXISTS trainer_specialties CASCADE;
DROP TABLE IF EXISTS trainers CASCADE;

-- Advanced user features (not in MVP scope)
DROP TABLE IF EXISTS user_weekly_schedule CASCADE;
DROP TABLE IF EXISTS user_workout_plans CASCADE;
DROP TABLE IF EXISTS workout_sessions CASCADE;

-- Duplicate/redundant tracking tables
DROP TABLE IF EXISTS session_phase_tracks CASCADE;
DROP TABLE IF EXISTS track_phase_mappings CASCADE;

-- Redundant Spotify data tables (covered by streaming_vendor_attributes)
DROP TABLE IF EXISTS spotify_track_analysis CASCADE;
DROP TABLE IF EXISTS spotify_tracks CASCADE;

-- Custom user table (Supabase provides auth.users)
DROP TABLE IF EXISTS users CASCADE;

-- Redundant logging tables
DROP TABLE IF EXISTS auth_audit_log CASCADE;
DROP TABLE IF EXISTS common_streaming_vendor_analysis_logs CASCADE;

-- =============================================================================
-- VERIFICATION - Run after dropping to confirm cleanup
-- =============================================================================

-- Verify remaining tables match core MVP requirements
SELECT table_name, table_schema 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Expected remaining tables:
-- instruction_narratives
-- playlist_phase_map
-- spotify_analysis_logs
-- spotify_playback_sessions
-- streaming_vendor_attributes
-- workout_phases
-- workout_types

COMMIT;