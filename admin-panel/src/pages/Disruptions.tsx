// AeroNexus Admin Panel — Disruption Management page.

import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '../api/client';
import { useToast, Card, ErrorState, Spinner, EmptyState, Modal, Badge } from '../components/ui';
import { Icon } from '../components/icons';
import type { Disruption, ApiResponse } from '../api/types';

export default function Disruptions() {
  const { toast } = useToast();
  const [disruptions, setDisruptions] = useState<Disruption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState<Disruption | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [status, setStatus] = useState('open');
  const [severity, setSeverity] = useState('medium');
  const [actionPlan, setActionPlan] = useState('');
  const [rebookingStatus, setRebookingStatus] = useState('not_required');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<ApiResponse<Disruption[]>>('/api/admin/disruptions');
      if (res?.success) setDisruptions(res.data || []);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load disruptions.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openEdit = (d: Disruption) => {
    setEditing(d);
    setStatus(d.status || 'open');
    setSeverity(d.severity || 'medium');
    setActionPlan(d.actionPlan || '');
    setRebookingStatus(d.rebookingStatus || 'not_required');
    setFormOpen(true);
  };

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      await api.patch(`/api/admin/disruptions/${encodeURIComponent(editing.id)}`, { status, severity, actionPlan, rebookingStatus });
      toast('Disruption updated.', 'success');
      setFormOpen(false);
      setEditing(null);
      await load();
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Failed to update disruption.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <Spinner label="Loading disruptions…" />
      </Card>
    );
  }

  if (error) {
    return <ErrorState message={error} onRetry={() => void load()} />;
  }

  return (
    <>
      <Card title="Disruption Management" subtitle="Operational disruption cases and response actions">
        {disruptions.length === 0 ? (
          <EmptyState title="No disruptions" message="No disruption cases recorded." />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Case</th>
                  <th>Flight</th>
                  <th>Route</th>
                  <th>Type</th>
                  <th>Severity</th>
                  <th>Impacted</th>
                  <th>Status</th>
                  <th>Updated</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {disruptions.map((d) => (
                  <tr key={d.id}>
                    <td className="small">{d.caseNumber}</td>
                    <td style={{ fontWeight: 700 }}>{d.flightNumber}</td>
                    <td className="small">{d.route}</td>
                    <td className="small">{d.incidentType}</td>
                    <td><Badge tone={d.severity === 'critical' ? 'danger' : d.severity === 'high' ? 'warning' : 'info'}>{d.severity}</Badge></td>
                    <td className="small">{d.impactedPassengers}</td>
                    <td><Badge tone={d.status === 'open' ? 'warning' : d.status === 'investigating' ? 'info' : 'neutral'}>{d.status}</Badge></td>
                    <td className="small muted">{new Date(d.updatedAtUtc).toLocaleString()}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn btn-sm" onClick={() => openEdit(d)}>
                        <Icon name="settings" size={12} /> Manage
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        open={formOpen}
        title={`Manage Disruption ${editing?.caseNumber || ''}`}
        onClose={() => { setFormOpen(false); setEditing(null); }}
        footer={
          <>
            <button className="btn" onClick={() => { setFormOpen(false); setEditing(null); }}>Cancel</button>
            <button className="btn btn-primary" onClick={() => void save()} disabled={saving}>Save Update</button>
          </>
        }
      >
        <div className="field">
          <label>Status</label>
          <select className="select" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="open">open</option>
            <option value="investigating">investigating</option>
            <option value="resolved">resolved</option>
            <option value="closed">closed</option>
          </select>
        </div>
        <div className="field">
          <label>Severity</label>
          <select className="select" value={severity} onChange={(e) => setSeverity(e.target.value)}>
            <option value="low">low</option>
            <option value="medium">medium</option>
            <option value="high">high</option>
            <option value="critical">critical</option>
          </select>
        </div>
        <div className="field">
          <label>Action Plan</label>
          <textarea className="input" value={actionPlan} onChange={(e) => setActionPlan(e.target.value)} placeholder="Mitigation / recovery actions" />
        </div>
        <div className="field">
          <label>Rebooking Status</label>
          <select className="select" value={rebookingStatus} onChange={(e) => setRebookingStatus(e.target.value)}>
            <option value="not_required">not_required</option>
            <option value="in_progress">in_progress</option>
            <option value="completed">completed</option>
          </select>
        </div>
      </Modal>
    </>
  );
}
