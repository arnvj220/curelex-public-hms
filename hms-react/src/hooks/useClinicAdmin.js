// hooks/useClinicAdmin.js
import { useAuth } from '../context/AuthContext';
import API from '../utils/api';

const STATUS_TO_CLINIC = { Waiting: 'waiting', Called: 'called', Done: 'done', Skipped: 'waiting', Pending: 'waiting' };
const STATUS_TO_TOKEN  = { waiting: 'Waiting', called: 'Called', done: 'Done' };

// Derives paid/dues purely from existing fields — no schema changes.
function derivePayment(t) {
  const fee = t.consultationFee || 0;
  if (t.paymentStatus === 'paid')    return { paid: t.paymentAmount || fee, dues: 0 };
  if (t.paymentStatus === 'partial') return { paid: t.paymentAmount || 0, dues: Math.max(fee - (t.paymentAmount || 0), 0) };
  if (t.paymentStatus === 'refunded') return { paid: 0, dues: 0 };
  return { paid: 0, dues: fee }; // 'pending'
}

function tokenToPatient(t) {
  const { paid, dues } = derivePayment(t);
  const isReceptionist = t.generatedBy?.role === 'receptionist';
  return {
    _id: t._id,
    token: t.tokenNumber,
    date: t.date,
    time: t.createdAt ? new Date(t.createdAt).toLocaleTimeString() : '',
    name: t.patientName,
    age: t.age,
    gender: t.gender,
    phone: t.phone,
    symptoms: t.symptoms || '',
    doctorId: t.doctor?._id || t.doctor,
    doctorName: t.doctor?.name || '',
    paid,
    dues,
    paymentMethod: t.paymentMethod || 'cash',
    status: STATUS_TO_CLINIC[t.status] || 'waiting',
    followUpDate: t.followUpDate || null,
    followUpNote: t.followUpNote || '',
    receptionistId: isReceptionist ? t.generatedBy._id : null,
    receptionistName: isReceptionist ? t.generatedBy.name : '',
    createdAt: t.createdAt,
  };
}

export function useClinicAdmin() {
  const { user, logout, getEffectiveClinicId, clinicType } = useAuth();

  // Helper to get clinic ID
  const getClinicId = () => {
    return getEffectiveClinicId() || user?.clinicId;
  };

  // Helper to handle API errors
  const handleApiError = (error, defaultMessage) => {
    console.error(error);
    const message = error.response?.data?.message || error.message || defaultMessage;
    throw new Error(message);
  };

  return {
    session: user,
    logout,
    activePlan: user?.activePlan || 'lite',
    clinicType, // Add clinic type to return

    // ── Clinic Management ──
    refreshClinic: async () => {
      try {
        const clinicId = getClinicId();
        if (!clinicId) {
          throw new Error('No clinic ID found');
        }
        const response = await API.get(`/clinics/me`);
        return response.data;
      } catch (error) {
        return handleApiError(error, 'Failed to refresh clinic data');
      }
    },

    saveClinic: async (updates) => {
      try {
        const clinicId = getClinicId();
        if (!clinicId) {
          throw new Error('No clinic ID found');
        }
        const response = await API.put(`/clinics/${clinicId}`, updates);
        return response.data;
      } catch (error) {
        return handleApiError(error, 'Failed to save clinic data');
      }
    },

    // ── User Management ──
    getUsers: async () => {
      try {
        const clinicId = getClinicId();
        const params = clinicId ? { clinicId } : {};
        const response = await API.get('/auth/users', { params });
        return response.data;
      } catch (error) {
        return handleApiError(error, 'Failed to fetch users');
      }
    },

    addUser: async (data) => {
      try {
        const clinicId = getClinicId();
        if (!clinicId && data.role !== 'separate_doctor') {
          throw new Error('No clinic ID found');
        }
        const response = await API.post('/auth/users', {
          ...data,
          clinicId: data.clinicId || clinicId
        });
        return response.data;
      } catch (error) {
        return handleApiError(error, 'Failed to add user');
      }
    },

    updateUser: async (id, data) => {
      try {
        const clinicId = getClinicId();
        const response = await API.put(`/auth/users/${id}`, {
          ...data,
          clinicId: data.clinicId || clinicId
        });
        return response.data;
      } catch (error) {
        return handleApiError(error, 'Failed to update user');
      }
    },

    deleteUser: async (id) => {
      try {
        const clinicId = getClinicId();
        await API.delete(`/auth/users/${id}`, {
          data: { clinicId }
        });
        return true;
      } catch (error) {
        return handleApiError(error, 'Failed to delete user');
      }
    },

    updateTokenLimit: async (doctorId, limit) => {
      try {
        const response = await API.put(`/auth/users/${doctorId}`, { 
          dailyTokenLimit: limit 
        });
        return response.data;
      } catch (error) {
        return handleApiError(error, 'Failed to update token limit');
      }
    },

    // ── Patient Management ──
    getPatients: async () => {
      try {
        const clinicId = getClinicId();
        const params = clinicId ? { clinicId } : {};
        const response = await API.get('/tokens', { params });
        return (response.data.tokens || []).map(tokenToPatient);
      } catch (error) {
        return handleApiError(error, 'Failed to fetch patients');
      }
    },

    updatePatientStatus: async (id, status) => {
      try {
        const response = await API.patch(`/tokens/${id}/status`, { 
          status: STATUS_TO_TOKEN[status] || 'Waiting' 
        });
        return tokenToPatient(response.data.token);
      } catch (error) {
        return handleApiError(error, 'Failed to update patient status');
      }
    },

    updateFollowUp: async (id, followUpDate, followUpNote) => {
      try {
        const response = await API.patch(`/tokens/${id}/follow-up`, { 
          followUpDate, 
          followUpNote 
        });
        return tokenToPatient(response.data);
      } catch (error) {
        return handleApiError(error, 'Failed to update follow-up');
      }
    },

    // ── Revenue Management ──
    getRevenueReport: async (fromDate, toDate) => {
      try {
        const clinicId = getClinicId();
        if (!clinicId) {
          throw new Error('No clinic ID found');
        }
        const response = await API.get('/reports/revenue', {
          params: { 
            clinicId, 
            fromDate, 
            toDate,
            clinicType: clinicType // Include clinic type for filtering
          }
        });
        return response.data;
      } catch (error) {
        // If endpoint doesn't exist yet, return mock data
        if (error.response?.status === 404) {
          console.warn('Revenue report endpoint not implemented yet');
          return {
            totalSales: 0,
            totalProfit: 0,
            totalOrders: 0,
            pharmacists: []
          };
        }
        return handleApiError(error, 'Failed to fetch revenue report');
      }
    },

    // ── Helper to check if user is clinic admin ──
    isClinicAdmin: () => {
      return user?.role === 'admin' && clinicType === 'clinic';
    },

    // ── Helper to check if user is hospital admin ──
    isHospitalAdmin: () => {
      return user?.role === 'admin' && clinicType === 'hospital';
    },

    // ── Get clinic type ──
    getClinicType: () => {
      return clinicType;
    },

    // ── Check if feature is available based on clinic type ──
    isFeatureAvailable: (feature) => {
      const features = {
        clinic: ['patients', 'billing', 'tokens', 'staff', 'prescriptions', 'pharmacy'],
        hospital: ['patients', 'billing', 'tokens', 'staff', 'prescriptions', 'pharmacy', 'ipd', 'lab', 'inventory', 'room-settings', 'emergency']
      };
      return (features[clinicType] || []).includes(feature);
    }
  };
}