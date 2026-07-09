// hms-react/src/App.jsx
import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import './index.css';
import Profile from './pages/Profile';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Patients from './pages/Patients';
import Billing from './pages/Billing';
import BillingRequests from './pages/BillingRequests';
import IMSApp from './ims/App';
import Lab from './pages/Lab';
import Inventory from './pages/Inventory';
import Staff from './pages/Staff';
import TokenPanel from './pages/TokenPanel';
import IPD from './pages/IPD';
import RoomSettings from './pages/RoomSettings';
import Emergency from './pages/Emergency';
import PatientDashboard from './pages/PatientDashboard';
import PatientLogin from './pages/PatientLogin';
import PatientRegister from './pages/PatientRegister';
import PatientAppointments from './pages/PatientAppointments';
import PatientAdmission from './pages/PatientAdmission';
import TaskAllocation from './pages/TaskAllocation';
import About from './pages/About';
import DoctorPrescriptions from './pages/DoctorPrescriptions';
import PatientPrescriptions from './pages/PatientPrescriptions';
import PatientDocuments from './pages/PatientDocuments';
import PatientFeedback from './pages/PatientFeedback';
import DoctorTelemedicine from './pages/DoctorTelemedicine';
import PatientTelemedicine from './pages/PatientTelemedicine';
import DoctorEarnings from './pages/DoctorEarnings';
import DoctorBankDetails from './pages/DoctorBankDetails';
import DoctorProfileView from './pages/DoctorProfileView';
import DoctorProfileForm from './pages/DoctorProfileForm';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import SoloDoctorDashboard from './pages/SoloDoctorDashboard';
import ClinicRegistration from './pages/ClinicRegister';
import ClinicLogin from './pages/ClinicLogin';
import AdminDashboard from './pages/AdminDashboard';
import PlanSelection from './pages/PlanSelection';
import ResetPassword from './pages/ResetPassword';


/* ── Auth guards ─────────────────────────────────────────────── */

// Redirects to login if not authenticated
const PrivateRoute = ({ children }) => {
  const { user, authReady, clinicType } = useAuth();
  if (!authReady) return null;
  
  // If clinic type is 'clinic', redirect to clinic dashboard
  if (clinicType === 'clinic' && user?.role === 'admin') {
    return <Navigate to="/clinic-dashboard" replace />;
  }
  
  return user ? children : <Navigate to="/login" replace />;
};

// Redirects to correct home if already authenticated (login/register pages)
const PublicRoute = ({ children }) => {
  const { user, authReady, clinicType } = useAuth();
  if (!authReady) return null;
  if (!user) return children;
  
  // super_admin goes to the admin console
  if (user.role === 'super_admin')
    return <Navigate to="/super-admin" replace />;

  if (user.role === 'patient')
    return <Navigate to="/patient-dashboard" replace />;

  if (user.role === 'separate_doctor')
    return <Navigate to="/solo-doctor-dashboard" replace />;

  // Clinic admin goes to clinic dashboard
  if (user.role === 'admin' && clinicType === 'clinic')
    return <Navigate to="/clinic-dashboard" replace />;

  return <Navigate to="/dashboard" replace />;
};

const SoloDoctorRoute = ({ children }) => {
  const { user, authReady } = useAuth();

  if (!authReady) return null;

  if (!user)
    return <Navigate to="/login" replace />;

  if (user.role !== "separate_doctor")
    return <Navigate to="/dashboard" replace />;

  return children;
};

// Patient route guard — only patients can access
const PatientRoute = ({ children }) => {
  const { user, authReady } = useAuth();
  if (!authReady) return null;
  if (!user) return <Navigate to="/patient-login" replace />;
  if (user.role !== 'patient') return <Navigate to="/dashboard" replace />;
  return children;
};

