# CyberX - Cybersecurity Awareness App Plan

## Project Overview

**Purpose**: Educational demonstration app for student fair showcasing cybersecurity risks and data privacy awareness through interactive, real-time demonstrations.

**Key Message**: Demonstrate how quickly personal data (credentials, biometric data) can be accessed when users grant permissions to untrusted applications.

**Important Disclaimers**:
- All users must provide informed consent before participation
- Data collected is for educational purposes only
- All data is processed locally/in front of the user
- No data will be used for illegal purposes
- All data will be deleted after the event/demonstration

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Vite + React + TypeScript |
| **Styling** | Tailwind CSS |
| **Backend** | Hono.js (Cloudflare Workers) |
| **Database** | SQLite (D1 - Cloudflare) |
| **Deployment** | Wrangler (Cloudflare) |
| **Media Capture** | Web APIs (Camera, Microphone) |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                   Frontend (Vite-React)                  │
│  ┌────────────────────────────────────────────────────┐ │
│  │ Landing Page | Consent Page | Demo Pages | Admin  │ │
│  │ (Routes handled by React Router)                  │ │
│  └────────────────────────────────────────────────────┘ │
└──────────────────┬──────────────────────────────────────┘
                   │ (HTTPS API Calls)
                   ↓
┌─────────────────────────────────────────────────────────┐
│              Backend (Hono + Cloudflare Workers)         │
│  ┌────────────────────────────────────────────────────┐ │
│  │ Auth Routes | Data Routes | Media Routes | Admin   │ │
│  └────────────────────────────────────────────────────┘ │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ↓
         ┌─────────────────────┐
         │   SQLite D1         │
         │  (Cloudflare)       │
         └─────────────────────┘
