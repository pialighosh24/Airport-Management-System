// AeroNexus Admin Panel — Flight Management page.

import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '../api/client';
import { useToast, Card, ErrorState, Spinner, EmptyState, Modal, ConfirmDialog, Badge } from '../components/ui';
import { Icon } from '../components/icons';
import type { Flight, ApiResponse } from '../api/types';

const STATUSES = ['scheduled', 'en_route', 'delayed', 'cancelled', 'departed', 'approaching', 'boarding', 'landed'];

interface FlightFormState {
  flightNumber: string;
  callsign: string;
  airlineName: string;
  airlineIata: string;
  airlineIca: string;
  aircraftModel: string;
  registration: string;
  originIata: string;
  originIca: string;
  originName: string;
  originCity: string;
  originCountry: string;
  originTerminal: string;
  originGate: string;
  destinationIata: string;
  destinationIca: string;
  destinationName: string;
  destinationCity: string;
  destinationCountry: string;
  destinationTerminal: string;
  destinationGate: string;
  latitude: string;
  longitude: string;
  altitudeFeet: string;
  groundSpeedKnots: string;
  headingDegrees: string;
  verticalRateFpm: string;
  squawkCode: string;
  status: string;
}

const EMPTY_FORM: FlightFormState = {
  flightNumber: '',
  callsign: '',
  airlineName: '',
  airlineIata: '',
  airlineIca: '',
  aircraftModel: '',
  registration: '',
  originIata: '',
  originIca: '',
  originName: '',
  originCity: '',
  originCountry: '',
  originTerminal: '',
  originGate: '',
  destinationIata: '',
  destinationIca: '',
  destinationName: '',
  destinationCity: '',
  destinationCountry: '',
  destinationTerminal: '',
  destinationGate: '',
  latitude: '',
  longitude: '',
  altitudeFeet: '',
  groundSpeedKnots: '',
  headingDegrees: '',
  verticalRateFpm: '',
  squawkCode: '',
  status: 'scheduled',
};

function fromFlight(f: Flight): FlightFormState {
  return {
    flightNumber: f.flightNumber || '',
    callsign: f.callsign || '',
    airlineName: f.airline?.name || '',
    airlineIata: f.airline?.iata || '',
    airlineIca: f.airline?.icao || '',
    aircraftModel: f.aircraftModel || '',
    registration: f.registration || '',
    originIata: f.origin?.iata || '',
    originIca: f.origin?.icao || '',
    originName: f.origin?.name || '',
    originCity: f.origin?.city || '',
    originCountry: f.origin?.country || '',
    originTerminal: f.origin?.terminal || '',
    originGate: f.origin?.gate || '',
    destinationIata: f.destination?.iata || '',
    destinationIca: f.destination?.icao || '',
    destinationName: f.destination?.name || '',
    destinationCity: f.destination?.city || '',
    destinationCountry: f.destination?.country || '',
    destinationTerminal: f.destination?.terminal || '',
    destinationGate: f.destination?.gate || '',
    latitude: f.latitude != null ? String(f.latitude) : '',
    longitude: f.longitude != null ? String(f.longitude) : '',
    altitudeFeet: f.altitudeFeet != null ? String(f.altitudeFeet) : '',
    groundSpeedKnots: f.groundSpeedKnots != null ? String(f.groundSpeedKnots) : '',
    headingDegrees: f.headingDegrees != null ? String(f.headingDegrees) : '',
    verticalRateFpm: f.verticalRateFpm != null ? String(f.verticalRateFpm) : '',
    squawkCode: f.squawkCode || '',
    status: f.status || 'scheduled',
  };
}

