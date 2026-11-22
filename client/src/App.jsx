import { useEffect, useState } from 'react';
import { api, getToken, setToken, setUnauthorizedHandler } from './api.js';
import AuthPage from './components/AuthPage.jsx';
import LeadsPage from './components/LeadsPage.jsx';

export default function App() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(!!getToken());

  const logout = () => { setToken(null); setUser(null); };

  useEffect(() => {
    setUnauthorizedHandler(logout);
    if (!getToken()) return;
    api.me().then((r) => setUser(r.user)).catch(logout).finally(() => setChecking(false));
  }, []);

  const handleAuth = ({ token, user }) => { setToken(token); setUser(user); };

  if (checking) return <div className="center-screen muted">Loading…</div>;
  return user ? <LeadsPage user={user} onLogout={logout} /> : <AuthPage onAuth={handleAuth} />;
}
