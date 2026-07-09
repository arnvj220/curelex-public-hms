// hms-backend/models/User.js
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { 
    type: String, 
    enum: ['super_admin','admin', 'doctor', 'separate_doctor', 'nurse', 'receptionist', 'pharmacist', 'lab_technician', 'patient'],
    default: 'receptionist' 
  },
  department: { type: String },
  phone: { type: String },
  avatar: {
    type: String,
    default: '',
  },
  isActive: { type: Boolean, default: true },

  // ✅ Every user belongs to a clinic
  clinicId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Clinic',
    default: null
  },

  permissions: {
    type: [String],
    default: ['dashboard'],
  },

  // Consultation fee — only relevant for doctors
  consultationFee: {
    type: Number,
    default: 0,
  },
  telemedicineFee: {
    type: Number,
    default: 0,
  },
  baseSalary: {
    type: Number,
    default: 0,
  },
  bankDetails: {
    accountHolderName: { type: String },
    accountNumber: { type: String },
    bankName: { type: String },
    ifscCode: { type: String },
    upiId: { type: String },
    isVerified: { type: Boolean, default: false },
  },
  // ── NEW: Payout Settings ──
  payoutSettings: {
    autoPayout: { type: Boolean, default: false },
    minimumPayoutAmount: { type: Number, default: 500 },
    payoutFrequency: { 
      type: String, 
      enum: ['immediate', 'daily', 'weekly', 'monthly'],
      default: 'weekly'
    },
  },
  lastLoginAt: { type: Date, default: null },
  dailyTokenLimit: {
    type: Number,
    default: 0, // 0 = unlimited
  },
  resetPasswordToken:   { type: String, default: null },
  resetPasswordExpires: { type: Date,   default: null },

}, { timestamps: true });

UserSchema.index({ email: 1, clinicId: 1 }, { 
  unique: true, 
  partialFilterExpression: { clinicId: { $ne: null } } 
});

UserSchema.pre('save', async function (next) {
  // Only hash if password was explicitly modified AND is not already a bcrypt hash
  if (!this.isModified('password')) return next();
  if (this.password?.startsWith('$2')) return next(); // already hashed, skip
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

UserSchema.methods.matchPassword = async function (entered) {
  return await bcrypt.compare(entered, this.password);
};

// ── Virtual: Check if user is Super Admin ──
UserSchema.virtual('isSuperAdmin').get(function() {
  return this.role === 'super_admin';
});

UserSchema.virtual('isAdmin').get(function() {
  return this.role === 'admin' || this.role === 'super_admin';
});

UserSchema.set('toJSON', { virtuals: true });
UserSchema.set('toObject', { virtuals: true });


export default mongoose.model('User', UserSchema);