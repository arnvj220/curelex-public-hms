// hms-backend/models/Feedback.js
import mongoose from 'mongoose';

const FeedbackSchema = new mongoose.Schema({
  patientId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  clinicId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Clinic', 
    required: false 
  },
  doctorId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  clinicRating: { 
    type: Number, 
    required: false, 
    min: 1, 
    max: 5 
  },
  doctorRating: { 
    type: Number, 
    required: true, 
    min: 1, 
    max: 5 
  },
  clinicFeedback: { 
    type: String, 
    default: '' 
  },
  doctorFeedback: { 
    type: String, 
    default: '' 
  },
}, { timestamps: true });

export default mongoose.model('Feedback', FeedbackSchema);
