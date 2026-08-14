# CyberX - Quick Reference Guide

## 🚀 Development Commands

### Frontend Development
```bash
cd frontend

# Install dependencies
npm install

# Start development server (http://localhost:5173)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linter
npm run lint
```

### Backend Development
```bash
cd backend

# Install dependencies
npm install

# Start development server (http://localhost:8787)
npm run dev

# Generate Cloudflare types
npm run cf-typegen

# Deploy to production
npm run deploy
```

---

## 📁 File Organization

### Frontend Pages
```
frontend/src/pages/
├── Landing.tsx                      # Home page with demo selection
├── Permissions.tsx                  # Camera/mic setup
├── admin/
│   ├── AdminLogin.tsx              # Admin login page
│   └── AdminDashboard.tsx          # Admin monitoring dashboard
└── demos/
    ├── InstagramLogin.tsx          # Instagram clone
    ├── FacebookLogin.tsx           # Facebook clone
    ├── TwitterLogin.tsx            # Twitter/X clone
    ├── LinkedInLogin.tsx           # LinkedIn clone
    ├── GmailLogin.tsx              # Gmail clone
    └── TikTokLogin.tsx             # TikTok clone
```

### Backend Routes
```
backend/src/index.ts contains:
- Authentication routes (/api/auth/*)
- Session management routes (/api/sessions/*)
- Demo capture routes (/api/demo/*)
- Media upload routes (/api/media/*)
- Admin routes (/api/admin/*)
- Health check routes
```

---

## 🔧 Configuration Files

### Frontend
- `vite.config.ts` - Vite bundler configuration
- `tailwind.config.js` - Tailwind CSS configuration
- `tsconfig.json` - TypeScript configuration
- `package.json` - Dependencies and scripts

### Backend
- `wrangler.jsonc` - Cloudflare Workers configuration
- `tsconfig.json` - TypeScript configuration
- `package.json` - Dependencies and scripts

---

## 🌐 Routes & URLs

### Frontend Routes
```
/                       → Landing page
/permissions           → Camera/mic setup
/demo/instagram        → Instagram login demo
/demo/facebook         → Facebook login demo
/demo/twitter          → Twitter login demo
/demo/linkedin         → LinkedIn login demo
/demo/gmail            → Gmail login demo
/demo/tiktok           → TikTok login demo
/admin/login           → Admin authentication
/admin/dashboard       → Admin monitoring
```

### Backend API Routes
```
POST   /api/auth/login                 → Admin login
POST   /api/sessions/create            → Create session
POST   /api/demo/instagram/login       → Capture Instagram login
POST   /api/demo/facebook/login        → Capture Facebook login
POST   /api/demo/twitter/login         → Capture Twitter login
POST   /api/demo/linkedin/login        → Capture LinkedIn login
POST   /api/demo/gmail/login           → Capture Gmail login
POST   /api/demo/tiktok/login          → Capture TikTok login
POST   /api/media/photos               → Upload photo
GET    /api/admin/credentials          → List credentials (protected)
GET    /api/admin/analytics            → Get analytics (protected)
DELETE /api/admin/all-data             → Delete all data (protected)
```

---

## 🗄️ Database Tables

### sessions
- Tracks user sessions
- Records permissions granted
- Stores session metadata

### credentials_captured
- Email/username from login
- Password (encrypted recommended)
- Demo platform
- Timestamp
- Associated photo ID

### photos
- Base64 encoded images
- Timestamp
- Session reference
- Metadata (dimensions, size)

### audio_recordings
- Base64 encoded audio
- Duration
- Start/end time
- Session reference

### admin_audit_log
- Track admin login attempts
- Track data access
- Track data deletion
- Admin username and timestamp

---

## 🔑 Environment Variables

### Frontend (.env.local or .env.production)
```
VITE_API_URL=http://localhost:8787
VITE_APP_NAME=CyberX
```

### Backend (wrangler.jsonc)
```json
{
  "vars": {
    "ADMIN_PASSWORD": "admin",
    "MAX_SESSION_DURATION_MS": "1800000"
  }
}
```

---

## 📊 Key Features

### For Participants
- [ ] Consent agreement on landing page
- [ ] Camera and microphone permission requests
- [ ] 1 photo per second during session
- [ ] 6 different social media login clones
- [ ] Educational messages post-login
- [ ] Session selection and navigation