// Staff route guard — redirects patients and super_admin away from staff routes
const StaffRoute = ({ children }) => {
  const { user, authReady } = useAuth();
  if (!authReady) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'patient') return <Navigate to="/patient-dashboard" replace />;
  if (user.role === 'super_admin') return <Navigate to="/super-admin" replace />;
  if (user.role === 'admin') return <Navigate to="/clinic-dashboard" replace />;
  return children;
};

// Super admin route guard — only super_admin can access
const SuperAdminRoute = ({ children }) => {
  const { user, authReady } = useAuth();
  if (!authReady) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'super_admin') return <Navigate to="/dashboard" replace />;
  return children;
};

// Permission guard for specific permissions
const PermRoute = ({ permKey, children }) => {
  const { hasPerm } = useAuth();
  return hasPerm(permKey) ? children : <Navigate to="/dashboard" replace />;
};

const ClinicTypeRoute = ({ 
  children, 
  requiredType, // 'clinic' or 'hospital'
  fallbackPath = '/dashboard' 
}) => {
  const { user, authReady, clinicType, isSuperAdmin } = useAuth();
  
  if (!authReady) return null;
  if (!user) return <Navigate to="/login" replace />;
  
  // Super admins should be redirected to super-admin dashboard
  if (isSuperAdmin()) {
    return <Navigate to="/super-admin" replace />;
  }
  
  // If clinic type doesn't match required type, redirect
  if (clinicType !== requiredType) {
    return <Navigate to={fallbackPath} replace />;
  }
  
  return children;
};

