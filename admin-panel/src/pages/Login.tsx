// AeroNexus Admin Panel — admin login screen.

import { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../api/client';
import { Card } from '../components/ui';

export default function Login() {
  const { loginWithPin, loginWithCredentials } = useAuth();
  const [mode, setMode] = useState<'pin' | 'credentials'>('pin');
  const [pin, setPin] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submitPin = async () => {
    setError(null);
    if (!pin.trim()) {
      setError('Enter the staff PIN to continue.');
      return;
    }
    setBusy(true);
    try {
      await loginWithPin(pin.trim());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Admin authentication failed.');
    } finally {
      setBusy(false);
    }
  };

  const submitCredentials = async () => {
    setError(null);
    if (!identifier.trim() || !password) {
      setError('Enter administrator credentials.');
      return;
    }
    setBusy(true);
    try {
      await loginWithCredentials(identifier.trim(), password);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Admin authentication failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-screen">
      <div className="login-card">
        <Card>
          <div className="card-header">
            <div>
              <div className="card-title" style={{ fontSize: 18 }}>AeroNexus Admin Panel</div>
              <div className="card-subtitle">Operations Command Centre — restricted access</div>
            </div>
          </div>

          <div className="row mb-16" style={{ gap: 8 }}>
            <button className={`btn ${mode === 'pin' ? 'btn-primary' : ''}`} style={{ flex: 1 }} onClick={() => { setMode('pin'); setError(null); }}>
              Staff PIN
            </button>
            <button className={`btn ${mode === 'credentials' ? 'btn-primary' : ''}`} style={{ flex: 1 }} onClick={() => { setMode('credentials'); setError(null); }}>
              Credentials
            </button>
          </div>

          {error ? <div className="alert alert-error mb-16">{error}</div> : null}

          {mode === 'pin' ? (
            <>
              <div className="field">
                <label>Staff PIN</label>
                <input className="input" value={pin} onChange={(e) => setPin(e.target.value)} placeholder="••••" type="password" inputMode="numeric" />
              </div>
              <button className="btn btn-primary" style={{ width: '100%' }} onClick={submitPin} disabled={busy}>
                {busy ? 'Authenticating…' : 'Enter Operations Area'}
              </button>
            </>
          ) : (
            <>
              <div className="field">
                <label>Email / Username</label>
                <input className="input" value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder="admin@aeronexus.com" />
              </div>
              <div className="field">
                <label>Password</label>
                <input className="input" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" type="password" />
              </div>
              <button className="btn btn-primary" style={{ width: '100%' }} onClick={submitCredentials} disabled={busy}>
                {busy ? 'Authenticating…' : 'Sign In'}
              </button>
            </>
          )}

          <p className="small muted mt-16">
            Demo administrator: staff PIN <strong>1234</strong> (or credentials for an administrator account).
          </p>
        </Card>
      </div>
    </div>
  );
}