### For Admins
- [ ] Password-protected login
- [ ] Real-time session monitoring
- [ ] Credentials display table
- [ ] Photo gallery view
- [ ] Audio playback
- [ ] Analytics dashboard
- [ ] Data export feature
- [ ] Data deletion with audit trail

### Technical Features
- [ ] React Router for navigation
- [ ] Tailwind CSS for styling
- [ ] WebRTC for media capture
- [ ] Canvas API for photo capture
- [ ] Hono.js for API server
- [ ] Cloudflare Workers runtime
- [ ] D1 SQLite database
- [ ] Automatic table creation
- [ ] Prepared statements for security

---

## 🚀 Deployment Checklist

### Before Deployment
- [ ] Update `ADMIN_PASSWORD` in wrangler.jsonc
- [ ] Update `VITE_API_URL` if backend on different domain
- [ ] Test frontend build: `npm run build`
- [ ] Create Cloudflare D1 database
- [ ] Update database ID in wrangler.jsonc
- [ ] Review privacy and consent messaging
- [ ] Test all demo pages locally
- [ ] Test admin dashboard login

### Deployment Steps
1. Create D1 database: `wrangler d1 create cyberx-db`
2. Build frontend: `cd frontend && npm run build`
3. Deploy backend: `cd backend && wrangler deploy --minify`
4. Deploy frontend: `cd frontend && wrangler pages deploy dist`

### After Deployment
- [ ] Test all pages on production URL
- [ ] Verify admin login works
- [ ] Test credential capture
- [ ] Verify database connection
- [ ] Test data export
- [ ] Verify HTTPS is active
- [ ] Check Cloudflare analytics

---

## 🐛 Common Issues & Solutions

### Frontend Issues
```bash
# TypeScript errors
npm run build          # Full rebuild
rm -rf dist node_modules
npm install && npm run build

# Tailwind CSS not working
npm install -D @tailwindcss/postcss

# Environment variables not loading
# Create .env.local file in frontend root
VITE_API_URL=http://localhost:8787
```

### Backend Issues
```bash
# Database connection issues
wrangler d1 info cyberx-db

# Type generation issues
npm run cf-typegen

# API not responding
wrangler dev              # Check logs in terminal
```

### Camera/Microphone Issues
```
- Need HTTPS (or localhost)
- Browser must grant permission
- Device must have camera/mic
- Firewall may block camera
```

---

## 📱 Mobile Considerations

- ✅ Responsive design with Tailwind CSS
- ✅ Works on mobile browsers
- ⚠️ Camera permission may work differently
- ⚠️ HTTPS required on production mobile
- ✅ Touch-friendly UI

---

## 🔒 Security Reminders

- ✅ Don't commit `.env` files
- ✅ Rotate admin password regularly
- ✅ Monitor admin access logs
- ✅ Delete data after events
- ✅ Use HTTPS in production
- ✅ Keep dependencies updated
- ✅ Review Cloudflare security settings
- ✅ Enable audit logging

---

## 📚 Documentation Files

- `README.md` - Project overview
- `PLAN.md` - Detailed project planning
- `DEPLOYMENT.md` - Deployment and development guide
- `IMPLEMENTATION_SUMMARY.md` - What's been built
- `setup.sh` - Automated setup script

---

## 🎯 Quick Deploy Guide

### Cloudflare Deployment (5 steps)

```bash
# Step 1: Create database
cd backend
wrangler d1 create cyberx-db

# Step 2: Update database ID in wrangler.jsonc
# (copy the database_id from command output)

# Step 3: Deploy backend
wrangler deploy --minify

# Step 4: Build frontend
cd ../frontend
npm run build

# Step 5: Deploy frontend
wrangler pages deploy dist
```

**That's it!** Your app is live.

---

## 🆘 Support

For detailed information:
1. Read [README.md](./README.md) for overview
2. Check [DEPLOYMENT.md](./DEPLOYMENT.md) for technical details
3. Review [PLAN.md](./PLAN.md) for architecture
4. See [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) for status

---

## 📞 Useful Links

- Cloudflare Workers Docs: https://developers.cloudflare.com/workers/
- Hono.js Docs: https://hono.dev/
- React Docs: https://react.dev/
- Tailwind CSS: https://tailwindcss.com/
- Vite Docs: https://vitejs.dev/

---

**Version**: 1.0.0  
**Last Updated**: August 2026  
**Status**: ✅ Production Ready
