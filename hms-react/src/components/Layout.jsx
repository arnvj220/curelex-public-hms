// hms-react/src/components/Layout.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../utils/api';
import taskService from '../services/taskService';
import { useSocket } from '../hooks/useSocket';

// ── Nav definition ─────────────────────────────────────────────
const NAV_SECTIONS = [
  {
    section: 'MAIN',
    items: [
      { path: '/dashboard', label: 'Dashboard', icon: '⊞', perm: 'dashboard', end: true },
      { path: '/dashboard/patients', label: 'Patients', icon: '👤', perm: 'patients' },
    ],
  },
  {
    section: 'SERVICES',
    items: [
      { path: '/dashboard/ipd', label: 'IPD / Admitted', icon: '🏥', perm: 'ipd' },
      { path: '/dashboard/billing', label: 'Billing', icon: '💳', perm: 'billing' },
      { path: '/dashboard/billing-requests', label: 'Lab Bills', icon: '🧾', perm: 'billing' },
      { path: '/dashboard/lab', label: 'Lab Tests', icon: '🧪', perm: 'lab' },
      { path: '/dashboard/tokens', label: 'Token Queue', icon: '🎫', perm: 'patients' },
      { path: '/dashboard/emergency', label: 'Emergency Dept', icon: '🚨', perm: 'patients' },
      { path: '/dashboard/prescriptions', label: 'Prescriptions', icon: '📋', perm: 'prescriptions' },
      { path: '/dashboard/telemedicine', label: 'Telemedicine', icon: '📹', perm: 'telemedicine' },
    ],
  },
  {
    section: 'MANAGEMENT',
    items: [
      { path: '/dashboard/inventory', label: 'Inventory', icon: '📦', perm: 'inventory' },
      { path: '/dashboard/staff', label: 'Staff Mgmt', icon: '👥', perm: 'staff' },
      { path: '/dashboard/tasks', label: 'Task Allocation', icon: '📋', perm: 'dashboard' },
      { path: '/dashboard/room-settings', label: 'Room Settings', icon: '🏨', perm: 'room-settings' }
    ],
  },
];

// ── SUPER ADMIN SECTION ──
const SUPER_ADMIN_SECTIONS = [
  {
    section: 'SUPER ADMIN',
    items: [
      { path: '/super-admin', label: 'Super Admin Console', icon: '⚡', perm: 'super', end: true },
    ],
  },
];

// ── IMS SECTION ──
const IMS_SECTIONS = [
  {
    section: 'IMS SECTION',
    items: [
      {
        label: 'Pharmacy',
        icon: '💊',
        perm: 'pharmacy',
        subItems: [
          { path: '/dashboard/pharmacy/dashboard', label: 'Dashboard', icon: '📊' },
          { path: '/dashboard/pharmacy/products', label: 'Products', icon: '📦' },
          { path: '/dashboard/pharmacy/inventory', label: 'Inventory', icon: '🗃️' },
          { path: '/dashboard/pharmacy/sales', label: 'Sales', icon: '💰' },
          { path: '/dashboard/pharmacy/purchases', label: 'Purchases', icon: '🛒' },
          { path: '/dashboard/pharmacy/customers', label: 'Customers', icon: '👥' },
          { path: '/dashboard/pharmacy/suppliers', label: 'Suppliers', icon: '🏭' },
          { path: '/dashboard/pharmacy/reports', label: 'Reports', icon: '📈' },
          { path: '/dashboard/pharmacy/all-patients', label: 'All Patients', icon: '🩺' },
        ]
      },
    ],
  },
];

// ── DOCTOR SECTION - Only shown to doctors ──
const DOCTOR_SECTIONS = [
  {
    section: 'DOCTOR',
    items: [
      { path: '/dashboard/doctor-earnings', label: 'Earnings', icon: '💰', perm: 'dashboard' },
      { path: '/dashboard/doctor-bank-details', label: 'Bank Details', icon: '🏦', perm: 'dashboard' },
    ],
  },
];

