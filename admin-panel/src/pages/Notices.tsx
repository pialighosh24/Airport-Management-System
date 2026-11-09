// AeroNexus Admin Panel — Flight Operations Notices page.

import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '../api/client';
import { useToast, Card, ErrorState, Spinner, EmptyState, Modal, Badge } from '../components/ui';
import { Icon } from '../components/icons';
import type { Notice, ApiResponse } from '../api/types';

interface NoticeFormState {
  title: string;
  category: string;
  severity: string;
  status: string;
  summary: string;
  body: string;
  effectiveFromUtc: string;
  effectiveToUtc: string;
  publishedBy: string;
}

const EMPTY_NOTICE: NoticeFormState = {
  title: '',
  category: 'operational',
  severity: 'info',
  status: 'draft',
  summary: '',
  body: '',
  effectiveFromUtc: '',
  effectiveToUtc: '',
  publishedBy: '',
};

export default function Notices() {
  const { toast } = useToast();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Notice | null>(null);
  const [form, setForm] = useState<NoticeFormState>(EMPTY_NOTICE);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<ApiResponse<Notice[]>>('/api/admin/notices');
      if (res?.success) setNotices(res.data || []);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load notices.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadInitial = async () => {
      try {
        const res = await api.get<ApiResponse<Notice[]>>('/api/admin/notices');
        if (!cancelled && res?.success) setNotices(res.data || []);
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.message : 'Failed to load notices.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void loadInitial();
    return () => {
      cancelled = true;
    };
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_NOTICE);
    setFormOpen(true);
  };

  const openEdit = (n: Notice) => {
    setEditing(n);
    setForm({
      title: n.title || '',
      category: n.category || 'operational',
      severity: n.severity || 'info',
      status: n.status || 'draft',
      summary: n.summary || '',
      body: n.body || '',
      effectiveFromUtc: n.effectiveFromUtc ? new Date(n.effectiveFromUtc).toISOString().slice(0, 10) : '',
      effectiveToUtc: n.effectiveToUtc ? new Date(n.effectiveToUtc).toISOString().slice(0, 10) : '',
      publishedBy: n.publishedBy || '',
    });
    setFormOpen(true);
  };

  const save = async () => {
    if (!form.title.trim()) {
      toast('Notice title is required.', 'error');
      return;
    }
    const payload = {
      title: form.title.trim(),
      category: form.category,
      severity: form.severity,
      status: form.status,
      summary: form.summary.trim(),
      body: form.body.trim(),
      effectiveFromUtc: form.effectiveFromUtc ? new Date(`${form.effectiveFromUtc}T00:00:00Z`).toISOString() : null,
      effectiveToUtc: form.effectiveToUtc ? new Date(`${form.effectiveToUtc}T23:59:59Z`).toISOString() : null,
      publishedBy: form.publishedBy.trim() || 'Admin',
    };
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/api/admin/notices/${encodeURIComponent(editing.id)}`, payload);
        toast('Notice updated.', 'success');
      } else {
        await api.post('/api/admin/notices', payload);
        toast('Notice created.', 'success');
      }
      setFormOpen(false);
      setEditing(null);
      await load();
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Failed to save notice.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (n: Notice) => {
    try {
      await api.delete(`/api/admin/notices/${encodeURIComponent(n.id)}`);
      toast('Notice deleted.', 'success');
      await load();
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Failed to delete notice.', 'error');
    }
  };

  const setStatus = async (n: Notice, status: string) => {
    const payload = { ...n, status };
    try {
      await api.put(`/api/admin/notices/${encodeURIComponent(n.id)}`, payload);
      toast(`Notice ${status}.`, 'success');
      await load();
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Failed to update notice status.', 'error');
    }
  };

  if (loading) {
    return (
      <Card>
        <Spinner label="Loading flight operations notices…" />
      </Card>
    );
  }

  if (error) {
    return <ErrorState message={error} onRetry={() => void load()} />;
  }

  return (
    <>
      <Card
        title="Flight Operations Notices"
        subtitle="Create, publish and deactivate operational notices"
        actions={
          <button className="btn btn-primary" onClick={openCreate}>
            <Icon name="plus" size={14} /> New Notice
          </button>
        }
      >
        {notices.length === 0 ? (
          <EmptyState title="No notices" message="Create a flight operations notice to broadcast updates." />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Notice</th>
                  <th>Number</th>
                  <th>Severity</th>
                  <th>Status</th>
                  <th>Effective</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {notices.map((n) => (
                  <tr key={n.id}>
                    <td>
                      <div style={{ fontWeight: 700 }}>{n.title}</div>
                      <div className="small muted">{n.summary}</div>
                    </td>
                    <td className="small">{n.noticeNumber}</td>
                    <td><Badge tone={n.severity === 'critical' ? 'danger' : n.severity === 'high' ? 'warning' : 'info'}>{n.severity}</Badge></td>
                    <td><Badge tone={n.status === 'published' ? 'success' : n.status === 'draft' ? 'neutral' : 'warning'}>{n.status}</Badge></td>
                    <td className="small muted">{n.effectiveFromUtc ? new Date(n.effectiveFromUtc).toLocaleDateString() : '—'} → {n.effectiveToUtc ? new Date(n.effectiveToUtc).toLocaleDateString() : '—'}</td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {n.status !== 'published' ? (
                        <button className="btn btn-sm" onClick={() => void setStatus(n, 'published')}>Publish</button>
                      ) : null}
                      {n.status !== 'deactivated' ? (
                        <button className="btn btn-sm" onClick={() => void setStatus(n, 'deactivated')}>Deactivate</button>
                      ) : null}{' '}
                      <button className="btn btn-sm" onClick={() => openEdit(n)}>Edit</button>{' '}
                      <button className="btn btn-sm btn-danger" onClick={() => void remove(n)}>Delete</button>
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
        title={editing ? `Edit Notice ${editing.noticeNumber}` : 'New Flight Operations Notice'}
        onClose={() => { setFormOpen(false); setEditing(null); }}
        footer={
          <>
            <button className="btn" onClick={() => { setFormOpen(false); setEditing(null); }}>Cancel</button>
            <button className="btn btn-primary" onClick={() => void save()} disabled={saving}>{saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Notice'}</button>
          </>
        }
      >
        <div className="field"><label>Title *</label><input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="field"><label>Category</label><input className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></div>
          <div className="field"><label>Severity</label><select className="select" value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })}><option value="info">info</option><option value="low">low</option><option value="medium">medium</option><option value="high">high</option><option value="critical">critical</option></select></div>
          <div className="field"><label>Status</label><select className="select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option value="draft">draft</option><option value="published">published</option><option value="deactivated">deactivated</option></select></div>
          <div className="field"><label>Published By</label><input className="input" value={form.publishedBy} onChange={(e) => setForm({ ...form, publishedBy: e.target.value })} /></div>
        </div>
        <div className="field"><label>Summary</label><textarea className="input" value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} /></div>
        <div className="field"><label>Body</label><textarea className="input" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} /></div>
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="field"><label>Effective From</label><input className="input" value={form.effectiveFromUtc} onChange={(e) => setForm({ ...form, effectiveFromUtc: e.target.value })} /></div>
          <div className="field"><label>Effective To</label><input className="input" value={form.effectiveToUtc} onChange={(e) => setForm({ ...form, effectiveToUtc: e.target.value })} /></div>
        </div>
      </Modal>
    </>
  );
}
