// AeroNexus Admin Panel — System Monitoring page.

import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '../api/client';
import { Card, ErrorState, Spinner, Badge } from '../components/ui';
import { Icon } from '../components/icons';
import type { AdminMonitoring, HealthResponse } from '../api/types';

function statusTone(status: string): string {
  const s = String(status || '').toLowerCase();
  if (s === 'healthy' || s === 'operational' || s === 'ok') return 'success';
  if (s === 'degraded' || s === 'warning') return 'warning';
  if (s === 'critical' || s === 'unhealthy' || s === 'down') return 'danger';
  return 'neutral';
}

export default function Monitoring() {
  const [data, setData] = useState<AdminMonitoring | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<AdminMonitoring>('/api/admin/monitoring');
      if (res?.success && res.data) setData(res);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load monitoring data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadInitial = async () => {
      try {
        const res = await api.get<AdminMonitoring>('/api/admin/monitoring');
        if (!cancelled && res?.success && res.data) setData(res);
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.message : 'Failed to load monitoring data.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void loadInitial();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <Card>
        <Spinner label="Collecting system health…" />
      </Card>
    );
  }

  if (error || !data) {
    return <ErrorState message={error || 'Failed to load monitoring data.'} onRetry={() => void load()} />;
  }

  const health: HealthResponse = data.data;
  const externalApis = health.externalApis || {};
  const db = health.database;

  const apiList = Object.entries(externalApis);

  return (
    <>
      <div className="grid stats">
        <div className="stat-card">
          <div className="stat-top"><span className="stat-label">Backend Status</span><span className="stat-icon"><Icon name="monitoring" size={16} /></span></div>
          <div className="stat-value" style={{ fontSize: 24 }}>{health.status}</div>
          <div className="stat-foot">Uptime {Math.round(health.uptimeSeconds || 0)}s</div>
        </div>
        <div className="stat-card">
          <div className="stat-top"><span className="stat-label">Database</span><span className="stat-icon"><Icon name="activity" size={16} /></span></div>
          <div className="stat-value" style={{ fontSize: 24 }}>{db?.connected ? 'Connected' : 'Unavailable'}</div>
          <div className="stat-foot">{db?.mode || ''}</div>
        </div>
        {apiList.map(([key, apiStatus]) => (
          <div className="stat-card" key={key}>
            <div className="stat-top"><span className="stat-label">{apiStatus.providerName}</span><span className="stat-icon"><Icon name="shield" size={16} /></span></div>
            <div className="stat-value" style={{ fontSize: 24 }}>{apiStatus.status}</div>
            <div className="stat-foot">Auth: {apiStatus.authConfigured ? 'configured' : 'public'}</div>
          </div>
        ))}
      </div>

      <Card title="Backend & Database Detail" subtitle="Health endpoint payload">
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          <div className="card" style={{ background: 'var(--bg-soft)' }}>
            <div className="card-title">Service</div>
            <div className="small muted">{health.service}</div>
          </div>
          <div className="card" style={{ background: 'var(--bg-soft)' }}>
            <div className="card-title">Environment</div>
            <div className="small muted">{health.environment}</div>
          </div>
          <div className="card" style={{ background: 'var(--bg-soft)' }}>
            <div className="card-title">Version</div>
            <div className="small muted">{health.version}</div>
          </div>
          <div className="card" style={{ background: 'var(--bg-soft)' }}>
            <div className="card-title">Database</div>
            <div className="small muted">{db?.message || 'No database details'}</div>
          </div>
        </div>
      </Card>

      <Card title="External API Status" subtitle="Configured data sources and authentication state">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Provider</th>
                <th>Source</th>
                <th>Status</th>
                <th>Auth</th>
              </tr>
            </thead>
            <tbody>
              {apiList.map(([key, a]) => (
                <tr key={key}>
                  <td style={{ fontWeight: 700 }}>{a.providerName}</td>
                  <td className="small">{a.source}</td>
                  <td><Badge tone={statusTone(a.status)}>{a.status}</Badge></td>
                  <td className="small">{a.authConfigured ? 'Configured' : 'Public / not required'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
