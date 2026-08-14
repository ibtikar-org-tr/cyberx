# CyberX - Development & Deployment Guide

## Project Structure

```
cyberx/
├── frontend/              # Vite + React + TypeScript + Tailwind
│   ├── src/
│   │   ├── pages/        # All page components
│   │   ├── App.tsx       # Main router
│   │   ├── main.tsx      # Entry point
│   │   └── index.css     # Global styles
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── tailwind.config.js
├── backend/              # Hono + Cloudflare Workers
│   ├── src/
│   │   └── index.ts     # All API routes
│   ├── package.json
│   ├── wrangler.jsonc
│   └── tsconfig.json
├── PLAN.md              # Project planning document
└── README.md            # This file
```

## Quick Start - Local Development

### Frontend Development Server

```bash
cd frontend
npm install
npm run dev
```

The frontend will start at `http://localhost:5173`

### Backend Development Server

```bash
cd backend
npm install
npm run dev
```

The backend will start at `http://localhost:8787`

### Environment Configuration

Backend environment variables are set in `backend/wrangler.jsonc`:
- `ADMIN_PASSWORD`: Password for admin dashboard (default: "admin")
- `MAX_SESSION_DURATION_MS`: Session timeout in milliseconds

## API Endpoints

### Authentication
- `POST /api/auth/login` - Admin login with password
  - Body: `{ password: string }`
  - Response: `{ token: string }`

### Session Management
- `POST /api/sessions/create` - Create a new session
  - Body: `{ sessionId: string, consent: object }`
  - Response: `{ success: true, sessionId: string }`

### Demo Routes (All Social Media Logins)
- `POST /api/demo/instagram/login` - Capture Instagram login attempt
- `POST /api/demo/facebook/login` - Capture Facebook login attempt
- `POST /api/demo/twitter/login` - Capture Twitter login attempt
- `POST /api/demo/linkedin/login` - Capture LinkedIn login attempt
- `POST /api/demo/gmail/login` - Capture Gmail login attempt
- `POST /api/demo/tiktok/login` - Capture TikTok login attempt

All demo endpoints accept:
```json
{
  "sessionId": "session-id",
  "email_or_username": "user@example.com",
  "password": "password123",
  "photo_data": "base64-encoded-image",
  "timestamp": "2026-08-14T12:00:00Z"
}
```

### Admin Dashboard Routes (Protected with Authorization header)
- `GET /api/admin/sessions` - List all sessions
- `GET /api/admin/sessions/:id` - Get specific session details
- `GET /api/admin/credentials` - List all captured credentials
- `GET /api/admin/photos/:session_id` - Get photos for session
- `GET /api/admin/audio/:session_id` - Get audio for session
- `GET /api/admin/analytics` - Get dashboard analytics
- `DELETE /api/admin/sessions/:id` - Delete specific session
- `DELETE /api/admin/all-data` - Delete all data
- `POST /api/admin/export` - Export data as JSON

## Frontend Pages

### `/` - Landing Page
- Displays app information and available demos
- Consent agreement checkboxes
- Navigation to permissions page
- Admin login button

### `/permissions` - Permissions & Setup
- Request camera and microphone permissions
- Display live camera preview
- Show audio level meter
- Session confirmation

### `/demo/:platform` - Social Media Login Clones
Available platforms:
- `/demo/instagram`
- `/demo/facebook`
- `/demo/twitter`
- `/demo/linkedin`
- `/demo/gmail`
- `/demo/tiktok`

Each demo page:
- Mimics the real social media login UI
- Captures submitted credentials
- Shows educational message on submission
- Explains what data was captured

### `/admin/login` - Admin Authentication
- Password input for admin dashboard access
- Stores authentication token in localStorage

### `/admin/dashboard` - Admin Dashboard
- Real-time monitoring of active sessions
- Table of captured credentials
- Photo gallery
- Audio playback
- Analytics visualization
- Data export and deletion options

