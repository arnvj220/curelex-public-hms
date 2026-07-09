import express from 'express';

import { patientAuth } from '../middleware/auth.js';
import Patient from '../models/Patient.js';
import Token from '../models/Token.js';
import User from '../models/User.js';
import Admission from '../models/Admission.js';

const router = express.Router();

// ── Helpers ──────────────────────────────────────────────────────────────
function todayStr() {
  const d   = new Date();
  const yr  = d.getFullYear();
  const mo  = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${yr}-${mo}-${day}`;
}

function genTransactionId() {
  return 'MOCKTXN-' + Date.now() + '-' + Math.floor(Math.random() * 1e6);
}

/** Same day-counting logic used on the staff IPD page — kept identical so
 * the patient never sees a different total than staff. */
function computeDays(admissionDate, dischargeDate) {
  const a    = new Date(admissionDate);
  const d    = dischargeDate ? new Date(dischargeDate) : new Date();
  const diff = Math.max(0, Math.round((d - a) / (1000 * 60 * 60 * 24)));
  return diff || 1;
}

/**
 * A patient gets a SEPARATE Patient document per clinic (clinics are
 * tenant-scoped). When the same person books at a new clinic — e.g. via
 * the unified doctor/clinic search — a brand-new Patient _id is created
 * for them at that clinic, even though it's the same real person.
 *
 * This helper finds every Patient document that represents the same
 * person as `patient` (matched by email, falling back to phone) so that
 * appointment/stat queries can include tokens from ALL their clinics,
 * not just the one tied to the originally logged-in Patient _id.
 */
async function getLinkedPatientIds(patient) {
  const orConditions = [];
  if (patient.email) orConditions.push({ email: patient.email });
  if (patient.phone) orConditions.push({ phone: patient.phone });

  if (orConditions.length === 0) {
    return [patient._id];
  }

  const linked = await Patient.find({ $or: orConditions }).select('_id');
  return linked.map((p) => p._id);
}

// ── GET /:id/dashboard ───────────────────────────────────────────────────
router.get('/:id/dashboard', patientAuth, async (req, res) => {
  try {
    let patient = await Patient.findById(req.params.id);
    if (!patient) patient = await Patient.findOne({ userId: req.params.id });
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    // Include tokens booked under any of this person's clinic-scoped
    // Patient records, not just the one they originally logged in with.
    const patientIds = await getLinkedPatientIds(patient);

    const totalAppointments = await Token.countDocuments({ patient: { $in: patientIds } });
    const upcomingAppointments = await Token.countDocuments({
      patient: { $in: patientIds },
      status: { $in: ['Waiting', 'Pending', 'Called'] },
    });

    res.json({
      success: true,
      data: {
        totalAppointments,
        upcomingAppointments,
        prescriptionsCount: 0,
        doctorsConsulted: 0,
        patientName: patient.name,
        patientEmail: patient.email,
        patientMobile: patient.mobile || patient.phone,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── GET /:id/profile ─────────────────────────────────────────────────────
router.get('/:id/profile', patientAuth, async (req, res) => {
  try {
    let patient = await Patient.findById(req.params.id);
    if (!patient) patient = await Patient.findOne({ userId: req.params.id });
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }
    res.json({ success: true, patient });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── GET /:id/appointments ────────────────────────────────────────────────
router.get('/:id/appointments', patientAuth, async (req, res) => {
  try {
    let patient = await Patient.findById(req.params.id);
    if (!patient) patient = await Patient.findOne({ userId: req.params.id });
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    // Include tokens booked under any of this person's clinic-scoped
    // Patient records (see getLinkedPatientIds) so appointments created
    // at a NEW clinic — e.g. via the unified doctor/clinic search — show
    // up here too, not just the ones tied to the original Patient _id.
    const patientIds = await getLinkedPatientIds(patient);

    const tokens = await Token.find({ patient: { $in: patientIds } })
      .populate('doctor', 'name department consultationFee telemedicineFee')
      .populate('clinicId', 'name')
      .sort({ createdAt: -1 });

    res.json({ success: true, appointments: tokens });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── GET /doctors/:clinicId ───────────────────────────────────────────────
router.get('/doctors/:clinicId', patientAuth, async (req, res) => {
  try {
    const { clinicId } = req.params;

    let query;
    if (clinicId === 'independent') {
      query = { role: 'separate_doctor', isActive: true };
    } else {
      query = { clinicId, role: 'doctor', isActive: true };
    }

    const doctors = await User.find(
      query,
      'name department consultationFee telemedicineFee'
    ).sort({ name: 1 });

    res.json({ success: true, doctors });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── POST /payments/mock ──────────────────────────────────────────────────
router.post('/payments/mock', patientAuth, async (req, res) => {
  try {
    const { doctorId, amount, method } = req.body;

    if (!doctorId || amount === undefined) {
      return res.status(400).json({ success: false, message: 'doctorId and amount are required' });
    }

    const doctor = await User.findOne({ _id: doctorId, role: 'doctor' });
    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor not found' });
    }

    const transactionId = genTransactionId();
    const paidAt = new Date();

    res.json({
      success: true,
      payment: {
        paymentStatus: 'paid',
        transactionId,
        paidAt,
        amount: Number(amount),
        method: method || 'card',
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── POST /:id/appointments ───────────────────────────────────────────────
router.post('/:id/appointments', patientAuth, async (req, res) => {
  try {
    const {
      name, age, gender, symptoms,
      clinicId,
      doctorId, consultationType,
      paymentStatus, transactionId, paidAt, method,
    } = req.body;

    let patient = await Patient.findById(req.params.id);
    if (!patient) patient = await Patient.findOne({ userId: req.params.id });
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    if (!name || !age || !gender || !symptoms || !doctorId || !consultationType || !clinicId) {
      return res.status(400).json({
        success: false,
        message: 'Name, age, gender, symptoms, clinic, doctor and consultation type are required',
      });
    }

    if (!['online', 'in-person'].includes(consultationType)) {
      return res.status(400).json({ success: false, message: 'Invalid consultation type' });
    }

    if (paymentStatus !== 'paid' || !transactionId) {
      return res.status(402).json({
        success: false,
        message: 'Payment is required before a token can be created',
      });
    }

    const doctor = await User.findOne({ _id: doctorId, clinicId, role: 'doctor' });
    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor not found for this clinic' });
    }

    const date = todayStr();

    // ✅ FIX: scope tokenNumber per clinic + doctor + date
    // This matches the unique index: { clinicId, doctor, date, tokenNumber }
    // Previously was scoped to source:'patient' only which caused collisions
    const last = await Token.findOne({ clinicId, doctor: doctorId, date })
      .sort({ tokenNumber: -1 })
      .select('tokenNumber');
    const tokenNumber = last ? last.tokenNumber + 1 : 1;

    const token = await Token.create({
      clinicId,
      tokenNumber,
      date,
      patient: patient._id,
      patientName: name,
      generatedBy: patient.userId,
      age: Number(age),
      gender,
      symptoms,
      source: 'patient',
      status: 'Pending',
      doctor: doctor._id,
      consultationType,
      consultationFee: doctor.consultationFee || 0,
      paymentStatus: 'paid',
      paymentMethod: method || 'card',
      transactionId,
      paidAt: paidAt || new Date(),
    });

    await Patient.findByIdAndUpdate(patient._id, { $addToSet: { clinicIds: clinicId } });

    await token.populate('doctor', 'name department consultationFee');

    res.status(201).json({ success: true, appointment: token });
  } catch (error) {
    // Handle race-condition duplicate key gracefully
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Token number conflict — please try again.',
      });
    }
    res.status(500).json({ success: false, message: error.message });
  }
});

router.patch('/:id/appointments/:tokenId/cancel', patientAuth, async (req, res) => {
  try {
    let patient = await Patient.findById(req.params.id);
    if (!patient) patient = await Patient.findOne({ userId: req.params.id });
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    // Same reasoning as getLinkedPatientIds elsewhere in this file: a token
    // may be booked under a different clinic-scoped Patient _id for the
    // same person, so don't scope strictly to req.params.id.
    const patientIds = await getLinkedPatientIds(patient);

    const token = await Token.findOne({ _id: req.params.tokenId, patient: { $in: patientIds } });
    if (!token) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }

    if (!['Pending', 'Waiting'].includes(token.status)) {
      return res.status(400).json({
        success: false,
        message: `This appointment is already ${token.status.toLowerCase()} and can no longer be cancelled here. Please contact the clinic.`,
      });
    }

    token.status = 'Skipped';
    await token.save();
    await token.populate('doctor', 'name department consultationFee');

    res.json({ success: true, message: 'Appointment cancelled', appointment: token });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── GET /:id/prescriptions ───────────────────────────────────────────────
router.get('/:id/prescriptions', patientAuth, async (req, res) => {
  try {
    let patient = await Patient.findById(req.params.id);
    if (!patient) patient = await Patient.findOne({ userId: req.params.id });
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }
    res.json({ success: true, prescriptions: [] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── GET /:id/admission — live, transparent view of an active admission ───
// Returns the patient's CURRENT admission (if any), with the exact same
// room/rate/medicine/billing data the clinic staff sees on the IPD page —
// computed with the identical day-counting logic, so totals always match.
router.get('/:id/admission', patientAuth, async (req, res) => {
  try {
    let patient = await Patient.findById(req.params.id);
    if (!patient) patient = await Patient.findOne({ userId: req.params.id });
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    const admission = await Admission.findOne({ patient: patient._id, status: 'Admitted' })
      .populate('doctor', 'name department')
      .populate('admittedBy', 'name')
      .sort({ admissionDate: -1 });

    if (!admission) {
      return res.json({ success: true, admitted: false, admission: null });
    }

    const days          = admission.daysAdmitted || computeDays(admission.admissionDate, admission.dischargeDate);
    const roomRent       = days * admission.roomRatePerDay;
    const medicinesTotal = admission.medicineLog.reduce((sum, m) => sum + (m.total || 0), 0);
    const grandTotal     = roomRent + medicinesTotal;

    res.json({
      success: true,
      admitted: true,
      admission: {
        _id:            admission._id,
        admissionId:    admission.admissionId,
        roomType:       admission.roomType,
        roomNumber:     admission.roomNumber,
        roomRatePerDay: admission.roomRatePerDay,
        admissionDate:  admission.admissionDate,
        days,
        roomRent,
        medicinesTotal,
        grandTotal,
        doctor:         admission.doctor,
        admittedBy:     admission.admittedBy,
        medicineLog:    admission.medicineLog,
        followupLog:    admission.followupLog,
        notes:          admission.notes,
        status:         admission.status,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── GET /:id/admissions/history — past (discharged) admissions ───────────
router.get('/:id/admissions/history', patientAuth, async (req, res) => {
  try {
    let patient = await Patient.findById(req.params.id);
    if (!patient) patient = await Patient.findOne({ userId: req.params.id });
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    const admissions = await Admission.find({ patient: patient._id, status: 'Discharged' })
      .populate('doctor', 'name department')
      .sort({ dischargeDate: -1 });

    const history = admissions.map((adm) => {
      const days          = adm.daysAdmitted || computeDays(adm.admissionDate, adm.dischargeDate);
      const roomRent       = adm.roomRent || days * adm.roomRatePerDay;
      const medicinesTotal = adm.medicineLog.reduce((sum, m) => sum + (m.total || 0), 0);
      return {
        _id:            adm._id,
        admissionId:    adm.admissionId,
        roomType:       adm.roomType,
        roomNumber:     adm.roomNumber,
        roomRatePerDay: adm.roomRatePerDay,
        admissionDate:  adm.admissionDate,
        dischargeDate:  adm.dischargeDate,
        days,
        roomRent,
        medicinesTotal,
        grandTotal: roomRent + medicinesTotal,
        doctor: adm.doctor,
      };
    });

    res.json({ success: true, admissions: history });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;