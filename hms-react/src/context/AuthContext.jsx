import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import API from '../utils/api';
import { useSocket, resetSocket } from '../hooks/useSocket';

// ── Role → nav section permissions ───────────────────────────────────────────
const ROLE_PERMISSIONS = {
  super_admin: [
    'dashboard', 'patients', 'ipd', 'billing', 'billing-requests',
    'pharmacy', 'lab', 'inventory', 'staff', 'room-settings',
    'prescriptions', 'telemedicine', 'tokens', 'emergency', 'tasks',
    'super',
  ],
  admin: [
    'dashboard', 'patients', 'ipd', 'billing', 'billing-requests',
    'pharmacy', 'lab', 'inventory', 'staff', 'room-settings', 'prescriptions',
  ],
  doctor: [
    'dashboard', 'patients', 'ipd', 'lab', 'prescriptions', 'telemedicine',
  ],
  nurse: [
    'dashboard', 'patients', 'ipd',
  ],
  receptionist: [
    'dashboard', 'patients', 'billing', 'tokens',
  ],
  pharmacist: [
    'dashboard', 'pharmacy', 'inventory',
  ],
  lab_technician: [
    'dashboard', 'patients', 'lab',
  ],
  patient: [
    'patient-dashboard', 'appointments', 'prescriptions', 'profile', 'telemedicine',
  ],
};

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user,               setUser]               = useState(null);
  const [patient,            setPatient]            = useState(null);
  const [loading,            setLoading]            = useState(false);
  const [authReady,          setAuthReady]          = useState(false);
  const [superAdminClinicId, setSuperAdminClinicId] = useState(
    () => sessionStorage.getItem('sa_clinicId') || null
  );
  const [superAdminClinicName, setSuperAdminClinicName] = useState(
    () => sessionStorage.getItem('sa_clinicName') || null
  );

  // ── Socket Integration ──
  const { socket, isConnected, emit, on, off } = useSocket();
  const [doctorStatus,   setDoctorStatus]   = useState('offline');
  const [onlineDoctors,  setOnlineDoctors]  = useState([]);
  const [clinicType, setClinicType] = useState(null);
  const [activePlan, setActivePlan] = useState('lite');

  const userRef = useRef(user);
  useEffect(() => { userRef.current = user; }, [user]);

  // ── On app load: restore session from token ──────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem('hms_token');
    if (!token) {
      setAuthReady(true);
      return;
    }
    API.get('/auth/profile')
      .then(({ data }) => {
        console.log('📋 Profile loaded:', data);
        setUser(data.user || data);
        if (data.patient) setPatient(data.patient);
        if (data.clinicType) setClinicType(data.clinicType);
      })
      .catch((err) => {
        console.error('Failed to load profile:', err);
        localStorage.removeItem('hms_token');
        localStorage.removeItem('user');
        setUser(null);
        setPatient(null);
      })
      .finally(() => {
        setAuthReady(true);
      });
  }, []);

  // ── Setup socket events when user is loaded ──────────────────────────────
  useEffect(() => {
    if (!user || !socket || user.role === 'super_admin') return;

    const userId   = user._id || user.id;
    const clinicId = user.clinicId || patient?.clinicId || user.clinic || null;

    console.log('🔌 Socket setup for user:', { userId, role: user.role, clinicId });

    const registerWithServer = () => {
      if (user.role === 'doctor' || user.role === 'separate_doctor') {
        console.log('🩺 Registering doctor with socket:', userId);
        // Join the socket room and register, but do NOT set status to online.
        // The doctor must manually click "Go Online" — status stays 'offline' on login.
        socket.emit('doctor:join', userId);
        socket.emit('doctor:register-socket', { doctorId: userId });
        // Intentionally NOT emitting doctor:status here — doctor starts offline.
      }

      if (user.role === 'patient') {
        // FIX: Always join personal patient room using userId — this is what
        // receives targeted events (payment, status, meeting links).
        // clinicId mismatch was causing the old guard to bail out early,
        // so the patient never joined ANY room and saw 0 online doctors.
        console.log('🧑‍⚕️ Registering patient with socket:', { patientId: userId, clinicId });
        socket.emit('patient:join-clinic', { clinicId, patientId: userId });

        // FIX: Fetch ALL online doctors — no clinicId filter needed since
        // the server now returns all online doctors regardless of clinic.
        socket.emit('doctor:get-online', {}, (doctors) => {
          setOnlineDoctors(doctors || []);
        });
      }
    };

    if (socket.connected) registerWithServer();
    socket.on('connect', registerWithServer);

    const handleDoctorStatusChange = (data) => {
      setOnlineDoctors(prev => {
        if (data.status === 'online') {
          const exists = prev.find(d => String(d.doctorId) === String(data.doctorId));
          if (exists) {
            return prev.map(d =>
              String(d.doctorId) === String(data.doctorId)
                ? { ...d, lastSeen: data.timestamp }
                : d
            );
          }
          return [...prev, { doctorId: data.doctorId, lastSeen: data.timestamp, status: 'online' }];
        }
        return prev.filter(d => String(d.doctorId) !== String(data.doctorId));
      });
    };

    const handleOnlineList = ({ onlineDoctors: doctors }) => {
      setOnlineDoctors(doctors || []);
    };

    socket.on('doctor:status-change', handleDoctorStatusChange);
    socket.on('doctor:online-list',   handleOnlineList);

    return () => {
      socket.off('connect',              registerWithServer);
      socket.off('doctor:status-change', handleDoctorStatusChange);
      socket.off('doctor:online-list',   handleOnlineList);
    };
  }, [user, patient, socket]);

  // ── Doctor status management ─────────────────────────────────────────────
  const setDoctorOnline = useCallback((status) => {
    if (!user || (user.role !== 'doctor' && user.role !== 'separate_doctor')) return;
    const doctorId = user._id || user.id;
    console.log(`🔄 Setting doctor ${doctorId} to ${status}`);
    setDoctorStatus(status);
    emit('doctor:status', { doctorId, status, clinicId: user.clinicId || null });
  }, [user, emit]);

  // ── Check if a specific doctor is online ────────────────────────────────
  const isDoctorOnline = useCallback((doctorId) => {
    if (!doctorId) return false;
    const id = String(doctorId);
    return onlineDoctors.some(d => String(d.doctorId) === id);
  }, [onlineDoctors]);

  // ── Super admin clinic impersonation ────────────────────────────────────
  const setSuperAdminClinic = (clinicId, clinicName = '') => {
    if (clinicId) {
      sessionStorage.setItem('sa_clinicId', clinicId);
      sessionStorage.setItem('sa_clinicName', clinicName);
    } else {
      sessionStorage.removeItem('sa_clinicId');
      sessionStorage.removeItem('sa_clinicName');
    }
    setSuperAdminClinicId(clinicId || null);
    setSuperAdminClinicName(clinicName || null);
  };

  const getEffectiveClinicId = () => {
    if (user?.role === 'super_admin') return superAdminClinicId || null;
    return user?.clinicId || patient?.clinicId || user?.clinic || null;
  };

  // ── Login ────────────────────────────────────────────────────────────────
