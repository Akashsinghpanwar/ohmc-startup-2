import { useState, useEffect, useCallback } from 'react';
import { Loader } from 'lucide-react';

import HomePage from './pages/HomePage.jsx';
import AuthPage from './pages/AuthPage.jsx';
import Shell from './components/Shell.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import ScanPage from './pages/ScanPage.jsx';
import EligibilityPage from './pages/EligibilityPage.jsx';
import ReportPage from './pages/ReportPage.jsx';
import MarketplacePage from './pages/MarketplacePage.jsx';
import ProjectDetailPage from './pages/ProjectDetailPage.jsx';
import PartnerPage from './pages/PartnerPage.jsx';
import { checkHealth, getMe, getToken, setToken, clearToken } from './services/api.js';

export default function App() {
  const [page, setPage]         = useState('home');
  const [user, setUser]         = useState(null);
  const [screen, setScreen]     = useState('dashboard');
  const [apiOnline, setApiOnline] = useState(null);
  const [scanResult, setScanResult] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Restore session from stored token + handle Google OAuth callback
  useEffect(() => {
    checkHealth().then(r => setApiOnline(!!r));

    const params = new URLSearchParams(window.location.search);
    const callbackToken = params.get('token');
    if (callbackToken) {
      setToken(callbackToken);
      window.history.replaceState({}, '', window.location.pathname);
    }

    const token = getToken();
    if (token) {
      getMe()
        .then(u => { setUser(u); setPage('app'); })
        .catch(() => { clearToken(); })
        .finally(() => setAuthLoading(false));
    } else {
      setAuthLoading(false);
    }
  }, []);

  const goTo = useCallback((p, arg) => {
    setPage(p);
    if (p === 'app' && arg) setScreen(arg);
    window.scrollTo(0, 0);
  }, []);

  const navigate = useCallback((id) => {
    setScreen(id);
    window.scrollTo(0, 0);
  }, []);

  const handleAuth = useCallback((userData) => {
    setUser(userData);
    setScreen('dashboard');
    setPage('app');
    window.scrollTo(0, 0);
  }, []);

  const handleLogout = useCallback(() => {
    clearToken();
    setUser(null);
    setPage('home');
    setScanResult(null);
    setSelectedProject(null);
    window.scrollTo(0, 0);
  }, []);

  if (authLoading) return (
    <div className="boot-screen">
      <Loader size={26} className="spin" />
    </div>
  );

  if (page === 'home')   return <HomePage goTo={goTo} />;
  if (page === 'login')  return <AuthPage mode="login"  onAuth={handleAuth} goTo={goTo} />;
  if (page === 'signup') return <AuthPage mode="signup" onAuth={handleAuth} goTo={goTo} />;

  const screens = {
    dashboard:   <DashboardPage user={user} setScreen={navigate} setScanResult={setScanResult} />,
    boundary:    <ScanPage setScreen={navigate} setScanResult={setScanResult} />,
    eligibility: <EligibilityPage setScreen={navigate} scanResult={scanResult} />,
    report:      <ReportPage setScreen={navigate} scanResult={scanResult} />,
    marketplace: <MarketplacePage setScreen={navigate} setSelectedProject={setSelectedProject} />,
    project:     <ProjectDetailPage setScreen={navigate} user={user} project={selectedProject} />,
    partner:     <PartnerPage />,
  };

  return (
    <Shell
      user={user}
      screen={screen}
      navigate={navigate}
      apiOnline={apiOnline}
      logout={handleLogout}
      goTo={goTo}
    >
      {screens[screen] || screens.dashboard}
    </Shell>
  );
}
