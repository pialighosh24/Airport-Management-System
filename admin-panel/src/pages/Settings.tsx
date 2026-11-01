// AeroNexus Admin Panel — Settings page (administrative panel preferences + backend info).

import { useState } from 'react';
import { API_BASE } from '../api/client';
import { Card, Button, useToast } from '../components/ui';
import { Icon } from '../components/icons';

export default function Settings() {
  const { toast } = useToast();
  const [refreshInterval, setRefreshInterval] = useState(() => Number(localStorage.getItem('aeronexus_admin_refresh_interval') || 30));
  const [autoRefresh, setAutoRefresh] = useState(() => localStorage.getItem('aeronexus_admin_auto_refresh') !== '0');
  const [alertsEnabled, setAlertsEnabled] = useState(() => localStorage.getItem('aeronexus_admin_alerts') !== '0');

  const save = () => {
    localStorage.setItem('aeronexus_admin_refresh_interval', String(refreshInterval));
    localStorage.setItem('aeronexus_admin_auto_refresh', autoRefresh ? '1' : '0');
    localStorage.setItem('aeronexus_admin_alerts', alertsEnabled ? '1' : '0');
    toast('Admin panel preferences saved.', 'success');
  };

  return (
    <>
      <Card title="Administrative Configuration" subtitle="Administrative panel preferences (local to this panel session)">
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
          <div className="field">
            <label>Auto-refresh enabled</label>
            <select className="select" value={autoRefresh ? '1' : '0'} onChange={(e) => setAutoRefresh(e.target.value === '1')}>
              <option value="1">Enabled</option>
              <option value="0">Disabled</option>
            </select>
          </div>
          <div className="field">
            <label>Refresh interval (seconds)</label>
            <input className="input" type="number" min={5} max={300} value={refreshInterval} onChange={(e) => setRefreshInterval(Number(e.target.value))} />
          </div>
          <div className="field">
            <label>Operational alerts</label>
            <select className="select" value={alertsEnabled ? '1' : '0'} onChange={(e) => setAlertsEnabled(e.target.value === '1')}>
              <option value="1">Enabled</option>
              <option value="0">Disabled</option>
            </select>
          </div>
        </div>
        <div className="mt-16">
          <Button variant="primary" onClick={save}>Save Preferences</Button>
        </div>
      </Card>

      <Card title="Backend Connection" subtitle="Environment configuration for the standalone admin panel">
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
          <div className="card" style={{ background: 'var(--bg-soft)' }}>
            <div className="card-title">API Base URL</div>
            <div className="small muted">{API_BASE}</div>
          </div>
          <div className="card" style={{ background: 'var(--bg-soft)' }}>
            <div className="card-title">Panel Origin</div>
            <div className="small muted">http://localhost:5173</div>
          </div>
        </div>
        <p className="small muted mt-16">
          <Icon name="shield" size={12} /> Administrative operations are authenticated via the AeroNexus backend JWT
          infrastructure. All administrative endpoints enforce administrator-only access server-side.
        </p>
      </Card>
    </>
  );
}
