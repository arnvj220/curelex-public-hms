// hms-react/src/pages/Dashboard.jsx
import React, { useEffect, useState, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useNavigate } from 'react-router-dom';
import API from '../utils/api';
import { useAuth } from '../context/AuthContext';
import TokenDashboard from '../components/TokenDashboard';
import inventoryService from '../services/inventoryService';
import heroAdmin from "../../assets/hero-admin.png";
import curelexLogo from "../../assets/logo.png";
import heroDoctor from "../../assets/hero-doctor.jpg";

const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/* ── Shared UI helpers ───────────────────────────────────────── */
function StatCard({ label, value, icon, color }) {
  return (
    <div className="stat-card">
      <div className="stat-icon" style={{ background: color }}>
        <span>{icon}</span>
      </div>
      <div>
        <div className="stat-label">{label}</div>
        <div className="stat-value">{value}</div>
      </div>
    </div>
  );
}

function statusBadge(s) {
  const map = {
    Scheduled: 'badge-info', Completed: 'badge-success',
    Cancelled: 'badge-danger', 'No-Show': 'badge-gray',
  };
  return <span className={`badge ${map[s] || 'badge-gray'}`}>{s}</span>;
}

// ── Simple inline toast (replaces alert/confirm) ──────────────────────────
function Toast({ message, type = 'info', onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);

  const bg = { info: '#dbeafe', success: '#dcfce7', error: '#fee2e2' }[type] || '#dbeafe';
  const color = { info: '#1e40af', success: '#166534', error: '#991b1b' }[type] || '#1e40af';

  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
      background: bg, color, padding: '12px 20px', borderRadius: 10,
      fontSize: 13, fontWeight: 600, boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
      display: 'flex', alignItems: 'center', gap: 10,
    }}>
      {message}
      <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color, fontWeight: 700 }}>✕</button>
    </div>
  );
}

function useToast() {
  const [toast, setToast] = useState(null);
  const show = useCallback((message, type = 'info') => setToast({ message, type }), []);
  const hide = useCallback(() => setToast(null), []);
  const element = toast ? <Toast message={toast.message} type={toast.type} onClose={hide} /> : null;
  return { show, element };
}

// ── Confirm dialog (replaces window.confirm) ─────────────────────────────
function ConfirmDialog({ message, onConfirm, onCancel }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
      zIndex: 9998, display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: '#fff', borderRadius: 12, padding: '28px 32px',
        maxWidth: 360, width: '90%', boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
      }}>
        <p style={{ fontSize: 14, color: '#1e293b', marginBottom: 20, lineHeight: 1.5 }}>{message}</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onCancel} style={{
            padding: '8px 18px', borderRadius: 6, border: '1px solid #d1d5db',
            background: '#fff', cursor: 'pointer', fontSize: 13,
          }}>Cancel</button>
          <button onClick={onConfirm} style={{
            padding: '8px 18px', borderRadius: 6, border: 'none',
            background: '#0f4c81', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600,
          }}>Confirm</button>
        </div>
      </div>
    </div>
  );
}

