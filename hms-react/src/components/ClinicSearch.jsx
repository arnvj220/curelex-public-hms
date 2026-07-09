// hms-react/src/components/ClinicSearch.jsx
import React, { useState, useEffect, useRef } from 'react';
import API from '../utils/api';

/**
 * Unified search-as-you-type finder (Zomato-style).
 * Desktop: inline bar in the topbar.
 * Mobile (≤768px): icon button in topbar → full-screen overlay search.
 */
export default function ClinicSearch({ patientId, patientName }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loadingResults, setLoadingResults] = useState(false);

  const [selectedClinic, setSelectedClinic] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);

  const [open, setOpen] = useState(false);

  // Mobile overlay state
  const [mobileOverlayOpen, setMobileOverlayOpen] = useState(false);

  // Booking form modal state
  const [bookingDoctor, setBookingDoctor] = useState(null);
  const [bookingClinic, setBookingClinic] = useState(null);
  const [form, setForm] = useState({
    age: '',
    gender: 'Male',
    symptoms: '',
    consultationType: 'in-person',
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Receipt modal state
  const [receipt, setReceipt] = useState(null);

  const wrapperRef = useRef(null);
  const mobileInputRef = useRef(null);
  const debounceRef = useRef(null);

  // ── Close dropdown when clicking outside (desktop) ──────────────────────
  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ── Auto-focus mobile input when overlay opens ───────────────────────────
  useEffect(() => {
    if (mobileOverlayOpen) {
      setTimeout(() => mobileInputRef.current?.focus(), 80);
    } else {
      // Reset search state when overlay closes
      setQuery('');
      setResults([]);
      setSelectedClinic(null);
      setDoctors([]);
      setOpen(false);
    }
  }, [mobileOverlayOpen]);

  // ── Lock body scroll when mobile overlay is open ─────────────────────────
  useEffect(() => {
    if (mobileOverlayOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileOverlayOpen]);

  // ── Debounced unified search ─────────────────────────────────────────────
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (selectedClinic || !query.trim()) {
      setResults([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoadingResults(true);
      try {
        const { data } = await API.get(`/clinics/search-all?q=${encodeURIComponent(query.trim())}`);
        if (data.success) setResults(data.results || []);
      } catch (err) {
        console.error('Search failed:', err);
        setResults([]);
      }
      setLoadingResults(false);
    }, 350);

    return () => clearTimeout(debounceRef.current);
  }, [query, selectedClinic]);

  // ── Click a clinic → drill into its doctor list ──────────────────────────
  const selectClinic = async (clinic) => {
    setSelectedClinic(clinic);
    setDoctors([]);
    setLoadingDoctors(true);
    try {
      const { data } = await API.get(`/clinics/${clinic._id}/doctors`);
      if (data.success) setDoctors(data.doctors || []);
    } catch (err) {
      console.error('Failed to load doctors:', err);
    }
    setLoadingDoctors(false);
  };

  const backToSearch = () => {
    setSelectedClinic(null);
    setDoctors([]);
  };

  // ── Open booking form ────────────────────────────────────────────────────
  const openBookingForm = (doctor, clinic) => {
    setBookingDoctor(doctor);
    setBookingClinic(clinic);
    setForm({ age: '', gender: 'Male', symptoms: '', consultationType: 'in-person' });
    setFormError('');
    setMobileOverlayOpen(false);
  };

  const closeBookingForm = () => {
    setBookingDoctor(null);
    setBookingClinic(null);
    setFormError('');
  };

  const updateForm = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  // ── Submit booking → generate token ─────────────────────────────────────
  const handleSubmitBooking = async () => {
    if (!form.symptoms.trim()) {
      setFormError('Please briefly describe your symptoms or reason for visit');
      return;
    }
    if (!bookingClinic?._id) {
      setFormError('Could not determine the clinic for this doctor. Please try again.');
      return;
    }
    setFormError('');
    setSubmitting(true);
    try {
      const { data } = await API.post('/tokens/generate', {
        clinicId: bookingClinic._id,
        doctorId: bookingDoctor._id,
        patientId,
        patientName,
        age: form.age ? parseInt(form.age) : undefined,
        gender: form.gender,
        symptoms: form.symptoms.trim(),
        consultationType: form.consultationType,
      });
      setReceipt(data);
      setBookingDoctor(null);
      setBookingClinic(null);
      setOpen(false);
      setSelectedClinic(null);
      setQuery('');
    } catch (err) {
      setFormError(err?.response?.data?.message || 'Could not generate token. Please try again.');
    }
    setSubmitting(false);
  };

  const clinicResults = results.filter((r) => r.type === 'clinic');
  const doctorResults = results.filter((r) => r.type === 'doctor');

  // ── Shared result list (used in both desktop dropdown + mobile overlay) ──
  const ResultList = ({ isMobile = false }) => (
    <div>
      {/* Loading */}
      {loadingResults && (
        <div style={{ padding: 20, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
          <i className="fas fa-spinner fa-spin" style={{ marginRight: 6 }} />
          Searching…
        </div>
      )}

      {/* No results */}
      {!loadingResults && query.trim() && results.length === 0 && (
        <div style={{ padding: '28px 20px', textAlign: 'center', color: '#94a3b8' }}>
          <i className="fas fa-search" style={{ fontSize: 24, display: 'block', marginBottom: 8, opacity: 0.4 }} />
          <div style={{ fontSize: 13, fontWeight: 500 }}>No results for "{query}"</div>
          <div style={{ fontSize: 12, marginTop: 4 }}>Try a doctor name, speciality, or clinic</div>
        </div>
      )}

      {/* Doctor results */}
      {!loadingResults && doctorResults.length > 0 && (
        <div>
          <div style={{ padding: '10px 16px 4px', fontSize: 10, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
            Doctors
          </div>
          {doctorResults.map((doc) => (
            <div
              key={doc._id}
              onClick={() => openBookingForm(doc, doc.clinic)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                gap: 10, padding: isMobile ? '14px 16px' : '12px 14px',
                borderBottom: '1px solid #f1f5f9', cursor: 'pointer',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#fff')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                <div style={{
                  width: 38, height: 38, borderRadius: '50%',
                  background: '#eff6ff', color: '#2d6be4',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: 14, flexShrink: 0,
                }}>
                  {doc.name?.charAt(0)?.toUpperCase() || 'D'}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: '#1a2236', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center' }}>
                    Dr. {doc.name}
                    {doc.reviews > 0 && (
                      <span style={{ marginLeft: 8, fontSize: 11, color: '#f59e0b', background: '#fef3c7', padding: '2px 6px', borderRadius: 10, display: 'inline-flex', alignItems: 'center', gap: 3, fontWeight: 700 }}>
                        <i className="fas fa-star" style={{ fontSize: 9 }} /> {doc.rating}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {doc.department || 'General'} · In-Person: ₹{doc.consultationFee || 0} · Online: ₹{doc.telemedicineFee || 0}
                    {doc.clinic?.name ? ` · ${doc.clinic.name}` : ''}
                  </div>
                </div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); openBookingForm(doc, doc.clinic); }}
                style={{
                  border: 'none', background: '#2d6be4', color: '#fff',
                  fontSize: 11, fontWeight: 600, padding: '6px 10px',
                  borderRadius: 8, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                }}
              >
                Book
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Clinic results */}
      {!loadingResults && clinicResults.length > 0 && (
        <div>
          <div style={{ padding: '10px 16px 4px', fontSize: 10, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
            Clinics
          </div>
          {clinicResults.map((clinic) => (
            <div
              key={clinic._id}
              onClick={() => selectClinic(clinic)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: isMobile ? '14px 16px' : '12px 14px',
                borderBottom: '1px solid #f1f5f9', cursor: 'pointer',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#fff')}
            >
              <div style={{
                width: 38, height: 38, borderRadius: 10,
                background: '#eff6ff', color: '#2d6be4',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16, flexShrink: 0,
              }}>
                <i className="fas fa-hospital" />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: '#1a2236', display: 'flex', alignItems: 'center' }}>
                  {clinic.name}
                  {clinic.reviews > 0 && (
                    <span style={{ marginLeft: 8, fontSize: 11, color: '#f59e0b', background: '#fef3c7', padding: '2px 6px', borderRadius: 10, display: 'inline-flex', alignItems: 'center', gap: 3, fontWeight: 700 }}>
                      <i className="fas fa-star" style={{ fontSize: 9 }} /> {clinic.rating}
                    </span>
                  )}
                </div>
                {clinic.address && (
                  <div style={{ fontSize: 11, color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {clinic.address}
                  </div>
                )}
              </div>
              <i className="fas fa-chevron-right" style={{ color: '#94a3b8', fontSize: 11, marginLeft: 'auto', flexShrink: 0 }} />
            </div>
          ))}
        </div>
      )}

      {/* Empty state when nothing typed yet */}
      {!query.trim() && !selectedClinic && !loadingResults && (
        <div style={{ padding: '24px 16px', textAlign: 'center', color: '#94a3b8' }}>
          <i className="fas fa-stethoscope" style={{ fontSize: 28, display: 'block', marginBottom: 8, opacity: 0.3 }} />
          <div style={{ fontSize: 13, fontWeight: 500 }}>Search doctors, specialities or clinics</div>
        </div>
      )}
    </div>
  );

  // ── Clinic drill-down header (shared) ────────────────────────────────────
  const ClinicHeader = () => (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '12px 16px', borderBottom: '1px solid #f1f5f9',
      position: 'sticky', top: 0, background: '#fff', zIndex: 1,
    }}>
      <button
        onClick={backToSearch}
        style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 14, color: '#2d6be4', padding: 4 }}
      >
        <i className="fas fa-arrow-left" />
      </button>
      <div style={{ fontWeight: 700, fontSize: 14, color: '#1a2236' }}>{selectedClinic.name}</div>
    </div>
  );

  // ── Clinic doctor list (shared) ──────────────────────────────────────────
  const ClinicDoctorList = ({ isMobile = false }) => (
    <>
      {loadingDoctors && (
        <div style={{ padding: 20, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
          Loading doctors...
        </div>
      )}
      {!loadingDoctors && doctors.length === 0 && (
        <div style={{ padding: 20, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
          No doctors available at this clinic right now.
        </div>
      )}
      {!loadingDoctors && doctors.map((doc) => (
        <div
          key={doc._id}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: 10, padding: isMobile ? '14px 16px' : '12px 14px',
            borderBottom: '1px solid #f1f5f9',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <div style={{
              width: 38, height: 38, borderRadius: '50%',
              background: '#eff6ff', color: '#2d6be4',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: 14, flexShrink: 0,
            }}>
              {doc.name?.charAt(0)?.toUpperCase() || 'D'}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 13, color: '#1a2236', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center' }}>
                Dr. {doc.name}
                {doc.reviews > 0 && (
                  <span style={{ marginLeft: 8, fontSize: 11, color: '#f59e0b', background: '#fef3c7', padding: '2px 6px', borderRadius: 10, display: 'inline-flex', alignItems: 'center', gap: 3, fontWeight: 700 }}>
                    <i className="fas fa-star" style={{ fontSize: 9 }} /> {doc.rating}
                  </span>
                )}
              </div>
              <div style={{ fontSize: 11, color: '#64748b' }}>
                {doc.department || 'General'} · In-Person: ₹{doc.consultationFee || 0} · Online: ₹{doc.telemedicineFee || 0}
              </div>
            </div>
          </div>
          <button
            onClick={() => openBookingForm(doc, selectedClinic)}
            style={{
              border: 'none', background: '#2d6be4', color: '#fff',
              fontSize: 12, fontWeight: 600, padding: '7px 12px',
              borderRadius: 8, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
            }}
          >
            Book
          </button>
        </div>
      ))}
    </>
  );

  return (
    <>
      {/* ── DESKTOP: inline search bar in topbar ──────────────────────── */}
      <div ref={wrapperRef} className="cs-desktop-wrapper" style={{ position: 'relative', width: '100%', maxWidth: 480 }}>
        <div
          className="pd-topbar__search"
          style={{
            position: 'relative', display: 'flex', alignItems: 'center', gap: 10,
            width: '100%', minWidth: 320, height: 46, padding: '0 16px',
            borderRadius: 23, border: '1.5px solid #dbeafe', background: '#fff',
          }}
        >
          <i className="fas fa-search" style={{ fontSize: 15, color: '#94a3b8' }} />
          <input
            type="text"
            placeholder="Search doctors, specialities, or clinics..."
            value={selectedClinic ? selectedClinic.name : query}
            onFocus={() => setOpen(true)}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedClinic(null);
              setOpen(true);
            }}
            style={{
              flex: 1, border: 'none', outline: 'none',
              fontSize: 15, fontFamily: 'inherit', background: 'transparent',
            }}
          />
        </div>

        {/* Desktop dropdown */}
        {open && (query.trim() || selectedClinic) && (
          <div style={{
            position: 'absolute', top: 'calc(100% + 8px)', left: 0,
            width: 420, maxHeight: 460, overflowY: 'auto',
            background: '#fff', borderRadius: 12,
            boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
            border: '1px solid #e5e7eb', zIndex: 4000,
          }}>
            {selectedClinic ? (
              <>
                <ClinicHeader />
                <ClinicDoctorList />
              </>
            ) : (
              <ResultList />
            )}
          </div>
        )}
      </div>

      {/* ── MOBILE: search icon button → full-screen overlay ─────────── */}
      <button
        className="cs-mobile-search-btn"
        onClick={() => setMobileOverlayOpen(true)}
        aria-label="Search doctors and clinics"
        style={{
          display: 'none', /* shown via CSS at ≤768px */
          width: 38, height: 38,
          borderRadius: 10,
          border: '1.5px solid #dbeafe',
          background: '#fff',
          alignItems: 'center', justifyContent: 'center',
          color: '#2d6be4', fontSize: 15, flexShrink: 0,
          cursor: 'pointer',
        }}
      >
        <i className="fas fa-search" />
      </button>

      {/* ── Mobile full-screen search overlay ────────────────────────── */}
      {mobileOverlayOpen && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 6000,
            background: '#fff', display: 'flex', flexDirection: 'column',
          }}
        >
          {/* Overlay header */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '12px 14px',
            borderBottom: '1px solid #e8edf5',
            background: '#fff',
            flexShrink: 0,
          }}>
            {/* Back / Cancel */}
            <button
              onClick={() => setMobileOverlayOpen(false)}
              style={{
                width: 36, height: 36, borderRadius: 10, border: 'none',
                background: '#f4f6fb', color: '#1a2236',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 15, flexShrink: 0, cursor: 'pointer',
              }}
              aria-label="Close search"
            >
              <i className="fas fa-arrow-left" />
            </button>

            {/* Search input */}
            <div style={{
              flex: 1, display: 'flex', alignItems: 'center', gap: 8,
              background: '#f4f6fb', borderRadius: 12, padding: '0 14px', height: 42,
              border: '1.5px solid #dbeafe',
            }}>
              <i className="fas fa-search" style={{ fontSize: 14, color: '#94a3b8', flexShrink: 0 }} />
              <input
                ref={mobileInputRef}
                type="search"
                placeholder="Doctors, specialities, clinics…"
                value={selectedClinic ? selectedClinic.name : query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelectedClinic(null);
                }}
                style={{
                  flex: 1, border: 'none', outline: 'none',
                  fontSize: 15, fontFamily: 'inherit', background: 'transparent',
                  color: '#1a2236',
                }}
              />
              {(query || selectedClinic) && (
                <button
                  onClick={() => { setQuery(''); setSelectedClinic(null); setResults([]); }}
                  style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8', padding: 2, flexShrink: 0 }}
                >
                  <i className="fas fa-times-circle" style={{ fontSize: 14 }} />
                </button>
              )}
            </div>
          </div>

          {/* Overlay results */}
          <div style={{ flex: 1, overflowY: 'auto', background: '#fff' }}>
            {selectedClinic ? (
              <>
                <ClinicHeader />
                <ClinicDoctorList isMobile />
              </>
            ) : (
              <ResultList isMobile />
            )}
          </div>
        </div>
      )}

      {/* ── Booking form modal ────────────────────────────────────────── */}
      {bookingDoctor && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'flex-end',
            justifyContent: 'center', zIndex: 5000,
          }}
          onClick={closeBookingForm}
        >
          <div
            style={{
              background: '#fff', borderRadius: '20px 20px 0 0',
              padding: '20px 22px calc(20px + env(safe-area-inset-bottom, 0px))',
              width: '100%', maxWidth: 480,
              maxHeight: '90vh', overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Pull handle */}
            <div style={{ width: 36, height: 4, background: '#d1d5db', borderRadius: 2, margin: '0 auto 16px' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#1e293b' }}>
                  Book Token — Dr. {bookingDoctor.name}
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: '#64748b' }}>
                  {bookingDoctor.department || 'General'} · ₹{form.consultationType === 'online' ? (bookingDoctor.telemedicineFee || 0) : (bookingDoctor.consultationFee || 0)}
                  {bookingClinic?.name ? ` · ${bookingClinic.name}` : ''}
                </p>
              </div>
              <button onClick={closeBookingForm} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 16, color: '#94a3b8', flexShrink: 0 }}>
                <i className="fas fa-times" />
              </button>
            </div>

            <div style={{ display: 'grid', gap: 14, marginTop: 18 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <input
                  type="number"
                  placeholder="Age"
                  value={form.age}
                  onChange={(e) => updateForm('age', e.target.value)}
                  style={{ padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 14, fontFamily: 'inherit', outline: 'none' }}
                />
                <select
                  value={form.gender}
                  onChange={(e) => updateForm('gender', e.target.value)}
                  style={{ padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 14, fontFamily: 'inherit', outline: 'none' }}
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <textarea
                rows={3}
                placeholder="Symptoms / Reason for visit *"
                value={form.symptoms}
                onChange={(e) => updateForm('symptoms', e.target.value)}
                style={{ padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 14, fontFamily: 'inherit', outline: 'none', resize: 'vertical' }}
              />

              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 6 }}>Consultation Type</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[
                    { value: 'in-person', label: '🏥 In-Person' },
                    { value: 'online',    label: '💻 Online' },
                  ].map((t) => (
                    <button
                      key={t.value}
                      onClick={() => updateForm('consultationType', t.value)}
                      style={{
                        flex: 1, padding: '9px 0', borderRadius: 10,
                        border: `1.5px solid ${form.consultationType === t.value ? '#2d6be4' : '#e2e8f0'}`,
                        background: form.consultationType === t.value ? '#eff6ff' : '#fff',
                        color: form.consultationType === t.value ? '#2d6be4' : '#64748b',
                        fontWeight: 600, fontSize: 13, cursor: 'pointer',
                      }}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {formError && (
                <div style={{ padding: 10, background: '#fee2e2', borderRadius: 8, color: '#dc2626', fontSize: 12 }}>
                  ⚠️ {formError}
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button
                  onClick={closeBookingForm}
                  style={{ flex: 1, padding: 12, borderRadius: 10, border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#475569' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitBooking}
                  disabled={submitting}
                  style={{
                    flex: 2, padding: 12, borderRadius: 10, border: 'none',
                    background: submitting ? '#93c5fd' : '#2d6be4',
                    color: '#fff', fontSize: 13, fontWeight: 600,
                    cursor: submitting ? 'default' : 'pointer',
                  }}
                >
                  {submitting ? 'Booking...' : '🎫 Confirm & Generate Token'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Receipt modal ─────────────────────────────────────────────── */}
      {receipt && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 5000 }}
          onClick={() => setReceipt(null)}
        >
          <div style={{ background: '#fff', borderRadius: 16, padding: '28px 24px', width: 380, maxWidth: '92vw', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ width: 96, height: 96, borderRadius: '50%', background: 'linear-gradient(135deg, #0f4c81, #38bdf8)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
              <div style={{ color: '#fff', fontSize: 38, fontWeight: 800 }}>{receipt.tokenNumber}</div>
            </div>
            <div style={{ fontSize: 19, fontWeight: 800, marginBottom: 6, color: '#1e293b' }}>Token Request Sent!</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>Dr. {receipt.doctor?.name}</div>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 14 }}>{receipt.doctor?.department || 'General'}</div>
            <div style={{ background: '#fef3c7', color: '#92400e', padding: '8px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, marginBottom: 14 }}>
              ⏳ Pending confirmation from the clinic
            </div>
            <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, marginBottom: 18, fontSize: 13 }}>
              📅 {new Date().toLocaleDateString('en-IN')} · 🕐 {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
            </div>
            <button
              onClick={() => setReceipt(null)}
              style={{ width: '100%', padding: 11, borderRadius: 10, border: 'none', background: '#2d6be4', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </>
  );
}