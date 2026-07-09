// hms-react/src/pages/PatientDashboard.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../utils/api';
import ClinicSearch from '../components/ClinicSearch';
import '../css/PatientDashboard.css';
import PatientSidebar from '../components/PatientSidebar';
import BottomNav from '../components/BottomNav';
import heroImage from "../../assets/front.jpeg";
import curelexLogo from "../../assets/logo.png";

// ── Responsive hook — updates on resize ──────────────────────────────────────
function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= breakpoint);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth <= breakpoint);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, [breakpoint]);
  return isMobile;
}

export default function PatientDashboard() {
  const { user, patient, logout, isPatient, isDoctorOnline } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const [stats, setStats] = useState({
    totalAppointments: 0,
    upcomingAppointments: 0,
    prescriptionsCount: 0,
    doctorsConsulted: 0,
  });
  const [appointments, setAppointments] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [admission, setAdmission] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userDropdown, setUserDropdown] = useState(false);

  const [locationLabel, setLocationLabel] = useState('Home');
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState(null);

  useEffect(() => { detectLocation(); }, []);

  function detectLocation() {
    if (!navigator.geolocation) { setLocationLabel('Home'); setLocationError('not-supported'); return; }
    setLocationLoading(true); setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=14&addressdetails=1`,
            { headers: { Accept: 'application/json' } }
          );
          const data = await res.json();
          const addr = data?.address || {};
          const place = addr.suburb || addr.neighbourhood || addr.city_district ||
            addr.town || addr.village || addr.city || addr.county ||
            data?.display_name?.split(',')[0] || 'Current Location';
          setLocationLabel(place);
        } catch {
          setLocationLabel('Current Location'); setLocationError('geocode-failed');
        } finally { setLocationLoading(false); }
      },
      () => { setLocationLabel('Home'); setLocationError('permission-denied'); setLocationLoading(false); },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 300000 }
    );
  }

  useEffect(() => {
    if (!user) { navigate('/patient-login'); return; }
    if (!isPatient()) { navigate('/'); return; }
    loadDashboardData();
  }, [user]);

  async function loadDashboardData() {
    setLoading(true);
    try {
      const patientId = patient?._id || patient?.id || user?.id || user?._id;
      if (!patientId) { setLoading(false); return; }

      const statsRes = await API.get(`/patient-portal/${patientId}/dashboard`);
      if (statsRes.data.success) setStats(statsRes.data.data);

      const apptRes = await API.get(`/patient-portal/${patientId}/appointments`);
      if (apptRes.data.success) setAppointments(apptRes.data.appointments || []);

      try {
        const rxRes = await API.get(`/prescriptions/patient/${patientId}`);
        if (rxRes.data.success) {
          setPrescriptions(rxRes.data.prescriptions || []);
          setStats(prev => ({ ...prev, prescriptionsCount: rxRes.data.prescriptions?.length || 0 }));
        }
      } catch { console.log('Prescriptions not available yet'); }

      try {
        const admRes = await API.get(`/patient-portal/${patientId}/admission`);
        setAdmission(admRes.data.success && admRes.data.admitted ? admRes.data.admission : null);
      } catch { console.log('Admission status not available'); }

      try {
        const docRes = await API.get('/auth/available-doctors');
        if (docRes.data.success) setDoctors(docRes.data.doctors || []);
      } catch { console.log('Doctors not available'); }
    } catch (error) { console.error('Error loading dashboard:', error); }
    setLoading(false);
  }

  const handleLogout = () => { logout(); navigate('/patient-login'); };
  const goTo = (path) => { setSidebarOpen(false); setUserDropdown(false); navigate(path); };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  };
  const formatTime = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const patientName = patient?.name || user?.name || 'Patient';
  const patientEmail = patient?.email || user?.email || '';
  const patientId = patient?._id || patient?.id || user?.id || user?._id;

  const initials = patientName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  const upcomingAppointments = appointments.filter(a => new Date(a.appointmentTime) > new Date());

  // ── Shared scroll-row style (used for both card rows) ────────────────────
  const scrollRowStyle = isMobile
    ? {
      display: 'flex',
      gap: '12px',
      overflowX: 'auto',
      overflowY: 'visible',
      WebkitOverflowScrolling: 'touch',
      scrollSnapType: 'x mandatory',
      paddingBottom: '10px',
      paddingLeft: '4px',
      paddingRight: '4px',
      msOverflowStyle: 'none',
      scrollbarWidth: 'none',
    }
    : {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
      gap: '14px',
    };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <i className="fas fa-spinner fa-spin" style={{ fontSize: 48, color: '#2d6be4' }} />
          <p style={{ marginTop: '1rem', color: '#6b7a99' }}>Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pd-layout">
      {/* ── TOPBAR ── */}
      <header className="pd-topbar">
        <div className="pd-topbar__left">
          {!isMobile && (
            <button className="pd-hamburger" onClick={() => setSidebarOpen(true)}>
              <i className="fas fa-bars" />
            </button>
          )}
          <Link to="/patient-dashboard" className="pd-topbar__title">
            Patient Portal
          </Link>
        </div>
        <div className="pd-topbar__right">
          <div
            className="pd-topbar__location"
            onClick={detectLocation}
            style={{ cursor: 'pointer' }}
            title={locationError === 'permission-denied' ? 'Location access denied — click to try again' : 'Click to refresh your location'}
          >
            <i className={`fas ${locationLoading ? 'fa-spinner fa-spin' : 'fa-map-marker-alt'}`} />
            {locationLoading ? 'Locating…' : locationLabel}
            <i className="fas fa-chevron-down" style={{ fontSize: 10 }} />
          </div>

          <ClinicSearch patientId={patientId} patientName={patientName} />

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
                    { icon: 'fa-user-circle', label: 'Profile', path: '/patient-profile' },
                    { icon: 'fa-calendar-check', label: 'Appointments', path: '/patient-appointments' },
                    { icon: 'fa-procedures', label: 'Hospital Admission', path: '/patient-admission' },
                    { icon: 'fa-video', label: 'Telemedicine', path: '/patient-telemedicine' },
                    { icon: 'fa-prescription-bottle-alt', label: 'Prescriptions', path: '/patient-prescriptions' },
                    { icon: 'fa-folder-open', label: 'My Documents', path: '/patient-documents' },
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
          activeItem="dashboard"
          sidebarOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          patientName={patientName}
          patientEmail={patientEmail}
          initials={initials}
        />

        <div className="pd-main">
          <main className="pd-body">

            {/* Hero Banner */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "linear-gradient(135deg,#eef5ff,#dbeafe)",
                border: "1px solid #bfdbfe",
                borderRadius: "22px",
                padding: isMobile ? "24px 20px" : "40px",
                marginBottom: "28px",
                overflow: "hidden",
                flexWrap: isMobile ? "wrap" : "nowrap",
                gap: "20px",
                position: "relative",
              }}
            >
              {/* Left Side */}
              {/* Left Side */}
              <div
                style={{
                  flex: 1,
                  minWidth: "260px",
                  paddingTop: isMobile ? "35px" : "0px",
                }}
              >
                <h1
                  style={{
                    margin: 0,
                    fontSize: isMobile ? "32px" : "48px",
                    fontWeight: 800,
                    lineHeight: 1.1,
                    color: "#111827",
                  }}
                >
                  Your Health,
                  <br />
                  <span style={{ color: "#2563eb" }}>Our Priority</span>
                </h1>

                <p
                  style={{
                    marginTop: "18px",
                    color: "#4b5563",
                    fontSize: "17px",
                    maxWidth: "450px",
                  }}
                >
                  Curelex is here to care for you and your family with
                  seamless appointments, prescriptions and healthcare.
                </p>

                <button
                  onClick={() => navigate("/patient-appointments")}
                  style={{
                    marginTop: "24px",
                    background: "#2563eb",
                    color: "white",
                    border: "none",
                    borderRadius: "12px",
                    padding: "14px 24px",
                    fontWeight: 600,
                    fontSize: "15px",
                    cursor: "pointer",
                  }}
                >
                  <i
                    className="fas fa-calendar-plus"
                    style={{ marginRight: "8px" }}
                  />
                  Book Appointment
                </button>
                {isMobile && (
                  <div
                    style={{
                      position: "absolute",
                      top: "10px",
                      right: "10px",
                      background: "rgba(255,255,255,0.95)",
                      borderRadius: "16px",
                      padding: "8px 12px",
                      boxShadow: "0 8px 20px rgba(0,0,0,0.08)",
                    }}
                  >
                    <img
                      src={curelexLogo}
                      alt="Curelex"
                      style={{
                        width: "110px",
                        display: "block",
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Right Side */}
              <div
                style={{
                  flex: 1,
                  position: "relative",
                  display: isMobile ? "none" : "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  minHeight: "320px",
                }}
              >
                {/* Background Blue Circle */}
                <div
                  style={{
                    position: "absolute",
                    width: "320px",
                    height: "320px",
                    borderRadius: "50%",
                    background:
                      "radial-gradient(circle, rgba(59,130,246,0.18) 0%, rgba(59,130,246,0.08) 60%, transparent 100%)",
                    zIndex: 0,
                  }}
                />

                {/* Logo */}
                <div
                  style={{
                    position: "absolute",
                    top: "25px",
                    left: "35px",
                    background: "rgba(255,255,255,0.92)",
                    backdropFilter: "blur(12px)",
                    borderRadius: "18px",
                    padding: "10px 16px",
                    boxShadow: "0 12px 30px rgba(0,0,0,0.08)",
                    zIndex: 3,
                  }}
                >
                  <img
                    src={curelexLogo}
                    alt="Curelex"
                    style={{
                      width: "165px",
                      display: "block",
                    }}
                  />
                </div>

                {/* Doctor Image */}
                <img
                  src={heroImage}
                  alt="Healthcare"
                  style={{
                    width: "72%",
                    maxWidth: "330px",
                    borderRadius: "22px",
                    objectFit: "cover",
                    boxShadow: "0 20px 45px rgba(37,99,235,0.18)",
                    position: "relative",
                    zIndex: 2,
                  }}
                />
              </div>
            </div>

            {/* Admission banner */}
            {admission && (
              <div
                className="pd-admission-banner"
                onClick={() => navigate('/patient-admission')}
                style={{
                  background: 'linear-gradient(135deg, #ecfdf5, #d1fae5)',
                  border: '1px solid #6ee7b7', borderRadius: 16,
                  padding: '18px 22px', marginBottom: 24, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  gap: 14, flexWrap: 'wrap',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 46, height: 46, borderRadius: '50%', background: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: '#fff', flexShrink: 0 }}>
                    🏥
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: '#065f46' }}>
                      You're currently admitted — {admission.roomType} {admission.roomNumber ? `#${admission.roomNumber}` : ''}
                    </div>
                    <div style={{ fontSize: 12, color: '#15803d', marginTop: 2 }}>
                      Day {admission.days} · ₹{admission.roomRatePerDay}/day · Running total ₹{admission.grandTotal.toLocaleString()}
                    </div>
                  </div>
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#fff', background: '#16a34a', padding: '8px 16px', borderRadius: 8, whiteSpace: 'nowrap' }}>
                  View Live Details →
                </span>
              </div>
            )}

            {/* Quick Stats */}
            <div className="pd-stats">
              {[
                { icon: 'fa-calendar-check', label: 'Upcoming', value: stats.upcomingAppointments, color: '#2d6be4' },
                { icon: 'fa-prescription-bottle', label: 'Prescriptions', value: stats.prescriptionsCount, color: '#00b386' },
                { icon: 'fa-file-medical', label: 'Total Appointments', value: stats.totalAppointments, color: '#f59e0b' },
                { icon: 'fa-user-md', label: 'Doctors Consulted', value: stats.doctorsConsulted, color: '#7c3aed' },
              ].map(s => (
                <div className="pd-stat-card" key={s.label}>
                  <div className="pd-stat-card__icon" style={{ background: s.color + '18', color: s.color }}>
                    <i className={`fas ${s.icon}`} />
                  </div>
                  <div>
                    <div className="pd-stat-card__num">{s.value}</div>
                    <div className="pd-stat-card__label">{s.label}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Dashboard Grid */}
            <div className="pd-grid">

              {/* Upcoming Appointments */}
              <div style={{ background: '#fff', border: '0.5px solid #e5e7eb', borderRadius: 16, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '18px 20px 14px', borderBottom: '0.5px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 9, background: '#dbeafe', color: '#1e40af', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>
                      <i className="fas fa-calendar-alt" />
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#1a2236' }}>Upcoming appointments</span>
                  </div>
                  {upcomingAppointments.length > 0 && (
                    <span style={{ fontSize: 11, fontWeight: 600, background: '#dbeafe', color: '#1e40af', borderRadius: 20, padding: '2px 8px' }}>
                      {upcomingAppointments.length} scheduled
                    </span>
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  {upcomingAppointments.length === 0 ? (
                    <div style={{ padding: '32px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, color: '#94a3b8' }}>
                      <i className="fas fa-calendar-times" style={{ fontSize: 24 }} />
                      <span style={{ fontSize: 13 }}>No upcoming appointments</span>
                    </div>
                  ) : (
                    upcomingAppointments.slice(0, 3).map((apt, i) => {
                      const d = new Date(apt.date);
                      const isLast = i === Math.min(upcomingAppointments.length, 3) - 1;
                      const statusStyle = {
                        Scheduled: { bg: '#dbeafe', color: '#1e40af' },
                        Completed: { bg: '#d1fae5', color: '#065f46' },
                        Cancelled: { bg: '#fee2e2', color: '#991b1b' },
                        'No-Show': { bg: '#fef3c7', color: '#92400e' },
                      }[apt.status] || { bg: '#f1f5f9', color: '#475569' };
                      return (
                        <div key={i}
                          style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 20px', borderBottom: isLast ? 'none' : '0.5px solid #f1f5f9', cursor: 'pointer' }}
                          onClick={() => navigate('/patient-appointments')}
                        >
                          <div style={{ flexShrink: 0, width: 40, height: 44, borderRadius: 10, border: '0.5px solid #bfdbfe', background: '#eff6ff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                            <span style={{ fontSize: 16, fontWeight: 700, color: '#2d6be4', lineHeight: 1 }}>{d.getDate()}</span>
                            <span style={{ fontSize: 10, fontWeight: 600, color: '#2d6be4', textTransform: 'uppercase' }}>{d.toLocaleString('en-US', { month: 'short' })}</span>
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: '#1a2236', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {apt.doctor?.name ? `Dr. ${apt.doctor.name}` : apt.doctorId?.name ? `Dr. ${apt.doctorId.name}` : 'Doctor'}
                            </div>
                            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
                              <i className="fas fa-clock" style={{ fontSize: 10 }} /> {apt.time || formatTime(apt.date)}
                            </div>
                          </div>
                          <span style={{ flexShrink: 0, fontSize: 10, fontWeight: 600, background: statusStyle.bg, color: statusStyle.color, borderRadius: 6, padding: '3px 8px' }}>
                            {apt.status}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
                <div style={{ padding: '14px 20px', borderTop: '0.5px solid #e5e7eb' }}>
                  <button onClick={() => navigate('/patient-appointments')}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%', padding: '9px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, background: 'linear-gradient(135deg, #2d6be4, #1e40af)', color: '#fff', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                    <i className="fas fa-calendar-plus" /> Book appointment
                  </button>
                </div>
              </div>

              {/* Recent Prescriptions */}
              <div style={{ background: '#fff', border: '0.5px solid #e5e7eb', borderRadius: 16, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '18px 20px 14px', borderBottom: '0.5px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 9, background: '#d1fae5', color: '#065f46', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>
                      <i className="fas fa-prescription-bottle-alt" />
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#1a2236' }}>Recent prescriptions</span>
                  </div>
                  {prescriptions.length > 0 && (
                    <span style={{ fontSize: 11, fontWeight: 600, background: '#d1fae5', color: '#065f46', borderRadius: 20, padding: '2px 8px' }}>
                      {prescriptions.length} total
                    </span>
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  {prescriptions.length === 0 ? (
                    <div style={{ padding: '32px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, color: '#94a3b8' }}>
                      <i className="fas fa-file-prescription" style={{ fontSize: 24 }} />
                      <span style={{ fontSize: 13 }}>No prescriptions yet</span>
                    </div>
                  ) : (
                    prescriptions.slice(0, 3).map((rx, i) => {
                      const isLast = i === Math.min(prescriptions.length, 3) - 1;
                      const rxStatus = {
                        active: { bg: '#dbeafe', color: '#1e40af', label: 'Active' },
                        completed: { bg: '#d1fae5', color: '#065f46', label: 'Completed' },
                        draft: { bg: '#f1f5f9', color: '#475569', label: 'Draft' },
                        cancelled: { bg: '#fee2e2', color: '#991b1b', label: 'Cancelled' },
                        dispensed: { bg: '#fef3c7', color: '#92400e', label: 'Dispensed' },
                      }[rx.status] || { bg: '#f1f5f9', color: '#475569', label: rx.status };
                      const summary = rx.diagnosis || rx.chiefComplaint || '';
                      return (
                        <div key={i}
                          onClick={() => navigate('/patient-prescriptions')}
                          style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', borderBottom: isLast ? 'none' : '0.5px solid #f1f5f9', cursor: 'pointer' }}
                        >
                          <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#f1f5f9', border: '0.5px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: '#94a3b8', flexShrink: 0 }}>
                            <i className="fas fa-stethoscope" />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: '#1a2236' }}>{rx.doctorName || rx.doctorId?.name || 'Doctor'}</div>
                            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
                              {rx.medicines?.length || 0} medicine{rx.medicines?.length !== 1 ? 's' : ''}
                              {summary && ` · ${summary.length > 28 ? summary.substring(0, 28) + '…' : summary}`}
                            </div>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5, flexShrink: 0 }}>
                            <span style={{ fontSize: 11, color: '#94a3b8' }}>{formatDate(rx.createdAt)}</span>
                            <span style={{ fontSize: 10, fontWeight: 600, borderRadius: 6, padding: '2px 7px', background: rxStatus.bg, color: rxStatus.color }}>{rxStatus.label}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
                <div style={{ padding: '14px 20px', borderTop: '0.5px solid #e5e7eb' }}>
                  <button onClick={() => navigate('/patient-prescriptions')}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%', padding: '9px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, background: 'transparent', border: '0.5px solid #d1d5db', color: '#374151', cursor: 'pointer', fontFamily: 'inherit' }}>
                    <i className="fas fa-eye" /> View all prescriptions
                  </button>
                </div>
              </div>
            </div>

            {/* Available Doctors */}
            <div style={{ marginTop: 28 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#1a2236' }}>Available Doctors</h3>
                <div style={{ display: 'flex', gap: 16, fontSize: 13 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
                    <span style={{ color: '#374151', fontWeight: 500 }}>{doctors.filter(d => isDoctorOnline?.(d._id)).length} online</span>
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#94a3b8', display: 'inline-block' }} />
                    <span style={{ color: '#6b7a99', fontWeight: 500 }}>{doctors.filter(d => !isDoctorOnline?.(d._id)).length} offline</span>
                  </span>
                </div>
              </div>
              {doctors.length === 0 ? (
                <div className="pd-card"><div className="pd-card__body"><div className="pd-empty"><i className="fas fa-user-md" /> No doctors available right now</div></div></div>
              ) : (
                <div
                  style={
                    isMobile
                      ? {
                        display: 'flex',
                        overflowX: 'auto',
                        overflowY: 'hidden',
                        gap: 16,
                        paddingBottom: 10,
                        WebkitOverflowScrolling: 'touch',
                        scrollSnapType: 'x mandatory',
                        scrollbarWidth: 'none',
                        msOverflowStyle: 'none',
                      }
                      : {
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                        gap: 16,
                      }
                  }
                >
                  {doctors.map((doc) => {
                    const online = isDoctorOnline?.(doc._id) ?? false;
                    return (
                      <div
                        key={doc._id}
                        style={{
                          flex: isMobile ? '0 0 280px' : undefined,
                          minWidth: isMobile ? 280 : undefined,
                          scrollSnapAlign: isMobile ? 'start' : undefined,

                          background: '#fff',
                          borderRadius: 16,
                          padding: 20,
                          border: online ? '2px solid #2d6be4' : '1.5px solid #e5e7eb',
                          boxShadow: online
                            ? '0 4px 20px rgba(45,107,228,0.10)'
                            : '0 2px 8px rgba(0,0,0,0.04)',
                          position: 'relative',
                          opacity: online ? 1 : 0.65,
                        }}
                      >
                        <span style={{ position: 'absolute', top: 16, right: 16, width: 12, height: 12, borderRadius: '50%', background: online ? '#22c55e' : '#cbd5e1', border: '2px solid #fff', boxShadow: online ? '0 0 0 2px #bbf7d0' : 'none', display: 'inline-block' }} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
                          <div style={{ width: 56, height: 56, borderRadius: '50%', background: online ? '#dbeafe' : '#f1f5f9', color: online ? '#2d6be4' : '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700, flexShrink: 0 }}>
                            {(doc.name || 'D')[0].toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 15, color: online ? '#1a2236' : '#94a3b8' }}>Dr. {doc.name}</div>
                            {doc.department && <div style={{ fontSize: 13, color: '#6b7a99', marginTop: 2 }}>{doc.department}</div>}
                          </div>
                        </div>
                        {online ? (
                          <>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                              <span style={{ background: '#f0f9ff', color: '#0369a1', border: '1px solid #bae6fd', borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 600 }}>✓ Verified</span>
                              <span style={{ background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0', borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
                                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} /> Online Now
                              </span>
                            </div>
                            <div style={{ fontSize: 13, color: '#6b7a99', marginBottom: 14 }}><i className="fas fa-clock" style={{ marginRight: 5 }} /> ~5 min wait</div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <div>
                                <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 2 }}>Appointment Fee</div>
                                <div style={{ fontSize: 20, fontWeight: 700, color: '#1a2236' }}>₹{doc.consultationFee || 299}</div>
                              </div>
                              <div>
                                <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 2 }}>Telemedicine Fee</div>
                                <div style={{ fontSize: 20, fontWeight: 700, color: '#1a2236' }}>₹{doc.telemedicineFee || 299}</div>
                              </div>

                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <button
                                onClick={() =>
                                  navigate('/patient-telemedicine', {
                                    state: { preSelectDoctor: doc._id },
                                  })
                                }
                                style={{
                                  width: '100%',
                                  marginTop: 16,
                                  background: 'linear-gradient(135deg, #2d6be4, #1e40af)',
                                  color: '#fff',
                                  border: 'none',
                                  borderRadius: 12,
                                  padding: '12px 18px',
                                  fontSize: 14,
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: 8,
                                  fontFamily: 'inherit',
                                  boxShadow: '0 4px 12px rgba(45,107,228,0.25)',
                                  transition: 'all 0.2s ease',
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.transform = 'translateY(-2px)';
                                  e.currentTarget.style.boxShadow =
                                    '0 8px 18px rgba(45,107,228,0.35)';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.transform = 'translateY(0)';
                                  e.currentTarget.style.boxShadow =
                                    '0 4px 12px rgba(45,107,228,0.25)';
                                }}
                              >
                                <i className="fas fa-video" style={{ fontSize: 14 }} />
                                Consult Now
                              </button>
                            </div>
                          </>
                        ) : (
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#cbd5e1', display: 'inline-block' }} />
                              <span style={{ fontSize: 13, color: '#94a3b8', fontWeight: 500 }}>Offline</span>
                            </div>
                            <div style={{ fontSize: 13, color: '#94a3b8', fontStyle: 'italic' }}>Currently unavailable for consultations</div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ── CONSULT TOP DOCTORS SECTION ── */}
            <div style={{ marginTop: 40, padding: isMobile ? '20px 16px' : '28px 24px', background: 'linear-gradient(135deg, #f8fafc, #f1f5f9)', borderRadius: 20, border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: isMobile ? 17 : 20, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.3px' }}>
                    Consult top doctors online for any health concern
                  </h2>
                  {/* Subtitle hidden on mobile (was cramped/unnecessary on small screens) */}
                  {!isMobile && (
                    <p style={{ margin: '5px 0 0', fontSize: 13, color: '#64748b' }}>
                      Private online consultations with verified doctors in all specialists
                    </p>
                  )}
                </div>
                <button
                  onClick={() => navigate('/patient-telemedicine')}
                  style={{ padding: '8px 18px', background: 'white', border: '1.5px solid #2d6be4', borderRadius: 10, color: '#2d6be4', fontWeight: 600, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit' }}
                >
                  View All Specialities →
                </button>
              </div>

              {/* ── Swipeable speciality cards ── */}
              <div style={scrollRowStyle}>
                {[
                  { label: 'Period doubts or Pregnancy', icon: 'fa-venus', color: '#ec4899' },
                  { label: 'Acne, pimple or skin issues', icon: 'fa-face-meh', color: '#f59e0b' },
                  { label: 'Performance issues in bed', icon: 'fa-heart-pulse', color: '#ef4444' },
                  { label: 'Cold, cough or fever', icon: 'fa-head-side-cough', color: '#3b82f6' },
                  { label: 'Child not feeling well', icon: 'fa-baby', color: '#22c55e' },
                  { label: 'Depression or anxiety', icon: 'fa-brain', color: '#8b5cf6' },
                ].map((item, i) => (
                  <div
                    key={i}
                    onClick={() => navigate('/patient-telemedicine')}
                    style={{
                      // ── SIZE FIX: smaller card (was 160px / full grid col) ──
                      flex: `0 0 ${isMobile ? '130px' : '150px'}`,
                      minWidth: isMobile ? 130 : 150,
                      scrollSnapAlign: 'start',
                      background: 'white',
                      borderRadius: 14,
                      padding: isMobile ? '16px 10px 14px' : '18px 12px 16px',
                      textAlign: 'center',
                      border: '1.5px solid #e2e8f0',
                      cursor: 'pointer',
                      userSelect: 'none',
                    }}
                  >
                    {/* Icon circle — smaller */}
                    <div style={{
                      width: isMobile ? 48 : 52,
                      height: isMobile ? 48 : 52,
                      margin: '0 auto 10px',
                      borderRadius: '50%',
                      background: item.color + '15',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: isMobile ? 20 : 22,
                      color: item.color,
                    }}>
                      <i className={`fas ${item.icon}`} />
                    </div>

                    <p style={{ margin: '0 0 12px', fontSize: 11, fontWeight: 600, color: '#0f172a', lineHeight: 1.35 }}>
                      {item.label}
                    </p>

                    <button
                      style={{
                        padding: '5px 12px',
                        background: 'transparent',
                        border: `1.5px solid ${item.color}`,
                        borderRadius: 20,
                        fontSize: 10,
                        fontWeight: 700,
                        color: item.color,
                        cursor: 'pointer',
                        letterSpacing: '0.4px',
                        fontFamily: 'inherit',
                      }}
                    >
                      CONSULT NOW
                    </button>
                  </div>
                ))}
              </div>

              {/* Swipe hint — only on mobile */}
              {isMobile && (
                <p style={{ margin: '8px 0 0', fontSize: 11, color: '#94a3b8', textAlign: 'center' }}>
                  ← swipe to see more →
                </p>
              )}
            </div>

            {/* ── Quick Actions ── */}
            <div style={{ marginTop: 28 }}>
              <div style={scrollRowStyle}>
                {[
                  { icon: 'fa-video', label: 'Video Consultation', color: '#2d6be4', action: () => navigate('/patient-telemedicine') },
                  { icon: 'fa-user-md', label: 'Find Doctors', color: '#00b386', action: () => alert('Find doctors coming soon!') },
                  { icon: 'fa-flask', label: 'Lab Tests', color: '#f59e0b', action: () => alert('Lab tests coming soon!') },
                  { icon: 'fa-prescription-bottle-alt', label: 'Prescriptions', color: '#7c3aed', action: () => navigate('/patient-prescriptions') },
                  { icon: 'fa-folder-open', label: 'My Documents', color: '#0f4c81', action: () => navigate('/patient-documents') },
                  { icon: 'fa-star', label: 'Feedback', color: '#fbbf24', action: () => navigate('/patient-feedback') },
                ].map(item => (
                  <button
                    key={item.label}
                    onClick={item.action}
                    style={{
                      flex: `0 0 ${isMobile ? '120px' : '140px'}`,
                      minWidth: isMobile ? 120 : 140,
                      scrollSnapAlign: 'start',
                      background: 'white',
                      border: '1.5px solid #e5e7eb',
                      borderRadius: 12,
                      padding: isMobile ? '14px 10px' : '18px 16px',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                      cursor: 'pointer', fontFamily: 'inherit',
                    }}
                  >
                    <div style={{ width: isMobile ? 40 : 48, height: isMobile ? 40 : 48, borderRadius: '50%', background: item.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: isMobile ? 17 : 20, color: item.color }}>
                      <i className={`fas ${item.icon}`} />
                    </div>
                    <span style={{ fontWeight: 600, fontSize: isMobile ? 11 : 13, color: '#1a2236', textAlign: 'center', lineHeight: 1.3 }}>{item.label}</span>
                  </button>
                ))}
              </div>
              {isMobile && (
                <p style={{ margin: '8px 0 0', fontSize: 11, color: '#94a3b8', textAlign: 'center' }}>
                  ← swipe to see more →
                </p>
              )}
            </div>

          </main>
        </div>
      </div>

      {/* ── Mobile bottom navigation ── */}
      <BottomNav activeItem="dashboard" />
    </div>
  );
}