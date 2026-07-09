import { fileURLToPath } from 'url';
import path from 'path';
import bcrypt from 'bcryptjs';
import express from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import mongoose from 'mongoose';
import SsoToken from '../ims/src/models/SsoToken.js';
import User from '../models/User.js';
import Clinic from '../models/Clinic.js';
import Patient from '../models/Patient.js';
import DoctorProfile from '../models/DoctorProfile.js';
import { auth } from '../middleware/auth.js';
import roleCheck from '../middleware/roleCheck.js';
import { getClinicFilter } from '../middleware/clinicFilter.js';
import Feedback from '../models/Feedback.js';
import Subscription from '../models/Subscription.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// // ── SSO Token Schema ──────────────────────────────────────────────────────
// const ssoTokenSchema = new mongoose.Schema({
//   token:     { type: String, required: true },
//   email:     { type: String, required: true },
//   userId:    { type: String, required: true },
//   role:      { type: String, default: 'staff' },
//   clinicId:  { type: String, required: true },
//   expiresAt: { type: Date,   required: true },
// }, { timestamps: false });

// const SsoToken = mongoose.models.SsoToken || mongoose.model('SsoToken', ssoTokenSchema);

router.post('/register-super-admin', async (req, res) => {
  try {
    const { name, email, password, secretKey } = req.body;

    // ── Security: Require a matching secret key ──
    if (!secretKey || secretKey !== process.env.SUPER_ADMIN_SECRET_KEY) {
      return res.status(403).json({ message: 'Unauthorized. Invalid secret key.' });
    }

    // ── Block if a super_admin already exists ──
    const existingSuperAdmin = await User.findOne({ role: 'super_admin' });
    if (existingSuperAdmin) {
      return res.status(400).json({ message: 'A super admin already exists. Use the login endpoint.' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'An account with this email already exists' });
    }

    const user = await User.create({
      name,
      email,
      password,
      role: 'super_admin',
      clinicId: null,
      permissions: [
        'dashboard', 'patients', 'ipd', 'billing', 'billing-requests',
        'prescriptions', 'pharmacy', 'lab', 'inventory',
        'room-settings', 'staff', 'telemedicine', 'tokens', 'emergency', 'tasks', 'super'
      ],
      isActive: true,
    });

    const token = jwt.sign(
      { id: user._id, role: user.role, clinicId: null },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    const { password: _, ...userOut } = user.toObject();
    res.status(201).json({
      success: true,
      message: 'Super Admin created successfully',
      token,
      user: userOut
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});
// ── Register (Staff/Clinic Admin) ──────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, clinicName, clinicId, department, phone, type } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required' });
    }

    // Admin registration: must provide clinicName to create a new clinic
    if (role === 'admin' || !role) {
      if (!clinicName) {
        return res.status(400).json({ message: 'Clinic name is required for admin registration' });
      }

      const existingClinic = await Clinic.findOne({ email });
      if (existingClinic) {
        return res.status(400).json({ message: 'An account with this email already exists' });
      }

      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ message: 'An account with this email already exists' });
      }

      const clinic = await Clinic.create({ 
        name: clinicName, 
        email, 
        phone, 
        type: type || 'hospital' 
      });

      const user = await User.create({
        name, email, password,
        role: 'admin',
        clinicId: clinic._id,
        department, phone,
        permissions: [
          'dashboard', 'patients', 'ipd', 'billing',
          'prescriptions', 'pharmacy', 'lab', 'inventory',
          'room-settings', 'staff', 'telemedicine'
        ],
      });

      const token = jwt.sign(
        { id: user._id, role: user.role, clinicId: clinic._id },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      const { password: _, ...userOut } = user.toObject();
      return res.status(201).json({ token, user: userOut });
    }

    // Non-admin staff registration: must provide clinicId to join an existing clinic (except separate_doctor)
    if (!clinicId && role !== 'separate_doctor') {
      return res.status(400).json({ message: 'clinicId is required to join an existing clinic' });
    }

    let targetClinic = null;
    if (clinicId) {
      targetClinic = await Clinic.findById(clinicId);
      if (!targetClinic) {
        return res.status(404).json({ message: 'Clinic not found' });
      }

      const existingUser = await User.findOne({ email, clinicId });
      if (existingUser) {
        return res.status(400).json({ message: 'An account with this email already exists in this clinic' });
      }
    } else {
      // For separate_doctor with no clinicId, check global email uniqueness
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ message: 'An account with this email already exists' });
      }
    }

    const ROLE_PERMISSIONS_MAP = {
      doctor:          ['dashboard', 'patients', 'ipd', 'lab', 'prescriptions', 'telemedicine'],
      separate_doctor: ['dashboard', 'patients', 'telemedicine'],
      nurse:           ['dashboard', 'patients', 'ipd'],
      receptionist:    ['dashboard', 'patients', 'billing', 'tokens'],
      pharmacist:      ['dashboard', 'pharmacy', 'inventory'],
      lab_technician:  ['dashboard', 'patients', 'lab'],
    };

    const user = await User.create({
      name, email, password, role,
      clinicId, department, phone,
      permissions: ROLE_PERMISSIONS_MAP[role] || ['dashboard'],
    });

    if (role === 'separate_doctor') {
      await DoctorProfile.create({
        userId: user._id,
        name: user.name,
        email: user.email,
        mobile: user.phone || '',
        verificationStatus: 'pending',
      });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role, clinicId },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    const { password: _, ...userOut } = user.toObject();
    return res.status(201).json({ token, user: userOut });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/register-patient', async (req, res) => {
  try {
    const { 
      name, email, password, phone,
      dob, age, gender, bloodGroup, address, city, state, pincode,
      emergencyContact, emergencyName, emergencyRelation,
      allergies, chronicConditions, currentMedications, medicalHistory, notes,
      assignedDoctor, clinicId, generateToken = true
    } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'An account with this email already exists' });
    }

    const existingPatient = await Patient.findOne({ email });
    if (existingPatient) {
      return res.status(400).json({ message: 'A patient with this email already exists' });
    }

    // ── STEP 1: Create User with role: 'patient' ──
    const user = await User.create({
      name,
      email,
      password,
      role: 'patient',
      clinicId: null, // Patients are global
      phone: phone || '',
      permissions: ['patient-dashboard'],
      isActive: true,
    });

    // ── STEP 2: Create Patient record ──
    const patientData = {
      userId: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone || phone,
      clinicIds: [], // Empty at first, populated on booking/visit
      status: 'Active',
      registrationDate: new Date(),
      registeredBy: req.user?.id || null,
    };

    if (dob) patientData.dob = new Date(dob);
    if (age) patientData.age = Number(age);
    if (gender) patientData.gender = gender;
    if (bloodGroup) patientData.bloodGroup = bloodGroup;
    if (address) patientData.address = address;
    if (city) patientData.city = city;
    if (state) patientData.state = state;
    if (pincode) patientData.pincode = pincode;
    if (emergencyContact) patientData.emergencyContact = emergencyContact;
    if (emergencyName) patientData.emergencyName = emergencyName;
    if (emergencyRelation) patientData.emergencyRelation = emergencyRelation;
    if (allergies) patientData.allergies = allergies;
    if (chronicConditions) patientData.chronicConditions = chronicConditions;
    if (currentMedications) patientData.currentMedications = currentMedications;
    if (medicalHistory) patientData.medicalHistory = medicalHistory;
    if (notes) patientData.notes = notes;
    if (assignedDoctor) patientData.assignedDoctor = assignedDoctor;
    
    if (req.body.clinicId) {
      patientData.clinicIds = [req.body.clinicId];
    }

    const patient = await Patient.create(patientData);

    // ── STEP 3: Generate token if requested ──
    let tokenData = null;
    if (generateToken && assignedDoctor) {
      try {
        const Token = mongoose.model('Token');
        const date = new Date().toISOString().split('T')[0];
        
        const last = await Token.findOne({ 
          clinicId: req.body.clinicId, 
          doctor: assignedDoctor, 
          date 
        }).sort({ tokenNumber: -1 }).select('tokenNumber');

        const tokenNumber = last ? last.tokenNumber + 1 : 1;

        tokenData = await Token.create({
          clinicId: req.body.clinicId,
          tokenNumber,
          date,
          doctor: assignedDoctor,
          patient: patient._id,
          patientName: patient.name,
          phone: patient.phone,
          email: patient.email,
          generatedBy: req.user?.id || user._id,
          source: 'staff',
          status: 'Waiting',
          consultationType: 'in-person',
        });

        await tokenData.populate('doctor', 'name department');
      } catch (tokenErr) {
        console.error('Failed to generate token:', tokenErr);
        // Don't fail the registration if token generation fails
      }
    }

    const { password: _, ...userOut } = user.toObject();
    
    let finalClinic = null;
    if (req.body.clinicId) {
      finalClinic = await Clinic.findById(req.body.clinicId);
    }

    res.status(201).json({ 
      success: true, 
      message: 'Patient registered successfully with login credentials', 
      user: userOut,
      patient: patient,
      clinic: finalClinic ? { id: finalClinic._id, name: finalClinic.name } : null,
      token: tokenData || undefined
    });

  } catch (err) {
    console.error('Patient registration error:', err);
    res.status(500).json({ message: err.message || 'Server error' });
  }
});

