import Clinic from "../models/Clinic.js";

/**
 * Returns a Mongoose filter fragment scoping queries to the caller's clinic.
 * super_admin gets no restriction (empty object).
 */
export function getClinicFilter(user) {
  if (user?.role === 'super_admin') return {};
  return { clinicId: user.clinicId };
}

export const getClinicTypeFilter = async (req) => {
  const { user } = req;
  
  if (!user) return {};
  
  if (user.role === 'super_admin') {
    
    return {};
  }
  
  // For regular users, return their assigned clinic
  if (user.clinicId) {
    
    const clinic = await Clinic.findById(user.clinicId);
    if (clinic) {
      return { 
        clinicId: user.clinicId,
        clinicType: clinic.type 
      };
    }
  }
  
  return {};
};