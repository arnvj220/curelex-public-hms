import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Toast, useToast } from '../components/Toast'
import API from '../utils/api'
import { formatDate, formatTime, timeAgoString } from '../utils/helpers'
import "../css/SoloDoctorDashboard.css"

/* ─── Doctor Nav Items ───────────────────────────────────────── */
const NAV_ITEMS = [
  { icon: 'fa-home',                    label: 'Dashboard',            key: 'home'         },
  { icon: 'fa-user-injured',            label: 'My Patients',          key: 'patients'     },
  { icon: 'fa-video',                   label: 'Video Consultations',  key: 'video'        },
  { icon: 'fa-file-medical-alt',        label: 'Medical Reports',      key: 'reports'      },
  { icon: 'fa-comment-dots',            label: 'Feedback',             key: 'feedback'     },
  { icon: 'fa-pills',                   label: 'My Medicines',         key: 'medicines'    },
  { icon: 'fa-flask',                   label: 'My Tests',             key: 'mytests'      },
  { divider: true },
  { icon: 'fa-user-circle',             label: 'View / Update Profile',key: 'profile'      },
  { icon: 'fa-cog',                     label: 'Settings',             key: 'settings'     },
]

function calcIncome(appointments, consultationFee = 500) {
  const todayStr = new Date().toDateString()
  const todayIncome = appointments
    .filter(a => a.doctorApproved === true && new Date(a.appointmentTime).toDateString() === todayStr)
    .length * consultationFee
  const totalIncome = appointments
    .filter(a => a.doctorApproved === true)
    .length * consultationFee
  return { todayIncome, totalIncome }
}

