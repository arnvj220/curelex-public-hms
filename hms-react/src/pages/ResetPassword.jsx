// hms-react/src/pages/ResetPassword.jsx
import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const email = searchParams.get('email') || '';

  const [newPassword,     setNewPassword]     = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message,         setMessage]         = useState('');
  const [isSuccess,       setIsSuccess]       = useState(false);
  const { resetPassword, loading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');

    if (newPassword.length < 6) {
      return setMessage('❌ Password must be at least 6 characters.');
    }
    if (newPassword !== confirmPassword) {
      return setMessage('❌ Passwords do not match.');
    }
    if (!token || !email) {
      return setMessage('❌ Invalid reset link. Please request a new one.');
    }

    const result = await resetPassword(email, token, newPassword);
    if (result.success) {
      setIsSuccess(true);
      setMessage('✅ ' + result.message);
      setTimeout(() => navigate('/login'), 2500);
    } else {
      setMessage('❌ ' + result.message);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card" style={{ maxWidth: 420 }}>
        <div className="login-logo">
          <div style={{ fontSize: 40, marginBottom: 8 }}>🔐</div>
          <h1>Set New Password</h1>
          <p style={{ fontSize: 13, color: '#64748b' }}>
            {email ? `Resetting password for: ${email}` : 'Enter your new password below'}
          </p>
        </div>

        {message && (
          <div style={{
            padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 13,
            background: isSuccess ? '#ecfdf5' : '#fef2f2',
            color:      isSuccess ? '#065f46' : '#991b1b',
            border:     `1px solid ${isSuccess ? '#6ee7b7' : '#fca5a5'}`,
          }}>
            {message}
          </div>
        )}

        {!isSuccess && (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">New Password</label>
              <input
                className="form-control"
                type="password"
                placeholder="Minimum 6 characters"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Confirm Password</label>
              <input
                className="form-control"
                type="password"
                placeholder="Re-enter your new password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            {!token && (
              <div style={{ background: '#fef9c3', border: '1px solid #fde68a', borderRadius: 8, padding: '10px 12px', marginBottom: 14, fontSize: 12, color: '#78350f' }}>
                ⚠️ No reset token found in this URL. Please use the exact link sent to your email.
              </div>
            )}

            <button
              className="btn btn-primary"
              type="submit"
              disabled={loading || !token}
              style={{ width: '100%', justifyContent: 'center', padding: '12px' }}
            >
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>
        )}

        {isSuccess && (
          <p style={{ textAlign: 'center', color: '#64748b', fontSize: 13, marginTop: 12 }}>
            Redirecting you to login…
          </p>
        )}

        <div style={{ textAlign: 'center', marginTop: 20, paddingTop: 16, borderTop: '1px solid #e2e8f0' }}>
          <Link to="/login" style={{ color: '#0f4c81', fontWeight: 600, textDecoration: 'none', fontSize: 13 }}>
            ← Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
