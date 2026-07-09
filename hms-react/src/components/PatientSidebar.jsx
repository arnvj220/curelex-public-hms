import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import curelexLogo from '../../assets/logo.png';

export default function PatientSidebar({
  activeItem,
  sidebarOpen,
  onClose,
  admission,
  patientName,
  patientEmail,
  initials
}) {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const [showLogo, setShowLogo] = React.useState(true);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setShowLogo((prev) => !prev);
    }, 4000); // Toggles view every 4 seconds
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/patient-login');
  };

  const goTo = (path) => {
    if (onClose) onClose();
    navigate(path);
  };

  const navItems = [
    { key: 'dashboard',     label: 'Dashboard',          icon: 'fa-home',                     path: '/patient-dashboard' },
    { key: 'appointments',  label: 'My Appointments',    icon: 'fa-calendar-check',           path: '/patient-appointments' },
    { key: 'admission',     label: 'Hospital Admission', icon: 'fa-procedures',               path: '/patient-admission' },
    { key: 'telemedicine',  label: 'Telemedicine',       icon: 'fa-video',                    path: '/patient-telemedicine' },
    { key: 'prescriptions', label: 'Prescriptions',      icon: 'fa-prescription-bottle-alt', path: '/patient-prescriptions' },
    { key: 'documents',     label: 'My Documents',       icon: 'fa-folder-open',              path: '/patient-documents' },
    { key: 'feedback',      label: 'Feedback',           icon: 'fa-star',                     path: '/patient-feedback' },
    { key: 'profile',       label: 'Profile',            icon: 'fa-user-circle',              path: '/patient-profile' },
  ];

  return (
    <aside className={`pd-sidebar${sidebarOpen ? ' open' : ''}`}>
      {/* ── Mobile close button ── */}
      <button className="pd-sidebar__close" onClick={onClose} aria-label="Close menu">
        <i className="fas fa-times" />
      </button>

      <div className="pd-sidebar__profile" style={{ 
        position: 'relative', 
        height: '92px', 
        padding: '24px', 
        borderBottom: '1px solid var(--border)',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center'
      }}>
        {/* View 1: Logo */}
        <div style={{
          position: 'absolute',
          left: '24px',
          right: '24px',
          transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
          opacity: showLogo ? 1 : 0,
          transform: showLogo ? 'translateY(0)' : 'translateY(-15px)',
          pointerEvents: showLogo ? 'auto' : 'none',
          display: 'flex',
          alignItems: 'center',
        }}>
          <img 
            src={curelexLogo} 
            alt="Curelex" 
            style={{ height: '36px', objectFit: 'contain' }} 
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        </div>

        {/* View 2: Greeting */}
        <div style={{
          position: 'absolute',
          left: '24px',
          right: '24px',
          transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
          opacity: !showLogo ? 1 : 0,
          transform: !showLogo ? 'translateY(0)' : 'translateY(15px)',
          pointerEvents: !showLogo ? 'auto' : 'none',
        }}>
          <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {(() => {
              const hour = new Date().getHours();
              const greeting = hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening';
              return `${greeting}, ${patientName.split(" ")[0]}`;
            })()}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {patientEmail}
          </div>
        </div>
      </div>

      <nav className="pd-sidebar__nav">
        {navItems.map((item) => (
          <div
            key={item.key}
            className={`pd-nav-item ${activeItem === item.key ? 'active' : ''}`}
            onClick={() => goTo(item.path)}
            style={{
              display: 'flex',
              alignItems: 'center',
              ...(item.key === 'admission' && admission ? { position: 'relative' } : {})
            }}
          >
            <i className={`fas ${item.icon}`}></i> {item.label}
            {item.key === 'admission' && admission && (
              <span style={{
                marginLeft: 'auto',
                fontSize: 9,
                fontWeight: 700,
                color: '#fff',
                background: '#16a34a',
                borderRadius: 20,
                padding: '2px 7px',
              }}>
                LIVE
              </span>
            )}
          </div>
        ))}
      </nav>

      <div className="pd-sidebar__footer">
        <button className="pd-logout-btn" onClick={handleLogout}>
          <i className="fas fa-sign-out-alt"></i> Logout
        </button>
      </div>
    </aside>
  );
}