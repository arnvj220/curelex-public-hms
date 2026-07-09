// hms-backend/controllers/telemedicineController.js

import Telemedicine from '../models/Telemedicine.js';
import Patient from '../models/Patient.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import Transaction from '../models/Transaction.js';
import mongoose from 'mongoose';

// ── Helper: Generate meeting link ──
// Uses Jitsi Meet's free public server (meet.jit.si) — real, working video
// rooms, no signup / API key / backend video infra required.
// Both doctor and patient read the same `telemedicine.meetingLink` field,
// so they always see the identical link.
function generateMeetingLink(meetingId) {
  return `https://meet.jit.si/Curelex-${meetingId}`;
}

function generateMeetingId() {
  // Long, random, unguessable room name
  const random = Math.random().toString(36).substring(2, 10) +
                 Math.random().toString(36).substring(2, 10);
  return random + Date.now().toString(36);
}

// ── Helper: Calculate fees (0% commission) ──
function calculateFees(consultationFee, commissionPercentage = 0) {
  const clinicCommission = (consultationFee * commissionPercentage) / 100;
  const doctorFee = consultationFee - clinicCommission;
  return { doctorFee, clinicCommission };
}

// ─────────────────────────────────────────────────────────────────────────────
// FIX SUMMARY:
// All queries that previously filtered by clinicId have been updated.
// Root cause: the patient's JWT clinicId and the doctor's clinicId are different
// ObjectIds due to a DB mismatch — so any query with { clinicId } would fail.
//
// Rules applied:
//   • Patient lookup  → find by userId only (no clinicId filter)
//   • Doctor lookup   → find by _id + role only (no clinicId filter)
//   • Telemedicine    → find by _id only for single-record ops (no clinicId)
//   • List queries    → use doctorId / patientId only (no clinicId filter)
//   • Stats/earnings  → remove clinicId from aggregation match
// ─────────────────────────────────────────────────────────────────────────────

