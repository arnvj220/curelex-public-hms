import React, { useState } from 'react';
import API from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { Link, useMatch } from 'react-router-dom';
import PatientSidebar from '../components/PatientSidebar';
import BottomNav from '../components/BottomNav';

// ─────────────────────────────────────────────────────────────────────────────
// Profile is shared between two routes:
//   /dashboard/profile   → rendered inside Layout's <Outlet> (staff/doctor)
//   /patient-profile     → rendered standalone (patient)
//
// isStaffRoute = true  → render content ONLY (Layout already provides shell)
// isStaffRoute = false → render full pd-layout shell with PatientSidebar
// ─────────────────────────────────────────────────────────────────────────────

export default function Profile() {
  const { user, patient, logout } = useAuth();
  
  const isStaffRoute = !!useMatch('/dashboard/profile');

  const [sidebarOpen,     setSidebarOpen]     = useState(false);
  const [userDropdown,    setUserDropdown]     = useState(false);
  const [showEditModal,   setShowEditModal]   = useState(false);
  const [showPassModal,   setShowPassModal]   = useState(false);
  const [previewImage,    setPreviewImage]    = useState(null);
  const [selectedAvatar,  setSelectedAvatar]  = useState(null);

  // ── Responsive hook ──────────────────────────────────────────────────────
  const [isMobile, setIsMobile] = React.useState(() => window.innerWidth <= 768);
  React.useEffect(() => {
    const h = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);

  const fileInputRef = React.useRef(null);

  const patientName  = patient?.name  || user?.name  || 'User';
  const patientEmail = patient?.email || user?.email || '';
  const displayName  = user?.name || 'Unknown';
  const avatarLetter = displayName.charAt(0).toUpperCase();
  const initials     = patientName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  const memberSince  = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    : 'N/A';
  const roleLabel = user?.role
    ? user.role.charAt(0).toUpperCase() + user.role.slice(1).replace('_', ' ')
    : 'User';

  const [editForm, setEditForm] = useState({
    name:       user?.name          || '',
    phone:      user?.phone         || '',
    dob:        patient?.dob        || '',
    gender:     patient?.gender     || '',
    bloodGroup: patient?.bloodGroup || '',
  });

  const [passForm, setPassForm] = useState({
    currentPassword: '', newPassword: '', confirmPassword: '',
  });

  const handleRemoveAvatar = async () => {
    try { await API.put(`/auth/users/${user._id}`, { avatar: '' }); window.location.reload(); }
    catch (err) { alert('Failed to remove photo'); }
  };

  const handleSaveProfile = async () => {
    try {
      let avatarData = user?.avatar || '';
      if (selectedAvatar) {
        avatarData = await new Promise((res, rej) => {
          const r = new FileReader();
          r.onloadend = () => res(r.result);
          r.onerror = rej;
          r.readAsDataURL(selectedAvatar);
        });
      }

      if (patient?._id) {
        await API.put(`/patients/${patient._id}`, {
          name: editForm.name, phone: editForm.phone, dob: editForm.dob,
          gender: editForm.gender, bloodGroup: editForm.bloodGroup, avatar: avatarData,
        });
      } else {
        await API.put('/auth/me', {
          name: editForm.name, phone: editForm.phone, avatar: avatarData,
        });
      }

      setShowEditModal(false);
      window.location.reload();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update profile');
    }
  };

  const handleChangePassword = async () => {
    if (passForm.newPassword !== passForm.confirmPassword) { alert('Passwords do not match'); return; }
    try {
      await API.put('/auth/change-password', { currentPassword: passForm.currentPassword, newPassword: passForm.newPassword });
      alert('Password updated!');
      setPassForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setShowPassModal(false);
    } catch (err) { alert(err?.response?.data?.message || 'Failed to update password'); }
  };

  const handleLogout = () => { logout(); };
  const goTo = (path) => { setSidebarOpen(false); setUserDropdown(false); window.location.href = path; };

  const isPatient = !!patient?._id;

  const infoRows = [
    { label: "Full Name", value: displayName },
    { label: "Email", value: user?.email || "—" },
    { label: "Phone", value: user?.phone || "Not provided" },
    { label: "Date of Birth", value: patient?.dob ? new Date(patient.dob).toLocaleDateString("en-GB") : "Not provided", patientOnly: true },
    { label: "Gender", value: patient?.gender || "Not provided", patientOnly: true },
    { label: "Blood Group", value: patient?.bloodGroup || "Not provided", patientOnly: true },
    { label: "Member Since", value: memberSince },
  ];

  // ── Shared styles ──────────────────────────────────────────────────────
  const styles = `
    .prof-wrap {
      width: 100%;
      min-height: 100%;
      box-sizing: border-box;
    }

    /* Hero */
    .prof-hero {
      background: linear-gradient(118deg, #0f172a 0%, #1e3a8a 55%, #1d4ed8 100%);
      border-radius: 14px;
      color: #fff;
      margin-bottom: 16px;
      overflow: hidden;
      box-shadow: 0 4px 20px rgba(30,58,138,0.2);
      display: flex;
      min-height: 120px;
    }
    .prof-hero-left {
      flex: 1; min-width: 0;
      display: flex; align-items: center; gap: 16px;
      padding: 20px 22px;
    }
    .prof-hero-right {
      width: 130px; flex-shrink: 0;
      background: linear-gradient(135deg, rgba(56,189,248,0.12) 0%, rgba(255,255,255,0.02) 100%);
      display: flex; align-items: center; justify-content: center;
      font-size: 54px; position: relative; overflow: hidden;
    }
    .prof-hero-right::before {
      content: '';
      position: absolute; top: -24px; right: -24px;
      width: 100px; height: 100px; border-radius: 50%;
      background: rgba(255,255,255,0.06);
    }
    @media (max-width: 560px) { .prof-hero-right { display: none; } }

    .prof-av-wrap { position: relative; flex-shrink: 0; }
    .prof-av {
      width: 68px; height: 68px; border-radius: 50%;
      background: rgba(255,255,255,0.14);
      border: 2px solid rgba(255,255,255,0.32);
      display: flex; align-items: center; justify-content: center;
      font-size: 26px; font-weight: 800; color: #fff; overflow: hidden;
    }
    .prof-av img { width: 100%; height: 100%; object-fit: cover; }
    .prof-cam {
      position: absolute; bottom: -1px; right: -1px;
      width: 24px; height: 24px; border-radius: 50%;
      background: #fff; border: none; cursor: pointer;
      font-size: 11px; display: flex; align-items: center; justify-content: center;
      box-shadow: 0 2px 6px rgba(0,0,0,0.2); transition: transform 0.15s;
    }
    .prof-cam:hover { transform: scale(1.12); }

    .prof-hero-text { min-width: 0; flex: 1; }
    .prof-hero-name {
      margin: 0 0 2px; font-size: 19px; font-weight: 800;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .prof-hero-email {
      margin: 0 0 9px; font-size: 12px; opacity: 0.68;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .prof-badges { display: flex; gap: 6px; flex-wrap: wrap; }
    .prof-badge {
      padding: 3px 10px; border-radius: 999px;
      font-size: 11px; font-weight: 700;
      background: rgba(255,255,255,0.14); letter-spacing: 0.15px;
    }
    .prof-badge-green { background: rgba(34,197,94,0.25); color: #bbf7d0; }
    .prof-rm-photo {
      margin-top: 9px;
      background: rgba(239,68,68,0.15); color: #fca5a5;
      border: 1px solid rgba(239,68,68,0.28); border-radius: 6px;
      padding: 3px 9px; cursor: pointer; font-size: 11px; font-weight: 600;
    }

    /* Stat row */
    .prof-stats {
      display: grid; grid-template-columns: repeat(3, 1fr);
      gap: 12px; margin-bottom: 16px;
    }
    @media (max-width: 540px) { .prof-stats { grid-template-columns: 1fr 1fr; } }
    .prof-stat {
      background: #fff; border-radius: 12px; padding: 14px 16px;
      border: 1px solid #e8edf3; box-shadow: 0 1px 6px rgba(0,0,0,0.04);
    }
    .prof-stat-lbl {
      font-size: 10px; color: #94a3b8; font-weight: 700;
      text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 6px;
    }
    .prof-stat-val { font-size: 15px; font-weight: 700; color: #1e293b; }
    .prof-stat-val.green { color: #16a34a; }

    /* Info section */
    .prof-section {
      background: #fff; border-radius: 14px;
      border: 1px solid #e8edf3; box-shadow: 0 1px 6px rgba(0,0,0,0.04);
      margin-bottom: 16px; overflow: hidden;
    }
    .prof-section-hd {
      padding: 14px 20px 12px; border-bottom: 1px solid #f0f4f8;
      font-size: 13px; font-weight: 700; color: #1e293b;
    }
    .prof-rows { padding: 0 20px; }
    .prof-row {
      display: grid; grid-template-columns: 140px 1fr;
      border-bottom: 1px solid #f0f4f8; align-items: center; min-height: 44px;
    }
    .prof-row:last-child { border-bottom: none; }
    @media (max-width: 500px) {
      .prof-row { grid-template-columns: 1fr; min-height: unset; padding: 10px 0; }
    }
    .prof-row-lbl {
      font-size: 11px; color: #94a3b8; font-weight: 700;
      text-transform: uppercase; letter-spacing: 0.4px; padding: 12px 0;
    }
    .prof-row-val {
      font-size: 13px; font-weight: 600; color: #1e293b;
      padding: 12px 0 12px 8px; word-break: break-word;
    }

    /* Buttons */
    .prof-btn-p {
      padding: 9px 18px; border-radius: 9px; border: none;
      background: #1e3a8a; color: #fff; font-size: 13px; font-weight: 700;
      cursor: pointer; display: flex; align-items: center; gap: 6px;
      transition: background 0.14s, transform 0.1s;
    }
    .prof-btn-p:hover { background: #1e40af; transform: translateY(-1px); }
    .prof-btn-s {
      padding: 9px 18px; border-radius: 9px;
      border: 1.5px solid #cbd5e1; background: #fff;
      color: #475569; font-size: 13px; font-weight: 700;
      cursor: pointer; display: flex; align-items: center; gap: 6px;
      transition: border-color 0.14s;
    }
    .prof-btn-s:hover { border-color: #94a3b8; color: #1e293b; }

    /* Modal */
    .prof-overlay {
      position: fixed; inset: 0; background: rgba(15,23,42,0.52);
      display: flex; align-items: center; justify-content: center;
      z-index: 9999; padding: 16px; backdrop-filter: blur(3px);
    }
    .prof-modal {
      width: 100%; max-width: 500px; max-height: 88vh;
      overflow-y: auto; background: #fff;
      border-radius: 18px; padding: 26px 24px 22px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.18);
    }
    .prof-modal-hd {
      font-size: 17px; font-weight: 800; color: #1e293b;
      margin: 0 0 20px; padding-bottom: 14px; border-bottom: 1px solid #f0f4f8;
    }
    .prof-section-lbl {
      font-size: 10px; font-weight: 700; color: #94a3b8;
      text-transform: uppercase; letter-spacing: 0.8px; margin: 18px 0 10px;
    }
    .prof-f { margin-bottom: 12px; }
    .prof-f label { display: block; font-size: 12px; font-weight: 600; color: #475569; margin-bottom: 4px; }
    .prof-f input, .prof-f select {
      width: 100%; padding: 9px 12px;
      border: 1.5px solid #e2e8f0; border-radius: 9px;
      font-size: 13px; color: #1e293b; background: #fff;
      box-sizing: border-box; outline: none; transition: border-color 0.14s;
    }
    .prof-f input:focus, .prof-f select:focus { border-color: #3b82f6; }
    .prof-f input:disabled { background: #f8fafc; color: #94a3b8; cursor: not-allowed; }
    .prof-hint { font-size: 10px; color: #94a3b8; margin-top: 3px; }
    .prof-modal-ft {
      display: flex; justify-content: flex-end; gap: 8px;
      margin-top: 22px; padding-top: 14px; border-top: 1px solid #f0f4f8;
    }
    .prof-hr { height: 1px; background: #f0f4f8; margin: 14px 0; }
  `;

  // ── Profile content ───────────────────────────────────────────────────────
  const profileContent = (
    <div className="prof-wrap">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#1a2236' }}>My Profile</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="prof-btn-p" onClick={() => {
            setEditForm({ name: user?.name || '', phone: user?.phone || '', dob: patient?.dob || '', gender: patient?.gender || '', bloodGroup: patient?.bloodGroup || '' });
            setShowEditModal(true);
          }}>✏️ Edit</button>
          <button className="prof-btn-s" onClick={() => setShowPassModal(true)}>🔒 Password</button>
        </div>
      </div>

      {/* Hero */}
      <div className="prof-hero">
        <div className="prof-hero-left">
          <div className="prof-av-wrap">
            <div className="prof-av">
              {previewImage    ? <img src={previewImage}  alt="Profile" />
               : user?.avatar ? <img src={user.avatar}   alt="Profile" />
               : avatarLetter}
            </div>
            <button className="prof-cam" onClick={() => fileInputRef.current?.click()} title="Change photo">📷</button>
          </div>

          <input type="file" accept="image/*" ref={fileInputRef} style={{ display: 'none' }}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              if (file.size > 2 * 1024 * 1024) { alert('Image must be under 2 MB'); return; }
              setSelectedAvatar(file);
              setPreviewImage(URL.createObjectURL(file));
              try {
                const data = await new Promise((res, rej) => { const r = new FileReader(); r.onloadend = () => res(r.result); r.onerror = rej; r.readAsDataURL(file); });
                await API.put(`/auth/users/${user._id}`, { avatar: data });
                window.location.reload();
              } catch (err) { alert(err.response?.data?.message || 'Failed to upload'); }
            }}
          />

          <div className="prof-hero-text">
            <h1 className="prof-hero-name">{displayName}</h1>
            <p className="prof-hero-email">{user?.email}</p>
            <div className="prof-badges">
              <span className="prof-badge">{roleLabel}</span>
              <span className={`prof-badge ${user?.isActive ? 'prof-badge-green' : ''}`}>
                {user?.isActive ? '● Active' : '● Inactive'}
              </span>
            </div>
            {user?.avatar && <button className="prof-rm-photo" onClick={handleRemoveAvatar}>Remove photo</button>}
          </div>
        </div>
        <div className="prof-hero-right" style={{ opacity: 1 }}>
          <span style={{ opacity: 0.18, fontSize: 54 }}>🏥</span>
        </div>
      </div>

      {/* Stats */}
      <div className="prof-stats">
        <div className="prof-stat">
          <div className="prof-stat-lbl">Status</div>
          <div className={`prof-stat-val ${user?.isActive ? 'green' : ''}`}>{user?.isActive ? 'Active' : 'Inactive'}</div>
        </div>
        <div className="prof-stat">
          <div className="prof-stat-lbl">Member Since</div>
          <div className="prof-stat-val" style={{ fontSize: 13 }}>{memberSince}</div>
        </div>
        <div className="prof-stat">
          <div className="prof-stat-lbl">Blood Group</div>
          <div className="prof-stat-val">{patient?.bloodGroup || '—'}</div>
        </div>
      </div>

      {/* Info table */}
      <div className="prof-section">
        <div className="prof-section-hd">Personal Information</div>
        <div className="prof-rows">
          {infoRows
            .filter((row) => {
              if (row.patientOnly && !isPatient) return false;
              return row.value != null;
            })
            .map((row, i) => (
              <div className="prof-row" key={i}>
                <div className="prof-row-lbl">{row.label}</div>
                <div className="prof-row-val">{row.value}</div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );

  // ── Modals ────────────────────────────────────────────────────────────────
  const modals = (
    <>
      {showEditModal && (
        <div className="prof-overlay" onClick={(e) => e.target === e.currentTarget && setShowEditModal(false)}>
          <div className="prof-modal">
            <div className="prof-modal-hd">Edit Profile</div>

            <div className="prof-section-lbl">Personal</div>
            <div className="prof-f"><label>Full Name</label><input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} /></div>
            <div className="prof-f"><label>Email</label><input value={user?.email || ''} disabled /><div className="prof-hint">Cannot be changed</div></div>
            <div className="prof-f"><label>Phone</label><input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} /></div>

            {patient?._id && (
              <>
                <div className="prof-hr" />
                <div className="prof-section-lbl">Medical</div>
                <div className="prof-f"><label>Date of Birth</label><input type="date" value={editForm.dob} onChange={(e) => setEditForm({ ...editForm, dob: e.target.value })} /></div>
                <div className="prof-f">
                  <label>Gender</label>
                  <select value={editForm.gender} onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}>
                    <option value="">Select</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="prof-f">
                  <label>Blood Group</label>
                  <select value={editForm.bloodGroup} onChange={(e) => setEditForm({ ...editForm, bloodGroup: e.target.value })}>
                    <option value="">Select</option>
                    {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(bg => <option key={bg} value={bg}>{bg}</option>)}
                  </select>
                </div>
              </>
            )}

            <div className="prof-hr" />
            <div className="prof-section-lbl">Account</div>
            <div className="prof-f"><label>Role</label><input value={roleLabel} disabled /></div>
            <div className="prof-f"><label>Status</label><input value={user?.isActive ? 'Active' : 'Inactive'} disabled /></div>
            <div className="prof-f"><label>Member Since</label><input value={memberSince} disabled /></div>
            <div className="prof-modal-ft">
              <button className="prof-btn-s" onClick={() => setShowEditModal(false)}>Cancel</button>
              <button className="prof-btn-p" onClick={handleSaveProfile}>Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {showPassModal && (
        <div className="prof-overlay" onClick={(e) => e.target === e.currentTarget && setShowPassModal(false)}>
          <div className="prof-modal" style={{ maxWidth: 400 }}>
            <div className="prof-modal-hd">Change Password</div>
            <div className="prof-f"><label>Current Password</label><input type="password" value={passForm.currentPassword} onChange={(e) => setPassForm({ ...passForm, currentPassword: e.target.value })} /></div>
            <div className="prof-f"><label>New Password</label><input type="password" value={passForm.newPassword} onChange={(e) => setPassForm({ ...passForm, newPassword: e.target.value })} /></div>
            <div className="prof-f"><label>Confirm New Password</label><input type="password" value={passForm.confirmPassword} onChange={(e) => setPassForm({ ...passForm, confirmPassword: e.target.value })} /></div>
            <div className="prof-modal-ft">
              <button className="prof-btn-s" onClick={() => setShowPassModal(false)}>Cancel</button>
              <button className="prof-btn-p" onClick={handleChangePassword}>Update Password</button>
            </div>
          </div>
        </div>
      )}
    </>
  );

  // ── Staff route → content only ────────────────────────────────────────────
  if (isStaffRoute) {
    return (
      <>
        <style>{styles}</style>
        {profileContent}
        {modals}
      </>
    );
  }

  // ── Patient route → full standalone layout ────────────────────────────────
  return (
    <>
      <style>{styles}</style>

      <div className="pd-layout">
        <header className="pd-topbar">
          <div className="pd-topbar__left">
            {!isMobile && (
              <button className="pd-hamburger" onClick={() => setSidebarOpen(true)}>
                <i className="fas fa-bars"></i>
              </button>
            )}
            <Link to="/patient-dashboard" className="pd-topbar__title">My Health</Link>
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
                      { icon: 'fa-user-circle',            label: 'Profile',            path: '/patient-profile' },
                      { icon: 'fa-calendar-check',         label: 'Appointments',       path: '/patient-appointments' },
                      { icon: 'fa-procedures',             label: 'Hospital Admission', path: '/patient-admission' },
                      { icon: 'fa-video',                  label: 'Telemedicine',       path: '/patient-telemedicine' },
                      { icon: 'fa-prescription-bottle-alt',label: 'Prescriptions',      path: '/patient-prescriptions' },
                      { icon: 'fa-folder-open',            label: 'My Documents',       path: '/patient-documents' },
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
            activeItem="profile"
            sidebarOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            patientName={patientName}
            patientEmail={patientEmail}
            initials={initials}
          />

          <div className="pd-main">
            <main className="pd-body">
              {profileContent}
            </main>
          </div>
        </div>

        <BottomNav activeItem="profile" />
      </div>

      {modals}
    </>
  );
}