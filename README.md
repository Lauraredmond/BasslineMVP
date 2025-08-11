# Bassline - Music-Powered Fitness MVP

A production-quality React Native app that creates personalized spinning workouts synchronized to your Spotify playlists, featuring intelligent track matching and real-time instructor cues.

## 🎵 Features

### Core Functionality
- **Spotify Integration**: OAuth with PKCE, playlist selection, and playback control
- **Smart Track Matching**: AI-powered algorithm matches songs to spinning phases using audio features
- **Intelligent Instructor Cues**: Narrative engine provides real-time coaching based on music analysis
- **7-Phase Spinning Workouts**: Warm up → Sprint → Hills → Resistance → Jumps → Climb → Cool down
- **Text-to-Speech**: Optional voice cues during workouts

### Privacy & Compliance
- **PII Tokenization**: Advanced tokenization vault for sensitive data
- **GDPR Compliance**: PII aging reports, ROPA generation, and DSAR exports
- **Data Transparency**: Complete audit trail and user data control

### User Experience
- **Spotify Connect**: Seamless integration with active Spotify devices
- **Progress Tracking**: Real-time phase timers and workout progress
- **Adaptive Cues**: Music-synchronized coaching that responds to song structure
- **Modern UI**: Lovable-inspired design with maroon/cream theme

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Expo CLI
- Spotify Developer Account
- Spotify Premium (required for playback control)

### Spotify Developer Setup

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Create a new app
3. Add redirect URIs:
   - `bassline://auth/callback` (mobile)
   - `http://localhost:19006/auth/callback` (Expo web)
   - `exp://localhost:19000/auth/callback` (Expo development)

### Installation

1. **Clone and install dependencies:**
```bash
git clone <repository>
cd bassline

# Install server dependencies
cd server
yarn install

# Install app dependencies  
cd ../app
yarn install
```

2. **Configure environment variables:**

Server (`.env`):
```bash
cp .env.example .env
# Edit .env with your Spotify credentials
```

Mobile app (`.env`):
```bash
cp ../env/mobile.example.env .env
# Edit .env with your Spotify client ID
```

3. **Start the development servers:**

```bash
# Terminal 1 - Start the auth server
cd server
yarn dev

# Terminal 2 - Start the mobile app
cd app  
yarn start
```

4. **Running the app:**
- iOS Simulator: Press `i`
- Android Emulator: Press `a` 
- Expo Go: Scan QR code with phone

## 🏗️ Architecture

### Mobile App (`/app`)
- **React Native + Expo**: Cross-platform mobile development
- **TypeScript**: Full type safety
- **Zustand**: State management
- **React Navigation**: Navigation and routing

### Authentication Server (`/server`)
- **Node.js + Express**: OAuth callback handling
- **PKCE Security**: Authorization Code with Proof Key
- **Token Management**: Secure token exchange and refresh

### Key Libraries
- `expo-auth-session`: OAuth flows
- `expo-secure-store`: Encrypted token storage
- `expo-speech`: Text-to-speech functionality
- `zustand`: Lightweight state management

## 🎯 Core Systems

### Track Scoring Algorithm
The app uses a sophisticated scoring system to match tracks to workout phases:

```typescript
// Factors considered:
- BPM matching (with double-time detection for sprints)
- Energy levels for intensity phases  
- Danceability for rhythm-based phases
- Loudness for driving sections
- Valence for motivation
- Family-friendly content filtering
```

### Narrative Engine
Real-time coaching cues triggered by:
- **Musical Structure**: Verses, choruses, bridges detected from audio analysis
- **Time Intervals**: Bar-based cuing (every 2-4 bars)
- **Intensity Changes**: Section transitions and dynamics
- **Phase-Specific Logic**: Tailored instructions for each workout phase

### Privacy Vault
- **Tokenization**: PII replaced with secure tokens
- **Audit Logs**: Complete access history
- **Age Tracking**: Data retention compliance
- **Export Tools**: GDPR-compliant data access

## 📱 Screen Flow

1. **Home**: Hero image with CTA buttons
2. **Design Your Routine**: Choose plan creation or trainer
3. **Create Regular Plan**: Select workout days
4. **Personal Trainers**: Intake form and recommendations  
5. **Sync to Your Playlist**: Spotify integration
6. **Privacy & Compliance**: Data transparency hub
7. **Player**: Real-time workout with cues

## 🔧 Development

