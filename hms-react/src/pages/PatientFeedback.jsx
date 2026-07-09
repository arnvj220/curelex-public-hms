// hms-react/src/pages/PatientFeedback.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import API from '../utils/api';
import '../css/PatientDashboard.css';
import '../css/PatientFeedback.css';
import PatientSidebar from '../components/PatientSidebar';
import BottomNav from '../components/BottomNav';

// ── Star Rating Component ──────────────────────────────────────────────────
function StarRating({ value, onChange, readOnly = false }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="fb-stars" role={readOnly ? 'img' : 'radiogroup'} aria-label={`Rating: ${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readOnly}
          className={`fb-star${star <= (hovered || value) ? ' filled' : ''}`}
          onClick={() => onChange && onChange(star)}
          onMouseEnter={() => !readOnly && setHovered(star)}
          onMouseLeave={() => !readOnly && setHovered(0)}
          aria-label={`${star} star${star > 1 ? 's' : ''}`}
        >
          <i className={star <= (hovered || value) ? 'fas fa-star' : 'far fa-star'} />
        </button>
      ))}
      {!readOnly && value > 0 && (
        <span className="fb-star-label">
          {['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][value]}
        </span>
      )}
    </div>
  );
}

// ── Past Feedback Card ─────────────────────────────────────────────────────
function FeedbackHistoryCard({ fb, isMobile }) {
  return (
    <div className="fb-history-card">
      <div className="fb-history-card__header">
        <div className="fb-history-card__meta">
          <div className="fb-history-card__clinic">
            <i className="fas fa-hospital-alt" />
            {fb.clinicId ? fb.clinicId.name : 'Independent Doctor (No Clinic)'}
          </div>
          <div className="fb-history-card__doctor">
            <i className="fas fa-user-md" />
            Dr. {fb.doctorId?.name || 'Unknown'}
          </div>
        </div>
        <div className="fb-history-card__date">
          <i className="fas fa-calendar-alt" />
          {new Date(fb.createdAt).toLocaleDateString('en-IN', {
            day: 'numeric', month: 'short', year: 'numeric'
          })}
        </div>
      </div>

      <div className={`fb-history-card__ratings ${isMobile ? 'stacked' : ''}`}>
        {fb.clinicId && (
          <>
            <div className="fb-history-card__rating-block">
              <div className="fb-history-card__rating-title">
                <i className="fas fa-hospital" /> Clinic
              </div>
              <StarRating value={fb.clinicRating} readOnly />
              {fb.clinicFeedback && (
                <p className="fb-history-card__comment">"{fb.clinicFeedback}"</p>
              )}
            </div>
            <div className="fb-history-card__divider" />
          </>
        )}
        <div className="fb-history-card__rating-block">
          <div className="fb-history-card__rating-title">
            <i className="fas fa-stethoscope" /> Doctor
          </div>
          <StarRating value={fb.doctorRating} readOnly />
          {fb.doctorFeedback && (
            <p className="fb-history-card__comment">"{fb.doctorFeedback}"</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function PatientFeedback() {
  const { user, patient, logout, isPatient } = useAuth();
  const navigate = useNavigate();

  const patientId   = patient?._id || patient?.id || user?.id || user?._id;
  const patientName = patient?.name || user?.name || 'Patient';
  const patientEmail = patient?.email || user?.email || '';
  const initials    = patientName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  // ── State ──
  const [loading,    setLoading]    = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userDropdown, setUserDropdown] = useState(false);

  const [clinics,   setClinics]   = useState([]);
  const [doctors,   setDoctors]   = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);

  const [form, setForm] = useState({
    clinicId: '', doctorId: '',
    clinicRating: 0, doctorRating: 0,
    clinicFeedback: '', doctorFeedback: ''
  });
  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState('');

  // ── Responsive ──
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768);
  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);

  // ── Auth guard + initial load ──
  useEffect(() => {
    if (!user) { navigate('/patient-login'); return; }
    if (!isPatient()) { navigate('/'); return; }
    fetchData();
  }, []); // eslint-disable-line

  const fetchData = async () => {
    setLoading(true);
    try {
      const [clinicsRes, feedbacksRes] = await Promise.all([
        API.get('/clinics'),
        API.get(`/feedback/patient/${patientId}`)
      ]);
      setClinics(clinicsRes.data.clinics || clinicsRes.data || []);
      setFeedbacks(feedbacksRes.data.feedbacks || []);
    } catch (err) {
      console.error('Failed to load data:', err);
    }
    setLoading(false);
  };

  // ── Load doctors when clinic changes ──
  useEffect(() => {
    if (form.clinicId) {
      API.get(`/patient-portal/doctors/${form.clinicId}`)
        .then(res => setDoctors(res.data.doctors || []))
        .catch(err => { console.error('Failed to load doctors:', err); setDoctors([]); });
    } else {
      setDoctors([]);
    }
  }, [form.clinicId]);

  // ── Submit ──
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!form.clinicId || !form.doctorId) {
      setError('Please select both a clinic and a doctor.');
      return;
    }
    
    if (form.doctorRating === 0) {
      setError('Please provide a star rating for the doctor.');
      return;
    }
    
    if (form.clinicId !== 'independent' && form.clinicRating === 0) {
      setError('Please provide a star rating for the clinic.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = { ...form, patientId };
      if (form.clinicId === 'independent') {
        delete payload.clinicId;
        delete payload.clinicRating;
        delete payload.clinicFeedback;
      }
      
      await API.post('/feedback', payload);
      setSuccess('🎉 Feedback submitted! Thank you for helping us improve.');
      setForm({ clinicId: '', doctorId: '', clinicRating: 0, doctorRating: 0, clinicFeedback: '', doctorFeedback: '' });
      fetchData();
    } catch (err) {
      console.error('Feedback submit error:', err);
      setError(err.response?.data?.message || 'Failed to submit feedback. Please try again.');
    }
    setSubmitting(false);
  };

  const handleLogout = () => { logout(); navigate('/patient-login'); };
  const goTo = (path) => { setSidebarOpen(false); setUserDropdown(false); navigate(path); };

  // ── Loading state ──
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <i className="fas fa-spinner fa-spin" style={{ fontSize: 48, color: '#2d6be4' }} />
          <p style={{ marginTop: '1rem', color: '#6b7a99' }}>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pd-layout">
      {/* ── Top Bar ── */}
      <header className="pd-topbar">
        <div className="pd-topbar__left">
          {!isMobile && (
            <button className="pd-hamburger" onClick={() => setSidebarOpen(true)}>
              <i className="fas fa-bars" />
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

      {/* ── Below Header: sidebar + content ── */}
      <div className="pd-below-header">
        <div className={`pd-sidebar-overlay${sidebarOpen ? ' visible' : ''}`} onClick={() => setSidebarOpen(false)} />

        <PatientSidebar
          activeItem="feedback"
          sidebarOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          patientName={patientName}
          patientEmail={patientEmail}
          initials={initials}
        />

        <div className="pd-main">
          <main className="pd-body">

            {/* ── Page Banner ── */}
            {isMobile ? (
              <div className="fb-banner-mobile">
                <div className="fb-banner-mobile__icon">⭐</div>
                <div>
                  <h2 className="fb-banner-mobile__title">Feedback</h2>
                  <p className="fb-banner-mobile__sub">Rate clinics & doctors</p>
                </div>
              </div>
            ) : (
              <div className="fb-banner-desktop">
                <div>
                  <h2 className="fb-banner-desktop__title">⭐ Your Feedback</h2>
                  <p className="fb-banner-desktop__sub">
                    Help us improve by sharing your experience with our clinics and doctors.
                  </p>
                </div>
                <div className="fb-banner-desktop__badge">
                  <i className="fas fa-star" /> {feedbacks.length} {feedbacks.length === 1 ? 'review' : 'reviews'} submitted
                </div>
              </div>
            )}

            {/* ── Feedback Form Card ── */}
            <div className="pd-card fb-form-card">
              <div className="pd-card__head">
                <div className="pd-card__head-icon">
                  <i className="fas fa-edit" />
                </div>
                <h3>Submit New Feedback</h3>
              </div>

              <div className="pd-card__body">
                {/* Alert Messages */}
                {error && (
                  <div className="fb-alert fb-alert--error">
                    <i className="fas fa-exclamation-circle" /> {error}
                  </div>
                )}
                {success && (
                  <div className="fb-alert fb-alert--success">
                    <i className="fas fa-check-circle" /> {success}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="fb-form">
                  {/* ── Selectors Row ── */}
                  <div className="fb-form__selectors">
                    <div className="fb-form__field">
                      <label className="fb-form__label">
                        <i className="fas fa-hospital-alt" /> Clinic <span className="fb-required">*</span>
                      </label>
                      <select
                        className="fb-form__select"
                        value={form.clinicId}
                        onChange={(e) => setForm({ ...form, clinicId: e.target.value, doctorId: '' })}
                      >
                        <option value="">— Select a Clinic —</option>
                        {clinics.map(c => (
                          <option key={c._id} value={c._id}>{c.name}</option>
                        ))}
                        <option value="independent">Independent Doctors (No Clinic)</option>
                      </select>
                    </div>

                    <div className="fb-form__field">
                      <label className="fb-form__label">
                        <i className="fas fa-user-md" /> Doctor <span className="fb-required">*</span>
                      </label>
                      <select
                        className={`fb-form__select${!form.clinicId ? ' disabled' : ''}`}
                        value={form.doctorId}
                        onChange={(e) => setForm({ ...form, doctorId: e.target.value })}
                        disabled={!form.clinicId}
                      >
                        <option value="">
                          {form.clinicId ? '— Select a Doctor —' : '— Select clinic first —'}
                        </option>
                        {doctors.map(d => (
                          <option key={d._id} value={d._id}>Dr. {d.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="fb-form__divider" />

                  {/* ── Ratings Row ── */}
                  <div className="fb-form__ratings">
                    {/* Clinic Rating Block */}
                    {form.clinicId !== 'independent' && (
                    <div className="fb-rating-block fb-rating-block--clinic">
                      <div className="fb-rating-block__header">
                        <div className="fb-rating-block__icon">
                          <i className="fas fa-hospital" />
                        </div>
                        <div>
                          <div className="fb-rating-block__title">Clinic Experience</div>
                          <div className="fb-rating-block__subtitle">How was the facility?</div>
                        </div>
                      </div>
                      <div className="fb-rating-block__stars">
                        <label className="fb-form__label">
                          Rating <span className="fb-required">*</span>
                        </label>
                        <StarRating
                          value={form.clinicRating}
                          onChange={(val) => setForm({ ...form, clinicRating: val })}
                        />
                      </div>
                      <div className="fb-rating-block__textarea">
                        <label className="fb-form__label">Comments <span className="fb-optional">(optional)</span></label>
                        <textarea
                          className="fb-form__textarea"
                          value={form.clinicFeedback}
                          onChange={(e) => setForm({ ...form, clinicFeedback: e.target.value })}
                          placeholder="Describe your experience — cleanliness, staff attitude, wait times…"
                          rows={3}
                        />
                      </div>
                    </div>
                    )}

                    {/* Doctor Rating Block */}
                    <div className="fb-rating-block fb-rating-block--doctor">
                      <div className="fb-rating-block__header">
                        <div className="fb-rating-block__icon fb-rating-block__icon--doctor">
                          <i className="fas fa-stethoscope" />
                        </div>
                        <div>
                          <div className="fb-rating-block__title">Doctor Consultation</div>
                          <div className="fb-rating-block__subtitle">How was the consultation?</div>
                        </div>
                      </div>
                      <div className="fb-rating-block__stars">
                        <label className="fb-form__label">
                          Rating <span className="fb-required">*</span>
                        </label>
                        <StarRating
                          value={form.doctorRating}
                          onChange={(val) => setForm({ ...form, doctorRating: val })}
                        />
                      </div>
                      <div className="fb-rating-block__textarea">
                        <label className="fb-form__label">Comments <span className="fb-optional">(optional)</span></label>
                        <textarea
                          className="fb-form__textarea"
                          value={form.doctorFeedback}
                          onChange={(e) => setForm({ ...form, doctorFeedback: e.target.value })}
                          placeholder="Was the doctor attentive, informative, and professional?"
                          rows={3}
                        />
                      </div>
                    </div>
                  </div>

                  {/* ── Submit Button ── */}
                  <button type="submit" className="fb-submit-btn" disabled={submitting}>
                    {submitting ? (
                      <><i className="fas fa-spinner fa-spin" /> Submitting…</>
                    ) : (
                      <><i className="fas fa-paper-plane" /> Submit Feedback</>
                    )}
                  </button>
                </form>
              </div>
            </div>

            {/* ── Past Feedback History ── */}
            <div className="fb-history">
              <div className="fb-history__header">
                <h3 className="fb-history__title">
                  <i className="fas fa-history" /> My Past Feedbacks
                </h3>
                <span className="fb-history__count">{feedbacks.length} total</span>
              </div>

              {feedbacks.length === 0 ? (
                <div className="fb-empty">
                  <div className="fb-empty__icon">
                    <i className="far fa-star" />
                  </div>
                  <p className="fb-empty__text">You haven't submitted any feedback yet.</p>
                  <p className="fb-empty__sub">Your reviews help other patients and improve our services!</p>
                </div>
              ) : (
                <div className="fb-history__list">
                  {feedbacks.map(fb => (
                    <FeedbackHistoryCard key={fb._id} fb={fb} isMobile={isMobile} />
                  ))}
                </div>
              )}
            </div>

          </main>
        </div>
      </div>

      <BottomNav activeItem="feedback" />
    </div>
  );
}