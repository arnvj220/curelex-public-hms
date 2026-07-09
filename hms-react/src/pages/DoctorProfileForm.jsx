import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Toast, useToast } from '../components/Toast'
import { useAuth } from '../context/AuthContext'
import API from '../utils/api'
import { useEffect } from 'react'

const SPECIALIZATIONS = [
  'General Medicine', 'Cardiology', 'Neurology', 'Orthopedics',
  'Pediatrics', 'Dermatology', 'Ophthalmology', 'ENT',
  'Psychiatry', 'Gynecology', 'Orthopedic Surgery', 'Urology',
]

const INITIAL = {
  name: '', mobile: '', specialization: '', email: '',
  address: '', aadhaar: '', licenseNumber: '',
  experience: '', currentInstitute: '', qualification: '',
  profilePhoto: null, regCertificate: null,
  bankName: '', accountNumber: '', ifscCode: '', accountHolderName: '',
  qrCode: null,
}

const STEP_META = [
  { num: 1, label: 'Basic Info',   icon: 'fa-user'              },
  { num: 2, label: 'Documents',    icon: 'fa-file-alt'          },
  { num: 3, label: 'Experience',   icon: 'fa-briefcase-medical' },
  { num: 4, label: 'Payment',      icon: 'fa-university'        },
]