export const requestTelemedicine = async (req, res) => {
  try {
    const { doctorId, symptoms, preferredTime, urgency } = req.body;

    // FIX: Find patient by userId only — no clinicId filter
    const patient = await Patient.findOne({ userId: req.user.id });
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    // FIX: Find doctor by _id + role only — no clinicId filter
    const doctor = await User.findOne({ _id: doctorId, role: { $in: ['doctor', 'separate_doctor'] } });
    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor not found' });
    }

    if (!doctor.isActive) {
      return res.status(400).json({ success: false, message: 'Doctor is not available' });
    }

    
    if (!doctor.bankDetails?.accountNumber) {
      return res.status(400).json({ success: false, message: 'Doctor has not set up payment details yet.' });
    }

    const isDoctorOnline = global.doctorStatus?.get(String(doctorId))?.status === 'online';

    // Use patient's clinicId for the record (informational only, not used for filtering)
    const clinicId = patient.clinicId || doctor.clinicId || null;

    const telemedicine = await Telemedicine.create({
      patientId:            patient._id,
      patientUserId:        req.user.id,
      patientName:          patient.name,
      patientEmail:         patient.email,
      patientPhone:         patient.phone,
      doctorId:             doctor._id,
      doctorName:           doctor.name,
      doctorSpecialization: doctor.department || doctor.specialization,
      clinicId,
      symptoms:             symptoms || '',
      preferredTime:        preferredTime || null,
      urgency:              urgency || 'normal',
      consultationFee:      doctor.telemedicineFee || 0,
      status:               'requested',
      paymentStatus:        'pending',
      doctorPayoutStatus:   'pending',
    });

    await Notification.create({
      userId:   doctor._id,
      message:  `🩺 New telemedicine request from ${patient.name}${urgency === 'urgent' ? ' (URGENT)' : urgency === 'emergency' ? ' 🚨 EMERGENCY' : ''}`,
      taskId:   telemedicine._id,
      clinicId,
      read:     false,
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`doctor_${doctorId}`).emit('telemedicine:new-request', {
        requestId:       telemedicine._id,
        patientId:       patient._id,
        patientName:     patient.name,
        patientEmail:    patient.email,
        patientPhone:    patient.phone,
        symptoms:        symptoms || '',
        urgency:         urgency || 'normal',
        consultationFee: doctor.consultationFee || 0,
        timestamp:       new Date(),
        message:         `📱 New telemedicine request from ${patient.name}`
      });
    }

    res.status(201).json({
      success:         true,
      message:         'Telemedicine request sent successfully',
      telemedicine,
      doctorAvailable: isDoctorOnline
    });
  } catch (error) {
    console.error('Request telemedicine error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Doctor approves request ──
export const approveTelemedicine = async (req, res) => {
  try {
    const { id } = req.params;
    const { scheduledTime, doctorNotes } = req.body;
    const doctorId = req.user.id;

    // FIX: find by _id only
    const telemedicine = await Telemedicine.findById(id);
    if (!telemedicine) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    if (String(telemedicine.doctorId) !== String(doctorId)) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    if (telemedicine.status !== 'requested') {
      return res.status(400).json({ success: false, message: 'Request already processed' });
    }

    telemedicine.status = 'payment_pending';
    telemedicine.scheduledTime = scheduledTime || new Date(Date.now() + 30 * 60000);
    telemedicine.doctorNotes = doctorNotes || '';
    await telemedicine.save();

    await Notification.create({
      userId:   telemedicine.patientId,
      message:  `💳 Payment required: Dr. ${telemedicine.doctorName} approved your request. Please pay ₹${telemedicine.consultationFee} to confirm.`,
      taskId:   telemedicine._id,
      clinicId: telemedicine.clinicId,
      read:     false,
    });

    const io = req.app.get('io');
    if (io) {
      const patientRoomId = telemedicine.patientUserId || telemedicine.patientId;
      io.to(`patient_${patientRoomId}`).emit('telemedicine:payment-required', {
        requestId:       telemedicine._id,
        doctorId:        telemedicine.doctorId,
        doctorName:      telemedicine.doctorName,
        consultationFee: telemedicine.consultationFee,
        scheduledTime:   telemedicine.scheduledTime,
        timestamp:       new Date(),
        message:         `💳 Payment required: ₹${telemedicine.consultationFee}`
      });
    }

    res.json({ success: true, message: 'Telemedicine approved. Payment required from patient.', telemedicine });
  } catch (error) {
    console.error('Approve telemedicine error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Patient processes payment ──
export const processPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentMethod, paymentDetails } = req.body;
    const userId = req.user.id;

    const telemedicine = await Telemedicine.findById(id);
    if (!telemedicine) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    const patient = await Patient.findOne({ userId });
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient profile not found' });
    }

    if (String(telemedicine.patientId) !== String(patient._id)) {
      return res.status(403).json({ success: false, message: 'Not authorized to pay for this request' });
    }

    if (telemedicine.status !== 'payment_pending') {
      return res.status(400).json({ success: false, message: `Payment not required. Status: ${telemedicine.status}` });
    }

    // Doctor gets 100% — no commission deducted
    const doctorFee     = telemedicine.consultationFee;
    const transactionId = `TXN-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    const transaction = new Transaction({
      patientId:      telemedicine.patientId,
      doctorId:       telemedicine.doctorId,
      clinicId:       telemedicine.clinicId || null,   // optional
      telemedicineId: telemedicine._id,
      amount:         telemedicine.consultationFee,
      doctorFee,                                       // = consultationFee, no deduction
      paymentMethod:  paymentMethod || 'mock',
      paymentGateway: 'mock',
      paymentDetails: paymentDetails || {},
      paidAt:         new Date(),
      paymentStatus:  'paid',
      payoutStatus:   'pending',
      transactionId,
    });
    await transaction.save();

    telemedicine.status             = 'payment_completed';
    telemedicine.paymentStatus      = 'paid';
    telemedicine.paymentMethod      = paymentMethod || 'mock';
    telemedicine.transactionId      = transactionId;
    telemedicine.paymentDetails     = paymentDetails || {};
    telemedicine.paidAt             = new Date();
    telemedicine.doctorPayoutAmount = doctorFee;
    telemedicine.doctorPayoutStatus = 'pending';

    // Generate meeting link
    const meetingId          = generateMeetingId();
    telemedicine.meetingId   = meetingId;
    telemedicine.meetingLink = generateMeetingLink(meetingId);
    telemedicine.status      = 'scheduled';
    await telemedicine.save();

    await Notification.create({
      userId:   telemedicine.doctorId,
      message:  `✅ Payment received! You can now start the consultation with ${telemedicine.patientName}.`,
      taskId:   telemedicine._id,
      clinicId: telemedicine.clinicId,
      read:     false,
    });

    await Notification.create({
      userId:   telemedicine.patientId,
      message:  `✅ Payment successful! Consultation with Dr. ${telemedicine.doctorName} confirmed. Meeting: ${telemedicine.meetingLink}`,
      taskId:   telemedicine._id,
      clinicId: telemedicine.clinicId,
      read:     false,
    });

    const io = req.app.get('io');
    if (io) {
      const patientRoomId = telemedicine.patientUserId || telemedicine.patientId;
      io.to(`patient_${patientRoomId}`).emit('telemedicine:payment-success', {
        requestId:     telemedicine._id,
        meetingLink:   telemedicine.meetingLink,
        scheduledTime: telemedicine.scheduledTime,
        doctorName:    telemedicine.doctorName,
        timestamp:     new Date(),
        message:       '✅ Payment successful! Consultation confirmed.',
      });
      io.to(`doctor_${telemedicine.doctorId}`).emit('telemedicine:payment-received', {
        requestId:   telemedicine._id,
        patientName: telemedicine.patientName,
        doctorFee,
        timestamp:   new Date(),
        message:     `✅ Payment received ₹${telemedicine.consultationFee}`,
      });
    }

    res.json({ success: true, message: 'Payment processed successfully', telemedicine, transaction });
  } catch (error) {
    console.error('Process payment error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
// ── Doctor rejects request ──
export const rejectTelemedicine = async (req, res) => {
  try {
    const { id } = req.params;
    const { doctorNotes } = req.body;
    const doctorId = req.user.id;

    // FIX: find by _id only
    const telemedicine = await Telemedicine.findById(id);
    if (!telemedicine) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    if (String(telemedicine.doctorId) !== String(doctorId)) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    if (telemedicine.status !== 'requested') {
      return res.status(400).json({ success: false, message: 'Request already processed' });
    }

    telemedicine.status = 'rejected';
    telemedicine.doctorNotes = doctorNotes || 'Doctor declined the request';
    await telemedicine.save();

    await Notification.create({
      userId:   telemedicine.patientId,
      message:  `❌ Your telemedicine request was declined by Dr. ${telemedicine.doctorName}`,
      taskId:   telemedicine._id,
      clinicId: telemedicine.clinicId,
      read:     false,
    });

    const io = req.app.get('io');
    if (io) {
      const patientRoomId = telemedicine.patientUserId || telemedicine.patientId;
      io.to(`patient_${patientRoomId}`).emit('telemedicine:status-update', {
        requestId:  telemedicine._id,
        status:     'rejected',
        doctorId:   telemedicine.doctorId,
        doctorName: telemedicine.doctorName,
        timestamp:  new Date(),
        message:    `❌ Your request was declined by Dr. ${telemedicine.doctorName}`
      });
    }

    res.json({ success: true, message: 'Telemedicine request rejected', telemedicine });
  } catch (error) {
    console.error('Reject telemedicine error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Doctor starts meeting ──
export const startTelemedicine = async (req, res) => {
  try {
    const { id } = req.params;
    const doctorId = req.user.id;

    // FIX: find by _id only
    const telemedicine = await Telemedicine.findById(id);
    if (!telemedicine) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    if (String(telemedicine.doctorId) !== String(doctorId)) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    if (!['scheduled', 'ready', 'payment_completed'].includes(telemedicine.status)) {
      return res.status(400).json({ success: false, message: 'Cannot start this meeting' });
    }

    if (telemedicine.paymentStatus !== 'paid') {
      return res.status(400).json({ success: false, message: 'Payment not completed' });
    }

    // Safety net: if for any reason a meeting link wasn't generated yet
    // (e.g. older records), generate one now so Start never breaks.
    if (!telemedicine.meetingLink) {
      const meetingId = generateMeetingId();
      telemedicine.meetingId   = meetingId;
      telemedicine.meetingLink = generateMeetingLink(meetingId);
    }

    telemedicine.status    = 'ongoing';
    telemedicine.startedAt = new Date();
    await telemedicine.save();

    await Notification.create({
      userId:   telemedicine.patientId,
      message:  `🔴 Dr. ${telemedicine.doctorName} has started the meeting. Click to join!`,
      taskId:   telemedicine._id,
      clinicId: telemedicine.clinicId,
      read:     false,
    });

    const io = req.app.get('io');
    if (io) {
      const patientRoomId = telemedicine.patientUserId || telemedicine.patientId;
      io.to(`patient_${patientRoomId}`).emit('telemedicine:meeting-started', {
        requestId:   telemedicine._id,
        meetingLink: telemedicine.meetingLink,
        doctorId:    telemedicine.doctorId,
        doctorName:  telemedicine.doctorName,
        timestamp:   new Date(),
      });
      io.to(`patient_${patientRoomId}`).emit('telemedicine:status-update', {
        requestId: telemedicine._id,
        status:    'ongoing',
        timestamp: new Date()
      });
    }

    res.json({ success: true, message: 'Meeting started', telemedicine });
  } catch (error) {
    console.error('Start telemedicine error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Doctor ends meeting ──
export const endTelemedicine = async (req, res) => {
  try {
    const { id } = req.params;
    const { doctorNotes } = req.body;
    const doctorId = req.user.id;

    // FIX: find by _id only
    const telemedicine = await Telemedicine.findById(id);
    if (!telemedicine) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    if (String(telemedicine.doctorId) !== String(doctorId)) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    if (telemedicine.status !== 'ongoing') {
      return res.status(400).json({ success: false, message: 'Meeting is not active' });
    }

    const endedAt         = new Date();
    const durationMinutes = Math.round((endedAt - telemedicine.startedAt) / 60000);

    telemedicine.status          = 'completed';
    telemedicine.endedAt         = endedAt;
    telemedicine.durationMinutes = durationMinutes;
    if (doctorNotes) telemedicine.doctorNotes = doctorNotes;
    await telemedicine.save();

    await Transaction.findOneAndUpdate(
      { telemedicineId: telemedicine._id },
      { consultationDuration: durationMinutes, consultationDate: endedAt }
    );

    await Notification.create({
      userId:   telemedicine.patientId,
      message:  `✅ Meeting with Dr. ${telemedicine.doctorName} ended. Duration: ${durationMinutes} minutes`,
      taskId:   telemedicine._id,
      clinicId: telemedicine.clinicId,
      read:     false,
    });

    const io = req.app.get('io');
    if (io) {
      const patientRoomId = telemedicine.patientUserId || telemedicine.patientId;
      io.to(`patient_${patientRoomId}`).emit('telemedicine:meeting-ended', {
        requestId:  telemedicine._id,
        duration:   durationMinutes,
        doctorId:   telemedicine.doctorId,
        doctorName: telemedicine.doctorName,
        timestamp:  new Date(),
      });
      io.to(`patient_${patientRoomId}`).emit('telemedicine:status-update', {
        requestId: telemedicine._id,
        status:    'completed',
        duration:  durationMinutes,
        timestamp: new Date()
      });
    }

    res.json({ success: true, message: 'Meeting ended', telemedicine });
  } catch (error) {
    console.error('End telemedicine error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Doctor requests payout ──
export const requestPayout = async (req, res) => {
  try {
    const { id } = req.params;
    const doctorId = req.user.id;

    // FIX: find by _id only
    const telemedicine = await Telemedicine.findById(id);
    if (!telemedicine) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    if (String(telemedicine.doctorId) !== String(doctorId)) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    if (telemedicine.status !== 'completed') {
      return res.status(400).json({ success: false, message: 'Consultation not completed' });
    }

    if (telemedicine.doctorPayoutStatus === 'completed') {
      return res.status(400).json({ success: false, message: 'Payout already processed' });
    }

    telemedicine.doctorPayoutStatus = 'processing';
    await telemedicine.save();

    await Transaction.findOneAndUpdate(
      { telemedicineId: telemedicine._id },
      { payoutStatus: 'processing' }
    );

    const superAdmin = await User.findOne({ role: 'super_admin' });
    if (superAdmin) {
      await Notification.create({
        userId:   superAdmin._id,
        message:  `💰 Payout requested: Dr. ${telemedicine.doctorName} is requesting ₹${telemedicine.doctorPayoutAmount}`,
        taskId:   telemedicine._id,
        clinicId: telemedicine.clinicId,
        read:     false,
      });
    }

    const io = req.app.get('io');
    if (io) {
      io.to(`doctor_${doctorId}`).emit('telemedicine:payout-requested', {
        requestId: telemedicine._id,
        amount:    telemedicine.doctorPayoutAmount,
        timestamp: new Date(),
        message:   `💰 Payout requested: ₹${telemedicine.doctorPayoutAmount}`
      });
    }

    res.json({ success: true, message: 'Payout request submitted', telemedicine });
  } catch (error) {
    console.error('Request payout error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Super admin approves payout ──
export const approvePayout = async (req, res) => {
  try {
    const { id } = req.params;
    const { payoutId, payoutMethod, notes } = req.body;

    const telemedicine = await Telemedicine.findById(id);
    if (!telemedicine) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    if (telemedicine.doctorPayoutStatus !== 'processing') {
      return res.status(400).json({ success: false, message: 'Payout not in processing state' });
    }

    telemedicine.doctorPayoutStatus = 'completed';
    telemedicine.payoutId = payoutId || `PAY-${Date.now()}`;
    await telemedicine.save();

    await Transaction.findOneAndUpdate(
      { telemedicineId: telemedicine._id },
      {
        payoutStatus:  'completed',
        payoutId:      payoutId || `PAY-${Date.now()}`,
        payoutDate:    new Date(),
        payoutMethod:  payoutMethod || 'bank_transfer',
        notes:         notes || '',
      }
    );

    await Notification.create({
      userId:   telemedicine.doctorId,
      message:  `✅ Payout completed: ₹${telemedicine.doctorPayoutAmount} has been transferred to your account.`,
      taskId:   telemedicine._id,
      clinicId: telemedicine.clinicId,
      read:     false,
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`doctor_${telemedicine.doctorId}`).emit('telemedicine:payout-approved', {
        requestId: telemedicine._id,
        amount:    telemedicine.doctorPayoutAmount,
        timestamp: new Date(),
        message:   `✅ Payout approved: ₹${telemedicine.doctorPayoutAmount}`
      });
    }

    res.json({ success: true, message: 'Payout approved', telemedicine });
  } catch (error) {
    console.error('Approve payout error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Cancel telemedicine ──
export const cancelTelemedicine = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // FIX: find by _id only
    const telemedicine = await Telemedicine.findById(id);
    if (!telemedicine) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    const isDoctor = String(telemedicine.doctorId) === String(userId);

    let isPatient = false;
    if (telemedicine.patientUserId && String(telemedicine.patientUserId) === String(userId)) {
      isPatient = true;
    }
    if (!isPatient && String(telemedicine.patientId) === String(userId)) {
      isPatient = true;
    }
    if (!isPatient) {
      // FIX: find patient by userId only
      const patient = await Patient.findOne({ userId });
      if (patient && String(patient._id) === String(telemedicine.patientId)) {
        isPatient = true;
      }
    }

    if (!isPatient && !isDoctor) {
      return res.status(403).json({ success: false, message: 'Not authorized to cancel this request' });
    }

    const cancellableStatuses = ['requested', 'approved', 'scheduled', 'payment_pending'];
    if (!cancellableStatuses.includes(telemedicine.status)) {
      return res.status(400).json({ success: false, message: `Cannot cancel. Current status: ${telemedicine.status}` });
    }

    telemedicine.status = 'cancelled';
    await telemedicine.save();

    if (isPatient) {
      await Notification.create({
        userId:   telemedicine.doctorId,
        message:  `❌ ${telemedicine.patientName} has cancelled the telemedicine consultation.`,
        taskId:   telemedicine._id,
        clinicId: telemedicine.clinicId,
        read:     false,
      });
    } else {
      await Notification.create({
        userId:   telemedicine.patientId,
        message:  `❌ Dr. ${telemedicine.doctorName} has cancelled the telemedicine consultation.`,
        taskId:   telemedicine._id,
        clinicId: telemedicine.clinicId,
        read:     false,
      });
    }

    const io = req.app.get('io');
    if (io) {
      const patientRoomId = telemedicine.patientUserId || telemedicine.patientId;
      io.to(`patient_${patientRoomId}`).emit('telemedicine:status-update', {
        requestId: telemedicine._id,
        status:    'cancelled',
        timestamp: new Date(),
        message:   isPatient ? '❌ You cancelled this consultation' : '❌ Doctor cancelled this consultation'
      });
      io.to(`doctor_${telemedicine.doctorId}`).emit('telemedicine:status-update', {
        requestId: telemedicine._id,
        status:    'cancelled',
        timestamp: new Date(),
        message:   isPatient ? '❌ Patient cancelled this consultation' : '❌ You cancelled this consultation'
      });
    }

    res.json({ success: true, message: 'Telemedicine cancelled successfully', telemedicine });
  } catch (error) {
    console.error('Cancel telemedicine error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Get doctor's telemedicine requests ──
export const getDoctorTelemedicine = async (req, res) => {
  try {
    const doctorId = req.params.id;
    const { status, page = 1, limit = 20 } = req.query;

    // FIX: filter by doctorId only — no clinicId
    const query = { doctorId };
    if (status) query.status = status;

    const total    = await Telemedicine.countDocuments(query);
    const requests = await Telemedicine.find(query)
      .populate('patientId', 'name patientId phone email')
      .populate('doctorId',  'name department')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({
      success: true,
      requests,
      pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Get doctor telemedicine error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Get patient's telemedicine requests ──
export const getPatientTelemedicine = async (req, res) => {
  try {
    const patientId = req.params.id;
    const { status, page = 1, limit = 20 } = req.query;

    // FIX: filter by patientId only — no clinicId
    const query = { patientId };
    if (status) query.status = status;

    const total    = await Telemedicine.countDocuments(query);
    const requests = await Telemedicine.find(query)
      .populate('doctorId', 'name department')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({
      success:    true,
      requests,
      pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Get patient telemedicine error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Get single telemedicine request ──
export const getTelemedicineById = async (req, res) => {
  try {
    const { id } = req.params;

    // FIX: find by _id only
    const telemedicine = await Telemedicine.findById(id)
      .populate('patientId', 'name patientId phone email')
      .populate('doctorId',  'name department');

    if (!telemedicine) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    res.json({ success: true, telemedicine });
  } catch (error) {
    console.error('Get telemedicine by id error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Get telemedicine stats ──
export const getTelemedicineStats = async (req, res) => {
  try {
    const userId   = req.user.id;
    const userRole = req.user.role;

    // FIX: For doctors scope to their doctorId; for others fetch all
    const baseQuery = userRole === 'doctor' ? { doctorId: new mongoose.Types.ObjectId(userId) } : {};

    const [total, requested, approved, paymentPending, paymentCompleted,
           scheduled, ongoing, completed, cancelled, rejected] = await Promise.all([
      Telemedicine.countDocuments(baseQuery),
      Telemedicine.countDocuments({ ...baseQuery, status: 'requested' }),
      Telemedicine.countDocuments({ ...baseQuery, status: 'approved' }),
      Telemedicine.countDocuments({ ...baseQuery, status: 'payment_pending' }),
      Telemedicine.countDocuments({ ...baseQuery, status: 'payment_completed' }),
      Telemedicine.countDocuments({ ...baseQuery, status: 'scheduled' }),
      Telemedicine.countDocuments({ ...baseQuery, status: 'ongoing' }),
      Telemedicine.countDocuments({ ...baseQuery, status: 'completed' }),
      Telemedicine.countDocuments({ ...baseQuery, status: 'cancelled' }),
      Telemedicine.countDocuments({ ...baseQuery, status: 'rejected' }),
    ]);

    // FIX: earnings aggregation — no clinicId filter
    const earningsMatch = userRole === 'doctor'
      ? { doctorId: new mongoose.Types.ObjectId(userId) }
      : {};

    const earningsStats = await Transaction.aggregate([
      { $match: earningsMatch },
      { $group: { _id: '$payoutStatus', total: { $sum: '$doctorFee' }, count: { $sum: 1 } } }
    ]);

    const totalEarnings     = earningsStats.reduce((sum, t) => sum + t.total, 0);
    const pendingPayouts    = earningsStats.find(t => t._id === 'pending')?.total    || 0;
    const processingPayouts = earningsStats.find(t => t._id === 'processing')?.total || 0;
    const completedPayouts  = earningsStats.find(t => t._id === 'completed')?.total  || 0;

    res.json({
      success: true,
      stats: {
        total, requested, approved, paymentPending, paymentCompleted,
        scheduled, ongoing, completed, cancelled, rejected,
        earnings: { total: totalEarnings, pending: pendingPayouts, processing: processingPayouts, completed: completedPayouts }
      },
    });
  } catch (error) {
    console.error('Get telemedicine stats error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Get doctor's earnings ──
export const getDoctorEarnings = async (req, res) => {
  try {
    const { doctorId } = req.params;

    // FIX: no clinicId filter in aggregation
    const transactions = await Transaction.aggregate([
      { $match: { doctorId: new mongoose.Types.ObjectId(doctorId) } },
      { $group: { _id: '$payoutStatus', total: { $sum: '$doctorFee' }, count: { $sum: 1 } } }
    ]);

    const totalEarnings     = transactions.reduce((sum, t) => sum + t.total, 0);
    const pendingPayouts    = transactions.find(t => t._id === 'pending')?.total    || 0;
    const processingPayouts = transactions.find(t => t._id === 'processing')?.total || 0;
    const completedPayouts  = transactions.find(t => t._id === 'completed')?.total  || 0;

    // FIX: no clinicId filter
    const recentTransactions = await Transaction.find({ doctorId })
      .populate('patientId', 'name email phone')
      .sort({ createdAt: -1 })
      .limit(10);

    // Fetch pending payout requests for the doctor
    const pendingPayoutRequests = await Telemedicine.find({
      doctorId: new mongoose.Types.ObjectId(doctorId),
      doctorPayoutStatus: 'pending',
      status: 'completed'
    }).populate('patientId', 'name');

    const formattedPendingPayouts = pendingPayoutRequests.map(t => ({
      _id: t._id,
      patientName: t.patientName || t.patientId?.name,
      doctorPayoutAmount: t.doctorPayoutAmount,
      doctorPayoutStatus: t.doctorPayoutStatus,
      createdAt: t.createdAt
    }));

    res.json({
      success: true,
      earnings: { total: totalEarnings, pending: pendingPayouts, processing: processingPayouts, completed: completedPayouts, breakdown: transactions },
      recentTransactions,
      pendingPayouts: formattedPendingPayouts
    });
  } catch (error) {
    console.error('Get doctor earnings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Get pending payouts (super_admin only) ──
export const getPendingPayouts = async (req, res) => {
  try {
    const pendingPayouts = await Telemedicine.find({
      doctorPayoutStatus: 'processing',
      status:             'completed'
    })
    .populate('doctorId',  'name email phone bankDetails')
    .populate('patientId', 'name email phone')
    .sort({ createdAt: 1 });

    const totalAmount = pendingPayouts.reduce((sum, item) => sum + (item.doctorPayoutAmount || 0), 0);

    res.json({ success: true, pendingPayouts, totalAmount, count: pendingPayouts.length });
  } catch (error) {
    console.error('Get pending payouts error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Get online doctors ──
export const getOnlineDoctors = async (req, res) => {
  try {
    if (!global.doctorStatus) {
      return res.json({ success: true, onlineDoctors: [] });
    }

    // FIX: return ALL online doctors — no clinicId filter
    const onlineDoctors = [];
    for (const [doctorId, data] of global.doctorStatus.entries()) {
      if (data.status === 'online') {
        onlineDoctors.push({ doctorId, lastSeen: data.lastSeen, status: data.status });
      }
    }

    res.json({ success: true, onlineDoctors });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Update doctor bank details ──
export const updateBankDetails = async (req, res) => {
  try {
    const { accountHolderName, accountNumber, bankName, ifscCode, upiId } = req.body;
    const userId = req.user.id;

    // FIX: find by _id only
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.role !== 'doctor' && user.role !== 'separate_doctor') {
      return res.status(403).json({ success: false, message: 'Only doctors can update bank details' });
    }

    user.bankDetails = {
      accountHolderName: accountHolderName || user.bankDetails?.accountHolderName,
      accountNumber:     accountNumber     || user.bankDetails?.accountNumber,
      bankName:          bankName          || user.bankDetails?.bankName,
      ifscCode:          ifscCode          || user.bankDetails?.ifscCode,
      upiId:             upiId             || user.bankDetails?.upiId,
      isVerified:        false,
    };

    await user.save();

    res.json({ success: true, message: 'Bank details updated successfully', bankDetails: user.bankDetails });
  } catch (error) {
    console.error('Update bank details error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateTelemedicineFee = async (req, res) => {
  try {
    const { telemedicineFee } = req.body;
    const userId = req.user.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.role !== 'doctor' && user.role !== 'separate_doctor') {
      return res.status(403).json({ success: false, message: 'Only doctors can update consultation fee' });
    }

    user.telemedicineFee = Number(telemedicineFee) || 0;
    await user.save();

    res.json({ success: true, message: 'Telemedicine consultation fee updated successfully', telemedicineFee: user.telemedicineFee });
  } catch (error) {
    console.error('Update telemedicine fee error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};