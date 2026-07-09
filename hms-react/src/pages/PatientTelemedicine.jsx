// hms-react/src/pages/PatientTelemedicine.jsx

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import API from '../utils/api';
import '../css/PatientDashboard.css';
import PatientSidebar from '../components/PatientSidebar';
import BottomNav from '../components/BottomNav';

const STATUS_COLORS = {
  requested: { bg: '#fef3c7', color: '#92400e', label: '⏳ Requested' },
  approved: { bg: '#dbeafe', color: '#1e40af', label: '✅ Approved' },
  payment_pending: { bg: '#fef3c7', color: '#92400e', label: '💳 Payment Pending' },
  payment_completed: { bg: '#dbeafe', color: '#1e40af', label: '✅ Payment Done' },
  scheduled: { bg: '#dbeafe', color: '#1e40af', label: '📅 Scheduled' },
  ready: { bg: '#d1fae5', color: '#065f46', label: '🟢 Ready' },
  ongoing: { bg: '#f97316', color: '#fff', label: '🔴 Ongoing' },
  completed: { bg: '#d1fae5', color: '#065f46', label: '✅ Completed' },
  cancelled: { bg: '#fee2e2', color: '#991b1b', label: '❌ Cancelled' },
  rejected: { bg: '#fee2e2', color: '#991b1b', label: '❌ Rejected' },
};