```

---

## Pages & Features

### 1. **Landing Page** (`/`)
- **Purpose**: Welcome screen and entry point
- **Components**:
  - App logo and title
  - Tagline: "Learn how quickly your data can be accessed"
  - Grid of available demo apps (Instagram, Facebook, Twitter, etc.)
  - "Admin Dashboard Login" button (top-right)
  - Disclaimer banner with informed consent checkbox
  - "Start Demo" button (disabled until consent checked)

- **Behavior**:
  - If consent not checked, show warning and redirect to consent page
  - Display available demo modules as cards
  - Each card shows app icon and name
  - Clicking a card navigates to that specific demo

---

### 2. **Consent & Permissions Page** (`/permissions`)
- **Purpose**: Explicit user consent + request media permissions
- **Sections**:

  **A. Consent Form**
  - Checkbox: "I understand this is an educational demonstration"
  - Checkbox: "I consent to capture photos and audio"
  - Checkbox: "I agree this data will be processed live and deleted after"
  - Button: "Grant Permissions" (only enabled when all checked)

  **B. Permission Requests**
  - Request camera access with visual indicator
  - Request microphone access with visual indicator
  - Show real-time status: "Waiting for permission..." → "✓ Granted" / "✗ Denied"
  - Display live camera preview once granted
  - Display microphone level meter once granted

  **C. Photo Capture Setup**
  - Inform: "1 photo will be captured every 1 second"
  - Show countdown: "Session will run for X minutes"
  - "Start Session" button

- **Technical Details**:
  - Store consent in session storage (not persistent)
  - Generate unique session ID for this user
  - Start background photo capture (Canvas API)
  - Stream audio to backend via WebRTC/WebSocket

---

### 3. **Instagram Login Clone** (`/demo/instagram`)
- **Purpose**: Demonstrate credential harvesting
- **UI Components**:
  - Exact Instagram login page clone
  - Email/Phone field
  - Password field
  - "Log In" button
  - "Forgot password?" link
  - Sign-up section

- **Behavior**:
  - On "Log In" click:
    - Capture screenshot of user's face (from permissions page camera)
    - Send credentials to backend
    - Show error message: "Login failed. Check your connection."
    - Educate: "Your credentials were just captured and sent. This is why strong passwords matter."
    - Display what data was collected

- **Backend Flow**:
  - Endpoint: `POST /api/demo/instagram/login`
  - Store: username, password, timestamp, session_id, photo_id
  - Log: Client IP, user agent, demo type

---

### 4. **Facebook Login Clone** (`/demo/facebook`)
- **Purpose**: Similar to Instagram, but Facebook-styled
- **UI Components**:
  - Facebook login page replica
  - Email field
  - Password field
  - Checkbox for "Keep me logged in"
  - "Log In" button

- **Behavior**: Identical to Instagram demo
- **Backend**: Separate endpoint `POST /api/demo/facebook/login`

---

### 5. **Twitter Login Clone** (`/demo/twitter`)
- **Purpose**: Twitter-styled credential capture
- **UI Components**:
  - Twitter/X login page
  - Email/username field
  - Password field
  - "Sign In" button

- **Behavior**: Identical flow
- **Backend**: Separate endpoint `POST /api/demo/twitter/login`

---

### 6. **Additional Social Media Clones**
- Follow same pattern for:
  - LinkedIn
  - Gmail/Google
  - Microsoft/Outlook
  - TikTok

---

### 7. **Admin Dashboard** (`/admin`)
- **Purpose**: Monitoring and data review
- **Access Control**:
  - Protected route requiring password
  - Use simple JWT or session-based auth
  - Password stored in environment variable / backend config

- **Admin Features**:
  
  **A. Real-Time Monitor**
  - Live feed of active sessions
  - Show currently running demonstrations
  - Active camera feeds (with visual indicator they're being recorded)
  - Audio level meters for active microphones
  - Real-time photo count

  **B. Collected Data Dashboard**
  - Table of all credentials captured
  - Columns: Demo Type | Email/Username | Password | Timestamp | Session | Photo Count | Audio Duration
  - Filter by: Date, Demo Type, Session Status
  - Search functionality

  **C. Media Gallery**
  - Grid view of captured photos
  - Thumbnail preview
  - View full photo with metadata (timestamp, user session)
  - Download/export options

  **D. Audio Playback**
  - List of audio recordings
  - Duration, timestamp
  - Play audio clips
  - Download options

  **E. Analytics**
  - Total sessions today
  - Credentials captured by type
  - Average permission grant time
  - Most "popular" demo
  - Graph of activity over time

  **F. Data Management**
  - "Delete All Session Data" button
  - Confirmation dialog
  - Option to export data before deletion
  - Audit log of deletions

---

## Database Schema

### Users / Sessions Table
```sql
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  status TEXT DEFAULT 'active', -- active, completed, abandoned
  consent_given BOOLEAN DEFAULT 0,
  camera_permission BOOLEAN DEFAULT 0,
  microphone_permission BOOLEAN DEFAULT 0,
  photo_count INTEGER DEFAULT 0,
  audio_duration_ms INTEGER DEFAULT 0,
  client_ip TEXT,
  user_agent TEXT
);
```

### Credentials Captured Table
```sql
CREATE TABLE credentials_captured (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  demo_type TEXT NOT NULL, -- instagram, facebook, twitter, etc.
  email_or_username TEXT NOT NULL,
  password TEXT NOT NULL,
  captured_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  photo_id TEXT,
  FOREIGN KEY (session_id) REFERENCES sessions(id)
);
```

### Photos Table
```sql
CREATE TABLE photos (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  capture_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  image_data BLOB, -- or store path to S3/R2
  metadata TEXT, -- JSON with dimensions, size, etc.
  FOREIGN KEY (session_id) REFERENCES sessions(id)
);
```

### Audio Recordings Table
```sql
CREATE TABLE audio_recordings (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  recording_data BLOB, -- WAV/WebM data
  duration_ms INTEGER,
  started_at DATETIME,
  ended_at DATETIME,
  FOREIGN KEY (session_id) REFERENCES sessions(id)
);
```

### Admin Audit Log Table
```sql
CREATE TABLE admin_audit_log (
  id TEXT PRIMARY KEY,
  admin_user TEXT,
  action TEXT, -- viewed_data, exported_data, deleted_data, etc.
  target_table TEXT,
  target_count INTEGER,
  action_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  notes TEXT
);
```

---

## API Endpoints

### Authentication
- `POST /api/auth/login` - Admin login
- `POST /api/auth/verify` - Verify session token

### Sessions & Permissions
- `POST /api/sessions/create` - Create new session
- `POST /api/sessions/:id/consent` - Record consent
- `POST /api/sessions/:id/permissions` - Record permission grants
- `GET /api/sessions/:id/status` - Get session status

### Demo Demos
- `POST /api/demo/instagram/login` - Capture Instagram login
- `POST /api/demo/facebook/login` - Capture Facebook login
- `POST /api/demo/twitter/login` - Capture Twitter login
- `POST /api/demo/linkedin/login` - Capture LinkedIn login
- `POST /api/demo/gmail/login` - Capture Gmail login
- *(Pattern continues for each social media)*

### Media Upload
- `POST /api/media/photos` - Upload photo
  - Body: `{ session_id, photo_data (base64), timestamp }`
- `POST /api/media/audio/chunk` - Upload audio chunk
  - Body: `{ session_id, audio_data (base64), chunk_index }`

### Admin Routes (Protected)
- `GET /api/admin/sessions` - List all sessions with filters
- `GET /api/admin/sessions/:id` - Get session details
- `GET /api/admin/credentials` - List captured credentials
- `GET /api/admin/photos/:session_id` - Get photos for session
- `GET /api/admin/audio/:session_id` - Get audio for session
- `GET /api/admin/analytics` - Get analytics data
- `DELETE /api/admin/sessions/:id` - Delete session data
- `DELETE /api/admin/all-data` - Delete all data (requires confirmation)
- `POST /api/admin/export` - Export data as JSON/CSV

---

## Frontend Structure

```
frontend/src/
├── pages/
│   ├── Landing.tsx          # Landing page
│   ├── Permissions.tsx      # Consent & permission request
│   ├── DemoPage.tsx         # Base for demo pages
│   ├── demos/
│   │   ├── InstagramLogin.tsx
│   │   ├── FacebookLogin.tsx
│   │   ├── TwitterLogin.tsx
│   │   ├── LinkedInLogin.tsx
│   │   └── ...
│   └── admin/
│       ├── AdminLogin.tsx
│       ├── AdminDashboard.tsx
│       ├── RealTimeMonitor.tsx
│       ├── DataGallery.tsx
│       └── Analytics.tsx
├── components/
│   ├── ConsentForm.tsx
│   ├── CameraPreview.tsx
│   ├── MicrophoneLevel.tsx
│   ├── PhotoGrid.tsx
│   ├── CredentialsTable.tsx
│   └── ConfirmationDialog.tsx
├── hooks/
│   ├── useCamera.ts         # Camera capture logic
│   ├── useMicrophone.ts     # Microphone capture logic
│   ├── useSession.ts        # Session management
│   └── useAdmin.ts          # Admin auth logic
├── utils/
│   ├── api.ts               # API calls
│   ├── mediaCapture.ts      # Canvas/WebRTC logic
│   └── sessionStorage.ts    # Local session state
├── styles/
│   └── globals.css          # Tailwind + custom styles
└── App.tsx                  # Router setup
```

---

## Backend Structure

```
backend/src/
├── index.ts                 # Entry point, route setup
├── middleware/
│   ├── auth.ts              # JWT/session verification
│   └── logging.ts           # Request logging
├── routes/
│   ├── auth.ts              # /api/auth/*
│   ├── sessions.ts          # /api/sessions/*
│   ├── demos.ts             # /api/demo/*
│   ├── media.ts             # /api/media/*
│   └── admin.ts             # /api/admin/*
├── db/
│   ├── schema.ts            # Database schema definitions
│   ├── queries.ts           # Prepared queries
│   └── migrations/
│       └── 001_init.sql     # Initial schema
├── utils/
│   ├── sessionId.ts         # Generate unique session IDs
│   ├── crypto.ts            # Hashing utilities
│   └── validation.ts        # Input validation
└── types/
    └── index.ts             # TypeScript interfaces
