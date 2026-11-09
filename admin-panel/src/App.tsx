// AeroNexus Admin Panel — application shell.

import React, { useState } from 'react';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { ToastProvider } from './components/ui';
import { Icon } from './components/icons';
import type { IconName } from './components/icons';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Flights from './pages/Flights';
import Disruptions from './pages/Disruptions';
import Notices from './pages/Notices';
import Airports from './pages/Airports';
import Users from './pages/Users';
import Monitoring from './pages/Monitoring';
import AuditLogs from './pages/AuditLogs';
import Settings from './pages/Settings';

type PageKey = 'dashboard' | 'flights' | 'disruptions' | 'notices' | 'airports' | 'users' | 'monitoring' | 'audit' | 'settings';

interface NavItem {
  key: PageKey;
  label: string;
  section: 'operations' | 'management' | 'system';
  icon: IconName;
  title: string;
  subtitle: string;
}

const NAV: NavItem[] = [
  { key: 'dashboard', label: 'Dashboard', section: 'operations', icon: 'dashboard', title: 'Operations Dashboard', subtitle: 'Fleet and operational overview' },
  { key: 'flights', label: 'Flights', section: 'management', icon: 'flights', title: 'Flight Management', subtitle: 'Operational flight registry' },
  { key: 'disruptions', label: 'Disruptions', section: 'management', icon: 'disruptions', title: 'Disruption Management', subtitle: 'Incident response tracking' },
  { key: 'notices', label: 'Notices', section: 'management', icon: 'notices', title: 'Flight Operations Notices', subtitle: 'Broadcast operational notices' },
  { key: 'airports', label: 'Airports', section: 'management', icon: 'airplane', title: 'Airport Management', subtitle: 'Operational airport records' },
  { key: 'users', label: 'Users', section: 'management', icon: 'users', title: 'User Management', subtitle: 'Accounts and staff assignments' },
  { key: 'monitoring', label: 'Monitoring', section: 'system', icon: 'monitoring', title: 'System Monitoring', subtitle: 'Backend, database and API health' },
  { key: 'audit', label: 'Audit Logs', section: 'system', icon: 'audit', title: 'Audit Logs', subtitle: 'Administrative action trail' },
  { key: 'settings', label: 'Settings', section: 'system', icon: 'settings', title: 'Admin Settings', subtitle: 'Panel preferences and backend info' },
];

function Shell() {
  const { user, loading, logout } = useAuth();
  const [page, setPage] = useState<PageKey>('dashboard');

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)' }}>
        Authenticating…
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  const active = NAV.find((n) => n.key === page) || NAV[0];

  const renderPage = () => {
    switch (page) {
      case 'dashboard':
        return <Dashboard />;
      case 'flights':
        return <Flights />;
      case 'disruptions':
        return <Disruptions />;
      case 'notices':
        return <Notices />;
      case 'airports':
        return <Airports />;
      case 'users':
        return <Users />;
      case 'monitoring':
        return <Monitoring />;
      case 'audit':
        return <AuditLogs />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };

  const sections: ('operations' | 'management' | 'system')[] = ['operations', 'management', 'system'];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="logo">
            <Icon name="airplane" size={20} color="#ffffff" />
          </div>
          <div className="brand-text">
            <div className="name">AeroNexus</div>
            <div className="sub">Admin Panel</div>
          </div>
        </div>
        <nav className="sidebar-nav">
          {sections.map((section) => (
            <React.Fragment key={section}>
              <div className="sidebar-section">{section === 'operations' ? 'Operations' : section === 'management' ? 'Management' : 'System'}</div>
              {NAV.filter((n) => n.section === section).map((n) => (
                <button key={n.key} className={`nav-item ${page === n.key ? 'active' : ''}`} onClick={() => setPage(n.key)}>
                  <Icon name={n.icon} size={16} />
                  <span className="label">{n.label}</span>
                </button>
              ))}
            </React.Fragment>
          ))}
        </nav>
        <div className="sidebar-footer">
          <button className="nav-item" onClick={logout}>
            <Icon name="logout" size={16} />
            <span className="label">Sign Out</span>
          </button>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <div>
            <div className="page-title">{active.title}</div>
            <div className="page-sub">{active.subtitle}</div>
          </div>
          <div className="row">
            <div className="admin-chip">
              <span className="admin-avatar">{String(user.username || '?').slice(0, 2).toUpperCase()}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{user.fullName || user.username}</div>
                <div className="small muted" style={{ textTransform: 'capitalize' }}>{user.role}</div>
              </div>
            </div>
            <button className="btn" onClick={logout}>
              <Icon name="logout" size={14} /> Sign Out
            </button>
          </div>
        </header>
        <main className="content">{renderPage()}</main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Shell />
      </ToastProvider>
    </AuthProvider>
  );
}