export default function PatientTelemedicine() {
  const { user, patient, logout, isPatient, isConnected, isDoctorOnline, onlineDoctors, emit, on, off, getEffectiveClinicId } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [form, setForm] = useState({
    doctorId: '',
    symptoms: '',
    preferredTime: '',
    urgency: 'normal',
  });
  const [doctors, setDoctors] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userDropdown, setUserDropdown] = useState(false);
  const [statusUpdate, setStatusUpdate] = useState(null);
  const [meetingStarted, setMeetingStarted] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentRequest, setPaymentRequest] = useState(null);
  const [paying, setPaying] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('mock');
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackDoctor, setFeedbackDoctor] = useState(null);
  const [doctorFeedbacks, setDoctorFeedbacks] = useState([]);

  // ── Doctor filters ───────────────────────────────────────────────────────
  const [filterSpecialty, setFilterSpecialty] = useState('all');
  const [filterStatusOnline, setFilterStatusOnline] = useState('all'); // all | online | offline

  // ── Responsive hook ──────────────────────────────────────────────────────
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768);
  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);

  const patientId = patient?._id || patient?.id || user?._id || user?.id;
  const patientName = patient?.name || user?.name || 'Patient';
  const patientEmail = patient?.email || user?.email || 'Patient';
  const clinicId = patient?.clinicId || user?.clinicId;

  // ── Socket: Listen for real-time updates ──
  useEffect(() => {
    if (!isConnected) return;

    console.log('🔄 Setting up socket listeners for patient');

    // Listen for status updates
    const handleStatusUpdate = (data) => {
      console.log('📊 Status update received:', data);
      setStatusUpdate({
        type: data.status,
        message: data.message || `Status updated to ${data.status}`,
        requestId: data.requestId
      });
      loadRequests();
      setTimeout(() => setStatusUpdate(null), 5000);
    };

    // Listen for meeting started
    const handleMeetingStarted = (data) => {
      console.log('🎥 Meeting started:', data);
      setMeetingStarted(data);
      setStatusUpdate({
        type: 'meeting_started',
        message: `🔴 Dr. ${data.doctorName || 'Doctor'} has started the meeting!`,
        meetingLink: data.meetingLink
      });

      // Auto-open meeting link in new tab
      if (data.meetingLink) {
        const openMeeting = confirm('🟢 The doctor has started the meeting. Click OK to join now.');
        if (openMeeting) {
          window.open(data.meetingLink, '_blank');
        }
      }
    };

    // Listen for meeting ended
    const handleMeetingEnded = (data) => {
      console.log('📹 Meeting ended:', data);
      setStatusUpdate({
        type: 'meeting_ended',
        message: `✅ Meeting ended. Duration: ${data.duration || 0} minutes`,
        duration: data.duration
      });
      loadRequests();
      setTimeout(() => setStatusUpdate(null), 5000);
    };

    // ── NEW: Listen for payment required ──
    const handlePaymentRequired = (data) => {
      console.log('💳 Payment required event received:', data);
      setPaymentRequest(data);
      setShowPaymentModal(true);
      setStatusUpdate({
        type: 'payment_required',
        message: `💳 Payment required: ₹${data.consultationFee} for Dr. ${data.doctorName}`,
        requestId: data.requestId
      });
      loadRequests();
      setTimeout(() => setStatusUpdate(null), 8000);
    };

    // ── NEW: Listen for payment success ──
    const handlePaymentSuccess = (data) => {
      console.log('✅ Payment success event received:', data);
      setStatusUpdate({
        type: 'payment_success',
        message: `✅ Payment successful! Your consultation with is confirmed. Click "Join Meeting" when doctor starts.`,
        meetingLink: data.meetingLink,
        requestId: data.requestId
      });
      loadRequests();
      setTimeout(() => setStatusUpdate(null), 10000);
    };

    on('telemedicine:status-update', handleStatusUpdate);
    on('telemedicine:meeting-started', handleMeetingStarted);
    on('telemedicine:meeting-ended', handleMeetingEnded);
    on('telemedicine:payment-required', handlePaymentRequired);
    on('telemedicine:payment-success', handlePaymentSuccess);

    return () => {
      off('telemedicine:status-update', handleStatusUpdate);
      off('telemedicine:meeting-started', handleMeetingStarted);
      off('telemedicine:meeting-ended', handleMeetingEnded);
      off('telemedicine:payment-required', handlePaymentRequired);
      off('telemedicine:payment-success', handlePaymentSuccess);
    };
  }, [isConnected, on, off]);

  useEffect(() => {
    if (!user) { navigate('/patient-login'); return; }
    if (!isPatient()) { navigate('/'); return; }
    loadRequests();
    loadDoctors();
  }, []);

  // Pre-select doctor if navigated from dashboard "Consult Now"
  useEffect(() => {
    const preSelectId = location.state?.preSelectDoctor;
    if (preSelectId && doctors.length > 0) {
      setForm(prev => ({ ...prev, doctorId: preSelectId }));
      setShowRequestForm(true);
      // Clear state so a page refresh doesn't re-trigger
      window.history.replaceState({}, '');
    }
  }, [doctors, location.state]);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const { data } = await API.get(`/telemedicine/patient/${patientId}`);
      if (data.success) {
        setRequests(data.requests || []);
      }
    } catch (err) {
      console.error('Failed to load requests:', err);
    }
    setLoading(false);
  };

  const loadDoctors = async () => {
    try {
      const { data } = await API.get('/auth/available-doctors');
      console.log('🩺 DOCTORS API RESPONSE:', data); // 👈 ADD THIS
      if (data.success) {
        setDoctors(data.doctors || []);
        console.log('🩺 DOCTORS SET:', data.doctors); // 👈 AND THIS
      } else {
        console.warn('🩺 data.success is false or missing:', data);
        // Try setting directly in case your API doesn't use {success, doctors} shape
        if (Array.isArray(data)) setDoctors(data);
        if (Array.isArray(data.data)) setDoctors(data.data);
      }
    } catch (err) {
      console.error('❌ Failed to load doctors:', err);
    }
  };

  const openDoctorFeedback = async (doctor) => {
    setFeedbackDoctor(doctor);
    setDoctorFeedbacks([]);
    setShowFeedbackModal(true);
    try {
      const { data } = await API.get(`/feedback/doctor/${doctor._id}`);
      if (data.success) {
        setDoctorFeedbacks(data.feedbacks || []);
      }
    } catch (err) {
      console.error('Failed to load feedback:', err);
    }
  };

  const handlePayment = async () => {
    if (!paymentRequest) return;

    setPaying(true);
    setPaymentError('');

    try {
      console.log('💳 Processing payment for request:', paymentRequest.requestId);

      const { data } = await API.post(`/telemedicine/${paymentRequest.requestId}/pay`, {
        paymentMethod: paymentMethod,
        paymentDetails: {
          method: paymentMethod,
          timestamp: new Date().toISOString(),
        }
      });

      if (data.success) {
        setShowPaymentModal(false);
        setPaymentRequest(null);

        // Show success message with meeting link
        setStatusUpdate({
          type: 'payment_success',
          message: `✅ Payment successful! Your consultation is confirmed. Meeting link: ${data.telemedicine?.meetingLink || 'Will be available when doctor starts'}`,
          meetingLink: data.telemedicine?.meetingLink,
        });

        // Reload requests to update status
        await loadRequests();

        // Auto-dismiss after 10 seconds
        setTimeout(() => setStatusUpdate(null), 10000);
      }
    } catch (err) {
      console.error('Payment error:', err);
      setPaymentError(err.response?.data?.message || 'Payment failed');
    }
    setPaying(false);
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    if (!form.doctorId) {
      setError('Please select a doctor');
      setSubmitting(false);
      return;
    }

    try {
      // ── FIX: Don't send patientId from frontend ──
      // The backend will use req.user.id to find the patient
      const clinicId = getEffectiveClinicId();
      const response = await API.post('/telemedicine/request', {
        // Remove patientId - let backend derive it from the logged-in user
        doctorId: form.doctorId,
        symptoms: form.symptoms,
        preferredTime: form.preferredTime || null,
        urgency: form.urgency,
        clinicId: clinicId,
      });

      if (response.data.success) {
        setShowRequestForm(false);
        setForm({ doctorId: '', symptoms: '', preferredTime: '', urgency: 'normal' });
        loadRequests();
        alert('✅ Telemedicine request sent successfully! The doctor will be notified.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send request');
    }
    setSubmitting(false);
  };

  const handleCancel = async (id) => {
    if (!window.confirm('Cancel this request?')) return;
    try {
      await API.patch(`/telemedicine/${id}/cancel`);

      if (isConnected) {
        emit('telemedicine:status-update', {
          requestId: id,
          patientId,
          status: 'cancelled',
          notes: 'Cancelled by patient'
        });
      }

      loadRequests();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to cancel');
    }
  };

  const handleLogout = () => { logout(); navigate('/patient-login'); };
  const goTo = (path) => { setSidebarOpen(false); setUserDropdown(false); navigate(path); };

  const initials = patientName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  // ── Derived specialty list + filtered doctors ─────────────────────────────
  const specialties = Array.from(
    new Set(
      doctors
        .map(doc => doc.department || doc.specialization)
        .filter(Boolean)
    )
  ).sort();

  const filteredDoctors = doctors.filter(doc => {
    const docSpecialty = doc.department || doc.specialization || 'General';
    const matchesSpecialty = filterSpecialty === 'all' || docSpecialty === filterSpecialty;

    const isOnline = isDoctorOnline(doc._id);
    const matchesStatus =
      filterStatusOnline === 'all' ||
      (filterStatusOnline === 'online' && isOnline) ||
      (filterStatusOnline === 'offline' && !isOnline);

    return matchesSpecialty && matchesStatus;
  });

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <i className="fas fa-spinner fa-spin" style={{ fontSize: 48, color: '#2d6be4' }}></i>
          <p style={{ marginTop: '1rem', color: '#6b7a99' }}>Loading telemedicine...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pd-layout">
      <style>{`
        @keyframes slideDown {
          from { transform: translateY(-20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .status-alert {
          animation: slideDown 0.3s ease-out;
        }
      `}</style>

      <header className="pd-topbar">
        <div className="pd-topbar__left">
          {!isMobile && (
            <button className="pd-hamburger" onClick={() => setSidebarOpen(true)}>
              <i className="fas fa-bars"></i>
            </button>
          )}
          <Link to="/patient-dashboard" className="pd-topbar__title">🩺 Telemedicine</Link>
          {!isMobile && (
            <span style={{ fontSize: 12, color: '#64748b', marginLeft: 12 }}>
              {isConnected ? '🔗 Connected' : '⚠️ Disconnected'}
            </span>
          )}
        </div>
        <div className="pd-topbar__right">
          <div className="pd-user-menu">
            <div className="pd-user-menu__trigger" onClick={() => setUserDropdown(!userDropdown)}>
              <div className="pd-user-menu__avatar">{initials}</div>
              <span className="pd-user-menu__name">{patientName}</span>
              <i className="fas fa-chevron-down" style={{ fontSize: 10, color: 'var(--text-secondary)' }} />
            </div>
            {userDropdown && (
              <>
                <div className="pd-user-dropdown-overlay" onClick={() => setUserDropdown(false)} />
                <div className="pd-user-dropdown">
                  <div className="pd-user-dropdown__info">
                    <strong>{patientName}</strong>
                    <span>{patientEmail}</span>
                  </div>
                  <div className="pd-user-dropdown__divider" />
                  {[
                    { icon: 'fa-user-circle',            label: 'Profile',             path: '/patient-profile' },
                    { icon: 'fa-calendar-check',         label: 'Appointments',        path: '/patient-appointments' },
                    { icon: 'fa-procedures',             label: 'Hospital Admission',  path: '/patient-admission' },
                    { icon: 'fa-video',                  label: 'Telemedicine',        path: '/patient-telemedicine' },
                    { icon: 'fa-prescription-bottle-alt',label: 'Prescriptions',       path: '/patient-prescriptions' },
                    { icon: 'fa-folder-open',            label: 'My Documents',        path: '/patient-documents' },
                  ].map(item => (
                    <button key={item.path} className="pd-user-dropdown__item" onClick={() => goTo(item.path)}>
                      <i className={`fas ${item.icon}`} /> {item.label}
                    </button>
                  ))}
                  <div className="pd-user-dropdown__divider" />
                  <button className="pd-user-dropdown__item pd-user-dropdown__item--danger" onClick={handleLogout}>
                    <i className="fas fa-sign-out-alt" /> Logout
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="pd-below-header">
        <div className={`pd-sidebar-overlay${sidebarOpen ? ' visible' : ''}`} onClick={() => setSidebarOpen(false)} />

        <PatientSidebar
          activeItem="telemedicine"
          sidebarOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          patientName={patientName}
          patientEmail={patientEmail}
          initials={initials}
        />

        <div className="pd-main">
          <main className="pd-body">
            {/* Status Update Alert */}
            {statusUpdate && (
              <div className="status-alert" style={{
                background: statusUpdate.type === 'meeting_started' ? '#dbeafe' :
                  statusUpdate.type === 'payment_required' ? '#fef3c7' :
                    statusUpdate.type === 'payment_success' ? '#dcfce7' :
                      statusUpdate.type === 'meeting_ended' ? '#dcfce7' :
                        statusUpdate.type === 'rejected' ? '#fee2e2' : '#fef3c7',
                border: `1px solid ${statusUpdate.type === 'meeting_started' ? '#3b82f6' :
                  statusUpdate.type === 'payment_required' ? '#f59e0b' :
                    statusUpdate.type === 'payment_success' ? '#22c55e' :
                      statusUpdate.type === 'meeting_ended' ? '#22c55e' :
                        statusUpdate.type === 'rejected' ? '#ef4444' : '#f59e0b'
                  }`,
                borderRadius: 8,
                padding: '12px 16px',
                marginBottom: 16,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <strong>{statusUpdate.message}</strong>
                </div>
                <div>
                  {statusUpdate.meetingLink && (
                    <a
                      href={statusUpdate.meetingLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-sm btn-primary"
                      style={{ marginRight: 8 }}
                    >
                      🔗 Join Now
                    </a>
                  )}
                  {statusUpdate.type === 'payment_required' && (
                    <button
                      className="btn btn-sm btn-primary"
                      style={{ marginRight: 8 }}
                      onClick={() => setShowPaymentModal(true)}
                    >
                      💳 Pay Now
                    </button>
                  )}
                  <button
                    className="btn btn-sm btn-ghost"
                    onClick={() => setStatusUpdate(null)}
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}

            {/* ── Payment Modal ── */}
            {showPaymentModal && paymentRequest && (
              <div style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
                padding: '16px'
              }} onClick={() => setShowPaymentModal(false)}>
                <div style={{
                  background: 'white',
                  borderRadius: 16,
                  padding: '24px',
                  maxWidth: '400px',
                  width: '100%',
                  maxHeight: '90vh',
                  overflowY: 'auto'
                }} onClick={e => e.stopPropagation()}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>💳 Payment Required</h3>
                    <button onClick={() => setShowPaymentModal(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>×</button>
                  </div>

                  <div style={{ background: '#f8fafc', borderRadius: 8, padding: '12px 16px', marginBottom: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ color: '#6b7a99' }}>Doctor</span>
                      <span style={{ fontWeight: 600 }}>Dr. {paymentRequest.doctorName}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ color: '#6b7a99' }}>Amount</span>
                      <span style={{ fontWeight: 700, color: '#2d6be4', fontSize: 18 }}>₹{paymentRequest.consultationFee}</span>
                    </div>
                    {paymentRequest.scheduledTime && (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#6b7a99' }}>Scheduled</span>
                        <span>{new Date(paymentRequest.scheduledTime).toLocaleString()}</span>
                      </div>
                    )}
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                      Payment Method
                    </label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: 8,
                        border: '1px solid #d1d5db',
                        fontSize: 14,
                        boxSizing: 'border-box'
                      }}
                    >
                      <option value="mock">💳 Mock Payment</option>
                      <option value="upi">📱 UPI</option>
                      <option value="card">💳 Card</option>
                    </select>
                  </div>

                  {paymentError && (
                    <div style={{ background: '#fee2e2', color: '#991b1b', padding: '10px 12px', borderRadius: 8, marginBottom: 16 }}>
                      ⚠️ {paymentError}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 10 }}>
                    <button
                      onClick={() => setShowPaymentModal(false)}
                      style={{
                        flex: 1,
                        padding: '10px',
                        background: '#f1f3f6',
                        border: 'none',
                        borderRadius: 8,
                        fontSize: 14,
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handlePayment}
                      disabled={paying}
                      style={{
                        flex: 2,
                        padding: '10px',
                        background: paying ? '#94a3b8' : '#2d6be4',
                        color: 'white',
                        border: 'none',
                        borderRadius: 8,
                        fontSize: 14,
                        fontWeight: 600,
                        cursor: paying ? 'not-allowed' : 'pointer'
                      }}
                    >
                      {paying ? 'Processing...' : `Pay ₹${paymentRequest.consultationFee}`}
                    </button>
                  </div>

                  <div style={{ marginTop: 12, fontSize: 12, color: '#94a3b8', textAlign: 'center' }}>
                    This is a demo payment. No real money will be charged.
                  </div>
                </div>
              </div>
            )}

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: '#1a2236' }}>
                  🩺 Telemedicine Consultations
                </h2>
                <p style={{ margin: '4px 0 0', color: '#6b7a99', fontSize: '14px' }}>
                  Request and join virtual consultations with your doctor
                </p>
                <p style={{ margin: '4px 0 0', color: '#22c55e', fontSize: '13px' }}>
                  {onlineDoctors.length} doctor{onlineDoctors.length !== 1 ? 's' : ''} currently online
                </p>
              </div>
              <button className="pd-btn pd-btn--primary" onClick={() => setShowRequestForm(true)}>
                <i className="fas fa-plus"></i> New Request
              </button>
            </div>

            {/* Request Form */}
            {showRequestForm && (
              <div className="pd-card" style={{ marginBottom: 20 }}>
                <div className="pd-card__head">
                  <h3>📝 New Telemedicine Request</h3>
                  <button onClick={() => setShowRequestForm(false)} style={{ marginLeft: 'auto', background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>×</button>
                </div>
                <div className="pd-card__body">
                  <form onSubmit={handleSubmit}>
                    <div className="form-group">
                      <label className="form-label">Select Doctor *</label>
                      {doctors.length === 0 ? (
                        <div style={{ padding: '10px', background: '#fef3c7', borderRadius: 8, color: '#92400e', fontSize: 13 }}>
                          <i className="fas fa-info-circle"></i> Loading doctors... Please wait.
                        </div>
                      ) : (
                        <select
                          className="form-control"
                          value={form.doctorId}
                          onChange={(e) => setForm({ ...form, doctorId: e.target.value })}
                          required
                        >
                          <option value="">— Select Doctor —</option>
                          {doctors.map(doc => {
                            const isOnline = isDoctorOnline(doc._id);
                            return (
                              <option key={doc._id} value={doc._id}>
                                Dr. {doc.name} ({doc.department || 'General'})
                                {isOnline ? ' 🟢 Online' : ' 🔴 Offline'}
                                {` - ₹${doc.telemedicineFee || 0}`}
                              </option>
                            );
                          })}
                        </select>
                      )}
                      {form.doctorId && isDoctorOnline(form.doctorId) && (
                        <div style={{ marginTop: 4, fontSize: 12, color: '#22c55e' }}>
                          ✅ This doctor is currently online
                        </div>
                      )}
                      {form.doctorId && !isDoctorOnline(form.doctorId) && (
                        <div style={{ marginTop: 4, fontSize: 12, color: '#ef4444' }}>
                          ⚠️ This doctor is currently offline. They will be notified when they come online.
                        </div>
                      )}
                    </div>
                    <div className="form-group">
                      <label className="form-label">Symptoms / Reason</label>
                      <textarea
                        className="form-control"
                        rows={3}
                        value={form.symptoms}
                        onChange={(e) => setForm({ ...form, symptoms: e.target.value })}
                        placeholder="Describe your symptoms or reason for consultation..."
                      />
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Preferred Time</label>
                        <input
                          type="datetime-local"
                          className="form-control"
                          value={form.preferredTime}
                          onChange={(e) => setForm({ ...form, preferredTime: e.target.value })}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Urgency</label>
                        <select
                          className="form-control"
                          value={form.urgency}
                          onChange={(e) => setForm({ ...form, urgency: e.target.value })}
                        >
                          <option value="normal">Normal</option>
                          <option value="urgent">Urgent</option>
                          <option value="emergency">🚨 Emergency</option>
                        </select>
                      </div>
                    </div>
                    {error && (
                      <div style={{ background: '#fee2e2', color: '#991b1b', padding: '10px 14px', borderRadius: 8, marginBottom: 12 }}>
                        ⚠️ {error}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button type="button" className="btn btn-ghost" onClick={() => setShowRequestForm(false)}>Cancel</button>
                      <button type="submit" className="btn btn-primary" disabled={submitting}>
                        {submitting ? 'Submitting...' : '📤 Send Request'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
{/* ── Available Doctors Cards ── */}
{doctors.length > 0 && (
  <div style={{ marginBottom: 24 }}>
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 12,
      marginBottom: 12,
    }}>
      <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1a2236', margin: 0 }}>
        👨‍⚕️ Available Doctors
      </h3>

      {/* ── Filters: Specialty + Online/Offline ── */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <select
          value={filterSpecialty}
          onChange={(e) => setFilterSpecialty(e.target.value)}
          style={{
            padding: '7px 12px',
            borderRadius: 8,
            border: '1px solid #d1d5db',
            fontSize: 13,
            fontWeight: 600,
            color: '#374151',
            background: '#fff',
            cursor: 'pointer',
          }}
        >
          <option value="all">🩺 All Specialties</option>
          {specialties.map(sp => (
            <option key={sp} value={sp}>{sp}</option>
          ))}
        </select>

        <select
          value={filterStatusOnline}
          onChange={(e) => setFilterStatusOnline(e.target.value)}
          style={{
            padding: '7px 12px',
            borderRadius: 8,
            border: '1px solid #d1d5db',
            fontSize: 13,
            fontWeight: 600,
            color: '#374151',
            background: '#fff',
            cursor: 'pointer',
          }}
        >
          <option value="all">All Status</option>
          <option value="online">🟢 Online</option>
          <option value="offline">🔴 Offline</option>
        </select>
      </div>
    </div>

    {filteredDoctors.length === 0 ? (
      <div style={{
        padding: '24px',
        textAlign: 'center',
        color: '#94a3b8',
        background: '#f8fafc',
        borderRadius: 12,
        fontSize: 14,
      }}>
        No doctors match the selected filters.
      </div>
    ) : (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
      gap: 16,
    }}>
      {filteredDoctors.map(doc => {
        const isOnline = isDoctorOnline(doc._id);
        return (
          <div key={doc._id} style={{
            background: '#fff',
            borderRadius: 12,
            padding: '16px 18px',
            border: `1.5px solid ${isOnline ? '#22c55e' : '#e5e7eb'}`,
            boxShadow: isOnline ? '0 2px 12px rgba(34,197,94,0.10)' : '0 1px 4px rgba(0,0,0,0.06)',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}>
            {/* Avatar + name row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 46, height: 46, borderRadius: '50%',
                background: isOnline ? '#d1fae5' : '#f1f5f9',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 20, fontWeight: 700,
                color: isOnline ? '#16a34a' : '#94a3b8',
                flexShrink: 0,
                overflow: 'hidden',
              }}>
                {doc.photoUrl ? (
                  <img
                    src={doc.photoUrl}
                    alt={doc.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                ) : (
                  doc.name?.charAt(0).toUpperCase()
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#1a2236', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  Dr. {doc.name}
                </div>
                <div style={{ fontSize: 12, color: '#6b7a99' }}>
                  {doc.department || doc.specialization || 'General'}
                </div>
                {doc.averageRating > 0 ? (
                  <div 
                    onClick={() => openDoctorFeedback(doc)}
                    style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px', fontSize: '12px', color: '#f59e0b', cursor: 'pointer' }}
                    title="View Feedback"
                  >
                    <i className="fas fa-star" />
                    <span style={{ fontWeight: 600, color: '#374151' }}>{doc.averageRating}</span>
                    <span style={{ color: '#94a3b8' }}>({doc.totalRatings})</span>
                  </div>
                ) : (
                  <div style={{ marginTop: '4px', fontSize: '11px', color: '#94a3b8' }}>
                    No ratings yet
                  </div>
                )}
              </div>
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 20,
                background: isOnline ? '#d1fae5' : '#f1f5f9',
                color: isOnline ? '#16a34a' : '#94a3b8',
                flexShrink: 0,
              }}>
                {isOnline ? '🟢 Online' : '🔴 Offline'}
              </span>
            </div>

            {/* Fee row */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              background: '#f8fafc', borderRadius: 8, padding: '8px 12px',
            }}>
              <span style={{ fontSize: 12, color: '#64748b' }}>Consultation Fee</span>
              <span style={{ fontWeight: 700, fontSize: 16, color: '#0f4c81' }}>
                {doc.telemedicineFee > 0 ? `₹${doc.telemedicineFee}` : 'Free'}
              </span>
            </div>

            {/* Consult Now button */}
            <button
              onClick={() => {
                setForm(prev => ({ ...prev, doctorId: doc._id }));
                setShowRequestForm(true);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              style={{
                width: '100%',
                padding: '9px 0',
                background: isOnline ? '#2d6be4' : '#94a3b8',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 700,
                cursor: isOnline ? 'pointer' : 'not-allowed',
                letterSpacing: 0.3,
              }}
            >
              {isOnline ? '🩺 Consult Now' : '📅 Request Appointment'}
            </button>
          </div>
        );
      })}
    </div>
    )}
  </div>
)}
            {/* Requests List */}
            <div className="pd-card">
              <div className="pd-card__body" style={{ padding: requests.length ? 0 : '24px' }}>
                {requests.length === 0 && (
                  <div className="pd-empty">
                    <i className="fas fa-video"></i> No telemedicine requests yet
                  </div>
                )}
                {requests.length > 0 && (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #e5e7eb', textAlign: 'left' }}>
                          <th style={{ padding: '12px 16px', color: '#6b7a99', fontWeight: 600 }}>Doctor</th>
                          <th style={{ padding: '12px 16px', color: '#6b7a99', fontWeight: 600 }}>Symptoms</th>
                          <th style={{ padding: '12px 16px', color: '#6b7a99', fontWeight: 600 }}>Fee</th>
                          <th style={{ padding: '12px 16px', color: '#6b7a99', fontWeight: 600 }}>Status</th>
                          <th style={{ padding: '12px 16px', color: '#6b7a99', fontWeight: 600 }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {requests.map((req) => {
                          const sc = STATUS_COLORS[req.status] || STATUS_COLORS.requested;
                          const isActive = ['ongoing', 'ready'].includes(req.status);
                          const isPending = ['requested', 'approved', 'scheduled', 'payment_pending'].includes(req.status);
                          const isOnline = isDoctorOnline(req.doctorId);
                          const isPaymentPending = req.status === 'payment_pending';

                          return (
                            <tr key={req._id} style={{ borderBottom: '1px solid #f1f3f6' }}>
                              <td style={{ padding: '12px 16px' }}>
                                <div style={{ fontWeight: 600 }}>
                                  Dr. {req.doctorName}
                                  {isOnline && req.status === 'requested' && (
                                    <span style={{ marginLeft: 8, fontSize: 11, color: '#22c55e' }}>
                                      🟢 Online
                                    </span>
                                  )}
                                </div>
                                <div style={{ fontSize: 12, color: '#64748b' }}>{req.doctorSpecialization}</div>
                              </td>
                              <td style={{ padding: '12px 16px', color: '#374151', maxWidth: 200 }}>
                                {req.symptoms || '—'}
                                {req.urgency === 'urgent' && (
                                  <span style={{ marginLeft: 6, padding: '2px 6px', borderRadius: 4, background: '#fef3c7', color: '#92400e', fontSize: 10, fontWeight: 700 }}>Urgent</span>
                                )}
                                {req.urgency === 'emergency' && (
                                  <span style={{ marginLeft: 6, padding: '2px 6px', borderRadius: 4, background: '#fee2e2', color: '#991b1b', fontSize: 10, fontWeight: 700 }}>🚨 Emergency</span>
                                )}
                              </td>
                              <td style={{ padding: '12px 16px' }}>
                                <span style={{ fontWeight: 600, color: '#0f4c81' }}>
                                  ₹{req.consultationFee || 0}
                                </span>
                                {req.paymentStatus === 'paid' && (
                                  <span style={{ marginLeft: 6, fontSize: 10, color: '#22c55e' }}>✅ Paid</span>
                                )}
                              </td>
                              <td style={{ padding: '12px 16px' }}>
                                <span style={{
                                  padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                                  background: sc.bg, color: sc.color,
                                }}>
                                  {sc.label}
                                </span>
                                {req.scheduledTime && req.status !== 'completed' && req.status !== 'cancelled' && (
                                  <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>
                                    📅 {new Date(req.scheduledTime).toLocaleString()}
                                  </div>
                                )}
                              </td>
                              <td style={{ padding: '12px 16px' }}>
                                <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
                                  {req.meetingLink && isActive && (
                                    <a href={req.meetingLink} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-primary">
                                      🔗 Join Meeting
                                    </a>
                                  )}

                                  {isPaymentPending && (
                                    <button
                                      className="btn btn-sm btn-warning"
                                      onClick={() => {
                                        setPaymentRequest({
                                          requestId: req._id,
                                          doctorName: req.doctorName,
                                          consultationFee: req.consultationFee,
                                          scheduledTime: req.scheduledTime
                                        });
                                        setShowPaymentModal(true);
                                      }}
                                      style={{
                                        padding: '4px 10px',
                                        background: '#f59e0b',
                                        color: '#fff',
                                        border: 'none',
                                        borderRadius: 4,
                                        cursor: 'pointer',
                                        fontSize: 11,
                                        fontWeight: 600
                                      }}
                                    >
                                      💳 Pay Now
                                    </button>
                                  )}

                                  {isPending && req.status !== 'payment_pending' && (
                                    <button className="btn btn-sm btn-danger" onClick={() => handleCancel(req._id)}>
                                      Cancel
                                    </button>
                                  )}

                                  {req.status === 'completed' && (
                                    <span style={{ fontSize: 12, color: '#64748b' }}>
                                      Duration: {req.durationMinutes || 0} min
                                    </span>
                                  )}

                                  {req.status === 'ongoing' && req.meetingLink && (
                                    <a href={req.meetingLink} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-success">
                                      🔴 Join Now
                                    </a>
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
          </main>
        </div>
      </div>

      {/* ── Feedback Modal ── */}
      {showFeedbackModal && feedbackDoctor && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '16px'
        }} onClick={() => setShowFeedbackModal(false)}>
          <div style={{
            background: 'white',
            borderRadius: 16,
            padding: '24px',
            maxWidth: '500px',
            width: '100%',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column'
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, color: '#1a2236', fontSize: '18px' }}>Feedback for Dr. {feedbackDoctor.name}</h3>
              <button 
                onClick={() => setShowFeedbackModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#64748b', lineHeight: 1 }}
              >
                &times;
              </button>
            </div>
            
            <div style={{ overflowY: 'auto', flex: 1, paddingRight: '4px' }}>
              {doctorFeedbacks.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
                  <i className="fas fa-comment-slash" style={{ fontSize: '32px', marginBottom: '12px', opacity: 0.5 }}></i>
                  <p style={{ margin: 0 }}>No detailed feedback available yet.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {doctorFeedbacks.map((fb, idx) => {
                    const patientName = fb.patientId?.name || 'Anonymous';
                    
                    return (
                      <div key={fb._id || idx} style={{ padding: '16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontWeight: 'bold', fontSize: '14px' }}>
                              {patientName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: '14px', color: '#334155' }}>
                                {patientName}
                              </div>
                              <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                                {new Date(fb.createdAt).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '2px', color: '#f59e0b', fontSize: '14px' }}>
                            {[...Array(5)].map((_, i) => (
                              <i key={i} className={i < fb.doctorRating ? "fas fa-star" : "far fa-star"} />
                            ))}
                          </div>
                        </div>
                        {fb.doctorFeedback && (
                          <div style={{ fontSize: '14px', color: '#475569', marginTop: '12px', lineHeight: 1.5 }}>
                            "{fb.doctorFeedback}"
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Mobile bottom navigation ── */}
      <BottomNav activeItem="consult" />
    </div>
  );
}