```

---

## Key Implementation Details

### 1. Camera & Photo Capture
```typescript
// Frontend - useCamera hook
- Use HTMLCanvasElement to draw video stream
- Capture frame every 1 second (setInterval)
- Convert to base64 PNG
- Send to backend in batches or individually
- Store photo_id in frontend state
- On credential capture, associate latest photo_id
```

### 2. Microphone & Audio Capture
```typescript
// Frontend - useMicrophone hook
- Use MediaRecorder API
- Record audio stream continuously
- Send audio chunks to backend (every 5-10 seconds)
- Or record entire session and upload at end
- Show real-time audio level meter using AnalyserNode
```

### 3. Credential Capture Flow
```
User fills login form
    ↓
Clicks "Login" button
    ↓
Frontend captures current camera frame
    ↓
Frontend sends POST /api/demo/[platform]/login
  Payload: { session_id, username, password, photo_id }
    ↓
Backend stores in credentials_captured table
    ↓
Backend returns error response (simulate failure)
    ↓
Frontend shows educational message + data recap
    ↓
Frontend displays: "Your credentials were captured"
                   "Your photo was taken"
                   "This is why you should be careful"
```

### 4. Admin Authentication
```
- Simple password-based login
- Store admin password in `wrangler.toml` as env var
- Use basic JWT token (or simple session cookie)
- Token expires after 30 minutes of inactivity
- Log all admin access to audit log
```

### 5. Data Processing & Privacy
```
- All photo/audio data stored temporarily
- Backend should support data deletion
- Admin can export data before event ends
- After event, clear all data from D1
- No data persisted beyond event duration
- All processing happens server-side (in-front-of-user)
```

---

## Deployment Strategy

### Wrangler Configuration
```toml
# wrangler.toml
[env.production]
name = "cyberx-production"
database_id = "d1-database-id"
vars = { ADMIN_PASSWORD = "...", MAX_SESSION_DURATION_MS = 1800000 }
```

### Build & Deploy
```bash
# Frontend
cd frontend && npm run build