## Database Schema

### sessions
```sql
id TEXT PRIMARY KEY
created_at DATETIME
updated_at DATETIME
status TEXT (active/completed/abandoned)
consent_given BOOLEAN
camera_permission BOOLEAN
microphone_permission BOOLEAN
photo_count INTEGER
audio_duration_ms INTEGER
client_ip TEXT
user_agent TEXT
```

### credentials_captured
```sql
id TEXT PRIMARY KEY
session_id TEXT (FK)
demo_type TEXT (instagram/facebook/twitter/linkedin/gmail/tiktok)
email_or_username TEXT
password TEXT
captured_at DATETIME
photo_id TEXT
```

### photos
```sql
id TEXT PRIMARY KEY
session_id TEXT (FK)
capture_timestamp DATETIME
image_data TEXT (base64)
metadata TEXT (JSON)
```

### audio_recordings
```sql
id TEXT PRIMARY KEY
session_id TEXT (FK)
recording_data TEXT (base64)
duration_ms INTEGER
started_at DATETIME
ended_at DATETIME
```

### admin_audit_log
```sql
id TEXT PRIMARY KEY
admin_user TEXT
action TEXT
target_table TEXT
target_count INTEGER
action_timestamp DATETIME
notes TEXT
```

## Deployment to Cloudflare

### Prerequisites
- Cloudflare account
- `wrangler` CLI installed: `npm install -g @cloudflare/wrangler`
- Authenticated with Cloudflare: `wrangler login`

### Step 1: Create D1 Database

```bash
cd backend
wrangler d1 create cyberx-db
```

This will output a database ID. Update `wrangler.jsonc`:

```jsonc
"d1_databases": [
  {
    "binding": "DB",
    "database_name": "cyberx-db",
    "database_id": "your-database-id-here"
  }
]
```

### Step 2: Build Frontend

```bash
cd ../frontend
npm run build
```

The built files will be in `frontend/dist/`

### Step 3: Deploy Backend

```bash
cd ../backend
wrangler deploy --minify
```

This will:
- Deploy the Hono API to Cloudflare Workers
- Bind the D1 database
- Set environment variables

### Step 4: Deploy Frontend

There are several options to host the frontend:

#### Option A: Cloudflare Pages
```bash
cd ../frontend
npm install -g wrangler
wrangler pages deploy dist
```

#### Option B: Vercel, Netlify, or GitHub Pages
Push to your repository and configure deployment through the platform's dashboard.

#### Option C: Manual S3/R2
Upload the `frontend/dist/` folder to Cloudflare R2 and serve through Workers.

### Step 5: Update Frontend API URL

If backend is deployed to a different domain, update API calls in frontend components.

In production, update the API base URL in components or create an environment file:

```typescript
const API_URL = process.env.VITE_API_URL || 'https://your-api.workers.dev';
```

Create `.env.production` in frontend:
```
VITE_API_URL=https://your-api.workers.dev
```

## Environment Variables

### Frontend (.env.production)
```
VITE_API_URL=https://your-backend-url.workers.dev
VITE_APP_NAME=CyberX
```

### Backend (wrangler.jsonc)
```jsonc
{
  "vars": {
    "ADMIN_PASSWORD": "your-secure-password",
    "MAX_SESSION_DURATION_MS": "1800000"
  }
}
```

## Data Privacy & Compliance

### Important Notes
1. **User Consent**: Always get explicit informed consent from users
2. **Data Deletion**: Provide easy data deletion for participants
3. **GDPR Compliance**: If serving EU users, comply with GDPR
4. **Transparency**: Show users exactly what data is being collected
5. **No Persistence**: Delete data immediately after event

### Recommended Practices
- Display clear disclaimers before starting
- Log all admin access for audit purposes
- Encrypt sensitive data at rest
- Use HTTPS only in production
- Implement rate limiting on APIs
- Monitor and log all data access
- Schedule automatic data deletion after event

