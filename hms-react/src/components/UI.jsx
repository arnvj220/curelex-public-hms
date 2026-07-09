import React, { useState, useEffect } from 'react';

function currentTime() {
  return new Date().toLocaleTimeString('en-PK', {
    hour: '2-digit',
    minute: '2-digit',
  });
}
function today() {
  return new Date().toLocaleDateString('en-PK', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/* ── Badge ─────────────────────────────────────────────────── */
export function Badge({ color = 'blue', children }) {
  const map = {
    blue:   { bg: '#e8f2fc', color: '#0f4c81' },
    green:  { bg: '#eafaf1', color: '#1a7a3e' },
    red:    { bg: '#fdecea', color: '#c0392b' },
    yellow: { bg: '#fef6e4', color: '#b7770d' },
    teal:   { bg: '#e0f8f3', color: '#00796b' },
    purple: { bg: '#ede7f6', color: '#6a1b9a' },
    gray:   { bg: '#f0f0f0', color: '#555' },
    orange: { bg: '#fff3e0', color: '#e65100' },
  };
  const s = map[color] || map.gray;
  return (
    <span style={{ background: s.bg, color: s.color, padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', display: 'inline-block' }}>
      {children}
    </span>
  );
}

/* ── Card ──────────────────────────────────────────────────── */
export function Card({ children, style = {}, onClick, noPad }) {
  return (
    <div
      onClick={onClick}
      style={{ background: 'var(--surface)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', padding: noPad ? 0 : '1.5rem', cursor: onClick ? 'pointer' : 'default', transition: 'transform .15s, box-shadow .15s', ...style }}
      onMouseEnter={(e) => { if (onClick) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-lg)'; } }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = 'var(--shadow)'; }}
    >
      {children}
    </div>
  );
}

/* ── Stat Card ─────────────────────────────────────────────── */
export function Stat({ label, value, color = 'var(--primary)', icon }) {
  return (
    <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: 16 }}>
      <div style={{ width: 52, height: 52, borderRadius: 14, background: color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 3 }}>{label}</div>
        <div style={{ fontSize: 28, fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
      </div>
    </div>
  );
}

/* ── Input ─────────────────────────────────────────────────── */
export function Input({ label, type = 'text', value, onChange, placeholder, required, style = {}, disabled,...rest }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, ...style }}>
      {label && (
        <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-muted)' }}>
          {label}{required && <span style={{ color: 'var(--danger)', marginLeft: 2 }}>*</span>}
        </label>
      )}
      <input
        type={type} value={value} onChange={onChange} placeholder={placeholder} disabled={disabled}
        {...rest}
        style={{ border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', fontSize: 14, color: 'var(--text)', background: disabled ? 'var(--surface2)' : 'var(--surface)', transition: 'border .2s', width: '100%', opacity: disabled ? 0.7 : 1, boxSizing: 'border-box' }}
        onFocus={(e) => !disabled && (e.target.style.borderColor = 'var(--primary)')}
        onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
      />
    </div>
  );
}

/* ── Textarea ──────────────────────────────────────────────── */
export function Textarea({ label, value, onChange, placeholder, rows = 3, required,...rest
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && (
        <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-muted)' }}>
          {label}{required && <span style={{ color: 'var(--danger)', marginLeft: 2 }}>*</span>}
        </label>
      )}
      <textarea
        value={value} onChange={onChange} placeholder={placeholder} rows={rows}  {...rest}
        style={{ border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', fontSize: 14, resize: 'vertical', fontFamily: 'inherit', color: 'var(--text)', background: 'var(--surface)', boxSizing: 'border-box', width: '100%' }}
        onFocus={(e) => (e.target.style.borderColor = 'var(--primary)')}
        onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
      />
    </div>
  );
}

/* ── Select ────────────────────────────────────────────────── */
export function Select({ label, value, onChange, children, style = {},...rest }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, ...style }}>
      {label && <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-muted)' }}>{label}</label>}
      <select
        value={value} onChange={onChange} {...rest}
        style={{ border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', fontSize: 14, color: 'var(--text)', background: 'var(--surface)', appearance: 'none', cursor: 'pointer', width: '100%' }}
        onFocus={(e) => (e.target.style.borderColor = 'var(--primary)')}
        onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
      >
        {children}
      </select>
    </div>
  );
}

/* ── Button ────────────────────────────────────────────────── */
export function Btn({ children, onClick, variant = 'primary', size = 'md', full, disabled, style = {}, className }) {
  const base = {
    borderRadius: 'var(--radius-sm)', fontWeight: 600, transition: '.2s',
    display: 'inline-flex', alignItems: 'center', justifyContent: full ? 'center' : 'flex-start',
    gap: 6, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1,
    border: 'none', fontFamily: 'inherit', width: full ? '100%' : 'auto',
    ...(size === 'sm' ? { padding: '7px 14px', fontSize: 13 } : { padding: '11px 22px', fontSize: 14 }),
    ...(size === 'lg' ? { padding: '14px 28px', fontSize: 16 } : {}),
  };
  const variants = {
    primary: { background: 'var(--primary)', color: '#fff' },
    accent:  { background: 'var(--accent)',  color: '#fff' },
    danger:  { background: 'var(--danger)',  color: '#fff' },
    outline: { background: 'transparent', color: 'var(--primary)', border: '1.5px solid var(--primary)' },
    ghost:   { background: 'var(--surface2)', color: 'var(--text)', border: '1.5px solid var(--border)' },
    warning: { background: 'var(--warning)', color: '#fff' },
    success: { background: 'var(--success)', color: '#fff' },
  };
  return (
    <button className={className} onClick={disabled ? undefined : onClick} style={{ ...base, ...variants[variant], ...style }}>
      {children}
    </button>
  );
}

/* ── Modal ─────────────────────────────────────────────────── */
export function Modal({ title, onClose, children, width = 520 }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(10,20,40,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: 'var(--surface)', borderRadius: 16, boxShadow: 'var(--shadow-lg)', width: `min(${width}px, 100%)`, maxHeight: '92vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 1 }}>
          <h2 style={{ fontSize: 20 }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', fontSize: 16, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>
        <div style={{ padding: '1.5rem' }}>{children}</div>
      </div>
    </div>
  );
}

/* ── Alert ─────────────────────────────────────────────────── */
export function Alert({ type = 'error', children }) {
  const map = {
    error:   { bg: 'var(--danger-light)',  color: 'var(--danger)' },
    success: { bg: 'var(--success-light)', color: 'var(--success)' },
    warning: { bg: 'var(--warning-light)', color: 'var(--warning)' },
    info:    { bg: '#e8f2fc',              color: 'var(--primary)' },
  };
  const s = map[type];
  return <div style={{ background: s.bg, color: s.color, padding: '10px 14px', borderRadius: 'var(--radius-sm)', fontSize: 13, fontWeight: 500 }}>{children}</div>;
}

/* ── Token Badge ───────────────────────────────────────────── */
export function TokenBadge({ token, size = 'md', status }) {
  const bgMap = { waiting: 'var(--primary)', called: 'var(--warning)', done: '#aaa' };
  const bg = bgMap[status] || 'var(--primary)';
  const sizes = { sm: { w: 36, fs: 14 }, md: { w: 52, fs: 18 }, lg: { w: 72, fs: 28 } };
  const s = sizes[size];
  return (
    <div style={{ minWidth: s.w, height: s.w, borderRadius: 10, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: s.fs, fontFamily: "'Playfair Display', serif", flexShrink: 0 }}>
      #{token}
    </div>
  );
}

/* ── Live Clock ────────────────────────────────────────────── */
export function Clock() {
  const [t, setT] = useState(currentTime());
  useEffect(() => {
    const id = setInterval(() => setT(currentTime()), 1000);
    return () => clearInterval(id);
  }, []);
  return <span>{t}</span>;
}

/* ── Sidebar Nav Item ──────────────────────────────────────── */
export function NavItem({ icon, label, active, onClick, badge }) {
  return (
    <div
      onClick={onClick}
      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 'var(--radius-sm)', cursor: 'pointer', background: active ? 'rgba(255,255,255,0.18)' : 'transparent', color: active ? '#fff' : 'rgba(255,255,255,0.72)', fontWeight: active ? 600 : 400, fontSize: 15, transition: '.15s', marginBottom: 2 }}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}
    >
      <span style={{ fontSize: 20, minWidth: 24, textAlign: 'center' }}>{icon}</span>
      <span style={{ flex: 1 }}>{label}</span>
      {badge != null && (
        <span style={{ background: 'var(--accent)', color: '#fff', borderRadius: 20, padding: '1px 8px', fontSize: 11, fontWeight: 700 }}>{badge}</span>
      )}
    </div>
  );
}