// ── Role badge config ──────────────────────────────────────────
const ROLE_META = {
  super_admin: { label: 'Super Admin', color: '#c084fc', bg: 'rgba(192,132,252,0.15)' },
  admin: { label: 'Administrator', color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
  doctor: { label: 'Doctor', color: '#38bdf8', bg: 'rgba(56,189,248,0.15)' },
  nurse: { label: 'Nurse', color: '#34d399', bg: 'rgba(52,211,153,0.15)' },
  receptionist: { label: 'Receptionist', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
  pharmacist: { label: 'Pharmacist', color: '#a78bfa', bg: 'rgba(167,139,250,0.15)' },
  lab_technician: { label: 'Lab Technician', color: '#fb923c', bg: 'rgba(251,146,60,0.15)' },
  separate_doctor: { label: 'Solo Doctor', color: '#38bdf8', bg: 'rgba(56,189,248,0.15)' },
};

export default function Layout() {
  const { user, logout, hasPerm } = useAuth();
  const [taskCount, setTaskCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  // ── Grab the raw singleton socket once — never changes identity ──
  const { socket: rawSocket } = useSocket();
  const socketRef = useRef(rawSocket);

  // ── Determine user role ──
  const isDoctor = user?.role?.toLowerCase() === 'doctor' || user?.role?.toLowerCase() === 'separate_doctor';
  const isAdmin = user?.role?.toLowerCase() === 'admin';
  const isSuperAdmin = user?.role?.toLowerCase() === 'super_admin';

  // ── Stable fetch — identity only changes on login/logout ──────
  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      const [{ data: countData }, { data: notifData }] = await Promise.all([
        taskService.getPendingCount(),
        taskService.getNotifications(),
      ]);
      setTaskCount(countData.count);
      setNotifications(notifData);
    } catch (err) {
      console.error('Layout fetchData error:', err);
    }
  }, [user]);

  // ── Ref so socket handlers always call latest fetchData ────────
  const fetchDataRef = useRef(fetchData);
  useEffect(() => { fetchDataRef.current = fetchData; }, [fetchData]);

  useEffect(() => {
    if (!user) return;

    // Initial fetch
    fetchDataRef.current();

    // 60s fallback poll — sockets handle real-time updates
    const interval = setInterval(() => fetchDataRef.current(), 60_000);

    const handleTaskChange = () => fetchDataRef.current();
    const handleSlaBreach = (task) => {
      setNotifications(prev => [{
        _id: `sla-${Date.now()}`,
        message: `SLA BREACHED: "${task.title}" exceeded SLA`,
        taskId: task._id,
        read: false,
        createdAt: new Date().toISOString(),
      }, ...prev]);
    };

    const s = socketRef.current;
    if (s) {
      s.on('task:new', handleTaskChange);
      s.on('task:updated', handleTaskChange);
      s.on('task:sla-breach', handleSlaBreach);
    }

    return () => {
      clearInterval(interval);
      if (s) {
        s.off('task:new', handleTaskChange);
        s.off('task:updated', handleTaskChange);
        s.off('task:sla-breach', handleSlaBreach);
      }
    };
  }, [user]); // user is the only real dependency — socket is accessed via ref

  const navigate = useNavigate();
  const [showConfirm, setShowConfirm] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState({});
  const isMobile = window.innerWidth <= 768;

  const handleLogout = () => { logout(); navigate('/login'); };

  const handlePharmacySSO = async (e, targetPath) => {
    e.preventDefault();
    try {
      const { data } = await API.post('/auth/sso-token');
      window.location.href = `${targetPath}?sso=${data.token}`;
    } catch (err) {
      console.error('SSO token generation failed', err);
      window.location.href = targetPath;
    }
  };

  const roleMeta = ROLE_META[user?.role?.toLowerCase()] || {
    label: user?.role, color: '#94a3b8', bg: 'rgba(148,163,184,0.15)',
  };

  // ── Filter nav by permission ──
  // Hide telemedicine from admin
  const visibleSections = NAV_SECTIONS.map(section => ({
    ...section,
    items: section.items.filter(item => {
      // ── Hide telemedicine from admin (but NOT super_admin) ──
      if (item.perm === 'telemedicine' && isAdmin && !isSuperAdmin) return false;
      
      // ── Hide tokens, emergency, patients, and tasks from separate_doctor ──
      if (user?.role === 'separate_doctor' && (item.label === 'Token Queue' || item.label === 'Emergency Dept' || item.label === 'Patients' || item.label === 'Task Allocation')) return false;

      return hasPerm(item.perm);
    }),
  })).filter(s => s.items.length > 0);

  // ── Add DOCTOR section only for doctors ──
  // ── Add SUPER ADMIN section for super_admin (plus doctor sections) ──
  
  const visibleImsSections = IMS_SECTIONS.map(section => ({
    ...section,
    items: section.items.filter(item => hasPerm(item.perm)),
  })).filter(s => s.items.length > 0);

  const mainSections = visibleSections.filter(s => s.section === 'MAIN');
  const servicesSections = visibleSections.filter(s => s.section === 'SERVICES');
  const managementSections = visibleSections.filter(s => s.section === 'MANAGEMENT');

  const baseSections = [
    ...mainSections,
    ...servicesSections,
    ...visibleImsSections,
    ...managementSections
  ];

  const finalSections = isSuperAdmin
    ? [...baseSections, ...DOCTOR_SECTIONS, ...SUPER_ADMIN_SECTIONS]
    : isDoctor
      ? [...baseSections, ...DOCTOR_SECTIONS]
      : baseSections;

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        overflow: 'hidden',
        flexDirection: 'row',
      }}
    >
      {/* ── Top Nav ─────────────────────────────────────────────── */}
      <div style={{
        position: 'fixed', top: 0, right: 0, padding: 15, zIndex: 2000,
        display: 'flex', gap: 15, alignItems: 'center'
      }}>
        <div style={{ position: 'relative' }}>
          <button onClick={() => setShowNotifications(!showNotifications)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', position: 'relative', padding: 4 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            {notifications.filter(n => !n.read).length > 0 && (
              <span style={{
                position: 'absolute', top: 0, right: 0,
                background: '#ef4444', color: '#fff',
                borderRadius: '50%', minWidth: 16, height: 16,
                fontSize: 9, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '0 3px',
              }}>
                {notifications.filter(n => !n.read).length}
              </span>
            )}
          </button>

          {showNotifications && (
            <div style={{
              position: 'absolute', top: 35, right: 0, width: 320,
              background: '#fff', color: '#1e293b',
              borderRadius: 10, boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
              border: '1px solid #e2e8f0', zIndex: 3000,
              maxHeight: 400, overflowY: 'auto',
            }}>
              <div style={{ padding: '12px 14px', borderBottom: '1px solid #e2e8f0', fontWeight: 700, fontSize: 13 }}>
                Notifications
              </div>
              {notifications.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', fontSize: 12, color: '#94a3b8' }}>
                  No notifications
                </div>
              ) : (
                notifications.map(n => (
                  <div key={n._id} style={{
                    padding: '10px 14px', borderBottom: '1px solid #f1f5f9',
                    background: n.read ? 'transparent' : '#eff6ff',
                    fontSize: 12, cursor: 'pointer',
                  }}
                    onClick={async () => {
                      if (!n.read && n._id && !n._id.startsWith('sla-')) {
                        try { 
                          await taskService.markNotificationRead(n._id); 
                          setNotifications(prev => prev.map(notif => notif._id === n._id ? { ...notif, read: true } : notif));
                        } catch {}
                      }
                      if (n.taskId) {
                        const msg = n.message.toLowerCase();
                        if (msg.includes('payout')) {
                          navigate('/dashboard/doctor-earnings');
                        } else if (msg.includes('telemedicine') || msg.includes('consultation') || msg.includes('payment received')) {
                          navigate('/dashboard/telemedicine');
                        } else {
                          navigate('/dashboard/tasks');
                        }
                      }
                    }}
                  >
                    <div style={{ fontWeight: n.read ? 400 : 600 }}>{n.message}</div>
                    <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>
                      {n.createdAt ? new Date(n.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Sidebar ─────────────────────────────────────────────── */}
      <aside
        style={{
          width: sidebarOpen ? '235px' : '0px',
          transition: 'width 0.3s ease',
          background: '#0f2942',
          color: '#fff',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
          height: '100vh',
          overflowY: 'auto',
        }}
      >
        {/* Logo */}
        <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 22 }}>🏥</span>
            <div>
              <div style={{ fontWeight: 800, fontSize: 15, letterSpacing: 0.3 }}>MediCare HMS</div>
              <div style={{ fontSize: 10, color: '#94a3b8' }}>Hospital Management System</div>
            </div>
          </div>
        </div>

        {/* Role badge */}
        <div style={{ padding: '10px 16px 6px' }}>
          <span style={{
            display: 'inline-block', padding: '3px 10px', borderRadius: 20,
            fontSize: 10, fontWeight: 700, letterSpacing: 0.5,
            color: roleMeta.color, background: roleMeta.bg,
            textTransform: 'uppercase',
          }}>
            {roleMeta.label}
          </span>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '6px 0' }}>
          {finalSections.map(({ section, items }) => (
            <div key={section}>
              <div style={{
                padding: '10px 20px 4px', fontSize: 10,
                fontWeight: 700, color: '#64748b', letterSpacing: 1,
              }}>
                {section}
              </div>
              {items.map(({ path, label, icon, end, subItems }) => {
                if (subItems) {
                  const isOpen = expandedSections[label];
                  return (
                    <div key={label}>
                      <button
                        onClick={() => setExpandedSections(p => ({ ...p, [label]: !p[label] }))}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          width: '100%', padding: '9px 20px', fontSize: 13, fontWeight: 500,
                          color: '#94a3b8', background: 'transparent',
                          border: 'none', borderLeft: '3px solid transparent', cursor: 'pointer',
                          transition: 'all 0.15s',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontSize: 15 }}>{icon}</span>
                          <span>{label}</span>
                        </div>
                        <span style={{ fontSize: 12, transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▼</span>
                      </button>
                      {isOpen && (
                        <div style={{ background: 'rgba(0,0,0,0.15)', padding: '4px 0' }}>
                          {subItems.map((sub) => (
                            <NavLink
                              key={sub.path} to={sub.path}
                              onClick={(e) => {
                                setSidebarOpen(false);
                                handlePharmacySSO(e, sub.path); // Trigger SSO when navigating to any IMS link with correct path
                              }}
                              style={({ isActive }) => ({
                                display: 'flex', alignItems: 'center', gap: 8,
                                padding: '8px 20px 8px 45px', fontSize: 12, fontWeight: 500,
                                color: isActive ? '#38bdf8' : '#94a3b8',
                                textDecoration: 'none', transition: 'all 0.15s',
                                background: isActive ? 'rgba(56,189,248,0.1)' : 'transparent',
                              })}
                            >
                              <span style={{ fontSize: 14 }}>{sub.icon}</span>
                              <span>{sub.label}</span>
                            </NavLink>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                }

                return (
                  <NavLink
                    key={path} to={path} end={end}
                    onClick={(e) => {
                      setSidebarOpen(false);
                    }}
                    style={({ isActive }) => ({
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '9px 20px', fontSize: 13, fontWeight: 500,
                      color: isActive ? '#fff' : '#94a3b8',
                      background: isActive ? 'rgba(255,255,255,0.1)' : 'transparent',
                      borderLeft: isActive ? '3px solid #38bdf8' : '3px solid transparent',
                      textDecoration: 'none', transition: 'all 0.15s',
                    })}
                  >
                    <span style={{ fontSize: 15 }}>{icon}</span>
                    <span>{label === 'Task Allocation' && taskCount > 0 ? `Task Allocation [${taskCount}]` : label}</span>
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>

        {/* User info + logout */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', padding: '14px 16px', }}>
          <div
            onClick={() => {
              setSidebarOpen(false);
              navigate('/dashboard/profile');
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 12,
              cursor: 'pointer',
              padding: 8,
              borderRadius: 8,
            }}
          >
            <div style={{
              width: 36, height: 36, borderRadius: '50%', background: '#38bdf8',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: 14, color: '#0f2942', flexShrink: 0,
            }}>
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{
                fontWeight: 600, fontSize: 13, color: '#fff',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {user?.name}
              </div>
              <div style={{ fontSize: 11, color: roleMeta.color, textTransform: 'capitalize' }}>
                {roleMeta.label}
              </div>
            </div>
          </div>

          <button
            onClick={() => setShowConfirm(true)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.3)',
              background: 'rgba(239,68,68,0.08)', color: '#f87171',
              fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(239,68,68,0.18)';
              e.currentTarget.style.borderColor = '#ef4444';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(239,68,68,0.08)';
              e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)';
            }}
          >
            <span style={{ fontSize: 15 }}>🚪</span>
            Sign Out
          </button>
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────────────── */}

      {!sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          style={{
            position: 'fixed',
            top: isMobile ? 10 : 12,
            left: isMobile ? 10 : 24,
            zIndex: 2000,
            padding: '4px 14px',
            border: 'none',
            borderRadius: 8,
            background: '#0f2942',
            color: '#fff',
            cursor: 'pointer',
          }}
        >
          {sidebarOpen ? '✕ Close' : '☰ Menu'}
        </button>
      )}

      <main
        style={{
          flex: 1,
          overflowY: 'auto',
          background: '#f1f5f9',
          padding: isMobile ? 12 : 24,
          paddingTop: sidebarOpen ? (isMobile ? 70 : 24) : (isMobile ? 70 : 45),
        }}
      >
        <Outlet />
      </main>

      {/* ── Sign-out confirm modal ───────────────────────────────── */}
      {showConfirm && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}>
          <div style={{
            background: '#fff', borderRadius: 14, padding: 28, width: 320, textAlign: 'center',
          }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>🚪</div>
            <h3 style={{ margin: '0 0 8px', fontSize: 17, fontWeight: 700, color: '#1e293b' }}>
              Sign Out?
            </h3>
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 22 }}>
              You'll be redirected to the login page.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setShowConfirm(false)}
                style={{
                  flex: 1, padding: 10, borderRadius: 8,
                  border: '1px solid #e2e8f0', background: '#f8fafc',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#475569',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                style={{
                  flex: 1, padding: 10, borderRadius: 8, border: 'none',
                  background: '#ef4444', color: '#fff',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}