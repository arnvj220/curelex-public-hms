import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import API from '../utils/api'

const SPECIALIZATIONS = [
  'General Medicine', 'Cardiology', 'Neurology', 'Orthopedics',
  'Pediatrics', 'Dermatology', 'Ophthalmology', 'ENT',
  'Psychiatry', 'Gynecology', 'Orthopedic Surgery', 'Urology',
]

export default function DoctorProfileView() {
  const { user: doctor, logout } = useAuth()
  const navigate = useNavigate()
  const showToast = useToast()

  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState(null)
  const [form, setForm] = useState({})
  const [photoPreview, setPhotoPreview] = useState(null)
  const [photoFile, setPhotoFile] = useState(null)

  useEffect(() => {
    if (!doctor?.id && !doctor?._id) {
      navigate('/login')
      return
    }
    loadProfile()
  }, [doctor, navigate])

  async function loadProfile() {
    setLoading(true)
    const doctorId = doctor?.id || doctor?._id

    try {
      const { data } = await API.get(`/auth/doctors/${doctorId}`)
      const doc = data.doctor || data
      setProfile(doc)
      setForm({
        name: doc.name || '',
        email: doc.email || '',
        mobile: doc.mobile || '',
        specialization: doc.specialization || '',
        experience: doc.experience || '',
        qualification: doc.qualification || '',
        licenseNumber: doc.licenseNumber || '',
        hospital: doc.currentInstitute || '',
        address: doc.address || '',
        consultationFee: doc.consultationFee || '',
        bio: doc.bio || '',
      })
      setPhotoPreview(doc.photoUrl || null)
    } catch {
      const stored = localStorage.getItem('doctor-data')
      if (stored) {
        const doc = JSON.parse(stored)
        setProfile(doc)
        setForm({
          name: doc.name || '',
          email: doc.email || '',
          mobile: doc.mobile || '',
          specialization: doc.specialization || '',
          experience: doc.experience || '',
          qualification: doc.qualification || '',
          licenseNumber: doc.licenseNumber || '',
          hospital: doc.currentInstitute || '',
          address: doc.address || '',
          consultationFee: doc.consultationFee || '',
          bio: doc.bio || '',
        })
        setPhotoPreview(doc.photoUrl || null)
      }
    }
    setLoading(false)
  }

  const handlePhotoChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { showToast('Image must be under 5MB', 'error'); return }
    setPhotoFile(file)
    const reader = new FileReader()
    reader.onload = (ev) => setPhotoPreview(ev.target.result)
    reader.readAsDataURL(file)
  }

  const handleSave = async () => {
    if (!form.name?.trim()) { showToast('Name is required', 'error'); return }

    const doctorId = doctor?.id || doctor?._id
    if (!doctorId) {
      showToast('Session expired. Please log in again.', 'error')
      return
    }

    setSaving(true)
    try {
      const payload = {
        name: form.name,
        email: form.email,
        mobile: form.mobile,
        specialization: form.specialization,
        experience: form.experience ? Number(form.experience) : 0,
        qualification: form.qualification,
        licenseNumber: form.licenseNumber,
        currentInstitute: form.hospital,
        address: form.address,
        consultationFee: form.consultationFee,
        bio: form.bio,
      }

      const { data } = await API.put(`/auth/doctors/${doctorId}`, payload)

      showToast('Profile updated successfully!', 'success')
      setProfile({ ...profile, ...form, ...(data.doctor || {}), photoUrl: photoPreview })
      setEditing(false)

      const stored = localStorage.getItem('doctor-data')
      if (stored) {
        const doc = JSON.parse(stored)
        localStorage.setItem('doctor-data', JSON.stringify({ ...doc, ...form, ...(data.doctor || {}), photoUrl: photoPreview }))
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Update failed', 'error')
    }
    setSaving(false)
  }

  const initials = (profile?.name || doctor?.name || 'DR')
    .split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <i className="fas fa-spinner fa-spin" style={{ fontSize: 48, color: '#2563eb' }}></i>
          <p style={{ marginTop: '1rem', color: '#6b7280' }}>Loading profile...</p>
        </div>
      </div>
    )
  }

  const d = profile

  return (
    <div style={{ minHeight: '100vh', background: '#f3f4f6', fontFamily: 'Inter, sans-serif' }}>
      {/* Top bar */}
      <header style={{
        background: 'white', borderBottom: '1px solid #e5e7eb',
        padding: '0 24px', height: 64,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => navigate('/solo-doctor-dashboard')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: 18, padding: 6, borderRadius: 8 }}>
            <i className="fas fa-arrow-left"></i>
          </button>
          <span style={{ fontWeight: 700, fontSize: 17, color: '#111827' }}>My Profile</span>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {!editing ? (
            <button onClick={() => setEditing(true)}
              style={{ background: 'linear-gradient(135deg,#2563eb,#7c3aed)', color: 'white', border: 'none', borderRadius: 10, padding: '9px 20px', fontWeight: 600, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
              <i className="fas fa-edit"></i> Edit Profile
            </button>
          ) : (
            <>
              <button onClick={() => { setEditing(false); setPhotoPreview(d?.photoUrl || null); setPhotoFile(null) }}
                style={{ background: 'white', color: '#6b7280', border: '1px solid #e5e7eb', borderRadius: 10, padding: '9px 20px', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving}
                style={{ background: 'linear-gradient(135deg,#10b981,#059669)', color: 'white', border: 'none', borderRadius: 10, padding: '9px 20px', fontWeight: 600, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', gap: 6, opacity: saving ? 0.7 : 1 }}>
                {saving ? <><i className="fas fa-spinner fa-spin"></i> Saving...</> : <><i className="fas fa-check"></i> Save Changes</>}
              </button>
            </>
          )}
          <button onClick={() => { logout(); navigate('/') }}
            style={{ background: 'white', color: '#ef4444', border: '1px solid #fca5a5', borderRadius: 10, padding: '9px 16px', fontWeight: 600, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
            <i className="fas fa-sign-out-alt"></i> Logout
          </button>
        </div>
      </header>

      <div style={{ maxWidth: 860, margin: '0 auto', padding: '32px 16px' }}>

        {/* Profile Hero Card */}
        <div style={{
          background: 'white', borderRadius: 20, padding: '32px',
          boxShadow: '0 2px 16px rgba(0,0,0,0.08)', marginBottom: 24,
          display: 'flex', gap: 28, alignItems: 'flex-start', flexWrap: 'wrap',
        }}>
          {/* Avatar */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div style={{
              width: 100, height: 100, borderRadius: '50%',
              background: photoPreview ? 'transparent' : 'linear-gradient(135deg,#2563eb,#7c3aed)',
              backgroundImage: photoPreview ? `url(${photoPreview})` : undefined,
              backgroundSize: 'cover', backgroundPosition: 'center',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 36, fontWeight: 700, color: 'white',
              boxShadow: '0 4px 16px rgba(37,99,235,0.25)',
              border: '3px solid white',
            }}>
              {!photoPreview && initials}
            </div>
            {editing && (
              <label htmlFor="photo-upload" style={{
                position: 'absolute', bottom: -4, right: -4,
                width: 32, height: 32, borderRadius: '50%',
                background: '#2563eb', color: 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', fontSize: 13, boxShadow: '0 2px 8px rgba(37,99,235,0.4)',
                border: '2px solid white',
              }}>
                <i className="fas fa-camera"></i>
                <input id="photo-upload" type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoChange} />
              </label>
            )}
          </div>

          {/* Info */}
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
              <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#111827' }}>
                Dr. {d?.name || doctor?.name}
              </h1>
              <span style={{
                background: d?.verificationStatus === 'approved' ? '#dcfce7' : '#fef9c3',
                color: d?.verificationStatus === 'approved' ? '#15803d' : '#854d0e',
                fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
              }}>
                {d?.verificationStatus === 'approved' ? '✓ Verified' : 'Pending Verification'}
              </span>
            </div>
            {d?.specialization && (
              <p style={{ margin: '0 0 4px', color: '#2563eb', fontWeight: 600, fontSize: 15 }}>
                <i className="fas fa-stethoscope" style={{ marginRight: 6 }}></i>{d.specialization}
              </p>
            )}
            {d?.qualification && (
              <p style={{ margin: '0 0 4px', color: '#6b7280', fontSize: 14 }}>
                <i className="fas fa-graduation-cap" style={{ marginRight: 6 }}></i>{d.qualification}
              </p>
            )}
            {d?.currentInstitute && (  /* ✅ fixed: was d.hospital || d.currentInstitute */
              <p style={{ margin: '0 0 4px', color: '#6b7280', fontSize: 14 }}>
                <i className="fas fa-hospital" style={{ marginRight: 6, color: '#10b981' }}></i>
                {d.currentInstitute}
              </p>
            )}
            {d?.email && (
              <p style={{ margin: '0 0 4px', color: '#6b7280', fontSize: 14 }}>
                <i className="fas fa-envelope" style={{ marginRight: 6 }}></i>{d.email}
              </p>
            )}
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            {[
              {
                label: 'Experience',
                value: d?.experience ? `${d.experience} yrs` : '—',
                icon: 'fa-briefcase',
                color: '#2563eb'
              },
              {
                label: 'Patients',
                value: d?.totalPatients || '—',
                icon: 'fa-users',
                color: '#10b981'
              },
              {
                // ✅ FIXED: was consultationCharge, backend field is consultationFee
                label: 'Fee',
                value: (d?.consultationFee || form.consultationFee)
                  ? `₹${d?.consultationFee || form.consultationFee}`
                  : '—',
                icon: 'fa-rupee-sign',
                color: '#f59e0b'
              },
            ].map(s => (
              <div key={s.label} style={{ textAlign: 'center', minWidth: 64 }}>
                <div style={{ fontSize: 22, color: s.color, marginBottom: 4 }}>
                  <i className={`fas ${s.icon}`}></i>
                </div>
                <div style={{ fontWeight: 700, fontSize: 16, color: '#111827' }}>{s.value}</div>
                <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Details Section */}
        <div style={{ background: 'white', borderRadius: 20, padding: '28px', boxShadow: '0 2px 16px rgba(0,0,0,0.08)' }}>
          <h2 style={{ margin: '0 0 24px', fontSize: 18, fontWeight: 700, color: '#111827', display: 'flex', alignItems: 'center', gap: 10 }}>
            <i className="fas fa-id-card" style={{ color: '#2563eb' }}></i>
            {editing ? 'Edit Profile Information' : 'Profile Information'}
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
            {[
              { label: 'Full Name',             key: 'name',            icon: 'fa-user',           type: 'text'   },
              { label: 'Email',                 key: 'email',           icon: 'fa-envelope',       type: 'email'  },
              { label: 'Mobile Number',         key: 'mobile',          icon: 'fa-phone',          type: 'tel'    },
              { label: 'Specialization',        key: 'specialization',  icon: 'fa-stethoscope',    type: 'select', options: SPECIALIZATIONS },
              { label: 'Qualification',         key: 'qualification',   icon: 'fa-graduation-cap', type: 'text'   },
              { label: 'Years of Experience',   key: 'experience',      icon: 'fa-briefcase',      type: 'number' },
              { label: 'License / Reg. Number', key: 'licenseNumber',   icon: 'fa-id-badge',       type: 'text'   },
              { label: 'Hospital / Clinic',     key: 'hospital',        icon: 'fa-hospital',       type: 'text'   },
              { label: 'Address',               key: 'address',         icon: 'fa-map-marker-alt', type: 'text'   },
              // ✅ FIXED: key changed from consultationCharge to consultationFee
              { label: 'Consultation Fee (₹)',  key: 'consultationFee', icon: 'fa-rupee-sign',     type: 'number' },
            ].map(field => (
              <div key={field.key}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  <i className={`fas ${field.icon}`} style={{ marginRight: 5, color: '#2563eb' }}></i>
                  {field.label}
                </label>
                {editing ? (
                  field.type === 'select' ? (
                    <select
                      value={form[field.key] || ''}
                      onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                      style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e5e7eb', borderRadius: 10, fontSize: 14, background: 'white', color: '#111827', outline: 'none' }}>
                      <option value="">Select {field.label}</option>
                      {field.options.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : (
                    <input
                      type={field.type}
                      value={form[field.key] || ''}
                      onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                      placeholder={field.label}
                      style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e5e7eb', borderRadius: 10, fontSize: 14, color: '#111827', outline: 'none', boxSizing: 'border-box' }}
                      onFocus={e => e.target.style.borderColor = '#2563eb'}
                      onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                    />
                  )
                ) : (
                  <div style={{ padding: '10px 12px', background: '#f9fafb', borderRadius: 10, fontSize: 14, color: form[field.key] ? '#111827' : '#9ca3af', border: '1px solid #f0f0f0' }}>
                    {form[field.key] || <span style={{ fontStyle: 'italic' }}>Not set</span>}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Bio */}
          <div style={{ marginTop: 20 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              <i className="fas fa-align-left" style={{ marginRight: 5, color: '#2563eb' }}></i>
              About / Bio
            </label>
            {editing ? (
              <textarea
                value={form.bio || ''}
                onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                placeholder="Write a brief description about yourself, your expertise, and approach to patient care..."
                rows={4}
                style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e5e7eb', borderRadius: 10, fontSize: 14, color: '#111827', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
                onFocus={e => e.target.style.borderColor = '#2563eb'}
                onBlur={e => e.target.style.borderColor = '#e5e7eb'}
              />
            ) : (
              <div style={{ padding: '12px', background: '#f9fafb', borderRadius: 10, fontSize: 14, color: form.bio ? '#374151' : '#9ca3af', border: '1px solid #f0f0f0', lineHeight: 1.6 }}>
                {form.bio || <span style={{ fontStyle: 'italic' }}>No bio added yet</span>}
              </div>
            )}
          </div>

          {editing && (
            <div style={{ marginTop: 28, display: 'flex', gap: 12, justifyContent: 'flex-end', paddingTop: 20, borderTop: '1px solid #f0f0f0' }}>
              <button onClick={() => { setEditing(false); setPhotoPreview(d?.photoUrl || null); setPhotoFile(null) }}
                style={{ background: 'white', color: '#6b7280', border: '1.5px solid #e5e7eb', borderRadius: 10, padding: '11px 24px', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving}
                style={{ background: 'linear-gradient(135deg,#10b981,#059669)', color: 'white', border: 'none', borderRadius: 10, padding: '11px 28px', fontWeight: 600, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', gap: 6, opacity: saving ? 0.7 : 1 }}>
                {saving ? <><i className="fas fa-spinner fa-spin"></i> Saving...</> : <><i className="fas fa-check"></i> Save Changes</>}
              </button>
            </div>
          )}
        </div>

        {/* Account Security */}
        <div style={{ background: 'white', borderRadius: 20, padding: '28px', boxShadow: '0 2px 16px rgba(0,0,0,0.08)', marginTop: 24 }}>
          <h2 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 700, color: '#111827', display: 'flex', alignItems: 'center', gap: 10 }}>
            <i className="fas fa-shield-alt" style={{ color: '#10b981' }}></i>
            Account Security
          </h2>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <p style={{ margin: 0, fontSize: 14, color: '#374151' }}>
                <strong>Registered Email:</strong> {d?.email || doctor?.email}
              </p>
              <p style={{ margin: '6px 0 0', fontSize: 13, color: '#6b7280' }}>
                Contact support to change your registered email.
              </p>
            </div>
            <button onClick={() => showToast('Password change coming soon!', 'info')}
              style={{ background: 'white', color: '#2563eb', border: '1.5px solid #2563eb', borderRadius: 10, padding: '10px 20px', fontWeight: 600, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
              <i className="fas fa-key"></i> Change Password
            </button>
          </div>
        </div>

      </div>

      {/* <Toast /> */}
    </div>
  )
}