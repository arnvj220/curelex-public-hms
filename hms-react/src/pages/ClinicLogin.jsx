import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// ── Mobile detection hook ─────────────────────────────────────────────────────
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 480);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 480);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return isMobile;
}

// ── Validation helpers ────────────────────────────────────────────────────────
const isValidEmail = (email) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  brand:       '#0a3d62',
  brandMid:    '#1565a8',
  accent:      '#00b894',
  accentLight: '#00cec9',
  textDark:    '#0a3d62',
  textMuted:   '#4a6278',
  textLight:   '#8fa8bc',
  border:      '#d0dce8',
  white:       '#ffffff',
  errBg:       '#fef2f2',
  errBorder:   '#fecaca',
  errText:     '#c0392b',
};

const makeStyles = (mob) => ({
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(150deg, #e8f4fd 0%, #f0f8ff 35%, #e8f9f5 70%, #f5fffc 100%)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: mob ? '12px 16px 20px' : '16px 20px',
    position: 'relative', overflowX: 'hidden', overflowY: 'auto',
    fontFamily: "'DM Sans', 'Segoe UI', system-ui, sans-serif",
    WebkitFontSmoothing: 'antialiased',
  },
  wrap: { position: 'relative', zIndex: 2, width: '100%', maxWidth: mob ? '100%' : 430 },
  card: {
    background: C.white, borderRadius: mob ? 14 : 18,
    padding: mob ? '20px 18px 18px' : '28px 32px',
    boxShadow: '0 20px 60px rgba(10,61,98,0.12)',
    border: '1px solid rgba(10,61,98,0.08)',
    position: 'relative', overflow: 'hidden',
  },
  cardAccentBar: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 3,
    background: `linear-gradient(90deg, ${C.brand}, ${C.brandMid}, ${C.accent})`,
  },
  secHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    marginBottom: mob ? 14 : 18, paddingBottom: mob ? 12 : 16,
    borderBottom: '1px solid #f0f4f8',
  },
  secTitle: { fontFamily: "'Georgia', 'Times New Roman', serif", fontSize: mob ? 19 : 22, color: C.textDark, fontWeight: 700 },
  field: { marginBottom: mob ? 10 : 12 },
  fieldLabel: { display: 'block', fontSize: 11.5, fontWeight: 600, color: C.textMuted, marginBottom: 6, letterSpacing: 0.3, textTransform: 'uppercase' },
  fieldInput: {
    width: '100%', padding: mob ? '13px 14px' : '12px 14px',
    border: `1.5px solid ${C.border}`, borderRadius: 8,
    fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
    fontSize: mob ? 16 : 14.5, color: C.textDark, background: C.white,
    outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s, box-shadow 0.2s',
    WebkitAppearance: 'none',
  },
  alertError: {
    padding: '11px 14px', borderRadius: 8, background: C.errBg,
    border: `1px solid ${C.errBorder}`, color: C.errText, fontSize: 13.5,
    display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 12, lineHeight: 1.4,
  },
  hintOk:  { fontSize: 11.5, color: '#00a878', fontWeight: 600, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 },
  hintErr: { fontSize: 11.5, color: '#e74c3c', marginTop: 4 },
  btnBase: {
    width: '100%', padding: mob ? '13px 20px' : '12px 20px',
    borderRadius: 10, fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
    fontSize: 15, fontWeight: 500, cursor: 'pointer', border: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    transition: 'all 0.2s', WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation',
  },
  btnPrimary: {
    background: `linear-gradient(135deg, ${C.brand}, ${C.brandMid})`,
    color: C.white, boxShadow: '0 4px 14px rgba(10,61,98,0.3)',
  },
  btnGhost: {
    background: 'none', border: 'none', cursor: 'pointer', color: C.textMuted,
    fontSize: 13, padding: '6px 0', display: 'inline-flex', alignItems: 'center', gap: 4,
    fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
    WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation',
  },
});

// ── SVG icons ─────────────────────────────────────────────────────────────────
function IcoArrowRight({ color = 'white' }) {
  return <svg width="16" height="16" fill={color} viewBox="0 0 24 24"><path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" /></svg>;
}
function IcoAlert() {
  return <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24" style={{ flexShrink: 0, marginTop: 1 }}><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" /></svg>;
}
function IcoSpinner() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
      style={{ animation: 'spin 0.8s linear infinite' }}>
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  );
}
function IcoCheck() {
  return <svg width="14" height="14" fill="none" stroke="#00b894" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5" /></svg>;
}

