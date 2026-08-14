import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
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
        <Route path="/permissions" element={<Permissions />} />
        <Route path="/demo/instagram" element={<InstagramLogin />} />
        <Route path="/demo/facebook" element={<FacebookLogin />} />
        <Route path="/demo/twitter" element={<TwitterLogin />} />
        <Route path="/demo/linkedin" element={<LinkedInLogin />} />
        <Route path="/demo/gmail" element={<GmailLogin />} />
        <Route path="/demo/tiktok" element={<TikTokLogin />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
      </Routes>
    </Router>
  );
}

export default App;
