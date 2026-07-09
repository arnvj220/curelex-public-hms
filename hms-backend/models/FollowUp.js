// hms-backend/models/FollowUp.js
import mongoose from 'mongoose';

const FollowUpSchema = new mongoose.Schema({
  tokenId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Token', required: true, unique: true, index: true },
  clinicId: { type: mongoose.Schema.Types.ObjectId, ref: 'Clinic', required: true, index: true },
  followUpDate: { type: String, default: null }, // "YYYY-MM-DD"
  followUpNote: { type: String, default: '' },
}, { timestamps: true });

export default mongoose.model('FollowUp', FollowUpSchema);