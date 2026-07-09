// hms-backend/routes/dashboard.js
import { fileURLToPath } from 'url';
import path from 'path';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
import bcrypt from "bcryptjs";
import express from 'express';
const router = express.Router();
import { auth } from '../middleware/auth.js';
import { getClinicFilter } from '../middleware/clinicFilter.js';

import Patient from '../models/Patient.js';
import Billing from '../models/Billing.js';
import Pharmacy from '../models/Pharmacy.js';
import Lab from '../models/Lab.js';
import Inventory from '../models/Inventory.js';
import Admission from '../models/Admission.js';
import Appointment from '../models/Appointment.js';
import mongoose from 'mongoose';

/**
 * Safely converts any clinicId value to a mongoose ObjectId or null
 * Returns null for 'default' or invalid values
 */
function toObjectId(id) {
  if (!id || id === 'default' || id === 'null' || id === 'undefined') return null;
  if (mongoose.Types.ObjectId.isValid(id)) {
    return new mongoose.Types.ObjectId(String(id));
  }
  return null;
}

/**
 * Resolves clinicId from (in priority order):
 *  1. req.query.clinicId  — GET requests pass it as a query param
 *  2. req.user.clinicId   — set by the auth middleware from the JWT
 *  3. null                — if no clinic found, return null
 */
function resolveClinicId(req) {
  const id = req.query?.clinicId || req.user?.clinicId || null;
  return toObjectId(id);
}