/* ── Dashboard Layout ──────────────────────────────────────── */
export function DashboardLayout({ title, subtitle, navItems, children, onLogout, clinicName, userRole, accent = 'var(--primary)' }) {
  // Start closed on mobile, open on desktop
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 768);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);

  useEffect(() => {
    function handleResize() {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) setSidebarOpen(true); // always open on desktop
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  function closeSidebar() { setSidebarOpen(false); }
  function toggleSidebar() { setSidebarOpen((p) => !p); }

  // On mobile, close drawer after nav click
  const wrappedNavItems = navItems.map((item) => ({
    ...item,
    onClick: () => {
      item.onClick?.();
      if (isMobile) closeSidebar();
    },
  }));

  const SidebarInner = () => (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: accent }}>
      {/* Clinic branding */}
      <div style={{ padding: '1.25rem 1rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.12)', flexShrink: 0 }}>
        {/* Close button — mobile only */}
        {isMobile && (
          <button
            onClick={closeSidebar}
            style={{ float: 'right', background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', fontSize: 18, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            ✕
          </button>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
            🏥
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 14, fontFamily: "'Playfair Display', serif", lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {clinicName || 'ClinicFlow'}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>
              {userRole}
            </div>
          </div>
        </div>
      </div>

      {/* Nav items */}
      <nav style={{ padding: '1rem .75rem', flex: 1, overflowY: 'auto' }}>
        {wrappedNavItems.map((item) => (
          <NavItem key={item.label} {...item} />
        ))}
      </nav>

      {/* Logout */}
      <div style={{ padding: '.75rem', borderTop: '1px solid rgba(255,255,255,0.12)' }}>
        <NavItem icon="🚪" label="Logout" onClick={onLogout} />
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>

      {/* ── Desktop sidebar — pushes content ── */}
      {!isMobile && (
        <div style={{ width: sidebarOpen ? 248 : 0, flexShrink: 0, overflow: 'hidden', transition: 'width .25s' }}>
          <div style={{ width: 248, height: '100%' }}>
            <SidebarInner />
          </div>
        </div>
      )}

      {/* ── Mobile: dark backdrop ── */}
      {isMobile && sidebarOpen && (
        <div
          onClick={closeSidebar}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 300 }}
        />
      )}

      {/* ── Mobile: slide-in drawer ── */}
      {isMobile && (
        <div style={{ position: 'fixed', top: 0, left: 0, height: '100%', width: 260, zIndex: 301, transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)', transition: 'transform .25s ease', overflowY: 'auto' }}>
          <SidebarInner />
        </div>
      )}

      {/* ── Main content ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        {/* Topbar */}
        <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '0 1rem', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
            <button
              onClick={toggleSidebar}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: 'var(--text-muted)', padding: '4px 6px', borderRadius: 6, lineHeight: 1, flexShrink: 0 }}
            >
              ☰
            </button>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: isMobile ? 14 : 16, fontFamily: "'Playfair Display', serif", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {title}
              </div>
              {subtitle && <div style={{ fontSize: 12, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{subtitle}</div>}
            </div>
          </div>
          {/* Date/time — hidden on very small screens */}
          <div style={{ display: isMobile ? 'none' : 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-muted)', flexShrink: 0 }}>
            <span>📅 {today()}</span>
            <span style={{ marginLeft: 6 }}>🕐 <Clock /></span>
          </div>
          {/* Mobile: show only time */}
          {isMobile && (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', flexShrink: 0 }}>
              🕐 <Clock />
            </div>
          )}
        </div>

        {/* Page content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '1rem' : '1.5rem' }}>
          {children}
        </div>
      </div>
    </div>
  );
}

/* ── Section Header ────────────────────────────────────────── */
export function SectionHeader({ title, subtitle, action }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, gap: 12, flexWrap: 'wrap' }}>
      <div>
        <h2 style={{ fontSize: 22, marginBottom: 4 }}>{title}</h2>
        {subtitle && <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

/* ── Empty State ───────────────────────────────────────────── */
export function Empty({ icon, title, desc, action }) {
  return (
    <Card style={{ textAlign: 'center', padding: '3rem' }}>
      <div style={{ fontSize: 52, marginBottom: 12 }}>{icon}</div>
      <h3 style={{ fontSize: 18, marginBottom: 8 }}>{title}</h3>
      {desc && <p style={{ color: 'var(--text-muted)', marginBottom: 20 }}>{desc}</p>}
      {action}
    </Card>
  );
}