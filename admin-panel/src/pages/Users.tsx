// AeroNexus Admin Panel — User Management page.

import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '../api/client';
import { useToast, Card, ErrorState, Spinner, EmptyState, Badge } from '../components/ui';
import type { User, ApiResponse } from '../api/types';

const ROLES: User['role'][] = ['passenger', 'staff', 'admin'];

export default function Users() {
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<ApiResponse<User[]>>('/api/admin/users');
      if (res?.success) setUsers(res.data || []);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load users.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const changeRole = async (u: User, role: User['role']) => {
    setSavingId(u.id);
    try {
      await api.patch(`/api/admin/users/${u.id}/role`, { role });
      toast(`User ${u.username} is now ${role}.`, 'success');
      await load();
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Failed to update user role.', 'error');
    } finally {
      setSavingId(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <Spinner label="Loading user directory…" />
      </Card>
    );
  }

  if (error) {
    return <ErrorState message={error} onRetry={() => void load()} />;
  }

  return (
    <Card title="User Management" subtitle="Registered platform accounts and staff assignments">
      {users.length === 0 ? (
        <EmptyState title="No users" message="No registered users found." />
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>User</th>
                <th>Contact</th>
                <th>Role</th>
                <th>Staff PIN</th>
                <th>Registered</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div className="row">
                      <span className="admin-avatar">{String(u.username || '?').slice(0, 2).toUpperCase()}</span>
                      <div>
                        <div style={{ fontWeight: 700 }}>{u.fullName || u.username}</div>
                        <div className="small muted">@{u.username}</div>
                      </div>
                    </div>
                  </td>
                  <td className="small">{u.email}</td>
                  <td>
                    <select className="select" style={{ width: 140, padding: '5px 8px', fontSize: 12 }} value={u.role} disabled={savingId === u.id} onChange={(e) => void changeRole(u, e.target.value as User['role'])}>
                      {ROLES.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </td>
                  <td className="small muted">{u.staffPin || '—'}</td>
                  <td className="small muted">{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}</td>
                  <td style={{ textAlign: 'right' }}>
                    <Badge tone={u.role === 'admin' ? 'danger' : u.role === 'staff' ? 'warning' : 'neutral'}>{u.role}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