export default function DoctorProfileForm() {
  const [step,    setStep]    = useState(1)
  const [form,    setForm]    = useState(INITIAL)
  const [loading, setLoading] = useState(false)
  const showToast = useToast()
  const navigate  = useNavigate()
  const { user, doctor } = useAuth()

  const set      = k => e => setForm(f => ({ ...f, [k]: e.target.value }))
  const setUpper = k => e => setForm(f => ({ ...f, [k]: e.target.value.toUpperCase() }))

  const setFile = k => e => {
    const file = e.target.files[0]
    if (!file) return

    if (k === 'qrCode') {
      const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp']
      if (file.size > 5 * 1024 * 1024) { showToast('Max 5MB allowed', 'error'); return }
      if (!validTypes.includes(file.type)) { showToast('Only JPG / PNG / WEBP allowed', 'error'); return }
      setForm(f => ({ ...f, [k]: file }))
      return
    }

    const maxSize    = k === 'regCertificate' ? 10 * 1024 * 1024 : 5 * 1024 * 1024
    const validTypes = k === 'regCertificate'
      ? ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']
      : ['image/jpeg', 'image/png', 'image/jpg']
    if (file.size > maxSize)             { showToast(`Max ${maxSize / 1024 / 1024}MB allowed`, 'error'); return }
    if (!validTypes.includes(file.type)) { showToast('Invalid file type', 'error'); return }
    setForm(f => ({ ...f, [k]: file }))
  }

  const next = () => {
    if (step === 1 && (!form.name || !form.mobile || !form.email || !form.specialization))
      return showToast('Please fill all required fields', 'error')
    if (step === 2 && (!form.address || !form.aadhaar || !form.licenseNumber))
      return showToast('Please fill all required fields', 'error')
    if (step === 3 && (!form.experience || !form.currentInstitute || !form.qualification))
      return showToast('Please fill all required fields', 'error')
    setStep(s => s + 1)
  }

  const handleSubmit = async e => {
    e.preventDefault()

    // ✅ FIX: Prevent double-submission when already loading
    if (loading) return

    if (!form.bankName || !form.accountNumber || !form.ifscCode || !form.accountHolderName)
      return showToast('Please fill all payment fields', 'error')

    const doctorId = user?.id || user?._id
    if (!doctorId) {
      showToast('Session expired. Please log in again.', 'error')
      return
    }

    setLoading(true)
    try {
      const profilePayload = {
        name: form.name,
        email: form.email,
        mobile: form.mobile,
        specialization: form.specialization,
        address: form.address,
        licenseNumber: form.licenseNumber,
        experience: form.experience ? Number(form.experience) : 0,
        qualification: form.qualification,
        currentInstitute: form.currentInstitute,
        bio: form.address,
        consultationFee: 0,
      }

      const { data } = await API.put(`/auth/doctors/${doctorId}`, profilePayload)

      localStorage.setItem('doctor-profile-complete', 'true')
      if (data.doctor) {
        const existing = JSON.parse(localStorage.getItem('curelex-current-user') || '{}')
        localStorage.setItem('curelex-current-user', JSON.stringify({ ...existing, ...data.doctor }))
      }

      showToast('Profile submitted successfully!', 'success')
      setStep(5)
    } catch (err) {
      console.error(err)
      showToast(err.response?.data?.message || 'Profile update failed', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(()=>{
    async function fetchDoctor() {
      
      const doctorId = user?.id || user?._id;
      const { data } = await API.get(`/auth/doctors/${doctorId}`);
      if (data?.doctor) {
        setForm({
        name: data.doctor.name || "",
        email: data.doctor.email || "",
        phone: data.doctor.phone || "",
        specialization: data.doctor.specialization || "",
        qualification: data.doctor.qualification || "",
        experience: data.doctor.experience || "",
        consultationFee: data.doctor.consultationFee || "",
        
      });
      }
    }
    fetchDoctor();
  },[]);

  /* ─────────────────────────── JSX ─────────────────────────── */
  return (
    <>
      <style>{CSS}</style>
      <div className="dp-root">

        {/* ── LEFT PANEL ── */}
        <aside className="dp-left">
          <div className="dp-left-inner">
            <div className="dp-brand">
              <span className="dp-brand-dot" />
              CURELEX
            </div>
            <h1 className="dp-left-title">Join Our Medical Network</h1>
            <p className="dp-left-sub">
              Connect with thousands of patients and grow your practice on a secure, trusted platform.
            </p>

            <div className="dp-benefits">
              {[
                ['fa-users',      'Connect with Thousands of Patients'],
                ['fa-video',      'Conduct Video Consultations'],
                ['fa-chart-line', 'Grow Your Practice'],
                ['fa-shield-alt', 'Secure & Verified Platform'],
                ['fa-wallet',     'Fast & Reliable Payouts'],
              ].map(([icon, text]) => (
                <div className="dp-benefit" key={text}>
                  <span className="dp-benefit-icon"><i className={`fas ${icon}`} /></span>
                  <span>{text}</span>
                </div>
              ))}
            </div>

            <div className="dp-left-progress">
              {STEP_META.map(s => (
                <div
                  key={s.num}
                  className={`dp-left-dot ${step >= s.num ? 'active' : ''} ${step === s.num ? 'current' : ''}`}
                  title={s.label}
                />
              ))}
            </div>
          </div>
        </aside>

        {/* ── RIGHT PANEL ── */}
        <main className="dp-right">
          <div className="dp-card">

            {/* STEPPER */}
            {step <= 4 && (
              <div className="dp-stepper">
                {STEP_META.map((s, i) => (
                  <div key={s.num} className="dp-step-wrap">
                    <div className={`dp-step-circle ${step > s.num ? 'done' : ''} ${step === s.num ? 'active' : ''}`}>
                      {step > s.num
                        ? <i className="fas fa-check" />
                        : <i className={`fas ${s.icon}`} />}
                    </div>
                    <span className={`dp-step-label ${step === s.num ? 'active' : ''}`}>{s.label}</span>
                    {i < STEP_META.length - 1 && (
                      <div className={`dp-step-line ${step > s.num ? 'done' : ''}`} />
                    )}
                  </div>
                ))}
              </div>
            )}

            <form onSubmit={handleSubmit}>

              {/* ══ STEP 1 ══ */}
              {step === 1 && (
                <div className="dp-step-body">
                  <div className="dp-step-header">
                    <span className="dp-step-tag">Step 1 of 4</span>
                    <h2>Basic Information</h2>
                    <p>Tell us about yourself so patients can find you</p>
                  </div>
                  <div className="dp-grid-2">
                    <div className="dp-field dp-span2">
                      <label>Full Name <span>*</span></label>
                      <input type="text" placeholder="Dr. Rajesh Kumar" value={form.name} onChange={set('name')} />
                    </div>
                    <div className="dp-field">
                      <label>Mobile Number <span>*</span></label>
                      <input type="tel" placeholder="9876543210" value={form.mobile}
                        onChange={set('mobile')} pattern="[0-9]{10}" maxLength={10} />
                    </div>
                    <div className="dp-field">
                      <label>Email Address <span>*</span></label>
                      <input type="email" placeholder="doctor@email.com" value={form.email} onChange={set('email')} />
                    </div>
                    <div className="dp-field dp-span2">
                      <label>Specialization <span>*</span></label>
                      <select value={form.specialization} onChange={set('specialization')}>
                        <option value="">Select your specialization</option>
                        {SPECIALIZATIONS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                  <p className="dp-note">
                    <i className="fas fa-info-circle" /> Your account will be reviewed within 24–48 hours after submission.
                  </p>
                </div>
              )}

              {/* ══ STEP 2 ══ */}
              {step === 2 && (
                <div className="dp-step-body">
                  <div className="dp-step-header">
                    <span className="dp-step-tag">Step 2 of 4</span>
                    <h2>Professional Documents</h2>
                    <p>Verify your identity and credentials</p>
                  </div>
                  <div className="dp-grid-2">
                    <div className="dp-field dp-span2">
                      <label>Address <span>*</span></label>
                      <input type="text" placeholder="Clinic / Home address" value={form.address} onChange={set('address')} />
                    </div>
                    <div className="dp-field">
                      <label>Aadhaar Number <span>*</span></label>
                      <input type="text" placeholder="12-digit Aadhaar" value={form.aadhaar}
                        onChange={set('aadhaar')} pattern="[0-9]{12}" maxLength={12} />
                    </div>
                    <div className="dp-field">
                      <label>License / Reg. Number <span>*</span></label>
                      <input type="text" placeholder="MCI Registration No." value={form.licenseNumber} onChange={set('licenseNumber')} />
                    </div>
                    <div className="dp-field">
                      <label>Professional Photo</label>
                      <div className="dp-file-box">
                        <input type="file" accept="image/jpeg,image/png,image/jpg" onChange={setFile('profilePhoto')} id="photo-upload" />
                        <label htmlFor="photo-upload" className="dp-file-label">
                          {form.profilePhoto
                            ? <><i className="fas fa-check-circle dp-file-ok" /> {form.profilePhoto.name}</>
                            : <><i className="fas fa-cloud-upload-alt" /> Click to upload photo</>}
                        </label>
                      </div>
                      {form.profilePhoto && (
                        <img src={URL.createObjectURL(form.profilePhoto)} alt="Preview" className="dp-photo-preview" />
                      )}
                    </div>
                    <div className="dp-field">
                      <label>Registration Certificate</label>
                      <div className="dp-file-box">
                        <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={setFile('regCertificate')} id="cert-upload" />
                        <label htmlFor="cert-upload" className="dp-file-label">
                          {form.regCertificate
                            ? <><i className="fas fa-check-circle dp-file-ok" /> {form.regCertificate.name}</>
                            : <><i className="fas fa-cloud-upload-alt" /> Upload PDF or image</>}
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ══ STEP 3 ══ */}
              {step === 3 && (
                <div className="dp-step-body">
                  <div className="dp-step-header">
                    <span className="dp-step-tag">Step 3 of 4</span>
                    <h2>Professional Experience</h2>
                    <p>Help patients understand your expertise</p>
                  </div>
                  <div className="dp-grid-2">
                    <div className="dp-field">
                      <label>Years of Experience <span>*</span></label>
                      <input type="number" placeholder="e.g. 8" value={form.experience}
                        onChange={set('experience')} min={0} max={50} />
                    </div>
                    <div className="dp-field">
                      <label>Qualification <span>*</span></label>
                      <input type="text" placeholder="e.g. MBBS, MD" value={form.qualification} onChange={set('qualification')} />
                    </div>
                    <div className="dp-field dp-span2">
                      <label>Current Practice Institute <span>*</span></label>
                      <input type="text" placeholder="Hospital or clinic name" value={form.currentInstitute} onChange={set('currentInstitute')} />
                    </div>
                  </div>
                </div>
              )}

              {/* ══ STEP 4 ══ */}
              {step === 4 && (
                <div className="dp-step-body">
                  <div className="dp-step-header">
                    <span className="dp-step-tag">Step 4 of 4</span>
                    <h2>Payment & Withdrawal</h2>
                    <p>Bank details for receiving your consultation earnings</p>
                  </div>
                  <div className="dp-secure-badge">
                    <i className="fas fa-lock" />
                    <span>Your bank details are encrypted with 256-bit SSL and never shared with third parties.</span>
                  </div>
                  <div className="dp-grid-2">
                    <div className="dp-field dp-span2">
                      <label>Bank Name <span>*</span></label>
                      <div className="dp-input-icon-wrap">
                        <i className="fas fa-university dp-input-icon" />
                        <input type="text" placeholder="e.g. State Bank of India" value={form.bankName}
                          onChange={set('bankName')} className="dp-has-icon" />
                      </div>
                    </div>
                    <div className="dp-field dp-span2">
                      <label>Account Holder Name <span>*</span></label>
                      <div className="dp-input-icon-wrap">
                        <i className="fas fa-user dp-input-icon" />
                        <input type="text" placeholder="Name exactly as on bank account" value={form.accountHolderName}
                          onChange={set('accountHolderName')} className="dp-has-icon" />
                      </div>
                    </div>
                    <div className="dp-field">
                      <label>Account Number <span>*</span></label>
                      <div className="dp-input-icon-wrap">
                        <i className="fas fa-credit-card dp-input-icon" />
                        <input type="text" placeholder="Enter account number" value={form.accountNumber}
                          onChange={set('accountNumber')} pattern="[0-9]{9,18}" maxLength={18} className="dp-has-icon" />
                      </div>
                    </div>
                    <div className="dp-field">
                      <label>IFSC Code <span>*</span></label>
                      <div className="dp-input-icon-wrap">
                        <i className="fas fa-hashtag dp-input-icon" />
                        <input type="text" placeholder="e.g. SBIN0001234" value={form.ifscCode}
                          onChange={setUpper('ifscCode')} pattern="[A-Z]{4}0[A-Z0-9]{6}" maxLength={11} className="dp-has-icon" />
                      </div>
                      <span className="dp-field-hint">11-character code found on your cheque/passbook</span>
                    </div>

                    {/* ── UPI / QR Code upload ── */}
                    <div className="dp-field dp-span2">
                      <label>
                        UPI / QR Code Image
                        <span className="dp-label-optional"> (optional)</span>
                      </label>

                      {!form.qrCode ? (
                        <div className="dp-qr-zone">
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/jpg,image/webp"
                            onChange={setFile('qrCode')}
                            id="qr-upload"
                          />
                          <label htmlFor="qr-upload" className="dp-qr-label">
                            <div className="dp-qr-icon-wrap">
                              <i className="fas fa-qrcode" />
                            </div>
                            <div>
                              <p className="dp-qr-primary">Click to upload your UPI QR code</p>
                              <p className="dp-qr-secondary">Patients can scan to pay you directly · JPG, PNG up to 5 MB</p>
                            </div>
                          </label>
                        </div>
                      ) : (
                        <div className="dp-qr-preview-wrap">
                          <img
                            src={URL.createObjectURL(form.qrCode)}
                            alt="QR preview"
                            className="dp-qr-preview"
                          />
                          <div className="dp-qr-preview-info">
                            <span className="dp-qr-filename">
                              <i className="fas fa-check-circle dp-file-ok" /> {form.qrCode.name}
                            </span>
                            <button
                              type="button"
                              className="dp-qr-remove"
                              onClick={() => setForm(f => ({ ...f, qrCode: null }))}
                            >
                              <i className="fas fa-times" /> Remove
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                  </div>
                </div>
              )}

              {/* ══ STEP 5 — SUCCESS ══ */}
              {step === 5 && (
                <div className="dp-success">
                  <div className="dp-success-ring">
                    <i className="fas fa-check" />
                  </div>
                  <h2>Application Submitted!</h2>
                  <p>Your profile has been received and is pending admin approval. You'll be notified once verified.</p>
                  <div className="dp-success-info">
                    <div className="dp-success-info-item">
                      <i className="fas fa-clock" />
                      <span>Verification: <strong>24–48 hours</strong></span>
                    </div>
                    <div className="dp-success-info-item">
                      <i className="fas fa-bell" />
                      <span>Notification via <strong>Email & SMS</strong></span>
                    </div>
                  </div>
                  <button type="button" className="dp-btn-primary dp-full" onClick={() => navigate('/solo-doctor-dashboard')}>
                    Go to Dashboard <i className="fas fa-arrow-right" />
                  </button>
                </div>
              )}

              {/* NAVIGATION BUTTONS */}
              {step <= 4 && (
                <div className={`dp-nav-btns ${step === 1 ? 'dp-nav-end' : ''}`}>
                  {step > 1 && (
                    <button type="button" className="dp-btn-secondary" onClick={() => setStep(s => s - 1)}>
                      <i className="fas fa-arrow-left" /> Back
                    </button>
                  )}
                  {step < 4 && (
                    <button type="button" className="dp-btn-primary" onClick={next}>
                      Continue <i className="fas fa-arrow-right" />
                    </button>
                  )}
                  {step === 4 && (
                    <button type="submit" className="dp-btn-primary" disabled={loading}>
                      {loading
                        ? <><i className="fas fa-spinner fa-spin" /> Submitting...</>
                        : <><i className="fas fa-paper-plane" /> Submit Application</>}
                    </button>
                  )}
                </div>
              )}
            </form>

            {step < 5 && (
              <p className="dp-back-link">
                Already registered? <Link to="/solo-doctor-dashboard">Go to Dashboard</Link>
              </p>
            )}
          </div>
        </main>
      </div>
      <Toast />
    </>
  )
}

/* ═══════════════════════════════════════════
   CSS — scoped with dp- prefix
═══════════════════════════════════════════ */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=Lora:ital,wght@0,400;0,600;1,400&display=swap');

:root {
  --dp-blue:      #1a73e8;
  --dp-blue-dark: #1557b0;
  --dp-blue-soft: #e8f0fe;
  --dp-teal:      #00bcd4;
  --dp-dark:      #0d1b2a;
  --dp-mid:       #374151;
  --dp-muted:     #6b7280;
  --dp-border:    #e5e7eb;
  --dp-bg:        #f7f9fc;
  --dp-white:     #ffffff;
  --dp-success:   #10b981;
  --dp-radius:    12px;
  --dp-shadow:    0 4px 24px rgba(0,0,0,0.08);
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

.dp-root {
  display: flex;
  min-height: 100vh;
  font-family: 'Outfit', sans-serif;
  background: var(--dp-bg);
}

/* ─── LEFT ─── */
.dp-left {
  width: 380px;
  min-height: 100vh;
  flex-shrink: 0;
  background: linear-gradient(160deg, #0a1628 0%, #0d2d5e 50%, #1976d2 100%);
  position: sticky;
  top: 0;
  height: 100vh;
  display: flex;
  align-items: center;
  overflow: hidden;
}
.dp-left::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse 70% 50% at 90% 10%, rgba(100,180,255,0.2) 0%, transparent 60%),
    radial-gradient(ellipse 50% 70% at 0% 90%,  rgba(0,188,212,0.15) 0%, transparent 60%);
}
.dp-left-inner {
  position: relative;
  z-index: 1;
  padding: 48px 40px;
  display: flex;
  flex-direction: column;
  width: 100%;
}
.dp-brand {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 700;
  font-size: 13px;
  letter-spacing: 3px;
  text-transform: uppercase;
  color: rgba(255,255,255,0.55);
  margin-bottom: 40px;
}
.dp-brand-dot {
  width: 8px; height: 8px;
  border-radius: 50%;
  background: var(--dp-teal);
}
.dp-left-title {
  font-family: 'Lora', serif;
  font-size: 30px;
  font-weight: 600;
  color: #fff;
  line-height: 1.25;
  margin-bottom: 14px;
}
.dp-left-sub {
  font-size: 14px;
  color: rgba(255,255,255,0.6);
  line-height: 1.7;
  margin-bottom: 40px;
}
.dp-benefits { display: flex; flex-direction: column; gap: 14px; }
.dp-benefit  { display: flex; align-items: center; gap: 12px; color: rgba(255,255,255,0.8); font-size: 13.5px; }
.dp-benefit-icon {
  width: 34px; height: 34px;
  border-radius: 9px;
  background: rgba(255,255,255,0.1);
  display: flex; align-items: center; justify-content: center;
  font-size: 14px; color: var(--dp-teal); flex-shrink: 0;
}
.dp-left-progress { display: flex; gap: 6px; margin-top: 44px; padding-top: 28px; border-top: 1px solid rgba(255,255,255,0.1); }
.dp-left-dot { height: 4px; width: 20px; border-radius: 2px; background: rgba(255,255,255,0.2); transition: all 0.4s ease; }
.dp-left-dot.active  { background: rgba(255,255,255,0.5); }
.dp-left-dot.current { background: var(--dp-teal); width: 36px; }

/* ─── RIGHT ─── */
.dp-right {
  flex: 1; min-height: 100vh; overflow-y: auto;
  display: flex; justify-content: center; align-items: flex-start;
  padding: 48px 24px 64px;
}
.dp-card {
  width: 100%; max-width: 560px;
  background: var(--dp-white);
  border-radius: 20px;
  box-shadow: var(--dp-shadow);
  padding: 40px 40px 32px;
  border: 1px solid var(--dp-border);
}

/* ─── STEPPER ─── */
.dp-stepper { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 36px; position: relative; }
.dp-step-wrap { display: flex; flex-direction: column; align-items: center; flex: 1; position: relative; gap: 6px; }
.dp-step-wrap:not(:last-child)::after {
  content: '';
  position: absolute;
  top: 18px;
  left: calc(50% + 20px);
  right: calc(-50% + 20px);
  height: 2px;
  background: var(--dp-border);
  transition: background 0.3s;
  z-index: 0;
}
.dp-step-line.done { background: var(--dp-blue) !important; }
.dp-step-circle {
  width: 36px; height: 36px; border-radius: 50%;
  background: var(--dp-bg); border: 2px solid var(--dp-border);
  display: flex; align-items: center; justify-content: center;
  font-size: 14px; color: var(--dp-muted);
  transition: all 0.3s ease; z-index: 1; position: relative;
}
.dp-step-circle.active { background: var(--dp-blue); border-color: var(--dp-blue); color: #fff; box-shadow: 0 0 0 4px rgba(26,115,232,0.15); }
.dp-step-circle.done   { background: var(--dp-success); border-color: var(--dp-success); color: #fff; }
.dp-step-label { font-size: 11px; color: var(--dp-muted); font-weight: 500; text-align: center; white-space: nowrap; transition: color 0.3s; }
.dp-step-label.active { color: var(--dp-blue); font-weight: 600; }

/* ─── STEP BODY ─── */
.dp-step-body { animation: dpFadeUp 0.3s ease; }
@keyframes dpFadeUp {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}
.dp-step-header { margin-bottom: 24px; }
.dp-step-tag {
  display: inline-block;
  background: var(--dp-blue-soft); color: var(--dp-blue);
  font-size: 11px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase;
  border-radius: 20px; padding: 3px 10px; margin-bottom: 10px;
}
.dp-step-header h2 { font-size: 22px; font-weight: 700; color: var(--dp-dark); margin-bottom: 4px; }
.dp-step-header p  { font-size: 13.5px; color: var(--dp-muted); }

/* ─── GRID ─── */
.dp-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.dp-span2  { grid-column: span 2; }

/* ─── FIELDS ─── */
.dp-field { display: flex; flex-direction: column; gap: 6px; }
.dp-field label { font-size: 13px; font-weight: 600; color: var(--dp-mid); }
.dp-field label span { color: #ef4444; margin-left: 2px; }
.dp-label-optional { font-size: 12px; font-weight: 400; color: var(--dp-muted); margin-left: 4px; }
.dp-field input,
.dp-field select {
  width: 100%; height: 44px;
  border: 1.5px solid var(--dp-border); border-radius: 10px;
  padding: 0 14px; font-size: 14px; font-family: 'Outfit', sans-serif;
  color: var(--dp-dark); background: var(--dp-white);
  outline: none; transition: border-color 0.2s, box-shadow 0.2s;
  -webkit-appearance: none;
}
.dp-field input:focus,
.dp-field select:focus { border-color: var(--dp-blue); box-shadow: 0 0 0 3px rgba(26,115,232,0.1); }
.dp-field input::placeholder { color: #c4c9d4; }
.dp-field-hint { font-size: 11.5px; color: var(--dp-muted); margin-top: 2px; }

/* icon inputs */
.dp-input-icon-wrap { position: relative; }
.dp-input-icon { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: var(--dp-muted); font-size: 13px; pointer-events: none; }
.dp-has-icon { padding-left: 38px !important; }

/* ─── FILE UPLOAD ─── */
.dp-file-box { position: relative; }
.dp-file-box input[type="file"] { position: absolute; inset: 0; opacity: 0; cursor: pointer; z-index: 2; width: 100%; height: 100%; }
.dp-file-label {
  display: flex; align-items: center; gap: 8px;
  height: 44px; border: 1.5px dashed var(--dp-border); border-radius: 10px;
  padding: 0 14px; font-size: 13px; color: var(--dp-muted);
  cursor: pointer; transition: border-color 0.2s, background 0.2s;
  background: var(--dp-bg); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.dp-file-label:hover { border-color: var(--dp-blue); background: var(--dp-blue-soft); color: var(--dp-blue); }
.dp-file-ok { color: var(--dp-success); }
.dp-photo-preview { width: 56px; height: 56px; border-radius: 10px; object-fit: cover; margin-top: 8px; border: 2px solid var(--dp-border); }

/* ─── QR UPLOAD ─── */
.dp-qr-zone {
  position: relative;
  border: 1.5px dashed var(--dp-border);
  border-radius: 12px;
  background: var(--dp-bg);
  transition: border-color 0.2s, background 0.2s;
}
.dp-qr-zone:hover { border-color: var(--dp-blue); background: var(--dp-blue-soft); }
.dp-qr-zone input[type="file"] { position: absolute; inset: 0; opacity: 0; cursor: pointer; z-index: 2; width: 100%; height: 100%; }
.dp-qr-label {
  display: flex; align-items: center; gap: 16px;
  padding: 16px 20px; cursor: pointer;
}
.dp-qr-icon-wrap {
  width: 52px; height: 52px; border-radius: 10px;
  background: var(--dp-white); border: 1.5px solid var(--dp-border);
  display: flex; align-items: center; justify-content: center;
  font-size: 22px; color: var(--dp-blue); flex-shrink: 0;
}
.dp-qr-primary   { font-size: 13.5px; font-weight: 600; color: var(--dp-mid); margin-bottom: 3px; }
.dp-qr-secondary { font-size: 12px; color: var(--dp-muted); }

.dp-qr-preview-wrap {
  display: flex; align-items: center; gap: 16px;
  padding: 14px 16px;
  border: 1.5px solid #bbf7d0;
  border-radius: 12px;
  background: #f0fdf4;
}
.dp-qr-preview {
  width: 80px; height: 80px;
  border-radius: 8px; object-fit: contain;
  border: 1.5px solid var(--dp-border);
  background: var(--dp-white); flex-shrink: 0;
}
.dp-qr-preview-info { display: flex; flex-direction: column; gap: 8px; }
.dp-qr-filename { font-size: 13px; color: var(--dp-mid); font-weight: 500; }
.dp-qr-remove {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 12px; font-weight: 600; color: #ef4444;
  background: none; border: none; cursor: pointer; padding: 0;
}
.dp-qr-remove:hover { text-decoration: underline; }

/* ─── NOTE ─── */
.dp-note {
  font-size: 12.5px; color: var(--dp-muted);
  background: #f0f9ff; border-radius: 8px; padding: 10px 14px;
  margin-top: 16px; display: flex; align-items: flex-start; gap: 8px; line-height: 1.5;
}
.dp-note i { color: #0ea5e9; margin-top: 2px; flex-shrink: 0; }

/* ─── SECURE BADGE ─── */
.dp-secure-badge {
  display: flex; align-items: flex-start; gap: 10px;
  background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px;
  padding: 12px 16px; margin-bottom: 20px; font-size: 12.5px; color: #166534; line-height: 1.5;
}
.dp-secure-badge i { color: var(--dp-success); font-size: 14px; margin-top: 1px; flex-shrink: 0; }

/* ─── NAV BUTTONS ─── */
.dp-nav-btns { display: flex; justify-content: space-between; align-items: center; margin-top: 28px; gap: 12px; }
.dp-nav-end  { justify-content: flex-end; }
.dp-btn-primary,
.dp-btn-secondary {
  display: inline-flex; align-items: center; gap: 8px;
  height: 46px; padding: 0 24px; border-radius: 10px;
  font-size: 14px; font-weight: 600; font-family: 'Outfit', sans-serif;
  cursor: pointer; border: none; transition: all 0.2s ease;
}
.dp-btn-primary { background: var(--dp-blue); color: #fff; }
.dp-btn-primary:hover:not(:disabled) { background: var(--dp-blue-dark); transform: translateY(-1px); box-shadow: 0 4px 16px rgba(26,115,232,0.3); }
.dp-btn-primary:disabled { opacity: 0.65; cursor: not-allowed; }
.dp-btn-secondary { background: var(--dp-bg); color: var(--dp-mid); border: 1.5px solid var(--dp-border); }
.dp-btn-secondary:hover { background: var(--dp-border); }
.dp-full { width: 100%; justify-content: center; }

/* ─── BACK LINK ─── */
.dp-back-link { text-align: center; font-size: 13px; color: var(--dp-muted); margin-top: 20px; }
.dp-back-link a { color: var(--dp-blue); font-weight: 600; text-decoration: none; }
.dp-back-link a:hover { text-decoration: underline; }

/* ─── SUCCESS ─── */
.dp-success { display: flex; flex-direction: column; align-items: center; text-align: center; padding: 20px 0; animation: dpFadeUp 0.4s ease; }
.dp-success-ring {
  width: 80px; height: 80px; border-radius: 50%;
  background: linear-gradient(135deg, #10b981, #059669);
  display: flex; align-items: center; justify-content: center;
  font-size: 32px; color: #fff; margin-bottom: 24px;
  box-shadow: 0 8px 24px rgba(16,185,129,0.35);
}
.dp-success h2      { font-size: 26px; font-weight: 700; color: var(--dp-dark); margin-bottom: 12px; }
.dp-success > p     { font-size: 14.5px; color: var(--dp-muted); max-width: 360px; line-height: 1.65; margin-bottom: 28px; }
.dp-success-info    { display: flex; gap: 16px; margin-bottom: 32px; flex-wrap: wrap; justify-content: center; }
.dp-success-info-item {
  display: flex; align-items: center; gap: 8px;
  background: var(--dp-bg); border: 1px solid var(--dp-border);
  border-radius: 10px; padding: 10px 18px; font-size: 13px; color: var(--dp-mid);
}
.dp-success-info-item i { color: var(--dp-blue); }

/* ─── MOBILE ─── */
@media (max-width: 768px) {
  .dp-left { display: none; }
  .dp-right { padding: 24px 16px 48px; align-items: flex-start; }
  .dp-card  { padding: 28px 20px 24px; border-radius: 16px; box-shadow: none; }
  .dp-grid-2 { grid-template-columns: 1fr; }
  .dp-span2  { grid-column: span 1; }
  .dp-stepper { margin-bottom: 28px; }
  .dp-step-circle { width: 30px; height: 30px; font-size: 12px; }
  .dp-step-wrap:not(:last-child)::after { top: 15px; left: calc(50% + 16px); right: calc(-50% + 16px); }
  .dp-step-label { font-size: 10px; }
  .dp-step-header h2 { font-size: 19px; }
  .dp-nav-btns { flex-direction: column-reverse; gap: 10px; }
  .dp-btn-primary, .dp-btn-secondary { width: 100%; justify-content: center; }
  .dp-success-info { flex-direction: column; align-items: center; }
  .dp-qr-label { flex-direction: column; align-items: flex-start; gap: 10px; }
}

@media (max-width: 400px) {
  .dp-card { padding: 22px 16px 20px; }
  .dp-step-label { display: none; }
}
`