// ── UNIFIED LOGIN (Handles both staff and patients) ──────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    let user = null;
    let patient = null;

    // ── STEP 1: Try to find user in User table ──────────────────────────
    user = await User.findOne({ email });

    // ── STEP 2: If user exists, verify password ─────────────────────────
    if (user) {
      const isMatch = await user.matchPassword(password);
      if (!isMatch) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }
      
      // If user is patient, get patient data
      if (user.role === 'patient') {
        patient = await Patient.findOne({ userId: user._id });
        if (!patient) {
          // Auto-create missing patient record to fix inconsistent DB state
          patient = await Patient.create({
            userId: user._id,
            name: user.name,
            email: user.email,
            phone: user.phone || '',
            clinicIds: [],
            status: 'Active',
            registrationDate: new Date(),
          });
        }
      }
    } else {
      // ── STEP 3: Check if patient exists in Patient table ──────────────
      patient = await Patient.findOne({ email });
      
      if (!patient) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }

      // ── STEP 4: Check if patient already has a User account ────────────
      if (patient.userId) {
        user = await User.findById(patient.userId);
        if (user) {
          const isMatch = await user.matchPassword(password);
          if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
          }
        }
      } else {
        // ── STEP 5: Create User for patient ──────────────────────────────
        // Check if email is used by a staff account
        const staffUser = await User.findOne({ email, role: { $ne: 'patient' } });
        if (staffUser) {
          return res.status(400).json({ 
            message: 'This email is registered as a staff account' 
          });
        }

        user = await User.create({
          name: patient.name,
          email: patient.email,
          password: password,
          role: 'patient',
          clinicId: patient.clinicId,
          phone: patient.phone || '',
          permissions: ['patient-dashboard'],
          isActive: true,
        });

        patient.userId = user._id;
        await patient.save();
      }
    }

    // ── STEP 6: Validate user ────────────────────────────────────────────
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: 'Your account has been deactivated' });
    }

    // ── STEP 7: Generate token ──────────────────────────────────────────
    const token = jwt.sign(
      { id: user._id, role: user.role, clinicId: user.clinicId },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    const { password: _, ...userOut } = user.toObject();
    
    // Get patient data if not already fetched
    if (user.role === 'patient' && !patient) {
      patient = await Patient.findOne({ userId: user._id });
    }
    
    res.json({ 
      token, 
      user: userOut,
      patient: patient || undefined,

    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ── Get Profile ───────────────────────────────────────────────────────────
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });

    let clinicType = null;
    let activePlan = null;

    if (user.clinicId) {
      const clinic = await Clinic.findById(user.clinicId).select('type');
      clinicType = clinic?.type || null;

      const subscription = await Subscription.findOne({ clinicId: user.clinicId }).select('plan status');
      activePlan = subscription?.status === 'active' || subscription?.status === 'trialing'
        ? subscription.plan
        : (subscription?.plan || 'lite'); // adjust to your actual "no active plan" rule
    }
    
    let patientData = null;
    if (user.role === 'patient') {
      patientData = await Patient.findOne({ userId: user._id });
      if (!patientData) {
        // Auto-create missing patient record to fix inconsistent DB state
        patientData = await Patient.create({
          userId: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone || '',
          clinicIds: [],
          status: 'Active',
          registrationDate: new Date(),
        });
      }
    }
    
    res.json({ user, patient: patientData, clinicType, activePlan });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ── Update own profile (any authenticated user, safe fields only) ─────────
router.put('/me', auth, async (req, res) => {
  try {
    const ALLOWED_FIELDS = ['name', 'phone', 'avatar'];
    const fields = {};
    for (const key of ALLOWED_FIELDS) {
      if (req.body[key] !== undefined) fields[key] = req.body[key];
    }

    const user = await User.findByIdAndUpdate(req.user.id, fields, { new: true }).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json(user);
  } catch (err) {
    console.error('Error updating own profile:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ── List Staff (admin only) ───────────────────────────────────────────────
router.get('/users', auth, roleCheck('admin'), async (req, res) => {
  try {
    // For super_admin, if they have a clinic selected via header, filter by it
    let filter = { role: { $ne: 'patient' } };
    
    if (req.user?.role === 'super_admin') {
      const clinicId = req.headers['x-clinic-id'] || req.query.clinicId;
      if (clinicId && mongoose.Types.ObjectId.isValid(clinicId)) {
        filter.clinicId = new mongoose.Types.ObjectId(clinicId);
      } else if (clinicId) {
        // Invalid clinicId - return empty
        return res.json([]);
      }
    } else {
      // For non-super_admin, use their JWT clinicId
      if (req.user?.clinicId) {
        filter.clinicId = req.user.clinicId;
      } else {
        // No clinicId - return empty
        return res.json([]);
      }
    }
    
    const staff = await User.find(filter, '-password').sort({ createdAt: -1 });
    res.json(staff);
  } catch (err) {
    console.error('Error fetching staff:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ── Super Admin: List all users across all clinics ──
router.get('/all-users', auth, roleCheck('super_admin'), async (req, res) => {
  try {
    const filter = { role: { $ne: 'super_admin' } };
    if (req.query.clinicId) {
      filter.clinicId = req.query.clinicId;
    }
    const users = await User.find(filter, '-password').sort({ createdAt: -1 });
    res.json({ success: true, users });
  } catch (err) {
    console.error('Error fetching all users:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Create Staff (admin only) ─────────────────────────────────────────────
router.post('/users', auth, roleCheck('admin'), async (req, res) => {
  try {
    const { name, email, password, role, department, phone, permissions, consultationFee, clinicId } = req.body;

    if (!password) {
      return res.status(400).json({ message: 'Password is required' });
    }

    // ── Resolve clinicId ──
    let targetClinicId;
    if (req.user.role === 'super_admin') {
      // Super admin must provide clinicId in the body
      if (!clinicId || !mongoose.Types.ObjectId.isValid(clinicId)) {
        return res.status(400).json({ 
          message: 'Valid clinicId is required for super_admin to create staff' 
        });
      }
      targetClinicId = new mongoose.Types.ObjectId(clinicId);
    } else {
      // Regular admin uses their own clinicId
      if (!req.user.clinicId) {
        return res.status(400).json({ 
          message: 'No clinic assigned to this admin account' 
        });
      }
      targetClinicId = req.user.clinicId;
    }

    // Check if user already exists in this clinic
    const exists = await User.findOne({ email, clinicId: targetClinicId });
    if (exists) {
      return res.status(400).json({ 
        message: 'Email already registered in this clinic' 
      });
    }

    const userData = {
      name,
      email,
      password,
      role,
      department: department || '',
      phone: phone || '',
      clinicId: targetClinicId,
      permissions: permissions || ['dashboard'],
      isActive: true,
    };

    if (role === 'doctor' && consultationFee !== undefined && consultationFee !== '') {
      userData.consultationFee = Number(consultationFee);
    }

    const user = await User.create(userData);

    const { password: _, ...userOut } = user.toObject();
    res.status(201).json(userOut);
  } catch (err) {
    console.error('Error creating staff:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ── Update Staff (admin only) ─────────────────────────────────────────────
router.put('/users/:id', auth, async (req, res) => {
  try {
    const { password, ...fields } = req.body;
    delete fields.password;

    // ── Resolve clinicId ──
    let targetClinicId;
    if (req.user.role === 'super_admin') {
      const clinicId = req.body.clinicId || req.query.clinicId || req.headers['x-clinic-id'];
      if (!clinicId || !mongoose.Types.ObjectId.isValid(clinicId)) {
        return res.status(400).json({ 
          message: 'Valid clinicId is required for super_admin to update staff' 
        });
      }
      targetClinicId = new mongoose.Types.ObjectId(clinicId);
    } else {
      if (!req.user.clinicId) {
        return res.status(400).json({ 
          message: 'No clinic assigned to this admin account' 
        });
      }
      targetClinicId = req.user.clinicId;
    }

    // Find the user with clinicId scoping
    const user = await User.findOne({ _id: req.params.id, clinicId: targetClinicId });
    if (!user) {
      return res.status(404).json({ message: 'Staff member not found in this clinic' });
    }

    // Check email conflict within the same clinic
    if (fields.email && fields.email !== user.email) {
      const conflict = await User.findOne({ 
        email: fields.email, 
        clinicId: targetClinicId 
      });
      if (conflict) {
        return res.status(400).json({ message: 'Email already in use in this clinic' });
      }
    }

    if (fields.consultationFee !== undefined && fields.consultationFee !== '') {
      fields.consultationFee = Number(fields.consultationFee);
    }

    Object.assign(user, fields);
    if (password) user.password = password;

    await user.save();
    const { password: _, ...userOut } = user.toObject();
    res.json(userOut);
  } catch (err) {
    console.error('Error updating staff:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ── Delete Staff (admin only) ─────────────────────────────────────────────
router.delete('/users/:id', auth, roleCheck('admin'), async (req, res) => {
  try {
    // ── Resolve clinicId ──
    let targetClinicId;
    if (req.user.role === 'super_admin') {
      const clinicId = req.body.clinicId || req.query.clinicId || req.headers['x-clinic-id'];
      if (!clinicId || !mongoose.Types.ObjectId.isValid(clinicId)) {
        return res.status(400).json({ 
          message: 'Valid clinicId is required for super_admin to delete staff' 
        });
      }
      targetClinicId = new mongoose.Types.ObjectId(clinicId);
    } else {
      if (!req.user.clinicId) {
        return res.status(400).json({ 
          message: 'No clinic assigned to this admin account' 
        });
      }
      targetClinicId = req.user.clinicId;
    }

    const user = await User.findOneAndDelete({ 
      _id: req.params.id, 
      clinicId: targetClinicId 
    });
    
    if (!user) {
      return res.status(404).json({ message: 'Staff member not found in this clinic' });
    }
    res.json({ message: 'Staff member removed' });
  } catch (err) {
    console.error('Error deleting staff:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ── Generate SSO Token for IMS ────────────────────────────────────────────
router.post('/sso-token', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (!user.isActive) return res.status(403).json({ message: 'Account is inactive' });

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 1000);

    await SsoToken.create({
      token,
      email: user.email,
      userId: String(user._id),
      role: user.role,
      clinicId: user.clinicId ? String(user.clinicId) : 'super_admin',
      expiresAt,
    });

    res.status(201).json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ── Change Password ───────────────────────────────────────────────────────
router.put('/change-password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/available-doctors', auth, async (req, res) => {
  try {
    const doctors = await User.find(
      { role: { $in: ['doctor', 'separate_doctor'] }, isActive: true },
      'name department consultationFee telemedicineFee phone email avatar bankDetails'
    ).sort({ name: 1 }).lean();

    // ── Only show doctors who have completed telemedicine setup ──
    const setupCompleteDoctors = doctors.filter(doc => {
      const hasFee = Number(doc.telemedicineFee) > 0;
      const hasBankDetails = Boolean(
        doc.bankDetails?.accountHolderName &&
        doc.bankDetails?.accountNumber &&
        doc.bankDetails?.bankName &&
        doc.bankDetails?.ifscCode
      );
      return hasFee && hasBankDetails;
    });

    // ── Merge in DoctorProfile.photoUrl and Feedback ratings ──
    const doctorIds = setupCompleteDoctors.map(d => d._id);
    const profiles = await DoctorProfile.find(
      { userId: { $in: doctorIds } },
      'userId photoUrl specialization'
    ).lean();

    const profileMap = new Map(profiles.map(p => [String(p.userId), p]));
    const Feedback = mongoose.model('Feedback');

    const enrichedDoctors = [];
    for (let doc of setupCompleteDoctors) {
      const profile = profileMap.get(String(doc._id));
      
      const stats = await Feedback.aggregate([
        { $match: { doctorId: doc._id } },
        { $group: { _id: "$doctorId", averageRating: { $avg: "$doctorRating" }, totalRatings: { $sum: 1 } } }
      ]);
      
      let averageRating = 0;
      let totalRatings = 0;
      if (stats.length > 0) {
        averageRating = Number(stats[0].averageRating.toFixed(1));
        totalRatings = stats[0].totalRatings;
      }
      
      enrichedDoctors.push({
        ...doc,
        photoUrl: profile?.photoUrl || doc.avatar || '',
        specialization: profile?.specialization || '',
        averageRating,
        totalRatings
      });
    }

    res.json({ success: true, doctors: enrichedDoctors });
  } catch (err) {
    console.error('Error fetching available doctors:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Doctor profile routes ────────────────────────────────────────────────
router.get('/doctors/:id', auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user || user.role !== 'separate_doctor') {
      return res.status(404).json({ success: false, message: 'Doctor not found' });
    }

    const profile = await DoctorProfile.findOne({ userId: user._id }) || await DoctorProfile.create({
      userId: user._id,
      name: user.name,
      email: user.email,
      mobile: user.phone || '',
      verificationStatus: 'pending',
      isActive: false,
    });

    res.json({ success: true, doctor: { ...user.toObject(), ...profile.toObject() } });
  } catch (err) {
    console.error('Get doctor profile error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/doctors/:id/status', auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user || user.role !== 'separate_doctor') {
      return res.status(404).json({ success: false, message: 'Doctor status not found' });
    }

    const profile = await DoctorProfile.findOne({ userId: user._id });
    res.json({
      success: true,
      doctor: {
        id: user._id,
        name: user.name,
        email: user.email,
        isActive: profile?.isActive === true,
        verificationStatus: profile?.verificationStatus || 'pending',
      },
    });
  } catch (err) {
    console.error('Get doctor status error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.patch('/doctors/:id/active', auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user || user.role !== 'separate_doctor') {
      return res.status(404).json({ success: false, message: 'Doctor status not found' });
    }

    const isActive = Boolean(req.body?.isActive);
    const profile = await DoctorProfile.findOneAndUpdate(
      { userId: user._id },
      { $set: { isActive } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    user.isActive = isActive;
    await user.save();

    res.json({
      success: true,
      isActive,
      doctor: {
        id: user._id,
        name: user.name,
        isActive,
        verificationStatus: profile?.verificationStatus || 'pending',
      },
    });
  } catch (err) {
    console.error('Update doctor active status error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.put('/doctors/:id', auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user || user.role !== 'separate_doctor') {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    const profile = await DoctorProfile.findOneAndUpdate(
      { userId: user._id },
      {
        $set: {
          name: req.body.name || user.name,
          email: req.body.email || user.email,
          mobile: req.body.mobile || user.phone || '',
          specialization: req.body.specialization || '',
          qualification: req.body.qualification || '',
          experience: req.body.experience ? Number(req.body.experience) : 0,
          licenseNumber: req.body.licenseNumber || '',
          currentInstitute: req.body.hospital || req.body.currentInstitute || '',
          address: req.body.address || '',
          consultationFee: req.body.consultationFee ? Number(req.body.consultationFee) : 0,
          bio: req.body.bio || '',
          photoUrl: req.body.photoUrl || '',
        },
      },
      { new: true, upsert: true }
    );

    if (req.body.name) user.name = req.body.name;
    if (req.body.email) user.email = req.body.email;
    if (req.body.mobile) user.phone = req.body.mobile;
    if (req.body.consultationFee !== undefined) user.consultationFee = Number(req.body.consultationFee);
    await user.save();

    res.json({ success: true, doctor: { ...user.toObject(), ...profile.toObject() } });
  } catch (err) {
    console.error('Update doctor profile error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/doctor-profiles/pending', auth, roleCheck('super_admin'), async (req, res) => {
  try {
    const profiles = await DoctorProfile.find({ verificationStatus: 'pending' })
      .populate('userId', 'name email phone role isActive clinicId')
      .sort({ createdAt: -1 });
    res.json({ success: true, profiles });
  } catch (err) {
    console.error('List pending doctor profiles error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.patch('/doctor-profiles/:id/approve', auth, roleCheck('super_admin'), async (req, res) => {
  try {
    const profile = await DoctorProfile.findById(req.params.id).populate('userId', 'name email');
    if (!profile) return res.status(404).json({ message: 'Doctor profile not found' });

    profile.verificationStatus = 'approved';
    profile.reviewedBy = req.user.id;
    profile.reviewedAt = new Date();
    profile.rejectionReason = '';
    profile.isActive = true;
    await profile.save();

    const user = await User.findById(profile.userId._id);
    if (user) {
      user.isActive = true;
      user.verificationStatus = 'approved';
      await user.save();
    }

    res.json({ success: true, profile });
  } catch (err) {
    console.error('Approve doctor profile error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.patch('/doctor-profiles/:id/reject', auth, roleCheck('super_admin'), async (req, res) => {
  try {
    const { reason } = req.body;
    const profile = await DoctorProfile.findById(req.params.id);
    if (!profile) return res.status(404).json({ message: 'Doctor profile not found' });

    profile.verificationStatus = 'rejected';
    profile.reviewedBy = req.user.id;
    profile.reviewedAt = new Date();
    profile.rejectionReason = reason || 'No reason provided';
    profile.isActive = false;
    await profile.save();

    const user = await User.findById(profile.userId);
    if (user) {
      user.isActive = false;
      user.verificationStatus = 'rejected';
      await user.save();
    }

    res.json({ success: true, profile });
  } catch (err) {
    console.error('Reject doctor profile error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ── Super Admin: List all clinics ─────────────────────────────────────────
router.get('/clinics', auth, roleCheck('super_admin'), async (req, res) => {
  try {
    const clinics = await Clinic.find().sort({ createdAt: -1 });
    res.json({ success: true, clinics });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Super Admin: Create a clinic ──────────────────────────────────────────
router.post('/clinics', auth, roleCheck('super_admin'), async (req, res) => {
  try {
    const { name, email, phone, type } = req.body;
    if (!name || !email) return res.status(400).json({ message: 'Name and email are required' });
    const existing = await Clinic.findOne({ email });
    if (existing) return res.status(400).json({ message: 'A clinic with this email already exists' });
    const clinic = await Clinic.create({ name, email, phone, type: type || 'hospital' });
    res.status(201).json({ success: true, clinic });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Super Admin: Update a clinic ──────────────────────────────────────────
router.put('/clinics/:id', auth, roleCheck('super_admin'), async (req, res) => {
  try {
    const clinic = await Clinic.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!clinic) return res.status(404).json({ message: 'Clinic not found' });
    res.json({ success: true, clinic });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Super Admin: List all users across all clinics ────────────────────────
// Optional ?clinicId= query param to filter by a specific clinic
router.get('/all-users', auth, roleCheck('super_admin'), async (req, res) => {
  try {
    const filter = { role: { $ne: 'patient' } };
    if (req.query.clinicId) filter.clinicId = req.query.clinicId;
    const users = await User.find(filter, '-password').sort({ createdAt: -1 });
    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Super Admin: Toggle any user's active status ──────────────────────────
router.patch('/users/:id/toggle-active', auth, roleCheck('super_admin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.isActive = !user.isActive;
    await user.save();
    res.json({ success: true, isActive: user.isActive });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/sso-exchange', async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ message: 'SSO token required' });

    // Atomic findOneAndDelete — expired or already-used tokens return null
    const record = await SsoToken.findOneAndDelete({
      token,
      expiresAt: { $gt: new Date() },
    });

    if (!record) {
      return res.status(401).json({ message: 'Invalid or expired SSO token' });
    }

    // Find existing user by email
    let user = await User.findOne({ email: record.email });

    if (!user) {
      // First-time IMS access — auto-provision an HMS account
      const role     = record.role === 'admin' ? 'admin' : 'receptionist';
      const clinicId = record.clinicId !== 'super_admin' ? record.clinicId : null;
      user = await User.create({
        name:        record.email.split('@')[0],
        email:       record.email,
        password:    crypto.randomBytes(16).toString('hex'),
        role,
        clinicId,
        permissions: ['dashboard'],
        isActive:    true,
      });
    }

    // Patch missing clinicId onto existing user
    if (record.clinicId && record.clinicId !== 'super_admin' && !user.clinicId) {
      user.clinicId = record.clinicId;
      await user.save();
    }

    const jwtToken = jwt.sign(
      { id: user._id, role: user.role, clinicId: user.clinicId || null },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    const { password: _, ...userOut } = user.toObject();
    res.json({ token: jwtToken, user: userOut });

  } catch (err) {
    console.error('SSO exchange error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ── GOOGLE LOGIN ──────────────────────────────────────────────────────────
router.post('/google-login', async (req, res) => {
  try {
    const { token, email: bodyEmail, name: bodyName, isPatient } = req.body;
    let email = bodyEmail;
    let name = bodyName;

    // Verify Google token if provided
    if (token) {
      try {
        const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${token}`);
        if (response.ok) {
          const payload = await response.json();
          email = payload.email;
          name = payload.name || payload.given_name;
        }
      } catch (err) {
        console.error('Google API fetch error:', err);
      }
    }

    if (!email) {
      return res.status(400).json({ success: false, message: 'Google authentication failed: missing email' });
    }

    let user = await User.findOne({ email });
    let patient = null;

    if (user) {
      if (!user.isActive) {
        return res.status(403).json({ success: false, message: 'Your account has been deactivated' });
      }
      if (user.role === 'patient') {
        patient = await Patient.findOne({ userId: user._id });
      }
    } else {
      if (isPatient) {
        user = await User.create({
          name: name || 'Google Patient',
          email,
          password: crypto.randomBytes(16).toString('hex'),
          role: 'patient',
          permissions: ['patient-dashboard'],
          phone: req.body.phone || '0000000000',
          isActive: true
        });
        patient = await Patient.create({
          userId: user._id,
          name: user.name,
          email: user.email,
          phone: req.body.phone || '0000000000',
          clinicIds: [],
          status: 'Active',
          registrationDate: new Date()
        });
      } else {
        return res.status(404).json({
          success: false,
          message: 'No staff account found with this email. Please contact your clinic administrator to register.'
        });
      }
    }

    const jwtToken = jwt.sign(
      { id: user._id, role: user.role, clinicId: user.clinicId || null },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    const { password: _p, ...userOut } = user.toObject();
    res.json({ token: jwtToken, user: userOut, patient: patient || undefined });
  } catch (err) {
    console.error('Google Login error:', err);
    res.status(500).json({ success: false, message: 'Server error during Google Login' });
  }
});

// ── FORGOT PASSWORD ───────────────────────────────────────────────────────
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: 'No account found with this email address' });
    }

    const token = crypto.randomBytes(20).toString('hex');
    user.resetPasswordToken   = token;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    // Build reset link dynamically from referer/origin header
    const origin = req.headers.referer || req.headers.origin || 'http://localhost:5174';
    let baseOrigin = 'http://localhost:5174';
    try { baseOrigin = new URL(origin).origin; } catch (e) {}
    const resetLink = `${baseOrigin}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;

    // Send real email if SMTP is configured, otherwise log link
    try {
      const { sendEmail } = await import('../utils/sendEmail.js');
      await sendEmail({
        to: email,
        subject: 'Reset your password – CURELEX HMS',
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:auto">
            <h2>Password Reset Request</h2>
            <p>You requested to reset your password. Click the button below:</p>
            <a href="${resetLink}" style="display:inline-block;padding:12px 24px;background:#0f4c81;color:#fff;border-radius:8px;text-decoration:none;font-weight:bold;">Reset Password</a>
            <p style="margin-top:16px;color:#64748b;font-size:13px;">This link expires in 1 hour. If you did not request this, ignore this email.</p>
          </div>
        `
      });
    } catch (_) {
      console.log(`\n==================================================\nPASSWORD RESET LINK (no SMTP configured):\n${resetLink}\n==================================================\n`);
    }

    res.json({
      success: true,
      message: 'Password reset link sent. Check your email or the server console.',
      resetLink // also returned for local dev convenience
    });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── RESET PASSWORD ────────────────────────────────────────────────────────
router.post('/reset-password', async (req, res) => {
  try {
    const { email, token, newPassword } = req.body;
    if (!email || !token || !newPassword) {
      return res.status(400).json({ success: false, message: 'Email, token, and new password are required' });
    }

    const user = await User.findOne({
      email,
      resetPasswordToken:   token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Password reset token is invalid or has expired' });
    }

    user.password             = newPassword;
    user.resetPasswordToken   = null;
    user.resetPasswordExpires = null;
    await user.save();

    res.json({ success: true, message: 'Password reset successful! You can now log in.' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;