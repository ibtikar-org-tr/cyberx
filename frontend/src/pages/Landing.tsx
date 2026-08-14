import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Shield, LogIn, Lock } from 'lucide-react';

export default function Landing() {
  const navigate = useNavigate();
  const [consentChecked, setConsentChecked] = useState(false);

  const demoApps = [
    { id: 'instagram', name: 'Instagram', path: '/instagram', icon: '📷' },
    { id: 'facebook', name: 'Facebook', path: '/facebook', icon: '👥' },
    { id: 'twitter', name: 'Twitter/X', path: '/twitter', icon: '𝕏' },
    { id: 'linkedin', name: 'LinkedIn', path: '/linkedin', icon: '💼' },
    { id: 'gmail', name: 'Gmail', path: '/gmail', icon: '✉️' },
    { id: 'tiktok', name: 'TikTok', path: '/tiktok', icon: '♪' },
  ];

  const handleStartDemo = () => {
    if (!consentChecked) {
      alert('Please accept the consent agreement to continue');
      return;
    }
    navigate('/access');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
      {/* Admin Login Button */}
      <div className="absolute top-4 right-4">
        <button
          onClick={() => navigate('/admin/login')}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition"
        >
          <Lock size={20} />
          Admin Dashboard
        </button>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Shield size={48} className="text-purple-600" />
            <h1 className="text-5xl font-bold text-gray-900">CyberX</h1>
          </div>
          <p className="text-xl text-gray-700 mb-2">
            Cybersecurity Awareness Demonstration
          </p>
          <p className="text-gray-600">
            Learn how quickly your personal data can be accessed
          </p>
        </div>

        {/* Warning Banner */}
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-8 rounded">
          <p className="text-sm text-yellow-800">
            <strong>⚠️ Educational Purpose Only:</strong> This demonstration is designed to raise awareness
            about cybersecurity risks. All data is processed locally and will be deleted after the event.
            By using this app, you agree that it will not be used for any illegal or harmful purpose.
          </p>
        </div>

        {/* Consent Section */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Informed Consent</h2>
          <div className="space-y-3 mb-6">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={consentChecked}
                onChange={(e) => setConsentChecked(e.target.checked)}
                className="mt-1 w-4 h-4"
              />
              <span className="text-gray-700">
                I understand this is an <strong>educational demonstration</strong> designed to teach
                cybersecurity awareness
              </span>
            </label>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={consentChecked}
                onChange={(e) => setConsentChecked(e.target.checked)}
                className="mt-1 w-4 h-4"
              />
              <span className="text-gray-700">
                I consent to capture of <strong>photos and audio</strong> during this demonstration
              </span>
            </label>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={consentChecked}
                onChange={(e) => setConsentChecked(e.target.checked)}
                className="mt-1 w-4 h-4"
              />
              <span className="text-gray-700">
                I agree that all data will be <strong>processed live and deleted</strong> after the event
              </span>
            </label>
          </div>
        </div>

        {/* Demo Apps Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Available Demonstrations</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {demoApps.map((app) => (
              <button
                key={app.id}
                onClick={() => {
                  if (!consentChecked) {
                    alert('Please accept the consent agreement to continue');
                    return;
                  }
                  sessionStorage.setItem('sessionId', Date.now().toString());
                  navigate(app.path);
                }}
                className="p-4 bg-white rounded-lg shadow hover:shadow-lg transition transform hover:scale-105 text-center"
              >
                <div className="text-4xl mb-2">{app.icon}</div>
                <p className="font-semibold text-gray-900">{app.name}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Start Demo Button */}
        <div className="text-center">
          <button
            onClick={handleStartDemo}
            className="flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-lg font-bold rounded-lg hover:from-purple-700 hover:to-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!consentChecked}
          >
            <LogIn size={24} />
            Start Demo
          </button>
          {!consentChecked && (
            <p className="text-sm text-gray-600 mt-2">
              Please accept the consent agreement to proceed
            </p>
          )}
        </div>

        {/* Footer Info */}
        <div className="mt-12 text-center text-gray-600 text-sm">
          <p>
            🎓 Educational Tool | 📊 Data Processing Visible | 🔐 No Illegal Use | ✅ Full Consent Required
          </p>
        </div>
      </div>
    </div>
  );
}