### Project Structure
```
bassline/
├── app/                    # React Native app
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── screens/        # Screen components
│   │   ├── lib/            # Core logic & utilities
│   │   ├── state/          # State management
│   │   └── data/           # Static data
│   └── App.tsx             # Main app component
├── server/                 # Authentication server
│   ├── index.ts            # Express server
│   └── spotifyAuth.ts      # OAuth handlers
└── README.md
```

### Key Files
- `phases.ts`: Spinning workout phase definitions
- `scoring.ts`: Track matching algorithm  
- `narrativeEngine.ts`: Real-time cue generation
- `spotify.ts`: Spotify API integration
- `privacy.ts`: GDPR compliance tools
- `theme.ts`: Design system

## 🎵 Spotify Integration

### Required Scopes
- `user-read-email`: User profile access
- `playlist-read-private`: Access to user playlists
- `user-read-playback-state`: Current playback info
- `user-modify-playback-state`: Playback control

### Device Requirements
- Spotify Premium account
- Active device (phone, computer, speaker)
- Internet connection for API calls

### Troubleshooting
**"No active device" error:**
1. Open Spotify on any device
2. Press play on any song
3. Return to Bassline app
4. Your device should now be available

## 🔒 Security & Privacy

### Data Protection
- Client secrets never stored in mobile app
- Tokens encrypted in secure storage
- PII tokenization with audit trails
- Optional data export and deletion

### GDPR Compliance
- **Right to Access**: Full DSAR export
- **Right to Rectification**: Data modification tools
- **Right to Erasure**: Complete data deletion
- **Data Portability**: JSON export format

## 🧪 Testing

```bash
# Run mobile app tests
cd app
yarn test

# Run server tests  
cd server
yarn test
```

## 📊 Music Analysis

The app analyzes tracks using Spotify's Audio Features and Audio Analysis:

### Audio Features Used
- **Tempo**: BPM matching for workout phases
- **Energy**: High-intensity vs recovery matching
- **Danceability**: Rhythm-based exercises
- **Valence**: Musical positivity for motivation
- **Loudness**: Dynamic sections and build-ups

### Cue Generation
- **Bar Detection**: 4/4 time signature assumed
- **Section Analysis**: Verse/chorus identification
- **Dynamic Changes**: Volume/intensity transitions
- **Fallback Timing**: Mathematical intervals when analysis unavailable

## 🚀 Production Deployment

### Mobile App
1. Configure production Spotify app
2. Update redirect URIs for app stores
3. Build with `expo build:ios` / `expo build:android`
4. Submit to App Store / Google Play

### Server
1. Deploy to production server (Railway, Heroku, etc.)
2. Configure production environment variables
3. Set up HTTPS for OAuth callback
4. Update mobile app with production server URL

## 🐛 Common Issues

### Authentication Problems
- Verify Spotify Developer app configuration
- Check redirect URI matches exactly
- Ensure Spotify Premium account

### Playback Issues  
- Confirm active Spotify device
- Check internet connection
- Verify playback permissions

### Build Errors
- Clear Expo cache: `expo r -c`
- Reinstall dependencies: `rm -rf node_modules && yarn install`

## 📋 Requirements Met

✅ **Spotify Authentication**: Authorization Code + PKCE with server-side token exchange  
✅ **Playlist & Playback**: Full Spotify Connect integration  
✅ **7-Phase Spinning**: Complete workout structure with BPM matching  
✅ **Audio Analysis**: Track scoring with double-time detection  
✅ **Narrative Engine**: Real-time cues with TTS support  
✅ **Privacy Compliance**: PII tokenization, ROPA, DSAR exports  
✅ **UI/UX**: Matches Lovable wireframes with responsive design  
✅ **Production Ready**: TypeScript, error handling, accessibility  

## 🤔 FAQ

**Do I need my old Spotify secret dev key?**  
Yes! Use your Client ID in the mobile app, but keep the Client Secret on the server only. Never ship the secret with your app.

**Why is Spotify Premium required?**  
Spotify's Web Playback SDK and remote control features require Premium subscriptions.

**Can I use other music services?**  
The architecture supports it - Apple Music and YouTube Music integration points are built but not implemented.

## 🎉 Ready to Spin!

Your production-quality Bassline MVP is ready to transform fitness through the power of music. The app intelligently matches your playlists to workout phases while providing real-time coaching - all with enterprise-grade privacy protection.

Start your musical fitness journey today! 🎵💪