/* ─── Patient Record Viewer Modal ────────────────────────────── */
function PatientRecordModal({ patientId, patientName, doctorId, onClose }) {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchRecords = async () => {
      setLoading(true)
      try {
        const [apptRes, rxRes] = await Promise.all([
          API.get(`/appointments/doctor/${doctorId}`),
          API.get(`/prescriptions/patient/${patientId}`),
        ])
        const apptData = apptRes.data
        const rxData   = rxRes.data

        const appts = (apptData.appointments || [])
          .filter(a => a.patientId === patientId && a.doctorApproved)
          .sort((a, b) => new Date(b.appointmentTime) - new Date(a.appointmentTime))

        const rxList = rxData.prescriptions || []

        const merged = appts.map(a => ({
          ...a,
          prescriptions: rxList.filter(rx => rx.appointmentId === a.id),
        }))

        setRecords(merged)
      } catch (err) {
        console.error(err)
      }
      setLoading(false)
    }
    fetchRecords()
  }, [patientId, doctorId])

  return (
    <div className="modal active">
      <div className="modal-overlay" onClick={onClose}></div>
      <div className="modal-container" style={{ maxWidth: 700, maxHeight: '90vh', overflowY: 'auto' }}>
        <button className="modal-close" onClick={onClose}>&times;</button>
        <div className="appointment-modal-header">
          <i className="fas fa-folder-open"></i>
          <h2>Patient Records</h2>
          <p>{patientName || `Patient #${patientId}`} — Full History</p>
        </div>

        <div style={{ padding: '1rem 1.5rem 1.5rem' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <i className="fas fa-spinner fa-spin" style={{ fontSize: 32, color: '#2563eb' }}></i>
            </div>
          ) : records.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>
              <i className="fas fa-folder-open" style={{ fontSize: 36, display: 'block', marginBottom: 12 }}></i>
              No saved records found for this patient.
            </div>
          ) : records.map((appt, i) => (
            <div key={i} style={{
              border: '1.5px solid #e5e7eb', borderRadius: 12,
              marginBottom: 16, overflow: 'hidden',
              boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
            }}>
              <div style={{
                background: 'linear-gradient(135deg,#f0f9ff,#e0f2fe)',
                padding: '12px 16px',
                borderBottom: '1px solid #bae6fd',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8,
              }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#0c4a6e' }}>
                    <i className="fas fa-calendar-check" style={{ marginRight: 8, color: '#0284c7' }}></i>
                    {formatDate(appt.appointmentTime)} · {formatTime(appt.appointmentTime)}
                  </div>
                  {appt.symptoms && (
                    <div style={{ fontSize: 12, color: '#0369a1', marginTop: 3 }}>
                      <i className="fas fa-stethoscope" style={{ marginRight: 5 }}></i>
                      Chief Complaint: {appt.symptoms}
                    </div>
                  )}
                </div>
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
                  background: '#dcfce7', color: '#16a34a', border: '1px solid #86efac',
                }}>
                  ✓ Completed
                </span>
              </div>

              <div style={{ padding: '12px 16px' }}>
                {appt.diagnosis && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
                      <i className="fas fa-notes-medical" style={{ marginRight: 6, color: '#2563eb' }}></i>
                      Doctor's Diagnosis
                    </div>
                    <div style={{ background: '#f8faff', border: '1px solid #dbeafe', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#1e40af' }}>
                      {appt.diagnosis}
                    </div>
                  </div>
                )}

                {appt.prescriptions && appt.prescriptions.length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
                      <i className="fas fa-pills" style={{ marginRight: 6, color: '#7c3aed' }}></i>
                      Medicines Prescribed
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {appt.prescriptions.flatMap(rx => rx.medicines || []).map((med, mi) => (
                        <div key={mi} style={{
                          background: '#faf5ff', border: '1px solid #e9d5ff',
                          borderRadius: 8, padding: '6px 10px', fontSize: 12,
                        }}>
                          <div style={{ fontWeight: 700, color: '#6d28d9' }}>{med.name}</div>
                          <div style={{ color: '#9ca3af', fontSize: 11 }}>
                            {med.dosage && <span>{med.dosage} · </span>}
                            {med.frequency && <span>{med.frequency}</span>}
                            {med.duration && <span> · {med.duration}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {appt.tests && (() => {
                  let tests = appt.tests
                  if (typeof tests === 'string') { try { tests = JSON.parse(tests) } catch { tests = [] } }
                  return Array.isArray(tests) && tests.length > 0 ? (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
                        <i className="fas fa-flask" style={{ marginRight: 6, color: '#0891b2' }}></i>
                        Tests Ordered
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {tests.map((t, ti) => (
                          <span key={ti} style={{
                            background: '#ecfeff', border: '1px solid #a5f3fc',
                            borderRadius: 8, padding: '4px 10px', fontSize: 12,
                            color: '#0e7490', fontWeight: 600,
                          }}>
                            {t.name}
                            <span style={{ fontSize: 10, marginLeft: 5, background: '#cffafe', padding: '1px 5px', borderRadius: 10 }}>
                              {t.type}
                            </span>
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null
                })()}

                {appt.doctorNotes && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
                      <i className="fas fa-sticky-note" style={{ marginRight: 6, color: '#f59e0b' }}></i>
                      Clinical Notes
                    </div>
                    <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#78350f' }}>
                      {appt.doctorNotes}
                    </div>
                  </div>
                )}

                {appt.followUpDate && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                    <i className="fas fa-calendar-alt" style={{ color: '#10b981', fontSize: 13 }}></i>
                    <span style={{ fontSize: 12, color: '#065f46', fontWeight: 600 }}>
                      Follow-up: {formatDate(appt.followUpDate)}
                    </span>
                    {appt.followUpInstructions && (
                      <span style={{ fontSize: 12, color: '#6b7280' }}>— {appt.followUpInstructions}</span>
                    )}
                  </div>
                )}

                {!appt.diagnosis && !appt.doctorNotes && (!appt.prescriptions || appt.prescriptions.length === 0) && (
                  <div style={{ fontSize: 13, color: '#9ca3af', fontStyle: 'italic' }}>
                    No detailed record saved for this visit.
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ─── Patient Appointment Card ───────────────────────────────── */
function PatientAppointmentCard({ appt, index, doctorId }) {
  const showToast = useToast()
  const aptTime   = new Date(appt.appointmentTime)
  const diffMin   = (aptTime - new Date()) / 60000
  const statusClass = diffMin < -30 ? 'completed' : diffMin <= 15 ? 'current' : 'upcoming'
  const statusLabel = { completed: 'Completed', current: 'Now', upcoming: 'Upcoming' }[statusClass]

  const isPending = !appt.doctorApproved

  const [expanded,    setExpanded]    = useState(statusClass === 'current')
  const [medicines,   setMedicines]   = useState([])
  const [medSearch,   setMedSearch]   = useState('')
  const [medDropdown, setMedDropdown] = useState([])
  const [allMeds,     setAllMeds]     = useState([])

  const [tests,       setTests]       = useState([])
  const [testInput,   setTestInput]   = useState('')
  const [testType,    setTestType]    = useState('Pathology')
  const [testDropdown, setTestDropdown] = useState([])
  const [allMyTests,  setAllMyTests]  = useState([])

  const [description, setDescription] = useState(appt.diagnosis || '')
  const [note,        setNote]        = useState(appt.doctorNotes || '')
  const [followUp,    setFollowUp]    = useState(appt.followUpDate ? appt.followUpDate.split('T')[0] : '')
  const [followUpInstructions, setFollowUpInstructions] = useState(appt.followUpInstructions || '')
  const [saving,      setSaving]      = useState(false)
  const [approving,   setApproving]   = useState(false)
  const [saved,       setSaved]       = useState(false)

  const refreshAllMeds = () => {
    API.get(`/medicines/doctor/${doctorId}`)
      .then(({ data }) => setAllMeds(Array.isArray(data) ? data : (data.medicines || [])))
      .catch(() => {})
  }

  const refreshAllMyTests = () => {
    API.get(`/tests/doctor/${doctorId}`)
      .then(({ data }) => setAllMyTests(Array.isArray(data) ? data : (data.tests || [])))
      .catch(() => {})
  }

  useEffect(() => {
    if (!expanded) return
    refreshAllMeds()
    refreshAllMyTests()
  }, [expanded]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (appt.tests) {
      try {
        const t = typeof appt.tests === 'string' ? JSON.parse(appt.tests) : appt.tests
        if (Array.isArray(t)) setTests(t)
      } catch {}
    }
  }, [appt.tests])

  const handleMedSearch = (val) => {
    setMedSearch(val)
    if (!val.trim()) { setMedDropdown([]); return }
    const needle = val.toLowerCase()
    setMedDropdown(
      allMeds.filter(m =>
        (m.name || '').toLowerCase().includes(needle) ||
        (m.composition || '').toLowerCase().includes(needle)
      ).slice(0, 6)
    )
  }

  const addMedicine = (name) => {
    if (medicines.find(m => m.name === name)) { showToast(`${name} already added`, 'info'); return }
    setMedicines(p => [...p, { name, dosage: '', frequency: 'Once daily', duration: '' }])
    setMedSearch(''); setMedDropdown([])
  }

  const saveAndAddMedicine = async (name) => {
    if (!name.trim()) return
    try {
      const { data } = await API.post('/medicines/doctor/add', {
        name: name.trim(), composition: '', dosageForm: 'Tablet', doctorId,
      })
      if (data.success) {
        showToast(`"${name}" saved to My Medicines ✅`, 'success')
        refreshAllMeds()
        addMedicine(name)
      } else {
        showToast(data.message || 'Could not save medicine', 'error')
      }
    } catch {
      showToast('Server error while saving medicine', 'error')
    }
  }

  const handleTestSearch = (val) => {
    setTestInput(val)
    if (!val.trim()) { setTestDropdown([]); return }
    const needle = val.toLowerCase()
    setTestDropdown(
      allMyTests.filter(t =>
        (t.name || '').toLowerCase().includes(needle)
      ).slice(0, 6)
    )
  }

  const addTestFromDropdown = (testItem) => {
    const exists = tests.find(t => t.name.toLowerCase() === testItem.name.toLowerCase())
    if (exists) { showToast(`${testItem.name} already added`, 'info'); return }
    setTests(p => [...p, { name: testItem.name, type: testItem.category || testType }])
    setTestInput(''); setTestDropdown([])
  }

  const saveAndAddTest = async (name) => {
    if (!name.trim()) return
    try {
      const { data } = await API.post('/tests/doctor/add', {
        name: name.trim(), category: testType, doctorId,
      })
      if (data.success) {
        showToast(`"${name}" saved to My Tests ✅`, 'success')
        refreshAllMyTests()
        const exists = tests.find(t => t.name.toLowerCase() === name.toLowerCase())
        if (!exists) setTests(p => [...p, { name: name.trim(), type: testType }])
        setTestInput(''); setTestDropdown([])
      } else {
        showToast(data.message || 'Could not save test', 'error')
      }
    } catch {
      showToast('Server error while saving test', 'error')
    }
  }

  const addTestManual = () => {
    if (!testInput.trim()) return
    const exists = tests.find(t => t.name.toLowerCase() === testInput.trim().toLowerCase())
    if (exists) { showToast(`${testInput.trim()} already added`, 'info'); return }
    setTests(p => [...p, { name: testInput.trim(), type: testType }])
    setTestInput(''); setTestDropdown([])
  }

  const removeTest = (i) => setTests(p => p.filter((_, idx) => idx !== i))
  const updateMed  = (i, field, val) => setMedicines(p => p.map((m, idx) => idx === i ? { ...m, [field]: val } : m))
  const removeMed  = (i) => setMedicines(p => p.filter((_, idx) => idx !== i))

  const handleApprove = async () => {
    setApproving(true)
    try {
      const { data } = await API.patch(`/appointments/${appt.id}/approve`)
      if (data.success) {
        showToast('Appointment approved ✅', 'success')
        window.location.reload()
      } else {
        showToast(data.message || 'Approval failed', 'error')
      }
    } catch {
      showToast('Network error', 'error')
    }
    setApproving(false)
  }

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    let allOk = true

    try {
      if (medicines.length > 0) {
        const { data: rxData } = await API.post('/prescriptions/add', {
          patientId:     appt.patientId,
          doctorId,
          appointmentId: appt.id,
          medicines,
          notes: note,
        })
        if (!rxData.success && !rxData.message?.toLowerCase().includes('success')) {
          allOk = false
          showToast('Prescription save failed: ' + (rxData.message || 'Unknown error'), 'error')
        }
      }

      const { data: notesData } = await API.patch(`/appointments/${appt.id}/notes`, {
        description, note, followUp, followUpInstructions, tests,
      })
      if (!notesData.success) {
        allOk = false
        showToast('Notes save failed: ' + (notesData.message || 'Unknown error'), 'error')
      }

      if (allOk) {
        setSaved(true)
        showToast('Patient record saved ✅ — visible in My Patients', 'success')
      }
    } catch (err) {
      showToast('Error saving record: ' + err.message, 'error')
    }
    setSaving(false)
  }

  const sc = {
    completed: { bg: '#f0fdf4', border: '#86efac', badge: '#16a34a', badgeBg: '#dcfce7' },
    current:   { bg: '#eff6ff', border: '#93c5fd', badge: '#1d4ed8', badgeBg: '#dbeafe' },
    upcoming:  { bg: '#fafafa', border: '#e5e7eb', badge: '#6b7280', badgeBg: '#f3f4f6' },
  }[statusClass]

  const hasExactMedMatch = allMeds.some(m => m.name.toLowerCase() === medSearch.trim().toLowerCase())
  const hasExactTestMatch = allMyTests.some(t => t.name.toLowerCase() === testInput.trim().toLowerCase())

  return (
    <div style={{
      border: `1.5px solid ${sc.border}`, borderRadius: 14, marginBottom: 16,
      background: sc.bg, overflow: 'hidden',
      boxShadow: statusClass === 'current' ? '0 4px 20px rgba(37,99,235,0.12)' : '0 1px 4px rgba(0,0,0,0.06)',
    }}>
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', cursor: 'pointer', flexWrap: 'wrap' }}
        onClick={() => setExpanded(e => !e)}
      >
        <div style={{ textAlign: 'center', minWidth: 52 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#111827' }}>{formatTime(appt.appointmentTime)}</div>
          <div style={{ fontSize: 10, color: '#6b7280', marginTop: 2 }}>
            {aptTime.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
          </div>
        </div>
        <div style={{ width: 3, height: 44, borderRadius: 4, background: sc.badge, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'linear-gradient(135deg,#2563eb,#7c3aed)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontWeight: 700, fontSize: 13, flexShrink: 0,
            }}>
              {(appt.patientName || 'P').charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#111827' }}>
                {appt.patientName || `Patient #${appt.patientId}`}
              </div>
              <div style={{ fontSize: 12, color: '#6b7280' }}>
                {appt.symptoms?.slice(0, 60) || 'Consultation'}
                {appt.symptoms?.length > 60 ? '…' : ''}
              </div>
            </div>
            <span style={{
              fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
              background: sc.badgeBg, color: sc.badge, border: `1px solid ${sc.border}`,
            }}>
              {statusLabel}
            </span>
            {isPending && (
              <span style={{
                fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
                background: '#fef9c3', color: '#a16207', border: '1px solid #fde68a',
              }}>
                ⏳ Awaiting Approval
              </span>
            )}
            {saved && (
              <span style={{
                fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
                background: '#dcfce7', color: '#16a34a', border: '1px solid #86efac',
              }}>
                ✓ Record Saved
              </span>
            )}
            <span style={{
              fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20,
              background: '#f0fdf4', color: '#16a34a', border: '1px solid #86efac',
            }}>
              <i className="fas fa-video" style={{ marginRight: 4 }}></i>Video Consultation
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
          {isPending && (
            <button
              onClick={handleApprove}
              disabled={approving}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'linear-gradient(135deg,#10b981,#059669)',
                color: 'white', border: 'none', borderRadius: 8,
                padding: '8px 14px', fontWeight: 700, fontSize: 12,
                cursor: 'pointer', opacity: approving ? 0.7 : 1,
              }}
            >
              <i className={`fas ${approving ? 'fa-spinner fa-spin' : 'fa-check'}`}></i>
              {approving ? 'Approving…' : 'Approve'}
            </button>
          )}
          {!isPending && appt.meetingLink && (
            <button
              onClick={() => window.open(appt.meetingLink, '_blank')}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'linear-gradient(135deg,#10b981,#059669)',
                color: 'white', border: 'none', borderRadius: 8,
                padding: '8px 14px', fontWeight: 700, fontSize: 12, cursor: 'pointer',
              }}
            >
              <i className="fas fa-video"></i> Start Call
            </button>
          )}
          <button
            onClick={() => setExpanded(e => !e)}
            style={{
              background: 'white', border: '1px solid #e5e7eb', borderRadius: 8,
              padding: '8px 12px', cursor: 'pointer', color: '#374151', fontSize: 12, fontWeight: 600,
            }}
          >
            <i className={`fas fa-chevron-${expanded ? 'up' : 'down'}`}></i>
          </button>
        </div>
      </div>

      {expanded && (
        <div style={{ borderTop: `1px solid ${sc.border}`, background: 'white' }}>
          <div style={{ padding: '16px 18px', borderBottom: '1px solid #f3f4f6' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
              <i className="fas fa-notes-medical" style={{ marginRight: 6, color: '#2563eb' }}></i>
              Patient's Problem / Description
            </div>
            {appt.symptoms ? (
              <div style={{
                background: '#f8faff', border: '1px solid #dbeafe',
                borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#1e40af', marginBottom: 10,
              }}>
                <i className="fas fa-stethoscope" style={{ marginRight: 8 }}></i>
                {appt.symptoms}
              </div>
            ) : (
              <div style={{ fontSize: 13, color: '#9ca3af', fontStyle: 'italic', marginBottom: 10 }}>
                No symptoms reported
              </div>
            )}
            <textarea
              rows={2}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Doctor's diagnosis / notes about this problem..."
              style={{
                width: '100%', padding: '8px 12px', border: '1px solid #e5e7eb',
                borderRadius: 8, fontSize: 13, resize: 'vertical',
                boxSizing: 'border-box', outline: 'none', color: '#374151',
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
            <div style={{ padding: '16px 18px', borderBottom: '1px solid #f3f4f6', borderRight: '1px solid #f3f4f6' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
                <i className="fas fa-pills" style={{ marginRight: 6, color: '#7c3aed' }}></i>Add Medicine
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  value={medSearch}
                  onChange={e => handleMedSearch(e.target.value)}
                  placeholder="Search or type medicine name..."
                  style={{ width: '100%', padding: '7px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, boxSizing: 'border-box', outline: 'none' }}
                />
                {(medDropdown.length > 0 || (medSearch.trim() && !hasExactMedMatch)) && (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
                    border: '1px solid #e5e7eb', borderRadius: 8, background: 'white',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.1)', maxHeight: 200, overflowY: 'auto',
                  }}>
                    {medDropdown.map(m => (
                      <div key={m.name} onClick={() => addMedicine(m.name)}
                        style={{ padding: '7px 12px', cursor: 'pointer', fontSize: 13, borderBottom: '1px solid #f3f4f6', color: '#374151' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f8faff'}
                        onMouseLeave={e => e.currentTarget.style.background = 'white'}
                      >
                        {m.name}
                        {m.doctorId && (
                          <span style={{ marginLeft: 6, fontSize: 10, background: '#ede9fe', color: '#7c3aed', padding: '1px 6px', borderRadius: 10 }}>
                            My Medicine
                          </span>
                        )}
                      </div>
                    ))}
                    {medSearch.trim() && !hasExactMedMatch && (
                      <div onClick={() => saveAndAddMedicine(medSearch.trim())}
                        style={{
                          padding: '9px 12px', cursor: 'pointer', fontSize: 13,
                          color: '#7c3aed', fontWeight: 700, background: '#faf5ff',
                          borderTop: medDropdown.length > 0 ? '1px dashed #e9d5ff' : 'none',
                          display: 'flex', alignItems: 'center', gap: 8,
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = '#ede9fe'}
                        onMouseLeave={e => e.currentTarget.style.background = '#faf5ff'}
                      >
                        <i className="fas fa-plus-circle" style={{ color: '#7c3aed', fontSize: 14 }}></i>
                        <span>Add &amp; save <strong>"{medSearch.trim()}"</strong> to My Medicines</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div style={{ marginTop: 8 }}>
                {medicines.length === 0 && (
                  <p style={{ fontSize: 12, color: '#9ca3af', margin: '4px 0' }}>No medicines added yet — search above</p>
                )}
                {medicines.map((m, i) => (
                  <div key={i} style={{ background: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: 8, padding: '8px 10px', marginBottom: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#6d28d9' }}>{m.name}</span>
                      <button onClick={() => removeMed(i)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 0, fontSize: 12 }}>
                        <i className="fas fa-times"></i>
                      </button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4 }}>
                      <input value={m.dosage} placeholder="Dosage" onChange={e => updateMed(i, 'dosage', e.target.value)}
                        style={{ padding: '4px 6px', border: '1px solid #ddd6fe', borderRadius: 5, fontSize: 11 }} />
                      <select value={m.frequency} onChange={e => updateMed(i, 'frequency', e.target.value)}
                        style={{ padding: '4px 4px', border: '1px solid #ddd6fe', borderRadius: 5, fontSize: 11 }}>
                        {['Once daily', 'Twice daily', 'Thrice daily', 'SOS', 'As needed'].map(o => <option key={o}>{o}</option>)}
                      </select>
                      <input value={m.duration} placeholder="Duration" onChange={e => updateMed(i, 'duration', e.target.value)}
                        style={{ padding: '4px 6px', border: '1px solid #ddd6fe', borderRadius: 5, fontSize: 11 }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ padding: '16px 18px', borderBottom: '1px solid #f3f4f6' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
                <i className="fas fa-flask" style={{ marginRight: 6, color: '#0891b2' }}></i>
                Add Pathology / Radiology Tests
              </div>
              <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                <select value={testType} onChange={e => setTestType(e.target.value)}
                  style={{ padding: '7px 8px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 12, color: '#374151', flexShrink: 0 }}>
                  <option>Pathology</option>
                  <option>Radiology</option>
                  <option>Cardiology</option>
                  <option>Other</option>
                </select>
                <div style={{ position: 'relative', flex: 1 }}>
                  <input
                    value={testInput}
                    onChange={e => handleTestSearch(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && testInput.trim()) addTestManual() }}
                    placeholder="Search or type test name..."
                    style={{ width: '100%', padding: '7px 10px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
                  />
                  {(testDropdown.length > 0 || (testInput.trim() && !hasExactTestMatch)) && (
                    <div style={{
                      position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
                      border: '1px solid #e5e7eb', borderRadius: 8, background: 'white',
                      boxShadow: '0 4px 16px rgba(0,0,0,0.1)', maxHeight: 200, overflowY: 'auto',
                    }}>
                      {testDropdown.map((t, ti) => (
                        <div key={ti} onClick={() => addTestFromDropdown(t)}
                          style={{ padding: '7px 12px', cursor: 'pointer', fontSize: 13, borderBottom: '1px solid #f3f4f6', color: '#374151' }}
                          onMouseEnter={e => e.currentTarget.style.background = '#ecfeff'}
                          onMouseLeave={e => e.currentTarget.style.background = 'white'}
                        >
                          {t.name}
                          {t.doctorId && <span style={{ marginLeft: 6, fontSize: 10, background: '#cffafe', color: '#0e7490', padding: '1px 6px', borderRadius: 10 }}>My Test</span>}
                          {t.category && <span style={{ marginLeft: 4, fontSize: 10, color: '#6b7280' }}>· {t.category}</span>}
                        </div>
                      ))}
                      {testInput.trim() && !hasExactTestMatch && (
                        <div onClick={() => saveAndAddTest(testInput.trim())}
                          style={{
                            padding: '9px 12px', cursor: 'pointer', fontSize: 13,
                            color: '#0891b2', fontWeight: 700, background: '#ecfeff',
                            borderTop: testDropdown.length > 0 ? '1px dashed #a5f3fc' : 'none',
                            display: 'flex', alignItems: 'center', gap: 8,
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = '#cffafe'}
                          onMouseLeave={e => e.currentTarget.style.background = '#ecfeff'}
                        >
                          <i className="fas fa-plus-circle" style={{ color: '#0891b2', fontSize: 14 }}></i>
                          <span>Add &amp; save <strong>"{testInput.trim()}"</strong> to My Tests</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <button onClick={addTestManual}
                  style={{ background: '#0891b2', color: 'white', border: 'none', borderRadius: 8, padding: '7px 12px', cursor: 'pointer', fontSize: 13, flexShrink: 0 }}>
                  <i className="fas fa-plus"></i>
                </button>
              </div>
              <div>
                {tests.length === 0 && <p style={{ fontSize: 12, color: '#9ca3af', margin: '4px 0' }}>No tests added yet — search or type & press Enter</p>}
                {tests.map((t, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    background: '#ecfeff', border: '1px solid #a5f3fc',
                    borderRadius: 7, padding: '6px 10px', marginBottom: 5,
                  }}>
                    <div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#0e7490' }}>{t.name}</span>
                      <span style={{ fontSize: 10, color: '#0891b2', marginLeft: 6, background: '#cffafe', padding: '1px 6px', borderRadius: 10 }}>{t.type}</span>
                    </div>
                    <button onClick={() => removeTest(i)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 12 }}>
                      <i className="fas fa-times"></i>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, borderBottom: '1px solid #f3f4f6' }}>
            <div style={{ padding: '14px 18px', borderRight: '1px solid #f3f4f6' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                <i className="fas fa-sticky-note" style={{ marginRight: 6, color: '#f59e0b' }}></i>Add Note
              </div>
              <textarea rows={2} value={note} onChange={e => setNote(e.target.value)} placeholder="Additional clinical notes..."
                style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, resize: 'none', boxSizing: 'border-box', outline: 'none' }} />
            </div>
            <div style={{ padding: '14px 18px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                <i className="fas fa-calendar-alt" style={{ marginRight: 6, color: '#10b981' }}></i>Follow Up
              </div>
              <input type="date" value={followUp} onChange={e => setFollowUp(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, boxSizing: 'border-box', outline: 'none', marginBottom: 8 }} />
              <input type="text" value={followUpInstructions} onChange={e => setFollowUpInstructions(e.target.value)} placeholder="Follow-up instructions..."
                style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, boxSizing: 'border-box', outline: 'none' }} />
            </div>
          </div>

          <div style={{ padding: '14px 18px', display: 'flex', justifyContent: 'flex-end', gap: 10, background: '#fafafa' }}>
            <button onClick={() => setExpanded(false)}
              style={{ padding: '9px 20px', borderRadius: 8, border: '1px solid #e5e7eb', background: 'white', color: '#374151', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              Collapse
            </button>
            <button onClick={handleSave} disabled={saving}
              style={{
                padding: '9px 24px', borderRadius: 8, border: 'none',
                background: saving ? '#94a3b8' : 'linear-gradient(135deg,#2563eb,#7c3aed)',
                color: 'white', fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', gap: 8, opacity: saving ? 0.8 : 1,
              }}>
              <i className={`fas ${saving ? 'fa-spinner fa-spin' : 'fa-save'}`}></i>
              {saving ? 'Saving...' : 'Save Record'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── Prescription Modal ─────────────────────────────────────── */
function PrescriptionModal({ patientId, doctorId, onClose, onSuccess }) {
  const [allMedicines, setAllMedicines] = useState([])
  const [selected,     setSelected]     = useState([])
  const [search,       setSearch]       = useState('')
  const [dropdown,     setDropdown]     = useState([])
  const [notes,        setNotes]        = useState('')
  const showToast = useToast()

  const refreshMeds = () => {
    API.get(`/medicines/doctor/${doctorId}`)
      .then(({ data }) => setAllMedicines(Array.isArray(data) ? data : (data.medicines || [])))
      .catch(() => {})
  }

  useEffect(() => { refreshMeds() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = (val) => {
    setSearch(val)
    if (!val.trim()) { setDropdown([]); return }
    const needle = val.toLowerCase()
    setDropdown(allMedicines.filter(m =>
      (m.name || '').toLowerCase().includes(needle) ||
      (m.composition || '').toLowerCase().includes(needle)
    ).slice(0, 8))
  }

  const selectMedicine = (name) => {
    if (selected.find(m => m.name === name)) { showToast(`${name} already added`, 'info'); return }
    setSelected(s => [...s, { name, dosage: '', duration: '', frequency: 'Once daily' }])
    setSearch(''); setDropdown([])
  }

  const saveAndSelectMedicine = async (name) => {
    if (!name.trim()) return
    try {
      const { data } = await API.post('/medicines/doctor/add', {
        name: name.trim(), composition: '', dosageForm: 'Tablet', doctorId,
      })
      if (data.success) {
        showToast(`"${name}" saved to My Medicines ✅`, 'success')
        refreshMeds(); selectMedicine(name)
      } else { showToast(data.message || 'Could not save medicine', 'error') }
    } catch { showToast('Server error while saving medicine', 'error') }
  }

  const updateField = (i, field, val) => setSelected(s => s.map((m, idx) => idx === i ? { ...m, [field]: val } : m))
  const remove      = (i) => setSelected(s => s.filter((_, idx) => idx !== i))
  const hasExactMatch = allMedicines.some(m => m.name.toLowerCase() === search.trim().toLowerCase())

  const submit = async () => {
    if (!selected.length) { showToast('Add at least one medicine', 'error'); return }
    const invalid = selected.find(m => !m.dosage || !m.duration)
    if (invalid) { showToast(`Fill dosage & duration for ${invalid.name}`, 'error'); return }
    try {
      const { data } = await API.post('/prescriptions/add', {
        patientId, doctorId, medicines: selected, notes,
      })
      if (data.success || data.message?.includes('success')) {
        showToast('Prescription sent!', 'success'); onSuccess?.(); onClose()
      } else { showToast(data.message || 'Failed to send', 'error') }
    } catch { showToast('Server error', 'error') }
  }

  return (
    <div className="modal active">
      <div className="modal-overlay" onClick={onClose}></div>
      <div className="modal-container" style={{ maxWidth: 600, maxHeight: '90vh', overflowY: 'auto' }}>
        <button className="modal-close" onClick={onClose}>&times;</button>
        <div className="appointment-modal-header">
          <i className="fas fa-prescription"></i>
          <h2>Write Prescription</h2>
          <p>Patient #{patientId}</p>
        </div>
        <div style={{ padding: '0 1.5rem' }}>
          <label>Search Medicine</label>
          <input type="text" placeholder="Type medicine name..." value={search} onChange={e => handleSearch(e.target.value)}
            style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 8, margin: '6px 0' }} />
          {(dropdown.length > 0 || (search.trim() && !hasExactMatch)) && (
            <div style={{ border: '1px solid var(--border)', borderRadius: 8, maxHeight: 200, overflowY: 'auto', background: 'var(--card-bg)' }}>
              {dropdown.map(m => (
                <div key={m.name} onClick={() => selectMedicine(m.name)}
                  style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid var(--border)' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f8faff'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <strong>{m.name}</strong>
                  {m.doctorId && <span style={{ marginLeft: 6, fontSize: 10, background: '#ede9fe', color: '#7c3aed', padding: '1px 6px', borderRadius: 10 }}>My Medicine</span>}
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}> · {m.dosageForm || ''}</span>
                </div>
              ))}
              {search.trim() && !hasExactMatch && (
                <div onClick={() => saveAndSelectMedicine(search.trim())}
                  style={{
                    padding: '9px 12px', cursor: 'pointer', fontSize: 13,
                    color: '#7c3aed', fontWeight: 700, background: '#faf5ff',
                    borderTop: dropdown.length > 0 ? '1px dashed #e9d5ff' : 'none',
                    display: 'flex', alignItems: 'center', gap: 8,
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#ede9fe'}
                  onMouseLeave={e => e.currentTarget.style.background = '#faf5ff'}
                >
                  <i className="fas fa-plus-circle" style={{ fontSize: 14 }}></i>
                  <span>Add &amp; save <strong>"{search.trim()}"</strong> to My Medicines</span>
                </div>
              )}
            </div>
          )}
          <div style={{ marginTop: '1rem' }}>
            {selected.length === 0 && <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>No medicines added yet.</p>}
            {selected.map((m, i) => (
              <div key={i} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 10, marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong>{m.name}</strong>
                  <button onClick={() => remove(i)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 16 }}><i className="fas fa-trash"></i></button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginTop: 8 }}>
                  <div>
                    <label style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Dosage</label>
                    <input value={m.dosage} placeholder="e.g. 500mg" onChange={e => updateField(i, 'dosage', e.target.value)}
                      style={{ width: '100%', padding: '4px 8px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13 }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Frequency</label>
                    <select value={m.frequency} onChange={e => updateField(i, 'frequency', e.target.value)}
                      style={{ width: '100%', padding: '4px 8px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13 }}>
                      {['Once daily', 'Twice daily', 'Thrice daily', 'SOS', 'As needed'].map(opt => <option key={opt}>{opt}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Duration</label>
                    <input value={m.duration} placeholder="e.g. 5 days" onChange={e => updateField(i, 'duration', e.target.value)}
                      style={{ width: '100%', padding: '4px 8px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13 }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <label style={{ marginTop: '1rem', display: 'block' }}>Notes</label>
          <textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Additional notes..."
            style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 8, resize: 'vertical' }}></textarea>
          <button className="btn btn-primary btn-full" style={{ margin: '1rem 0' }} onClick={submit}>
            <i className="fas fa-paper-plane"></i> Send Prescription
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Meeting Link Card ──────────────────────────────────────── */
function MeetingLinkCard({ link, appointment, onClose }) {
  return (
    <div style={{
      position: 'fixed', bottom: 80, right: 24, zIndex: 9999,
      background: 'white', border: '1px solid var(--border)',
      borderRadius: 12, padding: 16, width: 320,
      boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <strong style={{ fontSize: 14 }}><i className="fas fa-video" style={{ color: '#22c55e' }}></i> Meeting Ready</strong>
        <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer' }}>×</button>
      </div>
      <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 10 }}>
        {appointment?.patientName || `Patient #${appointment?.patientId}`} · {new Date(appointment?.appointmentTime).toLocaleString()}
      </p>
      <div style={{
        background: 'var(--input-bg)', border: '1px solid var(--border)',
        borderRadius: 8, padding: '8px 10px', fontSize: 11,
        wordBreak: 'break-all', marginBottom: 10, color: 'var(--text-secondary)',
      }}>{link}</div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn btn-outline btn-sm" style={{ flex: 1 }} onClick={() => navigator.clipboard.writeText(link)}>
          <i className="fas fa-copy"></i> Copy
        </button>
        <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={() => window.open(link, '_blank')}>
          <i className="fas fa-video"></i> Join Now
        </button>
      </div>
    </div>
  )
}

/* ─── Status Banner ──────────────────────────────────────────── */
function StatusBanner({ status, onAction }) {
  if (status === 'complete') return null
  return (
    <div style={{
      background: status === 'incomplete'
        ? 'linear-gradient(135deg,#667eea,#764ba2)'
        : 'linear-gradient(135deg,#f59e0b,#f97316)',
      borderRadius: 16, padding: '1.5rem 2rem', marginBottom: '1.5rem',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{ width: 48, height: 48, background: 'rgba(255,255,255,0.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <i className={`fas ${status === 'incomplete' ? 'fa-user-edit' : 'fa-clock'}`} style={{ fontSize: 24, color: 'white' }}></i>
        </div>
        <div>
          <h3 style={{ color: 'white', marginBottom: 4, fontSize: '1.1rem' }}>
            {status === 'incomplete' ? 'Complete Your Profile' : 'Awaiting Admin Approval'}
          </h3>
          <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: 14, margin: 0 }}>
            {status === 'incomplete'
              ? 'Please complete your profile to start using the dashboard and connect with patients.'
              : 'Your profile has been submitted and is pending admin approval. You will be notified once approved.'}
          </p>
        </div>
      </div>
      <button className="btn" onClick={onAction}
        style={{ background: 'white', color: status === 'incomplete' ? '#667eea' : '#f59e0b', border: 'none', padding: '10px 24px', fontWeight: 600 }}>
        <i className={`fas ${status === 'incomplete' ? 'fa-arrow-right' : 'fa-sync-alt'}`}></i>
        {status === 'incomplete' ? ' Complete Profile' : ' Check Status'}
      </button>
    </div>
  )
}

/* ─── Patient Incoming Banner ────────────────────────────────── */
function PatientIncomingBanner({ requests, onAccept, onReject }) {
  const [preference, setPreference] = useState('')
  if (!requests || requests.length === 0) return null
  const patient = requests[0]
  return (
    <div style={{
      background: 'linear-gradient(135deg,#1e40af,#3b82f6,#06b6d4)',
      borderRadius: 16, padding: '20px 24px', marginBottom: 24,
      color: 'white', boxShadow: '0 4px 20px rgba(37,99,235,0.3)',
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', top: -20, right: -20, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
          <i className="fas fa-user-injured"></i>
        </div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ background: '#fbbf24', color: '#78350f', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, textTransform: 'uppercase' }}>New Patient</span>
            <span style={{ fontSize: 12, opacity: 0.8 }}>{patient.createdAt ? timeAgoString(patient.createdAt) : 'Just now'}</span>
          </div>
          <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700 }}>
            {patient.patientName || `Patient #${patient.patientId}`} arriving
          </h3>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 13, opacity: 0.9 }}>
            {patient.symptoms && <span><i className="fas fa-stethoscope" style={{ marginRight: 4 }}></i>{patient.symptoms}</span>}
          </div>
          <input type="text" placeholder="What do you prefer? (e.g. Video call, In-person...)"
            value={preference} onChange={e => setPreference(e.target.value)}
            style={{
              marginTop: 12, width: '100%', padding: '8px 14px',
              borderRadius: 8, border: '1.5px solid rgba(255,255,255,0.3)',
              background: 'rgba(255,255,255,0.15)', color: 'white',
              fontSize: 13, outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
          <button onClick={() => onAccept(patient.id)}
            style={{ background: 'white', color: '#1e40af', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <i className="fas fa-check"></i> Accept
          </button>
          <button onClick={() => onReject(patient.id)}
            style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: '1.5px solid rgba(255,255,255,0.4)', borderRadius: 8, padding: '10px 20px', fontWeight: 600, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <i className="fas fa-times"></i> Decline
          </button>
        </div>
      </div>
      {requests.length > 1 && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.2)', fontSize: 12, opacity: 0.85 }}>
          <i className="fas fa-users" style={{ marginRight: 6 }}></i>
          +{requests.length - 1} more patient request{requests.length > 2 ? 's' : ''} waiting
        </div>
      )}
    </div>
  )
}

/* ─── Availability Toggle ────────────────────────────────────── */
function AvailabilityToggle({ isActive, onToggle }) {
  return (
    <button onClick={onToggle}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 18px', borderRadius: 50, border: 'none',
        cursor: 'pointer', fontWeight: 700, fontSize: 13, transition: 'all 0.3s ease',
        background: isActive ? 'linear-gradient(135deg,#10b981,#059669)' : 'linear-gradient(135deg,#ef4444,#dc2626)',
        color: 'white',
        boxShadow: isActive ? '0 2px 12px rgba(16,185,129,0.4)' : '0 2px 12px rgba(239,68,68,0.4)',
      }}>
      <span style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(255,255,255,0.3)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>
        <i className={`fas ${isActive ? 'fa-check' : 'fa-times'}`}></i>
      </span>
      {isActive ? 'Active' : 'Inactive'}
    </button>
  )
}

/* ─── Income Mini Cards ──────────────────────────────────────── */
// ✅ Only Today's Income + Total Income shown here.
// Consultation Fee is shown in the doctor's profile page instead.
function IncomeMiniCards({ todayIncome, totalIncome }) {
  const fmt = (n) => '₹' + n.toLocaleString('en-IN')
  return (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 14 }}>

      {/* Today's Income */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        background: 'linear-gradient(135deg,#ecfdf5,#d1fae5)',
        border: '1px solid #6ee7b7', borderRadius: 12, padding: '10px 16px', minWidth: 160,
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          background: 'linear-gradient(135deg,#10b981,#059669)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <i className="fas fa-sun" style={{ color: 'white', fontSize: 14 }}></i>
        </div>
        <div>
          <div style={{ fontSize: 10, color: '#065f46', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Today's Income</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#064e3b', lineHeight: 1.2 }}>{fmt(todayIncome)}</div>
        </div>
      </div>

      {/* Total Income */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        background: 'linear-gradient(135deg,#eff6ff,#dbeafe)',
        border: '1px solid #93c5fd', borderRadius: 12, padding: '10px 16px', minWidth: 160,
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          background: 'linear-gradient(135deg,#2563eb,#1d4ed8)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <i className="fas fa-wallet" style={{ color: 'white', fontSize: 14 }}></i>
        </div>
        <div>
          <div style={{ fontSize: 10, color: '#1e3a8a', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Total Income</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#1e3a8a', lineHeight: 1.2 }}>{fmt(totalIncome)}</div>
        </div>
      </div>

    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   ADD MEDICINE PANEL
   ═══════════════════════════════════════════════════════════════ */
function AddMedicinePanel({ doctorId, onBack }) {
  const [name,        setName]    = useState('')
  const [composition, setComp]    = useState('')
  const [dosageForm,  setForm]    = useState('Tablet')
  const [saving,      setSaving]  = useState(false)
  const [myMeds,      setMyMeds]  = useState([])
  const [loadingMeds, setLoading] = useState(true)
  const [deleting,    setDeleting]= useState(null)
  const showToast = useToast()

  const fetchMyMeds = async () => {
    setLoading(true)
    try {
      const { data } = await API.get(`/medicines/doctor/${doctorId}`)
      const all  = Array.isArray(data) ? data : (data.medicines || [])
      setMyMeds(all.filter(m => String(m.doctorId) === String(doctorId)))
    } catch {}
    setLoading(false)
  }

  useEffect(() => { fetchMyMeds() }, [doctorId]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleAdd = async () => {
    if (!name.trim()) { showToast('Medicine name is required', 'error'); return }
    setSaving(true)
    try {
      const { data } = await API.post('/medicines/doctor/add', {
        name: name.trim(), composition, dosageForm, doctorId,
      })
      if (data.success) {
        showToast(`${name} added to your medicine list ✅`, 'success')
        setName(''); setComp(''); setForm('Tablet')
        fetchMyMeds()
      } else { showToast(data.message || 'Failed to add', 'error') }
    } catch { showToast('Server error', 'error') }
    setSaving(false)
  }

  const handleDelete = async (id, medName) => {
    if (!window.confirm(`Remove "${medName}" from your list?`)) return
    setDeleting(id)
    try {
      const { data } = await API.delete(`/medicines/doctor/${id}`)
      if (data.success) { showToast(`${medName} removed`, 'info'); fetchMyMeds() }
      else { showToast(data.message || 'Could not delete', 'error') }
    } catch { showToast('Server error', 'error') }
    setDeleting(null)
  }

  return (
    <div>
      <div style={{ background: 'white', borderRadius: 14, padding: '16px 22px', boxShadow: '0 2px 10px rgba(0,0,0,0.06)', border: '1px solid #f0f0f0', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 14 }}>
        <button onClick={onBack} style={{ background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontSize: 13, color: '#374151', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <i className="fas fa-arrow-left"></i> Back
        </button>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#111827' }}>
            <i className="fas fa-pills" style={{ marginRight: 10, color: '#7c3aed' }}></i>My Medicine List
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6b7280' }}>Add medicines you prescribe — only visible on your dashboard</p>
        </div>
      </div>

      <div style={{ background: 'white', borderRadius: 14, padding: '20px 24px', boxShadow: '0 2px 10px rgba(0,0,0,0.06)', border: '1px solid #f0f0f0', marginBottom: 20 }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: '#374151' }}>
          <i className="fas fa-plus-circle" style={{ marginRight: 8, color: '#7c3aed' }}></i>Add New Medicine
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr', gap: 12, marginBottom: 14 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Medicine Name *</label>
            <input value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAdd()} placeholder="e.g. Paracetamol 500mg"
              style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 13, boxSizing: 'border-box', outline: 'none' }} />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Composition</label>
            <input value={composition} onChange={e => setComp(e.target.value)} placeholder="e.g. Acetaminophen"
              style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 13, boxSizing: 'border-box', outline: 'none' }} />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Form</label>
            <select value={dosageForm} onChange={e => setForm(e.target.value)}
              style={{ width: '100%', padding: '9px 10px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 13, color: '#374151' }}>
              {['Tablet','Capsule','Syrup','Injection','Cream','Drops','Inhaler','Powder'].map(f => <option key={f}>{f}</option>)}
            </select>
          </div>
        </div>
        <button onClick={handleAdd} disabled={saving}
          style={{ background: saving ? '#94a3b8' : 'linear-gradient(135deg,#7c3aed,#2563eb)', color: 'white', border: 'none', borderRadius: 8, padding: '10px 24px', fontWeight: 700, fontSize: 13, cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
          <i className={`fas ${saving ? 'fa-spinner fa-spin' : 'fa-plus'}`}></i>
          {saving ? 'Adding...' : 'Add Medicine'}
        </button>
      </div>

      <div style={{ background: 'white', borderRadius: 14, padding: '20px 24px', boxShadow: '0 2px 10px rgba(0,0,0,0.06)', border: '1px solid #f0f0f0' }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: '#374151' }}>
          <i className="fas fa-list" style={{ marginRight: 8, color: '#2563eb' }}></i>My Added Medicines ({myMeds.length})
        </h3>
        {loadingMeds ? (
          <div style={{ textAlign: 'center', padding: 32 }}><i className="fas fa-spinner fa-spin" style={{ fontSize: 28, color: '#7c3aed' }}></i></div>
        ) : myMeds.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>
            <i className="fas fa-pills" style={{ fontSize: 42, display: 'block', marginBottom: 14, color: '#d1d5db' }}></i>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>No medicines added yet</p>
            <p style={{ margin: '6px 0 0', fontSize: 13 }}>Use the form above to add your first medicine</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
            {myMeds.map((med) => (
              <div key={med.id} style={{ background: 'linear-gradient(135deg,#faf5ff,#f5f3ff)', border: '1.5px solid #e9d5ff', borderRadius: 12, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8, position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#6d28d9', flex: 1, paddingRight: 8 }}>{med.name}</div>
                  <button onClick={() => handleDelete(med.id, med.name)} disabled={deleting === med.id} title="Remove medicine"
                    style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 13, padding: 2, flexShrink: 0, opacity: deleting === med.id ? 0.5 : 1 }}>
                    <i className={`fas ${deleting === med.id ? 'fa-spinner fa-spin' : 'fa-trash'}`}></i>
                  </button>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {med.composition && <span style={{ fontSize: 11, color: '#7c3aed', background: '#ede9fe', padding: '2px 8px', borderRadius: 10 }}>{med.composition}</span>}
                  <span style={{ fontSize: 11, color: '#6b7280', background: '#f3f4f6', padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>{med.dosageForm || 'Tablet'}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   ADD TESTS PANEL
   ═══════════════════════════════════════════════════════════════ */
function AddTestsPanel({ doctorId, onBack }) {
  const [name,       setName]     = useState('')
  const [category,   setCategory] = useState('Pathology')
  const [saving,     setSaving]   = useState(false)
  const [myTests,    setMyTests]  = useState([])
  const [loading,    setLoading]  = useState(true)
  const [deleting,   setDeleting] = useState(null)
  const showToast = useToast()

  const fetchMyTests = async () => {
    setLoading(true)
    try {
      const { data } = await API.get(`/tests/doctor/${doctorId}`)
      const all  = Array.isArray(data) ? data : (data.tests || [])
      setMyTests(all.filter(t => String(t.doctorId) === String(doctorId)))
    } catch {}
    setLoading(false)
  }

  useEffect(() => { fetchMyTests() }, [doctorId]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleAdd = async () => {
    if (!name.trim()) { showToast('Test name is required', 'error'); return }
    setSaving(true)
    try {
      const { data } = await API.post('/tests/doctor/add', {
        name: name.trim(), category, doctorId,
      })
      if (data.success) { showToast(`${name} added to your test list ✅`, 'success'); setName(''); fetchMyTests() }
      else { showToast(data.message || 'Failed to add', 'error') }
    } catch { showToast('Server error', 'error') }
    setSaving(false)
  }

  const handleDelete = async (id, testName) => {
    if (!window.confirm(`Remove "${testName}" from your list?`)) return
    setDeleting(id)
    try {
      const { data } = await API.delete(`/tests/doctor/${id}`)
      if (data.success) { showToast(`${testName} removed`, 'info'); fetchMyTests() }
      else { showToast(data.message || 'Could not delete', 'error') }
    } catch { showToast('Server error', 'error') }
    setDeleting(null)
  }

  const CATEGORY_COLORS = {
    Pathology:  { bg: '#ecfeff', border: '#a5f3fc', text: '#0e7490', badge: '#cffafe' },
    Radiology:  { bg: '#eff6ff', border: '#bfdbfe', text: '#1d4ed8', badge: '#dbeafe' },
    Cardiology: { bg: '#fdf2f8', border: '#f0abfc', text: '#a21caf', badge: '#fae8ff' },
    Other:      { bg: '#f9fafb', border: '#d1d5db', text: '#374151', badge: '#f3f4f6' },
  }

  return (
    <div>
      <div style={{ background: 'white', borderRadius: 14, padding: '16px 22px', boxShadow: '0 2px 10px rgba(0,0,0,0.06)', border: '1px solid #f0f0f0', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 14 }}>
        <button onClick={onBack} style={{ background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontSize: 13, color: '#374151', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <i className="fas fa-arrow-left"></i> Back
        </button>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#111827' }}>
            <i className="fas fa-flask" style={{ marginRight: 10, color: '#0891b2' }}></i>My Test List
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6b7280' }}>Add tests you frequently order — auto-suggested when writing appointments</p>
        </div>
      </div>

      <div style={{ background: 'white', borderRadius: 14, padding: '20px 24px', boxShadow: '0 2px 10px rgba(0,0,0,0.06)', border: '1px solid #f0f0f0', marginBottom: 20 }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: '#374151' }}>
          <i className="fas fa-plus-circle" style={{ marginRight: 8, color: '#0891b2' }}></i>Add New Test
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: 12, marginBottom: 14 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Test Name *</label>
            <input value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAdd()} placeholder="e.g. Complete Blood Count, Chest X-Ray, ECG..."
              style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 13, boxSizing: 'border-box', outline: 'none' }} />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Category</label>
            <select value={category} onChange={e => setCategory(e.target.value)}
              style={{ width: '100%', padding: '9px 10px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 13, color: '#374151' }}>
              {['Pathology', 'Radiology', 'Cardiology', 'Other'].map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <button onClick={handleAdd} disabled={saving}
          style={{ background: saving ? '#94a3b8' : 'linear-gradient(135deg,#0891b2,#0e7490)', color: 'white', border: 'none', borderRadius: 8, padding: '10px 24px', fontWeight: 700, fontSize: 13, cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
          <i className={`fas ${saving ? 'fa-spinner fa-spin' : 'fa-plus'}`}></i>
          {saving ? 'Adding...' : 'Add Test'}
        </button>
      </div>

      <div style={{ background: 'white', borderRadius: 14, padding: '20px 24px', boxShadow: '0 2px 10px rgba(0,0,0,0.06)', border: '1px solid #f0f0f0' }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: '#374151' }}>
          <i className="fas fa-list" style={{ marginRight: 8, color: '#0891b2' }}></i>My Added Tests ({myTests.length})
        </h3>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 32 }}><i className="fas fa-spinner fa-spin" style={{ fontSize: 28, color: '#0891b2' }}></i></div>
        ) : myTests.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>
            <i className="fas fa-flask" style={{ fontSize: 42, display: 'block', marginBottom: 14, color: '#d1d5db' }}></i>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>No tests added yet</p>
            <p style={{ margin: '6px 0 0', fontSize: 13 }}>Use the form above to add your first test</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
            {myTests.map((test) => {
              const colors = CATEGORY_COLORS[test.category] || CATEGORY_COLORS.Other
              return (
                <div key={test.id} style={{ background: colors.bg, border: `1.5px solid ${colors.border}`, borderRadius: 12, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: colors.text, flex: 1, paddingRight: 8 }}>
                      <i className="fas fa-flask" style={{ marginRight: 6, fontSize: 11, opacity: 0.7 }}></i>{test.name}
                    </div>
                    <button onClick={() => handleDelete(test.id, test.name)} disabled={deleting === test.id} title="Remove test"
                      style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 13, padding: 2, flexShrink: 0, opacity: deleting === test.id ? 0.5 : 1 }}>
                      <i className={`fas ${deleting === test.id ? 'fa-spinner fa-spin' : 'fa-trash'}`}></i>
                    </button>
                  </div>
                  <span style={{ fontSize: 11, color: colors.text, background: colors.badge, padding: '2px 8px', borderRadius: 10, alignSelf: 'flex-start', fontWeight: 600 }}>
                    {test.category || 'Other'}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   MY PATIENTS VIEW
   ═══════════════════════════════════════════════════════════════ */
function MyPatientsView({ patients, onViewRecords, onPrescribe, onBack }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24, background: 'white', borderRadius: 14, padding: '16px 22px', boxShadow: '0 2px 10px rgba(0,0,0,0.06)', border: '1px solid #f0f0f0' }}>
        <button onClick={onBack} style={{ background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontSize: 13, color: '#374151', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
          <i className="fas fa-arrow-left"></i> Back
        </button>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#111827' }}>
            <i className="fas fa-user-injured" style={{ marginRight: 10, color: '#2563eb' }}></i>My Patients
          </h2>
          <p style={{ margin: '2px 0 0', fontSize: 13, color: '#6b7280' }}>{patients.length} patient{patients.length !== 1 ? 's' : ''} consulted</p>
        </div>
      </div>

      {patients.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '64px 24px', background: 'white', borderRadius: 16, border: '1.5px dashed #e5e7eb' }}>
          <i className="fas fa-user-injured" style={{ fontSize: 48, color: '#d1d5db', display: 'block', marginBottom: 16 }}></i>
          <h3 style={{ margin: '0 0 8px', color: '#374151' }}>No patients yet</h3>
          <p style={{ color: '#9ca3af', margin: 0, fontSize: 14 }}>Patients will appear here after you complete appointments and save records.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 14 }}>
          {patients.map((a, i) => (
            <div key={i} style={{ background: 'white', border: '1.5px solid #e5e7eb', borderRadius: 16, padding: '18px 22px', display: 'flex', alignItems: 'center', gap: 16, boxShadow: '0 1px 6px rgba(0,0,0,0.05)', transition: 'box-shadow 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(37,99,235,0.1)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 6px rgba(0,0,0,0.05)'}
            >
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'linear-gradient(135deg,#2563eb,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: 18, flexShrink: 0 }}>
                {(a.patientName || 'P').charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#111827', marginBottom: 4 }}>{a.patientName || `Patient #${a.patientId}`}</div>
                <div style={{ fontSize: 12, color: '#6b7280', display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                  <span><i className="fas fa-calendar-check" style={{ marginRight: 4, color: '#2563eb' }}></i>Last visit: {formatDate(a.appointmentTime)}</span>
                  {a.symptoms && <span><i className="fas fa-stethoscope" style={{ marginRight: 4, color: '#7c3aed' }}></i>{a.symptoms.slice(0, 40)}{a.symptoms.length > 40 ? '…' : ''}</span>}
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: '#dcfce7', color: '#16a34a', border: '1px solid #86efac' }}>✓ Completed</span>
                  {a.diagnosis && <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe' }}><i className="fas fa-file-medical" style={{ marginRight: 3 }}></i>Record Saved</span>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0, flexWrap: 'wrap' }}>
                <button onClick={() => onViewRecords(a)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'linear-gradient(135deg,#eff6ff,#dbeafe)', color: '#1d4ed8', border: '1.5px solid #bfdbfe', borderRadius: 8, padding: '8px 14px', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                  <i className="fas fa-folder-open"></i> Records
                </button>
                <button onClick={() => onPrescribe(a)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'linear-gradient(135deg,#2563eb,#7c3aed)', color: 'white', border: 'none', borderRadius: 8, padding: '8px 14px', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                  <i className="fas fa-prescription"></i> Prescribe
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════ */
export default function SoloDoctorDashboard() {
  const { user: doctor, logout } = useAuth()
  const navigate  = useNavigate()
  const showToast = useToast()

  const mountedRef = useRef(true)
  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  const [profile,              setProfile]              = useState(null)
  const [allAppointments,      setAllAppointments]      = useState([])
  const [stats,                setStats]                = useState({ today: '-', total: '-', newMonth: '-', prescriptions: '-' })
  const [income,               setIncome]               = useState({ todayIncome: 0, totalIncome: 0 })
  const [schedule,             setSchedule]             = useState([])
  const [recentPatients,       setRecentPatients]       = useState([])
  const [pendingPrescriptions, setPendingPrescriptions] = useState([])
  const [requests,             setRequests]             = useState([])
  const [prescriptionModal,    setPrescriptionModal]    = useState(null)
  const [meetingCard,          setMeetingCard]          = useState(null)
  const [patientRecordModal,   setPatientRecordModal]   = useState(null)
  const [currentTime,          setCurrentTime]          = useState(new Date())
  const [userDropdown,         setUserDropdown]         = useState(false)
  const [activeNav,            setActiveNav]            = useState('home')
  const [profileStatus,        setProfileStatus]        = useState({ isProfileComplete: false, isApproved: false, isLoading: true })
  const [isActive,             setIsActive]             = useState(false)

  useEffect(() => {
    if (!doctor || !doctor.id) { navigate('/'); return }

    const fetchFreshProfile = async () => {
      try {
        const { data } = await API.get(`/auth/doctors/${doctor.id}`)
        if (!mountedRef.current) return

        const freshDoc = data.doctor || data
        setIsActive(freshDoc.isActive === true)

        const isComplete = !!(freshDoc.specialization && freshDoc.experience && (freshDoc.licenseNumber || freshDoc.regNum))
        const isApproved = freshDoc.verificationStatus === 'approved'

        let status = 'incomplete'
        if (isApproved)      status = 'complete'
        else if (isComplete) status = 'pending'

        setProfileStatus({ isProfileComplete: isApproved ? true : isComplete, isApproved, status, isLoading: false })
        setProfile(freshDoc)
      } catch (err) {
        console.error('Failed to fetch fresh doctor profile:', err)
        if (!mountedRef.current) return
        const message = err?.response?.data?.message || 'Doctor status not found'
        setIsActive(false)
        setProfileStatus({ isProfileComplete: false, isApproved: false, isLoading: false })
        setProfile(doctor)
        showToast(message, 'error')
      }
    }

    fetchFreshProfile()
    loadAllAppointments()
    loadPrescriptions()
    loadRequests()

    const timer = setInterval(() => {
      if (!mountedRef.current) return
      setCurrentTime(new Date())
    }, 60000)

    return () => clearInterval(timer)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const toggleActive = async () => {
    if (!doctor?.id) { showToast('Session expired — please log out and log back in', 'error'); return }
    const next = !isActive
    setIsActive(next)
    showToast(next ? '✅ You are now Active' : '🔴 You are now Inactive', next ? 'success' : 'info')
    try {
      const { data } = await API.patch(`/auth/doctors/${doctor.id}/active`, { isActive: next })
      if (!mountedRef.current) return
      if (!data.success) { setIsActive(!next); showToast(data.message || 'Could not update status', 'error') }
    } catch {
      if (!mountedRef.current) return
      setIsActive(!next); showToast('Network error — status not saved', 'error')
    }
  }

  async function loadAllAppointments() {
    if (!doctor?.id) return
    try {
      const { data } = await API.get(`/appointments/doctor/${doctor.id}`)
      if (!mountedRef.current) return

      const all = data.appointments || []
      const approved = all.filter(a => a.doctorApproved === true)
      setAllAppointments(approved)

      const fee = profile?.consultationFee || 500
      const { todayIncome, totalIncome } = calcIncome(approved, fee)
      setIncome({ todayIncome, totalIncome })

      const now = new Date()
      const todayStr = now.toDateString()

      setStats(s => ({
        ...s,
        today:    all.filter(a => new Date(a.appointmentTime).toDateString() === todayStr).length,
        total:    [...new Set(approved.map(a => a.patientId))].length,
        newMonth: all.filter(a => {
          const d = new Date(a.createdAt)
          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
        }).length,
      }))

      const todayAppts = all
        .filter(a => new Date(a.appointmentTime).toDateString() === todayStr)
        .sort((a, b) => new Date(a.appointmentTime) - new Date(b.appointmentTime))

      setSchedule(todayAppts)

      const seen = new Map()
      approved
        .sort((a, b) => new Date(b.appointmentTime) - new Date(a.appointmentTime))
        .forEach(a => { if (!seen.has(a.patientId)) seen.set(a.patientId, a) })
      setRecentPatients([...seen.values()])

    } catch (err) {
      console.error(err)
      if (mountedRef.current) setSchedule([])
    }
  }

  async function loadPrescriptions() {
    if (!doctor?.id) return
    try {
      const { data } = await API.get(`/prescriptions/doctor/${doctor.id}`)
      if (!mountedRef.current) return
      let all = []
      if (Array.isArray(data))                    all = data
      else if (Array.isArray(data.prescriptions)) all = data.prescriptions
      else if (Array.isArray(data.data))          all = data.data
      setPendingPrescriptions(all.filter(p => p.status === 'pending'))
      setStats(s => ({ ...s, prescriptions: all.length }))
    } catch (err) { console.error('loadPrescriptions error:', err) }
  }

  async function loadRequests() {
    if (!doctor?.id) return
    try {
      const { data } = await API.get(`/appointments/doctor/${doctor.id}/pending`)
      if (!mountedRef.current) return
      setRequests(data.appointments || [])
    } catch (err) { console.error(err) }
  }

  async function respondToRequest(id, action) {
    try {
      if (action === 'accepted') {
        const { data } = await API.patch(`/appointments/${id}/approve`)
        if (data.success) {
          showToast('Appointment approved ✅', 'success')
          if (data.meetingLink) setMeetingCard({ link: data.meetingLink, appointment: data.appointment })
          loadRequests(); loadAllAppointments()
        } else { showToast(data.message || 'Approval failed', 'error') }
      } else {
        await API.put(`/appointments/status/${id}`, { status: 'cancelled' })
        showToast('Request declined.', 'info'); loadRequests(); loadAllAppointments()
      }
    } catch (err) { showToast('Server error: ' + err.message, 'error') }
  }

  const handleLogout = () => { logout(); navigate('/') }
  const d        = profile || doctor
  const hour     = currentTime.getHours()
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening'
  const initials = d?.name ? d.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'DR'

  let bannerStatus = null
  if (!profileStatus.isApproved) {
    bannerStatus = profileStatus.isProfileComplete ? 'pending' : 'incomplete'
  }

  const isContentVisible = profileStatus.isApproved

  if (profileStatus.isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <i className="fas fa-spinner fa-spin" style={{ fontSize: 48, color: '#2563eb' }}></i>
          <p style={{ marginTop: '1rem', color: '#6b7280' }}>Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="pd-layout">
      <style>{`
        .dd-content-area { position: relative; transition: opacity 0.4s ease; }
        .dd-content-area.inactive { opacity: 0.38; pointer-events: none; filter: grayscale(60%); }
        .dd-closed-badge { position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%); z-index: 10; background: rgba(30,30,30,0.82); color: white; border-radius: 16px; padding: 20px 32px; text-align: center; backdrop-filter: blur(4px); pointer-events: all; white-space: nowrap; }
        .dd-closed-badge h3 { margin: 0 0 6px; font-size: 20px; }
        .dd-closed-badge p  { margin: 0 0 14px; font-size: 13px; opacity: 0.8; }
      `}</style>

      {/* TOPBAR */}
      <header className="pd-topbar">
        <a href="/" className="logo" style={{ textDecoration: 'none' }}>
          <img className="logo-img" src="/assets/logo.png" alt="CURELEX" style={{ height: 40 }} />
        </a>
        <div className="pd-topbar__right">
          <div className="pd-topbar__location">
            <i className="fas fa-map-marker-alt"></i>
            {d?.hospital || 'My Clinic'}
            <i className="fas fa-chevron-down" style={{ fontSize: 10 }}></i>
          </div>
          <AvailabilityToggle isActive={isActive} onToggle={toggleActive} />
          <div className="pd-user-menu" style={{ display: 'flex' }}>
            <div className="pd-user-menu__trigger" onClick={() => setUserDropdown(o => !o)}>
              <div className="pd-user-menu__avatar">{initials}</div>
              <span className="pd-user-menu__name">Dr. {d?.name}</span>
              <i className="fas fa-chevron-down" style={{ fontSize: 10, color: 'var(--text-secondary)' }}></i>
            </div>
            {userDropdown && (
              <>
                <div className="pd-user-dropdown-overlay" onClick={() => setUserDropdown(false)} />
                <div className="pd-user-dropdown">
                  <div className="pd-user-dropdown__info">
                    <strong>Dr. {d?.name}</strong>
                    <span>{d?.specialization || doctor?.email}</span>
                  </div>
                  <div className="pd-user-dropdown__divider" />
                  {NAV_ITEMS.map((item, i) =>
                    item.divider
                      ? <div key={i} className="pd-user-dropdown__divider" />
                      : (
                        <button key={item.key}
                          className={`pd-user-dropdown__item${activeNav === item.key ? ' active' : ''}`}
                          onClick={() => {
                            setUserDropdown(false)
                            if (item.key === 'profile') navigate('/doctor-profile-view')
                            else if (item.key === 'patients') setActiveNav('patients')
                            else if (item.key === 'home') setActiveNav('home')
                            else if (item.key === 'medicines') setActiveNav('medicines')
                            else if (item.key === 'mytests') setActiveNav('mytests')
                            else { setActiveNav(item.key); showToast(`${item.label} coming soon!`, 'info') }
                          }}>
                          <i className={`fas ${item.icon}`}></i> {item.label}
                        </button>
                      )
                  )}
                  <div className="pd-user-dropdown__divider" />
                  <button className="pd-user-dropdown__item pd-user-dropdown__item--danger" onClick={handleLogout}>
                    <i className="fas fa-sign-out-alt"></i> Logout
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* MAIN */}
      <div className="pd-below-header">
        <div className="pd-main" style={{ width: '100%' }}>
          <main className="pd-body">

            {/* Welcome Header */}
            <div style={{
              display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
              background: 'white', borderRadius: 16, padding: '20px 28px',
              boxShadow: '0 2px 12px rgba(0,0,0,0.07)', marginBottom: 24,
              border: '1px solid #f0f0f0', gap: 16, flexWrap: 'wrap',
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 13, color: '#6b7280', fontWeight: 500 }}>{greeting} 👋</p>
                <h1 style={{ margin: '4px 0 8px', fontSize: 'clamp(20px,4vw,28px)', fontWeight: 700, color: '#111827' }}>
                  Hi, Dr. {d?.name || 'Doctor'}
                </h1>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 13, color: '#6b7280' }}>
                  {d?.specialization && <span><i className="fas fa-stethoscope" style={{ marginRight: 5, color: '#2563eb' }}></i>{d.specialization}</span>}
                  {d?.hospital      && <span><i className="fas fa-hospital"     style={{ marginRight: 5, color: '#10b981' }}></i>{d.hospital}</span>}
                  <span>
                    <i className="fas fa-clock" style={{ marginRight: 5, color: '#f59e0b' }}></i>
                    {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} · {currentTime.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' })}
                  </span>
                </div>

                {/* ✅ Only Today's Income + Total Income — fee is in profile page */}
                <IncomeMiniCards
                  todayIncome={income.todayIncome}
                  totalIncome={income.totalIncome}
                />
              </div>
              <div style={{ position: 'relative', flexShrink: 0, alignSelf: 'flex-start' }}>
               <div
  style={{
    width: 110,
    height: 110,
    borderRadius: "50%",
    overflow: "hidden",
    background: d?.photoUrl
      ? `url(${d.photoUrl}) center/cover`
      : "linear-gradient(135deg,#eff6ff,#dbeafe)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 4px 12px rgba(37,99,235,0.15)",
    border: "3px solid white",
  }}
>
  {!d?.photoUrl && (
    <i
      className="fas fa-user-md"
      style={{
        fontSize: 48,
        color: "#2563eb",
      }}
    />
  )}
</div>
                <div style={{
                  position: 'absolute', bottom: 2, right: 2,
                  width: 20, height: 20, borderRadius: '50%',
                  background: isActive && isContentVisible ? '#10b981' : '#9ca3af',
                  border: '2.5px solid white', transition: 'background 0.3s',
                }} />
              </div>
            </div>

            {bannerStatus && (
              <StatusBanner
                status={bannerStatus}
                onAction={bannerStatus === 'incomplete' ? () => navigate('/doctor-profile-form') : () => navigate('/doctor-profile-view')}
              />
            )}

            {activeNav === 'patients' && isContentVisible && (
              <MyPatientsView
                patients={recentPatients}
                onViewRecords={(a) => setPatientRecordModal({ patientId: a.patientId, patientName: a.patientName })}
                onPrescribe={(a) => setPrescriptionModal({ patientId: a.patientId, appointmentId: null })}
                onBack={() => setActiveNav('home')}
              />
            )}

            {activeNav === 'medicines' && isContentVisible && (
              <AddMedicinePanel doctorId={doctor.id} onBack={() => setActiveNav('home')} />
            )}

            {activeNav === 'mytests' && isContentVisible && (
              <AddTestsPanel doctorId={doctor.id} onBack={() => setActiveNav('home')} />
            )}

            {activeNav !== 'patients' && activeNav !== 'medicines' && activeNav !== 'mytests' && isContentVisible && isActive && (
              <PatientIncomingBanner
                requests={requests}
                onAccept={id => respondToRequest(id, 'accepted')}
                onReject={id => respondToRequest(id, 'rejected')}
              />
            )}

            {activeNav !== 'patients' && activeNav !== 'medicines' && activeNav !== 'mytests' && isContentVisible && (
              <div className={`dd-content-area${isActive ? '' : ' inactive'}`}>
                {!isActive && (
                  <div className="dd-closed-badge">
                    <h3>🔴 Clinic Closed</h3>
                    <p>You are currently not accepting patients</p>
                    <button onClick={toggleActive}
                      style={{ background: '#10b981', color: 'white', border: 'none', borderRadius: 8, padding: '10px 24px', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
                      Go Active Now
                    </button>
                  </div>
                )}

                <div className="pd-stats" style={{ marginBottom: 24 }}>
                  {[
                    { icon: 'fa-users',                   cls: '--blue',   num: stats.total,         label: 'Total Patients'       },
                    { icon: 'fa-calendar-check',          cls: '--green',  num: stats.today,         label: "Today's Appointments" },
                    { icon: 'fa-user-plus',               cls: '--orange', num: stats.newMonth,      label: 'New This Month'       },
                    { icon: 'fa-prescription-bottle-alt', cls: '--purple', num: stats.prescriptions, label: 'Total Prescriptions'  },
                  ].map(s => (
                    <div className="pd-stat-card" key={s.label}>
                      <div className={`pd-stat-card__icon pd-stat-card__icon${s.cls}`}><i className={`fas ${s.icon}`}></i></div>
                      <div>
                        <div className="pd-stat-card__num">{s.num}</div>
                        <div className="pd-stat-card__label">{s.label}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="dashboard-grid">

                  <div className="dashboard-card full-width">
                    <div className="card-header">
                      <i className="fas fa-calendar-day"></i>
                      <h3>Today's Schedule</h3>
                      {schedule.length > 0 && (
                        <span style={{ marginLeft: 'auto', fontSize: 12, background: '#dbeafe', color: '#1d4ed8', padding: '3px 10px', borderRadius: 20, fontWeight: 600 }}>
                          {schedule.length} appointment{schedule.length !== 1 ? 's' : ''} today
                        </span>
                      )}
                    </div>
                    <div className="card-body">
                      {schedule.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '32px 0', color: '#9ca3af' }}>
                          <i className="fas fa-calendar-times" style={{ fontSize: 36, marginBottom: 10, display: 'block' }}></i>
                          <p style={{ margin: 0, fontSize: 14 }}>No appointments scheduled for today.</p>
                        </div>
                      ) : (
                        schedule.map((appt, i) => (
                          <PatientAppointmentCard key={appt.id || i} appt={appt} index={i} doctorId={doctor.id} />
                        ))
                      )}
                    </div>
                  </div>

                  <div className="dashboard-card">
                    <div className="card-header"><i className="fas fa-user-injured"></i><h3>Recent Patients</h3></div>
                    <div className="card-body">
                      <div className="patients-list">
                        {recentPatients.length === 0 && <p style={{ color: 'var(--text-secondary)' }}>No patients yet.</p>}
                        {recentPatients.slice(0, 5).map((a, i) => (
                          <div className="patient-item" key={i}>
                            <div className="patient-avatar"><i className="fas fa-user"></i></div>
                            <div className="patient-info">
                              <h4>{a.patientName || `Patient #${a.patientId}`}</h4>
                              <p>Last: {formatDate(a.appointmentTime)}</p>
                            </div>
                            <div style={{ display: 'flex', gap: 6, flexDirection: 'column' }}>
                              <button className="btn btn-outline btn-sm" style={{ fontSize: 11, padding: '4px 10px' }}
                                onClick={() => setPatientRecordModal({ patientId: a.patientId, patientName: a.patientName })}>
                                <i className="fas fa-folder-open" style={{ marginRight: 4 }}></i>Records
                              </button>
                              <button className="btn btn-outline btn-sm" style={{ fontSize: 11, padding: '4px 10px' }}
                                onClick={() => setPrescriptionModal({ patientId: a.patientId, appointmentId: null })}>
                                Prescribe
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                      <button className="btn btn-primary btn-full" style={{ marginTop: '1rem' }} onClick={() => setActiveNav('patients')}>
                        <i className="fas fa-users"></i> View All Patients
                      </button>
                    </div>
                  </div>

                  <div className="dashboard-card">
                    <div className="card-header"><i className="fas fa-prescription"></i><h3>Pending Prescriptions</h3></div>
                    <div className="card-body">
                      <div className="prescription-list">
                        {pendingPrescriptions.length === 0 && <p style={{ color: 'var(--text-secondary)' }}>No pending prescriptions.</p>}
                        {pendingPrescriptions.map((p, i) => (
                          <div className="prescription-item pending" key={i}>
                            <div className="prescription-icon"><i className="fas fa-clock"></i></div>
                            <div className="prescription-info">
                              <h4>{p.patientName || 'Patient'}</h4>
                              <p>Pending since: {p.createdAt ? formatDate(p.createdAt) : 'N/A'}</p>
                            </div>
                            <button className="btn btn-primary btn-sm" onClick={() => showToast('Opening editor...', 'info')}>Write</button>
                          </div>
                        ))}
                      </div>
                      <button className="btn btn-primary btn-full" style={{ marginTop: '1rem' }}
                        onClick={() => {
                          const pid = window.prompt('Enter Patient ID:')
                          if (pid) setPrescriptionModal({ patientId: parseInt(pid), appointmentId: null })
                        }}>
                        <i className="fas fa-plus"></i> Write New Prescription
                      </button>
                    </div>
                  </div>

                  <div className="dashboard-card">
                    <div className="card-header"><i className="fas fa-user-plus"></i><h3>New Patient Requests</h3></div>
                    <div className="card-body">
                      <div className="request-list">
                        {requests.length === 0 && <p style={{ color: 'var(--text-secondary)' }}>No new patient requests.</p>}
                        {requests.map((r, i) => (
                          <div className="request-item" key={i}>
                            <div className="request-avatar"><i className="fas fa-user"></i></div>
                            <div className="request-info">
                              <h4>{r.patientName || `Patient #${r.patientId}`}</h4>
                              <p>{r.symptoms || 'Video Consultation'}</p>
                              <span className="request-time">Requested: {r.createdAt ? timeAgoString(r.createdAt) : 'Recently'}</span>
                            </div>
                            <div className="request-actions">
                              <button className="btn btn-primary btn-sm" title="Accept" onClick={() => respondToRequest(r.id, 'accepted')}><i className="fas fa-check"></i></button>
                              <button className="btn btn-outline btn-sm" title="Reject" onClick={() => respondToRequest(r.id, 'rejected')}><i className="fas fa-times"></i></button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="dashboard-card">
                    <div className="card-header"><i className="fas fa-user-md"></i><h3>Your Profile</h3></div>
                    <div className="card-body">
                      <div className="profile-summary">
                        <div className="profile-avatar-large">
                          {d?.photoUrl
                            ? <img src={d.photoUrl} alt="Doctor" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                            : <i className="fas fa-user-md"></i>}
                        </div>
                        <div className="profile-details">
                          <h4>Dr. {d?.name || '-'}</h4>
                          <p className="specialization">{d?.specialization || '-'}</p>
                          <p className="hospital"><i className="fas fa-hospital"></i> {d?.hospital || d?.regState || 'N/A'}</p>
                          <div className="profile-stats">
                            <div><span className="number">{d?.experience != null ? d.experience + '+' : '-'}</span><span className="label">Years Exp.</span></div>
                            <div><span className="number">{stats.total}+</span><span className="label">Patients</span></div>
                          </div>
                        </div>
                      </div>
                      <button className="btn btn-outline btn-full" onClick={() => navigate('/doctor-profile-view')}>
                        <i className="fas fa-edit"></i> Edit Profile
                      </button>
                    </div>
                  </div>

                  <div className="dashboard-card">
                    <div className="card-header">
                      <i className="fas fa-pills" style={{ color: '#7c3aed' }}></i>
                      <h3>My Medicines</h3>
                    </div>
                    <div className="card-body" style={{ textAlign: 'center', padding: '24px 16px' }}>
                      <i className="fas fa-pills" style={{ fontSize: 36, color: '#e9d5ff', display: 'block', marginBottom: 12 }}></i>
                      <p style={{ color: '#6b7280', fontSize: 13, margin: '0 0 16px' }}>Manage your personal medicine list used when writing prescriptions.</p>
                      <button className="btn btn-primary btn-full" style={{ background: 'linear-gradient(135deg,#7c3aed,#2563eb)', border: 'none' }} onClick={() => setActiveNav('medicines')}>
                        <i className="fas fa-plus"></i> Add / View Medicines
                      </button>
                    </div>
                  </div>

                  <div className="dashboard-card">
                    <div className="card-header">
                      <i className="fas fa-flask" style={{ color: '#0891b2' }}></i>
                      <h3>My Tests</h3>
                    </div>
                    <div className="card-body" style={{ textAlign: 'center', padding: '24px 16px' }}>
                      <i className="fas fa-flask" style={{ fontSize: 36, color: '#a5f3fc', display: 'block', marginBottom: 12 }}></i>
                      <p style={{ color: '#6b7280', fontSize: 13, margin: '0 0 16px' }}>Manage your frequently ordered tests — auto-suggested when ordering pathology or radiology.</p>
                      <button className="btn btn-primary btn-full" style={{ background: 'linear-gradient(135deg,#0891b2,#0e7490)', border: 'none' }} onClick={() => setActiveNav('mytests')}>
                        <i className="fas fa-plus"></i> Add / View Tests
                      </button>
                    </div>
                  </div>

                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      {patientRecordModal && (
        <PatientRecordModal
          patientId={patientRecordModal.patientId}
          patientName={patientRecordModal.patientName}
          doctorId={doctor.id}
          onClose={() => setPatientRecordModal(null)}
        />
      )}

      {prescriptionModal && (
        <PrescriptionModal
          patientId={prescriptionModal.patientId}
          doctorId={doctor.id}
          onClose={() => setPrescriptionModal(null)}
          onSuccess={loadPrescriptions}
        />
      )}

      {meetingCard && (
        <MeetingLinkCard
          link={meetingCard.link}
          appointment={meetingCard.appointment}
          onClose={() => setMeetingCard(null)}
        />
      )}

      <Toast />
    </div>
  )
}