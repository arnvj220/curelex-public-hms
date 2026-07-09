// hms-react/src/pages/SuperAdminDashboard.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import API from '../utils/api';

const TABS = ['Overview', 'Clinics', 'Staff', 'Users', 'Consultations', 'Clinic Dashboard', 'Payroll'];

function StatCard({ label, value, icon, color }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 12, padding: '18px 20px',
      display: 'flex', alignItems: 'center', gap: 14,
      border: '1px solid #e5e7eb', boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 10,
        background: color + '22', display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontSize: 20, flexShrink: 0,
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#1a2236' }}>{value}</div>
        <div style={{ fontSize: 12, color: '#6b7a99', marginTop: 2 }}>{label}</div>
      </div>
    </div>
  );
}

function OverviewTab({ clinics, allUsers }) {
  const [patientCounts, setPatientCounts] = useState({});
  const [loadingPatients, setLoadingPatients] = useState(true);
  
  useEffect(() => {
    const fetchPatientCounts = async () => {
      try {
        const counts = {};
        for (const clinic of clinics) {
          const { data } = await API.get(`/patients?clinicId=${clinic._id}&limit=1`);
          counts[clinic._id] = data.total || 0;
        }
        setPatientCounts(counts);
      } catch (err) {
        console.error('Failed to fetch patient counts:', err);
      } finally {
        setLoadingPatients(false);
      }
    };
    
    if (clinics.length > 0) {
      fetchPatientCounts();
    } else {
      setLoadingPatients(false);
    }
  }, [clinics]);

  const totalStaff = allUsers.filter(u => u.role !== 'patient' && u.role !== 'super_admin').length;
  const totalPatients = Object.values(patientCounts).reduce((a, b) => a + b, 0);
  const totalDoctors = allUsers.filter(u => u.role === 'doctor').length;
  const totalAdmins = allUsers.filter(u => u.role === 'admin').length;
  const activeUsers = allUsers.filter(u => u.isActive).length;
  
  // Clinic type counts
  const hospitals = clinics.filter(c => c.type === 'hospital').length;
  const clinicsCount = clinics.filter(c => c.type === 'clinic').length;

  const byClinic = clinics.map(c => ({
    ...c,
    staffCount: allUsers.filter(u => String(u.clinicId) === String(c._id) && u.role !== 'patient' && u.role !== 'super_admin').length,
    doctorCount: allUsers.filter(u => String(u.clinicId) === String(c._id) && u.role === 'doctor').length,
    patientCount: patientCounts[c._id] || 0,
  }));

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 24 }}>
        <StatCard label="Total Clinics"  value={clinics.length}  icon="🏥" color="#2d6be4" />
        <StatCard label="Hospitals"      value={hospitals}       icon="🏨" color="#8b5cf6" />
        <StatCard label="Clinics"        value={clinicsCount}    icon="🏥" color="#10b981" />
        <StatCard label="Total Patients" value={totalPatients}   icon="👤" color="#8b5cf6" />
        <StatCard label="Total Staff"    value={totalStaff}      icon="👥" color="#10b981" />
        <StatCard label="Doctors"        value={totalDoctors}    icon="🩺" color="#6366f1" />
        <StatCard label="Admins"         value={totalAdmins}     icon="🔑" color="#f59e0b" />
        <StatCard label="Active Users"   value={activeUsers}     icon="✅" color="#22c55e" />
        <StatCard label="Inactive Users" value={allUsers.length - activeUsers} icon="⛔" color="#ef4444" />
      </div>

      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f3f6' }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#1a2236' }}>Clinics Overview</h3>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['Clinic Name', 'Type', 'Email', 'Phone', 'Patients', 'Staff', 'Doctors'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', color: '#6b7a99', fontWeight: 600, fontSize: 12 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {byClinic.map(c => (
                <tr key={c._id} style={{ borderBottom: '1px solid #f1f3f6' }}>
                  <td style={{ padding: '10px 16px', fontWeight: 600, color: '#1a2236' }}>{c.name}</td>
                  <td style={{ padding: '10px 16px' }}>
                    <span style={{
                      padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                      background: c.type === 'hospital' ? '#dbeafe' : '#dcfce7',
                      color: c.type === 'hospital' ? '#1e40af' : '#166534',
                    }}>
                      {c.type === 'hospital' ? '🏨 Hospital' : '🏥 Clinic'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 16px', color: '#6b7a99' }}>{c.email}</td>
                  <td style={{ padding: '10px 16px', color: '#6b7a99' }}>{c.phone || '—'}</td>
                  <td style={{ padding: '10px 16px' }}>
                    <span style={{ background: '#ede9fe', color: '#5b21b6', borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>
                      {c.patientCount}
                    </span>
                  </td>
                  <td style={{ padding: '10px 16px' }}>
                    <span style={{ background: '#dbeafe', color: '#1e40af', borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>
                      {c.staffCount}
                    </span>
                  </td>
                  <td style={{ padding: '10px 16px' }}>
                    <span style={{ background: '#ede9fe', color: '#5b21b6', borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>
                      {c.doctorCount}
                    </span>
                  </td>
                </tr>
              ))}
              {clinics.length === 0 && (
                <tr><td colSpan={7} style={{ padding: 24, textAlign: 'center', color: '#94a3b8' }}>No clinics yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

// ── Clinics Tab ──────────────────────────────────────────────────────────────
function ClinicsTab({ clinics, onRefresh }) {
  const [editClinic, setEditClinic] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '', type: 'clinic' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showEditForm, setShowEditForm] = useState(false);

  const openEdit = (c) => {
    setEditClinic(c);
    setForm({ 
      name: c.name, 
      email: c.email, 
      phone: c.phone || '',
      type: c.type || 'clinic'
    });
    setError('');
    setShowEditForm(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.email) {
      setError('Name and email are required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await API.put(`/auth/clinics/${editClinic._id}`, form);
      setShowEditForm(false);
      onRefresh();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update clinic');
    }
    setSaving(false);
  };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#1a2236' }}>
          All Clinics ({clinics.length})
        </h3>
        <div style={{ display: 'flex', gap: 10, fontSize: 12, color: '#6b7a99' }}>
          <span>🏨 Hospitals: {clinics.filter(c => c.type === 'hospital').length}</span>
          <span>🏥 Clinics: {clinics.filter(c => c.type === 'clinic').length}</span>
        </div>
      </div>

      {/* ── Edit Clinic Form ── */}
      {showEditForm && (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: 20, marginBottom: 16 }}>
          <h4 style={{ margin: '0 0 14px', color: '#1a2236' }}>Edit Clinic: {editClinic?.name}</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            {[
              { label: 'Clinic Name *', key: 'name', type: 'text' },
              { label: 'Email *', key: 'email', type: 'email' },
              { label: 'Phone', key: 'phone', type: 'text' },
            ].map(f => (
              <div key={f.key}>
                <label style={labelStyle}>{f.label}</label>
                <input
                  type={f.type}
                  value={form[f.key]}
                  onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  style={inputStyle}
                />
              </div>
            ))}
            <div>
              <label style={labelStyle}>Clinic Type *</label>
              <select
                value={form.type}
                onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
                style={inputStyle}
              >
                <option value="clinic">🏥 Clinic</option>
                <option value="hospital">🏨 Hospital</option>
              </select>
            </div>
          </div>
          {error && <div style={errorStyle}>{error}</div>}
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <button onClick={() => setShowEditForm(false)} style={btnStyle('#94a3b8')}>Cancel</button>
            <button onClick={handleSave} disabled={saving} style={btnStyle('#2d6be4')}>
              {saving ? 'Saving…' : 'Update Clinic'}
            </button>
          </div>
        </div>
      )}

      {/* ── Clinics Table ── */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['Clinic', 'Type', 'Email', 'Phone', 'Created', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', color: '#6b7a99', fontWeight: 600, fontSize: 12 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {clinics.map(c => (
                <tr key={c._id} style={{ borderBottom: '1px solid #f1f3f6' }}>
                  <td style={{ padding: '10px 16px', fontWeight: 600, color: '#1a2236' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 18 }}>{c.type === 'hospital' ? '🏨' : '🏥'}</span> {c.name}
                    </div>
                  </td>
                  <td style={{ padding: '10px 16px' }}>
                    <span style={{
                      padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                      background: c.type === 'hospital' ? '#dbeafe' : '#dcfce7',
                      color: c.type === 'hospital' ? '#1e40af' : '#166534',
                    }}>
                      {c.type === 'hospital' ? 'Hospital' : 'Clinic'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 16px', color: '#6b7a99' }}>{c.email}</td>
                  <td style={{ padding: '10px 16px', color: '#6b7a99' }}>{c.phone || '—'}</td>
                  <td style={{ padding: '10px 16px', color: '#6b7a99', fontSize: 12 }}>
                    {new Date(c.createdAt).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '10px 16px' }}>
                    <button
                      onClick={() => openEdit(c)}
                      style={{ ...smallBtn, color: '#2d6be4', borderColor: '#2d6be4' }}
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
              {clinics.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: 24, textAlign: 'center', color: '#94a3b8' }}>
                    No clinics yet. A clinic will be created automatically when a clinic admin registers.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

// ── Staff Tab ─────────────────────────────────────────────────────────────
function StaffTab({ clinics, allUsers, onRefresh }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ 
    name: '', 
    email: '', 
    password: '', 
    role: 'doctor', 
    department: '', 
    phone: '', 
    clinicId: '', 
    consultationFee: '',
    newClinicName: '',
    newClinicPhone: '',
    newClinicType: 'clinic',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [filterClinic, setFilterClinic] = useState('');
  const [filterType, setFilterType] = useState('');

  const staff = allUsers.filter(u => u.role !== 'patient' && u.role !== 'super_admin');
  
  const filtered = staff.filter(u => {
    const matchClinic = !filterClinic || String(u.clinicId) === filterClinic;
    const clinic = clinics.find(c => String(c._id) === String(u.clinicId));
    const matchType = !filterType || clinic?.type === filterType;
    return matchClinic && matchType;
  });

  const clinicName = (id) => clinics.find(c => String(c._id) === String(id))?.name || '—';
  const clinicType = (id) => clinics.find(c => String(c._id) === String(id))?.type || '—';

  const ROLES = ['admin', 'doctor', 'nurse', 'receptionist', 'pharmacist', 'lab_technician'];

  const DEPARTMENTS = [
    'General Medicine', 'Cardiology', 'Orthopedics', 'Pediatrics', 'Gynecology',
    'Neurology', 'Radiology', 'Pathology', 'Emergency', 'Surgery', 'Dermatology',
    'Psychiatry', 'Ophthalmology', 'ENT', 'Urology', 'Nephrology', 'Gastroenterology',
    'Pulmonology', 'Oncology', 'Hematology', 'Endocrinology', 'Rheumatology',
    'Infectious Diseases', 'Geriatrics', 'Administration', 'Pharmacy', 'Nursing',
    'Reception', 'Lab Services', 'Physical Therapy', 'Occupational Therapy',
    'Speech Therapy', 'Nutrition', 'Other'
  ];

  const handleSave = async () => {
    if (!form.name || !form.email || !form.password) {
      setError('Name, email and password are required');
      return;
    }

    if (form.role === 'admin') {
      if (!form.newClinicName) {
        setError('Clinic name is required to create a new clinic');
        return;
      }
    } else {
      if (!form.clinicId) {
        setError('Please select a clinic');
        return;
      }
    }

    setSaving(true);
    setError('');

    try {
      let targetClinicId = form.clinicId;

      if (form.role === 'admin') {
        const clinicResponse = await API.post('/auth/clinics', {
          name: form.newClinicName,
          email: form.email,
          phone: form.newClinicPhone || form.phone || '',
          type: form.newClinicType || 'clinic',
        });
        targetClinicId = clinicResponse.data.clinic._id;
      }

      await API.post('/auth/users', {
        name: form.name,
        email: form.email.toLowerCase(),
        password: form.password,
        role: form.role,
        department: form.department,
        phone: form.phone,
        clinicId: targetClinicId,
        ...(form.role === 'doctor' && form.consultationFee ? { consultationFee: Number(form.consultationFee) } : {}),
        permissions: [],
      });

      setShowForm(false);
      setForm({ 
        name: '', email: '', password: '', role: 'doctor', department: '', 
        phone: '', clinicId: '', consultationFee: '', newClinicName: '', 
        newClinicPhone: '', newClinicType: 'clinic'
      });
      onRefresh();
    } catch (err) {
      console.error('Create staff error:', err);
      const errorMsg = err.response?.data?.message || 'Failed to create staff';
      if (errorMsg.includes('already registered') || errorMsg.includes('duplicate')) {
        setError(`Email "${form.email}" is already registered. Please use a different email.`);
      } else {
        setError(errorMsg);
      }
    }
    setSaving(false);
  };

  const handleToggle = async (id, current) => {
    if (!confirm(`${current ? 'Deactivate' : 'Activate'} this user?`)) return;
    try {
      await API.patch(`/auth/users/${id}/toggle-active`);
      onRefresh();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to toggle');
    }
  };

  const handleRoleChange = (role) => {
    setForm(prev => ({
      ...prev,
      role: role,
      clinicId: '',
      newClinicName: '',
      newClinicPhone: '',
    }));
  };

  const isAdminRole = form.role === 'admin';

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#1a2236' }}>All Staff ({filtered.length})</h3>
          <select
            value={filterClinic}
            onChange={e => setFilterClinic(e.target.value)}
            style={{ ...inputStyle, width: 'auto', padding: '4px 10px', fontSize: 12 }}
          >
            <option value="">All Clinics</option>
            {clinics.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
          </select>
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            style={{ ...inputStyle, width: 'auto', padding: '4px 10px', fontSize: 12 }}
          >
            <option value="">All Types</option>
            <option value="clinic">🏥 Clinics</option>
            <option value="hospital">🏨 Hospitals</option>
          </select>
        </div>
        <button onClick={() => setShowForm(!showForm)} style={btnStyle('#2d6be4')}>+ Add Staff</button>
      </div>

      {showForm && (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: 20, marginBottom: 16 }}>
          <h4 style={{ margin: '0 0 14px', color: '#1a2236' }}>Add Staff Member</h4>
          
          {isAdminRole && (
            <div style={{ 
              background: '#f0f9ff', border: '1.5px solid #bae6fd', borderRadius: 8, 
              padding: '10px 14px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span style={{ fontSize: 18 }}>🏥</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#0369a1' }}>
                  Creating a Clinic Admin
                </div>
                <div style={{ fontSize: 12, color: '#64748b' }}>
                  A new clinic will be automatically created with the admin's email.
                </div>
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            {[
              { label: 'Name *', key: 'name', type: 'text' },
              { label: 'Email *', key: 'email', type: 'email' },
              { label: 'Password *', key: 'password', type: 'password' },
              { label: 'Phone', key: 'phone', type: 'text' },
            ].map(f => (
              <div key={f.key}>
                <label style={labelStyle}>{f.label}</label>
                <input
                  type={f.type}
                  value={form[f.key]}
                  onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  style={inputStyle}
                />
              </div>
            ))}
            <div>
              <label style={labelStyle}>Department</label>
              <select
                value={form.department}
                onChange={e => setForm(p => ({ ...p, department: e.target.value }))}
                style={inputStyle}
              >
                <option value="">— Select Department —</option>
                {DEPARTMENTS.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Role *</label>
              <select
                value={form.role}
                onChange={e => handleRoleChange(e.target.value)}
                style={inputStyle}
              >
                {ROLES.map(r => (
                  <option key={r} value={r}>
                    {r.charAt(0).toUpperCase() + r.slice(1).replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>
            {form.role === 'doctor' && (
              <div>
                <label style={labelStyle}>Consultation Fee (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={form.consultationFee}
                  onChange={e => setForm(p => ({ ...p, consultationFee: e.target.value }))}
                  style={inputStyle}
                  placeholder="e.g. 500"
                />
              </div>
            )}
          </div>

          {/* ── Clinic Section ── */}
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #e5e7eb' }}>
            {isAdminRole ? (
              <div style={{ background: '#f0f9ff', border: '1.5px solid #bae6fd', borderRadius: 8, padding: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                  <div>
                    <label style={labelStyle}>Clinic Name *</label>
                    <input
                      type="text"
                      value={form.newClinicName}
                      onChange={e => setForm(p => ({ ...p, newClinicName: e.target.value }))}
                      style={inputStyle}
                      placeholder="e.g. City Health Clinic"
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Clinic Phone</label>
                    <input
                      type="text"
                      value={form.newClinicPhone}
                      onChange={e => setForm(p => ({ ...p, newClinicPhone: e.target.value }))}
                      style={inputStyle}
                      placeholder="+91 98765 43210"
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Clinic Type *</label>
                    <select
                      value={form.newClinicType}
                      onChange={e => setForm(p => ({ ...p, newClinicType: e.target.value }))}
                      style={inputStyle}
                    >
                      <option value="clinic">🏥 Clinic</option>
                      <option value="hospital">🏨 Hospital</option>
                    </select>
                  </div>
                </div>
                <div style={{ marginTop: 8, fontSize: 12, color: '#64748b' }}>
                  💡 Clinic email will be <strong>{form.email || 'admin@clinic.com'}</strong> (same as admin's email)
                </div>
              </div>
            ) : (
              <div>
                <label style={labelStyle}>Select Clinic *</label>
                <select
                  value={form.clinicId}
                  onChange={e => setForm(p => ({ ...p, clinicId: e.target.value }))}
                  style={inputStyle}
                >
                  <option value="">— Select Clinic —</option>
                  {clinics.map(c => (
                    <option key={c._id} value={c._id}>
                      {c.name} {c.type === 'hospital' ? '🏨' : '🏥'}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {error && <div style={errorStyle}>{error}</div>}

          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <button onClick={() => setShowForm(false)} style={btnStyle('#94a3b8')}>Cancel</button>
            <button onClick={handleSave} disabled={saving} style={btnStyle('#2d6be4')}>
              {saving ? 'Saving…' : 'Add Staff'}
            </button>
          </div>
        </div>
      )}

      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['Name', 'Email', 'Role', 'Department', 'Clinic', 'Type', 'Status', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', color: '#6b7a99', fontWeight: 600, fontSize: 12 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => (
                <tr key={u._id} style={{ borderBottom: '1px solid #f1f3f6', opacity: u.isActive ? 1 : 0.55 }}>
                  <td style={{ padding: '10px 16px', fontWeight: 600, color: '#1a2236' }}>{u.name}</td>
                  <td style={{ padding: '10px 16px', color: '#6b7a99' }}>{u.email}</td>
                  <td style={{ padding: '10px 16px' }}>
                    <span style={{ ...roleBadge(u.role) }}>
                      {u.role.replace('_', ' ')}
                    </span>
                  </td>
                  <td style={{ padding: '10px 16px', color: '#6b7a99' }}>
                    {u.department || '—'}
                  </td>
                  <td style={{ padding: '10px 16px', color: '#6b7a99' }}>{clinicName(u.clinicId)}</td>
                  <td style={{ padding: '10px 16px' }}>
                    <span style={{
                      padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700,
                      background: clinicType(u.clinicId) === 'hospital' ? '#dbeafe' : '#dcfce7',
                      color: clinicType(u.clinicId) === 'hospital' ? '#1e40af' : '#166534',
                    }}>
                      {clinicType(u.clinicId) === 'hospital' ? '🏨' : '🏥'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 16px' }}>
                    <span style={{
                      padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                      background: u.isActive ? '#d1fae5' : '#fee2e2',
                      color: u.isActive ? '#065f46' : '#991b1b',
                    }}>
                      {u.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 16px' }}>
                    <button
                      onClick={() => handleToggle(u._id, u.isActive)}
                      style={{ ...smallBtn, color: u.isActive ? '#ef4444' : '#22c55e', borderColor: u.isActive ? '#ef4444' : '#22c55e' }}
                    >
                      {u.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8} style={{ padding: 24, textAlign: 'center', color: '#94a3b8' }}>No staff found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

// ── All Users Tab ────────────────────────────────────────────────────────────
function AllUsersTab({ clinics, allUsers, onRefresh }) {
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterClinic, setFilterClinic] = useState('');
  const [filterType, setFilterType] = useState('');

  const clinicName = (id) => clinics.find(c => String(c._id) === String(id))?.name || '—';
  const clinicType = (id) => clinics.find(c => String(c._id) === String(id))?.type || '—';

  const filtered = allUsers.filter(u => {
    const matchSearch = !search ||
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase());
    const matchRole = !filterRole || u.role === filterRole;
    const matchClinic = !filterClinic || String(u.clinicId) === filterClinic;
    const clinic = clinics.find(c => String(c._id) === String(u.clinicId));
    const matchType = !filterType || clinic?.type === filterType;
    return matchSearch && matchRole && matchClinic && matchType;
  });

  const handleToggle = async (id, current) => {
    if (!confirm(`${current ? 'Deactivate' : 'Activate'} this user?`)) return;
    try {
      await API.patch(`/auth/users/${id}/toggle-active`);
      onRefresh();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to toggle');
    }
  };

  const ROLES = ['admin', 'doctor', 'nurse', 'receptionist', 'pharmacist', 'lab_technician', 'patient'];

  return (
    <>
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          placeholder="Search name or email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ ...inputStyle, flex: 1, minWidth: 200 }}
        />
        <select value={filterRole} onChange={e => setFilterRole(e.target.value)} style={{ ...inputStyle, width: 'auto' }}>
          <option value="">All Roles</option>
          {ROLES.map(r => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
        </select>
        <select value={filterClinic} onChange={e => setFilterClinic(e.target.value)} style={{ ...inputStyle, width: 'auto' }}>
          <option value="">All Clinics</option>
          {clinics.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
        </select>
        <select value={filterType} onChange={e => setFilterType(e.target.value)} style={{ ...inputStyle, width: 'auto' }}>
          <option value="">All Types</option>
          <option value="clinic">🏥 Clinics</option>
          <option value="hospital">🏨 Hospitals</option>
        </select>
        <span style={{ fontSize: 12, color: '#94a3b8', whiteSpace: 'nowrap' }}>{filtered.length} users</span>
      </div>

      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['Name', 'Email', 'Role', 'Clinic', 'Type', 'Status', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', color: '#6b7a99', fontWeight: 600, fontSize: 12 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 100).map(u => (
                <tr key={u._id} style={{ borderBottom: '1px solid #f1f3f6', opacity: u.isActive ? 1 : 0.55 }}>
                  <td style={{ padding: '10px 16px', fontWeight: 600, color: '#1a2236' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: '50%', background: '#dbeafe',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: 700, color: '#1e40af', flexShrink: 0,
                      }}>
                        {u.name?.charAt(0).toUpperCase()}
                      </div>
                      {u.name}
                    </div>
                  </td>
                  <td style={{ padding: '10px 16px', color: '#6b7a99' }}>{u.email}</td>
                  <td style={{ padding: '10px 16px' }}>
                    <span style={{ ...roleBadge(u.role) }}>{u.role.replace('_', ' ')}</span>
                  </td>
                  <td style={{ padding: '10px 16px', color: '#6b7a99', fontSize: 12 }}>{clinicName(u.clinicId)}</td>
                  <td style={{ padding: '10px 16px' }}>
                    <span style={{
                      padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700,
                      background: clinicType(u.clinicId) === 'hospital' ? '#dbeafe' : '#dcfce7',
                      color: clinicType(u.clinicId) === 'hospital' ? '#1e40af' : '#166534',
                    }}>
                      {clinicType(u.clinicId) === 'hospital' ? '🏨' : '🏥'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 16px' }}>
                    <span style={{
                      padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                      background: u.isActive ? '#d1fae5' : '#fee2e2',
                      color: u.isActive ? '#065f46' : '#991b1b',
                    }}>
                      {u.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 16px' }}>
                    <button
                      onClick={() => handleToggle(u._id, u.isActive)}
                      style={{ ...smallBtn, color: u.isActive ? '#ef4444' : '#22c55e', borderColor: u.isActive ? '#ef4444' : '#22c55e' }}
                    >
                      {u.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} style={{ padding: 24, textAlign: 'center', color: '#94a3b8' }}>No users found</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {filtered.length > 100 && (
          <div style={{ padding: '10px 16px', fontSize: 12, color: '#94a3b8', borderTop: '1px solid #f1f3f6', textAlign: 'center' }}>
            Showing first 100 of {filtered.length} results. Use search/filter to narrow down.
          </div>
        )}
      </div>
    </>
  );
}

// ── Clinic Dashboard Tab ─────────────────────────────────────────────────────
function ClinicDashboardTab({ clinics }) {
  const { setSuperAdminClinic, superAdminClinicId } = useAuth();
  const [selectedClinicId, setSelectedClinicId] = useState(superAdminClinicId || (clinics[0]?._id ?? ''));
  const [stats, setStats] = useState(null);
  const [roomConfigs, setRoomConfigs] = useState([]);
  const [pendingPayouts, setPendingPayouts] = useState([]);
  const [totalPayoutAmount, setTotalPayoutAmount] = useState(0);
  const [pendingDoctorProfiles, setPendingDoctorProfiles] = useState([]);
  const [doctorProfilesError, setDoctorProfilesError] = useState('');
  const [loading, setLoading] = useState(false);
  const [processingPayout, setProcessingPayout] = useState(false);
  const [processingDoctorProfile, setProcessingDoctorProfile] = useState('');

  const clinicId = selectedClinicId || (clinics[0]?._id ?? '');
  const selectedClinic = clinics.find(c => c._id === clinicId);

  useEffect(() => {
    if (clinicId && clinics.length > 0) {
      const name = clinics.find(c => c._id === clinicId)?.name || '';
      setSuperAdminClinic(clinicId, name);
    }
  }, []);

  useEffect(() => {
    if (!clinicId) return;
    setLoading(true);
    Promise.all([
      API.get(`/dashboard/stats?clinicId=${clinicId}`).catch(() => ({ data: null })),
      API.get(`/room-settings?clinicId=${clinicId}`).catch(() => ({ data: [] })),
      API.get('/telemedicine/pending-payouts').catch(() => ({ data: { pendingPayouts: [], totalAmount: 0 } })),
      API.get('/auth/doctor-profiles/pending').catch(err => {
        setDoctorProfilesError(err?.response?.data?.message || 'Unable to load doctor approval requests right now.');
        return { data: { profiles: [] } };
      }),
    ]).then(([statsRes, roomRes, payoutRes, doctorProfileRes]) => {
      setStats(statsRes.data);
      setRoomConfigs(Array.isArray(roomRes.data) ? roomRes.data : []);
      setPendingPayouts(payoutRes.data?.pendingPayouts || []);
      setTotalPayoutAmount(payoutRes.data?.totalAmount || 0);
      const profiles = doctorProfileRes.data?.profiles || [];
      setPendingDoctorProfiles(profiles);
      setDoctorProfilesError(profiles.length > 0 ? '' : '');
    }).finally(() => setLoading(false));
  }, [clinicId]);

  const totalRooms = roomConfigs.reduce((s, r) => s + r.totalRooms, 0);
  const availableRooms = roomConfigs.reduce((s, r) => s + r.availableRooms, 0);
  const occupiedRooms = totalRooms - availableRooms;
  const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const chartData = stats?.monthlyRevenue?.map(m => ({
    name: monthNames[m._id.month - 1],
    revenue: m.total,
  })) || [];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <label style={labelStyle}>Viewing:</label>
          <select
            value={selectedClinicId}
            onChange={e => {
              const id = e.target.value;
              const name = clinics.find(c => c._id === id)?.name || '';
              setSelectedClinicId(id);
              setSuperAdminClinic(id, name);
            }}
            style={{ ...inputStyle, width: 'auto', minWidth: 200 }}
          >
            {clinics.map(c => (
              <option key={c._id} value={c._id}>
                {c.name} {c.type === 'hospital' ? '🏨' : '🏥'}
              </option>
            ))}
          </select>
          {selectedClinic && (
            <span style={{
              padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
              background: selectedClinic.type === 'hospital' ? '#dbeafe' : '#dcfce7',
              color: selectedClinic.type === 'hospital' ? '#1e40af' : '#166534',
            }}>
              {selectedClinic.type === 'hospital' ? '🏨 Hospital' : '🏥 Clinic'}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <a href="/dashboard" style={btnStyle('#0f2942')}>⊞ Open Full Dashboard</a>
          <a href="/dashboard/telemedicine" style={btnStyle('#6366f1')}>📹 Telemedicine</a>
          <a href="/dashboard/prescriptions" style={btnStyle('#10b981')}>📋 Prescriptions</a>
          <a href="/dashboard/billing" style={btnStyle('#f59e0b')}>💳 Billing</a>
          <a href="/dashboard/patients" style={btnStyle('#ef4444')}>👤 Patients</a>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>Loading clinic data…</div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
            <StatCard label="Total Patients" value={stats?.totalPatients || 0} icon="👤" color="#2d6be4" />
            <StatCard label="Active Patients" value={stats?.activePatients || 0} icon="🟢" color="#10b981" />
            <StatCard label="Total Revenue" value={`₹${(stats?.totalRevenue || 0).toLocaleString()}`} icon="💰" color="#22c55e" />
            <StatCard label="Pending Bills" value={stats?.pendingBills || 0} icon="📋" color="#ef4444" />
            <StatCard label="Available Rooms" value={availableRooms} icon="🛏️" color="#6366f1" />
            <StatCard label="Occupied Rooms" value={occupiedRooms} icon="🏨" color="#f59e0b" />
          </div>

          {chartData.length > 0 && (
            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: 20, marginBottom: 20 }}>
              <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: '#1a2236' }}>
                📈 Monthly Revenue (Last 6 Months)
              </h3>
              <div style={{ overflowX: 'auto' }}>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 160, padding: '0 4px' }}>
                  {chartData.slice(-6).map((d, i) => {
                    const max = Math.max(...chartData.map(x => x.revenue), 1);
                    const h = Math.round((d.revenue / max) * 130);
                    return (
                      <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                        <span style={{ fontSize: 10, color: '#6b7a99' }}>₹{(d.revenue / 1000).toFixed(0)}k</span>
                        <div style={{
                          width: '100%', height: h, background: '#0f2942',
                          borderRadius: '4px 4px 0 0', minHeight: 4,
                        }} />
                        <span style={{ fontSize: 10, color: '#6b7a99' }}>{d.name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ── Room summary ── */}
          {roomConfigs.length > 0 && (
            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', marginBottom: 20, overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f3f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#1a2236' }}>🏨 Room Occupancy</h3>
                <span style={{ fontSize: 12, color: '#6b7a99' }}>{occupancyRate}% occupied · {availableRooms} of {totalRooms} free</span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      {['Room Type', 'Daily Rate', 'Available', 'Total', 'Occupancy'].map(h => (
                        <th key={h} style={{ padding: '10px 16px', textAlign: 'left', color: '#6b7a99', fontWeight: 600, fontSize: 12 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {roomConfigs.map(rc => {
                      const pct = rc.totalRooms > 0 ? (rc.availableRooms / rc.totalRooms) * 100 : 0;
                      const isFull = rc.availableRooms === 0;
                      return (
                        <tr key={rc.roomType} style={{ borderBottom: '1px solid #f1f3f6' }}>
                          <td style={{ padding: '10px 16px', fontWeight: 600 }}>{rc.roomType}</td>
                          <td style={{ padding: '10px 16px', color: '#0f4c81', fontWeight: 600 }}>₹{(rc.dailyRate || 0).toLocaleString()}/day</td>
                          <td style={{ padding: '10px 16px', fontWeight: 700, color: isFull ? '#dc2626' : '#16a34a' }}>
                            {rc.availableRooms}<span style={{ fontSize: 11, color: '#94a3b8' }}> / {rc.totalRooms}</span>
                          </td>
                          <td style={{ padding: '10px 16px' }}>{rc.totalRooms}</td>
                          <td style={{ padding: '10px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{ width: 80, height: 6, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
                                <div style={{ width: `${pct}%`, height: '100%', background: isFull ? '#ef4444' : pct < 50 ? '#f59e0b' : '#10b981' }} />
                              </div>
                              <span style={{ fontSize: 11, fontWeight: 600, color: isFull ? '#dc2626' : '#475569' }}>{Math.round(pct)}% free</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Quick navigation cards ── */}
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: 20 }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: '#1a2236' }}>🚀 Quick Access — All Modules</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
              {[
                { label: 'Dashboard', icon: '⊞', href: '/dashboard', color: '#0f2942' },
                { label: 'Patients', icon: '👤', href: '/dashboard/patients', color: '#2d6be4' },
                { label: 'IPD', icon: '🏥', href: '/dashboard/ipd', color: '#6366f1' },
                { label: 'Billing', icon: '💳', href: '/dashboard/billing', color: '#f59e0b' },
                { label: 'Lab Bills', icon: '🧾', href: '/dashboard/billing-requests', color: '#f59e0b' },
                { label: 'Pharmacy', icon: '💊', href: '/dashboard/pharmacy', color: '#10b981' },
                { label: 'Lab Tests', icon: '🧪', href: '/dashboard/lab', color: '#06b6d4' },
                { label: 'Token Queue', icon: '🎫', href: '/dashboard/tokens', color: '#8b5cf6' },
                { label: 'Emergency', icon: '🚨', href: '/dashboard/emergency', color: '#ef4444' },
                { label: 'Prescriptions', icon: '📋', href: '/dashboard/prescriptions', color: '#10b981' },
                { label: 'Telemedicine', icon: '📹', href: '/dashboard/telemedicine', color: '#6366f1' },
                { label: 'Inventory', icon: '📦', href: '/dashboard/inventory', color: '#f59e0b' },
                { label: 'Staff Mgmt', icon: '👥', href: '/dashboard/staff', color: '#2d6be4' },
                { label: 'Tasks', icon: '📋', href: '/dashboard/tasks', color: '#64748b' },
                { label: 'Room Settings', icon: '🏨', href: '/dashboard/room-settings', color: '#0f2942' },
                { label: 'Earnings', icon: '💰', href: '/dashboard/doctor-earnings', color: '#22c55e' },
                { label: 'Bank Details', icon: '🏦', href: '/dashboard/doctor-bank-details', color: '#0f4c81' },
                { label: 'Profile', icon: '👤', href: '/dashboard/profile', color: '#6366f1' },
              ].map(({ label, icon, href, color }) => (
                <a
                  key={label}
                  href={href}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '10px 12px', borderRadius: 8,
                    border: `1.5px solid ${color}22`,
                    background: `${color}11`,
                    color: color, fontWeight: 600, fontSize: 13,
                    textDecoration: 'none', transition: 'all 0.15s',
                  }}
                >
                  <span style={{ fontSize: 16 }}>{icon}</span>
                  {label}
                </a>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
// ── Consultations Tab ────────────────────────────────────────────────────
function ConsultationsTab() {
  const [consultations, setConsultations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadConsultations();
  }, []);

  const loadConsultations = async () => {
    setLoading(true);
    try {
      const { data } = await API.get('/consultations');
      setConsultations(data.consultations || []);
    } catch (err) {
      console.error('Failed to load consultations:', err);
    }
    setLoading(false);
  };

  const handleStatusChange = async (id, status) => {
    try {
      await API.patch(`/consultations/${id}`, { status });
      loadConsultations();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update status');
    }
  };

  const filtered = consultations.filter(c => {
    const matchStatus = !filterStatus || c.status === filterStatus;
    const matchSearch = !search ||
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase()) ||
      c.mobile?.includes(search);
    return matchStatus && matchSearch;
  });

  const statusBadge = (status) => {
    const map = {
      new:       { bg: '#dbeafe', color: '#1e40af' },
      contacted: { bg: '#fef3c7', color: '#92400e' },
      closed:    { bg: '#dcfce7', color: '#166534' },
    };
    return {
      padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
      ...(map[status] || map.new),
    };
  };

  return (
    <>
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          placeholder="Search name, email, or phone…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ ...inputStyle, flex: 1, minWidth: 200 }}
        />
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ ...inputStyle, width: 'auto' }}>
          <option value="">All Statuses</option>
          <option value="new">New</option>
          <option value="contacted">Contacted</option>
          <option value="closed">Closed</option>
        </select>
        <span style={{ fontSize: 12, color: '#94a3b8', whiteSpace: 'nowrap' }}>{filtered.length} requests</span>
        <button onClick={loadConsultations} style={{ ...smallBtn, color: '#2d6be4', borderColor: '#2d6be4' }}>🔄 Refresh</button>
      </div>

      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['Name', 'Mobile', 'Email', 'State', 'Service', 'Status', 'Submitted', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', color: '#6b7a99', fontWeight: 600, fontSize: 12 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ padding: 24, textAlign: 'center', color: '#94a3b8' }}>Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} style={{ padding: 24, textAlign: 'center', color: '#94a3b8' }}>No consultation requests yet</td></tr>
              ) : (
                filtered.map(c => (
                  <tr key={c._id} style={{ borderBottom: '1px solid #f1f3f6' }}>
                    <td style={{ padding: '10px 16px', fontWeight: 600, color: '#1a2236' }}>{c.name}</td>
                    <td style={{ padding: '10px 16px', color: '#6b7a99' }}>{c.phoneCode} {c.mobile}</td>
                    <td style={{ padding: '10px 16px', color: '#6b7a99' }}>{c.email}</td>
                    <td style={{ padding: '10px 16px', color: '#6b7a99' }}>{c.state}</td>
                    <td style={{ padding: '10px 16px', color: '#6b7a99' }}>{c.service}</td>
                    <td style={{ padding: '10px 16px' }}>
                      <span style={statusBadge(c.status)}>{c.status}</span>
                    </td>
                    <td style={{ padding: '10px 16px', color: '#6b7a99', fontSize: 12 }}>
                      {new Date(c.createdAt).toLocaleString()}
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      <select
                        value={c.status}
                        onChange={e => handleStatusChange(c._id, e.target.value)}
                        style={{ ...inputStyle, width: 'auto', padding: '4px 8px', fontSize: 12 }}
                      >
                        <option value="new">New</option>
                        <option value="contacted">Contacted</option>
                        <option value="closed">Closed</option>
                      </select>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
// ── Payroll Tab ──────────────────────────────────────────────────────────────
function PayrollTab({ clinics, allUsers, onRefresh }) {
  const [payrolls, setPayrolls] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  
  const [filterClinic, setFilterClinic] = React.useState('');
  const [filterMonth, setFilterMonth] = React.useState('');
  const [filterYear, setFilterYear] = React.useState('');
  const [filterStatus, setFilterStatus] = React.useState('');
  const [filterType, setFilterType] = React.useState('');

  const [editSalaryUser, setEditSalaryUser] = React.useState(null);
  const [newSalary, setNewSalary] = React.useState('');
  const [updatingSalary, setUpdatingSalary] = React.useState(false);

  const [genUser, setGenUser] = React.useState(null);
  const [genForm, setGenForm] = React.useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    allowances: '',
    deductions: '',
    notes: ''
  });
  const [generating, setGenerating] = React.useState(false);

  const [payRecord, setPayRecord] = React.useState(null);
  const [payForm, setPayForm] = React.useState({
    paymentMethod: 'Bank Transfer',
    transactionId: '',
    notes: ''
  });
  const [paying, setPaying] = React.useState(false);

  const [error, setError] = React.useState('');
  const [success, setSuccess] = React.useState('');

  React.useEffect(() => {
    loadPayrolls();
  }, [filterClinic, filterMonth, filterYear, filterStatus, filterType]);

  const loadPayrolls = async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (filterClinic) params.clinicId = filterClinic;
      if (filterMonth) params.month = filterMonth;
      if (filterYear) params.year = filterYear;
      if (filterStatus) params.status = filterStatus;
      if (filterType) {
        const clinicIds = clinics.filter(c => c.type === filterType).map(c => c._id);
        if (clinicIds.length > 0) params.clinicIds = clinicIds.join(',');
      }

      const { data } = await API.get('/payroll', { params });
      setPayrolls(data.payrolls || []);
    } catch (err) {
      console.error(err);
      setError('Failed to load payroll records');
    }
    setLoading(false);
  };

  const handleUpdateSalary = async () => {
    if (!editSalaryUser) return;
    setUpdatingSalary(true);
    setError('');
    setSuccess('');
    try {
      await API.put('/payroll/base-salary', {
        staffId: editSalaryUser._id,
        baseSalary: Number(newSalary) || 0
      });
      setSuccess(`Salary updated successfully`);
      setEditSalaryUser(null);
      onRefresh();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update salary');
    }
    setUpdatingSalary(false);
  };

  const handleGeneratePayroll = async () => {
    if (!genUser) return;
    setGenerating(true);
    setError('');
    setSuccess('');
    try {
      await API.post('/payroll/generate', {
        staffId: genUser._id,
        month: genForm.month,
        year: genForm.year,
        allowances: Number(genForm.allowances) || 0,
        deductions: Number(genForm.deductions) || 0,
        notes: genForm.notes
      });
      setSuccess(`Payroll record generated for ${genUser.name}`);
      setGenUser(null);
      loadPayrolls();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate payroll');
    }
    setGenerating(false);
  };

  const handleRecordPayment = async () => {
    if (!payRecord) return;
    setPaying(true);
    setError('');
    setSuccess('');
    try {
      await API.put(`/payroll/${payRecord._id}/pay`, payForm);
      setSuccess(`Payment recorded successfully`);
      setPayRecord(null);
      loadPayrolls();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to record payment');
    }
    setPaying(false);
  };

  const handleDeletePayroll = async (id) => {
    if (!window.confirm('Are you sure you want to delete this payroll record?')) return;
    setError('');
    setSuccess('');
    try {
      await API.delete(`/payroll/${id}`);
      setSuccess('Payroll record deleted');
      loadPayrolls();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete payroll record');
    }
  };

  const staffMembers = allUsers.filter(u => u.role !== 'patient' && u.role !== 'super_admin');

  return (
    <div>
      {error && <div style={{ ...errorStyle, marginBottom: 15 }}>{error}</div>}
      {success && <div style={{ background: '#dcfce7', color: '#16a34a', padding: '8px 12px', borderRadius: 8, fontSize: 13, marginBottom: 15, fontWeight: 500 }}>{success}</div>}

      {/* ── Action Forms ── */}
      {editSalaryUser && (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: 20, marginBottom: 20 }}>
          <h4 style={{ margin: '0 0 14px', color: '#1a2236' }}>Set Base Salary for {editSalaryUser.name}</h4>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ minWidth: 200 }}>
              <label style={labelStyle}>Base Monthly Salary (₹) *</label>
              <input 
                type="number"
                value={newSalary}
                onChange={e => setNewSalary(e.target.value)}
                style={inputStyle}
                placeholder="Enter base salary"
              />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setEditSalaryUser(null)} style={btnStyle('#94a3b8')}>Cancel</button>
              <button onClick={handleUpdateSalary} disabled={updatingSalary} style={btnStyle('#0f4c81')}>
                {updatingSalary ? 'Saving...' : 'Update Salary'}
              </button>
            </div>
          </div>
        </div>
      )}

      {genUser && (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: 20, marginBottom: 20 }}>
          <h4 style={{ margin: '0 0 14px', color: '#1a2236' }}>Generate Monthly Payroll for {genUser.name}</h4>
          <p style={{ margin: '-10px 0 14px', fontSize: 12, color: '#64748b' }}>Base Salary: ₹{genUser.baseSalary || 0}</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
            <div>
              <label style={labelStyle}>Month *</label>
              <select 
                value={genForm.month}
                onChange={e => setGenForm(p => ({ ...p, month: Number(e.target.value) }))}
                style={inputStyle}
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {new Date(0, i).toLocaleString('en', { month: 'long' })}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Year *</label>
              <select 
                value={genForm.year}
                onChange={e => setGenForm(p => ({ ...p, year: Number(e.target.value) }))}
                style={inputStyle}
              >
                {[2025, 2026, 2027, 2028].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Allowances (Bonus, OT, etc.) (₹)</label>
              <input 
                type="number"
                value={genForm.allowances}
                onChange={e => setGenForm(p => ({ ...p, allowances: e.target.value }))}
                placeholder="0"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Deductions (Unpaid leaves, tax) (₹)</label>
              <input 
                type="number"
                value={genForm.deductions}
                onChange={e => setGenForm(p => ({ ...p, deductions: e.target.value }))}
                placeholder="0"
                style={inputStyle}
              />
            </div>
          </div>
          <div style={{ marginTop: 12 }}>
            <label style={labelStyle}>Notes</label>
            <input 
              type="text"
              value={genForm.notes}
              onChange={e => setGenForm(p => ({ ...p, notes: e.target.value }))}
              placeholder="e.g. Performance bonus included"
              style={inputStyle}
            />
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button onClick={() => setGenUser(null)} style={btnStyle('#94a3b8')}>Cancel</button>
            <button onClick={handleGeneratePayroll} disabled={generating} style={btnStyle('#2d6be4')}>
              {generating ? 'Generating...' : 'Generate Pay Slip'}
            </button>
          </div>
        </div>
      )}

      {payRecord && (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: 20, marginBottom: 20 }}>
          <h4 style={{ margin: '0 0 14px', color: '#1a2236' }}>Record Salary Payment for {payRecord.staffId?.name}</h4>
          <p style={{ margin: '-10px 0 14px', fontSize: 12, color: '#64748b' }}>
            Net Amount: <strong>₹{payRecord.netSalary}</strong> ({new Date(0, payRecord.month - 1).toLocaleString('en', { month: 'long' })} {payRecord.year})
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            <div>
              <label style={labelStyle}>Payment Method *</label>
              <select 
                value={payForm.paymentMethod}
                onChange={e => setPayForm(p => ({ ...p, paymentMethod: e.target.value }))}
                style={inputStyle}
              >
                {['Bank Transfer', 'UPI', 'Cash', 'Cheque', 'Other'].map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Transaction ID / Ref Number</label>
              <input 
                type="text"
                value={payForm.transactionId}
                onChange={e => setPayForm(p => ({ ...p, transactionId: e.target.value }))}
                placeholder="TXN12345678"
                style={inputStyle}
              />
            </div>
          </div>
          <div style={{ marginTop: 12 }}>
            <label style={labelStyle}>Notes / Description</label>
            <input 
              type="text"
              value={payForm.notes}
              onChange={e => setPayForm(p => ({ ...p, notes: e.target.value }))}
              placeholder="UPI transaction successful"
              style={inputStyle}
            />
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button onClick={() => setPayRecord(null)} style={btnStyle('#94a3b8')}>Cancel</button>
            <button onClick={handleRecordPayment} disabled={paying} style={btnStyle('#10b981')}>
              {paying ? 'Recording...' : 'Mark as Paid'}
            </button>
          </div>
        </div>
      )}

      {/* ── Section: Staff Base Salary List ── */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: 20, marginBottom: 24 }}>
        <h3 style={{ margin: '0 0 14px', fontSize: 16, fontWeight: 700, color: '#1a2236' }}>Staff Base Salary List</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e5e7eb' }}>
                {['Staff Member', 'Role', 'Clinic', 'Type', 'Base Salary', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: '#6b7a99', fontWeight: 600, fontSize: 12 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {staffMembers.map(staff => {
                const clinic = clinics.find(c => c._id === staff.clinicId);
                return (
                  <tr key={staff._id} style={{ borderBottom: '1px solid #f1f3f6' }}>
                    <td style={{ padding: '10px 14px', fontWeight: 600, color: '#1a2236' }}>{staff.name}</td>
                    <td style={{ padding: '10px 14px' }}><span style={roleBadge(staff.role)}>{staff.role}</span></td>
                    <td style={{ padding: '10px 14px', color: '#475569' }}>{clinic?.name || '—'}</td>
                    <td style={{ padding: '10px 14px' }}>
                      {clinic && (
                        <span style={{
                          padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700,
                          background: clinic.type === 'hospital' ? '#dbeafe' : '#dcfce7',
                          color: clinic.type === 'hospital' ? '#1e40af' : '#166534',
                        }}>
                          {clinic.type === 'hospital' ? '🏨' : '🏥'}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '10px 14px', fontWeight: 700, color: '#0f4c81' }}>₹{staff.baseSalary || 0}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button 
                          onClick={() => {
                            setEditSalaryUser(staff);
                            setNewSalary(staff.baseSalary || '');
                            setGenUser(null);
                            setPayRecord(null);
                          }}
                          style={{ ...smallBtn, color: '#0f4c81', borderColor: '#bfdbfe' }}
                        >
                          ⚙️ Set Salary
                        </button>
                        <button 
                          onClick={() => {
                            setGenUser(staff);
                            setGenForm({
                              month: new Date().getMonth() + 1,
                              year: new Date().getFullYear(),
                              allowances: '',
                              deductions: '',
                              notes: ''
                            });
                            setEditSalaryUser(null);
                            setPayRecord(null);
                          }}
                          style={{ ...smallBtn, background: '#2d6be4', color: '#fff', border: 'none' }}
                        >
                          📄 Generate Slip
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Section: Payroll Log ── */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1a2236' }}>Payroll Records & Slips</h3>
          
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <select 
              value={filterClinic}
              onChange={e => setFilterClinic(e.target.value)}
              style={{ ...inputStyle, width: 'auto', padding: '4px 8px', fontSize: 12 }}
            >
              <option value="">All Clinics</option>
              {clinics.map(c => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>
            
            <select 
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              style={{ ...inputStyle, width: 'auto', padding: '4px 8px', fontSize: 12 }}
            >
              <option value="">All Types</option>
              <option value="clinic">🏥 Clinics</option>
              <option value="hospital">🏨 Hospitals</option>
            </select>
            
            <select 
              value={filterMonth}
              onChange={e => setFilterMonth(e.target.value)}
              style={{ ...inputStyle, width: 'auto', padding: '4px 8px', fontSize: 12 }}
            >
              <option value="">All Months</option>
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {new Date(0, i).toLocaleString('en', { month: 'long' })}
                </option>
              ))}
            </select>

            <select 
              value={filterYear}
              onChange={e => setFilterYear(e.target.value)}
              style={{ ...inputStyle, width: 'auto', padding: '4px 8px', fontSize: 12 }}
            >
              <option value="">All Years</option>
              {[2025, 2026, 2027, 2028].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>

            <select 
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              style={{ ...inputStyle, width: 'auto', padding: '4px 8px', fontSize: 12 }}
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 20, color: '#6b7a99' }}>Loading slips...</div>
        ) : payrolls.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 30, color: '#6b7a99', background: '#f8fafc', borderRadius: 8 }}>
            No payroll records found matching the filters.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e5e7eb' }}>
                  {['Staff Name', 'Month/Year', 'Clinic', 'Base Salary', 'Allowances', 'Deductions', 'Net Pay', 'Status', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: '#6b7a99', fontWeight: 600, fontSize: 12 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {payrolls.map(pr => {
                  const monthName = new Date(0, pr.month - 1).toLocaleString('en', { month: 'short' });
                  const clinic = clinics.find(c => c._id === pr.clinicId);
                  return (
                    <tr key={pr._id} style={{ borderBottom: '1px solid #f1f3f6' }}>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ fontWeight: 600, color: '#1a2236' }}>{pr.staffId?.name || 'Deleted User'}</div>
                        <div style={{ fontSize: 11, color: '#6b7a99' }}>{pr.staffId?.role}</div>
                      </td>
                      <td style={{ padding: '10px 14px', color: '#475569', fontWeight: 500 }}>
                        {monthName} {pr.year}
                      </td>
                      <td style={{ padding: '10px 14px', color: '#475569' }}>
                        {clinic?.name || '—'}
                        {clinic && (
                          <span style={{ marginLeft: 4, fontSize: 10 }}>
                            {clinic.type === 'hospital' ? '🏨' : '🏥'}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '10px 14px', color: '#475569' }}>₹{pr.baseSalary}</td>
                      <td style={{ padding: '10px 14px', color: '#10b981' }}>+₹{pr.allowances}</td>
                      <td style={{ padding: '10px 14px', color: '#ef4444' }}>-₹{pr.deductions}</td>
                      <td style={{ padding: '10px 14px', fontWeight: 800, color: '#0f4c81', fontSize: 14 }}>
                        ₹{pr.netSalary}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{
                          padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                          background: pr.status === 'paid' ? '#dcfce7' : '#fef3c7',
                          color: pr.status === 'paid' ? '#15803d' : '#b45309'
                        }}>
                          {pr.status === 'paid' ? 'Paid' : 'Pending'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {pr.status === 'pending' && (
                            <>
                              <button 
                                onClick={() => {
                                  setPayRecord(pr);
                                  setPayForm({
                                    paymentMethod: 'Bank Transfer',
                                    transactionId: '',
                                    notes: ''
                                  });
                                  setGenUser(null);
                                  setEditSalaryUser(null);
                                }}
                                style={{
                                  background: '#10b981', color: '#fff', border: 'none',
                                  borderRadius: 6, padding: '4px 10px', fontSize: 11,
                                  fontWeight: 600, cursor: 'pointer'
                                }}
                              >
                                💳 Record Pay
                              </button>
                              <button 
                                onClick={() => handleDeletePayroll(pr._id)}
                                style={{
                                  background: 'transparent', color: '#ef4444', border: '1px solid #fee2e2',
                                  borderRadius: 6, padding: '4px 10px', fontSize: 11,
                                  fontWeight: 600, cursor: 'pointer'
                                }}
                              >
                                🗑️ Delete
                              </button>
                            </>
                          )}
                          {pr.status === 'paid' && (
                            <div style={{ fontSize: 11, color: '#64748b' }}>
                              <div>Paid via {pr.paymentMethod}</div>
                              {pr.paymentDate && <div style={{ fontSize: 10 }}>on {new Date(pr.paymentDate).toLocaleDateString()}</div>}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Shared styles ────────────────────────────────────────────────────────────
const inputStyle = {
  width: '100%', padding: '8px 12px', borderRadius: 8,
  border: '1.5px solid #e5e7eb', fontSize: 13, outline: 'none',
  fontFamily: 'inherit', boxSizing: 'border-box',
};
const labelStyle = { display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 };
const errorStyle = { background: '#fee2e2', color: '#991b1b', padding: '8px 12px', borderRadius: 8, fontSize: 13, marginTop: 10 };
const btnStyle = (bg) => ({
  padding: '8px 16px', borderRadius: 8, border: 'none', background: bg,
  color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
});
const smallBtn = {
  padding: '3px 10px', borderRadius: 6, background: 'transparent',
  fontSize: 11, fontWeight: 600, cursor: 'pointer', border: '1px solid',
};

const ROLE_COLORS = {
  admin: { bg: '#fee2e2', color: '#991b1b' },
  doctor: { bg: '#ede9fe', color: '#5b21b6' },
  nurse: { bg: '#d1fae5', color: '#065f46' },
  receptionist: { bg: '#fef3c7', color: '#92400e' },
  pharmacist: { bg: '#dbeafe', color: '#1e40af' },
  lab_technician: { bg: '#fce7f3', color: '#9d174d' },
  patient: { bg: '#f1f5f9', color: '#475569' },
};
const roleBadge = (role) => ({
  padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
  ...(ROLE_COLORS[role] || { bg: '#f1f5f9', color: '#475569' }),
  display: 'inline-block',
});

// ── Main Component ───────────────────────────────────────────────────────────
export default function SuperAdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Overview');
  const [clinics, setClinics] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    if (user.role !== 'super_admin') { navigate('/dashboard'); return; }
    loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [cRes, uRes] = await Promise.all([
        API.get('/auth/clinics'),
        API.get('/auth/all-users'),
      ]);
      setClinics(cRes.data.clinics || []);
      setAllUsers(uRes.data.users || []);
    } catch (err) {
      console.error('Failed to load super admin data:', err);
    }
    setLoading(false);
  };

  const handleLogout = () => { logout(); navigate('/login'); };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 40 }}>🔄</div>
          <p style={{ color: '#6b7a99', marginTop: 10 }}>Loading Super Admin Dashboard…</p>
        </div>
      </div>
    );
  }

  // Clinic type counts for display
  const hospitals = clinics.filter(c => c.type === 'hospital').length;
  const clinicCount = clinics.filter(c => c.type === 'clinic').length;

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9' }}>
      {/* ── Top bar ── */}
      <header style={{
        background: '#0f2942', color: '#fff',
        padding: '0 24px', height: 56,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 22 }}>🏥</span>
          <div>
            <div style={{ fontWeight: 800, fontSize: 14 }}>MediCare HMS</div>
            <div style={{ fontSize: 10, color: '#94a3b8' }}>Super Admin Console</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <a
            href="/dashboard"
            style={{
              background: 'rgba(56,189,248,0.15)', color: '#38bdf8',
              padding: '3px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            ⊞ Staff Dashboard
          </a>
          <span style={{
            background: 'rgba(168,85,247,0.2)', color: '#c084fc',
            padding: '3px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700,
          }}>
            ⚡ SUPER ADMIN
          </span>
          <span style={{ fontSize: 13, color: '#94a3b8' }}>{user?.name}</span>
          <button
            onClick={handleLogout}
            style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '5px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
          >
            Sign Out
          </button>
        </div>
      </header>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 20px' }}>
        {/* ── Page title with stats ── */}
        <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#1a2236' }}>
              Super Admin Dashboard
            </h1>
            <p style={{ margin: '4px 0 0', color: '#6b7a99', fontSize: 14 }}>
              Full system control — manage all clinics, staff, and users
            </p>
          </div>
          <div style={{ display: 'flex', gap: 12, fontSize: 13 }}>
            <span style={{ background: '#dbeafe', padding: '4px 12px', borderRadius: 20, fontWeight: 600, color: '#1e40af' }}>
              🏨 Hospitals: {hospitals}
            </span>
            <span style={{ background: '#dcfce7', padding: '4px 12px', borderRadius: 20, fontWeight: 600, color: '#166534' }}>
              🏥 Clinics: {clinicCount}
            </span>
            <span style={{ background: '#f1f5f9', padding: '4px 12px', borderRadius: 20, fontWeight: 600, color: '#475569' }}>
              👥 Total: {clinics.length}
            </span>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: '#fff', borderRadius: 10, padding: 4, border: '1px solid #e5e7eb', width: 'fit-content', flexWrap: 'wrap' }}>
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '7px 18px', borderRadius: 8, border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: 600, transition: 'all 0.15s',
                background: activeTab === tab ? '#0f2942' : 'transparent',
                color: activeTab === tab ? '#fff' : '#6b7a99',
              }}
            >
              {tab === 'Overview' && '⊞ '}
              {tab === 'Clinics' && '🏥 '}
              {tab === 'Staff' && '👥 '}
              {tab === 'Users' && '👤 '}
              {tab === 'Consultations' && '📞 '}
              {tab === 'Clinic Dashboard' && '📊 '}
              {tab === 'Payroll' && '💰 '}
              {tab}
            </button>
          ))}
          <button
            onClick={loadData}
            style={{ padding: '7px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'transparent', color: '#94a3b8', fontSize: 13 }}
            title="Refresh"
          >
            🔄
          </button>
        </div>

        {/* ── Tab content ── */}
        {activeTab === 'Overview' && <OverviewTab clinics={clinics} allUsers={allUsers} />}
        {activeTab === 'Clinics' && <ClinicsTab clinics={clinics} onRefresh={loadData} />}
        {activeTab === 'Staff' && <StaffTab clinics={clinics} allUsers={allUsers} onRefresh={loadData} />}
        {activeTab === 'Users' && <AllUsersTab clinics={clinics} allUsers={allUsers} onRefresh={loadData} />}
        {activeTab === 'Consultations' && <ConsultationsTab />}
        {activeTab === 'Clinic Dashboard' && <ClinicDashboardTab clinics={clinics} />}
        {activeTab === 'Payroll' && <PayrollTab clinics={clinics} allUsers={allUsers} onRefresh={loadData} />}
      </div>
    </div>
  );
}