CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  status TEXT DEFAULT 'active',
  consent_given INTEGER DEFAULT 0,
  camera_permission INTEGER DEFAULT 0,
  microphone_permission INTEGER DEFAULT 0,
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
  storage_key TEXT,
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
