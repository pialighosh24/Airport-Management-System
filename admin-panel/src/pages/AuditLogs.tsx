// AeroNexus Admin Panel — Audit Logs page.

import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '../api/client';
import { Card, ErrorState, Spinner, EmptyState, Badge } from '../components/ui';
import type { AuditLogEntry, ApiResponse } from '../api/types';

export default function AuditLogs() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<ApiResponse<AuditLogEntry[]>>('/api/admin/audit-logs?limit=100');
      if (res?.success) setLogs(res.data || []);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load audit logs.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <Card>
        <Spinner label="Loading audit log…" />
      </Card>
    );
  }

  if (error) {
    return <ErrorState message={error} onRetry={() => void load()} />;
  }

  return (
    <Card title="Audit Logs" subtitle="Administrative action trail">
      {logs.length === 0 ? (
        <EmptyState title="No audit entries" message="Administrative actions will appear here." />
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Action</th>
                <th>Actor</th>
                <th>Target</th>
                <th>Severity</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id}>
                  <td className="small muted">{new Date(l.createdAtUtc).toLocaleString()}</td>
                  <td style={{ fontWeight: 700 }}>{l.action}</td>
                  <td className="small">{l.actor || 'system'}</td>
                  <td className="small">{l.target || '—'}</td>
                  <td><Badge tone={l.severity === 'critical' ? 'danger' : l.severity === 'warning' ? 'warning' : 'info'}>{l.severity}</Badge></td>
                  <td><Badge tone={l.status === 'success' ? 'success' : 'danger'}>{l.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
