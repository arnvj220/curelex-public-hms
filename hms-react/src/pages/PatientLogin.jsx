// hms-react/src/pages/PatientLogin.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

export default function PatientLogin() {
  const [form,       setForm]       = useState({ email: '', password: '' });
  const [error,      setError]      = useState('');
  const [showForgot, setShowForgot] = useState(false);
  const [fpEmail,    setFpEmail]    = useState('');
  const [fpMsg,      setFpMsg]      = useState('');
  const { login, loginWithGoogle, forgotPassword, loading } = useAuth();
  const navigate = useNavigate();
  const googleBtnRef = useRef(null);

  // ── Standard login ───────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const result = await login(form.email, form.password);
    if (result.success) {
      if (result.user?.role === 'patient') {
        navigate('/patient-dashboard');
      } else {
        setError('This account is not registered as a patient. Please use staff login.');
      }
    } else {
      setError(result.message || 'Invalid credentials');
    }
  };

  // ── Forgot password ──────────────────────────────────────────────────────
  const handleForgot = async (e) => {
    e.preventDefault();
    setFpMsg('');
    const result = await forgotPassword(fpEmail);
    setFpMsg(result.success ? `✅ ${result.message}` : `❌ ${result.message}`);
  };

  // ── Google Sign-In ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    const initGoogle = () => {
      if (!window.google) return;
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleCredential,
      });
      if (googleBtnRef.current) {
        window.google.accounts.id.renderButton(googleBtnRef.current, {
          theme: 'outline', size: 'large', text: 'signin_with', width: '100%',
        });
      }
    };
    if (window.google) {
      initGoogle();
    } else {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true; script.defer = true;
      script.onload = initGoogle;
      document.head.appendChild(script);
      return () => document.head.removeChild(script);
    }
  }, [GOOGLE_CLIENT_ID]);

  const handleGoogleCredential = async (response) => {
    setError('');
    const result = await loginWithGoogle({ token: response.credential, isPatient: true });
    if (result.success) {
      if (result.user?.role === 'patient') navigate('/patient-dashboard');
      else setError('This Google account is not registered as a patient.');
    } else {
      setError(result.message);
    }
  };

  // Dev mock (no Client ID configured)
  const handleGoogleMock = async () => {
    setError('');
    const mockEmail = window.prompt('Enter your Google email for demo login:');
    if (!mockEmail) return;
    const result = await loginWithGoogle({ email: mockEmail, name: 'Google Patient', isPatient: true });
    if (result.success && result.user?.role === 'patient') navigate('/patient-dashboard');
    else setError(result.message || 'This Google account is not a patient account.');
  };

  return (
    <div className="login-page">
      <div className="login-card" style={{ maxWidth: 420 }}>
        <div className="login-logo">
          <div style={{ fontSize: 40, marginBottom: 8 }}>👤</div>
          <h1>Patient Login</h1>
          <p>Access your health records and appointments</p>
        </div>

        {!showForgot ? (
          <>
            {error && (
              <div className="error-msg" style={{
                background: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a5',
                padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px'
              }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input
                  className="form-control" type="email" placeholder="Enter your email"
                  value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Password</label>
                <input
                  className="form-control" type="password" placeholder="Enter your password"
                  value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required
                />
                <small style={{ color: '#94a3b8', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                  If you were registered by receptionist, use the same password to login
                </small>
              </div>

              <div style={{ textAlign: 'right', marginBottom: 14 }}>
                <button type="button" onClick={() => { setShowForgot(true); setError(''); }}
                  style={{ background: 'none', border: 'none', color: '#0f4c81', cursor: 'pointer', fontSize: 13, fontWeight: 600, padding: 0 }}>
                  Forgot password?
                </button>
              </div>

              <button className="btn btn-primary" type="submit" disabled={loading}
                style={{ width: '100%', justifyContent: 'center', padding: '12px', marginBottom: 0 }}>
                {loading ? 'Signing in...' : 'Sign In as Patient'}
              </button>
            </form>

            {/* Google Sign-In */}
            <div style={{ margin: '16px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
              <span style={{ color: '#94a3b8', fontSize: 12 }}>or</span>
              <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
            </div>

            {GOOGLE_CLIENT_ID ? (
              <div ref={googleBtnRef} style={{ display: 'flex', justifyContent: 'center' }} />
            ) : (
              <button type="button" onClick={handleGoogleMock} disabled={loading}
                style={{
                  width: '100%', padding: '11px', borderRadius: 8, border: '1px solid #d1d5db',
                  background: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 14,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: '#374151',
                }}>
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" width={20} height={20} />
                Continue with Google
              </button>
            )}

            <div style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: '#64748b' }}>
              New patient?{' '}
              <Link to="/register" style={{ color: '#0f4c81', fontWeight: 600, textDecoration: 'none' }}>
                Register here
              </Link>
            </div>
            <div style={{ textAlign: 'center', marginTop: 10, paddingTop: 10, borderTop: '1px solid #e2e8f0' }}>
              <Link to="/login" style={{ color: '#0f4c81', fontWeight: 600, textDecoration: 'none', fontSize: 13 }}>
                🏥 Staff Login
              </Link>
            </div>
          </>
        ) : (
          /* ── Forgot Password panel ─────────────────────────────────── */
          <>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', marginBottom: 6 }}>Reset Password</h2>
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 18 }}>
              Enter your registered email and we'll send you a reset link.
            </p>

            {fpMsg && (
              <div style={{
                padding: '10px 14px', borderRadius: 8, marginBottom: 14, fontSize: 13,
                background: fpMsg.startsWith('✅') ? '#ecfdf5' : '#fef2f2',
                color:      fpMsg.startsWith('✅') ? '#065f46' : '#991b1b',
              }}>
                {fpMsg}
              </div>
            )}

            <form onSubmit={handleForgot}>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input className="form-control" type="email" placeholder="your@email.com"
                  value={fpEmail} onChange={e => setFpEmail(e.target.value)} required />
              </div>
              <button className="btn btn-primary" type="submit" disabled={loading}
                style={{ width: '100%', justifyContent: 'center', padding: '12px' }}>
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <button type="button" onClick={() => { setShowForgot(false); setFpMsg(''); }}
                style={{ background: 'none', border: 'none', color: '#0f4c81', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                ← Back to Sign In
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}