// ── Room Summary Component ────────────────────────────────────────────────
function RoomSummary({ clinicId }) {
  const navigate = useNavigate();
  const [roomConfigs, setRoomConfigs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get(`/room-settings?clinicId=${clinicId}`)
      .then(({ data }) => setRoomConfigs(data))
      .catch(err => console.error('Failed to fetch room stats', err))
      .finally(() => setLoading(false));
  }, [clinicId]);

  if (loading) return (
    <div className="card" style={{ marginTop: 20, textAlign: 'center', padding: 20, color: '#94a3b8' }}>
      Loading room stats...
    </div>
  );

  if (!roomConfigs.length) return null;

  const totalRooms = roomConfigs.reduce((s, r) => s + r.totalRooms, 0);
  const availableRooms = roomConfigs.reduce((s, r) => s + r.availableRooms, 0);
  const occupiedRooms = totalRooms - availableRooms;
  const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

  const thStyle = { padding: '10px 12px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#64748b' };
  const tdStyle = { padding: '10px 12px', fontSize: 13, borderBottom: '1px solid #f1f5f9' };

  return (
    <div className="card" style={{ marginTop: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <h3 style={{ fontSize: 15, margin: 0 }}>🏨 Hospital Room Summary</h3>
        <button
          onClick={() => navigate('/room-settings')}
          style={{ padding: '4px 12px', fontSize: 11, borderRadius: 20, border: '1px solid #0f4c81', background: 'transparent', color: '#0f4c81', cursor: 'pointer' }}
        >
          ⚙️ Manage Rooms
        </button>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              {['Room Type', 'Daily Rate', 'Available', 'Total', 'Occupancy'].map(h => (
                <th key={h} style={thStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {roomConfigs.map(config => {
              const pct = config.totalRooms > 0 ? (config.availableRooms / config.totalRooms) * 100 : 0;
              const isFull = config.availableRooms === 0;
              const isLow = config.availableRooms < config.totalRooms / 2;
              const icons = { 'General Ward': '🛏️', 'Semi-Private': '🛏️🛏️', 'Private Room': '⭐', 'ICU': '🚨' };
              return (
                <tr key={config.roomType}>
                  <td style={tdStyle}>
                    <strong>{config.roomType}</strong>
                    {icons[config.roomType] && <span style={{ fontSize: 10, color: '#94a3b8', marginLeft: 6 }}>{icons[config.roomType]}</span>}
                  </td>
                  <td style={tdStyle}>
                    <span style={{ fontWeight: 600, color: '#0f4c81' }}>₹{(config.dailyRate || 0).toLocaleString()}</span>
                    <span style={{ fontSize: 10, color: '#94a3b8' }}>/day</span>
                  </td>
                  <td style={tdStyle}>
                    <span style={{ fontWeight: 700, color: isFull ? '#dc2626' : '#16a34a', fontSize: 14 }}>{config.availableRooms}</span>
                    <span style={{ fontSize: 11, color: '#94a3b8' }}> / {config.totalRooms}</span>
                  </td>
                  <td style={tdStyle}>{config.totalRooms}</td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 80, height: 6, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: isFull ? '#ef4444' : isLow ? '#f59e0b' : '#10b981' }} />
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 600, color: isFull ? '#dc2626' : '#475569' }}>{Math.round(pct)}% free</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr style={{ background: '#f1f5f9', fontWeight: 700 }}>
              <td style={{ ...tdStyle, borderBottom: 'none' }}><strong>TOTAL</strong></td>
              <td style={{ ...tdStyle, borderBottom: 'none' }}>—</td>
              <td style={{ ...tdStyle, borderBottom: 'none' }}><strong style={{ color: '#16a34a', fontSize: 15 }}>{availableRooms}</strong></td>
              <td style={{ ...tdStyle, borderBottom: 'none' }}><strong>{totalRooms}</strong></td>
              <td style={{ ...tdStyle, borderBottom: 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 80, height: 6, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: `${totalRooms > 0 ? (occupiedRooms / totalRooms) * 100 : 0}%`, height: '100%', background: occupancyRate > 80 ? '#ef4444' : occupancyRate > 50 ? '#f59e0b' : '#10b981' }} />
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: occupancyRate > 80 ? '#dc2626' : '#475569' }}>{occupancyRate}% occupied</span>
                </div>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div style={{ marginTop: 14, padding: '10px 14px', background: '#f8fafc', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, fontSize: 12 }}>
        <div style={{ display: 'flex', gap: 16 }}>
          <div><span style={{ color: '#64748b' }}>🟢 Available:</span><strong style={{ color: '#16a34a', marginLeft: 6 }}>{availableRooms} rooms</strong></div>
          <div><span style={{ color: '#64748b' }}>🟠 Occupied:</span><strong style={{ color: '#f59e0b', marginLeft: 6 }}>{occupiedRooms} rooms</strong></div>
          <div><span style={{ color: '#64748b' }}>🏨 Total:</span><strong style={{ marginLeft: 6 }}>{totalRooms} rooms</strong></div>
        </div>
        <div style={{ fontSize: 11, color: '#94a3b8' }}>* Auto-updates on admit/discharge</div>
      </div>
    </div>
  );
}

// ── DoctorEmergencyAlerts ─────────────────────────────────────────────────
function DoctorEmergencyAlerts() {
  const { user, socket } = useAuth();  // ← use socket from AuthContext, not a new one
  const [alerts, setAlerts] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!socket || (user?.role !== 'doctor' && user?.role !== 'separate_doctor' && user?.role !== 'super_admin')) return;

    socket.emit('doctor:join', user._id || user.id);

    const handleAlert = (notification) => {
      setAlerts(prev => [notification, ...prev]);
      setUnreadCount(prev => prev + 1);

      // Browser notification (Web Notifications API — separate from mongoose Notification model)
      if (window.Notification?.permission === 'granted') {
        new window.Notification(notification.message, {
          body: `${notification.patientName} - ${notification.chiefComplaint}`,
          icon: '/emergency-icon.png',
        });
      } else if (window.Notification?.permission !== 'denied') {
        window.Notification?.requestPermission();
      }
    };

    socket.on('emergencyAssigned', handleAlert);
    return () => socket.off('emergencyAssigned', handleAlert);
  }, [socket, user]);

  if (!alerts.length) return null;

  return (
    <div className="card" style={{ marginBottom: 20, border: '2px solid #dc2626', background: '#fef2f2' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #fecaca', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 20 }}>🚨</span>
        <span style={{ fontWeight: 700, color: '#991b1b' }}>Emergency Alerts ({unreadCount} new)</span>
        {unreadCount > 0 && (
          <button onClick={() => setUnreadCount(0)} className="btn btn-sm btn-outline" style={{ fontSize: 11, marginLeft: 'auto' }}>
            Mark all read
          </button>
        )}
      </div>
      <div style={{ maxHeight: 300, overflowY: 'auto' }}>
        {alerts.map((alert, idx) => (
          <div key={idx} style={{ padding: '12px 16px', borderBottom: '1px solid #fecaca', background: idx < unreadCount ? '#fee2e2' : 'transparent' }}>
            <div style={{ fontWeight: 700 }}>
              {alert.patientName} · {alert.age}y
              <span style={{ marginLeft: 8, fontSize: 11, background: '#dc2626', color: '#fff', padding: '2px 8px', borderRadius: 20 }}>
                {alert.triageLevel}
              </span>
            </div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{alert.chiefComplaint}</div>
            <div style={{ fontSize: 11, color: '#991b1b', marginTop: 6 }}>
              ⏰ {new Date(alert.timestamp).toLocaleTimeString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── DoctorEarningsWidget ──────────────────────────────────────────────────
function DoctorEarningsWidget() {
  const { user, socket } = useAuth();
  const navigate = useNavigate();
  const [earnings, setEarnings] = useState({ total: 0, pending: 0, processing: 0, completed: 0 });
  const [loading, setLoading] = useState(true);

  const loadEarnings = useCallback(async () => {
    try {
      const doctorId = user?._id || user?.id;
      const url = user?.role === 'super_admin' ? '/telemedicine/pending-payouts' : `/telemedicine/earnings/${doctorId}`;
      const { data } = await API.get(url);
      if (user?.role === 'super_admin') {
        const total = data.totalAmount || 0;
        setEarnings({ total, pending: total, processing: 0, completed: 0 });
      } else if (data.success) {
        setEarnings({
          total: data.earnings.total || 0,
          pending: data.earnings.pending || 0,
          processing: data.earnings.processing || 0,
          completed: data.earnings.completed || 0,
        });
      }
    } catch (err) {
      console.error('Failed to load earnings:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user?.role !== 'doctor' && user?.role !== 'separate_doctor' && user?.role !== 'super_admin') return;
    loadEarnings();

    if (!socket) return;
    socket.on('telemedicine:payout-approved', loadEarnings);
    return () => socket.off('telemedicine:payout-approved', loadEarnings);
  }, [user, socket, loadEarnings]);

  if (loading) return (
    <div className="card" style={{ marginTop: 20, textAlign: 'center', padding: 20, color: '#94a3b8' }}>
      Loading earnings...
    </div>
  );

  return (
    <div className="card" style={{ marginTop: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <h3 style={{ fontSize: 15, margin: 0 }}>💰 Telemedicine Earnings</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => navigate('/dashboard/doctor-earnings')} className="btn btn-sm btn-primary" style={{ padding: '4px 12px', fontSize: 12, borderRadius: 6, border: 'none', background: '#0f4c81', color: '#fff', cursor: 'pointer' }}>
            View Details →
          </button>
          <button onClick={() => navigate('/dashboard/doctor-bank-details')} className="btn btn-sm btn-outline" style={{ padding: '4px 12px', fontSize: 12, borderRadius: 6, border: '1px solid #0f4c81', background: 'transparent', color: '#0f4c81', cursor: 'pointer' }}>
            Bank Details
          </button>
        </div>
      </div>

      <div className="grid-4-col">
        {[
          { label: 'Total Earned', value: earnings.total, bg: '#f0fdf4', color: '#16a34a' },
          { label: 'Pending Payout', value: earnings.pending, bg: '#fef3c7', color: '#f59e0b' },
          { label: 'Processing', value: earnings.processing, bg: '#dbeafe', color: '#3b82f6' },
          { label: 'Completed Payout', value: earnings.completed, bg: '#dcfce7', color: '#10b981' },
        ].map(({ label, value, bg, color }) => (
          <div key={label} className="stat-card" style={{ background: bg, padding: 12, borderRadius: 8 }}>
            <div style={{ fontSize: 12, color: '#64748b' }}>{label}</div>
            <div style={{ fontSize: 24, fontWeight: 700, color }}>₹{value}</div>
          </div>
        ))}
      </div>

      {earnings.pending > 0 && (
        <div style={{ marginTop: 12, padding: '10px 14px', background: '#fef3c7', borderRadius: 8, fontSize: 13, color: '#92400e', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span>💡</span> You have <strong>₹{earnings.pending}</strong> pending.
          <button onClick={() => navigate('/dashboard/doctor-earnings')} style={{ marginLeft: 'auto', padding: '4px 12px', background: '#f59e0b', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
            Request Payout
          </button>
        </div>
      )}
      {earnings.pending === 0 && earnings.completed > 0 && (
        <div style={{ marginTop: 12, padding: '10px 14px', background: '#f0fdf4', borderRadius: 8, fontSize: 13, color: '#166534', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>✅</span> All payouts complete. Total received: <strong>₹{earnings.completed}</strong>
        </div>
      )}
    </div>
  );
}

// ── DoctorTelemedicineQuickStats ──────────────────────────────────────────
function DoctorTelemedicineQuickStats() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ total: 0, pending: 0, ongoing: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role !== 'doctor' && user?.role !== 'separate_doctor' && user?.role !== 'super_admin') { setLoading(false); return; }
    API.get('/telemedicine/stats')
      .then(({ data }) => {
        if (data.success) setStats({ total: data.stats.total || 0, pending: data.stats.requested || 0, ongoing: data.stats.ongoing || 0 });
      })
      .catch(err => console.error('Failed to load telemedicine stats:', err))
      .finally(() => setLoading(false));
  }, [user]);

  if (loading || (user?.role !== 'doctor' && user?.role !== 'separate_doctor' && user?.role !== 'super_admin')) return null;

  return (
    <div style={{ marginTop: 16 }}>
      <h3 style={{ fontSize: 15, marginBottom: 12 }}>🩺 Your Telemedicine Practice</h3>
      <div className="stat-grid">
        <StatCard label="Total Consultations" value={stats.total} icon="🩺" color="#dbeafe" />
        <StatCard label="Pending Requests" value={stats.pending} icon="⏳" color="#fef3c7" />
        <StatCard label="Ongoing" value={stats.ongoing} icon="🔄" color="#d1fae5" />
      </div>
    </div>
  );
}

// ── AdminPayoutManagement ─────────────────────────────────────────────────
function AdminPayoutManagement() {
  const { user, socket } = useAuth();
  const navigate = useNavigate();
  const { show: showToast, element: toastEl } = useToast();

  const [pendingPayouts, setPendingPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [totalAmount, setTotalAmount] = useState(0);
  const [confirm, setConfirm] = useState(null); // { message, onConfirm }

  // ── All hooks must be called before any conditional return ────────────────
  const loadPendingPayouts = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await API.get('/telemedicine/pending-payouts');
      if (data.success) {
        setPendingPayouts(data.pendingPayouts || []);
        setTotalAmount(data.totalAmount || 0);
      }
    } catch (err) {
      console.error('Failed to load pending payouts:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role !== 'admin' && user?.role !== 'super_admin') return;
    loadPendingPayouts();
    if (!socket) return;
    socket.on('telemedicine:payout-requested', loadPendingPayouts);
    return () => socket.off('telemedicine:payout-requested', loadPendingPayouts);
  }, [user, socket, loadPendingPayouts]);

  // ── Conditional render after all hooks ───────────────────────────────────
  if (user?.role !== 'admin' && user?.role !== 'super_admin') return null;

  const handleApprovePayout = (id) => {
    setConfirm({
      message: 'Approve this payout request? This will mark it as completed.',
      onConfirm: async () => {
        setConfirm(null);
        setProcessing(true);
        try {
          const { data } = await API.patch(`/telemedicine/${id}/approve-payout`, {
            payoutId: `PAY-${Date.now()}`,
            payoutMethod: 'bank_transfer',
            notes: 'Payout approved by admin',
          });
          if (data.success) {
            showToast('Payout approved successfully', 'success');
            loadPendingPayouts();
          }
        } catch (err) {
          showToast(err.response?.data?.message || 'Failed to approve payout', 'error');
        } finally {
          setProcessing(false);
        }
      },
    });
  };

  const handleApproveAll = () => {
    setConfirm({
      message: `Approve all ${pendingPayouts.length} pending payout requests?`,
      onConfirm: () => {
        setConfirm(null);
        pendingPayouts.forEach(req => handleApprovePayout(req._id));
      },
    });
  };

  if (loading) return (
    <div className="card" style={{ marginTop: 20, textAlign: 'center', padding: 20, color: '#94a3b8' }}>
      Loading payout requests...
    </div>
  );

  if (!pendingPayouts.length) return null;

  return (
    <>
      {toastEl}
      {confirm && <ConfirmDialog message={confirm.message} onConfirm={confirm.onConfirm} onCancel={() => setConfirm(null)} />}

      <div className="card" style={{ marginTop: 20, border: '2px solid #f59e0b' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 24 }}>💰</span>
            <div>
              <h3 style={{ fontSize: 15, margin: 0, color: '#92400e' }}>Pending Payout Requests</h3>
              <p style={{ fontSize: 12, margin: '2px 0 0', color: '#64748b' }}>{pendingPayouts.length} requests · Total: ₹{totalAmount}</p>
            </div>
          </div>
          <button onClick={loadPendingPayouts} className="btn btn-sm btn-outline" style={{ fontSize: 11 }} disabled={loading}>
            🔄 Refresh
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e5e7eb' }}>
                {['Doctor', 'Patient', 'Amount', 'Bank Details', 'Requested', 'Action'].map(h => (
                  <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: '#64748b' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pendingPayouts.map((req) => (
                <tr key={req._id} style={{ borderBottom: '1px solid #f1f3f6' }}>
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ fontWeight: 600 }}>Dr. {req.doctorId?.name}</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>{req.doctorId?.email}</div>
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <div>{req.patientName}</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>{req.patientEmail}</div>
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{ fontWeight: 700, color: '#0f4c81', fontSize: 15 }}>₹{req.doctorPayoutAmount}</span>
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: 12 }}>
                    {req.doctorId?.bankDetails ? (
                      <div>
                        <div>{req.doctorId.bankDetails.accountHolderName}</div>
                        <div style={{ color: '#64748b' }}>{req.doctorId.bankDetails.accountNumber} · {req.doctorId.bankDetails.bankName}</div>
                        <div style={{ color: '#64748b', fontSize: 11 }}>IFSC: {req.doctorId.bankDetails.ifscCode}</div>
                      </div>
                    ) : (
                      <span style={{ color: '#ef4444', fontSize: 11 }}>⚠️ No bank details</span>
                    )}
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: 12, color: '#64748b' }}>
                    {new Date(req.createdAt).toLocaleDateString()}
                    <br /><span style={{ fontSize: 10 }}>{new Date(req.createdAt).toLocaleTimeString()}</span>
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <button
                      onClick={() => handleApprovePayout(req._id)}
                      disabled={processing}
                      style={{ padding: '4px 14px', background: processing ? '#94a3b8' : '#10b981', color: '#fff', border: 'none', borderRadius: 4, cursor: processing ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 600 }}
                    >
                      {processing ? 'Processing…' : '✅ Approve'}
                    </button>
                    <button
                      onClick={() => navigate(`/dashboard/doctor-bank-details?doctorId=${req.doctorId?._id}`)}
                      style={{ marginLeft: 6, padding: '4px 8px', background: 'transparent', color: '#3b82f6', border: '1px solid #3b82f6', borderRadius: 4, cursor: 'pointer', fontSize: 11 }}
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: 12, padding: '10px 14px', background: '#fef3c7', borderRadius: 8, fontSize: 12, color: '#92400e', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <span>💡 Total pending: <strong>₹{totalAmount}</strong> for {pendingPayouts.length} consultation(s)</span>
          <button onClick={handleApproveAll} style={{ padding: '4px 14px', background: '#f59e0b', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
            Approve All
          </button>
        </div>
      </div>
    </>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────
export default function Dashboard() {
  const { user, hasPerm, getEffectiveClinicId, superAdminClinicId, superAdminClinicName, clinicType } = useAuth();
  const navigate = useNavigate();

  const isClinicUser = clinicType === 'clinic';
  const isHospitalUser = clinicType === 'hospital';

  const isDoctor = user?.role?.toLowerCase() === 'doctor' || user?.role?.toLowerCase() === 'separate_doctor';
  const isAdmin = user?.role?.toLowerCase() === 'admin';
  const isSuperAdmin = user?.role?.toLowerCase() === 'super_admin';
  const showDoctorWidgets = isDoctor || isSuperAdmin;
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  const clinicId = getEffectiveClinicId() || 'default';

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState({
    lowStock: [], outOfStock: [], dueMaintenance: [], overdueMaintenance: [],
  });
  console.log(user.role, isClinicUser);

  useEffect(() => {
    // If user is a clinic admin, redirect to clinic dashboard
    if (user?.role === 'admin' && isClinicUser) {
      navigate('/clinic-dashboard', { replace: true });
      return;
    }

    // If user is a hospital admin, they can stay on dashboard
    if (user?.role === 'admin' && isHospitalUser) {
      // Hospital admins can use the main dashboard
      return;
    }
  }, [user, clinicType, navigate]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    API.get(`/dashboard/stats?clinicId=${clinicId}`)
      .then(r => { setStats(r.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [clinicId]);

  useEffect(() => {
    if (!hasPerm('inventory') && !hasPerm('pharmacy')) return;
    const fetchNotifications = async () => {
      try {
        const [lowStock, outOfStock, dueMaintenance, overdueMaintenance] = await Promise.all([
          inventoryService.getLowStock(clinicId).catch(() => ({ data: [] })),
          inventoryService.getOutOfStock(clinicId).catch(() => ({ data: [] })),
          inventoryService.getDueMaintenance(clinicId).catch(() => ({ data: [] })),
          inventoryService.getOverdueMaintenance(clinicId).catch(() => ({ data: [] })),
        ]);
        setNotifications({
          lowStock: lowStock.data || [],
          outOfStock: outOfStock.data || [],
          dueMaintenance: dueMaintenance.data || [],
          overdueMaintenance: overdueMaintenance.data || [],
        });
      } catch (err) {
        console.error('Failed to fetch notifications:', err);
      }
    };
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [hasPerm, clinicId]);

  if (loading) return <div className="spinner" />;

  const permList = user?.permissions || [];
  const subtitle = isSuperAdmin
    ? 'Super Admin — full system access across all clinics.'
    : user?.role === 'pharmacist'
      ? 'Manage pharmacy inventory and monitor stock alerts.'
      : isAdmin
        ? 'Full system overview — complete access.'
        : permList.length <= 1
          ? 'Welcome! Contact admin to grant you module access.'
          : `Access: ${permList.filter(p => p !== 'dashboard').join(', ')}.`;

  const chartData = stats?.monthlyRevenue?.map(m => ({
    name: monthNames[m._id.month - 1],
    revenue: m.total,
  })) || [];

  const showTokenQueue = hasPerm('patients') && user?.role !== 'separate_doctor';
  const showInventoryAlerts = hasPerm('inventory') || hasPerm('pharmacy');
  const showRoomSummary = hasPerm('ipd') || hasPerm('admin');

  const totalAlerts =
    notifications.lowStock.length + notifications.outOfStock.length +
    notifications.dueMaintenance.length + notifications.overdueMaintenance.length;

  return (
    <div>
      {/* Super admin clinic context banner */}
      {isSuperAdmin && (
        <div style={{ background: superAdminClinicId ? '#0f2942' : '#fee2e2', color: superAdminClinicId ? '#fff' : '#991b1b', borderRadius: 10, padding: '10px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, fontSize: 13 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18 }}>⚡</span>
            {superAdminClinicId ? (
              <span><strong>Super Admin</strong> — viewing: <strong style={{ color: '#38bdf8' }}>{superAdminClinicName || superAdminClinicId}</strong></span>
            ) : (
              <span><strong>No clinic selected.</strong> Go to the Super Admin console to pick a clinic.</span>
            )}
          </div>
          <button onClick={() => navigate('/super-admin')} style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700, border: '1px solid rgba(255,255,255,0.3)', cursor: 'pointer' }}>
            ← Switch Clinic
          </button>
        </div>
      )}

      {showDoctorWidgets && user?.role !== 'separate_doctor' && <DoctorEmergencyAlerts />}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background:
            isDoctor
              ? "linear-gradient(135deg,#f4fffb,#dcfce7)"
              : "linear-gradient(135deg,#f8f5ff,#ede9fe)",
          borderRadius: "28px",
          padding: isMobile ? "28px 22px" : "48px",
          marginBottom: "28px",
          overflow: "visible",
          position: "relative",
          border:
            isDoctor
              ? "1px solid rgba(16,185,129,.18)"
              : "1px solid rgba(124,58,237,.12)",
        }}
      >

        <div
          style={{
            position: "absolute",
            top: isMobile ? "18px" : "24px",
            right: isMobile ? "18px" : "32px",
            zIndex: 10,
            background: "rgba(255,255,255,0.94)",
            backdropFilter: "blur(18px)",
            WebkitBackdropFilter: "blur(18px)",
            padding: isMobile ? "8px 14px" : "12px 20px",
            borderRadius: isMobile ? "16px" : "20px",
            border: "1px solid rgba(255,255,255,.55)",
            boxShadow: "0 20px 60px rgba(124,58,237,.12)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <img
            src={curelexLogo}
            alt="Curelex"
            style={{
              width: isMobile ? "95px" : "130px",
              display: "block",
            }}
          />
        </div>


        <div
          style={{
            flex: 1,
            minWidth: "260px",
            paddingTop: isMobile ? "75px" : 0,
          }}
        >

          <h1
            style={{
              margin: 0,
              fontSize: isMobile ? "28px" : "44px",
              fontWeight: 800,
              lineHeight: 1.08,
              color: "#111827",
            }}
          >
            {isDoctor ? (
              <>
                Good Morning,
                <br />
                <span style={{ color: "#059669" }}>
                  Dr. {user?.name?.split(" ")[0]}
                </span>
              </>
            ) : (
              <>
                Welcome Back,
                <br />
                <span style={{ color: "#7c3aed" }}>
                  {user?.role === "super_admin"
                    ? "Super Admin"
                    : "Admin"}
                </span>
              </>
            )}
          </h1>

          <p
            style={{
              marginTop: "20px",
              fontSize: isMobile ? "15px" : "18px",
              color: "#4b5563",
              maxWidth: "420px",
              lineHeight: 1.7,
            }}
          >
            {isDoctor
              ? "Caring for patients, one consultation at a time."
              : "Manage your hospital with confidence and keep every department running smoothly."}
          </p>

          <button
            onClick={() => {
              document
                .getElementById("analytics-section")
                ?.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                });
            }}
            style={{
              marginTop: "26px",
              background: isDoctor ? "#059669" : "#7c3aed",
              color: "#fff",
              border: "none",
              padding: isMobile ? "12px 20px" : "14px 24px",
              fontSize: isMobile ? "14px" : "15px",
              borderRadius: "12px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {isDoctor
              ? "📅 View Today's Appointments"
              : "📊 Go to Analytics"}
          </button>
        </div>

        {!isMobile && (
          <div
            style={{
              flex: 1,
              position: "relative",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            {/* Purple glow */}
            <div
              style={{
                position: "absolute",
                width: "420px",
                height: "420px",
                borderRadius: "50%",
                background: isDoctor
                  ? "radial-gradient(circle, rgba(16,185,129,.14), transparent 70%)"
                  : "radial-gradient(circle, rgba(124,58,237,.14), transparent 70%)",
                filter: "blur(10px)",
                zIndex: 0,
              }}
            />


            {/* Hero Illustration */}



            <div
              style={{
                position: "absolute",
                top: "45px",
                right: "65px",
                width: "180px",
                height: "180px",
                background: isDoctor
                  ? "radial-gradient(circle, rgba(16,185,129,.10), transparent 70%)"
                  : "radial-gradient(circle, rgba(124,58,237,.10), transparent 70%)",
                filter: "blur(20px)",
                zIndex: 1,
                pointerEvents: "none",
              }}
            />

            {isDoctor ? (
              <div
                style={{
                  width: "610px",
                  height: "430px",
                  overflow: "hidden",
                  position: "relative",
                  borderTopLeftRadius: "220px",
                  borderBottomLeftRadius: "220px",
                  borderTopRightRadius: "220px",
                  borderBottomRightRadius: "220px",
                  background: "linear-gradient(135deg,#eefcf7,#dff8ee)",
                }}
              >
                <img
                  src={heroDoctor}
                  alt="Doctor"
                  style={{
                    position: "absolute",

                    width: "138%",
                    height: "138%",

                    left: "-20%",
                    top: "-15%",

                    objectFit: "cover",
                  }}
                />
              </div>
            ) : (
              <img
                src={heroAdmin}
                alt="Admin"
                style={{
                  width: "112%",
                  maxWidth: "720px",
                  objectFit: "contain",
                  filter: "drop-shadow(0 30px 70px rgba(124,58,237,.18))",
                }}
              />
            )}
          </div>
        )}
      </div>

      {/* Stat cards */}
      <div className="stat-grid">
        {hasPerm('patients') && user?.role !== 'separate_doctor' && (
          <>
            <StatCard label="Total Patients" value={stats?.totalPatients || 0} icon="👤" color="#dbeafe" />
            <StatCard label="Active Patients" value={stats?.activePatients || 0} icon="🟢" color="#d1fae5" />
          </>
        )}
        {hasPerm('billing') && (
          <>
            <StatCard label="Total Revenue" value={`₹${(stats?.totalRevenue || 0).toLocaleString()}`} icon="💰" color="#d1fae5" />
            <StatCard label="Pending Bills" value={stats?.pendingBills || 0} icon="📋" color="#fee2e2" />
          </>
        )}
        {showInventoryAlerts && (
          <>
            <StatCard label="Low Stock Items" value={notifications.lowStock.length} icon="⚠️" color="#fef3c7" />
            <StatCard label="Out of Stock" value={notifications.outOfStock.length} icon="❌" color="#fee2e2" />
          </>
        )}
      </div>

      {showDoctorWidgets && (
        <>
          <DoctorTelemedicineQuickStats />
          <DoctorEarningsWidget />
        </>
      )}

      {/* Pharmacist section */}
      {user?.role === 'pharmacist' && stats && (
        <div>
          <div className="card" style={{ marginBottom: 20 }}>
            <h3 style={{ marginBottom: 16 }}>📊 Today's Overview</h3>
            <div className="grid-4-col">
              {[
                { label: 'Total Medicines', value: stats.totalMeds || 0, color: '#0f4c81' },
                { label: 'Low Stock', value: stats.lowStockItems || 0, color: '#f59e0b' },
                { label: 'Out of Stock', value: stats.outOfStock || 0, color: '#ef4444' },
                { label: 'Pending Orders', value: stats.pendingOrders || 0, color: '#0f4c81' },
              ].map(({ label, value, color }) => (
                <div key={label} className="stat-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                  <span style={{ fontSize: 16, fontWeight: 600 }}>{label}</span>
                  <span style={{ fontSize: 28, fontWeight: 700, color }}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card" style={{ marginBottom: 20 }}>
            <h3 style={{ marginBottom: 16 }}>🕒 Recent Inventory Activity</h3>
            {stats?.lowStockMeds?.filter(i => i.category === 'Medicine').slice(0, 5).map(item => (
              <div key={item._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #e5e7eb' }}>
                <div>
                  <strong>💊 {item.name}</strong>
                  <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>📦 {item.quantity} units</div>
                  <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>🕒 {new Date(item.updatedAt).toLocaleDateString()}</div>
                </div>
                <span style={{ padding: '6px 12px', borderRadius: 999, fontSize: 13, fontWeight: 600, background: item.stockStatus === 'Out of Stock' ? '#fee2e2' : item.stockStatus === 'Low Stock' ? '#fef3c7' : '#dcfce7', color: item.stockStatus === 'Out of Stock' ? '#dc2626' : item.stockStatus === 'Low Stock' ? '#d97706' : '#16a34a' }}>
                  {item.stockStatus}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {(isSuperAdmin) && <AdminPayoutManagement />}
      {showRoomSummary && <RoomSummary clinicId={clinicId} />}

      {/* Overdue maintenance */}
      {showInventoryAlerts && notifications.overdueMaintenance.length > 0 && (
        <div className="card" style={{ marginBottom: 20, background: '#fef2f2', border: '2px solid #ef4444' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <span style={{ fontSize: 28 }}>🚨</span>
            <div>
              <h3 style={{ fontSize: 16, margin: 0, color: '#dc2626' }}>Critical: Overdue Maintenance!</h3>
              <p style={{ fontSize: 13, margin: '4px 0 0', color: '#991b1b' }}>{notifications.overdueMaintenance.length} item(s) past maintenance due date</p>
            </div>
          </div>
          {notifications.overdueMaintenance.slice(0, 5).map(item => (
            <div key={item._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #fecaca' }}>
              <div>
                <div style={{ fontWeight: 700 }}>{item.name}</div>
                <div className="text-muted text-small">Serial: {item.equipmentDetails?.serialNumber || 'N/A'} · Due: {item.equipmentDetails?.nextMaintenanceDate ? new Date(item.equipmentDetails.nextMaintenanceDate).toLocaleDateString() : 'N/A'}</div>
              </div>
              <button className="btn btn-sm btn-danger" onClick={() => navigate('/equipment')}>View Equipment</button>
            </div>
          ))}
          {notifications.overdueMaintenance.length > 5 && (
            <div style={{ marginTop: 8, textAlign: 'center' }}><span className="text-muted text-small">+{notifications.overdueMaintenance.length - 5} more</span></div>
          )}
        </div>
      )}

      {/* Due maintenance */}
      {showInventoryAlerts && notifications.dueMaintenance.length > 0 && notifications.overdueMaintenance.length === 0 && (
        <div className="card" style={{ marginBottom: 20, background: '#fffbeb', border: '1px solid #fcd34d' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <span style={{ fontSize: 24 }}>⚠️</span>
            <div>
              <h3 style={{ fontSize: 15, margin: 0, color: '#b45309' }}>Maintenance Due Soon</h3>
              <p style={{ fontSize: 12, margin: '2px 0 0', color: '#92400e' }}>{notifications.dueMaintenance.length} item(s) within 7 days</p>
            </div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {notifications.dueMaintenance.slice(0, 5).map(item => (
              <span key={item._id} className="badge badge-warning" style={{ cursor: 'pointer' }} onClick={() => navigate('/equipment')}>
                {item.name} - Due {item.equipmentDetails?.nextMaintenanceDate ? new Date(item.equipmentDetails.nextMaintenanceDate).toLocaleDateString() : 'N/A'}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Stock alerts */}
      {showInventoryAlerts && (notifications.lowStock.length > 0 || notifications.outOfStock.length > 0) && (
        <div className="card" style={{ marginBottom: 20, background: '#fefce8', border: '1px solid #fde047' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <span style={{ fontSize: 24 }}>📦</span>
            <div>
              <h3 style={{ fontSize: 15, margin: 0, color: '#854d0e' }}>Stock Alert</h3>
              <p style={{ fontSize: 12, margin: '2px 0 0', color: '#713f12' }}>{notifications.outOfStock.length} out of stock · {notifications.lowStock.length} low stock</p>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {notifications.outOfStock.slice(0, 3).map(item => (
              <div key={item._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', background: '#fee2e2', borderRadius: 6 }}>
                <span><strong>{item.name}</strong> <span className="badge badge-danger">Out of Stock</span></span>
                <button className="btn btn-sm btn-primary" onClick={() => navigate('/inventory?tab=stock')}>Restock</button>
              </div>
            ))}
            {notifications.lowStock.slice(0, 5).map(item => (
              <div key={item._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', background: '#fef3c7', borderRadius: 6 }}>
                <span><strong>{item.name}</strong> — {item.quantity} {item.unit} left (reorder at {item.reorderLevel})</span>
                <button className="btn btn-sm btn-outline" onClick={() => navigate('/inventory?tab=stock')}>Add Stock</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Chart */}
      {hasPerm('billing') && (
        <div
          id="analytics-section"
          className="grid-2-col"
        >
          <div className="card">
            <h3 style={{ marginBottom: 16, fontSize: 15 }}>Monthly Revenue (Last 6 Months)</h3>
            <div className="chart-container" style={{ width: '100%', height: 250 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={v => `₹${v.toLocaleString()}`} />
                  <Bar dataKey="revenue" fill="#0f4c81" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {showTokenQueue && <TokenDashboard clinicId={clinicId} />}

      {permList.filter(p => p !== 'dashboard').length === 0 && (
        <div className="card" style={{ marginTop: 24, textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>
          <h3 style={{ marginBottom: 8 }}>No modules assigned yet</h3>
          <p className="text-muted text-small">Ask your admin to grant you access to the modules you need.</p>
        </div>
      )}
    </div>
  );
}