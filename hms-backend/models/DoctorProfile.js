import mongoose from 'mongoose';

const DoctorProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true,
  },
  name: { type: String, default: '' },
  email: { type: String, default: '' },
  mobile: { type: String, default: '' },
  specialization: { type: String, default: '' },
  qualification: { type: String, default: '' },
  experience: { type: Number, default: 0 },
  licenseNumber: { type: String, default: '' },
  currentInstitute: { type: String, default: '' },
  address: { type: String, default: '' },
  consultationFee: { type: Number, default: 0 },
  bio: { type: String, default: '' },
  photoUrl: { type: String, default: '' },
  verificationStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  reviewedAt: { type: Date, default: null },
  rejectionReason: { type: String, default: '' },
  isActive: { type: Boolean, default: false },
}, { timestamps: true });

export default mongoose.model('DoctorProfile', DoctorProfileSchema);
