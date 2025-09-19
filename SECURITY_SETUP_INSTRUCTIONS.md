# 🔐 SECURITY SETUP INSTRUCTIONS

## 🚨 IMMEDIATE ACTIONS REQUIRED

### STEP 1: Replace Credentials in Local Files

Update your local environment files with the new credentials you generated:

#### `.env.local` - Replace these values:
```bash
# Replace with your NEW RapidAPI key
VITE_RAPIDAPI_KEY=YOUR_NEW_RAPIDAPI_KEY_HERE

# Replace with your NEW GitHub token  
GITHUB_TOKEN=YOUR_NEW_GITHUB_TOKEN_HERE
```

### STEP 2: Configure Netlify Environment Variables

**CRITICAL:** Never put secrets in frontend environment variables. Configure these in Netlify Dashboard:

1. Go to: https://app.netlify.com/sites/trybassline/settings/deploys
2. Scroll to "Environment variables"
3. Add these SERVER-SIDE ONLY variables:

```bash
# Server-side secrets (NOT prefixed with VITE_)
SPOTIFY_CLIENT_SECRET=your_new_spotify_client_secret
RAPIDAPI_KEY=your_new_rapidapi_key  
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_key
```

### STEP 3: Apply Database Security Fix

Run this SQL in your Supabase SQL Editor:
```sql
-- Copy and paste the entire content of:
-- /database-updates/fix-authentication-security.sql
```

## 🛡️ PERMANENT SECURITY ARCHITECTURE

### Current Problems:
❌ **Spotify client secret in frontend** - Anyone can see this in browser  
❌ **OAuth tokens in localStorage** - Vulnerable to XSS attacks  
❌ **No server-side proxy** - All API calls expose tokens  

### Secure Architecture (Implement Soon):

```
User Browser ↔ Your Frontend ↔ Netlify Functions ↔ Spotify API
                                      ↑
                              (Secrets stored here)
```

#### Phase 1: Move Secrets Server-Side
1. **Remove** `VITE_SPOTIFY_CLIENT_SECRET` entirely
2. **Create** Netlify function for token exchange
3. **Update** OAuth callback to use server-side token handling

#### Phase 2: Secure Token Storage  
1. **Replace** localStorage with HTTP-only cookies
2. **Implement** session-based authentication
3. **Add** CSRF protection

## 🔧 IMPLEMENTATION STEPS

### Quick Fix (This Week):
```typescript
// In src/lib/spotify.ts - Remove client secret usage
// Replace lines that use import.meta.env.VITE_SPOTIFY_CLIENT_SECRET
// with server-side function calls
```

### Proper Fix (Next 2 Weeks):
1. Create `netlify/functions/spotify-auth.ts`
2. Move all token handling server-side  
3. Use Supabase Auth for session management
4. Remove localStorage token storage

## 📝 CHECKLIST BEFORE SHARING APP

- [ ] All credentials rotated
- [ ] Database security fix applied
- [ ] No secrets in frontend environment variables
- [ ] Netlify environment variables configured
- [ ] Server-side token handling implemented
- [ ] localStorage replaced with secure sessions
- [ ] Privacy policy updated

## 🚨 WARNING SIGNS TO WATCH FOR

If you see any of these, STOP and fix immediately:
- `VITE_` prefix on any secret/key/token
- Credentials visible in browser DevTools
- OAuth tokens in localStorage/sessionStorage
- Secrets committed to git (check with `git log --grep="secret"`)

## 📞 GET HELP

If you're unsure about any step:
1. Test on localhost first
2. Never commit secrets to git
3. Use Netlify environment variables for production secrets
4. Ask for help before deploying if uncertain

Remember: **Security is not optional** - implement these fixes before sharing your app publicly.