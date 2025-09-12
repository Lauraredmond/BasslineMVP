-- AUTHENTICATION SECURITY FIX - Remove Spotify Tokens from Database
-- This addresses critical security vulnerabilities with storing OAuth tokens

-- ⚠️  CRITICAL: This will log out all users - they will need to re-authenticate
-- ⚠️  Run during maintenance window when users are not actively using the app

-- STEP 1: Remove sensitive OAuth token columns from users table
-- These tokens should NEVER be stored in the database
ALTER TABLE users DROP COLUMN IF EXISTS spotify_access_token;
ALTER TABLE users DROP COLUMN IF EXISTS spotify_refresh_token;

-- STEP 2: Add secure user identification instead
-- Only store non-sensitive Spotify identifiers for user matching
ALTER TABLE users ADD COLUMN IF NOT EXISTS spotify_user_id VARCHAR(255) UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS login_count INTEGER DEFAULT 0;

-- STEP 3: Update users table RLS policy to be more restrictive
-- Users should only access their own records, never see tokens of others
DROP POLICY IF EXISTS "users_policy" ON users;
CREATE POLICY "users_secure_policy" ON users
    FOR ALL TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- STEP 4: Create audit log for authentication events (optional but recommended)
CREATE TABLE IF NOT EXISTS auth_audit_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL, -- 'login', 'logout', 'token_refresh', 'token_expired'
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on audit log
ALTER TABLE auth_audit_log ENABLE ROW LEVEL SECURITY;

-- Users can only see their own audit logs
CREATE POLICY "auth_audit_secure" ON auth_audit_log
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

-- STEP 5: Remove any existing user records with exposed tokens
-- This is a safety measure - all users will need to re-authenticate
DELETE FROM users WHERE spotify_access_token IS NOT NULL OR spotify_refresh_token IS NOT NULL;

-- STEP 6: Add performance indexes
CREATE INDEX IF NOT EXISTS idx_users_spotify_id ON users(spotify_user_id);
CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login);
CREATE INDEX IF NOT EXISTS idx_auth_audit_user ON auth_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_audit_event_time ON auth_audit_log(event_type, created_at);

-- STEP 7: Update table permissions
GRANT ALL ON auth_audit_log TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Verification query - should return 0 for both token columns
SELECT 
    COUNT(*) as users_with_access_tokens,
    (SELECT COUNT(*) FROM users WHERE spotify_refresh_token IS NOT NULL) as users_with_refresh_tokens,
    (SELECT COUNT(*) FROM users) as total_users
FROM users 
WHERE spotify_access_token IS NOT NULL;

-- Log completion
DO $$
BEGIN
    RAISE NOTICE '🔐 AUTHENTICATION SECURITY FIX COMPLETED';
    RAISE NOTICE '✅ Removed OAuth token storage from database';  
    RAISE NOTICE '✅ Enhanced user table RLS policies';
    RAISE NOTICE '✅ Added authentication audit logging';
    RAISE NOTICE '⚠️  ALL USERS LOGGED OUT - They must re-authenticate';
    RAISE NOTICE '📋 Update frontend code to use session-based auth only';
END $$;