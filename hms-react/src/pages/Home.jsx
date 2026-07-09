// hms-react/src/pages/Home.jsx
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Toast, useToast } from '../components/Toast';

const API = 'http://localhost:5000/api';

/* ─────────────────────────────────────────────────────────────────
   Inline styles for the consultation form.
   These completely override whatever .consult-form CSS is doing so
   the inputs are always interactive and visible.
───────────────────────────────────────────────────────────────── */
const formStyles = {
  wrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    width: '100%',
  },
  input: {
    width: '100%',
    padding: '13px 16px',
    borderRadius: '10px',
    border: '1.5px solid rgba(255,255,255,0.25)',
    background: 'rgba(255,255,255,0.12)',
    color: '#ffffff',
    fontSize: '14px',
    fontFamily: 'inherit',
    outline: 'none',
    boxSizing: 'border-box',
    pointerEvents: 'auto',
    position: 'relative',
    zIndex: 1,
    backdropFilter: 'blur(4px)',
  },
  select: {
    width: '100%',
    padding: '13px 16px',
    borderRadius: '10px',
    border: '1.5px solid rgba(255,255,255,0.25)',
    background: 'rgba(30,58,138,0.85)',
    color: '#ffffff',
    fontSize: '14px',
    fontFamily: 'inherit',
    outline: 'none',
    boxSizing: 'border-box',
    pointerEvents: 'auto',
    position: 'relative',
    zIndex: 1,
    cursor: 'pointer',
    appearance: 'auto',
  },
  phoneRow: {
    display: 'flex',
    gap: '10px',
  },
  phoneCode: {
    width: '110px',
    flexShrink: 0,
    padding: '13px 10px',
    borderRadius: '10px',
    border: '1.5px solid rgba(255,255,255,0.25)',
    background: 'rgba(30,58,138,0.85)',
    color: '#ffffff',
    fontSize: '14px',
    fontFamily: 'inherit',
    outline: 'none',
    boxSizing: 'border-box',
    pointerEvents: 'auto',
    position: 'relative',
    zIndex: 1,
    cursor: 'pointer',
  },
  phoneInput: {
    flex: 1,
    padding: '13px 16px',
    borderRadius: '10px',
    border: '1.5px solid rgba(255,255,255,0.25)',
    background: 'rgba(255,255,255,0.12)',
    color: '#ffffff',
    fontSize: '14px',
    fontFamily: 'inherit',
    outline: 'none',
    boxSizing: 'border-box',
    pointerEvents: 'auto',
    position: 'relative',
    zIndex: 1,
  },
  submitBtn: {
    width: '100%',
    padding: '14px',
    borderRadius: '10px',
    border: 'none',
    background: 'linear-gradient(135deg,#f97316,#ea580c)',
    color: '#ffffff',
    fontSize: '15px',
    fontWeight: '700',
    cursor: 'pointer',
    fontFamily: 'inherit',
    pointerEvents: 'auto',
    position: 'relative',
    zIndex: 1,
    boxShadow: '0 4px 16px rgba(249,115,22,0.4)',
    transition: 'opacity 0.2s',
  },
};

const placeholderStyle = `
  .curelex-form-input::placeholder { color: rgba(255,255,255,0.55); }
  .curelex-form-input:focus { border-color: rgba(255,255,255,0.6) !important; background: rgba(255,255,255,0.18) !important; }
  .curelex-form-select option { background: #1e3a8a; color: #fff; }
`;

