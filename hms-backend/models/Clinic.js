// hms-backend/models/Clinic.js
import mongoose from 'mongoose';

const ClinicSchema = new mongoose.Schema({
  name:    { type: String, required: true, unique: true },
  email:   { type: String, required: true, unique: true },
  phone:   { type: String },
  address: { type: String },
  type: {
    type: String,
    enum: ['hospital', 'clinic'],
    default: 'clinic',
  },
  // ── Plan fields ──
  plan: {
    type: String,
    enum: ['lite', 'plus', 'pro', null],
    default: null,
  },
  planActivatedAt: { type: String, default: null },
  planExpiresAt: { type: String, default: null },
  owner: { type: String, default: '' },
  state: { type: String, default: '' },
  district: { type: String, default: '' },
  subDistrict: { type: String, default: '' },
  city: { type: String, default: '' },
  pincode: { type: String, default: '' },
}, { timestamps: true });

export default mongoose.model('Clinic', ClinicSchema);