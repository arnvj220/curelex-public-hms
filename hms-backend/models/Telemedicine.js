// hms-backend/models/Telemedicine.js

import mongoose from 'mongoose';

const TelemedicineSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true,
  },
  patientUserId : {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  clinicId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Clinic',
  },
  
  // Request details
  symptoms: { type: String },
  preferredTime: { type: Date },
  urgency: {
    type: String,
    enum: ['normal', 'urgent', 'emergency'],
    default: 'normal',
  },
  
  // Meeting details
  scheduledTime: { type: Date },
  meetingLink: { type: String },
  meetingId: { type: String },
  
  // Status flow
  status: {
    type: String,
    enum: ['requested', 'approved', 'payment_pending', 'payment_completed', 'scheduled', 'ready', 'ongoing', 'completed', 'cancelled', 'rejected'],
    default: 'requested',
  },
  
  // Notes
  doctorNotes: { type: String },
  patientNotes: { type: String },
  prescriptionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Prescription',
  },
  
  // Duration tracking
  startedAt: { type: Date },
  endedAt: { type: Date },
  durationMinutes: { type: Number },
  
  // Denormalized fields
  patientName: { type: String },
  patientEmail: { type: String },
  patientPhone: { type: String },
  doctorName: { type: String },
  doctorSpecialization: { type: String },
  
  // ── Payment Fields ──
  consultationFee: { type: Number, default: 0 },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending',
  },
  paymentMethod: {
    type: String,
    enum: ['card', 'upi', 'netbanking', 'wallet', 'mock'],
  },
  transactionId: {
    type: String,
    sparse: true,
  },
  paymentDetails: {
    type: mongoose.Schema.Types.Mixed,
  },
  paidAt: {
    type: Date,
  },
  
  // ── Payout Fields ──
  doctorPayoutStatus: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending',
  },
  doctorPayoutAmount: {
    type: Number,
  },
  payoutId: {
    type: String,
    sparse: true,
  },
  
}, { timestamps: true });

// Indexes
TelemedicineSchema.index({ patientId: 1, status: 1 });
TelemedicineSchema.index({ doctorId: 1, status: 1 });
TelemedicineSchema.index({ clinicId: 1, status: 1 });
TelemedicineSchema.index({ status: 1, createdAt: -1 });
TelemedicineSchema.index({ paymentStatus: 1, doctorPayoutStatus: 1 });

TelemedicineSchema.virtual('isUrgent').get(function() {
  return this.urgency === 'urgent' || this.urgency === 'emergency';
});

TelemedicineSchema.virtual('isActive').get(function() {
  return ['requested', 'approved', 'payment_pending', 'payment_completed', 'scheduled', 'ready', 'ongoing'].includes(this.status);
});

TelemedicineSchema.set('toJSON', { virtuals: true });
TelemedicineSchema.set('toObject', { virtuals: true });

export default mongoose.model('Telemedicine', TelemedicineSchema);