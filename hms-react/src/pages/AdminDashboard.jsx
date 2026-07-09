// AdminDashboard.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  DashboardLayout, Card, Stat, Btn, Badge, Input, Select,
  Modal, Alert, SectionHeader, Empty, TokenBadge,
} from '../components/UI';

import { useClinicAdmin } from '../hooks/useClinicAdmin';
import { useAuth } from '../context/AuthContext';
import { isSectionVisible, canAddStaff, getPlanConfig, isFeatureVisible } from '../utils/planConfig';
import { useMemo } from 'react';
import inventoryService from '../services/inventoryService';


const IMS_BASE = import.meta.env.VITE_IMS_API_URL || 'http://localhost:5000/ims/api/v1';
const CLINIC_BASE = import.meta.env.VITE_CLINIC_API_URL || '/api/clinic';

function today() {
  return new Date().toLocaleDateString('en-PK', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function generatePrescriptionHTML(prescription, clinicName) {
  const {
    patientName, patientAge, patientGender, patientPhone,
    doctorName, doctorSpecialist, tokenNumber,
    date, diagnosis, medicines, tests, notes, followUpDate,
  } = prescription;

  const medsHTML = (medicines || []).length === 0
    ? '<tr><td colspan="5" style="text-align:center;color:#999;padding:12px">No medicines prescribed</td></tr>'
    : (medicines || []).map((m, i) => `
        <tr style="border-bottom:1px solid #eee">
          <td style="padding:8px 10px;font-weight:600">${i + 1}</td>
          <td style="padding:8px 10px;font-weight:700;color:#0a3d62">${m.name || ''}</td>
          <td style="padding:8px 10px">${m.dosage || '-'}</td>
          <td style="padding:8px 10px">${m.frequency || '-'}</td>
          <td style="padding:8px 10px">${m.duration || '-'}${m.instructions ? `<br><small style="color:#888">${m.instructions}</small>` : ''}</td>
        </tr>`).join('');

  const testsHTML = (tests || []).length === 0 ? '' : `
    <div style="margin-top:20px">
      <h3 style="font-size:14px;color:#3498db;border-bottom:2px solid #3498db;padding-bottom:6px;margin-bottom:10px">🔬 Investigations / Tests</h3>
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <thead><tr style="background:#f0f8ff">
          <th style="padding:8px 10px;text-align:left;width:40px">#</th>
          <th style="padding:8px 10px;text-align:left">Test Name</th>
          <th style="padding:8px 10px;text-align:left">Instructions</th>
        </tr></thead>
        <tbody>${(tests || []).map((t, i) => `
          <tr style="border-bottom:1px solid #eee">
            <td style="padding:8px 10px">${i + 1}</td>
            <td style="padding:8px 10px;font-weight:700;color:#0a3d62">${t.name || ''}</td>
            <td style="padding:8px 10px">${t.instructions || '-'}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>`;

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Prescription - ${patientName}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',Arial,sans-serif;color:#222;background:#fff}
    @media print{body{padding:0}.no-print{display:none!important}@page{margin:15mm;size:A4}}
    .page{max-width:780px;margin:0 auto;padding:24px}
    .header{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:16px;border-bottom:3px solid #7c3aed;margin-bottom:18px}
    .clinic-info h1{font-size:22px;color:#7c3aed;font-weight:800}.clinic-info p{font-size:12px;color:#888;margin-top:2px}
    .rx-symbol{font-size:60px;color:#7c3aed;font-weight:900;line-height:1;opacity:.15}
    .doctor-info{text-align:right}.doctor-info h2{font-size:16px;color:#0a3d62;font-weight:700}.doctor-info p{font-size:12px;color:#888}
    .patient-bar{background:linear-gradient(135deg,#f8f5ff,#f0f8ff);border:1px solid #e8e0ff;border-radius:10px;padding:14px 18px;margin-bottom:18px;display:flex;gap:24px;flex-wrap:wrap}
    .patient-field label{font-size:10px;color:#999;text-transform:uppercase;letter-spacing:.5px;display:block}
    .patient-field span{font-size:14px;font-weight:700;color:#0a3d62}
    .section-title{font-size:14px;color:#7c3aed;border-bottom:2px solid #7c3aed;padding-bottom:6px;margin-bottom:10px;font-weight:700}
    .diagnosis-box{background:#fafafa;border-left:4px solid #7c3aed;padding:10px 14px;border-radius:0 8px 8px 0;margin-bottom:18px;font-size:14px;color:#0a3d62}
    table{width:100%;border-collapse:collapse;font-size:13px}thead tr{background:#f8f5ff}
    th{padding:8px 10px;text-align:left;font-size:11px;color:#7c3aed;font-weight:700;text-transform:uppercase;letter-spacing:.5px}
    .notes-box{background:#fffbf0;border:1px solid #ffe082;border-radius:8px;padding:12px 16px;margin-top:20px;font-size:13px}
    .followup-box{background:#f0fff4;border:1px solid #a8e6cf;border-radius:8px;padding:12px 16px;margin-top:12px;font-size:13px;display:flex;align-items:center;gap:8px}
    .footer{margin-top:40px;border-top:1px solid #eee;padding-top:14px;display:flex;justify-content:space-between;align-items:flex-end;font-size:11px;color:#aaa}
    .signature-line{border-top:1px solid #aaa;padding-top:4px;text-align:center;width:160px;font-size:11px;color:#555}
    .token-badge{background:#7c3aed;color:#fff;border-radius:8px;padding:4px 12px;font-size:13px;font-weight:700}
    .print-btn{position:fixed;top:20px;right:20px;background:#7c3aed;color:#fff;border:none;padding:10px 20px;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;box-shadow:0 4px 12px rgba(124,58,237,.4);z-index:1000}
  </style></head><body>
  <button class="no-print print-btn" onclick="window.print()">🖨️ Print / Save PDF</button>
  <div class="page">
    <div class="header">
      <div class="clinic-info"><h1>${clinicName || 'ClinicFlow'}</h1><p>Medical Prescription</p></div>
      <div style="display:flex;align-items:center;gap:16px">
        <div class="doctor-info"><h2>Dr. ${doctorName || ''}</h2><p>${doctorSpecialist || 'Doctor'}</p></div>
        <div class="rx-symbol">Rx</div>
      </div>
    </div>
    <div class="patient-bar">
      <div class="patient-field"><label>Patient Name</label><span>${patientName || 'N/A'}</span></div>
      ${patientAge ? `<div class="patient-field"><label>Age</label><span>${patientAge} yrs</span></div>` : ''}
      ${patientGender ? `<div class="patient-field"><label>Gender</label><span style="text-transform:capitalize">${patientGender}</span></div>` : ''}
      ${patientPhone ? `<div class="patient-field"><label>Phone</label><span>${patientPhone}</span></div>` : ''}
      <div class="patient-field"><label>Date</label><span>${date || ''}</span></div>
      <div class="patient-field"><label>Token</label><span class="token-badge">#${tokenNumber || ''}</span></div>
    </div>
    ${diagnosis ? `<div style="margin-bottom:18px"><div class="section-title">📋 Diagnosis / Chief Complaint</div><div class="diagnosis-box">${diagnosis}</div></div>` : ''}
    <div style="margin-bottom:18px">
      <div class="section-title">💊 Medicines Prescribed</div>
      <table><thead><tr><th>#</th><th>Medicine</th><th>Dosage</th><th>Frequency</th><th>Duration / Instructions</th></tr></thead>
      <tbody>${medsHTML}</tbody></table>
    </div>
    ${testsHTML}
    ${notes ? `<div class="notes-box"><strong>📝 Advice / Notes:</strong><br><span style="margin-top:4px;display:block">${notes}</span></div>` : ''}
    ${followUpDate ? `<div class="followup-box"><span style="font-size:18px">📅</span><div><strong>Follow-up Date:</strong> ${followUpDate}</div></div>` : ''}
    <div class="footer">
      <div><div>Generated by ClinicFlow · ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div><div style="margin-top:2px">This prescription is computer generated.</div></div>
      <div class="signature-line">Dr. ${doctorName || ''}<br>Signature</div>
    </div>
  </div></body></html>`;
}

function RxPdfButton({ patientId, clinicName }) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const token = localStorage.getItem('clinic_token');
      const res = await fetch(`${CLINIC_BASE}/prescriptions/patient/${patientId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok || !data.prescriptions?.length) {
        alert('No prescription found for this patient.');
        return;
      }
      const rx = data.prescriptions[0];
      const html = generatePrescriptionHTML(rx, clinicName || rx.clinicName || '');
      const win = window.open('', '_blank');
      if (win) { win.document.write(html); win.document.close(); }
    } catch (e) {
      alert('Failed to load prescription: ' + e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      title="View Prescription PDF"
      style={{
        background: loading ? 'rgba(124,58,237,0.05)' : 'rgba(124,58,237,0.10)',
        border: '1px solid rgba(124,58,237,0.30)',
        borderRadius: 7, padding: '4px 10px',
        cursor: loading ? 'not-allowed' : 'pointer',
        fontSize: 12, color: '#7c3aed', fontWeight: 700,
        fontFamily: 'inherit', display: 'inline-flex',
        alignItems: 'center', gap: 4,
        opacity: loading ? 0.7 : 1,
        whiteSpace: 'nowrap',
      }}
    >
      {loading ? '⏳' : '📋 Rx'}
    </button>
  );
}

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

function defaultSchedule() {
  return DAYS.map((day) => ({ day, open: false, from: '09:00', to: '17:00' }));
}

function fmt24(t) {
  if (!t) return '';
  const [hStr, m] = t.split(':');
  let h = parseInt(hStr, 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  if (h > 12) h -= 12;
  if (h === 0) h = 12;
  return `${h}:${m} ${ampm}`;
}

const INDIA_STATES_DISTRICTS = {
  "Andhra Pradesh": ["Alluri Sitharama Raju","Anakapalli","Ananthapuramu","Annamayya","Bapatla","Chittoor","Dr. B.R. Ambedkar Konaseema","East Godavari","Eluru","Guntur","Kakinada","Krishna","Kurnool","Nandyal","NTR","Palnadu","Parvathipuram Manyam","Prakasam","Sri Potti Sriramulu Nellore","Sri Sathya Sai","Srikakulam","Tirupati","Visakhapatnam","Vizianagaram","West Godavari","YSR Kadapa"],
  // ... (all other states remain the same)
};

const INDIA_STATE_NAMES = Object.keys(INDIA_STATES_DISTRICTS).sort();

function PaymentBadge({ method }) {
  if (method === 'upi') {
    return (
      <span style={{ background: 'rgba(124,58,237,0.10)', color: '#7c3aed', border: '1px solid rgba(124,58,237,0.25)', borderRadius: 20, padding: '2px 10px', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>
        📲 UPI
      </span>
    );
  }
  return (
    <span style={{ background: 'rgba(0,184,148,0.10)', color: '#00a878', border: '1px solid rgba(0,184,148,0.25)', borderRadius: 20, padding: '2px 10px', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>
      💵 Cash
    </span>
  );
}

function WeeklySchedulePicker({ value, onChange, onKeyDown }) {
  const schedule = value && value.length === 7 ? value : defaultSchedule();
  function toggle(idx) {
    onChange(schedule.map((s, i) => i === idx ? { ...s, open: !s.open } : s));
  }
  function setTime(idx, key, val) {
    onChange(schedule.map((s, i) => i === idx ? { ...s, [key]: val } : s));
  }
  return (
    <div style={{ border: '1.5px solid #d0dce8', borderRadius: 12, overflow: 'hidden', background: '#fff' }}>
      <div style={{ padding: '10px 16px', background: 'linear-gradient(90deg, #0a3d62, #1565a8)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 14 }}>📅</span>
        <span style={{ color: '#fff', fontWeight: 700, fontSize: 13 }}>Weekly Availability</span>
        <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12, marginLeft: 'auto' }}>{schedule.filter(s => s.open).length} days open</span>
      </div>
      {schedule.map((slot, idx) => {
        const isWeekend = slot.day === 'Saturday' || slot.day === 'Sunday';
        return (
          <div key={slot.day} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', borderBottom: idx < 6 ? '1px solid #eef1f5' : 'none', background: slot.open ? (isWeekend ? 'rgba(0,184,148,0.04)' : '#fff') : '#fafbfc' }}>
            <button type="button" onClick={() => toggle(idx)} style={{ width: 38, height: 22, borderRadius: 11, border: 'none', cursor: 'pointer', background: slot.open ? '#00b894' : '#d0dce8', position: 'relative', flexShrink: 0, padding: 0 }}>
              <span style={{ position: 'absolute', top: 3, left: slot.open ? 18 : 3, width: 16, height: 16, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.18)', transition: 'left 0.2s', display: 'block' }} />
            </button>
            <span style={{ width: 84, fontWeight: slot.open ? 700 : 500, fontSize: 13, color: slot.open ? (isWeekend ? '#00a878' : '#0a3d62') : '#8fa8bc', flexShrink: 0 }}>{slot.day}</span>
            {slot.open ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, flexWrap: 'wrap' }}>
                <input data-schedule-input onKeyDown={onKeyDown} type="time" value={slot.from} onChange={(e) => setTime(idx, 'from', e.target.value)} style={{ padding: '4px 8px', borderRadius: 7, border: '1.5px solid #c5d5e8', fontSize: 13, color: '#0a3d62', fontWeight: 600, background: '#f4f8fc', cursor: 'pointer', outline: 'none', fontFamily: 'inherit' }} />
                <span style={{ color: '#8fa8bc', fontSize: 12, fontWeight: 500 }}>to</span>
                <input data-schedule-input onKeyDown={onKeyDown} type="time" value={slot.to} onChange={(e) => setTime(idx, 'to', e.target.value)} style={{ padding: '4px 8px', borderRadius: 7, border: '1.5px solid #c5d5e8', fontSize: 13, color: '#0a3d62', fontWeight: 600, background: '#f4f8fc', cursor: 'pointer', outline: 'none', fontFamily: 'inherit' }} />
              </div>
            ) : (
              <span style={{ color: '#b0bec5', fontSize: 12.5, fontStyle: 'italic', fontWeight: 500 }}>Closed</span>
            )}
          </div>
        );
      })}
      <div style={{ padding: '9px 14px', borderTop: '1.5px solid #eef1f5', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', background: '#f7f9fc' }}>
        <span style={{ fontSize: 11.5, color: '#8fa8bc', fontWeight: 600, marginRight: 2 }}>Quick set:</span>
        {[
          { label: 'Mon–Fri', days: ['Monday','Tuesday','Wednesday','Thursday','Friday'] },
          { label: 'Mon–Sat', days: ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'] },
          { label: 'Every day', days: DAYS },
          { label: 'Clear all', days: [] },
        ].map(({ label, days }) => (
          <button key={label} type="button"
            onClick={() => onChange(schedule.map((s) => ({ ...s, open: days.includes(s.day) })))}
            style={{ padding: '3px 10px', borderRadius: 20, border: '1.5px solid #c5d5e8', background: '#fff', color: '#0a3d62', fontSize: 11.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
          >{label}</button>
        ))}
      </div>
    </div>
  );
}

function ScheduleDisplay({ schedule }) {
  const [expanded, setExpanded] = useState(false);
  if (!schedule || schedule.length === 0) return null;
  const openDays = schedule.filter((s) => s.open);
  if (openDays.length === 0) return <div style={{ color: '#8fa8bc', fontSize: 12.5 }}>📅 No available days</div>;
  return (
    <div>
      <button type="button" onClick={(e) => { e.stopPropagation(); setExpanded((p) => !p); }}
        style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: '#1565a8', fontSize: 12.5, fontWeight: 600, fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 5 }}>
        <span>📅</span>
        <span>{openDays.length} day{openDays.length > 1 ? 's' : ''} available</span>
        <span style={{ fontSize: 10, color: '#8fa8bc' }}>{expanded ? '▲' : '▼'}</span>
      </button>
      {expanded && (
        <div style={{ marginTop: 8, border: '1px solid #e8eff6', borderRadius: 8, overflow: 'hidden' }}>
          {schedule.map((s, i) => (
            <div key={s.day} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 10px', borderBottom: i < 6 ? '1px solid #f0f4f8' : 'none', background: s.open ? '#fff' : '#fafbfc' }}>
              <span style={{ fontSize: 12, fontWeight: s.open ? 600 : 400, color: s.open ? '#0a3d62' : '#b0bec5', width: 80 }}>{s.day}</span>
              {s.open
                ? <span style={{ fontSize: 11.5, color: '#00a878', fontWeight: 600 }}>{fmt24(s.from)} – {fmt24(s.to)}</span>
                : <span style={{ fontSize: 11, color: '#b0bec5', fontStyle: 'italic' }}>Closed</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TokenLimitEditor({ doc, onSave }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(doc.dailyTokenLimit ?? 0));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => { setValue(String(doc.dailyTokenLimit ?? 0)); }, [doc.dailyTokenLimit]);

  async function save(e) {
    e.stopPropagation();
    const limit = parseInt(value, 10);
    if (isNaN(limit) || limit < 0) { setErr('Enter a valid number (0 = unlimited)'); return; }
    setBusy(true); setErr('');
    try { await onSave(doc._id, limit); setEditing(false); }
    catch (ex) { setErr(ex.message); }
    finally { setBusy(false); }
  }

  function cancel(e) { e.stopPropagation(); setEditing(false); setErr(''); setValue(String(doc.dailyTokenLimit ?? 0)); }

  const limit = doc.dailyTokenLimit ?? 0;
  return (
    <div onClick={(e) => e.stopPropagation()} style={{ marginTop: 6 }}>
      {!editing ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12.5, color: limit === 0 ? '#8fa8bc' : '#0a3d62', fontWeight: limit === 0 ? 400 : 700 }}>
            🎫 Daily limit: <span style={{ color: limit === 0 ? '#00a878' : '#0a3d62', fontWeight: 700 }}>{limit === 0 ? 'Unlimited' : limit}</span>
          </span>
          <button onClick={(e) => { e.stopPropagation(); setEditing(true); }}
            style={{ fontSize: 11, color: '#1565a8', background: 'rgba(21,101,168,0.08)', border: '1px solid rgba(21,101,168,0.2)', borderRadius: 6, padding: '2px 8px', cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit' }}>Edit</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, color: '#4a6278', fontWeight: 600, whiteSpace: 'nowrap' }}>🎫 Daily limit:</span>
            <input type="number" min="0" value={value} onChange={(e) => setValue(e.target.value)} onClick={(e) => e.stopPropagation()} placeholder="0 = unlimited"
              style={{ width: 100, padding: '4px 8px', borderRadius: 7, border: '1.5px solid #1565a8', fontSize: 13, fontWeight: 600, color: '#0a3d62', fontFamily: 'inherit', outline: 'none' }} />
            <button onClick={save} disabled={busy} style={{ padding: '4px 12px', borderRadius: 7, border: 'none', background: '#00b894', color: '#fff', fontSize: 12, fontWeight: 700, cursor: busy ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>{busy ? '…' : 'Save'}</button>
            <button onClick={cancel} style={{ padding: '4px 10px', borderRadius: 7, border: '1px solid #d0dce8', background: '#fff', color: '#4a6278', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
          </div>
          {err && <div style={{ fontSize: 11.5, color: '#e74c3c', fontWeight: 600 }}>{err}</div>}
        </div>
      )}
    </div>
  );
}

function PlanGateOverlay({ clinicName, onChoosePlan }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(8,25,50,0.60)', backdropFilter: 'blur(7px)' }}>
      <div style={{ background: '#fff', borderRadius: 24, padding: '40px 36px', maxWidth: 420, width: '90%', textAlign: 'center', boxShadow: '0 32px 90px rgba(10,61,98,0.28)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position:'absolute',top:0,left:0,right:0,height:4, background:'linear-gradient(90deg,#0a3d62,#1565a8,#00b894)' }} />
        <div style={{ fontSize:54, marginBottom:14 }}>🔒</div>
        <div style={{ fontSize:24, fontWeight:700, color:'#0a3d62', marginBottom:10 }}>No Active Plan</div>
        <div style={{ color:'#4a6278', fontSize:14, lineHeight:1.75, marginBottom:22 }}>
          <strong>{clinicName}</strong> doesn't have an active subscription.<br />Choose a plan to unlock your full dashboard.
        </div>
        <button onClick={onChoosePlan} style={{ width:'100%', padding:'14px 20px', borderRadius:11, border:'none', background:'linear-gradient(135deg,#00b894,#00cec9)', color:'#fff', fontSize:15, fontWeight:700, cursor:'pointer' }}>
          🚀 Choose a Plan to Continue
        </button>
      </div>
    </div>
  );
}

// ── Tab key → planConfig section key mapping ──
const TAB_TO_SECTION = {
  overview: 'overview',
  doctors: 'doctors',
  receptionists: 'receptionists',
  patients: 'allPatients',
  followups: 'followUps',
  settings: 'settings',
  pharmacists: 'pharmacists',
  revenue: 'revenue',
  inventory: 'inventory',
};

export default function AdminDashboard({ onChoosePlan, activePlan: propActivePlan }) {
  const { logout, clinicType, user } = useAuth();
  const { 
    refreshClinic, 
    saveClinic, 
    getUsers, 
    addUser, 
    updateUser, 
    deleteUser,
    getPatients,
    updatePatientStatus,
    updateTokenLimit,
    updateFollowUp,
    getRevenueReport,
  } = useClinicAdmin();

  const session = user;

  const [tab, setTab] = useState('overview');
  const [clinic, setClinic] = useState(null);
  const [users, setUsers] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const isLoadingRef = useRef(false);
  const initialLoadDone = useRef(false);
  const reloadTimeoutRef = useRef(null);

  const [notifications, setNotifications] = useState({
    lowStock: [], 
    outOfStock: [], 
    dueMaintenance: [], 
    overdueMaintenance: [],
  });
  const [inventoryStats, setInventoryStats] = useState(null);

  // add near your other refs
 const reload = useCallback(async (isRetry = false) => {
    if (isLoadingRef.current) {
      console.log('⏳ Already loading, skipping...');
      return;
    }

    isLoadingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      if (isRetry && retryCount > 0) {
        const delay = Math.min(1000 * Math.pow(2, retryCount), 10000);
        console.log(`⏳ Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      const [clinicData, usersData, patientsData] = await Promise.all([
        refreshClinic().catch(err => {
          console.error('❌ refreshClinic error:', err);
          return null;
        }),
        getUsers().catch(err => {
          console.error('❌ getUsers error:', err);
          return [];
        }),
        getPatients().catch(err => {
          console.error('❌ getPatients error:', err);
          return [];
        })
      ]);

      if (clinicData) {
        setClinic(clinicData);
        setError(null);
        setRetryCount(0);
      } else {
        if (retryCount < 3) {
          setRetryCount(prev => prev + 1);
          setError('Rate limited. Retrying...');
          if (reloadTimeoutRef.current) {
            clearTimeout(reloadTimeoutRef.current);
          }
          reloadTimeoutRef.current = setTimeout(() => reload(true), 2000);
          return;
        } else {
          setError('Failed to load clinic data after multiple attempts. Please refresh the page.');
        }
      }

      setUsers(Array.isArray(usersData) ? usersData : []);
      setPatients(Array.isArray(patientsData) ? patientsData : []);
      
      console.log('✅ Data loaded successfully');
    } catch (err) {
      console.error('❌ Reload error:', err);
      if (err.response?.status === 429) {
        setError('Too many requests. Please wait a moment and try again.');
        if (retryCount < 3) {
          setRetryCount(prev => prev + 1);
          if (reloadTimeoutRef.current) {
            clearTimeout(reloadTimeoutRef.current);
          }
          reloadTimeoutRef.current = setTimeout(() => reload(true), 3000);
        }
      } else {
        setError(err.message || 'Failed to load data');
      }
    } finally {
      isLoadingRef.current = false;
      setLoading(false);
    }
  }, [refreshClinic, getUsers, getPatients, retryCount]);

  // ── Initial load - only once ──
  useEffect(() => {
    if (!initialLoadDone.current) {
      initialLoadDone.current = true;
      console.log('🔄 Initial load...');
      reload();
    }
    
    return () => {
      if (reloadTimeoutRef.current) {
        clearTimeout(reloadTimeoutRef.current);
      }
    };
  }, []);

  // ── Reload on tab change - with debounce ──
  const tabTimeoutRef = useRef(null);
  useEffect(() => {
    if (tab && initialLoadDone.current) {
      if (tabTimeoutRef.current) {
        clearTimeout(tabTimeoutRef.current);
      }
      tabTimeoutRef.current = setTimeout(() => {
        console.log(`🔄 Tab changed to: ${tab}, reloading...`);
        // reload();
      }, 300);
    }
    return () => {
      if (tabTimeoutRef.current) {
        clearTimeout(tabTimeoutRef.current);
      }
    };
  }, [tab]);

  // ── Clinic type check ──
  useEffect(() => {
    if (clinicType && clinicType !== 'clinic') {
      console.log('⚠️ Not a clinic, redirecting...');
      window.location.href = '/dashboard';
    }
  }, [clinicType]);

  // ── Plan visibility check ──
  const safePlan = useMemo(() => {
    return clinic?.plan || 'lite';
  }, [clinic?.plan]);

  useEffect(() => {
    const section = TAB_TO_SECTION[tab];
    if (section && !isSectionVisible(safePlan, section)) {
      console.log(`⚠️ Section ${section} not visible in plan ${safePlan}, switching to overview`);
      setTab('overview');
    }
  }, [safePlan, tab]);

  // ── Safe data access with null checks ──
  const todayStr = new Date().toISOString().split('T')[0];
  const doctors = Array.isArray(users) ? users.filter((u) => u?.role === 'doctor') : [];
  const receptionists = Array.isArray(users) ? users.filter((u) => u?.role === 'receptionist') : [];
  const pharmacists = Array.isArray(users) ? users.filter((u) => u?.role === 'pharmacist') : [];
  
  const patientList = Array.isArray(patients) ? patients : [];
  const todayPatients = patientList.filter((p) => p?.date === todayStr) || [];
  const paidTotal = todayPatients.reduce((s, p) => s + (p?.paid || 0), 0);
  const duesTotal = todayPatients.reduce((s, p) => s + (p?.dues || 0), 0);
  const followUpPatients = patientList.filter((p) => p?.followUpDate && p.followUpDate >= todayStr) || [];

  // ── Handlers ──
  async function handleSaveClinic(updates) {
    try {
      const updated = await saveClinic(updates);
      setClinic(updated);
      return updated;
    } catch (error) {
      console.error('Failed to save clinic:', error);
      throw error;
    }
  }

  async function handleAddUser(data) {
    try {
      const newUser = await addUser(data);
      setUsers((prev) => [...prev, newUser]);
      return newUser;
    } catch (error) {
      console.error('Failed to add user:', error);
      throw error;
    }
  }

  async function handleUpdateDoctor(doctorId, updates) {
    try {
      const updated = await updateUser(doctorId, updates);
      setUsers((prev) => prev.map((u) => u._id === doctorId ? updated : u));
      return updated;
    } catch (error) {
      console.error('Failed to update doctor:', error);
      throw error;
    }
  }

  async function handleDeleteUser(id) {
    try {
      await deleteUser(id);
      setUsers((prev) => prev.filter((u) => u._id !== id));
    } catch (error) {
      console.error('Failed to delete user:', error);
      throw error;
    }
  }

  async function handleUpdateStatus(patientId, status) {
    try {
      const updated = await updatePatientStatus(patientId, status);
      setPatients((prev) => prev.map((p) => p._id === patientId ? updated : p));
    } catch (error) {
      console.error('Failed to update status:', error);
      throw error;
    }
  }

  async function handleUpdateTokenLimit(doctorId, limit) {
    try {
      const updated = await updateTokenLimit(doctorId, limit);
      setUsers((prev) => prev.map((u) => u._id === doctorId ? { ...u, dailyTokenLimit: updated.dailyTokenLimit } : u));
      return updated;
    } catch (error) {
      console.error('Failed to update token limit:', error);
      throw error;
    }
  }

  async function handleUpdateFollowUp(patientId, followUpDate, followUpNote) {
    try {
      const updated = await updateFollowUp(patientId, followUpDate, followUpNote);
      setPatients((prev) => prev.map((p) => p._id === patientId ? updated : p));
      return updated;
    } catch (error) {
      console.error('Failed to update follow-up:', error);
      throw error;
    }
  }

  // ── Loading state ──
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'DM Sans,sans-serif', color: '#4a6278' }}>
        <div>Loading dashboard…</div>
      </div>
    );
  }

  // ── Error state ──
  if (error) {
    return (
      <div style={{ padding: 32, color: '#e74c3c', textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🚫</div>
        <h2 style={{ marginBottom: 8 }}>Error loading dashboard</h2>
        <p style={{ color: '#64748b', marginBottom: 16 }}>{error}</p>
        <button 
          onClick={() => { setRetryCount(0); reload(); }} 
          style={{ padding: '10px 24px', background: '#0a3d62', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14 }}
        >
          Retry Now
        </button>
      </div>
    );
  }

  // ── No clinic ──
  if (!clinic) {
    return <div style={{ padding: 32 }}>Clinic not found.</div>;
  }

  // ── Active plan check ──
  const active = !!clinic.plan;

  const planLabel = clinic.plan === 'pro' ? '⭐ Pro Plan' :
                    clinic.plan === 'plus' ? '🏢 Plus Plan' :
                    clinic.plan === 'lite' ? '🏥 Lite Plan' : null;

  const planBadge = active ? (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      background: clinic.plan === 'pro' ? 'rgba(243,156,18,0.12)' :
                  clinic.plan === 'plus' ? 'rgba(21,101,168,0.10)' :
                  'rgba(26,122,74,0.10)',
      color: clinic.plan === 'pro' ? '#d68910' :
             clinic.plan === 'plus' ? '#1565a8' :
             '#1a7a4a',
      border: `1px solid ${clinic.plan === 'pro' ? 'rgba(243,156,18,0.28)' :
               clinic.plan === 'plus' ? 'rgba(21,101,168,0.2)' :
               'rgba(26,122,74,0.2)'}`,
      borderRadius: 20, padding: '3px 11px', fontSize: 12, fontWeight: 700,
    }}>
      {planLabel}
    </span>
  ) : (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      background: 'rgba(192,57,43,0.09)', color: '#c0392b',
      border: '1px solid rgba(192,57,43,0.18)',
      borderRadius: 20, padding: '3px 11px', fontSize: 12, fontWeight: 700,
    }}>
      🔒 No Plan
    </span>
  );

  // ── Nav items with plan filtering ──
  const navItems = [
    { icon: '📊', label: 'Overview', section: 'overview', tab: 'overview', badge: undefined },
    { icon: '👨‍⚕️', label: 'Doctors', section: 'doctors', tab: 'doctors', badge: doctors.length || undefined },
    { icon: '📋', label: 'Receptionists', section: 'receptionists', tab: 'receptionists', badge: receptionists.length || undefined },
    { icon: '👥', label: 'All Patients', section: 'allPatients', tab: 'patients', badge: undefined },
    { icon: '📅', label: 'Follow-ups', section: 'followUps', tab: 'followups', badge: followUpPatients.length || undefined },
    { icon: '⚙️', label: 'Settings', section: 'settings', tab: 'settings', badge: undefined },
    { icon: '💊', label: 'Pharmacists', section: 'pharmacists', tab: 'pharmacists', badge: pharmacists.length || undefined },
    { icon: '💰', label: 'Revenue', section: 'revenue', tab: 'revenue', badge: undefined },
  ]
    .filter(item => {
      const isVisible = isSectionVisible(safePlan, item.section);
      return isVisible;
    })
    .map(item => ({
      icon: item.icon,
      label: item.label,
      active: tab === item.tab,
      onClick: () => setTab(item.tab),
      badge: item.badge,
    }));

  // ── Check if pharmacists are allowed in this plan ──
  const planConfig = getPlanConfig(safePlan);
  const canManagePharmacists = planConfig.maxPharmacists !== 0;

  return (
    <>
      <div style={{ filter: active ? 'none' : 'blur(3px) brightness(0.88)', pointerEvents: active ? 'auto' : 'none', userSelect: active ? 'auto' : 'none', transition: 'filter 0.3s' }}>
        <DashboardLayout
          title="Admin Dashboard"
          subtitle={`Welcome, ${clinic.owner || 'Admin'}`}
          navItems={navItems}
          onLogout={logout}
          clinicName={clinic.name || 'Clinic'}
          userRole="Administrator"
          accent="var(--primary)"
          headerExtra={planBadge}
        >
          {tab === 'overview' && <Overview 
            clinic={clinic} 
            doctors={doctors} 
            todayPatients={todayPatients} 
            paidTotal={paidTotal} 
            duesTotal={duesTotal} 
          />}
          {tab === 'doctors' && <DoctorManagement doctors={doctors} patients={patientList} onAdd={handleAddUser} onDelete={handleDeleteUser} onUpdateTokenLimit={handleUpdateTokenLimit} onUpdateDoctor={handleUpdateDoctor} activePlan={safePlan} reload={reload} />}
          {tab === 'receptionists' && <ReceptionistManagement receptionists={receptionists} onAdd={handleAddUser} onDelete={handleDeleteUser} activePlan={safePlan} />}
          {tab === 'patients' && <AllPatients patients={patientList} clinicName={clinic?.name} />}
          {tab === 'followups' && <AdminFollowUps patients={patientList} doctors={doctors} onUpdateFollowUp={handleUpdateFollowUp} />}
          {tab === 'settings' && <ClinicSettings clinic={clinic} onSave={handleSaveClinic} />}
          {tab === 'pharmacists' && canManagePharmacists && <PharmacistManagement pharmacists={pharmacists} onAdd={handleAddUser} onDelete={handleDeleteUser} activePlan={safePlan} />}
          {tab === 'pharmacists' && !canManagePharmacists && (
            <Card style={{ textAlign: 'center', padding: 40 }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>💊</div>
              <h3 style={{ marginBottom: 8 }}>Pharmacy Management Not Available</h3>
              <p style={{ color: '#64748b', maxWidth: 400, margin: '0 auto' }}>
                Your {safePlan} plan does not include pharmacy management. 
                Upgrade to Plus or Pro to manage pharmacists and inventory.
              </p>
              {safePlan === 'lite' && (
                <button 
                  onClick={onChoosePlan}
                  style={{ marginTop: 16, padding: '10px 24px', background: '#0f4c81', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}
                >
                  Upgrade Plan →
                </button>
              )}
            </Card>
          )}
          {tab === 'revenue' && <RevenueSection patients={patientList} doctors={doctors} pharmacists={pharmacists} session={session} getRevenueReport={getRevenueReport} />}
        </DashboardLayout>
      </div>
      {!active && <PlanGateOverlay clinicName={clinic.name} onChoosePlan={onChoosePlan} />}
    </>
  );
}



// ── Overview Component ──
function Overview({ clinic, doctors, todayPatients, paidTotal, duesTotal }) {
  return (
    <div>
      <SectionHeader title="Clinic Overview" subtitle={`Today's summary — ${today()}`} />
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:16, marginBottom:24 }}>
        <Stat label="Today's Tokens" value={todayPatients.length} icon="🎫" color="var(--primary)" />
        <Stat label="Today's Revenue" value={`₹${paidTotal.toLocaleString()}`} icon="💰" color="var(--success)" />
        <Stat label="Pending Dues" value={`₹${duesTotal.toLocaleString()}`} icon="⚠️" color="var(--danger)" />
      </div>

      {/* Doctor Queue Summary */}
      {doctors.length > 0 && (
        <div style={{ marginBottom:24 }}>
          <h3 style={{ fontSize:17, marginBottom:14 }}>Doctor Queue Summary</h3>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))', gap:12 }}>
            {doctors.map((doc) => {
              const docPatients = todayPatients.filter((p) => String(p.doctorId) === String(doc._id));
              const waiting = docPatients.filter((p) => p.status === 'waiting').length;
              const done    = docPatients.filter((p) => p.status === 'done').length;
              const limit   = doc.dailyTokenLimit ?? 0;
              return (
                <Card key={doc._id}>
                  <div style={{ display:'flex',alignItems:'center',gap:10,marginBottom:10 }}>
                    <div style={{ width:38,height:38,borderRadius:10,background:'var(--primary-light)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18 }}>👨‍⚕️</div>
                    <div>
                      <div style={{ fontWeight:600,fontSize:14 }}>{doc.name}</div>
                      <div style={{ fontSize:11,color:'var(--text-muted)' }}>{doc.specialist}</div>
                    </div>
                  </div>
                  <div style={{ display:'flex',gap:8,flexWrap:'wrap' }}>
                    <Badge color="blue">🎫 {docPatients.length}{limit > 0 ? `/${limit}` : ''} Total</Badge>
                    <Badge color="yellow">⏳ {waiting} Wait</Badge>
                    <Badge color="green">✓ {done} Done</Badge>
                    {limit > 0 && docPatients.length >= limit && <Badge color="red">🚫 Limit reached</Badge>}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Patient Queue Table */}
      <Card noPad>
        <div style={{ padding:'14px 18px',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',justifyContent:'space-between' }}>
          <h3 style={{ fontSize:16 }}>📋 Today's Patient Queue</h3>
          <Badge color="blue">{todayPatients.length} patients</Badge>
        </div>
        {todayPatients.length === 0 ? (
          <div style={{ textAlign:'center',padding:'2.5rem',color:'var(--text-muted)' }}>
            <div style={{ fontSize:40,marginBottom:8 }}>🪑</div>
            <div>No patients registered today yet.</div>
          </div>
        ) : (
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%',borderCollapse:'collapse',fontSize:13 }}>
              <thead>
                <tr style={{ background:'var(--surface2)' }}>
                  {['Token','Patient','Doctor','Symptoms','Paid Rs.','Dues Rs.','Time','Payment','Status'].map((h) => (
                    <th key={h} style={{ padding:'10px 14px',textAlign:'left',fontWeight:600,color:'var(--text-muted)',whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...todayPatients].sort((a,b)=>a.token-b.token).map((p) => (
                  <tr key={p._id} style={{ borderBottom:'1px solid var(--border)' }}>
                    <td style={{ padding:'10px 14px' }}><TokenBadge token={p.token} size="sm" status={p.status} /></td>
                    <td style={{ padding:'10px 14px',fontWeight:500 }}>{p.name}</td>
                    <td style={{ padding:'10px 14px',color:'var(--text-muted)' }}>{p.doctorName}</td>
                    <td style={{ padding:'10px 14px',color:'var(--text-muted)',maxWidth:130,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{p.symptoms}</td>
                    <td style={{ padding:'10px 14px',color:'var(--success)',fontWeight:500 }}>{p.paid||0}</td>
                    <td style={{ padding:'10px 14px',color:p.dues>0?'var(--danger)':'var(--text-muted)',fontWeight:p.dues>0?600:400 }}>{p.dues||0}</td>
                    <td style={{ padding:'10px 14px',color:'var(--text-muted)',whiteSpace:'nowrap' }}>{p.time}</td>
                    <td style={{ padding:'10px 14px' }}><PaymentBadge method={p.paymentMethod} /></td>
                    <td style={{ padding:'10px 14px' }}>
                      <Badge color={p.status==='called'?'green':p.status==='done'?'gray':'blue'}>
                        {p.status==='waiting'?'Waiting':p.status==='called'?'Called':'Done'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}


// ── Inventory Tab Component ──
function InventoryTab({ notifications, inventoryStats, clinicId, onRefresh }) {
  const navigate = useNavigate();

  // Ensure notifications is always an object with arrays
  const safeNotifications = notifications || { lowStock: [], outOfStock: [], dueMaintenance: [], overdueMaintenance: [] };

  return (
    <div>
      <SectionHeader 
        title="📦 Inventory Management" 
        subtitle="Monitor stock levels and maintenance schedules" 
        action={
          <Btn onClick={() => navigate('/dashboard/inventory')}>
            Open Full Inventory →
          </Btn>
        }
      />

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 20 }}>
        <StatCard label="Total Items" value={inventoryStats?.totalItems || 0} icon="📦" color="#dbeafe" />
        <StatCard label="Low Stock" value={safeNotifications.lowStock?.length || 0} icon="⚠️" color="#fef3c7" />
        <StatCard label="Out of Stock" value={safeNotifications.outOfStock?.length || 0} icon="❌" color="#fee2e2" />
        <StatCard label="Overdue Maintenance" value={safeNotifications.overdueMaintenance?.length || 0} icon="🔧" color="#fee2e2" />
        <StatCard label="Total Value" value={`₹${(inventoryStats?.totalValue || 0).toLocaleString()}`} icon="💰" color="#d1fae5" />
      </div>

      {/* Overdue Maintenance Alert */}
      {safeNotifications.overdueMaintenance?.length > 0 && (
        <div style={{ background: '#fef2f2', border: '2px solid #ef4444', borderRadius: 12, padding: 16, marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <span style={{ fontSize: 28 }}>🚨</span>
            <div>
              <h3 style={{ fontSize: 16, margin: 0, color: '#dc2626' }}>Critical: Overdue Maintenance!</h3>
              <p style={{ fontSize: 13, margin: '4px 0 0', color: '#991b1b' }}>
                {safeNotifications.overdueMaintenance.length} item(s) past maintenance due date
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {safeNotifications.overdueMaintenance.slice(0, 5).map(item => (
              <div key={item._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#fff', borderRadius: 6, border: '1px solid #fecaca' }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{item.name}</div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>
                    Serial: {item.serialNumber || 'N/A'} · 
                    Due: {item.nextMaintenanceDate ? new Date(item.nextMaintenanceDate).toLocaleDateString() : 'N/A'}
                  </div>
                </div>
                <button 
                  onClick={() => navigate('/dashboard/inventory')} 
                  style={{ padding: '4px 12px', background: '#0f4c81', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}
                >
                  View
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Low Stock Alert */}
      {safeNotifications.lowStock?.length > 0 && (
        <div style={{ background: '#fefce8', border: '1px solid #fde047', borderRadius: 12, padding: 16, marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <span style={{ fontSize: 24 }}>⚠️</span>
            <div>
              <h3 style={{ fontSize: 15, margin: 0, color: '#854d0e' }}>Low Stock Alert</h3>
              <p style={{ fontSize: 12, margin: '2px 0 0', color: '#713f12' }}>
                {safeNotifications.lowStock.length} item(s) running low
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {safeNotifications.lowStock.slice(0, 10).map(item => (
              <div key={item._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#fff', borderRadius: 6, border: '1px solid #fde68a' }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{item.name}</div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>
                    {item.quantity} {item.unit || 'units'} left · Reorder at {item.reorderLevel || 0}
                  </div>
                </div>
                <button 
                  onClick={() => navigate('/dashboard/inventory?tab=stock')} 
                  style={{ padding: '4px 12px', background: '#f59e0b', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}
                >
                  Restock
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Out of Stock Alert */}
      {safeNotifications.outOfStock?.length > 0 && (
        <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 12, padding: 16, marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <span style={{ fontSize: 24 }}>❌</span>
            <div>
              <h3 style={{ fontSize: 15, margin: 0, color: '#dc2626' }}>Out of Stock!</h3>
              <p style={{ fontSize: 12, margin: '2px 0 0', color: '#991b1b' }}>
                {safeNotifications.outOfStock.length} item(s) completely out of stock
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {safeNotifications.outOfStock.slice(0, 10).map(item => (
              <div key={item._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#fff', borderRadius: 6, border: '1px solid #fca5a5' }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{item.name}</div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>
                    {item.category || 'General'} · Need restock
                  </div>
                </div>
                <button 
                  onClick={() => navigate('/dashboard/inventory?tab=stock')} 
                  style={{ padding: '4px 12px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}
                >
                  Restock Now
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {safeNotifications.lowStock?.length === 0 && 
       safeNotifications.outOfStock?.length === 0 && 
       safeNotifications.overdueMaintenance?.length === 0 && (
        <Card style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
          <h3 style={{ marginBottom: 8 }}>All Clear!</h3>
          <p style={{ color: '#64748b' }}>No inventory alerts at this time.</p>
        </Card>
      )}
    </div>
  );
}


// ── AllPatients Component ──
export function AllPatients({ patients, clinicName = '' }) {
  const patientList = Array.isArray(patients) ? patients : [];
  
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('today');
  const [receptionistFilter, setReceptionistFilter] = useState('all');

  const todayStr = new Date().toISOString().split('T')[0];

  const receptionists = Array.from(
    new Map(
      patientList
        .filter((p) => p?.receptionistId && p?.receptionistName)
        .map((p) => [String(p.receptionistId), p.receptionistName])
    ).entries()
  ).map(([id, name]) => ({ id, name }));

  const filtered = patientList
    .filter((p) => {
      if (!p) return false;
      const matchDate = dateFilter === 'all' || p.date === todayStr;
      const matchSearch = !search || (p.name && p.name.toLowerCase().includes(search.toLowerCase())) || String(p.token).includes(search);
      const matchReceptionist =
        receptionistFilter === 'all' ||
        (receptionistFilter === 'admin' && !p.receptionistId) ||
        String(p.receptionistId) === receptionistFilter;
      return matchDate && matchSearch && matchReceptionist;
    })
    .sort((a, b) => {
      if (!a || !b) return 0;
      if (a.date !== b.date) return b.date.localeCompare(a.date);
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

  const grouped = filtered.reduce((acc, p) => {
    if (!p || !p.doctorName) return acc;
    if (!acc[p.doctorName]) acc[p.doctorName] = [];
    acc[p.doctorName].push(p);
    return acc;
  }, {});

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 2 }}>All Patients</h2>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{patientList.length} total patients</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16 }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name or token…"
          style={{
            padding: '8px 12px', borderRadius: 9,
            border: '1.5px solid #d0dce8', fontSize: 13,
            fontFamily: 'inherit', outline: 'none',
            color: '#0a3d62', background: '#fff',
            minWidth: 180, flex: '1 1 180px',
          }}
        />

        <select
          value={receptionistFilter}
          onChange={(e) => setReceptionistFilter(e.target.value)}
          style={{
            padding: '8px 12px', borderRadius: 9,
            border: receptionistFilter !== 'all' ? '1.5px solid #1565a8' : '1.5px solid #d0dce8',
            fontSize: 13, fontFamily: 'inherit', outline: 'none',
            color: receptionistFilter !== 'all' ? '#1565a8' : '#0a3d62',
            background: receptionistFilter !== 'all' ? 'rgba(21,101,168,0.06)' : '#fff',
            cursor: 'pointer', fontWeight: receptionistFilter !== 'all' ? 700 : 400,
            minWidth: 170,
          }}
        >
          <option value="all">📋 All Receptionists</option>
          <option value="admin">Registered by Admin</option>
          {receptionists.map((r) => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>

        <select
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          style={{
            padding: '8px 12px', borderRadius: 9,
            border: '1.5px solid #d0dce8', fontSize: 13,
            fontFamily: 'inherit', outline: 'none',
            color: '#0a3d62', background: '#fff',
            cursor: 'pointer', minWidth: 110,
          }}
        >
          <option value="today">Today</option>
          <option value="all">All Time</option>
        </select>

        {receptionistFilter !== 'all' && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '6px 12px',
            background: 'rgba(21,101,168,0.08)',
            border: '1px solid rgba(21,101,168,0.25)',
            borderRadius: 20, fontSize: 12, color: '#1565a8', fontWeight: 600,
          }}>
            🏷 {receptionistFilter === 'admin' ? 'Admin' : receptionists.find((r) => r.id === receptionistFilter)?.name}
            <button
              onClick={() => setReceptionistFilter('all')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e74c3c', fontWeight: 700, fontSize: 14, lineHeight: 1, padding: 0 }}
            >✕</button>
          </div>
        )}
      </div>

      {Object.keys(grouped).length === 0 ? (
        <Card>
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            No patients found
          </div>
        </Card>
      ) : (
        Object.entries(grouped).map(([doctorName, pats]) => (
          <div key={doctorName} style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, padding: '10px 16px', background: 'var(--primary-light)', borderRadius: 10 }}>
              <span style={{ fontSize: 18 }}>👨‍⚕️</span>
              <span style={{ fontWeight: 700, fontSize: 15 }}>{doctorName}</span>
              <Badge color="blue">{pats.length} patients</Badge>
            </div>
            <Card noPad>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: 'var(--surface2)' }}>
                      {['Token','Name','Age','Phone','Symptoms','Paid Rs.','Dues Rs.','Payment','Date','Time','Receptionist','Status','Prescription'].map((h) => (
                        <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)', whiteSpace: 'nowrap', borderBottom: '1px solid var(--border)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pats.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map((p) => (
                      <tr key={p._id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '10px 14px' }}><TokenBadge token={p.token} size="sm" status={p.status} /></td>
                        <td style={{ padding: '10px 14px', fontWeight: 500 }}>{p.name}</td>
                        <td style={{ padding: '10px 14px', color: 'var(--text-muted)' }}>{p.age || '-'}</td>
                        <td style={{ padding: '10px 14px', color: 'var(--text-muted)' }}>{p.phone || '-'}</td>
                        <td style={{ padding: '10px 14px', color: 'var(--text-muted)', maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.symptoms}</td>
                        <td style={{ padding: '10px 14px', color: 'var(--success)', fontWeight: 500 }}>{p.paid || 0}</td>
                        <td style={{ padding: '10px 14px', color: p.dues > 0 ? 'var(--danger)' : 'var(--text-muted)', fontWeight: p.dues > 0 ? 600 : 400 }}>{p.dues || 0}</td>
                        <td style={{ padding: '10px 14px' }}><PaymentBadge method={p.paymentMethod} /></td>
                        <td style={{ padding: '10px 14px', color: 'var(--text-muted)' }}>{p.date}</td>
                        <td style={{ padding: '10px 14px', color: 'var(--text-muted)' }}>{p.time}</td>
                        <td style={{ padding: '10px 14px' }}>
                          {p.receptionistName ? (
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: 4,
                              background: 'rgba(21,101,168,0.08)', color: '#1565a8',
                              border: '1px solid rgba(21,101,168,0.20)',
                              borderRadius: 20, padding: '2px 9px', fontSize: 11, fontWeight: 700,
                            }}>
                              📋 {p.receptionistName}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Admin</span>
                          )}
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <Badge color={p.status === 'called' ? 'green' : p.status === 'done' ? 'gray' : 'blue'}>{p.status}</Badge>
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <RxPdfButton patientId={p._id} clinicName={clinicName} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        ))
      )}
    </div>
  );
}

// // ── Other components (Overview, RevenueSection, AdminFollowUps, DoctorManagement, etc.) ──
// // These remain the same as in your original file with proper null checks added where needed

// // ── Note: The rest of the components (Overview, RevenueSection, AdminFollowUps, 
// // DoctorManagement, DoctorCard, ReceptionistManagement, PharmacistManagement, 
// // ClinicSettings, EditDoctorModal, etc.) remain the same as in your original file.
// // Just make sure to add null checks (Array.isArray() checks) wherever you access
// // arrays like patients, doctors, etc.

// export { Overview, RevenueSection, AdminFollowUps, DoctorManagement, ReceptionistManagement, PharmacistManagement, ClinicSettings, EditDoctorModal };

/* ── Overview ─────────────────────────────────────────────────── */
// function Overview({ clinic, doctors, todayPatients, paidTotal, duesTotal }) {
//   return (
//     <div>
//       <SectionHeader title="Clinic Overview" subtitle={`Today's summary — ${today()}`} />
//       <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(175px,1fr))', gap:16, marginBottom:24 }}>
//         <Stat label="Today's Tokens"      value={todayPatients.length}       icon="🎫" color="var(--primary)" />
//         <Stat label="Today's Revenue Rs." value={paidTotal.toLocaleString()} icon="💰" color="var(--success)" />
//         <Stat label="Pending Dues Rs."    value={duesTotal.toLocaleString()} icon="⚠️" color="var(--danger)" />
//       </div>
//       {doctors.length > 0 && (
//         <div style={{ marginBottom:24 }}>
//           <h3 style={{ fontSize:17, marginBottom:14 }}>Doctor Queue Summary</h3>
//           <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))', gap:12 }}>
//             {doctors.map((doc) => {
//               const docPatients = todayPatients.filter((p) => String(p.doctorId) === String(doc._id));
//               const waiting = docPatients.filter((p) => p.status === 'waiting').length;
//               const done    = docPatients.filter((p) => p.status === 'done').length;
//               const limit   = doc.dailyTokenLimit ?? 0;
//               return (
//                 <Card key={doc._id}>
//                   <div style={{ display:'flex',alignItems:'center',gap:10,marginBottom:10 }}>
//                     <div style={{ width:38,height:38,borderRadius:10,background:'var(--primary-light)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18 }}>👨‍⚕️</div>
//                     <div>
//                       <div style={{ fontWeight:600,fontSize:14 }}>{doc.name}</div>
//                       <div style={{ fontSize:11,color:'var(--text-muted)' }}>{doc.specialist}</div>
//                     </div>
//                   </div>
//                   <div style={{ display:'flex',gap:8,flexWrap:'wrap' }}>
//                     <Badge color="blue">🎫 {docPatients.length}{limit > 0 ? `/${limit}` : ''} Total</Badge>
//                     <Badge color="yellow">⏳ {waiting} Wait</Badge>
//                     <Badge color="green">✓ {done} Done</Badge>
//                     {limit > 0 && docPatients.length >= limit && <Badge color="red">🚫 Limit reached</Badge>}
//                   </div>
//                 </Card>
//               );
//             })}
//           </div>
//         </div>
//       )}
//       <Card noPad>
//         <div style={{ padding:'14px 18px',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',justifyContent:'space-between' }}>
//           <h3 style={{ fontSize:16 }}>📋 Today's Patient Queue</h3>
//           <Badge color="blue">{todayPatients.length} patients</Badge>
//         </div>
//         {todayPatients.length === 0 ? (
//           <div style={{ textAlign:'center',padding:'2.5rem',color:'var(--text-muted)' }}>
//             <div style={{ fontSize:40,marginBottom:8 }}>🪑</div>
//             <div>No patients registered today yet.</div>
//           </div>
//         ) : (
//           <div style={{ overflowX:'auto' }}>
//             <table style={{ width:'100%',borderCollapse:'collapse',fontSize:13 }}>
//               <thead>
//                 <tr style={{ background:'var(--surface2)' }}>
//                   {['Token','Patient','Doctor','Symptoms','Paid Rs.','Dues Rs.','Time','Payment','Status'].map((h) => (
//                     <th key={h} style={{ padding:'10px 14px',textAlign:'left',fontWeight:600,color:'var(--text-muted)',whiteSpace:'nowrap' }}>{h}</th>
//                   ))}
//                 </tr>
//               </thead>
//               <tbody>
//                 {[...todayPatients].sort((a,b)=>a.token-b.token).map((p) => (
//                   <tr key={p._id} style={{ borderBottom:'1px solid var(--border)' }}>
//                     <td style={{ padding:'10px 14px' }}><TokenBadge token={p.token} size="sm" status={p.status} /></td>
//                     <td style={{ padding:'10px 14px',fontWeight:500 }}>{p.name}</td>
//                     <td style={{ padding:'10px 14px',color:'var(--text-muted)' }}>{p.doctorName}</td>
//                     <td style={{ padding:'10px 14px',color:'var(--text-muted)',maxWidth:130,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{p.symptoms}</td>
//                     <td style={{ padding:'10px 14px',color:'var(--success)',fontWeight:500 }}>{p.paid||0}</td>
//                     <td style={{ padding:'10px 14px',color:p.dues>0?'var(--danger)':'var(--text-muted)',fontWeight:p.dues>0?600:400 }}>{p.dues||0}</td>
//                     <td style={{ padding:'10px 14px',color:'var(--text-muted)',whiteSpace:'nowrap' }}>{p.time}</td>
//                     <td style={{ padding:'10px 14px' }}><PaymentBadge method={p.paymentMethod} /></td>
//                     <td style={{ padding:'10px 14px' }}>
//                       <Badge color={p.status==='called'?'green':p.status==='done'?'gray':'blue'}>
//                         {p.status==='waiting'?'Waiting':p.status==='called'?'Called':'Done'}
//                       </Badge>
//                     </td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>
//         )}
//       </Card>
//     </div>
//   );
// }

/* ── Revenue Section ─────────────────────────────────────────────── */
function RevenueSection({ patients, doctors, pharmacists, session, getRevenueReport }) {
  const todayStr = new Date().toISOString().split('T')[0];
  const [fromDate, setFromDate] = useState(todayStr);
  const [toDate,   setToDate]   = useState(todayStr);
  const [doctorFilter, setDoctorFilter] = useState('all');
  const [imsData,    setImsData]    = useState(null);
  const [imsLoading, setImsLoading] = useState(false);
  const [imsError,   setImsError]   = useState('');

  useEffect(() => { fetchImsRevenue(); }, [fromDate, toDate]);

  async function fetchImsRevenue() {
    setImsLoading(true); setImsError(''); setImsData(null);
    try {
      const token = session?.token || localStorage.getItem('clinic_token') || '';
      const res = await getRevenueReport(fromDate, toDate);
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.message || `IMS error: ${res.status}`); }
      setImsData(res);
    } catch (e) { setImsError(e.message); }
    finally { setImsLoading(false); }
  }

  function inRange(d) { return d && d >= fromDate && d <= toDate; }
  const filteredPatients = patients.filter(p => inRange(p.date));

  const allDoctorStats = doctors.map(doc => {
    const docPats   = filteredPatients.filter(p => String(p.doctorId) === String(doc._id));
    const totalPaid = docPats.reduce((s, p) => s + (p.paid || 0), 0);
    const totalDues = docPats.reduce((s, p) => s + (p.dues || 0), 0);
    const upiPaid   = docPats.filter(p => p.paymentMethod === 'upi').reduce((s, p) => s + (p.paid || 0), 0);
    const cashPaid  = docPats.filter(p => p.paymentMethod !== 'upi').reduce((s, p) => s + (p.paid || 0), 0);
    const upiCount  = docPats.filter(p => p.paymentMethod === 'upi').length;
    const cashCount = docPats.filter(p => p.paymentMethod !== 'upi').length;
    return { ...doc, docPats, totalPaid, totalDues, upiPaid, cashPaid, upiCount, cashCount, totalPatients: docPats.length };
  });

  const visibleDoctorStats = doctorFilter === 'all' ? allDoctorStats : allDoctorStats.filter(d => String(d._id) === doctorFilter);
  const grandPaid  = allDoctorStats.reduce((s, d) => s + d.totalPaid, 0);
  const grandDues  = allDoctorStats.reduce((s, d) => s + d.totalDues, 0);
  const grandPats  = allDoctorStats.reduce((s, d) => s + d.totalPatients, 0);
  const grandUpi   = allDoctorStats.reduce((s, d) => s + d.upiPaid, 0);
  const grandCash  = allDoctorStats.reduce((s, d) => s + d.cashPaid, 0);

  const imsTotalSales  = imsData?.totalSales  ?? imsData?.total   ?? imsData?.revenue ?? 0;
  const imsTotalProfit = imsData?.totalProfit ?? imsData?.profit  ?? 0;
  const imsTotalOrders = imsData?.totalOrders ?? imsData?.count   ?? imsData?.invoices ?? 0;

  const dateInput = { padding: '9px 12px', borderRadius: 9, border: '1.5px solid #d0dce8', fontSize: 13, fontFamily: 'inherit', color: '#0a3d62', background: '#fff', outline: 'none', cursor: 'pointer' };
  const sectionHead = { display: 'flex', alignItems: 'center', gap: 10, padding: '12px 18px', borderRadius: 12, marginBottom: 16, fontWeight: 700, fontSize: 15 };

  return (
    <div>
      <SectionHeader title="Revenue" subtitle="Track income and outstanding dues across the clinic" />
      <Card style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#4a6278', whiteSpace: 'nowrap' }}>📅 Date Range:</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <input type="date" value={fromDate} max={toDate} onChange={e => setFromDate(e.target.value)} style={dateInput} />
            <span style={{ fontSize: 13, color: '#8fa8bc', fontWeight: 500 }}>to</span>
            <input type="date" value={toDate} min={fromDate} onChange={e => setToDate(e.target.value)} style={dateInput} />
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginLeft: 'auto' }}>
            {[
              { label: 'Today', from: todayStr, to: todayStr },
              { label: 'This Week', from: (() => { const d = new Date(); d.setDate(d.getDate() - d.getDay() + 1); return d.toISOString().split('T')[0]; })(), to: todayStr },
              { label: 'This Month', from: todayStr.slice(0,7) + '-01', to: todayStr },
              { label: 'Last 30 Days', from: (() => { const d = new Date(); d.setDate(d.getDate() - 29); return d.toISOString().split('T')[0]; })(), to: todayStr },
            ].map(({ label, from, to }) => (
              <button key={label} onClick={() => { setFromDate(from); setToDate(to); }}
                style={{ padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', background: fromDate === from && toDate === to ? '#0a3d62' : '#fff', color: fromDate === from && toDate === to ? '#fff' : '#0a3d62', border: fromDate === from && toDate === to ? '1.5px solid #0a3d62' : '1.5px solid #d0dce8' }}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      <div style={{ marginBottom: 36 }}>
        <div style={{ ...sectionHead, background: 'linear-gradient(135deg, rgba(10,61,98,0.07) 0%, rgba(21,101,168,0.10) 100%)', border: '1.5px solid rgba(21,101,168,0.18)' }}>
          <span style={{ fontSize: 20 }}>👨‍⚕️</span>
          <span style={{ color: '#0a3d62' }}>Doctor Revenue</span>
          <span style={{ marginLeft: 'auto', fontSize: 12, color: '#4a6278', fontWeight: 400 }}>{fromDate === toDate ? fromDate : `${fromDate} → ${toDate}`}</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'Total Collected', value: `Rs. ${grandPaid.toLocaleString()}`, icon: '💰', color: '#00a878', bg: 'rgba(0,184,148,0.08)',  border: 'rgba(0,184,148,0.20)'  },
            { label: 'Total Dues',      value: `Rs. ${grandDues.toLocaleString()}`, icon: '⚠️', color: '#e74c3c', bg: 'rgba(231,76,60,0.08)',  border: 'rgba(231,76,60,0.20)'  },
            { label: 'Total Patients',  value: grandPats,                            icon: '👥', color: '#1565a8', bg: 'rgba(21,101,168,0.08)', border: 'rgba(21,101,168,0.20)' },
            { label: 'UPI Collected',   value: `Rs. ${grandUpi.toLocaleString()}`,  icon: '📲', color: '#7c3aed', bg: 'rgba(124,58,237,0.08)', border: 'rgba(124,58,237,0.20)' },
            { label: 'Cash Collected',  value: `Rs. ${grandCash.toLocaleString()}`, icon: '💵', color: '#d68910', bg: 'rgba(214,137,16,0.08)', border: 'rgba(214,137,16,0.20)' },
          ].map(({ label, value, icon, color, bg, border }) => (
            <div key={label} style={{ background: bg, border: `1.5px solid ${border}`, borderRadius: 12, padding: '14px 16px' }}>
              <div style={{ fontSize: 20, marginBottom: 6 }}>{icon}</div>
              <div style={{ fontWeight: 800, fontSize: 18, color, lineHeight: 1 }}>{value}</div>
              <div style={{ fontSize: 11.5, color: '#8fa8bc', marginTop: 4 }}>{label}</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#4a6278' }}>Filter by doctor:</span>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button onClick={() => setDoctorFilter('all')} style={{ padding: '6px 16px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', background: doctorFilter === 'all' ? '#0a3d62' : '#fff', color: doctorFilter === 'all' ? '#fff' : '#0a3d62', border: doctorFilter === 'all' ? '1.5px solid #0a3d62' : '1.5px solid #d0dce8' }}>All Doctors</button>
            {doctors.map(doc => (
              <button key={doc._id} onClick={() => setDoctorFilter(String(doc._id))} style={{ padding: '6px 16px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', background: doctorFilter === String(doc._id) ? '#0a3d62' : '#fff', color: doctorFilter === String(doc._id) ? '#fff' : '#0a3d62', border: doctorFilter === String(doc._id) ? '1.5px solid #0a3d62' : '1.5px solid #d0dce8' }}>{doc.name}</button>
            ))}
          </div>
        </div>
        {visibleDoctorStats.length === 0 ? (
          <Empty icon="👨‍⚕️" title="No doctors found" desc="No doctors match the current filter." />
        ) : (
          <Card noPad>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: 'var(--surface2)' }}>
                    {['Doctor','Specialist','Patients','Total Collected','Pending Dues','UPI Amount','Cash Amount','UPI Txns','Cash Txns'].map(h => (
                      <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)', whiteSpace: 'nowrap', borderBottom: '1px solid var(--border)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visibleDoctorStats.map((doc, i) => (
                    <tr key={doc._id} style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? '#fff' : 'var(--surface2, #fafbfc)' }}>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0 }}>👨‍⚕️</div>
                          <span style={{ fontWeight: 700, color: '#0a3d62' }}>{doc.name}</span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 14px' }}><Badge color="blue">{doc.specialist || '—'}</Badge></td>
                      <td style={{ padding: '12px 14px', fontWeight: 700, color: '#1565a8', textAlign: 'center' }}>{doc.totalPatients}</td>
                      <td style={{ padding: '12px 14px' }}><span style={{ fontWeight: 800, color: '#00a878', fontSize: 14 }}>Rs. {doc.totalPaid.toLocaleString()}</span></td>
                      <td style={{ padding: '12px 14px' }}><span style={{ fontWeight: doc.totalDues > 0 ? 800 : 400, color: doc.totalDues > 0 ? '#e74c3c' : '#8fa8bc' }}>{doc.totalDues > 0 ? `Rs. ${doc.totalDues.toLocaleString()}` : '—'}</span></td>
                      <td style={{ padding: '12px 14px' }}><span style={{ fontWeight: 700, color: '#7c3aed' }}>{doc.upiPaid > 0 ? `Rs. ${doc.upiPaid.toLocaleString()}` : '—'}</span></td>
                      <td style={{ padding: '12px 14px' }}><span style={{ fontWeight: 700, color: '#d68910' }}>{doc.cashPaid > 0 ? `Rs. ${doc.cashPaid.toLocaleString()}` : '—'}</span></td>
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        {doc.upiCount > 0 ? <span style={{ background: 'rgba(124,58,237,0.10)', color: '#7c3aed', border: '1px solid rgba(124,58,237,0.25)', borderRadius: 20, padding: '2px 10px', fontSize: 12, fontWeight: 700 }}>📲 {doc.upiCount}</span> : <span style={{ color: '#b0bec5' }}>—</span>}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        {doc.cashCount > 0 ? <span style={{ background: 'rgba(0,184,148,0.10)', color: '#00a878', border: '1px solid rgba(0,184,148,0.25)', borderRadius: 20, padding: '2px 10px', fontSize: 12, fontWeight: 700 }}>💵 {doc.cashCount}</span> : <span style={{ color: '#b0bec5' }}>—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
                {doctorFilter === 'all' && visibleDoctorStats.length > 1 && (
                  <tfoot>
                    <tr style={{ background: 'linear-gradient(135deg, rgba(10,61,98,0.06), rgba(21,101,168,0.08))', borderTop: '2px solid rgba(21,101,168,0.20)' }}>
                      <td colSpan={2} style={{ padding: '12px 14px', fontWeight: 800, color: '#0a3d62', fontSize: 13 }}>📊 Grand Total</td>
                      <td style={{ padding: '12px 14px', fontWeight: 800, color: '#1565a8', textAlign: 'center' }}>{grandPats}</td>
                      <td style={{ padding: '12px 14px', fontWeight: 800, color: '#00a878', fontSize: 14 }}>Rs. {grandPaid.toLocaleString()}</td>
                      <td style={{ padding: '12px 14px', fontWeight: 800, color: grandDues > 0 ? '#e74c3c' : '#8fa8bc' }}>{grandDues > 0 ? `Rs. ${grandDues.toLocaleString()}` : '—'}</td>
                      <td style={{ padding: '12px 14px', fontWeight: 800, color: '#7c3aed' }}>{grandUpi > 0 ? `Rs. ${grandUpi.toLocaleString()}` : '—'}</td>
                      <td style={{ padding: '12px 14px', fontWeight: 800, color: '#d68910' }}>{grandCash > 0 ? `Rs. ${grandCash.toLocaleString()}` : '—'}</td>
                      <td colSpan={2} />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </Card>
        )}
      </div>

      <div>
        <div style={{ ...sectionHead, background: 'linear-gradient(135deg, rgba(0,184,148,0.07) 0%, rgba(0,184,148,0.12) 100%)', border: '1.5px solid rgba(0,184,148,0.22)' }}>
          <span style={{ fontSize: 20 }}>💊</span>
          <span style={{ color: '#00796b' }}>Pharmacy Revenue</span>
          <span style={{ marginLeft: 'auto', fontSize: 12, color: '#4a6278', fontWeight: 400 }}>from Inventory Management System</span>
        </div>
        {imsLoading && (
          <Card style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>⏳</div>
            <div style={{ fontSize: 14 }}>Fetching pharmacy revenue from IMS…</div>
          </Card>
        )}
        {imsError && !imsLoading && (
          <div style={{ marginBottom: 16 }}>
            <Alert type="error">⚠️ Could not load IMS data: {imsError} <button onClick={fetchImsRevenue} style={{ marginLeft: 12, padding: '3px 12px', borderRadius: 7, border: '1px solid rgba(192,57,43,0.3)', background: '#fff', color: '#c0392b', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Retry</button></Alert>
            <div style={{ marginTop: 16 }}><PharmacistRevenueList pharmacists={pharmacists} /></div>
          </div>
        )}
        {imsData && !imsLoading && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
              {[
                { label: 'Total Sales',  value: `Rs. ${Number(imsTotalSales).toLocaleString()}`,  icon: '💊', color: '#00a878', bg: 'rgba(0,184,148,0.08)',  border: 'rgba(0,184,148,0.20)'  },
                { label: 'Total Profit', value: `Rs. ${Number(imsTotalProfit).toLocaleString()}`, icon: '📈', color: '#1565a8', bg: 'rgba(21,101,168,0.08)', border: 'rgba(21,101,168,0.20)' },
                { label: 'Total Orders', value: Number(imsTotalOrders),                           icon: '🧾', color: '#d68910', bg: 'rgba(214,137,16,0.08)', border: 'rgba(214,137,16,0.20)' },
              ].map(({ label, value, icon, color, bg, border }) => (
                <div key={label} style={{ background: bg, border: `1.5px solid ${border}`, borderRadius: 12, padding: '14px 16px' }}>
                  <div style={{ fontSize: 20, marginBottom: 6 }}>{icon}</div>
                  <div style={{ fontWeight: 800, fontSize: 18, color, lineHeight: 1 }}>{value}</div>
                  <div style={{ fontSize: 11.5, color: '#8fa8bc', marginTop: 4 }}>{label}</div>
                </div>
              ))}
            </div>
            {imsData.pharmacists && imsData.pharmacists.length > 0 && (
              <Card noPad style={{ marginBottom: 16 }}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: 14, color: '#0a3d62' }}>Per-Pharmacist Breakdown</div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: 'var(--surface2)' }}>
                        {['Pharmacist','Sales Amount','Orders','Profit'].map(h => (
                          <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {imsData.pharmacists.map((ph, i) => (
                        <tr key={ph._id || i} style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? '#fff' : 'var(--surface2)' }}>
                          <td style={{ padding: '10px 14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(0,184,148,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>💊</div>
                              <span style={{ fontWeight: 600 }}>{ph.name || ph.pharmacistName || '—'}</span>
                            </div>
                          </td>
                          <td style={{ padding: '10px 14px', fontWeight: 700, color: '#00a878' }}>Rs. {Number(ph.sales || ph.totalSales || 0).toLocaleString()}</td>
                          <td style={{ padding: '10px 14px', color: '#1565a8', fontWeight: 600 }}>{ph.orders || ph.totalOrders || '—'}</td>
                          <td style={{ padding: '10px 14px', fontWeight: 700, color: '#1565a8' }}>{ph.profit ? `Rs. ${Number(ph.profit).toLocaleString()}` : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
            <PharmacistRevenueList pharmacists={pharmacists} />
          </>
        )}
        {!imsData && !imsLoading && !imsError && <PharmacistRevenueList pharmacists={pharmacists} />}
      </div>
    </div>
  );
}

function PharmacistRevenueList({ pharmacists }) {
  if (pharmacists.length === 0) return null;
  return (
    <Card>
      <div style={{ fontWeight: 700, fontSize: 14, color: '#0a3d62', marginBottom: 12 }}>💊 Registered Pharmacists</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
        {pharmacists.map(ph => (
          <div key={ph._id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'rgba(0,184,148,0.05)', border: '1px solid rgba(0,184,148,0.18)', borderRadius: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(0,184,148,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>💊</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#0a3d62', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ph.name}</div>
              <div style={{ fontSize: 11, color: '#8fa8bc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ph.email}</div>
            </div>
            <a href="/ims" target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} style={{ fontSize: 11, color: '#1565a8', fontWeight: 700, textDecoration: 'none', background: 'rgba(21,101,168,0.07)', border: '1px solid rgba(21,101,168,0.2)', borderRadius: 6, padding: '3px 8px', whiteSpace: 'nowrap', flexShrink: 0 }}>IMS ↗</a>
          </div>
        ))}
      </div>
    </Card>
  );
}

function AdminFollowUps({ patients, doctors, onUpdateFollowUp }) {
  const todayStr = new Date().toISOString().split('T')[0];
  const [doctorFilter, setDoctorFilter] = useState('all');
  const [dateFilter,   setDateFilter]   = useState('upcoming');
  const [search,       setSearch]       = useState('');
  const [editingId,    setEditingId]    = useState(null);
  const [editDate,     setEditDate]     = useState('');
  const [editNote,     setEditNote]     = useState('');
  const [busy,         setBusy]         = useState(false);

  const followUpPatients = patients.filter((p) => p.followUpDate);
  const filtered = followUpPatients.filter((p) => {
    const matchDoctor = doctorFilter === 'all' || String(p.doctorId) === doctorFilter;
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || (p.phone && p.phone.includes(search));
    const matchDate =
      dateFilter === 'all'      ? true :
      dateFilter === 'today'    ? p.followUpDate === todayStr :
      dateFilter === 'upcoming' ? p.followUpDate >= todayStr :
      dateFilter === 'overdue'  ? p.followUpDate < todayStr  : true;
    return matchDoctor && matchSearch && matchDate;
  }).sort((a, b) => (a.followUpDate || '').localeCompare(b.followUpDate || ''));

  function startEdit(p) { setEditingId(p._id); setEditDate(p.followUpDate || ''); setEditNote(p.followUpNote || ''); }
  function cancelEdit() { setEditingId(null); setEditDate(''); setEditNote(''); }

  async function saveEdit(patientId) {
    setBusy(true);
    try { await onUpdateFollowUp(patientId, editDate, editNote); setEditingId(null); }
    catch (e) { alert(e.message); }
    finally { setBusy(false); }
  }

  async function clearFollowUp(patientId) {
    if (!window.confirm('Clear this follow-up?')) return;
    try { await onUpdateFollowUp(patientId, null, ''); } catch (e) { alert(e.message); }
  }

  function getFollowUpStatus(followUpDate) {
    if (!followUpDate) return null;
    if (followUpDate < todayStr)   return { label: 'Overdue',  bg: 'rgba(231,76,60,0.08)',  text: '#e74c3c' };
    if (followUpDate === todayStr) return { label: 'Today',    bg: 'rgba(0,184,148,0.10)',  text: '#00a878' };
    return                                { label: 'Upcoming', bg: 'rgba(21,101,168,0.08)', text: '#1565a8' };
  }

  const todayCount    = followUpPatients.filter((p) => p.followUpDate === todayStr).length;
  const upcomingCount = followUpPatients.filter((p) => p.followUpDate > todayStr).length;
  const overdueCount  = followUpPatients.filter((p) => p.followUpDate < todayStr).length;

  return (
    <div>
      <SectionHeader title="Follow-ups" subtitle={`${followUpPatients.length} patients with scheduled follow-ups`} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Today',    value: todayCount,              icon: '📅', color: '#00a878', bg: 'rgba(0,184,148,0.08)',   border: 'rgba(0,184,148,0.20)',   filter: 'today'    },
          { label: 'Upcoming', value: upcomingCount,           icon: '🔮', color: '#1565a8', bg: 'rgba(21,101,168,0.07)', border: 'rgba(21,101,168,0.18)',  filter: 'upcoming' },
          { label: 'Overdue',  value: overdueCount,            icon: '⚠️', color: '#e74c3c', bg: 'rgba(231,76,60,0.07)',  border: 'rgba(231,76,60,0.18)',   filter: 'overdue'  },
          { label: 'All',      value: followUpPatients.length, icon: '📋', color: '#4a6278', bg: 'rgba(74,98,120,0.06)',  border: 'rgba(74,98,120,0.15)',   filter: 'all'      },
        ].map((s) => (
          <div key={s.label} onClick={() => setDateFilter(s.filter)}
            style={{ background: dateFilter === s.filter ? s.bg : '#fff', border: `1.5px solid ${dateFilter === s.filter ? s.border : 'var(--border, #e4eaf1)'}`, borderRadius: 12, padding: '14px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 22 }}>{s.icon}</span>
            <div>
              <div style={{ fontWeight: 800, fontSize: 20, color: dateFilter === s.filter ? s.color : 'var(--text, #1a2a3a)', lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search patient name or phone…" style={{ flex: '1 1 200px', minWidth: 0 }} />
        <Select value={doctorFilter} onChange={(e) => setDoctorFilter(e.target.value)} style={{ flex: '0 0 180px' }}>
          <option value="all">All Doctors</option>
          {doctors.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
        </Select>
      </div>
      {filtered.length === 0 ? (
        <Empty icon="📅" title="No follow-ups found" desc="No follow-ups match your filters." />
      ) : (
        <Card noPad>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--surface2)' }}>
                  {['Patient','Phone','Doctor','Last Visit','Follow-up Date','Note','Status','Actions'].map((h) => (
                    <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)', whiteSpace: 'nowrap', borderBottom: '1px solid var(--border)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, i) => {
                  const st = getFollowUpStatus(p.followUpDate);
                  const isEditing = editingId === p._id;
                  return (
                    <tr key={p._id} style={{ borderBottom: '1px solid var(--border)', background: isEditing ? 'rgba(21,101,168,0.03)' : (i % 2 === 0 ? '#fff' : 'var(--surface2, #fafbfc)') }}>
                      <td style={{ padding: '11px 14px' }}>
                        <div style={{ fontWeight: 700 }}>{p.name}</div>
                        {p.age && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Age {p.age}{p.gender ? ` · ${p.gender}` : ''}</div>}
                      </td>
                      <td style={{ padding: '11px 14px', color: 'var(--text-muted)' }}>{p.phone || '—'}</td>
                      <td style={{ padding: '11px 14px' }}><div style={{ fontWeight: 600, color: '#1565a8' }}>{p.doctorName}</div></td>
                      <td style={{ padding: '11px 14px', color: 'var(--text-muted)', fontSize: 12.5 }}>{p.date || '—'}</td>
                      <td style={{ padding: '11px 14px' }}>
                        {isEditing
                          ? <input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} style={{ padding: '4px 8px', borderRadius: 7, border: '1.5px solid #1565a8', fontSize: 13 }} />
                          : <span style={{ fontWeight: 700, color: st?.text }}>{p.followUpDate}</span>}
                      </td>
                      <td style={{ padding: '11px 14px', maxWidth: 160 }}>
                        {isEditing
                          ? <input type="text" value={editNote} onChange={(e) => setEditNote(e.target.value)} placeholder="Note" style={{ width: '100%', padding: '4px 8px', borderRadius: 7, border: '1.5px solid #1565a8', fontSize: 13 }} />
                          : <span style={{ color: p.followUpNote ? 'var(--text)' : 'var(--text-muted)', fontStyle: p.followUpNote ? 'normal' : 'italic', fontSize: 12.5 }}>{p.followUpNote || 'No note'}</span>}
                      </td>
                      <td style={{ padding: '11px 14px' }}>
                        {st && <span style={{ background: st.bg, color: st.text, border: `1px solid ${st.text}30`, borderRadius: 20, padding: '3px 10px', fontSize: 11.5, fontWeight: 700 }}>{st.label}</span>}
                      </td>
                      <td style={{ padding: '11px 14px' }}>
                        {isEditing ? (
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button onClick={() => saveEdit(p._id)} disabled={busy} style={{ padding: '4px 12px', borderRadius: 7, border: 'none', background: '#00b894', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>{busy ? '…' : '✓ Save'}</button>
                            <button onClick={cancelEdit} style={{ padding: '4px 10px', borderRadius: 7, border: '1px solid #d0dce8', background: '#fff', color: '#4a6278', fontSize: 12, cursor: 'pointer' }}>Cancel</button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button onClick={() => startEdit(p)} style={{ padding: '4px 10px', borderRadius: 7, border: '1px solid rgba(21,101,168,0.25)', background: 'rgba(21,101,168,0.06)', color: '#1565a8', fontSize: 12, cursor: 'pointer' }}>✏️ Edit</button>
                            <button onClick={() => clearFollowUp(p._id)} style={{ padding: '4px 10px', borderRadius: 7, border: '1px solid rgba(231,76,60,0.25)', background: 'rgba(231,76,60,0.06)', color: '#e74c3c', fontSize: 12, cursor: 'pointer' }}>🗑</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

function DoctorDetailModal({ doc, patients, onClose, onUpdateTokenLimit }) {
  const todayStr    = new Date().toISOString().split('T')[0];
  const allDocPat   = patients.filter((p) => String(p.doctorId) === String(doc._id));
  const todayDocPat = allDocPat.filter((p) => p.date === todayStr).sort((a, b) => a.token - b.token);
  const waiting = todayDocPat.filter((p) => p.status === 'waiting').length;
  const called  = todayDocPat.filter((p) => p.status === 'called').length;
  const done    = todayDocPat.filter((p) => p.status === 'done').length;
  const revenue = todayDocPat.reduce((s, p) => s + (p.paid || 0), 0);
  const dues    = todayDocPat.reduce((s, p) => s + (p.dues || 0), 0);
  return (
    <Modal title="" onClose={onClose}>
      <div style={{ background: 'linear-gradient(135deg, #0a3d62 0%, #1565a8 100%)', borderRadius: 14, padding: '20px 22px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ width: 56, height: 56, borderRadius: 14, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, flexShrink: 0 }}>👨‍⚕️</div>
        <div style={{ flex: 1 }}>
          <div style={{ color: '#fff', fontWeight: 800, fontSize: 18 }}>{doc.name}</div>
          <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>{doc.specialist}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>Consultation Fee</div>
          <div style={{ color: '#f9ca24', fontWeight: 800, fontSize: 20 }}>Rs. {doc.fee || 0}</div>
        </div>
      </div>
      <div style={{ marginBottom: 16 }}><TokenLimitEditor doc={doc} onSave={onUpdateTokenLimit} /></div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 16 }}>
        {[
          { label: 'Waiting', value: waiting, color: '#1565a8' },
          { label: 'In Room', value: called,  color: '#d68910' },
          { label: 'Done',    value: done,    color: '#00a878' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: '#f7f9fc', borderRadius: 10, padding: '12px 10px', textAlign: 'center' }}>
            <div style={{ fontWeight: 800, fontSize: 22, color }}>{value}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>{label}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <div style={{ flex: 1, background: 'rgba(0,184,148,0.07)', borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ fontWeight: 800, color: '#00a878' }}>Rs. {revenue.toLocaleString()}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Today's Revenue</div>
        </div>
        <div style={{ flex: 1, background: 'rgba(231,76,60,0.07)', borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ fontWeight: 800, color: '#e74c3c' }}>Rs. {dues.toLocaleString()}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Today's Dues</div>
        </div>
      </div>
    </Modal>
  );
}

const SPECIALISTS = [
  'General Physician','Cardiologist','Dermatologist','ENT Specialist',
  'Gynecologist','Neurologist','Orthopedic','Pediatrician','Psychiatrist',
  'Urologist','Dentist','Eye Specialist','Diabetologist','Chest Specialist',
];
function EmailInputWithCheck({ label, value, onChange, placeholder, setErr ,onKeyDown}) {
  const [checking, setChecking] = useState(false);
  const [emailErr, setEmailErr] = useState('');

  async function handleBlur(e) {
    const email = e.target.value.trim();
    setEmailErr('');
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
    setChecking(true);
    try {
      const token = localStorage.getItem('clinic_token') || '';
      const res = await fetch(
        `${import.meta.env.VITE_CLINIC_API_URL}/users/check-email?email=${encodeURIComponent(email)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      if (data.exists) {
        setEmailErr('This email is already registered. Please use a different email.');
        setErr('This email is already registered. Please use a different email.');
      } else {
        setErr('');
      }
    } catch {}
    finally { setChecking(false); }
  }

  return (
    <div>
      <label style={{ fontSize: 12, fontWeight: 600, color: '#4a6278', marginBottom: 5, display: 'block', textTransform: 'uppercase', letterSpacing: 0.4 }}>{label}</label>
      <div style={{ position: 'relative' }}>
        <input
          type="email"
          value={value}
          onChange={onChange}
          onBlur={handleBlur}
          placeholder={placeholder}
          onKeyDown={onKeyDown}
          style={{
            width: '100%', padding: '9px 12px', borderRadius: 9,
            border: `1.5px solid ${emailErr ? '#e74c3c' : '#d0dce8'}`,
            fontSize: 13, fontFamily: 'inherit', outline: 'none',
            color: '#0a3d62', background: '#fff', boxSizing: 'border-box',
            paddingRight: checking ? 36 : 12,
          }}
        />
        {checking && (
          <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: '#1565a8' }}>⏳</span>
        )}
      </div>
      {emailErr && (
        <div style={{ fontSize: 11.5, color: '#e74c3c', marginTop: 4, fontWeight: 600 }}>
          ⚠️ {emailErr}
        </div>
      )}
    </div>
  );
}
function DoctorManagement({ doctors, patients, onAdd, onDelete, onUpdateTokenLimit, onUpdateDoctor, activePlan, reload }) {
  const [show, setShow] = useState(false);
  const [detailDoc, setDetailDoc] = useState(null);
  const [editingDoctor, setEditingDoctor] = useState(null); // Add this
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ 
    name: '', 
    specialist: '', 
    phone: '', 
    email: '', 
    password: '', 
    fee: '', 
    schedule: defaultSchedule() 
  });
  
  const f = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  // Check if can add more doctors based on plan
  const canAdd = canAddStaff(activePlan, 'doctors', doctors.length);
  const planConfig = getPlanConfig(activePlan);
  const maxDoctors = planConfig.maxDoctors === -1 ? '∞' : planConfig.maxDoctors;

  function handleEnterKey(e) {
    if (e.key !== "Enter") return;
  
    e.preventDefault();
  
    // If currently in Fee field -> Add Doctor
    if (
      e.target.type === "number" &&
      e.target.placeholder === "500"
    ) {
      addDoctor();
      return;
    }
  
    const focusable = Array.from(
      document.querySelectorAll(
        "input, select, textarea"
      )
    ).filter(
      el => !el.disabled && el.offsetParent !== null
    );
  
    const index = focusable.indexOf(e.target);
  
    if (index > -1 && index < focusable.length - 1) {
      focusable[index + 1].focus();
    }
  }

  async function addDoctor() {
    // Check plan limit before adding
    if (!canAdd.allowed) {
      setErr(`❌ ${canAdd.upgradeNeeded} allows only ${canAdd.limit} doctor(s). Please upgrade to add more.`);
      return;
    }
    
    if (!form.name || !form.email || !form.password || !form.specialist) { 
  setErr('Fill all required fields.'); 
  return; 
}

if (form.phone && form.phone.replace(/\D/g, '').length !== 10) {
  setErr('Phone number must be exactly 10 digits.');
  return;
}

setBusy(true); 
setErr('');
    try {
      await onAdd({ role: 'doctor', ...form, fee: parseFloat(form.fee) || 0 });
      setForm({ name: '', specialist: '', phone: '', email: '', password: '', fee: '', schedule: defaultSchedule() });
      setShow(false);
    } catch(e) { 
      setErr(e.message); 
    } finally { 
      setBusy(false); 
    }
  }

  async function removeDoctor(id) {
    if (!window.confirm('Remove this doctor?')) return;
    try { 
      await onDelete(id); 
    } catch(e) { 
      alert(e.message); 
    }
  }

  // Add this function to handle doctor updates
  async function handleUpdateDoctor(doctorId, updates) {
    try {
      const updatedDoctor = await onUpdateDoctor(doctorId, updates);
      // Refresh the doctors list
      await reload();
      return updatedDoctor;
    } catch (e) {
      console.log(e);
      throw e;
    }
  }

  const syncedDetailDoc = detailDoc ? doctors.find((d) => d._id === detailDoc._id) || detailDoc : null;

  return (
    <div>
      <SectionHeader 
        title="Doctors" 
        subtitle={`${doctors.length}/${maxDoctors} doctors registered`}
        action={
          <Btn 
            onClick={() => setShow(true)} 
            disabled={!canAdd.allowed}
            title={!canAdd.allowed ? `Upgrade to ${canAdd.upgradeNeeded} to add more doctors` : ''}
          >
            {canAdd.allowed ? '+ Add Doctor' : `🔒 Limit: ${canAdd.limit} doctor(s)`}
          </Btn>
        }
      />
      
      {/* Show warning when limit is reached */}
      {!canAdd.allowed && doctors.length >= canAdd.limit && (
        <Alert type="warning" style={{ marginBottom: 16 }}>
          ⚠️ You've reached the limit of {canAdd.limit} doctor(s) for your {activePlan} plan.
        </Alert>
      )}
      
      {doctors.length === 0 ? (
        <Empty 
          icon="👨‍⚕️" 
          title="No doctors yet" 
          desc="Add your first doctor to get started." 
          action={<Btn onClick={() => setShow(true)}>+ Add First Doctor</Btn>} 
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(290px,1fr))', gap: 16 }}>
          {doctors.map((doc) => (
            <DoctorCard 
              key={doc._id} 
              doc={doc} 
              onRemove={(e) => { e.stopPropagation(); removeDoctor(doc._id); }} 
              onEdit={() => setEditingDoctor(doc)}  // Add this prop
              onClick={() => setDetailDoc(doc)} 
              onUpdateTokenLimit={onUpdateTokenLimit} 
            />
          ))}
        </div>
      )}
      
      {/* Doctor Detail Modal */}
      {syncedDetailDoc && (
        <DoctorDetailModal 
          doc={syncedDetailDoc} 
          patients={patients} 
          onClose={() => setDetailDoc(null)} 
          onUpdateTokenLimit={onUpdateTokenLimit} 
        />
      )}
      
      {/* Add Doctor Modal */}
      {show && (
        <Modal title="Add New Doctor" onClose={() => { setShow(false); setErr(''); }}>
          <div style={{ display: 'grid', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Input 
                label="Doctor Name *" 
                value={form.name} 
                onChange={(e) => f('name', e.target.value)} 
                placeholder="Dr. Ahmed Ali" 
                onKeyDown={handleEnterKey}
              />
              <Select 
                label="Specialist *" 
                value={form.specialist} 
                onChange={(e) => f('specialist', e.target.value)}
                onKeyDown={handleEnterKey}
              >
                <option value="">-- Select --</option>
                {SPECIALISTS.map((s) => <option key={s} value={s}>{s}</option>)}
              </Select>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <EmailInputWithCheck
  label="Login Email *"
  value={form.email}
  onChange={(e) => f('email', e.target.value)}
  placeholder="doctor@clinic.com"
  setErr={setErr}
  onKeyDown={handleEnterKey}

/>
              <Input 
                label="Password *" 
                type="password" 
                value={form.password} 
                onChange={(e) => f('password', e.target.value)} 
                placeholder="••••••" 
                onKeyDown={handleEnterKey}
              />
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Input 
  label="Phone" 
  value={form.phone} 
  onChange={(e) => f('phone', e.target.value.replace(/\D/g, '').slice(0, 10))} 
  placeholder="10-digit mobile number"
  inputMode="numeric"
  onKeyDown={handleEnterKey}
/>
              <Input 
                label="Consultation Fee (Rs.)" 
                type="number" 
                value={form.fee} 
                onChange={(e) => f('fee', e.target.value)} 
                placeholder="500" 
                onKeyDown={handleEnterKey}
              />
            </div>
            
            <WeeklySchedulePicker 
              value={form.schedule} 
              onChange={(s) => f('schedule', s)} 
              onKeyDown={handleEnterKey}
            />
            
            {err && <Alert type="error">{err}</Alert>}
            
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <Btn variant="ghost" onClick={() => { setShow(false); setErr(''); }}>Cancel</Btn>
              <Btn onClick={addDoctor} disabled={busy}>{busy ? 'Adding…' : 'Add Doctor'}</Btn>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit Doctor Modal */}
      {editingDoctor && (
        <EditDoctorModal 
          doctor={editingDoctor}
          onClose={() => setEditingDoctor(null)}
          onSave={handleUpdateDoctor}
        />
      )}
    </div>
  );
}
function DoctorCard({ doc, onRemove, onClick, onEdit, onUpdateTokenLimit }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div role="button" tabIndex={0} onClick={onClick} onKeyDown={(e) => e.key === 'Enter' && onClick()}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{ background: '#fff', borderRadius: 14, border: hovered ? '1.5px solid #1565a8' : '1.5px solid var(--border)', padding: '16px 16px 14px', cursor: 'pointer', position: 'relative', transition: 'transform 0.15s, box-shadow 0.15s', transform: hovered ? 'translateY(-3px)' : 'translateY(0)', boxShadow: hovered ? '0 8px 28px rgba(10,61,98,0.14)' : '0 1px 4px rgba(0,0,0,0.06)' }}>
      <div style={{ display:'flex', alignItems:'flex-start', gap:12, marginBottom:12 }}>
        <div style={{ width:48, height:48, borderRadius:12, background:'var(--primary-light)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, flexShrink:0 }}>👨‍⚕️</div>
        <div style={{ flex:1 }}>
          <div style={{ fontWeight:700, fontSize:15, marginBottom:4 }}>{doc.name}</div>
          <Badge color="blue">{doc.specialist}</Badge>
        </div>
        <button 
            onClick={(e) => { e.stopPropagation(); onEdit && onEdit(); }} 
            style={{ background:'none', border:'none', cursor:'pointer', color:'#1565a8', fontSize:16, padding:4 }}
            title="Edit doctor"
          >
            ✏️
          </button>
        <button onClick={(e) => { e.stopPropagation(); onRemove(e); }} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--danger)', fontSize:16, padding:4 }}>🗑</button>
      </div>
      <div style={{ display:'grid', gap:6, fontSize:13 }}>
        {doc.phone && <div style={{ color:'var(--text-muted)' }}>📞 {doc.phone}</div>}
        {doc.email && <div style={{ color:'var(--text-muted)' }}>✉️ {doc.email}</div>}
        {doc.fee   && <div style={{ color:'var(--text-muted)' }}>💰 Rs. {doc.fee} per consultation</div>}
        <TokenLimitEditor doc={doc} onSave={onUpdateTokenLimit} />
        <ScheduleDisplay schedule={doc.schedule} />
      </div>
    </div>
  );
}

function ReceptionistManagement({ receptionists, onAdd, onDelete, activePlan }) {
  const [show, setShow] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ 
    name: '', 
    email: '', 
    phone: '', 
    password: '' 
  });
  const f = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  // Check if can add more receptionists based on plan
  const canAdd = canAddStaff(activePlan, 'receptionists', receptionists.length);
  const planConfig = getPlanConfig(activePlan);
  const maxReceptionists = planConfig.maxReceptionists === -1 ? '∞' : planConfig.maxReceptionists;

  function handleEnterKey(e) {
    if (e.key !== "Enter") return;
  
    e.preventDefault();
  
    const focusable = Array.from(
      document.querySelectorAll(
        "input, select, textarea, button"
      )
    ).filter(el => !el.disabled);
  
    const index = focusable.indexOf(e.target);
  
    // Last input field (Phone)
    if (index > -1 && index < focusable.length - 3) {
      focusable[index + 1].focus();
    } else {
      addRec();
    }
  }

  async function addRec() {
    // Check plan limit before adding
    if (!canAdd.allowed) {
      setErr(`❌ ${canAdd.upgradeNeeded} allows only ${canAdd.limit} receptionist(s). Please upgrade to add more.`);
      return;
    }
    
    if (!form.name || !form.email || !form.password) { 
  setErr('Fill all required fields.'); 
  return; 
}

// ADD THIS
if (form.phone && form.phone.replace(/\D/g, '').length !== 10) {
  setErr('Phone number must be exactly 10 digits.');
  return;
}
// END ADD

setBusy(true); 
setErr('');
    try {
      await onAdd({ role: 'receptionist', ...form });
      setForm({ name: '', email: '', phone: '', password: '' });
      setShow(false);
    } catch(e) { 
      setErr(e.message); 
    } finally { 
      setBusy(false); 
    }
  }

  async function removeRec(id) {
    if (!window.confirm('Remove this receptionist?')) return;
    try { 
      await onDelete(id); 
    } catch(e) { 
      alert(e.message); 
    }
  }

  return (
    <div>
      <SectionHeader 
        title="Receptionists" 
        subtitle={`${receptionists.length}/${maxReceptionists} receptionists registered`}
        action={
          <Btn 
            onClick={() => setShow(true)} 
            disabled={!canAdd.allowed}
            title={!canAdd.allowed ? `Upgrade to ${canAdd.upgradeNeeded} to add more receptionists` : ''}
          >
            {canAdd.allowed ? '+ Add Receptionist' : `🔒 Limit: ${canAdd.limit} receptionist(s)`}
          </Btn>
        }
      />
      
      {/* Show warning when limit is reached */}
      {!canAdd.allowed && receptionists.length >= canAdd.limit && (
        <Alert type="warning" style={{ marginBottom: 16 }}>
          ⚠️ You've reached the limit of {canAdd.limit} receptionist(s) for your {activePlan} plan.
          
        </Alert>
      )}
      
      {receptionists.length === 0 ? (
        <Empty 
          icon="📋" 
          title="No receptionists yet" 
          desc="Add a receptionist to handle patient registration." 
          action={<Btn onClick={() => setShow(true)}>+ Add Receptionist</Btn>} 
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 16 }}>
          {receptionists.map((rec) => (
            <Card key={rec._id}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: 22, background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>📋</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{rec.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Receptionist</div>
                </div>
                <button 
                  onClick={() => removeRec(rec._id)} 
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', fontSize: 16, padding: 4 }}
                >
                  🗑
                </button>
              </div>
              <div style={{ fontSize: 13 }}>
                <div style={{ color: 'var(--text-muted)' }}>✉️ {rec.email}</div>
                {rec.phone && <div style={{ color: 'var(--text-muted)', marginTop: 4 }}>📞 {rec.phone}</div>}
              </div>
            </Card>
          ))}
        </div>
      )}
      
      {/* Add Receptionist Modal */}
      {show && (
        <Modal title="Add Receptionist" onClose={() => { setShow(false); setErr(''); }}>
          <div style={{ display: 'grid', gap: 14 }}>
            <Input 
              label="Full Name *" 
              value={form.name} 
              onChange={(e) => f('name', e.target.value)} 
              placeholder="e.g. Ayesha Bibi" 
              onKeyDown={handleEnterKey}
            />
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <EmailInputWithCheck
  label="Login Email *"
  value={form.email}
  onChange={(e) => f('email', e.target.value)}
  placeholder="rec@clinic.com"
  setErr={setErr}
  onKeyDown={handleEnterKey}
/>
              <Input 
                label="Password *" 
                type="password" 
                value={form.password} 
                onChange={(e) => f('password', e.target.value)} 
                placeholder="••••••" 
                onKeyDown={handleEnterKey}
              />
            </div>
            
            <Input 
  label="Phone" 
  value={form.phone} 
  inputMode="numeric"
  onChange={(e) => f('phone', e.target.value.replace(/\D/g, '').slice(0, 10))} 
  placeholder="10-digit mobile number"
  onKeyDown={handleEnterKey}
/>
            {err && <Alert type="error">{err}</Alert>}
            
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <Btn variant="ghost" onClick={() => { setShow(false); setErr(''); }}>Cancel</Btn>
              <Btn onClick={addRec} disabled={busy}>{busy ? 'Adding…' : 'Add Receptionist'}</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// AdminDashboard.jsx - Updated PharmacistManagement component

function PharmacistManagement({ pharmacists, onAdd, onDelete, activePlan, onRefresh }) {
  const [show, setShow] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ name:'', email:'', phone:'', password:'' });
  const f = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  // ── Check if can add more pharmacists based on plan ──
  const canAdd = canAddStaff(activePlan, 'pharmacists', pharmacists.length);
  const planConfig = getPlanConfig(activePlan);
  const maxPharmacists = planConfig.maxPharmacists === -1 ? '∞' : planConfig.maxPharmacists;

  // ── If pharmacists are not allowed in this plan ──
  if (planConfig.maxPharmacists === 0) {
    return (
      <Card style={{ textAlign: 'center', padding: 40 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>💊</div>
        <h3 style={{ marginBottom: 8 }}>Pharmacy Management Not Available</h3>
        <p style={{ color: '#64748b', maxWidth: 400, margin: '0 auto' }}>
          Your {activePlan} plan does not include pharmacy management. 
          Upgrade to Plus or Pro to manage pharmacists and inventory.
        </p>
      </Card>
    );
  }

  async function addPharmacist() {
    if (!form.name || !form.email || !form.password) { 
      setErr('Fill all required fields.'); 
      return; 
    }

    if (form.phone && form.phone.replace(/\D/g, '').length !== 10) {
      setErr('Phone number must be exactly 10 digits.');
      return;
    }

    setBusy(true); 
    setErr('');
    try {
      // ── Step 1: Create pharmacist in HMS ──
      const newPharmacist = await onAdd({ 
        role: 'pharmacist', 
        ...form,
        permissions: ['dashboard', 'pharmacy', 'prescriptions', 'inventory']
      });
      
      // ── Step 2: Register pharmacist in IMS (if available) ──
      try {
        await registerPharmacistInIMS({ 
          fullName: form.name, 
          email: form.email, 
          password: form.password 
        });
        console.log('✅ Pharmacist registered in IMS');
      } catch (imsErr) {
        console.warn('⚠️ IMS registration failed, but pharmacist was created in HMS:', imsErr);
        // Don't fail the whole operation - pharmacist is already in HMS
      }
      
      setForm({ name:'', email:'', phone:'', password:'' });
      setShow(false);
      // Refresh the list
      if (onRefresh) onRefresh();
    } catch(e) { 
      setErr(e.message || 'Failed to add pharmacist'); 
    } finally { 
      setBusy(false); 
    }
  }

  async function removePharmacist(id) {
    if (!window.confirm('Remove this pharmacist?')) return;
    try { 
      await onDelete(id); 
      if (onRefresh) onRefresh();
    } catch(e) { 
      alert(e.message); 
    }
  }

  function handleEnterKey(e) {
    if (e.key !== "Enter") return;
  
    e.preventDefault();
  
    const focusable = Array.from(
      document.querySelectorAll(
        "input, select, textarea, button"
      )
    ).filter(el => !el.disabled);
  
    const index = focusable.indexOf(e.target);
  
    if (index > -1 && index < focusable.length - 3) {
      focusable[index + 1].focus();
    } else {
      addPharmacist();
    }
  }

  return (
    <div>
      <SectionHeader 
        title="Pharmacists" 
        subtitle={`${pharmacists.length} pharmacist${pharmacists.length !== 1 ? 's' : ''} registered`} 
        action={
          <Btn 
            onClick={() => setShow(true)} 
            disabled={!canAdd.allowed}
            title={!canAdd.allowed ? `Upgrade to ${canAdd.upgradeNeeded} to add more pharmacists` : ''}
          >
            {canAdd.allowed ? '+ Add Pharmacist' : `🔒 Limit: ${canAdd.limit} pharmacist(s)`}
          </Btn>
        } 
      />
      
      {/* Show warning when limit is reached */}
      {!canAdd.allowed && pharmacists.length >= canAdd.limit && (
        <Alert type="warning" style={{ marginBottom: 16 }}>
          ⚠️ You've reached the limit of {canAdd.limit} pharmacist(s) for your {activePlan} plan.
        </Alert>
      )}
      
      <div style={{ 
        background: 'linear-gradient(135deg, rgba(10,61,98,0.06) 0%, rgba(0,184,148,0.08) 100%)', 
        border: '1.5px solid rgba(0,184,148,0.25)', 
        borderRadius: 14, 
        padding: '16px 20px', 
        marginBottom: 24, 
        display: 'flex', 
        alignItems: 'center', 
        gap: 16, 
        flexWrap: 'wrap' 
      }}>
        <div style={{ fontSize: 36 }}>💊</div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#0a3d62', marginBottom: 4 }}>
            Pharmacy &amp; Inventory System
          </div>
          <div style={{ fontSize: 13, color: '#4a6278', lineHeight: 1.6 }}>
            Pharmacists log in using their credentials and are automatically redirected to the Inventory Management System where they can manage medicines, stock, sales, and purchases.
          </div>
          <div style={{ marginTop: 8, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ 
              fontSize: 11, 
              color: '#64748b', 
              background: '#f1f5f9', 
              padding: '2px 10px', 
              borderRadius: 20 
            }}>
              📧 Uses same email/password as HMS
            </span>
            <span style={{ 
              fontSize: 11, 
              color: '#64748b', 
              background: '#f1f5f9', 
              padding: '2px 10px', 
              borderRadius: 20 
            }}>
              🏥 Clinic: {pharmacists[0]?.clinicId || 'Your Clinic'}
            </span>
          </div>
        </div>
        <a 
          href="/dashboard/pharmacy" 
          target="_blank" 
          rel="noreferrer" 
          style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: 8, 
            padding: '10px 20px', 
            borderRadius: 10, 
            background: 'linear-gradient(135deg, #0a3d62, #1565a8)', 
            color: '#fff', 
            fontWeight: 700, 
            fontSize: 13, 
            textDecoration: 'none', 
            whiteSpace: 'nowrap', 
            boxShadow: '0 4px 14px rgba(10,61,98,0.25)' 
          }}
        >
          📦 Open Inventory System ↗
        </a>
      </div>

      {pharmacists.length === 0 ? (
        <Empty 
          icon="💊" 
          title="No pharmacists yet" 
          desc="Add a pharmacist — they will have access to the Inventory Management System." 
          action={<Btn onClick={() => setShow(true)}>+ Add First Pharmacist</Btn>} 
        />
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:16 }}>
          {pharmacists.map((ph) => (
            <PharmacistCard 
              key={ph._id} 
              pharmacist={ph} 
              onRemove={() => removePharmacist(ph._id)}
            />
          ))}
        </div>
      )}

      {show && (
        <Modal title="Add Pharmacist" onClose={() => { setShow(false); setErr(''); }}>
          <div style={{ display:'grid', gap:14 }}>
            <div style={{ 
              background: 'rgba(0,184,148,0.06)', 
              border: '1px solid rgba(0,184,148,0.2)', 
              borderRadius: 10, 
              padding: '12px 14px', 
              fontSize: 13, 
              color: '#4a6278' 
            }}>
              💡 Pharmacists will be able to log in and access the <strong>Inventory Management System</strong> to manage medicines and stock.
              <div style={{ marginTop: 6, fontSize: 12, color: '#64748b' }}>
                🔑 They use the same credentials as their HMS login.
              </div>
            </div>
            
            <Input 
              label="Full Name *" 
              value={form.name} 
              onChange={(e) => f('name', e.target.value)} 
              placeholder="e.g. Ahmed Pharmacy" 
              onKeyDown={handleEnterKey}
            />
            
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <EmailInputWithCheck
                label="Login Email *"
                value={form.email}
                onChange={(e) => f('email', e.target.value)}
                placeholder="pharmacy@clinic.com"
                setErr={setErr}
                onKeyDown={handleEnterKey}
              />
              <Input 
                label="Password *" 
                type="password" 
                value={form.password} 
                onChange={(e) => f('password', e.target.value)} 
                placeholder="••••••" 
                onKeyDown={handleEnterKey}
              />
            </div>
            
            <Input 
              label="Phone" 
              value={form.phone} 
              inputMode="numeric"
              onChange={(e) => f('phone', e.target.value.replace(/\D/g, '').slice(0, 10))} 
              placeholder="10-digit mobile number"
              onKeyDown={handleEnterKey}
            />
            
            {err && <Alert type="error">{err}</Alert>}
            
            <div style={{ display:'flex', gap:12, justifyContent:'flex-end' }}>
              <Btn variant="ghost" onClick={() => { setShow(false); setErr(''); }}>Cancel</Btn>
              <Btn onClick={addPharmacist} disabled={busy}>
                {busy ? 'Adding…' : 'Add Pharmacist'}
              </Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Pharmacist Card Component ──
function PharmacistCard({ pharmacist, onRemove }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 14,
        border: hovered ? '1.5px solid #1565a8' : '1.5px solid var(--border)',
        padding: '16px 16px 14px',
        transition: 'transform 0.15s, box-shadow 0.15s',
        transform: hovered ? 'translateY(-3px)' : 'translateY(0)',
        boxShadow: hovered ? '0 8px 28px rgba(10,61,98,0.14)' : '0 1px 4px rgba(0,0,0,0.06)',
        position: 'relative',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:12 }}>
        <div style={{ 
          width:44, height:44, borderRadius:12, 
          background: 'linear-gradient(135deg, rgba(0,184,148,0.15), rgba(0,184,148,0.08))', 
          border: '1.5px solid rgba(0,184,148,0.25)', 
          display:'flex', alignItems:'center', justifyContent:'center', 
          fontSize:20, flexShrink:0 
        }}>
          💊
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontWeight:700, fontSize:15 }}>{pharmacist.name}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
            <span style={{ 
              display: 'inline-flex', alignItems: 'center', gap: 4, 
              background: 'rgba(0,184,148,0.10)', color: '#00a878', 
              border: '1px solid rgba(0,184,148,0.25)', 
              borderRadius: 20, padding: '1px 9px', fontSize: 11, fontWeight: 700 
            }}>
              💊 Pharmacist
            </span>
            <span style={{ 
              display: 'inline-flex', alignItems: 'center', gap: 4, 
              background: 'rgba(21,101,168,0.08)', color: '#1565a8', 
              border: '1px solid rgba(21,101,168,0.2)', 
              borderRadius: 20, padding: '1px 9px', fontSize: 11, fontWeight: 700 
            }}>
              📦 IMS Access
            </span>
          </div>
        </div>
        <button 
          onClick={onRemove} 
          style={{ 
            background:'none', border:'none', cursor:'pointer', 
            color:'var(--danger)', fontSize:16, padding:4, flexShrink:0 
          }}
          title="Remove pharmacist"
        >
          🗑
        </button>
      </div>
      
      <div style={{ fontSize:13, display:'grid', gap:5 }}>
        <div style={{ color:'var(--text-muted)' }}>
          ✉️ {pharmacist.email}
        </div>
        {pharmacist.phone && (
          <div style={{ color:'var(--text-muted)' }}>
            📞 {pharmacist.phone}
          </div>
        )}
      </div>
      
      <div style={{ 
        marginTop: 12, 
        paddingTop: 10, 
        borderTop: '1px solid var(--border)', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 8
      }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ 
            fontSize: 11, 
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            gap: 4
          }}>
            🟢 {pharmacist.isActive ? 'Active' : 'Inactive'}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <a 
            href="/dashboard/pharmacy" 
            target="_blank" 
            rel="noreferrer" 
            onClick={(e) => e.stopPropagation()} 
            style={{ 
              fontSize: 11.5, 
              color: '#1565a8', 
              fontWeight: 700, 
              textDecoration: 'none', 
              background: 'rgba(21,101,168,0.07)', 
              border: '1px solid rgba(21,101,168,0.2)', 
              borderRadius: 6, 
              padding: '4px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}
          >
            📦 Open IMS ↗
          </a>
          <span style={{ 
            fontSize: 10, 
            color: '#64748b',
            background: '#f1f5f9',
            padding: '4px 8px',
            borderRadius: 4
          }}>
            Added: {pharmacist.createdAt ? new Date(pharmacist.createdAt).toLocaleDateString() : 'Recently'}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DROP-IN REPLACEMENT for the AllPatients function in AdminDashboard.jsx
// Find "export function AllPatients" and replace the entire function with this.
// ─────────────────────────────────────────────────────────────────────────────



function usePincodeLookup() {
  const [pincode,     setPincode]     = useState('');
  const [fetchedData, setFetchedData] = useState(null);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState('');
  const timerRef = useRef(null);

  useEffect(() => {
    const pin = pincode.replace(/\D/g, '');
    if (pin.length !== 6) { setFetchedData(null); setError(''); return; }
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      setLoading(true); setError(''); setFetchedData(null);
      try {
        const res  = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
        const json = await res.json();
        if (!json || !json[0] || json[0].Status !== 'Success' || !json[0].PostOffice?.length) {
          setError('Pincode not found. Please enter manually.');
          setLoading(false); return;
        }
        setFetchedData(json[0].PostOffice);
      } catch { setError('Network error. Please fill fields manually.'); }
      finally { setLoading(false); }
    }, 600);
    return () => clearTimeout(timerRef.current);
  }, [pincode]);

  return { pincode, setPincode, fetchedData, loading, error };
}

function ClinicSettings({ clinic, onSave }) {
  const [form, setForm] = useState({
    name: clinic.name || '', owner: clinic.owner || '', phone: clinic.phone || '',
    email: clinic.email || '', address: clinic.address || '', pincode: clinic.pincode || '',
    state: clinic.state || '', district: clinic.district || '',
    subDistrict: clinic.subDistrict || '', city: clinic.city || '',
  });
  const [saved, setSaved] = useState(false);
  const [busy,  setBusy]  = useState(false);
  const [err,   setErr]   = useState('');

  const { pincode: lookupPin, setPincode: setLookupPin, fetchedData, loading: pinLoading, error: pinError } = usePincodeLookup();

  useEffect(() => {
    if (!fetchedData || !fetchedData.length) return;
    const first = fetchedData[0];
    setForm((prev) => ({
      ...prev,
      state:       first.State    || prev.state,
      district:    first.District || prev.district,
      subDistrict: first.Block    || prev.subDistrict,
      city:        first.Division || prev.city,
    }));
  }, [fetchedData]);

  function handlePincodeChange(val) {
    const clean = val.replace(/\D/g, '').slice(0, 6);
    setForm((p) => ({ ...p, pincode: clean }));
    setLookupPin(clean);
  }
  function handleEnterKey(e) {
    if (e.key !== "Enter") return;
  
    e.preventDefault();
  
    const focusable = Array.from(
      document.querySelectorAll(
        'input, select, textarea, button'
      )
    ).filter(el => !el.disabled);
  
    const index = focusable.indexOf(e.target);
  
    if (index > -1 && index < focusable.length - 1) {
      focusable[index + 1].focus();
    }
  }

  const f = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const districts = form.state ? (INDIA_STATES_DISTRICTS[form.state] || []) : [];
  const subDistrictOptions = fetchedData ? [...new Set(fetchedData.map((po) => po.Block).filter(Boolean))].sort() : [];
  const postOfficeOptions  = fetchedData ? fetchedData.map((po) => po.Name).filter(Boolean).sort() : [];

  async function save() {
    setBusy(true); setErr('');
    try { await onSave(form); setSaved(true); setTimeout(() => setSaved(false), 2200); }
    catch(e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  const inputStyle = { width: '100%', padding: '9px 12px', borderRadius: 9, border: '1.5px solid #d0dce8', fontSize: 13, fontFamily: 'inherit', outline: 'none', color: '#0a3d62', background: '#fff', boxSizing: 'border-box' };
  const labelStyle = { fontSize: 12, fontWeight: 700, color: '#4a6278', marginBottom: 5, display: 'block', textTransform: 'uppercase', letterSpacing: 0.4 };

  return (
    <div style={{ maxWidth: 680 }}>
      <SectionHeader title="Clinic Settings" subtitle="Manage your clinic information" />
      <Card style={{ marginBottom: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16, paddingBottom: 10, borderBottom: '1px solid var(--border)' }}>🏥 Basic Information</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div><label style={labelStyle}>Clinic Name *</label><input style={inputStyle} value={form.name} onChange={(e) => f('name', e.target.value)} onKeyDown={handleEnterKey}
          /></div>
          <div><label style={labelStyle}>Owner / Doctor Name *</label><input style={inputStyle} value={form.owner} onChange={(e) => f('owner', e.target.value)} onKeyDown={handleEnterKey}
          /></div>
          <div>
  <label style={labelStyle}>Phone</label>
  <input 
    style={inputStyle} 
    value={form.phone} 
    inputMode="numeric"
    maxLength={10}
    onChange={(e) => f('phone', e.target.value.replace(/\D/g, '').slice(0, 10))} 
    placeholder="10-digit mobile number"
    onKeyDown={handleEnterKey}
  />
</div>
          <div><label style={labelStyle}>Email</label><input style={inputStyle} type="email" value={form.email} onChange={(e) => f('email', e.target.value)} onKeyDown={handleEnterKey}/></div>
          <div style={{ gridColumn: '1/-1' }}><label style={labelStyle}>Street Address</label><input style={inputStyle} value={form.address} onChange={(e) => f('address', e.target.value)} onKeyDown={handleEnterKey}/></div>
        </div>
      </Card>
      <Card style={{ marginBottom: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4, paddingBottom: 10, borderBottom: '1px solid var(--border)' }}>📍 Location Details</div>
        <div style={{ fontSize: 12, color: '#8fa8bc', marginBottom: 16 }}>Enter your 6-digit pincode to auto-fill State, District, Sub-district ✨</div>
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Pincode</label>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div style={{ position: 'relative', width: 160 }}>
              <input style={{ ...inputStyle, width: '100%', borderColor: pinError ? '#e74c3c' : fetchedData ? '#00b894' : '#d0dce8' }}
                value={form.pincode} onChange={(e) => handlePincodeChange(e.target.value)} maxLength={6} placeholder="e.g. 110001" />
            </div>
            {pinLoading && <span style={{ fontSize: 12, color: '#1565a8', fontWeight: 600 }}>🔍 Fetching…</span>}
            {fetchedData && !pinLoading && <span style={{ fontSize: 12, color: '#00a878', fontWeight: 600 }}>✅ Filled automatically!</span>}
            {pinError && !pinLoading && <span style={{ fontSize: 12, color: '#e74c3c', fontWeight: 600 }}>{pinError}</span>}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
          <div>
            <label style={labelStyle}>State / UT</label>
            <select style={{ ...inputStyle, cursor: 'pointer' }} value={form.state} onChange={(e) => { f('state', e.target.value); f('district', ''); f('subDistrict', ''); }}>
              <option value="">-- Select State --</option>
              {INDIA_STATE_NAMES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>District</label>
            <select style={{ ...inputStyle, cursor: form.state ? 'pointer' : 'not-allowed', opacity: form.state ? 1 : 0.6 }} value={form.district} onChange={(e) => f('district', e.target.value)} disabled={!form.state}>
              <option value="">-- Select District --</option>
              {districts.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div>
            <label style={labelStyle}>Sub-district / Block</label>
            {subDistrictOptions.length > 0
              ? <select style={{ ...inputStyle, cursor: 'pointer' }} value={form.subDistrict} onChange={(e) => f('subDistrict', e.target.value)}>
                  <option value="">-- Select --</option>
                  {subDistrictOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              : <input style={inputStyle} value={form.subDistrict} onChange={(e) => f('subDistrict', e.target.value)} />}
          </div>
          <div>
            <label style={labelStyle}>City / Town</label>
            {postOfficeOptions.length > 0
              ? <select style={{ ...inputStyle, cursor: 'pointer' }} value={form.city} onChange={(e) => f('city', e.target.value)}>
                  <option value="">-- Select --</option>
                  {postOfficeOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              : <input style={inputStyle} value={form.city} onChange={(e) => f('city', e.target.value)} />}
          </div>
        </div>
      </Card>
      <Card>
        {saved && <Alert type="success" style={{ marginBottom: 14 }}>✓ Settings saved successfully!</Alert>}
        {err   && <Alert type="error"   style={{ marginBottom: 14 }}>{err}</Alert>}
        <Btn onClick={save} disabled={busy} full size="lg">{busy ? 'Saving…' : '💾 Save Clinic Settings'}</Btn>
      </Card>
      <div style={{ marginTop: 24 }}>
        <SectionHeader title="Subscription Plan" />
        <Card>
          {clinic.plan ? (
            <div style={{ display:'grid', gap:10 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ fontWeight:700, fontSize:15 }}>
                  {clinic.plan === 'pro'  ? '⭐ Pro Plan'  :
                   clinic.plan === 'plus' ? '🏢 Plus Plan' :
                                           '🏥 Lite Plan'}
                </span>
                <span style={{ background:'rgba(0,184,148,0.1)',color:'#00a878',borderRadius:20,padding:'2px 10px',fontSize:12,fontWeight:700 }}>● Active</span>
              </div>
              <div style={{ fontSize:13, color:'var(--text-muted)' }}>Activated: {clinic.planActivatedAt}</div>
              <div style={{ fontSize:13, color:'var(--text-muted)' }}>Renews: {clinic.planExpiresAt}</div>
            </div>
          ) : (
            <div style={{ color:'var(--text-muted)', fontSize:14 }}>No active plan. Please choose a plan to access all features.</div>
          )}
        </Card>
      </div>
    </div>
  );
}
// Add this function to format schedule for editing
function scheduleToFormValue(schedule) {
  if (!schedule || !schedule.length) return defaultSchedule();
  return schedule;
}

// Edit Doctor Modal Component
function EditDoctorModal({ doctor, onClose, onSave }) {
  const [form, setForm] = useState({
    name: doctor.name || '',
    specialist: doctor.specialist || '',
    phone: doctor.phone || '',
    email: doctor.email || '',
    fee: doctor.fee || '',
    schedule: doctor.schedule && doctor.schedule.length === 7 ? doctor.schedule : defaultSchedule(),
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const f = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  async function handleSave() {
    if (!form.name || !form.email) {
      setErr('Name and email are required.');
      return;
    }

    setBusy(true);
    setErr('');
    try {
      await onSave(doctor._id, {
        name: form.name,
        specialist: form.specialist,
        phone: form.phone,
        email: form.email,
        fee: parseFloat(form.fee) || 0,
        schedule: form.schedule,
      });
      onClose();
    } catch (e) {
      setErr(e.message || 'Failed to update doctor');
    } finally {
      setBusy(false);
    }
  }

  const inputStyle = {
    width: '100%',
    padding: '9px 12px',
    borderRadius: 9,
    border: '1.5px solid #d0dce8',
    fontSize: 13,
    fontFamily: 'inherit',
    outline: 'none',
    color: '#0a3d62',
    background: '#fff',
    boxSizing: 'border-box',
  };

  const labelStyle = {
    fontSize: 12,
    fontWeight: 700,
    color: '#4a6278',
    marginBottom: 5,
    display: 'block',
  };

  return (
    <Modal title={`Edit Doctor: ${doctor.name}`} onClose={onClose} width={700}>
      <div style={{ display: 'grid', gap: 16 }}>
        {/* Basic Information */}
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>
            👨‍⚕️ Basic Information
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={labelStyle}>Doctor Name *</label>
              <input style={inputStyle} value={form.name} onChange={(e) => f('name', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Specialist</label>
              <select 
                style={{ ...inputStyle, cursor: 'pointer' }} 
                value={form.specialist} 
                onChange={(e) => f('specialist', e.target.value)}
              >
                <option value="">-- Select --</option>
                {SPECIALISTS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>
            📞 Contact Information
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={labelStyle}>Email *</label>
              <input style={inputStyle} type="email" value={form.email} onChange={(e) => f('email', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Phone</label>
              <input style={inputStyle} value={form.phone} onChange={(e) => f('phone', e.target.value)} placeholder="03xx-xxxxxxx" />
            </div>
          </div>
        </div>

        {/* Consultation Fee */}
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>
            💰 Consultation Settings
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 14 }}>
            <div>
              <label style={labelStyle}>Consultation Fee (Rs.)</label>
              <input 
                style={inputStyle} 
                type="number" 
                value={form.fee} 
                onChange={(e) => f('fee', e.target.value)} 
                placeholder="500" 
              />
            </div>
          </div>
        </div>

        {/* Weekly Schedule */}
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>
            📅 Weekly Schedule
          </div>
          <WeeklySchedulePicker 
            value={form.schedule} 
            onChange={(s) => f('schedule', s)} 
          />
        </div>

        {err && <Alert type="error">{err}</Alert>}

        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn onClick={handleSave} disabled={busy}>
            {busy ? 'Saving...' : '💾 Save Changes'}
          </Btn>
        </div>
      </div>
    </Modal>
  );
}