## Security Considerations

### Frontend
- [ ] Input validation on all forms
- [ ] CSRF protection (if needed)
- [ ] Secure storage of auth tokens
- [ ] Session timeout implementation
- [ ] Content Security Policy headers

### Backend
- [ ] API authentication/authorization
- [ ] Rate limiting
- [ ] SQL injection prevention (using prepared statements)
- [ ] CORS configuration
- [ ] Request logging and monitoring
- [ ] Secure error handling (don't expose stack traces)

### Deployment
- [ ] Use environment variables for secrets
- [ ] Enable HTTPS/TLS
- [ ] Configure firewall rules
- [ ] Set up monitoring and alerts
- [ ] Enable audit logging
- [ ] Regular security updates

## Troubleshooting

### Frontend Won't Load
1. Check that backend API URL is correct
2. Verify CORS is enabled on backend
3. Check browser console for errors
4. Clear browser cache and localStorage

### Camera/Microphone Not Working
1. Check browser permissions
2. Verify HTTPS (required for camera access)
3. Test with different browser
4. Ensure device has camera/microphone

### Admin Dashboard Can't Login
1. Verify admin password in wrangler.jsonc
2. Check that D1 database is connected
3. Look for errors in Cloudflare Workers logs
4. Try clearing localStorage and logging in again

### Database Not Persisting Data
1. Verify D1 database ID in wrangler.jsonc
2. Check database permissions
3. Review Cloudflare Workers logs for errors
4. Test with direct D1 query via Cloudflare dashboard

### Build Errors
```bash
# Clear dependencies and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear build cache
rm -rf dist
npm run build
```

## Testing Checklist

### Participant Flow
- [ ] Can navigate to landing page
- [ ] Can read and accept consent
- [ ] Can grant camera and microphone permissions
- [ ] Can see live camera preview
- [ ] Can see audio level meter
- [ ] Can access demo pages
- [ ] Can submit credentials
- [ ] Can see educational message
- [ ] Can navigate between demos

### Admin Flow
- [ ] Can navigate to admin login
- [ ] Can login with correct password
- [ ] Can view all sessions
- [ ] Can view captured credentials
- [ ] Can view photos
- [ ] Can view analytics
- [ ] Can export data
- [ ] Can delete specific sessions
- [ ] Can delete all data

### Data Collection
- [ ] Photos are captured (1 per second)
- [ ] Audio is captured
- [ ] Credentials are stored
- [ ] Timestamps are accurate
- [ ] Session IDs are tracked
- [ ] Client IP is logged
- [ ] User agents are logged

### Security
- [ ] Passwords are hashed before storage (or marked as sensitive)
- [ ] Admin panel is password protected
- [ ] CORS only allows intended domains
- [ ] Rate limiting works
- [ ] Data can be deleted successfully
- [ ] Audit logs are maintained

## Performance Optimization

### Frontend
- Use code splitting for lazy-loaded pages
- Optimize images and assets
- Implement service workers for offline support
- Use React.memo for expensive components
- Implement virtualization for large lists

### Backend
- Use connection pooling for D1
- Implement caching for frequently accessed data
- Use indexed queries for faster lookups
- Batch operations when possible
- Monitor query performance

### Deployment
- Enable Cloudflare caching
- Use CDN for static assets
- Implement image optimization
- Monitor worker performance
- Set up alerts for slowdowns

## Support & Documentation

For issues or questions:
1. Check PLAN.md for detailed requirements
2. Review Cloudflare Workers documentation
3. Check Hono.js documentation
4. Review React and Vite documentation
5. Contact your Cloudflare support team

## License

This educational tool is provided as-is for cybersecurity awareness purposes only.

## Disclaimer

This application is designed for educational demonstrations of cybersecurity risks. 
- All participants must provide informed consent
- No data will be used for illegal or harmful purposes
- All data must be deleted after demonstrations
- Users assume all responsibility for proper use and compliance with local laws
