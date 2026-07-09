// hms-react/src/pages/Register.jsx
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import API from '../utils/api';

const DEPARTMENTS = [
  'General Medicine', 'Cardiology', 'Orthopedics', 'Pediatrics',
  'Gynecology', 'Neurology', 'Radiology', 'Emergency', 'Surgery',
  'Dermatology', 'Psychiatry', 'Ophthalmology', 'ENT', 'Administration',
];

export default function Register() {
  const [form, setForm] = useState({
    accountType:     'admin', // 'admin' or 'separate_doctor'
    clinicName:      '',
    name:            '',
    email:           '',
    password:        '',
    confirmPassword: '',
    department:      '',
    phone:           '',
  });
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirmPassword) return setError('Passwords do not match');
    if (form.password.length < 6) return setError('Password must be at least 6 characters');
    if (form.accountType === 'admin' && !form.clinicName.trim()) return setError('Clinic / Hospital name is required');

    setLoading(true);
    try {
      const payload = {
        name:       form.name,
        email:      form.email,
        password:   form.password,
        role:       form.accountType,
        department: form.department,
        phone:      form.phone,
        type: 'hospital'
      };

      if (form.accountType === 'admin') {
        payload.clinicName = form.clinicName;
      }

      const { data } = await API.post('/auth/register', payload);

      localStorage.setItem('hms_token', data.token);
      localStorage.setItem('hms_user', JSON.stringify(data.user));
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card" style={{ maxWidth: 460, width: '100%' }}>

        {/* Header */}
        <div className="login-logo">
          <div style={{ fontSize: 36, marginBottom: 6 }}>🏥</div>
          <h1>MediCare HMS</h1>
          <p>Create your account</p>
        </div>

        {error && <div className="error-msg">{error}</div>}

        <form onSubmit={handleSubmit}>

          <div className="form-group" style={{ marginBottom: 20 }}>
            <label className="form-label">Account Type *</label>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                onClick={() => setForm({ ...form, accountType: 'admin' })}
                style={{
                  flex: 1, padding: '10px', borderRadius: 8,
                  border: form.accountType === 'admin' ? '2px solid #0f4c81' : '1px solid #cbd5e1',
                  background: form.accountType === 'admin' ? '#eff6ff' : '#fff',
                  color: form.accountType === 'admin' ? '#0f4c81' : '#475569',
                  fontWeight: 600, cursor: 'pointer'
                }}
              >
                Clinic Admin
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, accountType: 'separate_doctor' })}
                style={{
                  flex: 1, padding: '10px', borderRadius: 8,
                  border: form.accountType === 'separate_doctor' ? '2px solid #0f4c81' : '1px solid #cbd5e1',
                  background: form.accountType === 'separate_doctor' ? '#eff6ff' : '#fff',
                  color: form.accountType === 'separate_doctor' ? '#0f4c81' : '#475569',
                  fontWeight: 600, cursor: 'pointer'
                }}
              >
                Solo Doctor
              </button>
            </div>
          </div>

          {form.accountType === 'admin' && (
            <div className="form-group">
              <label className="form-label">Clinic / Hospital Name *</label>
              <input
                className="form-control"
                name="clinicName"
                type="text"
                placeholder="e.g. City Health Clinic"
                value={form.clinicName}
                onChange={handleChange}
                required={form.accountType === 'admin'}
              />
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                This creates a new isolated clinic workspace.
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Full Name *</label>
            <input className="form-control" name="name" type="text" placeholder="John Smith"
              value={form.name} onChange={handleChange} required />
          </div>

          <div className="form-group">
            <label className="form-label">Email Address *</label>
            <input className="form-control" name="email" type="email" placeholder="you@hospital.com"
              value={form.email} onChange={handleChange} required />
          </div>

          <div className="form-group">
            <label className="form-label">Phone Number</label>
            <input className="form-control" name="phone" type="tel" placeholder="+91 98765 43210"
              value={form.phone} onChange={handleChange} />
          </div>

          <div className="form-group">
            <label className="form-label">Department</label>
            <select className="form-control" name="department" value={form.department} onChange={handleChange}>
              <option value="">Select Department</option>
              {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Password *</label>
            <input className="form-control" name="password" type="password" placeholder="Min. 6 characters"
              value={form.password} onChange={handleChange} required />
          </div>

          <div className="form-group">
            <label className="form-label">Confirm Password *</label>
            <input className="form-control" name="confirmPassword" type="password" placeholder="Re-enter password"
              value={form.confirmPassword} onChange={handleChange} required />
          </div>

          <button
            className="btn btn-primary"
            type="submit"
            disabled={loading}
            style={{ width: '100%', justifyContent: 'center', padding: '12px', marginTop: 4 }}
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>

          <div style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: '#64748b' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: '#0f4c81', fontWeight: 600, textDecoration: 'none' }}>Sign In</Link>
          </div>
        </form>
      </div>
    </div>
  );
}