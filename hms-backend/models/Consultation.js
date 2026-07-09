import mongoose from 'mongoose';

const consultationSchema = new mongoose.Schema(
  {
    name:      { type: String, required: true, trim: true },
    phoneCode: { type: String, default: '+91' },
    mobile:    { type: String, required: true, trim: true },
    email:     { type: String, required: true, trim: true, lowercase: true },
    state:     { type: String, required: true },
    service:   { type: String, required: true }, // e.g. "Dermatology"
    status: {
      type: String,
      enum: ['new', 'contacted', 'closed'],
      default: 'new',
    },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

export default mongoose.model('Consultation', consultationSchema);