router.get('/stats', auth, async (req, res) => {
  try {
    const clinicId = resolveClinicId(req);
    const role = req.user.role;
    const userId = req.user.id;

    // ── If no clinicId, return empty stats (prevents ObjectId cast errors) ──
    if (!clinicId) {
      return res.json({
        totalPatients: 0,
        activePatients: 0,
        admittedPatients: 0,
        todayAppointments: 0,
        pendingAppointments: 0,
        totalRevenue: 0,
        pendingBills: 0,
        lowStockItems: 0,
        pendingLabs: 0,
        monthlyRevenue: [],
        recentAppointments: [],
        recentAdmissions: [],
        myPatients: 0,
        myAdmittedPatients: 0,
        pendingLabsDoctor: 0,
        activePatientsNurse: 0,
        totalMeds: 0,
        outOfStock: 0,
        pendingOrders: 0,
        lowStockMeds: [],
        completedLabs: 0,
        urgentLabs: 0,
        totalLabs: 0,
        pendingLabList: []
      });
    }

    // ✅ FIX: Patient no longer has a `clinicId` field — it has `clinicIds`
    // (an array, since a patient can belong to multiple clinics). Mongo
    // matches `{ clinicIds: clinicId }` as "array contains this id", same
    // pattern used in routes/patients.js. Every Patient query in this file
    // was still querying the old (nonexistent) `clinicId` field, which is
    // why patient-derived counts always showed 0 regardless of real data.
    const patientClinicFilter = { clinicIds: clinicId };

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);

    /* ── Helpers shared across roles ──────────────────────── */
    const todayAppointments = await Appointment.countDocuments({ 
      clinicId, 
      date: { $gte: today, $lt: tomorrow } 
    });
    const pendingAppointments = await Appointment.countDocuments({ 
      clinicId, 
      status: 'Scheduled' 
    });
    const recentAppointments = await Appointment
      .find({ clinicId, date: { $gte: today, $lt: tomorrow } })
      .populate('patient', 'name')
      .populate('doctor', 'name')
      .sort({ time: 1 })
      .limit(5);

    const admittedPatients = await Admission.countDocuments({ 
      clinicId, 
      status: 'Admitted' 
    });

    /* ──────────────────────────────────────────────────────
       ADMIN — full stats
    ────────────────────────────────────────────────────── */
    if (role === 'admin' || role === 'super_admin') {
      const sixMonthsAgo = new Date(); sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      const [
        totalPatients, activePatients, totalRevenue,
        pendingBills, lowStockItems, pendingLabs, monthlyRevenue,
      ] = await Promise.all([
        Patient.countDocuments(patientClinicFilter),
        Patient.countDocuments({ ...patientClinicFilter, status: 'Active' }),
        Billing.aggregate([
          { $match: { clinicId, paymentStatus: 'Paid' } },
          { $group: { _id: null, total: { $sum: '$totalAmount' } } },
        ]),
        Billing.countDocuments({ clinicId, paymentStatus: 'Pending' }),
        Inventory.countDocuments({ clinicId, quantity: { $lt: 10 } }),
        // ✅ FIX: Lab.status enum is ['Ordered', 'Sample Collected',
        // 'Processing', 'Completed', 'Cancelled'] — there is no 'Pending'
        // value on the Lab document itself (only on individual test
        // sub-entries). A freshly ordered lab starts as 'Ordered', so that
        // is the "awaiting action" state to count here.
        Lab.countDocuments({ clinicId, status: { $in: ['Ordered', 'Sample Collected', 'Processing'] } }),
        Billing.aggregate([
          {
            $match: {
              clinicId,
              paymentStatus: 'Paid',
              createdAt: { $gte: sixMonthsAgo }
            }
          },
          {
            $group: {
              _id: {
                month: { $month: '$createdAt' },
                year: { $year: '$createdAt' }
              },
              total: { $sum: '$totalAmount' }
            }
          },
          {
            $sort: {
              '_id.year': 1,
              '_id.month': 1
            }
          }
        ])
      ]);

      const recentAdmissions = await Admission.find({ clinicId, status: 'Admitted' })
        .populate('patient', 'name patientId')
        .populate('doctor', 'name')
        .sort({ admissionDate: -1 })
        .limit(5);

      return res.json({
        totalPatients,
        activePatients,
        admittedPatients,
        todayAppointments,
        pendingAppointments,
        totalRevenue: totalRevenue[0]?.total || 0,
        pendingBills,
        lowStockItems,
        pendingLabs,
        monthlyRevenue,
        recentAppointments,
        recentAdmissions,
      });
    }

    /* ──────────────────────────────────────────────────────
       DOCTOR — my patients + my appointments + labs + IPD
    ────────────────────────────────────────────────────── */
    if (role === 'doctor' || role === 'separate_doctor') {
      const myPatients = await Appointment.distinct('patient', { clinicId, doctor: userId });
      // ✅ FIX: same Lab.status enum issue as above, plus Lab has no
      // `doctor` field on the schema (it references patient/orderedBy) —
      // querying `doctor: userId` here would never match anything even if
      // the status were valid. Scoping to clinic + "not yet completed" is
      // the closest correct equivalent until a doctor field is added to Lab.
      const pendingLabs = await Lab.countDocuments({
        clinicId,
        status: { $in: ['Ordered', 'Sample Collected', 'Processing'] },
      });
      const myAdmittedPatients = await Admission.countDocuments({ clinicId, doctor: userId, status: 'Admitted' });

      return res.json({
        myPatients: myPatients.length,
        admittedPatients: myAdmittedPatients,
        todayAppointments,
        pendingAppointments,
        pendingLabs,
        recentAppointments: recentAppointments.filter(a => String(a.doctor?._id) === String(userId)),
      });
    }

    /* ──────────────────────────────────────────────────────
       NURSE — active patients + admitted + today schedule + pending labs
    ────────────────────────────────────────────────────── */
    if (role === 'nurse') {
      const activePatients = await Patient.countDocuments({ ...patientClinicFilter, status: 'Active' });
      const pendingLabs = await Lab.countDocuments({
        clinicId,
        status: { $in: ['Ordered', 'Sample Collected', 'Processing'] },
      });

      return res.json({
        activePatients,
        admittedPatients,
        todayAppointments,
        pendingLabs,
        recentAppointments,
      });
    }

    /* ──────────────────────────────────────────────────────
       RECEPTIONIST — today appts + pending bills + admitted
    ────────────────────────────────────────────────────── */
    if (role === 'receptionist') {
      const [totalPatients, pendingBills] = await Promise.all([
        Patient.countDocuments(patientClinicFilter),
        Billing.countDocuments({ clinicId, paymentStatus: 'Pending' }),
      ]);

      const recentAdmissions = await Admission.find({ clinicId, status: 'Admitted' })
        .populate('patient', 'name patientId')
        .populate('doctor', 'name')
        .sort({ admissionDate: -1 })
        .limit(5);

      return res.json({
        todayAppointments,
        pendingAppointments,
        pendingBills,
        totalPatients,
        admittedPatients,
        recentAppointments,
        recentAdmissions,
      });
    }

    /* ──────────────────────────────────────────────────────
       PHARMACIST — stock levels + pending orders
    ────────────────────────────────────────────────────── */
    if (role === 'pharmacist') {
      const [lowStockItems, outOfStock, pendingOrders, totalMeds, lowStockMeds] = await Promise.all([
        Inventory.countDocuments({ clinicId, quantity: { $gt: 0, $lt: 10 } }),
        Inventory.countDocuments({ clinicId, quantity: 0 }),
        Pharmacy.countDocuments({ clinicId, status: 'Pending' }),
        Inventory.countDocuments({ clinicId }),
        Inventory.find({ clinicId, quantity: { $lt: 10 } }).sort({ quantity: 1 }).limit(8),
      ]);

      return res.json({ lowStockItems, outOfStock, pendingOrders, totalMeds, lowStockMeds });
    }

    /* ──────────────────────────────────────────────────────
       LAB TECH — pending/completed/urgent tests
    ────────────────────────────────────────────────────── */
    if (role === 'lab_technician') {
      // ✅ FIX: 'Pending' -> 'Ordered' (real enum value for a freshly
      // ordered, not-yet-actioned lab), and priority 'urgent' -> 'Urgent'
      // (Lab.priority enum is ['Normal', 'Urgent', 'STAT'], case-sensitive).
      const [pendingLabs, completedLabs, urgentLabs, totalLabs, pendingLabList] = await Promise.all([
        Lab.countDocuments({ clinicId, status: 'Ordered' }),
        Lab.countDocuments({ clinicId, status: 'Completed', updatedAt: { $gte: today } }),
        Lab.countDocuments({ clinicId, status: { $ne: 'Completed' }, priority: { $in: ['Urgent', 'STAT'] } }),
        Lab.countDocuments({ clinicId }),
        Lab.find({ clinicId, status: 'Ordered' })
          .populate('patient', 'name')
          .sort({ priority: -1, createdAt: 1 })
          .limit(8),
      ]);

      return res.json({ pendingLabs, completedLabs, urgentLabs, totalLabs, pendingLabList });
    }

    /* Fallback */
    return res.json({ todayAppointments, pendingAppointments, recentAppointments });

  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;