// ── Email Field ──────────────────────────────────────────────────────────────
function EmailField({ label, value, onChange, S, disabled, placeholder,...rest }) {
  const [touched, setTouched] = useState(false);
  const valid = isValidEmail(value);

  return (
    <div style={S.field}>
      <label style={S.fieldLabel}>{label}</label>
      <div style={{ position: 'relative' }}>
        <input
          type="email" inputMode="email" value={value}
          onChange={e => { onChange(e); }}
          onBlur={() => setTouched(true)}
          placeholder={placeholder || 'your@email.com'} disabled={disabled}
          {...rest}
          autoComplete="email"
          style={{
            ...S.fieldInput,
            borderColor: touched && value ? (valid ? '#00b894' : '#e74c3c') : '#d0dce8',
            boxShadow: touched && value
              ? valid
                ? '0 0 0 3px rgba(0,184,148,0.12)'
                : '0 0 0 3px rgba(231,76,60,0.1)'
              : 'none',
            opacity: disabled ? 0.6 : 1,
          }}
          onFocus={e => { if (!touched) e.target.style.borderColor = '#1565a8'; }}
        />
      </div>
      {touched && value && !valid && (
        <div style={S.hintErr}>Enter a valid email address (e.g. name@domain.com)</div>
      )}
      {touched && value && valid && (
        <div style={S.hintOk}><IcoCheck /> Valid email</div>
      )}
    </div>
  );
}

// ── Field Input ──────────────────────────────────────────────────────────────
function FieldInput({ label, type = 'text', value, onChange, placeholder, inputMode, S, disabled, ...rest }) {
  const [focused, setFocused] = useState(false);
  const borderColor = focused ? '#1565a8' : '#d0dce8';
  const shadow = focused ? '0 0 0 3px rgba(21,101,168,0.1)' : 'none';

  return (
    <div style={S.field}>
      <label style={S.fieldLabel}>{label}</label>
      <div style={{ position: 'relative' }}>
        <input
          type={type} inputMode={inputMode} value={value} onChange={onChange}
          placeholder={placeholder} disabled={disabled} {...rest}
          autoComplete={type === 'password' ? 'current-password' : 'off'}
          style={{
            ...S.fieldInput,
            borderColor,
            boxShadow: shadow,
            opacity: disabled ? 0.6 : 1,
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function ClinicLogin() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const mob = useIsMobile();
  const S = makeStyles(mob);

//   const [role, setRole] = useState('superadmin');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [form, setForm] = useState({
    email: '',
    password: '',
  });

  const f = (k, v) => setForm((p) => ({ ...p, [k]: v }));

//   const roles = [
//     { key: 'superadmin',   label: '⭐  Super Admin'  },
//     { key: 'admin',        label: '🔐  Clinic Admin'  },
//     { key: 'receptionist', label: '📋  Receptionist'  },
//     { key: 'doctor',       label: '👨‍⚕️  Doctor'        },
//     { key: 'pharmacist',   label: '💊  Pharmacist'    },  
//   ];

  async function handleLogin() {
    setErr('');

    if (!form.email || !form.password) {
      setErr('Please enter your email and password.');
      return;
    }

    setLoading(true);

    try {
    //   const data = await apiLogin(role, form.email, form.password);

    //   login({
    //     token: data.token,
    //     type: data.role,
    //     role: data.role,
    //     clinicId: data.clinicId,
    //     user: data.clinic || data.user || null,
    //   });

    //   navigate('/clinic');

    const result = await login(form.email, form.password);
      if (!result.success) {
        setErr(result.message || 'Login failed.');
        return;
      }
      navigate('/clinic-dashboard');

    } catch (e) {
      console.error("LOGIN ERROR:", e);
      setErr(e.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  }

  const formRef = useRef(null);

  const handleEnter = (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();

    const fields = Array.from(
      formRef.current.querySelectorAll("input, select, textarea")
    ).filter((el) => !el.disabled && el.offsetParent !== null);

    const index = fields.indexOf(e.target);
    if (index > -1 && fields[index + 1]) {
      fields[index + 1].focus();
    }
  };

  // Add spin animation
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  return (
    <div style={S.page}>
      <div style={S.wrap}>
        <div ref={formRef} onKeyDown={handleEnter} style={{ ...S.card, borderRadius: 24 }}>
          <div style={S.cardAccentBar} />

          <div style={S.secHeader}>
            <div style={S.secTitle}>Sign In</div>
          </div>


          <EmailField
            S={S}
            label="Email Address"
            value={form.email}
            onChange={e => f('email', e.target.value)}
            placeholder="your@email.com"
            disabled={loading}
          />

          <FieldInput 
            S={S} 
            label="Password" 
            type="password" 
            value={form.password} 
            onChange={e => f('password', e.target.value)} 
            placeholder="Your password" 
            disabled={loading} 
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleLogin();
              }
            }}
          />

          {err && (
            <div style={S.alertError}>
              <IcoAlert /> <span>{err}</span>
            </div>
          )}

          <button 
            style={{ ...S.btnBase, ...S.btnPrimary }} 
            onClick={handleLogin} 
            disabled={loading}
          >
            {loading ? (
              <><IcoSpinner /> Signing In…</>
            ) : (
              <>Sign In to Dashboard <IcoArrowRight /></>
            )}
          </button>

          <div style={{ textAlign:'center', marginTop:14, fontSize:13 }}>
            <span style={{ color:'#8fa8bc' }}>New clinic?</span>{' '}
            <Link 
              to="/register-clinic" 
              style={{ 
                color: '#1565a8', 
                fontWeight: 600, 
                fontSize: 13,
                textDecoration: 'none',
              }}
            >
              Register here
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}