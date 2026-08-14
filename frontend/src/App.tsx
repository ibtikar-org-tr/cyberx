import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/Landing';
import Permissions from './pages/Permissions';
import InstagramLogin from './pages/demos/InstagramLogin';
import FacebookLogin from './pages/demos/FacebookLogin';
import TwitterLogin from './pages/demos/TwitterLogin';
import LinkedInLogin from './pages/demos/LinkedInLogin';
import GmailLogin from './pages/demos/GmailLogin';
import TikTokLogin from './pages/demos/TikTokLogin';
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/access" element={<Permissions />} />
        <Route path="/permissions" element={<Navigate to="/access" replace />} />

        <Route path="/instagram" element={<InstagramLogin />} />
        <Route path="/facebook" element={<FacebookLogin />} />
        <Route path="/twitter" element={<TwitterLogin />} />
        <Route path="/linkedin" element={<LinkedInLogin />} />
        <Route path="/gmail" element={<GmailLogin />} />
        <Route path="/tiktok" element={<TikTokLogin />} />

        <Route path="/demo/instagram" element={<Navigate to="/instagram" replace />} />
        <Route path="/demo/facebook" element={<Navigate to="/facebook" replace />} />
        <Route path="/demo/twitter" element={<Navigate to="/twitter" replace />} />
        <Route path="/demo/linkedin" element={<Navigate to="/linkedin" replace />} />
        <Route path="/demo/gmail" element={<Navigate to="/gmail" replace />} />
        <Route path="/demo/tiktok" element={<Navigate to="/tiktok" replace />} />

        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
      </Routes>
    </Router>
  );
}

export default App;
