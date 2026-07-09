// components/ClinicAdminGate.jsx
import { useAuth } from '../context/AuthContext';
import AdminDashboard from '../pages/AdminDashboard';
import Dashboard from '../pages/Dashboard';

export default function ClinicAdminGate() {
  const { user } = useAuth();
  // Adjust this check once I see how clinic.type reaches the frontend —
  // e.g. user.clinic.type, or a separate /me call
  const isClinic = user?.clinic?.type === 'clinic';
  return isClinic ? <AdminDashboard /> : <Dashboard />;
}