const Home = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user, clinicType } = useAuth();
  const showToast = useToast();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [theme, setTheme] = useState('light');
  const [showRoleModal, setShowRoleModal] = useState(false);

  const [consultForm, setConsultForm] = useState({
    name: '', phoneCode: '+91', mobile: '', email: '', state: '', service: ''
  });
  const [consultLoading, setConsultLoading] = useState(false);
  const [consultSubmitted, setConsultSubmitted] = useState(false);

  // ── Redirect if already logged in ──
  useEffect(() => {
    if (isAuthenticated()) {
      if (user?.role === 'patient') {
        navigate('/patient-dashboard');
      } else if (clinicType === 'clinic') {
        navigate('/clinic-dashboard');
      }
      else {
        navigate('/dashboard');
      }
    }
  }, [isAuthenticated, user, navigate]);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  /* ── Consultation Form Submit ── */
  const handleConsultSubmit = async (e) => {
    e.preventDefault();

    if (!consultForm.name.trim()) return showToast('Please enter your full name.', 'error');
    if (!consultForm.mobile.trim()) return showToast('Please enter your mobile number.', 'error');
    if (!consultForm.email.trim()) return showToast('Please enter your email.', 'error');
    if (!consultForm.state) return showToast('Please select your state.', 'error');
    if (!consultForm.service) return showToast('Please select a service.', 'error');

    setConsultLoading(true);
    try {
      const res = await fetch(`${API}/consultations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(consultForm),
      });
      const data = await res.json();
      if (res.ok) {
        setConsultSubmitted(true);
        setConsultForm({ name: '', phoneCode: '+91', mobile: '', email: '', state: '', service: '' });
        showToast('Consultation request submitted successfully!', 'success');
      } else {
        showToast(data.message || 'Submission failed. Please try again.', 'error');
      }
    } catch {
      showToast('Server error. Please try again.', 'error');
    } finally {
      setConsultLoading(false);
    }
  };

  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);
  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) element.scrollIntoView({ behavior: 'smooth' });
    closeMobileMenu();
  };

  /* ── Role selection handlers ──
     Patient keeps its own dedicated login route.
     Doctor and Hospital reuse the exact same staff login
     route/logic that "Staff" used before.
     Clinic now redirects to the standalone curelex-clinic-ims app. ── */
  const handlePatientSelect = () => {
    setShowRoleModal(false);
    navigate('/patient-login');
  };

  const handleStaffSelect = () => {
    setShowRoleModal(false);
    navigate('/login');
  };

  const handleClinicSelect = () => {
    setShowRoleModal(false);
    navigate('/login-clinic');
  };

  return (
    <>
      <Toast />

      <style>{placeholderStyle}</style>

      {/* ── Navbar ── */}
      <nav className="navbar" id="navbar">
        <div className="nav-container">
          <Link to="/" className="logo">
            <img className="logo-img" src="/assets/logo.png" alt="CURELEX" />
          </Link>
          <ul className="nav-links">
            <li><a href="#home" onClick={(e) => { e.preventDefault(); scrollToSection('home'); }}>Home</a></li>
            <li><Link to="/about" onClick={closeMobileMenu}>About</Link></li>
            <li><a href="#services" onClick={(e) => { e.preventDefault(); scrollToSection('services'); }}>Services</a></li>
            <li><a href="#contact" onClick={(e) => { e.preventDefault(); scrollToSection('contact'); }}>Contact Us</a></li>
          </ul>
          <div className="nav-actions">
            <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle theme">
              <i className={`fas ${theme === 'light' ? 'fa-moon' : 'fa-sun'}`}></i>
            </button>
            <button className="login-btn" onClick={() => setShowRoleModal(true)}>
              <i className="fas fa-user"></i> Login
            </button>
            <button className="mobile-menu-btn" onClick={toggleMobileMenu}>
              <i className="fas fa-bars"></i>
            </button>
          </div>
        </div>
      </nav>

      {/* ── Mobile Menu ── */}
      <div className={`mobile-menu ${isMobileMenuOpen ? 'active' : ''}`}>
        <ul className='flex flex-col gap-3'>
          <li><a href="#home" onClick={(e) => { e.preventDefault(); scrollToSection('home'); }}>Home</a></li>
          <li><Link to="/about" onClick={closeMobileMenu}>About</Link></li>
          <li><a href="#services" onClick={(e) => { e.preventDefault(); scrollToSection('services'); }}>Services</a></li>
          <li><a href="#contact" onClick={(e) => { e.preventDefault(); scrollToSection('contact'); }}>Contact Us</a></li>
          <li>
            <button className="theme-toggle-mobile" onClick={toggleTheme}>
              <i className={`fas ${theme === 'light' ? 'fa-moon' : 'fa-sun'} text-gray-500 `}></i>
              <span> {theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>
            </button>
          </li>
          <li><button className="login-btn-mobile" onClick={() => { setShowRoleModal(true); closeMobileMenu(); }}>Login</button></li>
        </ul>
      </div>

      <div style={{ height: '81px', background: 'var(--bg-primary)' }}></div>

      {/* ── Hero Section ── */}
      <section className="hero" id="home">
        <div className="hero-split">
          <div className="hero-left">
            <img className="hero-bg-img" src="/assets/front.jpeg" alt="" onError={(e) => e.target.style.display = 'none'} />
            <div className="hero-trust-badge">Trusted by 10,000+ Patients</div>
            <div className="hero-left-content">
              <h1>Your Health, Our <span>Priority</span></h1>
              <p>Advanced healthcare connecting patients with expert doctors for better diagnosis and treatment.</p>
              <div className="hero-stats">
                <div className="stat-item"><span className="stat-number">10K+</span><span className="stat-label">Patients</span></div>
                <div className="stat-item"><span className="stat-number">500+</span><span className="stat-label">Doctors</span></div>
                <div className="stat-item"><span className="stat-number">50+</span><span className="stat-label">Hospitals</span></div>
              </div>
            </div>
          </div>

          {/* ── Hero Right (Consultation Form) ── */}
          <div className="hero-right">
            {consultSubmitted ? (
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', gap: 20, padding: '40px 28px',
                background: 'rgba(255,255,255,0.06)', borderRadius: 16,
                border: '1.5px solid rgba(255,255,255,0.15)', textAlign: 'center',
                minHeight: 420,
              }}>
                <div style={{
                  width: 80, height: 80, borderRadius: '50%',
                  background: 'linear-gradient(135deg,#10b981,#059669)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 36, color: 'white',
                  boxShadow: '0 0 0 14px rgba(16,185,129,0.15)',
                  animation: 'pop .4s ease',
                }}>
                  <i className="fas fa-check"></i>
                </div>
                <div>
                  <h2 style={{ color: 'white', fontSize: 22, fontWeight: 800, margin: '0 0 8px' }}>
                    Successfully Submitted! 🎉
                  </h2>
                  <p style={{ color: 'rgba(255,255,255,0.78)', fontSize: 14, lineHeight: 1.7, margin: 0 }}>
                    Thank you for reaching out! Our team will review your request and
                    contact you on your provided{' '}
                    <strong style={{ color: '#fbbf24' }}>mobile number or email</strong> at the earliest.
                  </p>
                </div>
                <button
                  onClick={() => setConsultSubmitted(false)}
                  style={{
                    background: 'rgba(255,255,255,0.12)', border: '1.5px solid rgba(255,255,255,0.25)',
                    color: 'white', padding: '11px 32px', borderRadius: 10,
                    fontWeight: 600, fontSize: 13, cursor: 'pointer',
                  }}>
                  ← Submit Another Request
                </button>
              </div>
            ) : (
              <>
                <p className="form-heading">
                  Submit your details and unlock a <span className="free">FREE</span> Expert Consultation
                </p>

                <form onSubmit={handleConsultSubmit} style={formStyles.wrapper} noValidate>
                  <input
                    className="curelex-form-input"
                    type="text"
                    placeholder="Full Name"
                    value={consultForm.name}
                    onChange={(e) => setConsultForm({ ...consultForm, name: e.target.value })}
                    style={formStyles.input}
                    required
                  />

                  <div style={formStyles.phoneRow}>
                    <select
                      className="curelex-form-select"
                      value={consultForm.phoneCode}
                      onChange={(e) => setConsultForm({ ...consultForm, phoneCode: e.target.value })}
                      style={formStyles.phoneCode}
                    >
                      <option value="+91">+91</option>
                      <option value="+1">+1</option>
                      <option value="+44">+44</option>
                      <option value="+971">+971</option>
                      <option value="+61">+61</option>
                    </select>
                    <input
                      className="curelex-form-input"
                      type="tel"
                      placeholder="Mobile Number"
                      value={consultForm.mobile}
                      onChange={(e) => setConsultForm({ ...consultForm, mobile: e.target.value })}
                      style={formStyles.phoneInput}
                      required
                    />
                  </div>

                  <input
                    className="curelex-form-input"
                    type="email"
                    placeholder="Enter your Email"
                    value={consultForm.email}
                    onChange={(e) => setConsultForm({ ...consultForm, email: e.target.value })}
                    style={formStyles.input}
                    required
                  />

                  <select
                    className="curelex-form-select"
                    value={consultForm.state}
                    onChange={(e) => setConsultForm({ ...consultForm, state: e.target.value })}
                    style={formStyles.select}
                    required
                  >
                    <option value="">Select your State</option>
                    <option value="Andhra Pradesh">Andhra Pradesh</option>
                    <option value="Delhi">Delhi</option>
                    <option value="Gujarat">Gujarat</option>
                    <option value="Karnataka">Karnataka</option>
                    <option value="Kerala">Kerala</option>
                    <option value="Madhya Pradesh">Madhya Pradesh</option>
                    <option value="Maharashtra">Maharashtra</option>
                    <option value="Punjab">Punjab</option>
                    <option value="Rajasthan">Rajasthan</option>
                    <option value="Tamil Nadu">Tamil Nadu</option>
                    <option value="Telangana">Telangana</option>
                    <option value="Uttar Pradesh">Uttar Pradesh</option>
                    <option value="West Bengal">West Bengal</option>
                    <option value="Other">Other</option>
                  </select>

                  <select
                    className="curelex-form-select"
                    value={consultForm.service}
                    onChange={(e) => setConsultForm({ ...consultForm, service: e.target.value })}
                    style={formStyles.select}
                    required
                  >
                    <option value="">Select Service</option>
                    <option value="General Medicine">General Medicine</option>
                    <option value="Cardiology">Cardiology</option>
                    <option value="Neurology">Neurology</option>
                    <option value="Orthopedics">Orthopedics</option>
                    <option value="Pediatrics">Pediatrics</option>
                    <option value="Dermatology">Dermatology</option>
                    <option value="Gynecology">Gynecology</option>
                    <option value="Psychiatry">Psychiatry</option>
                    <option value="Vaccination">Vaccination</option>
                  </select>

                  <button
                    type="submit"
                    disabled={consultLoading}
                    style={{ ...formStyles.submitBtn, opacity: consultLoading ? 0.75 : 1 }}
                  >
                    {consultLoading ? (
                      <><i className="fas fa-spinner fa-spin" style={{ marginRight: 8 }}></i>Submitting...</>
                    ) : (
                      'Get Immediate Consultation!'
                    )}
                  </button>

                  <div className="rating-row">
                    <div className="g-logo">G</div>
                    <div>
                      <p className="rating-label">Average Google Rating</p>
                      <p className="rating-stars">★★★★½ <span>4.6 out of 5</span></p>
                    </div>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      </section>

      {/* ── Consult Specialities Section ── */}
      <section className="consult-section-wrapper">
        <section className="consult-section">
          <div className="consult-header">
            <div>
              <h2>Consult top doctors online for any health concern</h2>
              <p>Private online consultations with verified doctors in all specialists</p>
            </div>
            <button className="btn-view-all" onClick={() => navigate('/patient-login')}>View All Specialities</button>
          </div>
          <div className="consult-grid">
            {[
              { label: 'Period doubts or Pregnancy', icon: 'fa-venus', color: '#f9a8d4' },
              { label: 'Acne, pimple or skin issues', icon: 'fa-face-meh', color: '#fcd34d' },
              { label: 'Performance issues in bed', icon: 'fa-heart-pulse', color: '#f87171' },
              { label: 'Cold, cough or fever', icon: 'fa-head-side-cough', color: '#93c5fd' },
              { label: 'Child not feeling well', icon: 'fa-baby', color: '#86efac' },
              { label: 'Depression or anxiety', icon: 'fa-brain', color: '#c4b5fd' },
            ].map((item, i) => (
              <div className="consult-card" key={i}>
                <div className="consult-img-wrap" style={{ background: item.color + '33' }}>
                  <i className={`fas ${item.icon}`} style={{ fontSize: 36, color: item.color }}></i>
                </div>
                <p>{item.label}</p>
                <button className="consult-now-btn" onClick={() => navigate('/patient-login')}>CONSULT NOW</button>
              </div>
            ))}
          </div>
        </section>
      </section>

      {/* ── Why Curelex Section ── */}
      <section className="about" id="about">
        <div className="section-header">
          <h2>Why <span>CURELEX</span></h2>
          <p>Built around you, every step of the way</p>
        </div>
        <div className="about-visual">
          <div className="about-card"><div className="about-card-icon"><i className="fas fa-hand-holding-heart"></i></div><h4>Patient-Centered Care</h4><p>Your health is our top priority</p></div>
          <div className="about-card"><div className="about-card-icon"><i className="fas fa-shield-alt"></i></div><h4>Secure & Private</h4><p>Your data is protected</p></div>
          <div className="about-card"><div className="about-card-icon"><i className="fas fa-clock"></i></div><h4>24/7 Availability</h4><p>Healthcare when you need it</p></div>
          <div className="about-card"><div className="about-card-icon"><i className="fas fa-globe"></i></div><h4>Pan-India Network</h4><p>Connected across states</p></div>
        </div>
      </section>

      {/* ── Services Section ── */}
      <section className="services" id="services">
        <div className="section-header">
          <h2>Our <span>Services</span></h2>
          <p>Comprehensive healthcare solutions</p>
        </div>
        <div className="services-grid">
          <div className="service-card"><i className="fas fa-stethoscope"></i><h3>General Medicine</h3><p>Primary healthcare consultation for common ailments and preventive care.</p></div>
          <div className="service-card"><i className="fas fa-heart"></i><h3>Cardiology</h3><p>Heart health monitoring and expert cardiac consultations.</p></div>
          <div className="service-card"><i className="fas fa-brain"></i><h3>Neurology</h3><p>Specialized care for neurological conditions and brain health.</p></div>
          <div className="service-card"><i className="fas fa-bone"></i><h3>Orthopedics</h3><p>Bone and joint care with expert orthopedic specialists.</p></div>
          <div className="service-card"><i className="fas fa-baby"></i><h3>Pediatrics</h3><p>Complete healthcare solutions for infants and children.</p></div>
          <div className="service-card"><i className="fas fa-syringe"></i><h3>Vaccination</h3><p>Complete immunization services for all age groups.</p></div>
        </div>
      </section>

      {/* ── Supported By Section ── */}
      <section className="supported-by" id="supported">
        <div className="section-header">
          <h2>Supported <span>By</span></h2>
          <p>Our esteemed partners in innovation</p>
        </div>
        <div className="supported-container">
          <div className="supported-card">
            <div className="supported-image"><img src="/assets/download (1).jpg" alt="IIIT Allahabad" /></div>
            <h3>IIIT Allahabad</h3><p>Indian Institute of Information Technology</p>
            <span className="supported-location">Prayagraj, Uttar Pradesh</span>
          </div>
          <div className="supported-card">
            <div className="supported-image"><img src="/assets/UU.jpg" alt="Startup & Incubation Cell" /></div>
            <h3>Startup & Incubation Cell</h3><p>United University</p>
            <span className="supported-location">Supporting Innovation</span>
          </div>
          <div className="supported-card">
            <div className="supported-image"><img src="/assets/download (3).jpg" alt="Asian Institute of Technology" /></div>
            <h3>Asian Institute of Technology</h3><p>AIT Bangkok</p>
            <span className="supported-location">Bangkok, Thailand</span>
          </div>
        </div>
      </section>

      {/* ── Contact Section ── */}
      <section className="contact" id="contact">
        <div className="section-header">
          <h2>Contact <span>Us</span></h2>
          <p>We'd love to hear from you</p>
        </div>
        <div className="contact-container">
          <div className="contact-info">
            <div className="contact-item">
              <div className="contact-icon"><i className="fas fa-map-marker-alt"></i></div>
              <div className="contact-details"><h4>Address</h4><p>IIIT Allahabad Incubation Centre (IIIC)<br />Devghat, Jhalwa, Prayagraj, Uttar<br />Pradesh, 211015</p></div>
            </div>
            <div className="contact-item">
              <div className="contact-icon"><i className="fas fa-envelope"></i></div>
              <div className="contact-details"><h4>Email</h4><p>info.curelex@gmail.com</p></div>
            </div>
            <div className="contact-item">
              <div className="contact-icon"><i className="fas fa-phone-alt"></i></div>
              <div className="contact-details"><h4>Phone</h4><p>+91 788 089 4345</p></div>
            </div>
            <div className="social-links">
              <h4>Follow Us</h4>
              <div className="social-icons">
                <a href="https://www.linkedin.com/company/curelex-healthtech/" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn"><i className="fab fa-linkedin-in"></i></a>
                <a href="#" target="_blank" rel="noopener noreferrer" aria-label="Twitter"><i className="fab fa-twitter"></i></a>
                <a href="https://www.instagram.com/curelexofficial?utm_source=qr&igsh=MWNobGQzMHdhdTRpNg==" target="_blank" rel="noopener noreferrer" aria-label="Instagram"><i className="fab fa-instagram"></i></a>
                <a href="#" target="_blank" rel="noopener noreferrer" aria-label="Facebook"><i className="fab fa-facebook-f"></i></a>
              </div>
            </div>
          </div>
          <div className="contact-map">
            <iframe src="https://www.google.com/maps?q=IIIT+Allahabad+Incubation+Centre+Devghat+Jhalwa+Prayagraj+211015&output=embed" width="100%" height="100%" style={{ display: 'block', border: 0, borderRadius: 12, margin: 0, padding: 0, minHeight: '350px', width: '100%' }} allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade" title="CURELEX Location Map" />
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="footer">
        <div className="footer-content">
          <div className="footer-section">
            <Link to="/" className="logo"><img className="logo-img" src="/assets/logo.png" alt="CURELEX" /></Link>
            <p>Your trusted healthcare partner</p>
          </div>
          <div className="footer-section">
            <h4>Quick Links</h4>
            <ul>
              <li><a href="#home" onClick={(e) => { e.preventDefault(); scrollToSection('home'); }}>Home</a></li>
              <li><Link to="/about" onClick={closeMobileMenu}>About Us</Link></li>
              <li><a href="#services" onClick={(e) => { e.preventDefault(); scrollToSection('services'); }}>Services</a></li>
              <li><a href="#contact" onClick={(e) => { e.preventDefault(); scrollToSection('contact'); }}>Contact</a></li>
            </ul>
          </div>
          <div className="footer-section">
            <h4>Legal</h4>
            <ul>
              <li><a href="#">Privacy Policy</a></li>
              <li><a href="#">Terms of Service</a></li>
              <li><a href="#">Disclaimer</a></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; 2025 CURELEX. All rights reserved.</p>
        </div>
      </footer>

      {/* ── Role Selection Modal ── */}
      {showRoleModal && (
        <div className="site-modal active" id="roleSelectionModal">
          <div className="site-modal-overlay" onClick={() => setShowRoleModal(false)}></div>
          <div className="site-modal-container site-modal-small">
            <div className="flex items-center justify-between mb-4">
              <button className="site-modal-close" onClick={() => setShowRoleModal(false)}>&times;</button>
              <div className="auth-header !mb-0">
                <h2>Select Login Type</h2>
                <p>Choose your account type to proceed</p>
              </div>
            </div>
            {/*
              4 role cards now. Patient keeps its own route.
              Doctor and Hospital reuse handleStaffSelect — the exact
              same /login routing "Staff" used before.
              Clinic redirects to the standalone curelex-clinic-ims app.
            */}
            <div className="role-selection role-selection-4">
              <button className="role-card" onClick={handlePatientSelect}>
                <div className="role-icon"><i className="fas fa-user-injured"></i></div>
                <h3>Patient</h3>
                <p>Access your health records and connect with doctors</p>
              </button>
              <button className="role-card" onClick={handleStaffSelect}>
                <div className="role-icon"><i className="fas fa-user-md"></i></div>
                <h3>Doctor</h3>
                <p>Manage appointments, consultations and patient records</p>
              </button>
              <button className="role-card" onClick={handleClinicSelect}>
                <div className="role-icon"><i className="fas fa-clinic-medical"></i></div>
                <h3>Clinic</h3>
                <p>Manage appointments, patients, billing and more</p>
              </button>
              <button className="role-card" onClick={handleStaffSelect}>
                <div className="role-icon"><i className="fas fa-hospital"></i></div>
                <h3>Hospital</h3>
                <p>Manage appointments, patients, billing and more</p>
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pop {
          0%   { transform: scale(0.5); opacity: 0; }
          70%  { transform: scale(1.1); }
          100% { transform: scale(1);   opacity: 1; }
        }
        .role-selection-4 {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
        }
        @media (max-width: 560px) 
  .role-selection-4 {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }

  .role-card {
    padding: 0.75rem 0.5rem;
  }

  .role-card h3 {
    font-size: 0.9rem;
  }

  .role-card p {
    font-size: 0.7rem;
    line-height: 1.25;
  }

  .auth-header {
    text-align: center;
    width: 100%;
  }

  .auth-header h2,
  .auth-header p {
    text-align: center;
  }
}
      `}</style>
    </>
  );
};

export default Home;