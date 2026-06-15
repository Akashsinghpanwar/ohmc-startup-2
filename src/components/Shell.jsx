import { useState } from 'react';
import {
  LayoutDashboard, Map, ShieldCheck, FileText, BarChart3,
  Handshake, LogOut, Menu, X, ExternalLink
} from 'lucide-react';
import logoImg from '../assets/logo.png';

const NAV = [
  {
    section: 'Platform',
    items: [
      { id: 'dashboard',   label: 'Dashboard',     icon: LayoutDashboard },
      { id: 'boundary',    label: 'Scan Land',     icon: Map },
      { id: 'eligibility', label: 'Eligibility',   icon: ShieldCheck },
      { id: 'report',      label: 'Carbon Report', icon: FileText },
    ],
  },
  {
    section: 'Market',
    items: [
      { id: 'marketplace', label: 'Marketplace', icon: BarChart3 },
      { id: 'partner',     label: 'Partners',    icon: Handshake },
    ],
  },
];

// Screens that highlight a parent nav item (detail views)
const NAV_ALIAS = { project: 'marketplace' };

export default function Shell({ user, screen, navigate, apiOnline, logout, goTo, children }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const activeId = NAV_ALIAS[screen] || screen;

  const go = (id) => { navigate(id); setMobileOpen(false); };

  const sidebar = (
    <>
      <button className="shell-logo" onClick={() => goTo('home')} title="Back to homepage">
        <img src={logoImg} alt="OHMC" />
        <span>CarbonOS</span>
      </button>

      <nav className="shell-nav">
        {NAV.map(({ section, items }) => (
          <div key={section} className="shell-nav-group">
            <p className="shell-nav-label">{section}</p>
            {items.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                className={`shell-nav-item ${activeId === id ? 'active' : ''}`}
                onClick={() => go(id)}
              >
                <Icon size={16} strokeWidth={1.9} />
                {label}
              </button>
            ))}
          </div>
        ))}
      </nav>

      <div className="shell-foot">
        <div className={`shell-api ${apiOnline === null ? 'unknown' : apiOnline ? 'online' : 'offline'}`}>
          <span className="shell-api-dot" />
          {apiOnline === null ? 'Checking API…' : apiOnline ? 'All systems operational' : 'API offline'}
        </div>
        <div className="shell-user">
          <div className="shell-avatar">{user?.name?.[0]?.toUpperCase() || 'U'}</div>
          <div className="shell-user-info">
            <span>{user?.name || 'User'}</span>
            <small>{user?.email || 'OHMC member'}</small>
          </div>
          <button className="shell-logout" onClick={logout} title="Sign out">
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="shell">
      <aside className="shell-sidebar">{sidebar}</aside>

      {/* Mobile top bar */}
      <header className="shell-mobilebar">
        <button className="shell-logo" onClick={() => goTo('home')}>
          <img src={logoImg} alt="OHMC" />
          <span>CarbonOS</span>
        </button>
        <button className="shell-burger" onClick={() => setMobileOpen(v => !v)} aria-label="Menu">
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>
      {mobileOpen && (
        <div className="shell-mobile-drawer">
          {NAV.flatMap(g => g.items).map(({ id, label, icon: Icon }) => (
            <button key={id} className={`shell-nav-item ${activeId === id ? 'active' : ''}`} onClick={() => go(id)}>
              <Icon size={16} strokeWidth={1.9} />{label}
            </button>
          ))}
          <button className="shell-nav-item" onClick={logout}><LogOut size={16} /> Sign out</button>
        </div>
      )}

      <main className="shell-main">
        <div className="shell-content">{children}</div>
        <footer className="shell-content-foot">
          <span>© OHMC {new Date().getFullYear()} · Pre-screening environment</span>
          <a href="https://woodlandcarboncode.org.uk" target="_blank" rel="noopener noreferrer">
            Woodland Carbon Code <ExternalLink size={11} />
          </a>
        </footer>
      </main>
    </div>
  );
}
