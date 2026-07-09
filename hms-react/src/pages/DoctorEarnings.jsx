// hms-react/src/pages/DoctorEarnings.jsx

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import API from '../utils/api';

export default function DoctorEarnings() {
  const { user, isConnected, emit, on, off } = useAuth();
  const [earnings, setEarnings] = useState(null);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [pendingPayouts, setPendingPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [requestingPayout, setRequestingPayout] = useState(false);

  const doctorId = user?._id || user?.id;

  useEffect(() => {
    loadEarnings();

    // Listen for payout updates
    const handlePayoutApproved = (data) => {
      alert(`✅ Payout approved: ₹${data.amount}`);
      loadEarnings();
    };

    on('telemedicine:payout-approved', handlePayoutApproved);

    return () => {
      off('telemedicine:payout-approved', handlePayoutApproved);
    };
  }, [doctorId]);

  const loadEarnings = async () => {
    setLoading(true);
    try {
      const { data } = await API.get(`/telemedicine/earnings/${doctorId}`);
      if (data.success) {
        setEarnings(data.earnings);
        setRecentTransactions(data.recentTransactions || []);
        if (data.pendingPayouts) {
          setPendingPayouts(data.pendingPayouts);
        }
      }
    } catch (err) {
      console.error('Failed to load earnings:', err);
    }
    setLoading(false);
  };

  const handleRequestPayout = async (requestId) => {
    if (!confirm('Request payout for this consultation?')) return;
    
    setRequestingPayout(true);
    try {
      const { data } = await API.post(`/telemedicine/${requestId}/request-payout`);
      if (data.success) {
        alert('✅ Payout request submitted successfully!');
        loadEarnings();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to request payout');
    }
    setRequestingPayout(false);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <i className="fas fa-spinner fa-spin" style={{ fontSize: 48, color: '#2d6be4' }}></i>
          <p style={{ marginTop: '1rem', color: '#6b7a99' }}>Loading earnings...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#1a2236', margin: 0 }}>
          💰 My Earnings
        </h1>
        <p style={{ color: '#6b7a99', marginTop: 4 }}>Track your telemedicine earnings and payouts</p>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Total Earned', value: `₹${earnings?.total || 0}`, color: '#0f4c81' },
          { label: 'Pending Payout', value: `₹${earnings?.pending || 0}`, color: '#f59e0b' },
          { label: 'Processing', value: `₹${earnings?.processing || 0}`, color: '#3b82f6' },
          { label: 'Completed', value: `₹${earnings?.completed || 0}`, color: '#10b981' },
        ].map(s => (
          <div key={s.label} style={{
            background: 'white',
            borderRadius: 12,
            padding: '16px 20px',
            border: '1px solid #e5e7eb',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
          }}>
            <div style={{ fontSize: 13, color: '#6b7a99' }}>{s.label}</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Connection Status */}
      <div style={{ marginBottom: 16, padding: '8px 12px', background: '#f8fafc', borderRadius: 8 }}>
        <span style={{ fontSize: 13, color: '#64748b' }}>
          {isConnected ? '🔗 Connected to server' : '⚠️ Disconnected'}
        </span>
      </div>

      {/* Pending Payouts */}
      {pendingPayouts.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: '#1a2236', marginBottom: 12 }}>
            Pending Payout Requests
          </h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white', borderRadius: 12, overflow: 'hidden' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, color: '#6b7a99' }}>Patient</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, color: '#6b7a99' }}>Amount</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, color: '#6b7a99' }}>Status</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, color: '#6b7a99' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {pendingPayouts.map(p => (
                  <tr key={p._id} style={{ borderBottom: '1px solid #f1f3f6' }}>
                    <td style={{ padding: '12px 16px', fontSize: 14 }}>{p.patientName}</td>
                    <td style={{ padding: '12px 16px', fontSize: 14, fontWeight: 600 }}>₹{p.doctorPayoutAmount}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        padding: '2px 10px',
                        borderRadius: 20,
                        fontSize: 12,
                        fontWeight: 600,
                        background: '#fef3c7',
                        color: '#92400e'
                      }}>
                        {p.doctorPayoutStatus}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={() => handleRequestPayout(p._id)}
                        disabled={requestingPayout}
                      >
                        {requestingPayout ? 'Processing...' : 'Request Payout'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent Transactions */}
      <div>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: '#1a2236', marginBottom: 12 }}>
          Recent Transactions
        </h2>
        {recentTransactions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8', background: 'white', borderRadius: 12 }}>
            No transactions yet
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white', borderRadius: 12, overflow: 'hidden' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, color: '#6b7a99' }}>Patient</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, color: '#6b7a99' }}>Amount</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, color: '#6b7a99' }}>Payment</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, color: '#6b7a99' }}>Payout</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, color: '#6b7a99' }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {recentTransactions.map(t => (
                  <tr key={t._id} style={{ borderBottom: '1px solid #f1f3f6' }}>
                    <td style={{ padding: '12px 16px', fontSize: 14 }}>{t.patientId?.name || 'Unknown'}</td>
                    <td style={{ padding: '12px 16px', fontSize: 14, fontWeight: 600 }}>₹{t.amount}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        padding: '2px 10px',
                        borderRadius: 20,
                        fontSize: 12,
                        fontWeight: 600,
                        background: t.paymentStatus === 'paid' ? '#dcfce7' : '#fef3c7',
                        color: t.paymentStatus === 'paid' ? '#166534' : '#92400e'
                      }}>
                        {t.paymentStatus}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        padding: '2px 10px',
                        borderRadius: 20,
                        fontSize: 12,
                        fontWeight: 600,
                        background: t.payoutStatus === 'completed' ? '#dcfce7' :
                                   t.payoutStatus === 'processing' ? '#dbeafe' : '#fef3c7',
                        color: t.payoutStatus === 'completed' ? '#166534' :
                               t.payoutStatus === 'processing' ? '#1e40af' : '#92400e'
                      }}>
                        {t.payoutStatus}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: '#64748b' }}>
                      {new Date(t.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}