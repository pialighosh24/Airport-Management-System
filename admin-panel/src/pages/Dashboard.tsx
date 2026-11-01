// AeroNexus Admin Panel — Dashboard page (stats + charts + recent activity).

import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { ApiError } from '../api/client';
import { AdminStats, AdminMonitoring } from '../api/types';
import { Card, StatCard, ErrorState, Spinner, Badge } from '../components/ui';
import { DonutChart, BarChart } from '../components/charts';
import { Icon } from '../components/icons';

export default function Dashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [monitoring, setMonitoring] = useState<AdminMonitoring | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, monitoringRes] = await Promise.all([
        api.get<AdminStats>('/api/admin/stats'),
        api.get<AdminMonitoring>('/api/admin/monitoring'),
      ]);
      if (statsRes?.success && statsRes.data) setStats(statsRes);
      if (monitoringRes?.success && monitoringRes.data) setMonitoring(monitoringRes);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load administrative dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <Card>
        <Spinner label="Loading operations dashboard…" />
      </Card>
    );
  }

  if (error || !stats) {
    return <ErrorState message={error || 'Unable to load dashboard statistics.'} onRetry={() => void load()} />;
  }

  const flights = stats.data.flights;
  const openDisruptions = stats.data.disruptions.filter((d) => String(d.status).toLowerCase() === 'open');
  const disruptionsBySeverity = (['critical', 'high', 'medium', 'low'] as const).map((sev) => ({
    label: sev,
    value: openDisruptions.filter((d) => d.severity === sev).length,
    color: sev === 'critical' ? '#f87171' : sev === 'high' ? '#fb923c' : sev === 'medium' ? '#fbbf24' : '#94a3b8',
  }));

  const statusData = [
    { label: 'En Route', value: flights.enRoute, color: '#38bdf8' },
    { label: 'Delayed', value: flights.delayed, color: '#fbbf24' },
    { label: 'Cancelled', value: flights.cancelled, color: '#f87171' },
  ];

  const healthStatus = monitoring?.data?.status || monitoring?.data?.externalApis ? String(monitoring.data.status) : 'unknown';

  return (
    <>
      <div className="grid stats">
        <StatCard label="Total Flights" value={flights.total} tone="accent" icon={<Icon name="flights" size={16} />} foot={`${flights.enRoute} en route now`} />
        <StatCard label="Active Flights" value={flights.active} tone="info" icon={<Icon name="activity" size={16} />} foot="In airspace operations" />
        <StatCard label="Delayed" value={flights.delayed} tone="warning" icon={<Icon name="alert" size={16} />} foot="Awaiting recovery" />
        <StatCard label="Cancelled" value={flights.cancelled} tone="danger" icon={<Icon name="alert" size={16} />} foot="Off schedule" />
        <StatCard label="Tracked Airports" value={stats.data.airports.tracked} tone="success" icon={<Icon name="airplane" size={16} />} foot="Unique origin/destination pairs" />
        <StatCard label="Registered Users" value={stats.data.registeredUsers} tone="accent" icon={<Icon name="users" size={16} />} foot="Accounts on platform" />
        <StatCard label="Open Disruptions" value={stats.data.openDisruptions} tone="warning" icon={<Icon name="disruptions" size={16} />} foot={`${openDisruptions.length} active cases`} />
        <StatCard label="API Health" value={healthStatus} tone={healthStatus === 'healthy' ? 'success' : 'danger'} icon={<Icon name="monitoring" size={16} />} foot={monitoring?.data?.database ? `DB: ${monitoring.data.database.state}` : 'Monitoring data'} />
      </div>

      <div className="grid two">
        <Card title="Fleet Status Distribution" subtitle="Live operational flight status mix">
          <DonutChart data={statusData} centerLabel="FLIGHTS" />
        </Card>
        <Card title="Open Disruptions by Severity" subtitle="Current operational disruption load">
          <BarChart data={disruptionsBySeverity} />
        </Card>
      </div>

      <Card title="Recent Activity" subtitle="Latest operational events from the last 24h window">
        {stats.data.recentActivities && stats.data.recentActivities.length > 0 ? (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Case</th>
                  <th>Flight</th>
                  <th>Category</th>
                  <th>Severity</th>
                  <th>Status</th>
                  <th>Summary</th>
                  <th>Updated</th>
                </tr>
              </thead>
              <tbody>
                {stats.data.recentActivities.map((a) => (
                  <tr key={a.id}>
                    <td className="small">{a.caseNumber || a.id}</td>
                    <td style={{ fontWeight: 700 }}>{a.flightNumber}</td>
                    <td className="small">{a.category}</td>
                    <td><Badge tone={a.severity === 'critical' ? 'danger' : a.severity === 'high' ? 'warning' : 'info'}>{a.severity}</Badge></td>
                    <td><Badge tone={String(a.status).toLowerCase() === 'open' ? 'warning' : 'neutral'}>{a.status}</Badge></td>
                    <td className="small muted">{a.summary}</td>
                    <td className="small muted">{new Date(a.updatedAtUtc).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="state-box">
            <div className="title">No recent activity</div>
            <div className="message">No operational events recorded yet.</div>
          </div>
        )}
      </Card>
    </>
  );
}
