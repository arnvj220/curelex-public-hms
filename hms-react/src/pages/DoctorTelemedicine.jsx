// hms-react/src/pages/DoctorTelemedicine.jsx

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import API from '../utils/api';
import { useSocket } from '../hooks/useSocket';

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

export default function DoctorTelemedicine() {
  const { user, socket, isConnected, doctorStatus, setDoctorOnline, updateUserData, emit, on, off } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [stats, setStats] = useState({});
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [scheduledTime, setScheduledTime] = useState('');
  const [doctorNotes, setDoctorNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [newRequestAlert, setNewRequestAlert] = useState(null);
  const [statusAlert, setStatusAlert] = useState(null);

  const [teleFee, setTeleFee] = useState(user?.telemedicineFee || 0);
  const [savingFee, setSavingFee] = useState(false);

  const handleSaveFee = async () => {
    setSavingFee(true);
    try {
      await API.put('/telemedicine/consultation-fee', { telemedicineFee: Number(teleFee) || 0 });
      updateUserData({ telemedicineFee: Number(teleFee) || 0 });
      setStatusAlert({ type: 'payout_approved', message: 'Telemedicine consultation fee updated successfully!' });
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to update consultation fee');
    } finally {
      setSavingFee(false);
    }
  };

const doctorId = user?._id || user?.id;

// ── Setup completeness check ──
const hasFeeSet = Number(user?.telemedicineFee) > 0;
const hasBankDetails = Boolean(
  user?.bankDetails?.accountHolderName &&
  user?.bankDetails?.accountNumber &&
  user?.bankDetails?.bankName &&
  user?.bankDetails?.ifscCode
);
const setupComplete = hasFeeSet && hasBankDetails;


  // ── Socket: Listen for events ──
  useEffect(() => {
    if (!isConnected) return;

    // Do NOT auto-set doctor online here.
    // Doctor status is controlled manually via the toggle button only.

    const handleNewRequest = (data) => {
      setNewRequestAlert(data);
      loadRequests();
      loadStats();
      setTimeout(() => setNewRequestAlert(null), 10000);
    };

    const handleStatusUpdate = (data) => {
      console.log('📊 Status update received:', data);
      loadRequests();
      loadStats();
    };
    

    const handlePaymentReceived = (data) => {
      console.log('💳 Payment received:', data);
      setStatusAlert({
        message: `✅ Payment received from ${data.patientName}: ₹${data.telemedicineFee}`,
        type: 'payment_received'
      });
      loadRequests();
      loadStats();
      setTimeout(() => setStatusAlert(null), 6000);
    };

    const handlePayoutRequested = (data) => {
      console.log('💰 Payout requested:', data);
      setStatusAlert({
        message: `💰 Payout requested: ₹${data.amount} - Waiting for super admin approval`,
        type: 'payout_requested'
      });
      loadRequests();
      setTimeout(() => setStatusAlert(null), 5000);
    };

    const handlePayoutApproved = (data) => {
      console.log('✅ Payout approved:', data);
      setStatusAlert({
        message: `✅ Payout approved: ₹${data.amount} has been transferred!`,
        type: 'payout_approved'
      });
      loadRequests();
      loadStats();
      setTimeout(() => setStatusAlert(null), 8000);
    };

    on('telemedicine:new-request', handleNewRequest);
    on('telemedicine:status-update', handleStatusUpdate);
    on('telemedicine:payment-received', handlePaymentReceived);
    on('telemedicine:payout-requested', handlePayoutRequested);
    on('telemedicine:payout-approved', handlePayoutApproved);

    return () => {
      off('telemedicine:new-request', handleNewRequest);
      off('telemedicine:status-update', handleStatusUpdate);
      off('telemedicine:payment-received', handlePaymentReceived);
      off('telemedicine:payout-requested', handlePayoutRequested);
      off('telemedicine:payout-approved', handlePayoutApproved);
    };
  }, [isConnected]);
  useEffect(() => {
  console.log('🔍 DoctorTelemedicine Mounted:');
  console.log('  - isConnected:', isConnected);
  console.log('  - doctorId:', doctorId);
  console.log('  - user:', user);
  console.log('  - socket exists:', !!socket);
}, []);

  // ── Load data ──
  useEffect(() => {
    if (doctorId) {
      loadRequests();
      loadStats();
    }
  }, [doctorId]);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const { data } = await API.get(`/telemedicine/doctor/${doctorId}`);
      if (data.success) {
        setRequests(data.requests || []);
      }
    } catch (err) {
      console.error('Failed to load requests:', err);
    }
    setLoading(false);
  };

  const loadStats = async () => {
    try {
      const { data } = await API.get('/telemedicine/stats');
      if (data.success) {
        setStats(data.stats);
      }
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  };

  // ── Toggle online/offline status ──
  const toggleOnlineStatus = () => {
  if (!setupComplete && doctorStatus !== 'online') {
    alert(
      '⚠️ Please complete your setup before going online:\n' +
      (!hasFeeSet ? '• Set your consultation fee\n' : '') +
      (!hasBankDetails ? '• Add your bank details' : '')
    );
    return;
  }
  const newStatus = doctorStatus === 'online' ? 'offline' : 'online';
  setDoctorOnline(newStatus);
};

  // ── Cancel Handler ──
  const handleCancel = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this request?')) return;
    
    setActionLoading(true);
    try {
      const response = await API.patch(`/telemedicine/${id}/cancel`);
      
      if (response.data.success) {
        if (isConnected) {
          const request = requests.find(r => r._id === id);
          if (request) {
            emit('telemedicine:status-update', {
              requestId: id,
              patientId: request.patientId,
              doctorId: doctorId,
              status: 'cancelled',
              notes: 'Cancelled by doctor'
            });
          }
        }
        
        await loadRequests();
        await loadStats();
        alert('✅ Request cancelled successfully');
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to cancel request');
    }
    setActionLoading(false);
  };

  // ── Actions ──
  const handleAction = async (action, id, data = {}) => {
    setActionLoading(true);
    try {
      const response = await API.patch(`/telemedicine/${id}/${action}`, data);

      if (isConnected) {
        const request = requests.find(r => r._id === id);
        if (request) {
          let status = action;
          if (action === 'approve') status = 'payment_pending';
          else if (action === 'reject') status = 'rejected';
          else if (action === 'start') status = 'ongoing';
          else if (action === 'end') status = 'completed';
          
          emit('telemedicine:status-update', {
            requestId: id,
            patientId: request.patientId,
            doctorId: doctorId,
            status: status,
            notes: data.doctorNotes || ''
          });

          if (action === 'approve') {
            emit('telemedicine:payment-required', {
              requestId: id,
              patientId: request.patientId,
              doctorId: doctorId,
              doctorName: request.doctorName,
              consultationFee: request.consultationFee || 0,
              scheduledTime: response.data.telemedicine?.scheduledTime || request.scheduledTime,
            });
          }

          if (action === 'start' && response.data.telemedicine?.meetingLink) {
            emit('telemedicine:meeting-started', {
              requestId: id,
              patientId: request.patientId,
              doctorId: doctorId,
              meetingLink: response.data.telemedicine.meetingLink
            });
          }

          if (action === 'end') {
            emit('telemedicine:meeting-ended', {
              requestId: id,
              patientId: request.patientId,
              doctorId: doctorId,
              duration: response.data.telemedicine?.durationMinutes || 0
            });
          }
        }
      }

      await loadRequests();
      await loadStats();
      setShowModal(false);
    } catch (err) {
      console.error(`Failed to ${action}:`, err);
      alert(err.response?.data?.message || `Failed to ${action}`);
    }
    setActionLoading(false);
  };

  // ── Request Payout ──
  const handleRequestPayout = async (id) => {
    if (!confirm('Request payout for this consultation?')) return;

    setActionLoading(true);
    try {
      const { data } = await API.post(`/telemedicine/${id}/request-payout`);
      if (data.success) {
        setStatusAlert({
          message: '✅ Payout request submitted! Waiting for super admin approval.',
          type: 'payout_submitted'
        });
        setTimeout(() => setStatusAlert(null), 5000);
        loadRequests();
        loadStats();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to request payout');
    }
    setActionLoading(false);
  };

  const openModal = (request, action) => {
    setSelectedRequest({ ...request, action });
    if (action === 'approve') {
      setScheduledTime(request.preferredTime || new Date(Date.now() + 30 * 60000).toISOString().slice(0, 16));
    }
    setDoctorNotes('');
    setShowModal(true);
  };

  const filteredRequests = filter === 'all'
    ? requests
    : requests.filter(r => r.status === filter);

  const getStatusCount = (status) => {
    return requests.filter(r => r.status === status).length;
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <i className="fas fa-spinner fa-spin" style={{ fontSize: 48, color: '#2d6be4' }}></i>
          <p style={{ marginTop: '1rem', color: '#6b7a99' }}>Loading telemedicine requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <style>{`
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.4; }
          100% { opacity: 1; }
        }
        @keyframes slideIn {
          from { transform: translateY(-20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .alert-slide-in {
          animation: slideIn 0.3s ease-out;
        }
      `}</style>

      {/* Header with Status Toggle */}
      <div className="page-header">
        <div>
          <h1 className="page-title">🩺 Telemedicine</h1>
          <p className="text-muted text-small">Manage virtual consultations with patients</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '6px 12px',
  borderRadius: 20,
  background: doctorStatus === 'online' ? '#dcfce7' : '#fee2e2',
  border: `1px solid ${doctorStatus === 'online' ? '#86efac' : '#fca5a5'}`
}}>
  <span style={{
    display: 'inline-block',
    width: 10,
    height: 10,
    borderRadius: '50%',
    background: doctorStatus === 'online' ? '#22c55e' : '#ef4444',
    animation: doctorStatus === 'online' ? 'pulse 2s infinite' : 'none'
  }}></span>
  <span style={{ fontSize: 13, fontWeight: 600 }}>
    {doctorStatus === 'online' ? '🟢 Online' : '🔴 Offline'}
  </span>
  <button
    onClick={toggleOnlineStatus}
    disabled={!setupComplete && doctorStatus !== 'online'}
    title={!setupComplete ? 'Set consultation fee and bank details first' : ''}
    className={`btn btn-sm ${doctorStatus === 'online' ? 'btn-danger' : 'btn-success'}`}
    style={{
      fontSize: 11,
      padding: '2px 10px',
      opacity: (!setupComplete && doctorStatus !== 'online') ? 0.5 : 1,
      cursor: (!setupComplete && doctorStatus !== 'online') ? 'not-allowed' : 'pointer',
    }}
  >
    {doctorStatus === 'online' ? 'Go Offline' : 'Go Online'}
  </button>
</div>

{!setupComplete && (
  <span style={{ fontSize: 11, color: '#dc2626', fontWeight: 600 }}>
    ⚠️ {!hasFeeSet && !hasBankDetails ? 'Set fee & bank details to go online' :
        !hasFeeSet ? 'Set consultation fee to go online' :
        'Add bank details to go online'}
  </span>
)}

{!setupComplete && (
  <span style={{ fontSize: 11, color: '#dc2626', fontWeight: 600 }}>
    ⚠️ {!hasFeeSet && !hasBankDetails ? 'Set fee & bank details to go online' :
        !hasFeeSet ? 'Set consultation fee to go online' :
        'Add bank details to go online'}
  </span>
)}
          {/* Consultation Fee Input */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 12px',
            borderRadius: 20,
            background: '#f8fafc',
            border: '1px solid #e2e8f0'
          }}>
            <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>Fee: ₹</span>
            <input 
              type="number"
              value={teleFee}
              onChange={e => setTeleFee(e.target.value)}
              placeholder="0"
              style={{
                width: 60,
                border: 'none',
                background: 'transparent',
                outline: 'none',
                fontSize: 13,
                fontWeight: 600,
                color: '#1a2236',
                padding: 0,
              }}
            />
            <button 
              onClick={handleSaveFee}
              disabled={savingFee}
              className="btn btn-sm"
              style={{
                padding: '2px 8px',
                fontSize: 11,
                minHeight: 'auto',
                height: 24,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                background: '#0f4c81',
                border: 'none',
                borderRadius: 12,
                cursor: 'pointer'
              }}
            >
              {savingFee ? 'Saving...' : 'Save'}
            </button>
          </div>

          <span style={{ fontSize: 12, color: '#64748b' }}>
            {isConnected ? '🔗 Connected' : '⚠️ Disconnected'}
          </span>
          <button
            onClick={() => window.location.href = '/dashboard/doctor-earnings'}
            className="btn btn-sm btn-outline"
            style={{ fontSize: 11 }}
          >
            💰 Earnings
          </button>
        </div>
      </div>

      {/* Status Alert */}
      {statusAlert && (
        <div className="alert-slide-in" style={{
          background: statusAlert.type === 'payment_received' || statusAlert.type === 'payout_approved' ? '#dcfce7' :
                     statusAlert.type === 'payout_submitted' || statusAlert.type === 'payout_requested' ? '#fef3c7' :
                     '#dbeafe',
          border: `2px solid ${statusAlert.type === 'payment_received' || statusAlert.type === 'payout_approved' ? '#22c55e' : 
                                 statusAlert.type === 'payout_submitted' || statusAlert.type === 'payout_requested' ? '#f59e0b' : '#3b82f6'}`,
          borderRadius: 8,
          padding: '12px 16px',
          marginBottom: 16,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <strong>{statusAlert.message}</strong>
          </div>
          <button
            className="btn btn-sm btn-ghost"
            onClick={() => setStatusAlert(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* New Request Alert */}
      {newRequestAlert && (
        <div className="alert-slide-in" style={{
          background: newRequestAlert.urgency === 'emergency' ? '#fee2e2' : '#dbeafe',
          border: `2px solid ${newRequestAlert.urgency === 'emergency' ? '#ef4444' : '#3b82f6'}`,
          borderRadius: 8,
          padding: '12px 16px',
          marginBottom: 16,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <strong>🔔 New Request:</strong> {newRequestAlert.patientName}
            {newRequestAlert.urgency === 'emergency' && (
              <span style={{ marginLeft: 8, padding: '2px 8px', borderRadius: 4, background: '#fee2e2', color: '#991b1b', fontSize: 11, fontWeight: 700 }}>
                🚨 EMERGENCY
              </span>
            )}
            {newRequestAlert.urgency === 'urgent' && (
              <span style={{ marginLeft: 8, padding: '2px 8px', borderRadius: 4, background: '#fef3c7', color: '#92400e', fontSize: 11, fontWeight: 700 }}>
                ⚠️ URGENT
              </span>
            )}
            <span style={{ marginLeft: 8, fontSize: 12, color: '#64748b' }}>
              Fee: ₹{newRequestAlert.consultationFee || 0}
            </span>
          </div>
          <div>
            <button
              className="btn btn-sm btn-primary"
              onClick={() => {
                setFilter('requested');
                setNewRequestAlert(null);
              }}
            >
              View Request
            </button>
            <button
              className="btn btn-sm btn-ghost"
              onClick={() => setNewRequestAlert(null)}
              style={{ marginLeft: 8 }}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="stat-grid" style={{ marginBottom: 20 }}>
        {[
          { label: 'Total', value: stats.total || 0, color: '#0f4c81' },
          { label: 'Requested', value: stats.requested || 0, color: '#f59e0b' },
          { label: 'Payment Pending', value: stats.paymentPending || 0, color: '#f97316' },
          { label: 'Ongoing', value: stats.ongoing || 0, color: '#dc2626' },
          { label: 'Completed', value: stats.completed || 0, color: '#10b981' },
          { label: 'Earnings', value: `₹${stats.earnings?.total || 0}`, color: '#0f4c81' },
        ].map(s => (
          <div className="stat-card" key={s.label}>
            <div className="stat-icon" style={{ background: `${s.color}18`, color: s.color }}>
              <span>{s.value}</span>
            </div>
            <div>
              <div className="stat-label">{s.label}</div>
              <div className="stat-value">{s.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 20, padding: '12px 16px' }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            onClick={() => setFilter('all')}
            className={`btn ${filter === 'all' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ fontSize: 12 }}
          >
            All ({requests.length})
          </button>
          {['requested', 'payment_pending', 'ongoing', 'completed', 'cancelled'].map(status => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`btn ${filter === status ? 'btn-primary' : 'btn-ghost'}`}
              style={{ fontSize: 12 }}
            >
              {STATUS_COLORS[status]?.label || status} ({getStatusCount(status)})
            </button>
          ))}
          <button onClick={loadRequests} className="btn btn-outline" style={{ marginLeft: 'auto' }}>
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Request List */}
      {filteredRequests.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
          <div>No telemedicine requests found</div>
        </div>
      ) : (
        <div className="card">
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Doctor</th>
                  <th>Symptoms</th>
                  <th>Fee</th>
                  <th>Urgency</th>
                  <th>Payment</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.map((req) => {
                  const sc = STATUS_COLORS[req.status] || STATUS_COLORS.requested;
                  const isPaymentPaid = req.paymentStatus === 'paid';
                  const isPayoutPending = req.doctorPayoutStatus === 'pending';
                  const isPayoutProcessing = req.doctorPayoutStatus === 'processing';
                  const isPayoutCompleted = req.doctorPayoutStatus === 'completed';

                  return (
                    <tr key={req._id}>
                      <td>
                        <strong>{req.patientName}</strong>
                        <br />
                        <span className="text-muted text-small">{req.patientEmail}</span>
                      </td>
                      <td>
                        Dr. {req.doctorName}
                        <br />
                        <span className="text-muted text-small">{req.doctorSpecialization}</span>
                      </td>
                      <td style={{ maxWidth: 150 }}>
                        {req.symptoms || '—'}
                        {req.urgency === 'urgent' && (
                          <span style={{ marginLeft: 6, padding: '2px 6px', borderRadius: 4, background: '#fef3c7', color: '#92400e', fontSize: 10, fontWeight: 700 }}>
                            Urgent
                          </span>
                        )}
                        {req.urgency === 'emergency' && (
                          <span style={{ marginLeft: 6, padding: '2px 6px', borderRadius: 4, background: '#fee2e2', color: '#991b1b', fontSize: 10, fontWeight: 700 }}>
                            🚨 Emergency
                          </span>
                        )}
                      </td>
                      <td>
                        <span style={{ fontWeight: 600, color: '#0f4c81' }}>
                          ₹{req.consultationFee || 0}
                        </span>
                      </td>
                      <td>
                        <span style={{
                          padding: '2px 8px', borderRadius: 12, fontSize: 10, fontWeight: 700,
                          background: req.urgency === 'emergency' ? '#fee2e2' : req.urgency === 'urgent' ? '#fef3c7' : '#f3f4f6',
                          color: req.urgency === 'emergency' ? '#991b1b' : req.urgency === 'urgent' ? '#92400e' : '#6b7280',
                        }}>
                          {req.urgency || 'normal'}
                        </span>
                      </td>
                      <td>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: 12,
                          fontSize: 10,
                          fontWeight: 700,
                          background: isPaymentPaid ? '#dcfce7' : '#fef3c7',
                          color: isPaymentPaid ? '#166534' : '#92400e'
                        }}>
                          {isPaymentPaid ? '✅ Paid' : '⏳ Pending'}
                        </span>
                        {isPaymentPaid && (
                          <div style={{ fontSize: 9, color: '#64748b', marginTop: 2 }}>
                            Payout: {isPayoutPending ? '⏳ Pending' :
                                     isPayoutProcessing ? '🔄 Processing' :
                                     isPayoutCompleted ? '✅ Completed' : '—'}
                          </div>
                        )}
                      </td>
                      <td>
                        <span style={{
                          padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
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
                      <td>
                        <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
                          {req.status === 'requested' && (
                            <>
                              <button
                                className="btn btn-sm btn-success"
                                onClick={() => openModal(req, 'approve')}
                              >
                                ✅ Approve
                              </button>
                              <button
                                className="btn btn-sm btn-danger"
                                onClick={() => openModal(req, 'reject')}
                              >
                                ✕ Reject
                              </button>
                            </>
                          )}

                          {req.status === 'payment_pending' && (
                            <span style={{ fontSize: 11, color: '#f59e0b' }}>
                              ⏳ Waiting for payment
                            </span>
                          )}

                          {req.status === 'payment_completed' && (
                            <button
                              className="btn btn-sm btn-primary"
                              onClick={() => handleAction('start', req._id)}
                            >
                              🟢 Start Meeting
                            </button>
                          )}

                          {req.status === 'scheduled' && (
                            <button
                              className="btn btn-sm btn-primary"
                              onClick={() => handleAction('start', req._id)}
                            >
                              🟢 Start Meeting
                            </button>
                          )}

                          {req.status === 'ongoing' && (
                            <>
                              <button
                                className="btn btn-sm btn-success"
                                onClick={() => openModal(req, 'end')}
                              >
                                ⏹ End Meeting
                              </button>
                              {req.meetingLink && (
                                <a
                                  href={req.meetingLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="btn btn-sm btn-primary"
                                >
                                  🔗 Join
                                </a>
                              )}
                            </>
                          )}

                          {req.status === 'completed' && isPaymentPaid && isPayoutPending && (
                            <button
                              className="btn btn-sm btn-warning"
                              onClick={() => handleRequestPayout(req._id)}
                              disabled={actionLoading}
                              style={{
                                padding: '4px 10px',
                                background: '#f59e0b',
                                color: '#fff',
                                border: 'none',
                                borderRadius: 4,
                                cursor: actionLoading ? 'not-allowed' : 'pointer',
                                fontSize: 11,
                                fontWeight: 600
                              }}
                            >
                              💰 Request Payout
                            </button>
                          )}

                          {req.status === 'completed' && isPaymentPaid && isPayoutProcessing && (
                            <span style={{ fontSize: 11, color: '#3b82f6' }}>
                              ⏳ Payout Processing
                            </span>
                          )}

                          {req.status === 'completed' && isPaymentPaid && isPayoutCompleted && (
                            <span style={{ fontSize: 11, color: '#22c55e' }}>
                              ✅ Payout Done
                            </span>
                          )}

                          {(req.status === 'requested' || req.status === 'approved' || req.status === 'scheduled' || req.status === 'payment_pending') && (
                            <button
                              className="btn btn-sm btn-outline"
                              onClick={() => handleCancel(req._id)}
                              style={{ color: '#ef4444', borderColor: '#ef4444' }}
                              disabled={actionLoading}
                            >
                              Cancel
                            </button>
                          )}

                          <button
                            className="btn btn-sm btn-ghost"
                            onClick={() => {
                              setSelectedRequest(req);
                              setShowModal(true);
                            }}
                          >
                            View
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
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                {selectedRequest?.action === 'approve' && '✅ Approve Request'}
                {selectedRequest?.action === 'reject' && '❌ Reject Request'}
                {selectedRequest?.action === 'end' && '⏹ End Meeting'}
                {!selectedRequest?.action && '📋 Request Details'}
              </h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <div className="modal-body">
              {selectedRequest?.action === 'approve' && (
                <>
                  <p style={{ marginBottom: 16 }}>
                    Approve telemedicine request from <strong>{selectedRequest.patientName}</strong>
                  </p>
                  <div className="form-group">
                    <label className="form-label">Consultation Fee</label>
                    <input
                      type="text"
                      className="form-control"
                      value={`₹${selectedRequest.consultationFee || 0}`}
                      disabled
                      style={{ background: '#f1f3f6' }}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Scheduled Time</label>
                    <input
                      type="datetime-local"
                      className="form-control"
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Notes (optional)</label>
                    <textarea
                      className="form-control"
                      rows={3}
                      value={doctorNotes}
                      onChange={(e) => setDoctorNotes(e.target.value)}
                      placeholder="Add any notes for the patient..."
                    />
                  </div>
                  <div style={{
                    padding: '10px 14px',
                    background: '#fef3c7',
                    borderRadius: 8,
                    fontSize: 13,
                    color: '#92400e',
                    marginBottom: 12
                  }}>
                    💡 Patient will be notified to make payment of ₹{selectedRequest.consultationFee || 0}
                  </div>
                </>
              )}

              {selectedRequest?.action === 'reject' && (
                <>
                  <p style={{ marginBottom: 16 }}>
                    Reject telemedicine request from <strong>{selectedRequest.patientName}</strong>
                  </p>
                  <div className="form-group">
                    <label className="form-label">Reason (optional)</label>
                    <textarea
                      className="form-control"
                      rows={3}
                      value={doctorNotes}
                      onChange={(e) => setDoctorNotes(e.target.value)}
                      placeholder="Reason for rejection..."
                    />
                  </div>
                </>
              )}

              {selectedRequest?.action === 'end' && (
                <>
                  <p style={{ marginBottom: 16 }}>
                    End meeting with <strong>{selectedRequest.patientName}</strong>
                  </p>
                  <div className="form-group">
                    <label className="form-label">Notes (optional)</label>
                    <textarea
                      className="form-control"
                      rows={3}
                      value={doctorNotes}
                      onChange={(e) => setDoctorNotes(e.target.value)}
                      placeholder="Add any notes from the consultation..."
                    />
                  </div>
                </>
              )}

              {!selectedRequest?.action && selectedRequest && (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <div className="text-muted text-small">Patient</div>
                      <div style={{ fontWeight: 600 }}>{selectedRequest.patientName}</div>
                    </div>
                    <div>
                      <div className="text-muted text-small">Doctor</div>
                      <div style={{ fontWeight: 600 }}>Dr. {selectedRequest.doctorName}</div>
                    </div>
                    <div>
                      <div className="text-muted text-small">Fee</div>
                      <div style={{ fontWeight: 600, color: '#0f4c81' }}>₹{selectedRequest.consultationFee || 0}</div>
                    </div>
                    <div>
                      <div className="text-muted text-small">Payment</div>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: 12,
                        fontSize: 11,
                        fontWeight: 700,
                        background: selectedRequest.paymentStatus === 'paid' ? '#dcfce7' : '#fef3c7',
                        color: selectedRequest.paymentStatus === 'paid' ? '#166534' : '#92400e'
                      }}>
                        {selectedRequest.paymentStatus === 'paid' ? '✅ Paid' : '⏳ Pending'}
                      </span>
                    </div>
                    <div>
                      <div className="text-muted text-small">Status</div>
                      <span style={{
                        padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 700,
                        background: STATUS_COLORS[selectedRequest.status]?.bg || '#f3f4f6',
                        color: STATUS_COLORS[selectedRequest.status]?.color || '#6b7280',
                      }}>
                        {STATUS_COLORS[selectedRequest.status]?.label || selectedRequest.status}
                      </span>
                    </div>
                    <div>
                      <div className="text-muted text-small">Urgency</div>
                      <span style={{
                        padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 700,
                        background: selectedRequest.urgency === 'emergency' ? '#fee2e2' : selectedRequest.urgency === 'urgent' ? '#fef3c7' : '#f3f4f6',
                        color: selectedRequest.urgency === 'emergency' ? '#991b1b' : selectedRequest.urgency === 'urgent' ? '#92400e' : '#6b7280',
                      }}>
                        {selectedRequest.urgency || 'normal'}
                      </span>
                    </div>
                    <div>
                      <div className="text-muted text-small">Requested</div>
                      <div>{new Date(selectedRequest.createdAt).toLocaleString()}</div>
                    </div>
                    {selectedRequest.scheduledTime && (
                      <div>
                        <div className="text-muted text-small">Scheduled</div>
                        <div>{new Date(selectedRequest.scheduledTime).toLocaleString()}</div>
                      </div>
                    )}
                    {selectedRequest.meetingLink && (
                      <div style={{ gridColumn: 'span 2' }}>
                        <div className="text-muted text-small">Meeting Link</div>
                        <a href={selectedRequest.meetingLink} target="_blank" rel="noopener noreferrer" style={{ color: '#0f4c81' }}>
                          {selectedRequest.meetingLink}
                        </a>
                      </div>
                    )}
                    {selectedRequest.symptoms && (
                      <div style={{ gridColumn: 'span 2' }}>
                        <div className="text-muted text-small">Symptoms</div>
                        <div>{selectedRequest.symptoms}</div>
                      </div>
                    )}
                    {selectedRequest.doctorNotes && (
                      <div style={{ gridColumn: 'span 2' }}>
                        <div className="text-muted text-small">Doctor Notes</div>
                        <div>{selectedRequest.doctorNotes}</div>
                      </div>
                    )}
                    {selectedRequest.doctorPayoutStatus && selectedRequest.paymentStatus === 'paid' && (
                      <div style={{ gridColumn: 'span 2' }}>
                        <div className="text-muted text-small">Payout Status</div>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: 12,
                          fontSize: 11,
                          fontWeight: 700,
                          background: selectedRequest.doctorPayoutStatus === 'completed' ? '#dcfce7' :
                                     selectedRequest.doctorPayoutStatus === 'processing' ? '#dbeafe' : '#fef3c7',
                          color: selectedRequest.doctorPayoutStatus === 'completed' ? '#166534' :
                                 selectedRequest.doctorPayoutStatus === 'processing' ? '#1e40af' : '#92400e'
                        }}>
                          {selectedRequest.doctorPayoutStatus === 'completed' ? '✅ Completed' :
                           selectedRequest.doctorPayoutStatus === 'processing' ? '🔄 Processing' : '⏳ Pending'}
                        </span>
                        {selectedRequest.doctorPayoutAmount && (
                          <span style={{ marginLeft: 8, fontSize: 12, color: '#64748b' }}>
                            Amount: ₹{selectedRequest.doctorPayoutAmount}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Close</button>
              {selectedRequest?.action && (
                <button
                  className={`btn ${selectedRequest.action === 'reject' ? 'btn-danger' : 'btn-primary'}`}
                  onClick={() => handleAction(selectedRequest.action, selectedRequest._id, {
                    scheduledTime,
                    doctorNotes,
                  })}
                  disabled={actionLoading}
                >
                  {actionLoading ? 'Processing...' :
                    selectedRequest.action === 'approve' ? '✅ Approve' :
                    selectedRequest.action === 'reject' ? '✕ Reject' :
                    selectedRequest.action === 'end' ? '⏹ End Meeting' : 'Confirm'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}