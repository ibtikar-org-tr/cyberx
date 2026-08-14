import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, Lock } from 'lucide-react';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('adminToken', data.token);
        navigate('/admin/dashboard');
      } else {
        setError('Invalid password');
      }
    } catch (error) {
      console.error('Login failed:', error);
      setError('Login failed. Check your connection.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-xl shadow-2xl p-8">
          <div className="flex justify-center mb-6">
            <div className="bg-gray-900 rounded-full p-4">
              <Lock size={40} className="text-white" />
            </div>
          </div>

          <h1 className="text-3xl font-bold text-center text-gray-900 mb-2">
            Admin Dashboard
          </h1>
          <p className="text-center text-gray-600 mb-6">
            Enter the admin password to continue
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              placeholder="Admin password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm placeholder-gray-600 focus:border-blue-400 focus:outline-none"
              required
            />

            {error && (
              <div className="bg-red-50 border border-red-400 text-red-800 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !password}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-gray-900 to-black text-white font-bold rounded-lg hover:from-black hover:to-gray-900 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <LogIn size={20} />
              {isLoading ? 'Logging in...' : 'Log In'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => navigate('/')}
              className="text-blue-600 hover:underline text-sm"
            >
              Back to Home
            </button>
          </div>

          <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-300">
            <p className="text-xs text-gray-700">
              <strong>Demo Credentials:</strong> Use 'admin' as password for testing
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