// ── Admin Route with Plan Selection ──
const AdminRoute = ({ children }) => {
  const { user, authReady, clinicType, activePlan } = useAuth(); // Get activePlan from context
  const [choosingPlan, setChoosingPlan] = useState(false);

  if (!authReady) return null;
  if (!user) return <Navigate to="/login" replace />;
  
  // Check if user is admin
  if (user.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  // Check if clinic type is 'clinic'
  if (clinicType !== 'clinic') {
    return <Navigate to="/dashboard" replace />;
  }

  // If choosing plan, show plan selection
  if (choosingPlan) {
    return <PlanSelection onDone={() => setChoosingPlan(false)} />;
  }

  // Pass the choose plan function and active plan to AdminDashboard
  return React.cloneElement(children, { 
    onChoosePlan: () => setChoosingPlan(true),
    activePlan: activePlan // Pass the active plan
  });
};

// ── Main App ──
function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* ── Public Routes ────────────────────────────────────── */}
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />

          {/* ── Staff Auth Routes ────────────────────────────────── */}
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

          {/* ── Clinic Auth Routes ──────────────────────────────── */}
          <Route path="/login-clinic" element={<PublicRoute><ClinicLogin /></PublicRoute>} />
          <Route path="/register-clinic" element={<PublicRoute><ClinicRegistration /></PublicRoute>} />

          {/* ── Super Admin Route ────────────────────────────────── */}
          <Route
            path="/super-admin"
            element={
              <SuperAdminRoute>
                <SuperAdminDashboard />
              </SuperAdminRoute>
            }
          />
          <Route
            path="/super-admin/*"
            element={
              <SuperAdminRoute>
                <SuperAdminDashboard />
              </SuperAdminRoute>
            }
          />

          {/* ── Patient Auth Routes ─────────────────────────────── */}
          <Route path="/patient-login" element={<PublicRoute><PatientLogin /></PublicRoute>} />
          <Route path="/patient-register" element={<PublicRoute><PatientRegister /></PublicRoute>} />
          <Route path="/reset-password" element={<ResetPassword />} />


          {/* ── Clinic Dashboard (Protected - Clinic type only) ── */}
          <Route
            path="/clinic-dashboard"
            element={
              <ClinicTypeRoute requiredType="clinic" fallbackPath="/dashboard">
                <AdminRoute>
                  <AdminDashboard />
                </AdminRoute>
              </ClinicTypeRoute>
            }
          />

          {/* ── Staff Dashboard Routes ──────────────────────────── */}
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <Layout />
              </PrivateRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="profile" element={<Profile />} />

            <Route
              path="patients"
              element={<PermRoute permKey="patients"><Patients /></PermRoute>}
            />
            <Route
              path="billing"
              element={<PermRoute permKey="billing"><Billing /></PermRoute>}
            />
            <Route
              path="billing-requests"
              element={<PermRoute permKey="billing"><BillingRequests /></PermRoute>}
            />
            <Route
              path="ipd"
              element={<PermRoute permKey="ipd"><IPD /></PermRoute>}
            />
            <Route
              path="room-settings"
              element={<PermRoute permKey="room-settings"><RoomSettings /></PermRoute>}
            />
            <Route
              path="pharmacy/*"
              element={<PermRoute permKey="pharmacy"><IMSApp /></PermRoute>}
            />
            <Route
              path="lab"
              element={<PermRoute permKey="lab"><Lab /></PermRoute>}
            />
            <Route
              path="inventory"
              element={<PermRoute permKey="inventory"><Inventory /></PermRoute>}
            />
            <Route
              path="staff"
              element={<PermRoute permKey="staff"><Staff /></PermRoute>}
            />
            <Route
              path="tokens"
              element={<PermRoute permKey="patients"><TokenPanel /></PermRoute>}
            />
            <Route
              path="tasks"
              element={<PrivateRoute><TaskAllocation /></PrivateRoute>}
            />
            <Route path="emergency" element={<Emergency />} />
            <Route
              path="prescriptions"
              element={<PermRoute permKey="prescriptions"><DoctorPrescriptions /></PermRoute>}
            />
            <Route
              path="telemedicine"
              element={<PermRoute permKey="telemedicine"><DoctorTelemedicine /></PermRoute>}
            />
            <Route
              path="doctor-earnings"
              element={<PrivateRoute><DoctorEarnings /></PrivateRoute>}
            />
            <Route
              path="doctor-bank-details"
              element={<PrivateRoute><DoctorBankDetails /></PrivateRoute>}
            />
          </Route>

          {/* ── Patient Routes ───────────────────────────────────── */}
          <Route
            path="/patient-dashboard"
            element={<PatientRoute><PatientDashboard /></PatientRoute>}
          />

          <Route
            path="/patient-profile"
            element={
              <PatientRoute>
                <Profile />
              </PatientRoute>
            }
          />

          <Route
            path="/patient-appointments"
            element={<PatientRoute><PatientAppointments /></PatientRoute>}
          />
          <Route
            path="/patient-admission"
            element={<PatientRoute><PatientAdmission /></PatientRoute>}
          />
          <Route
            path="/patient-prescriptions"
            element={
              <PatientRoute>
                <PatientPrescriptions />
              </PatientRoute>
            }
          />
          <Route
            path="/patient-telemedicine"
            element={
              <PatientRoute>
                <PatientTelemedicine />
              </PatientRoute>
            }
          />

          {/* ── Patient Documents ────────────────────────────────── */}
          <Route
            path="/patient-documents"
            element={<PatientRoute><PatientDocuments /></PatientRoute>}
          />
          <Route
            path="/patient-feedback"
            element={<PatientRoute><PatientFeedback /></PatientRoute>}
          />

          {/* ── Solo Doctor Routes ───────────────────────────────── */}
          <Route
            path="/solo-doctor-dashboard"
            element={
              <SoloDoctorRoute>
                <SoloDoctorDashboard />
              </SoloDoctorRoute>
            }
          />
          <Route
            path="/doctor-profile-form"
            element={
              <SoloDoctorRoute>
                <DoctorProfileForm />
              </SoloDoctorRoute>
            }
          />
          <Route
            path="/doctor-profile-view"
            element={
              <SoloDoctorRoute>
                <DoctorProfileView />
              </SoloDoctorRoute>
            }
          />

          {/* ── Catch all ────────────────────────────────────────── */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;