# Backend
cd backend && wrangler deploy --env production

# Or deploy full stack with:
wrangler deploy --env production
```

### Cloudflare Settings
- Enable D1 Database
- Configure R2 (optional, for larger photo/audio storage)
- Set environment variables for admin password
- Enable CORS for frontend domain
- Configure rate limiting (if needed)

---

## Security Considerations

### Frontend
- [ ] Sanitize all user inputs
- [ ] Validate form data before sending
- [ ] Use HTTPS only (enforced by Cloudflare)
- [ ] Secure API calls with CSRF tokens (if needed)
- [ ] Store session ID in sessionStorage (not localStorage)

### Backend
- [ ] Validate all incoming requests
- [ ] Rate limit API endpoints (especially login demos)
- [ ] Use prepared statements to prevent SQL injection
- [ ] Hash passwords before storing (for demo purposes, consider logging as-is with warning)
- [ ] Implement request logging for audit trail
- [ ] Verify JWT/session tokens on protected routes

### Data
- [ ] Encrypt sensitive data in D1 (passwords, at minimum)
- [ ] Use temporary tables/TTL for session data
- [ ] Implement data deletion endpoints
- [ ] Audit log all admin actions
- [ ] Never expose raw passwords in API responses (only admin sees them)

---

## User Flow

### Participant Flow
1. Arrive at landing page (`/`)
2. Read disclaimer and check consent boxes
3. Click "Grant Permissions"
4. Go to `/permissions` page
5. Grant camera & microphone permissions
6. See live preview and audio levels
7. Click "Start Demo"
8. Choose demo (Instagram, Facebook, etc.)
9. Try to "login" with credentials
10. See educational message about data capture
11. Can review photos taken and audio recorded
12. Session ends automatically after time limit
13. Data is deleted from system

### Admin Flow
1. Click "Admin Dashboard" on landing page
2. Login with password at `/admin/login`
3. View real-time monitor of active sessions
4. View gallery of captured photos
5. Play recorded audio clips
6. See all captured credentials with metadata
7. View analytics of event
8. Export data if needed
9. Delete all data before leaving event

---

## Timeline & Phases

### Phase 1: Core Setup (Week 1)
- [ ] Set up Vite-React project with Tailwind
- [ ] Set up Hono backend with Wrangler
- [ ] Configure D1 database and schema
- [ ] Set up routing (React Router)
- [ ] Deploy skeleton to Cloudflare

### Phase 2: Frontend Pages (Week 2)
- [ ] Landing page component
- [ ] Consent & permissions page
- [ ] Camera capture implementation
- [ ] Microphone capture implementation
- [ ] One social media clone (Instagram)

### Phase 3: Backend API (Week 2-3)
- [ ] Session management endpoints
- [ ] Credentials capture endpoint
- [ ] Photo upload endpoint
- [ ] Audio upload endpoint
- [ ] Database integration

### Phase 4: Social Media Clones (Week 3)
- [ ] Facebook login clone
- [ ] Twitter login clone
- [ ] LinkedIn login clone
- [ ] Gmail login clone
- [ ] TikTok login clone

### Phase 5: Admin Dashboard (Week 4)
- [ ] Admin login page
- [ ] Real-time monitor
- [ ] Credentials table
- [ ] Photo gallery
- [ ] Audio playback
- [ ] Analytics

### Phase 6: Testing & Polish (Week 4-5)
- [ ] Test all demos end-to-end
- [ ] Test admin dashboard
- [ ] Optimize performance
- [ ] Test on mobile devices
- [ ] Security audit
- [ ] Data deletion workflows

### Phase 7: Deployment (Week 5)
- [ ] Deploy to production
- [ ] Monitor during event
- [ ] Support & troubleshooting

---

## Technical Challenges & Solutions

| Challenge | Solution |
|-----------|----------|
| Getting camera/mic permission on mobile | Use PWA + request permissions early |
| Streaming audio efficiently | Send chunks every 5-10 sec instead of real-time |
| Storing large media files | Use Cloudflare R2 + reference in D1 |
| Admin password security | Use env vars, hash if stored in DB |
| Data privacy concerns | Clear all data after event, show deletion logs |
| Real-time sync across tabs | Use WebSocket (optional) or polling |
| Credential encryption | Use TweetNaCl.js or similar for encryption |

---

## Important Notes

### Educational Messaging
- Each demo should end with a pop-up explaining:
  - "This is exactly how phishing attacks work"
  - "Your credentials were just transmitted to an untrusted server"
  - "In real attacks, this data would be used maliciously"
  - "Always verify URLs before entering passwords"
  - "Use password managers to avoid reusing passwords"
  - "Enable 2FA whenever possible"

### Consent & Compliance
- Ensure proper informed consent before each step
- Display clear data usage terms
- Have written permission from all participants
- Comply with GDPR/local privacy laws if in EU
- Consider having parents sign consent if any participants are minors

### Demo Authenticity
- Match UI/UX of real login pages as closely as possible
- Use exact logos, colors, and fonts
- Make the "failure" realistic (generic error message)
- Don't show a "hacked" message (keep educational tone)

---

## Next Steps

1. Create repository structure
2. Initialize Vite project with React + TypeScript
3. Set up Hono backend project
4. Create Cloudflare D1 database
5. Implement core session management
6. Build first demo clone
7. Set up admin dashboard
8. Test end-to-end
9. Deploy to production
10. Prepare event documentation
