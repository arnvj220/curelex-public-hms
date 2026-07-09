// hms-backend/routes/tokens.js
import express from 'express';
import mongoose from 'mongoose';
const router = express.Router();
import { auth } from '../middleware/auth.js';
import { getClinicFilter } from '../middleware/clinicFilter.js';
import Token from '../models/Token.js';
import User from '../models/User.js';
import Patient from '../models/Patient.js';
import FollowUp from '../models/FollowUp.js';

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Returns today's date as "YYYY-MM-DD" in local time (IST-safe). */
function todayStr() {
  const d = new Date();
  const yr = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${yr}-${mo}-${day}`;
}

/**
 * Resolves clinicId from (in priority order):
 *  1. req.body.clinicId   — POST/PUT requests pass it in the body
 *  2. req.query.clinicId  — GET/DELETE requests pass it as a query param
 *  3. req.user.clinicId   — set by the auth middleware from the JWT
 *  4. null                — if no clinic found, return null (caller handles)
 */
function resolveClinicId(req) {
  const id = req.body?.clinicId || req.query?.clinicId || req.user?.clinicId || null;

  // For super_admin, they might have a session-stored clinic in the header
  if (req.user?.role === 'super_admin') {
    const headerId = req.headers['x-clinic-id'];
    if (headerId) return headerId;
  }

  return id;
}

/**
 * Creates a real Patient document from token-booking data.
 */
async function createPatientFromToken({ clinicId, doctorId, name, phone, email, age, gender, registeredBy }) {
  if (!mongoose.Types.ObjectId.isValid(clinicId)) {
    const err = new Error(
      'A valid clinicId (Clinic ObjectId) is required to register a patient record for this token'
    );
    err.status = 400;
    throw err;
  }

  // Check if patient already exists (globally by email or phone)
  let existing = null;
  if (email) existing = await Patient.findOne({ email });
  if (!existing && phone) existing = await Patient.findOne({ phone });
  
  if (existing) {
    if (clinicId && !existing.clinicIds.includes(clinicId)) {
      existing.clinicIds.push(clinicId);
      await existing.save();
    }
    return existing;
  }

  const patient = await Patient.create({
    name: name || 'Walk-in',
    phone,
    email,
    age: age ?? null,
    gender: gender || null,
    clinicIds: clinicId ? [clinicId] : [],
    assignedDoctor: doctorId || null,
    registeredBy: registeredBy || null,
    status: 'Active',
  });

  return patient;
}

// ── POST /api/tokens/generate ────────────────────────────────────────────────
router.post('/generate', auth, async (req, res) => {
  try {
    const clinicId = resolveClinicId(req);

    // If no clinicId and user is not super_admin, use their clinicId
    let effectiveClinicId = clinicId;
    if (!effectiveClinicId && req.user.role !== 'super_admin') {
      effectiveClinicId = req.user.clinicId;
    }

    if (!effectiveClinicId) {
      return res.status(400).json({ message: 'Clinic ID is required. Please select a clinic.' });
    }

    const {
      doctorId,
      patientId,
      patientName,
      phone,
      email,
      age,
      gender,
      symptoms,
      consultationType,
      paymentMethod,
    } = req.body;

    if (!doctorId) return res.status(400).json({ message: 'doctorId is required' });

    const date = todayStr();

    const doctor = await User.findById(doctorId).select('consultationFee telemedicineFee name department clinicId');
    if (!doctor) return res.status(404).json({ message: 'Doctor not found' });

    // Verify doctor belongs to the same clinic
    if (doctor.clinicId && String(doctor.clinicId) !== String(effectiveClinicId)) {
      return res.status(400).json({ message: 'Doctor does not belong to this clinic' });
    }

    let patientDoc = null;

    if (patientId) {
      patientDoc = await Patient.findById(patientId);
      if (!patientDoc) {
        return res.status(404).json({ message: 'Patient not found' });
      }

      // Append clinicId if not present
      if (effectiveClinicId && !patientDoc.clinicIds.includes(effectiveClinicId)) {
        patientDoc.clinicIds.push(effectiveClinicId);
        await patientDoc.save();
      }
    } else {
      // Try to find existing patient by email/phone globally
      if (email) {
        patientDoc = await Patient.findOne({ email });
      }
      if (!patientDoc && phone) {
        patientDoc = await Patient.findOne({ phone });
      }

      if (patientDoc) {
        // Append clinicId if not present
        if (effectiveClinicId && !patientDoc.clinicIds.includes(effectiveClinicId)) {
          patientDoc.clinicIds.push(effectiveClinicId);
          await patientDoc.save();
        }
      } else {
        // Create new patient if we have enough info
        if (!phone || !email) {
          // For walk-ins, we can create with just name and phone
          if (!phone) {
            return res.status(400).json({
              message: 'Phone number is required to register a new patient',
            });
          }
        }
        try {
          patientDoc = await createPatientFromToken({
            clinicId: effectiveClinicId,
            doctorId,
            name: patientName || 'Walk-in',
            phone: phone || '',
            email: email || `walkin_${Date.now()}@temp.com`,
            age,
            gender,
            registeredBy: req.user.id,
          });
        } catch (err) {
          return res.status(err.status || 500).json({ message: err.message });
        }
      }
    }

    // Get today's tokens for this clinic and doctor
    const last = await Token.findOne({
      clinicId: effectiveClinicId,
      doctor: doctorId,
      date
    }).sort({ tokenNumber: -1 }).select('tokenNumber');

    const tokenNumber = last ? last.tokenNumber + 1 : 1;

    const isPatientBooking = req.user?.role === 'patient';

    const token = await Token.create({
      clinicId: effectiveClinicId,
      tokenNumber,
      date,
      doctor: doctorId,
      patient: patientDoc._id,
      patientName: patientDoc.name,
      phone: patientDoc.phone,
      email: patientDoc.email,
      generatedBy: req.user.id,

      source: isPatientBooking ? 'patient' : 'staff',
      status: isPatientBooking ? 'Pending' : 'Waiting',

      age: age || patientDoc.age || undefined,
      gender: gender || patientDoc.gender || undefined,
      symptoms: symptoms || undefined,

      consultationType: consultationType || 'in-person',
      consultationFee: consultationType === 'online' ? (doctor.telemedicineFee || 0) : (doctor.consultationFee || 0),

      paymentMethod: paymentMethod || null,
      paymentStatus: 'pending',
    });

    await token.populate([
      { path: 'doctor', select: 'name department consultationFee telemedicineFee' },
      { path: 'generatedBy', select: 'name role' },
      { path: 'patient', select: 'name patientId' },
    ]);

    res.status(201).json(token);
  } catch (err) {
    console.error('Token generate error:', err);
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/tokens/today ────────────────────────────────────────────────────
router.get('/today', auth, async (req, res) => {
  try {
    const clinicId = resolveClinicId(req);

    // For non-super_admin, always use their clinicId from JWT
    let effectiveClinicId = clinicId;
    if (req.user.role !== 'super_admin') {
      effectiveClinicId = req.user.clinicId;
    }

    if (!effectiveClinicId) {
      return res.json({ date: todayStr(), tokens: [] });
    }

    const { doctorId } = req.query;
    const date = todayStr();
    const query = { clinicId: effectiveClinicId, date };

    // If user is a doctor, only show their tokens
    if (req.user.role === 'doctor') {
      query.doctor = req.user.id;
    } else if (doctorId) {
      query.doctor = doctorId;
    }

    const tokens = await Token.find(query)
      .populate('doctor', 'name department')
      .populate('patient', 'name patientId')
      .populate('generatedBy', 'name role')
      .sort({ tokenNumber: 1 });

    res.json({ date, tokens });
  } catch (err) {
    console.error('Error fetching today tokens:', err);
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/tokens/summary ──────────────────────────────────────────────────
router.get('/summary', auth, async (req, res) => {
  try {
    const clinicId = resolveClinicId(req);

    // For non-super_admin, always use their clinicId from JWT
    let effectiveClinicId = clinicId;
    if (req.user.role !== 'super_admin') {
      effectiveClinicId = req.user.clinicId;
    }

    if (!effectiveClinicId) {
      return res.json({ date: todayStr(), summary: [] });
    }

    const date = todayStr();

    const summary = await Token.aggregate([
      { $match: { clinicId: effectiveClinicId, date } },
      {
        $group: {
          _id: '$doctor',
          total: { $sum: 1 },
          waiting: { $sum: { $cond: [{ $eq: ['$status', 'Waiting'] }, 1, 0] } },
          called: { $sum: { $cond: [{ $eq: ['$status', 'Called'] }, 1, 0] } },
          done: { $sum: { $cond: [{ $eq: ['$status', 'Done'] }, 1, 0] } },
          skipped: { $sum: { $cond: [{ $eq: ['$status', 'Skipped'] }, 1, 0] } },
          pending: { $sum: { $cond: [{ $eq: ['$status', 'Pending'] }, 1, 0] } },
          lastToken: { $max: '$tokenNumber' },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'doctor',
        },
      },
      { $unwind: { path: '$doctor', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          doctorId: '$_id',
          doctorName: { $ifNull: ['$doctor.name', 'Unknown'] },
          department: { $ifNull: ['$doctor.department', ''] },
          total: 1,
          waiting: 1,
          called: 1,
          done: 1,
          skipped: 1,
          pending: 1,
          lastToken: 1,
        },
      },
      { $sort: { doctorName: 1 } },
    ]);

    res.json({ date, summary });
  } catch (err) {
    console.error('Error fetching token summary:', err);
    res.status(500).json({ message: err.message });
  }
});

// ── PATCH /api/tokens/:id/status ────────────────────────────────────────────
router.patch('/:id/status', auth, async (req, res) => {
  try {
    const clinicId = resolveClinicId(req);

    let effectiveClinicId = clinicId;
    if (req.user.role !== 'super_admin') {
      effectiveClinicId = req.user.clinicId;
    }

    if (!effectiveClinicId) {
      return res.status(400).json({ message: 'No clinic selected' });
    }

    const { status } = req.body;
    const valid = ['Waiting', 'Called', 'Done', 'Skipped', 'Pending'];
    if (!valid.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    // Find token and verify it belongs to the clinic
    const token = await Token.findOne({ _id: req.params.id, clinicId: effectiveClinicId });
    if (!token) {
      return res.status(404).json({ message: 'Token not found in this clinic' });
    }

    // Check permissions
    const isDoctor = req.user.role === 'doctor' && String(token.doctor) === req.user.id;
    const isGenerator = String(token.generatedBy) === req.user.id;
    const isAdmin = req.user.role === 'admin' || req.user.role === 'super_admin';

    if (!isAdmin && !isDoctor && !isGenerator) {
      return res.status(403).json({ message: 'Not authorized to update this token' });
    }

    const update = { status };
    if (status === 'Called') {
      update.calledAt = new Date();
    }
    if (status === 'Done') {
      update.completedAt = new Date();
    }

    const updatedToken = await Token.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true }
    )
      .populate('doctor', 'name department')
      .populate('patient', 'name patientId')
      .populate('generatedBy', 'name role');

    res.json({ message: 'Token status updated', token: updatedToken });
  } catch (err) {
    console.error('Error updating token status:', err);
    res.status(500).json({ message: err.message });
  }
});

// ── PATCH /api/tokens/:id/payment ────────────────────────────────────────────
router.patch('/:id/payment', auth, async (req, res) => {
  try {
    const clinicId = resolveClinicId(req);

    let effectiveClinicId = clinicId;
    if (req.user.role !== 'super_admin') {
      effectiveClinicId = req.user.clinicId;
    }

    if (!effectiveClinicId) {
      return res.status(400).json({ message: 'No clinic selected' });
    }

    const { paymentStatus } = req.body;
    const validStatuses = ['paid', 'pending', 'failed'];
    if (!validStatuses.includes(paymentStatus)) {
      return res.status(400).json({ message: 'Invalid paymentStatus. Must be paid, pending, or failed.' });
    }

    // Find token and verify it belongs to this clinic
    const token = await Token.findOne({ _id: req.params.id, clinicId: effectiveClinicId });
    if (!token) {
      return res.status(404).json({ message: 'Token not found in this clinic' });
    }

    // Only admin, receptionist, or the generating doctor can update payment
    const isAdmin = ['admin', 'super_admin', 'receptionist'].includes(req.user.role);
    const isDoctor = req.user.role === 'doctor' && String(token.doctor) === req.user.id;
    if (!isAdmin && !isDoctor) {
      return res.status(403).json({ message: 'Not authorized to update payment status' });
    }

    const updatedToken = await Token.findByIdAndUpdate(
      req.params.id,
      { paymentStatus },
      { new: true }
    )
      .populate('doctor', 'name department')
      .populate('patient', 'name patientId')
      .populate('generatedBy', 'name role');

    res.json({ message: 'Payment status updated', token: updatedToken });
  } catch (err) {
    console.error('Error updating payment status:', err);
    res.status(500).json({ message: err.message });
  }
});

// ── PATCH /api/tokens/:id/link-patient ──────────────────────────────────────
router.patch('/:id/link-patient', auth, async (req, res) => {
  try {
    const clinicId = resolveClinicId(req);

    let effectiveClinicId = clinicId;
    if (req.user.role !== 'super_admin') {
      effectiveClinicId = req.user.clinicId;
    }

    if (!effectiveClinicId) {
      return res.status(400).json({ message: 'No clinic selected' });
    }

    const { phone, email, name, age, gender } = req.body;

    if (!phone || !email) {
      return res.status(400).json({ message: 'phone and email are required' });
    }

    const token = await Token.findOne({ _id: req.params.id, clinicId: effectiveClinicId });
    if (!token) {
      return res.status(404).json({ message: 'Token not found in this clinic' });
    }

    if (token.patient) {
      return res.status(400).json({ message: 'This token is already linked to a patient' });
    }

    let patient;
    try {
      patient = await createPatientFromToken({
        clinicId: effectiveClinicId,
        doctorId: token.doctor,
        name: name || token.patientName || 'Walk-in',
        phone,
        email,
        age: age ?? token.age,
        gender: gender ?? token.gender,
        registeredBy: req.user.id,
      });
    } catch (err) {
      return res.status(err.status || 500).json({ message: err.message });
    }

    token.patient = patient._id;
    token.patientName = patient.name;
    token.phone = patient.phone;
    token.email = patient.email;
    await token.save();

    await token.populate([
      { path: 'doctor', select: 'name department' },
      { path: 'patient', select: 'name patientId' },
    ]);

    res.json({ message: 'Patient linked successfully', token });
  } catch (err) {
    console.error('Error linking patient:', err);
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/tokens/mine ─────────────────────────────────────────────────────
router.get('/mine', auth, async (req, res) => {
  try {
    if (req.user?.role !== 'patient') {
      return res.status(403).json({ message: 'Only patients can view their own tokens' });
    }

    const tokens = await Token.find({ generatedBy: req.user.id, source: 'patient' })
      .populate('doctor', 'name department consultationFee')
      .sort({ createdAt: -1 });

    res.json({ success: true, tokens });
  } catch (err) {
    console.error('Error fetching patient tokens:', err);
    res.status(500).json({ message: err.message });
  }
});

// ── POST /api/tokens/statuses ──────────────────────────────────────────────
router.post('/statuses', auth, async (req, res) => {
  try {
    const clinicId = resolveClinicId(req);

    let effectiveClinicId = clinicId;
    if (req.user.role !== 'super_admin') {
      effectiveClinicId = req.user.clinicId;
    }

    if (!effectiveClinicId) {
      return res.json({ success: true, tokens: [] });
    }

    const { patientIds } = req.body;

    if (!patientIds || !Array.isArray(patientIds) || patientIds.length === 0) {
      return res.json({ success: true, tokens: [] });
    }

    const validIds = patientIds.filter(id => mongoose.Types.ObjectId.isValid(id));

    if (validIds.length === 0) {
      return res.json({ success: true, tokens: [] });
    }

    const tokens = await Token.aggregate([
      {
        $match: {
          clinicId: new mongoose.Types.ObjectId(effectiveClinicId),
          patient: { $in: validIds.map(id => new mongoose.Types.ObjectId(id)) }
        }
      },
      {
        $sort: { createdAt: -1 }
      },
      {
        $group: {
          _id: '$patient',
          token: { $first: '$$ROOT' }
        }
      },
      {
        $replaceRoot: { newRoot: '$token' }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'doctor',
          foreignField: '_id',
          as: 'doctor'
        }
      },
      {
        $unwind: {
          path: '$doctor',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          patient: 1,
          patientName: 1,
          tokenNumber: 1,
          status: 1,
          paymentStatus: 1,
          consultationType: 1,
          consultationFee: 1,
          createdAt: 1,
          updatedAt: 1,
          'doctor._id': 1,
          'doctor.name': 1,
          'doctor.department': 1,
          'doctor.consultationFee': 1
        }
      }
    ]);

    res.json({ success: true, tokens });
  } catch (err) {
    console.error('Error fetching token statuses:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/tokens/patient/:patientId/latest ──────────────────────────────
router.get('/patient/:patientId/latest', auth, async (req, res) => {
  try {
    const { patientId } = req.params;
    const clinicId = resolveClinicId(req);

    let effectiveClinicId = clinicId;
    if (req.user.role !== 'super_admin') {
      effectiveClinicId = req.user.clinicId;
    }

    if (!effectiveClinicId) {
      return res.json({ success: true, token: null });
    }

    if (!mongoose.Types.ObjectId.isValid(patientId)) {
      return res.status(400).json({ success: false, message: 'Invalid patient ID' });
    }

    const token = await Token.findOne({
      clinicId: effectiveClinicId,
      patient: patientId
    })
      .sort({ createdAt: -1 })
      .populate('doctor', 'name department consultationFee')
      .populate('patient', 'name patientId');

    res.json({ success: true, token });
  } catch (err) {
    console.error('Error fetching latest token:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/tokens/patient/:patientId/all ──────────────────────────────────
router.get('/patient/:patientId/all', auth, async (req, res) => {
  try {
    const { patientId } = req.params;
    const clinicId = resolveClinicId(req);

    let effectiveClinicId = clinicId;
    if (req.user.role !== 'super_admin') {
      effectiveClinicId = req.user.clinicId;
    }

    if (!effectiveClinicId) {
      return res.json({ success: true, tokens: [] });
    }

    if (!mongoose.Types.ObjectId.isValid(patientId)) {
      return res.status(400).json({ success: false, message: 'Invalid patient ID' });
    }

    const tokens = await Token.find({
      clinicId: effectiveClinicId,
      patient: patientId
    })
      .sort({ createdAt: -1 })
      .populate('doctor', 'name department consultationFee')
      .populate('patient', 'name patientId');

    res.json({ success: true, tokens });
  } catch (err) {
    console.error('Error fetching patient tokens:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/tokens/stats ──────────────────────────────────────────────────
router.get('/stats', auth, async (req, res) => {
  try {
    const clinicId = resolveClinicId(req);

    let effectiveClinicId = clinicId;
    if (req.user.role !== 'super_admin') {
      effectiveClinicId = req.user.clinicId;
    }

    if (!effectiveClinicId) {
      return res.json({
        success: true,
        stats: { totalToday: 0, pending: 0, waiting: 0, called: 0, done: 0, skipped: 0 }
      });
    }

    const date = todayStr();

    const [totalToday, pending, waiting, called, done, skipped] = await Promise.all([
      Token.countDocuments({ clinicId: effectiveClinicId, date }),
      Token.countDocuments({ clinicId: effectiveClinicId, date, status: 'Pending' }),
      Token.countDocuments({ clinicId: effectiveClinicId, date, status: 'Waiting' }),
      Token.countDocuments({ clinicId: effectiveClinicId, date, status: 'Called' }),
      Token.countDocuments({ clinicId: effectiveClinicId, date, status: 'Done' }),
      Token.countDocuments({ clinicId: effectiveClinicId, date, status: 'Skipped' }),
    ]);

    res.json({
      success: true,
      stats: {
        totalToday,
        pending,
        waiting,
        called,
        done,
        skipped,
      }
    });
  } catch (err) {
    console.error('Error fetching token stats:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/tokens ──────────────────────────────────────────────────────
// Purely additive — lists all tokens for the clinic (not just today's).
// Does not modify any existing route or query shape.
router.get('/', auth, async (req, res) => {
  try {
    const clinicId = resolveClinicId(req);
    let effectiveClinicId = clinicId;
    if (req.user.role !== 'super_admin') {
      effectiveClinicId = req.user.clinicId;
    }
    if (!effectiveClinicId) return res.json({ tokens: [] });

    const tokens = await Token.find({ clinicId: effectiveClinicId })
      .populate('doctor', 'name department')
      .populate('generatedBy', 'name role')
      .sort({ createdAt: -1 })
      .limit(2000)
      .lean();

    // Attach follow-up data from the separate collection, without touching Token
    const followUps = await FollowUp.find({ clinicId: effectiveClinicId }).lean();
    const followUpMap = new Map(followUps.map(f => [String(f.tokenId), f]));

    const merged = tokens.map(t => ({
      ...t,
      followUpDate: followUpMap.get(String(t._id))?.followUpDate || null,
      followUpNote: followUpMap.get(String(t._id))?.followUpNote || '',
    }));

    res.json({ tokens: merged });
  } catch (err) {
    console.error('Error fetching all tokens:', err);
    res.status(500).json({ message: err.message });
  }
});

// ── PATCH /api/tokens/:id/follow-up ─────────────────────────────────────
// Writes to the separate FollowUp collection only — Token document is
// never modified by this route.
router.patch('/:id/follow-up', auth, async (req, res) => {
  try {
    const clinicId = resolveClinicId(req);
    let effectiveClinicId = clinicId;
    if (req.user.role !== 'super_admin') {
      effectiveClinicId = req.user.clinicId;
    }
    if (!effectiveClinicId) return res.status(400).json({ message: 'No clinic selected' });

    const token = await Token.findOne({ _id: req.params.id, clinicId: effectiveClinicId })
      .populate('doctor', 'name department')
      .populate('generatedBy', 'name role');
    if (!token) return res.status(404).json({ message: 'Token not found in this clinic' });

    const { followUpDate, followUpNote } = req.body;
    const followUp = await FollowUp.findOneAndUpdate(
      { tokenId: token._id },
      { clinicId: effectiveClinicId, followUpDate: followUpDate || null, followUpNote: followUpNote || '' },
      { new: true, upsert: true }
    );

    res.json({
      ...token.toObject(),
      followUpDate: followUp.followUpDate,
      followUpNote: followUp.followUpNote,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;