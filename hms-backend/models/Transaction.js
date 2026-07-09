// hms-backend/models/Transaction.js

import mongoose from 'mongoose';

const TransactionSchema = new mongoose.Schema({
  // Who is involved
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
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
  telemedicineId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Telemedicine',
    required: true,
  },

  // Payment details
  amount: {
    type: Number,
    required: true,
  },
  doctorFee: {
    type: Number,
    required: true,
  },

  // Payment status
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
    unique: true,
    sparse: true,
  },
  paymentGateway: {
    type: String,
    enum: ['mock', 'razorpay', 'stripe', 'paytm'],
    default: 'mock',
  },
  paymentDetails: {
    type: mongoose.Schema.Types.Mixed,
  },
  paidAt: {
    type: Date,
  },

  // Payout details
  payoutStatus: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending',
  },
  payoutId: {
    type: String,
    sparse: true,
  },
  payoutDate: {
    type: Date,
  },
  payoutMethod: {
    type: String,
    enum: ['bank_transfer', 'upi', 'cheque', 'mock'],
  },

  // Consultation details
  consultationDate: {
    type: Date,
  },
  consultationDuration: {
    type: Number,
  },

  // Metadata
  notes: {
    type: String,
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
  },

}, { timestamps: true });

// Indexes
TransactionSchema.index({ patientId: 1, createdAt: -1 });
TransactionSchema.index({ doctorId: 1, createdAt: -1 });
TransactionSchema.index({ clinicId: 1, createdAt: -1 });
TransactionSchema.index({ paymentStatus: 1, payoutStatus: 1 });
TransactionSchema.index({ transactionId: 1 }, { unique: true });

export default mongoose.model('Transaction', TransactionSchema);