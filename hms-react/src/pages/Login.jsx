// hms-react/src/pages/Login.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

export default function Login() {
  const [form,  setForm]  = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [info,  setInfo]  = useState('');
  const { login, loginWithGoogle, forgotPassword, loading } = useAuth();
  const navigate = useNavigate();
  const googleBtnRef = useRef(null);

  // ── Redirect after login based on role ──────────────────────────────────
  const redirectByRole = (role) => {
    if (role === 'super_admin')      navigate('/super-admin');
    else if (role === 'patient')     navigate('/patient-dashboard');
    else if (role === 'separate_doctor') navigate('/solo-doctor-dashboard');
    else                             navigate('/dashboard');
  };

  // ── Standard login ───────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const result = await login(form.email, form.password);
    if (result.success) {
      redirectByRole(result.user?.role);
    } else {
      setError(result.message);
    }
  };

  // ── Forgot password ──────────────────────────────────────────────────────
  const [showForgot, setShowForgot] = useState(false);
  const [fpEmail, setFpEmail]       = useState('');
  const [fpMsg,   setFpMsg]         = useState('');

  const handleForgot = async (e) => {
    e.preventDefault();
    setFpMsg('');
    const result = await forgotPassword(fpEmail);
    if (result.success) {
      setFpMsg(`✅ ${result.message}`);
    } else {
      setFpMsg(`❌ ${result.message}`);
    }
  };

  // ── Google One Tap / GSI button ──────────────────────────────────────────
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
          theme: 'outline',
          size: 'large',
          text: 'signin_with',
          width: '100%',
        });
      }
    };

    if (window.google) {
      initGoogle();
    } else {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = initGoogle;
      document.head.appendChild(script);
      return () => document.head.removeChild(script);
    }
  }, [GOOGLE_CLIENT_ID]);

  const handleGoogleCredential = async (response) => {
    setError('');
    const result = await loginWithGoogle({
      token:     response.credential,
      isPatient: false,
    });
    if (result.success) {
      redirectByRole(result.user?.role);
    } else {
      setError(result.message);
    }
  };

  // ── Dev / no-ClientID mock button ────────────────────────────────────────
  const handleGoogleMock = async () => {
    setError('');
    const mockEmail = window.prompt('Enter your staff Google email for demo:');
    if (!mockEmail) return;
    const result = await loginWithGoogle({ email: mockEmail, name: 'Google User', isPatient: false });
    if (result.success) redirectByRole(result.user?.role);
    else setError(result.message);
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <div style={{ fontSize: 40, marginBottom: 8 }}>🏥</div>
          <h1>MediCare HMS</h1>
          <p>Hospital Management System</p>
        </div>

        {!showForgot ? (
          <>
            {error && <div className="error-msg">{error}</div>}
            {info  && <div className="success-msg" style={{ background: '#ecfdf5', color: '#065f46', padding: '10px 14px', borderRadius: 8, marginBottom: 14, fontSize: 13 }}>{info}</div>}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input
                  className="form-control"
                  type="email"
                  placeholder="Enter your email"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Password</label>
                <input
                  className="form-control"
                  type="password"
                  placeholder="Enter your password"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  required
                />
              </div>

              <div style={{ textAlign: 'right', marginBottom: 14 }}>
                <button
                  type="button"
                  onClick={() => { setShowForgot(true); setError(''); }}
                  style={{ background: 'none', border: 'none', color: '#0f4c81', cursor: 'pointer', fontSize: 13, fontWeight: 600, padding: 0 }}
                >
                  Forgot password?
                </button>
              </div>

              <button
                className="btn btn-primary"
                type="submit"
                disabled={loading}
                style={{ width: '100%', justifyContent: 'center', padding: '12px' }}
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

            {/* Google Sign-In */}
            <div style={{ margin: '16px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
              <span style={{ color: '#94a3b8', fontSize: 12 }}>or continue with</span>
              <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
            </div>

            {GOOGLE_CLIENT_ID ? (
              <div ref={googleBtnRef} style={{ display: 'flex', justifyContent: 'center' }} />
            ) : (
              <button
                type="button"
                onClick={handleGoogleMock}
                disabled={loading}
                style={{
                  width: '100%', padding: '11px', borderRadius: 8, border: '1px solid #d1d5db',
                  background: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 14,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  color: '#374151',
                }}
              >
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" width={20} height={20} />
                Sign in with Google
              </button>
            )}

            <div style={{ textAlign: 'center', marginTop: 18, fontSize: 13, color: '#64748b' }}>
              Don't have an account?{' '}
              <Link to="/register" style={{ color: '#0f4c81', fontWeight: 600, textDecoration: 'none' }}>
                Create Account
              </Link>
            </div>

            <div style={{ textAlign: 'center', marginTop: 12, paddingTop: 12, borderTop: '1px solid #e2e8f0' }}>
              <Link to="/patient-login" style={{ color: '#0f4c81', fontWeight: 600, textDecoration: 'none', fontSize: 13 }}>
                👤 Patient Login
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
                <input
                  className="form-control"
                  type="email"
                  placeholder="your@email.com"
                  value={fpEmail}
                  onChange={e => setFpEmail(e.target.value)}
                  required
                />
              </div>
              <button
                className="btn btn-primary"
                type="submit"
                disabled={loading}
                style={{ width: '100%', justifyContent: 'center', padding: '12px' }}
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <button
                type="button"
                onClick={() => { setShowForgot(false); setFpMsg(''); }}
                style={{ background: 'none', border: 'none', color: '#0f4c81', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
              >
                ← Back to Sign In
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}