export default function Flights() {
  const { toast } = useToast();
  const [flights, setFlights] = useState<Flight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [editing, setEditing] = useState<Flight | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FlightFormState>(EMPTY_FORM);
  const [savingFlight, setSavingFlight] = useState(false);
  const [deleting, setDeleting] = useState<Flight | null>(null);
  const [deletingFlight, setDeletingFlight] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<ApiResponse<Flight[]>>(`/api/admin/flights?status=${encodeURIComponent(statusFilter)}&search=${encodeURIComponent(search)}`);
      if (res?.success) setFlights(res.data || []);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load flights.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search]);

  useEffect(() => {
    let cancelled = false;
    const loadFiltered = async () => {
      try {
        const res = await api.get<ApiResponse<Flight[]>>(`/api/admin/flights?status=${encodeURIComponent(statusFilter)}&search=${encodeURIComponent(search)}`);
        if (!cancelled && res?.success) setFlights(res.data || []);
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.message : 'Failed to load flights.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void loadFiltered();
    return () => {
      cancelled = true;
    };
  }, [statusFilter, search]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  };

  const openEdit = (f: Flight) => {
    setEditing(f);
    setForm(fromFlight(f));
    setFormOpen(true);
  };

  const saveFlight = async () => {
    if (!form.flightNumber.trim()) {
      toast('Flight number is required.', 'error');
      return;
    }
    setSavingFlight(true);
    const payload = {
      ...form,
      flightNumber: form.flightNumber.trim().toUpperCase(),
      callsign: form.callsign.trim().toUpperCase(),
      airlineName: form.airlineName.trim(),
      airlineIata: form.airlineIata.trim(),
      airlineIca: form.airlineIca.trim(),
      aircraftModel: form.aircraftModel.trim() || null,
      registration: form.registration.trim() || null,
      originIata: form.originIata.trim().toUpperCase(),
      originIca: form.originIca.trim() || null,
      originName: form.originName.trim(),
      originCity: form.originCity.trim(),
      originCountry: form.originCountry.trim(),
      originTerminal: form.originTerminal.trim() || null,
      originGate: form.originGate.trim() || null,
      destinationIata: form.destinationIata.trim().toUpperCase(),
      destinationIca: form.destinationIca.trim() || null,
      destinationName: form.destinationName.trim(),
      destinationCity: form.destinationCity.trim(),
      destinationCountry: form.destinationCountry.trim(),
      destinationTerminal: form.destinationTerminal.trim() || null,
      destinationGate: form.destinationGate.trim() || null,
      latitude: form.latitude ? Number(form.latitude) : null,
      longitude: form.longitude ? Number(form.longitude) : null,
      altitudeFeet: form.altitudeFeet ? Number(form.altitudeFeet) : null,
      groundSpeedKnots: form.groundSpeedKnots ? Number(form.groundSpeedKnots) : null,
      headingDegrees: form.headingDegrees ? Number(form.headingDegrees) : null,
      verticalRateFpm: form.verticalRateFpm ? Number(form.verticalRateFpm) : null,
      squawkCode: form.squawkCode.trim() || null,
      status: form.status,
      isDemo: true,
      dataSource: 'ADMIN_PANEL',
      disclaimer: 'Flight record maintained via AeroNexus Admin Panel.',
    };

    try {
      if (editing) {
        await api.put(`/api/admin/flights/${encodeURIComponent(editing.flightNumber || form.flightNumber)}`, payload);
        toast('Flight updated successfully.', 'success');
      } else {
        await api.post('/api/admin/flights', payload);
        toast('Flight created successfully.', 'success');
      }
      setFormOpen(false);
      setEditing(null);
      await load();
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Failed to save flight.', 'error');
    } finally {
      setSavingFlight(false);
    }
  };

  const deleteFlight = async () => {
    if (!deleting) return;
    setDeletingFlight(true);
    try {
      await api.delete(`/api/admin/flights/${encodeURIComponent(deleting.flightNumber || '')}`);
      toast('Flight deleted.', 'success');
      setDeleting(null);
      await load();
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Failed to delete flight.', 'error');
    } finally {
      setDeletingFlight(false);
    }
  };

  const updateFlightStatus = async (f: Flight, status: string) => {
    try {
      await api.patch(`/api/admin/flights/${encodeURIComponent(f.flightNumber || '')}/status`, { status });
      toast(`Flight ${f.flightNumber} marked ${status}.`, 'success');
      await load();
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Failed to update flight status.', 'error');
    }
  };

  if (loading) {
    return (
      <Card>
        <Spinner label="Loading flight operations…" />
      </Card>
    );
  }

  if (error) {
    return <ErrorState message={error} onRetry={() => void load()} />;
  }

  return (
    <>
      <Card
        title="Flight Management"
        subtitle="Operational fleet registry — status, telemetry and schedule oversight"
        actions={
          <button className="btn btn-primary" onClick={openCreate}>
            <Icon name="plus" size={14} /> Add Flight
          </button>
        }
      >
        <div className="row mb-16" style={{ gap: 10, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', minWidth: 240, flex: 1 }}>
            <input className="input" style={{ paddingLeft: 32 }} placeholder="Search by flight number / callsign" value={search} onChange={(e) => setSearch(e.target.value)} />
            <span style={{ position: 'absolute', left: 10, top: 10, color: '#64748b' }}><Icon name="search" size={14} /></span>
          </div>
          <select className="select" style={{ width: 220 }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All Statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s.replace('_', ' ')}</option>
            ))}
          </select>
        </div>

        {flights.length === 0 ? (
          <EmptyState title="No flights found" message="Adjust filters or add a new flight record." />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Flight</th>
                  <th>Airline</th>
                  <th>Route</th>
                  <th>Status</th>
                  <th>Telemetry</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {flights.map((f) => (
                  <tr key={f.flightNumber || f.callsign || 'flight'}>
                    <td>
                      <div style={{ fontWeight: 700 }}>{f.flightNumber}</div>
                      <div className="small muted">{f.callsign}</div>
                    </td>
                    <td className="small">{f.airline?.name || '—'}</td>
                    <td className="small">{f.origin?.iata || '?'} → {f.destination?.iata || '?'}</td>
                    <td><Badge tone={f.status === 'delayed' ? 'warning' : f.status === 'cancelled' ? 'danger' : f.status === 'en_route' ? 'accent' : 'neutral'}>{f.status}</Badge></td>
                    <td className="small muted">{f.freshness?.status || 'unknown'}</td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <select
                        className="select"
                        style={{ width: 150, padding: '5px 8px', fontSize: 12 }}
                        value={f.status}
                        onChange={(e) => void updateFlightStatus(f, e.target.value)}
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>{s.replace('_', ' ')}</option>
                        ))}
                      </select>{' '}
                      <button className="btn btn-sm" onClick={() => openEdit(f)}>
                        <Icon name="settings" size={12} /> Edit
                      </button>{' '}
                      <button className="btn btn-sm btn-danger" onClick={() => { setDeleting(f); setDeletingFlight(false); }}>
                        <Icon name="alert" size={12} /> Delete
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
        title={editing ? `Edit Flight ${editing.flightNumber}` : 'Add Flight'}
        onClose={() => { setFormOpen(false); setEditing(null); }}
        footer={
          <>
            <button className="btn" onClick={() => { setFormOpen(false); setEditing(null); }}>Cancel</button>
            <button className="btn btn-primary" onClick={() => void saveFlight()} disabled={savingFlight}>
              {savingFlight ? 'Saving…' : editing ? 'Save Changes' : 'Create Flight'}
            </button>
          </>
        }
      >
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 0 }}>
          <div className="field"><label>Flight Number *</label><input className="input" value={form.flightNumber} onChange={(e) => setForm({ ...form, flightNumber: e.target.value })} /></div>
          <div className="field"><label>Callsign</label><input className="input" value={form.callsign} onChange={(e) => setForm({ ...form, callsign: e.target.value })} /></div>
          <div className="field"><label>Airline Name</label><input className="input" value={form.airlineName} onChange={(e) => setForm({ ...form, airlineName: e.target.value })} /></div>
          <div className="field"><label>Airline IATA</label><input className="input" value={form.airlineIata} onChange={(e) => setForm({ ...form, airlineIata: e.target.value })} /></div>
          <div className="field"><label>Airline ICAO</label><input className="input" value={form.airlineIca} onChange={(e) => setForm({ ...form, airlineIca: e.target.value })} /></div>
          <div className="field"><label>Aircraft Model</label><input className="input" value={form.aircraftModel} onChange={(e) => setForm({ ...form, aircraftModel: e.target.value })} /></div>
          <div className="field"><label>Registration</label><input className="input" value={form.registration} onChange={(e) => setForm({ ...form, registration: e.target.value })} /></div>
          <div className="field"><label>Status</label>
            <select className="select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 0 }}>
          <div className="field"><label>Origin IATA *</label><input className="input" value={form.originIata} onChange={(e) => setForm({ ...form, originIata: e.target.value })} /></div>
          <div className="field"><label>Destination IATA *</label><input className="input" value={form.destinationIata} onChange={(e) => setForm({ ...form, destinationIata: e.target.value })} /></div>
          <div className="field"><label>Latitude</label><input className="input" value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} /></div>
          <div className="field"><label>Longitude</label><input className="input" value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} /></div>
          <div className="field"><label>Altitude (ft)</label><input className="input" value={form.altitudeFeet} onChange={(e) => setForm({ ...form, altitudeFeet: e.target.value })} /></div>
          <div className="field"><label>Ground Speed (kts)</label><input className="input" value={form.groundSpeedKnots} onChange={(e) => setForm({ ...form, groundSpeedKnots: e.target.value })} /></div>
          <div className="field"><label>Heading</label><input className="input" value={form.headingDegrees} onChange={(e) => setForm({ ...form, headingDegrees: e.target.value })} /></div>
          <div className="field"><label>Vertical Rate (fpm)</label><input className="input" value={form.verticalRateFpm} onChange={(e) => setForm({ ...form, verticalRateFpm: e.target.value })} /></div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        title="Delete flight"
        message={`Permanently remove flight ${deleting?.flightNumber || ''} from the operational store? This action is recorded in the audit log.`}
        confirmLabel="Delete Flight"
        loading={deletingFlight}
        onCancel={() => { setDeleting(null); setDeletingFlight(false); }}
        onConfirm={() => { void deleteFlight(); }}
      />
    </>
  );
}