const login = async (email, password) => {
  setLoading(true);
  try {
    const { data } = await API.post('/auth/login', { email, password });
    console.log('✅ LOGIN SUCCESS:', data.user);

    localStorage.setItem('hms_token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));

    resetSocket();

    setUser(data.user);
    if (data.patient) {
      setPatient(data.patient);
      localStorage.setItem('patient', JSON.stringify(data.patient));
    }
    if (data.user?.activePlan) {
  setActivePlan(data.user.activePlan);
} else if (data.clinic?.plan) {
  setActivePlan(data.clinic.plan);
}
    
    // Set clinic type from response
    if (data.clinicType) {
      setClinicType(data.clinicType);
    } else if (data.user?.clinicId) {
      // If clinic type not in response, fetch it
      try {
        // const clinicRes = await API.get(`/clinics/${data.user.clinicId}`);
        const clinicRes = await API.get('/clinics/me');
        if (clinicRes.data?.type) {
          setClinicType(clinicRes.data.type);
        }
      } catch (err) {
        console.error('Failed to fetch clinic type:', err);
      }
    }

    return { success: true, user: data.user, patient: data.patient };
  } catch (err) {
    console.error('❌ Login error:', err);
    return {
      success: false,
      message: err.response?.data?.message || 'Login failed',
    };
  } finally {
    setLoading(false);
  }
};

  const register = async (formData) => {
  setLoading(true);
  try {
    const { data } = await API.post('/auth/register', formData);
    localStorage.setItem('hms_token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    resetSocket();
    setUser(data.user);

    if (data.clinicType) {
      setClinicType(data.clinicType);
    } else {
      try {
        const clinicRes = await API.get('/clinics/me');
        if (clinicRes.data?.type) setClinicType(clinicRes.data.type);
      } catch (err) {
        console.error('Failed to fetch clinic type after register:', err);
      }
    }

    return { success: true, user: data.user, clinicType: data.clinicType };
  } catch (err) {
    console.error('❌ Register error:', err);
    return { success: false, message: err.response?.data?.message || 'Registration failed' };
  } finally {
    setLoading(false);
  }
};

  // ── Patient Registration ─────────────────────────────────────────────────
  const registerPatient = async (formData) => {
    setLoading(true);
    try {
      const patientData = {
        name:                 formData.name,
        email:                formData.email,
        password:             formData.password,
        phone:                formData.phone || '',
        dob:                  formData.dob || null,
        age:                  formData.age || null,
        gender:               formData.gender || null,
        bloodGroup:           formData.bloodGroup || null,
        address:              formData.address || '',
        city:                 formData.city || '',
        state:                formData.state || '',
        pincode:              formData.pincode || '',
        emergencyContact:     formData.emergencyContact || '',
        emergencyName:        formData.emergencyName || '',
        emergencyRelation:    formData.emergencyRelation || '',
        allergies:            formData.allergies || '',
        chronicConditions:    formData.chronicConditions || '',
        currentMedications:   formData.currentMedications || '',
        medicalHistory:       formData.medicalHistory || '',
        notes:                formData.notes || '',
        assignedDoctor:       formData.assignedDoctor || null,
      };

      const { data } = await API.post('/auth/register-patient', patientData);
      return { success: true, data };
    } catch (err) {
      console.error('❌ Patient register error:', err);
      return {
        success: false,
        message: err.response?.data?.message || 'Registration failed',
      };
    } finally {
      setLoading(false);
    }
  };

  // ── Google Login ──────────────────────────────────────────────────────────
  const loginWithGoogle = async ({ token, email, name, isPatient = false }) => {
    setLoading(true);
    try {
      const { data } = await API.post('/auth/google-login', { token, email, name, isPatient });
      localStorage.setItem('hms_token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      resetSocket();
      setUser(data.user);
      if (data.patient) {
        setPatient(data.patient);
        localStorage.setItem('patient', JSON.stringify(data.patient));
      }
      if (data.user?.activePlan) setActivePlan(data.user.activePlan);
      return { success: true, user: data.user, patient: data.patient };
    } catch (err) {
      console.error('❌ Google login error:', err);
      return { success: false, message: err.response?.data?.message || 'Google login failed' };
    } finally {
      setLoading(false);
    }
  };

  // ── Forgot Password ──────────────────────────────────────────────────────
  const forgotPassword = async (email) => {
    setLoading(true);
    try {
      const { data } = await API.post('/auth/forgot-password', { email });
      return { success: true, message: data.message, resetLink: data.resetLink };
    } catch (err) {
      console.error('❌ Forgot password error:', err);
      return { success: false, message: err.response?.data?.message || 'Failed to send reset email' };
    } finally {
      setLoading(false);
    }
  };

  // ── Reset Password ───────────────────────────────────────────────────────
  const resetPassword = async (email, token, newPassword) => {
    setLoading(true);
    try {
      const { data } = await API.post('/auth/reset-password', { email, token, newPassword });
      return { success: true, message: data.message };
    } catch (err) {
      console.error('❌ Reset password error:', err);
      return { success: false, message: err.response?.data?.message || 'Password reset failed' };
    } finally {
      setLoading(false);
    }
  };

  // ── Logout ───────────────────────────────────────────────────────────────
  const logout = () => {
    if (user?.role === 'doctor' || user?.role === 'separate_doctor') {
      const doctorId = user._id || user.id;
      console.log(`🔄 Logging out doctor ${doctorId}`);
      emit('doctor:status', { doctorId, status: 'offline', clinicId: user.clinicId || null });
      setDoctorStatus('offline');
    }

    localStorage.removeItem('hms_token');
    localStorage.removeItem('user');
    localStorage.removeItem('patient');
    sessionStorage.removeItem('sa_clinicId');
    sessionStorage.removeItem('sa_clinicName');

    resetSocket();

    setUser(null);
    setPatient(null);
    setOnlineDoctors([]);
  };

  // ── Permission check ─────────────────────────────────────────────────────
  const hasPerm = (key) => {
    if (!user) return false;
    const role = user.role?.toLowerCase();
    if (role === 'super_admin') return true;
    if (key === 'telemedicine') return role === 'doctor' || role === 'separate_doctor';
    if (role === 'admin') return true;
    const roleNavPerms = ROLE_PERMISSIONS[role];
    if (roleNavPerms) return roleNavPerms.includes(key);
    return Array.isArray(user.permissions) && user.permissions.includes(key);
  };

  // ── Helper methods ───────────────────────────────────────────────────────
  const isPatient      = () => user?.role === 'patient';
  const isDoctor       = () => user?.role?.toLowerCase() === 'doctor';
  const isAdmin        = () => user?.role?.toLowerCase() === 'admin';
  const isSuperAdmin   = () => user?.role?.toLowerCase() === 'super_admin';
  const isStaff        = () => user && user?.role !== 'patient';
  const getUserId      = () => user?.id || user?._id || null;
  const getUserName    = () => user?.name || 'User';
  const getUserEmail   = () => user?.email || '';
  const getUserRole    = () => user?.role || null;
  const isAuthenticated = () => !!user;
  const getPatientData = () => patient || null;

  if (!authReady) return null;

  const value = {
    user,
    patient,
    login,
    register,
    logout,
    loading,
    authReady,
    hasPerm,
    clinicType,
    activePlan,
    isPatient,
    isDoctor,
    isAdmin,
    isSuperAdmin,
    isStaff,
    getUserId,
    getUserName,
    getUserEmail,
    getUserRole,
    isAuthenticated,
    getPatientData,

    registerPatient,
    loginWithGoogle,
    forgotPassword,
    resetPassword,

    superAdminClinicId,
    superAdminClinicName,
    setSuperAdminClinic,
    getEffectiveClinicId,
    updateUserData: (updatedFields) => {
      setUser(prev => {
        if (!prev) return null;
        const updated = { ...prev, ...updatedFields };
        localStorage.setItem('user', JSON.stringify(updated));
        return updated;
      });
    },
 
    socket,
    isConnected,
    doctorStatus,
    setDoctorOnline,
    onlineDoctors,
    isDoctorOnline,
    emit,
    on,
    off,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

export { AuthContext };