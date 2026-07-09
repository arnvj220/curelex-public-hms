import express from 'express';
import Consultation from '../models/Consultation.js';
import { auth } from '../middleware/auth.js';
import { sendEmail } from '../utils/sendEmail.js';
const router = express.Router();

// ── PUBLIC: Homepage form submits here (no auth) ──────────────────────────
router.post('/', async (req, res) => {
  try {
    const { name, phoneCode, mobile, email, state, service } = req.body;

    if (!name || !mobile || !email || !state || !service) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const consultation = await Consultation.create({
      name, phoneCode, mobile, email, state, service,
    });

    if (req.io) {
      req.io.emit('consultation:new', consultation);
    }

    // ── Send thank-you email (non-blocking) ──
    sendEmail({
      to: email,
      subject: 'Thanks for reaching out to CURELEX!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px;">
          <h2 style="color: #0f2942;">Hi ${name}, thanks for reaching out! 🙏</h2>
          <p style="font-size: 15px; color: #334155; line-height: 1.6;">
            We've received your consultation request for <strong>${service}</strong>.
            Our team will contact you shortly on <strong>${phoneCode} ${mobile}</strong> or this email.
          </p>
          <p style="font-size: 13px; color: #94a3b8; margin-top: 24px;">— Team CURELEX</p>
        </div>
      `,
    });

    res.status(201).json({ message: 'Consultation submitted', consultation });
  } catch (err) {
    console.error('Consultation submit error:', err);
    res.status(500).json({ message: 'Server error, please try again' });
  }
});

// ── PROTECTED: Super Admin only — list all consultations ──────────────────
router.get('/', auth, async (req, res) => {
  try {
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const consultations = await Consultation.find().sort({ createdAt: -1 });
    res.json({ consultations, total: consultations.length });
  } catch (err) {
    console.error('Fetch consultations error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ── PROTECTED: Super Admin only — update status/notes ──────────────────────
router.patch('/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { status, notes } = req.body;
    const consultation = await Consultation.findByIdAndUpdate(
      req.params.id,
      { ...(status && { status }), ...(notes !== undefined && { notes }) },
      { new: true }
    );

    if (!consultation) return res.status(404).json({ message: 'Not found' });
    res.json({ consultation });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;