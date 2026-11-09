// AeroNexus Admin Panel — Airport Management page.

import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '../api/client';
import { useToast, Card, ErrorState, Spinner, EmptyState, Badge, Modal, ConfirmDialog, Button } from '../components/ui';
import { Icon } from '../components/icons';
import type { ApiResponse, Airport } from '../api/types';

interface AirportFormState {
  code: string;
  name: string;
  city: string;
  country: string;
  timezone: string;
  latitude: string;
  longitude: string;
  kind: string;
}

const EMPTY_FORM: AirportFormState = {
  code: '',
  name: '',
  city: '',
  country: '',
  timezone: '',
  latitude: '',
  longitude: '',
  kind: 'airport',
};

export default function Airports() {
  const { toast } = useToast();
  const [airports, setAirports] = useState<Airport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Airport | null>(null);
  const [form, setForm] = useState<AirportFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<Airport | null>(null);
  const [deletingAirport, setDeletingAirport] = useState(false);

  const loadInitial = useCallback(async () => {
    try {
      const res = await api.get<ApiResponse<Airport[]>>('/api/admin/airports');
      if (res?.success) setAirports(res.data || []);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load airports.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const res = await api.get<ApiResponse<Airport[]>>('/api/admin/airports');
        if (!cancelled && res?.success) setAirports(res.data || []);
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.message : 'Failed to load airports.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = airports.filter((a) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return [a.code, a.name, a.city, a.country].some((v) => String(v ?? '').toLowerCase().includes(q));
  });

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  };

  const openEdit = (a: Airport) => {
    setEditing(a);
    setForm({
      code: a.code,
      name: a.name,
      city: a.city || '',
      country: a.country || '',
      timezone: a.timezone || '',
      latitude: a.latitude != null ? String(a.latitude) : '',
      longitude: a.longitude != null ? String(a.longitude) : '',
      kind: a.kind || 'airport',
    });
    setFormOpen(true);
  };

  const save = async () => {
    if (!form.code.trim() || !form.name.trim()) {
      toast('Airport code and name are required.', 'error');
      return;
    }
    if (!/^[A-Z]{3}$/.test(form.code.trim().toUpperCase())) {
      toast('Airport code must be a 3-letter IATA code.', 'error');
      return;
    }
    setSaving(true);
    const payload = {
      code: form.code.trim().toUpperCase(),
      name: form.name.trim(),
      city: form.city.trim(),
      country: form.country.trim(),
      timezone: form.timezone.trim() || null,
      latitude: form.latitude.trim() ? Number(form.latitude) : null,
      longitude: form.longitude.trim() ? Number(form.longitude) : null,
      kind: form.kind || 'airport',
    };
    try {
      if (editing) {
        await api.put(`/api/admin/airports/${encodeURIComponent(editing.code)}`, payload);
        toast('Airport updated.', 'success');
      } else {
        await api.post('/api/admin/airports', payload);
        toast('Airport created.', 'success');
      }
      setFormOpen(false);
      setEditing(null);
      await loadInitial();
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Failed to save airport.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!deleting) return;
    setDeletingAirport(true);
    try {
      await api.delete(`/api/admin/airports/${encodeURIComponent(deleting.code)}`);
      toast('Airport deleted.', 'success');
      setDeleting(null);
      await loadInitial();
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Failed to delete airport.', 'error');
    } finally {
      setDeletingAirport(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <Spinner label="Loading airports…" />
      </Card>
    );
  }

  if (error) {
    return <ErrorState message={error} onRetry={() => void loadInitial()} />;
  }

  return (
    <>
      <Card
        title="Airport Management"
        subtitle="Operational airport records"
        actions={<Button onClick={() => openCreate()}><Icon name="plus" size={16} /> Add Airport</Button>}
      >
        <div style={{ marginBottom: 12 }}>
          <input className="input" placeholder="Search by code, name, city or country…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        {filtered.length === 0 ? (
          <EmptyState title="No airports" message="No operational airport records found." />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Name</th>
                  <th>City</th>
                  <th>Country</th>
                  <th>Kind</th>
                  <th>Coordinates</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => (
                  <tr key={a.code}>
                    <td style={{ fontWeight: 700 }}>{a.code}</td>
                    <td>{a.name}</td>
                    <td className="small">{a.city}</td>
                    <td className="small">{a.country}</td>
                    <td><Badge tone="info">{a.kind || 'airport'}</Badge></td>
                    <td className="small muted">{a.latitude != null ? `${a.latitude.toFixed(4)} / ${a.longitude != null ? a.longitude.toFixed(4) : '—'}` : '—'}</td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="row" style={{ justifyContent: 'flex-end', gap: 6 }}>
                        <Button variant="ghost" onClick={() => openEdit(a)}>Edit</Button>
                        <Button variant="danger" onClick={() => setDeleting(a)}>Delete</Button>
                      </div>
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
        title={editing ? 'Edit Airport' : 'Add Airport'}
        onClose={() => setFormOpen(false)}
        footer={
          <Button variant="primary" onClick={() => void save()} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        }
      >
        <div className="grid" style={{ gap: 12 }}>
          <div className="field">
            <label>Airport Code (IATA) *</label>
            <input className="input" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="DEN" autoCapitalize="characters" />
          </div>
          <div className="field">
            <label>Airport Name *</label>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="field">
              <label>City</label>
              <input className="input" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </div>
            <div className="field">
              <label>Country</label>
              <input className="input" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
            </div>
          </div>
          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="field">
              <label>Timezone</label>
              <input className="input" value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })} />
            </div>
            <div className="field">
              <label>Kind</label>
              <input className="input" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })} />
            </div>
          </div>
          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="field">
              <label>Latitude</label>
              <input className="input" value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} inputMode="decimal" />
            </div>
            <div className="field">
              <label>Longitude</label>
              <input className="input" value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} inputMode="decimal" />
            </div>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete Airport"
        message={deleting ? `Delete operational airport ${deleting.code} (${deleting.name})? This action cannot be undone.` : ''}
        confirmLabel="Delete"
        loading={deletingAirport}
        onConfirm={() => void remove()}
        onCancel={() => setDeleting(null)}
      />
    </>
  );
}
