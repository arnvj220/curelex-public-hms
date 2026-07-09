// hms-backend/server.js

// MUST be the very first import — loads .env before any other module runs
import 'dotenv/config';

import "./config/env.js"
import { fileURLToPath } from 'url';
import path from 'path';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import http from 'http';
import { Server } from 'socket.io';
import cron from 'node-cron';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
// Models (USED IN CRON + SEED)
import Task from './models/Task.js';
import Notification from './models/Notification.js';
import User from './models/User.js';
// import clinicApp from './clinic/clinic/app.js';
import stripeWebhookRouter from './webhooks/stripeWebhook.js';

// Routes
import authRoutes from './routes/auth.js';
import patientRoutes from './routes/patients.js';
import billingRoutes from './routes/billing.js';
import billingRequestRoutes from './routes/billingRequests.js';
import admissionRoutes from './routes/admissions.js';
import pharmacyRoutes from './routes/pharmacy.js';
import labRoutes from './routes/lab.js';
import inventoryRoutes from './routes/inventory.js';
import vendorRoutes from './routes/vendors.js';
import equipmentRoutes from './routes/equipment.js';
import dashboardRoutes from './routes/dashboard.js';
import staffRoutes from './routes/staff.js';
import tokenRoutes from './routes/tokens.js';
import patientRecordRoutes from './routes/patientRecords.js';
import staffWorkRoutes from './routes/staffWork.js';
import roomRoutes from './routes/room.js';
import patientPortalRoutes from './routes/patientPortal.js';
import clinicRoutes from './routes/clinics.js';
import fileRoutes from './routes/files.js';
import emergencyRoutesFactory from './routes/emergency.js';
import taskRoutesFactory from './routes/tasks.js';
import prescriptionRoutes from './routes/prescriptions.js';
import medicineRoutes from './routes/medicines.js';
import documentRoutes from './routes/documents.js';
import telemedicineRoutes from './routes/telemedicine.js';
import feedbackRoutes from './routes/feedback.js';
import payrollRoutes from './routes/payroll.js';
import imsRoutes from './ims/src/routes/index.js';
import {notFound, errorHandler} from './ims/src/middleware/errorHandler.js';
import consultationRoutes from './routes/consultations.js';
// __dirname fix (ESM)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// App setup
const app = express();
const server = http.createServer(app);

// Socket.IO
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "DELETE"]
  }
});

// Make io available globally and in routes
global.io = io;
app.set('io', io);

// Middleware to attach io to req
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Middleware
app.use(cors({
  origin: [
    // 'https://curelex.in',
    // 'https://www.curelex.in',
    'http://localhost:5173',
    'http://localhost:5174'
  ],
  credentials: true,
}));

app.use('/api/v1/ims/reports/download-pdf', helmet({ contentSecurityPolicy: false }));
app.use('/api/reports/download-pdf',        helmet({ contentSecurityPolicy: false }));
app.use(helmet());

app.use('/api/clinic/webhooks/stripe', stripeWebhookRouter);

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));
app.use(cookieParser());

app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, limit: 500 }));

// Debug logger
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// MongoDB
import { MongoMemoryServer } from 'mongodb-memory-server';
// import { clinicConnection } from './clinic/clinic/config/db.js';

// ── Seed Demo Accounts and Super Admin on boot ───────────────────────────
async function seedSuperAdmin() {
  try {
    // 1. Seed Super Admin
    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || 'superadmin@curelex.com';
    const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD || 'Password123';
    
    let existingSuper = await User.findOne({ role: 'super_admin' });
    if (!existingSuper) {
      await User.create({
        name: 'Super Admin',
        email: superAdminEmail,
        password: superAdminPassword,
        role: 'super_admin',
        clinicId: null,
        permissions: [
          'dashboard', 'patients', 'ipd', 'billing', 'billing-requests',
          'prescriptions', 'pharmacy', 'lab', 'inventory',
          'room-settings', 'staff', 'telemedicine', 'tokens', 'emergency', 'tasks', 'super'
        ],
        isActive: true,
      });
      console.log(`🚀 Seeded Super Admin: ${superAdminEmail} / ${superAdminPassword}`);
    }

    // Load Clinic model
    const Clinic = (await import('./models/Clinic.js')).default;
    const Patient = (await import('./models/Patient.js')).default;

    // Create a demo Clinic
    let demoClinic = await Clinic.findOne({ name: 'Curelex Demo Clinic' });
    if (!demoClinic) {
      demoClinic = await Clinic.create({
        name: 'Curelex Demo Clinic',
        email: 'clinic@curelex.com',
        phone: '1234567890',
        type: 'clinic',
        plan: 'pro',
        status: 'Active'
      });
      console.log(`🚀 Seeded Demo Clinic: Curelex Demo Clinic`);
    }

    // 2. Seed Clinic Admin
    const adminEmail = 'admin@curelex.com';
    let existingAdmin = await User.findOne({ email: adminEmail });
    if (!existingAdmin) {
      await User.create({
        name: 'Clinic Admin',
        email: adminEmail,
        password: 'Password123',
        role: 'admin',
        clinicId: demoClinic._id,
        permissions: [
          'dashboard', 'patients', 'ipd', 'billing', 'billing-requests',
          'pharmacy', 'lab', 'inventory', 'staff', 'room-settings', 'prescriptions'
        ],
        isActive: true,
      });
      console.log(`🚀 Seeded Clinic Admin: ${adminEmail} / Password123`);
    }

    // 3. Seed Doctor
    const doctorEmail = 'doctor@curelex.com';
    let existingDoctor = await User.findOne({ email: doctorEmail });
    if (!existingDoctor) {
      await User.create({
        name: 'Dr. Elizabeth Blackwell',
        email: doctorEmail,
        password: 'Password123',
        role: 'doctor',
        clinicId: demoClinic._id,
        permissions: ['dashboard', 'patients', 'ipd', 'lab', 'prescriptions', 'telemedicine'],
        isActive: true,
      });
      console.log(`🚀 Seeded Doctor: ${doctorEmail} / Password123`);
    }

    // 4. Seed Patient
    const patientEmail = 'patient@curelex.com';
    let existingPatient = await User.findOne({ email: patientEmail });
    if (!existingPatient) {
      const patientUser = await User.create({
        name: 'Lenin J',
        email: patientEmail,
        password: 'Password123',
        role: 'patient',
        clinicId: demoClinic._id,
        permissions: ['patient-dashboard', 'appointments', 'prescriptions', 'profile', 'telemedicine'],
        isActive: true,
      });

      await Patient.create({
        userId: patientUser._id,
        name: 'Lenin J',
        email: patientEmail,
        phone: '9876543210',
        clinicIds: [demoClinic._id],
        status: 'Active',
        registrationDate: new Date()
      });
      console.log(`🚀 Seeded Patient: ${patientEmail} / Password123`);
    }

  } catch (err) {
    console.error('❌ Seeding failed:', err.message);
  }
}

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('MongoDB Connected');
    await seedSuperAdmin();
  })
  .catch(async err => {
    console.log('⚠️ MongoDB connection failed or URI missing. Starting in-memory database as fallback for testing...');
    try {
      const mongoServer = await MongoMemoryServer.create();
      const mongoUri = mongoServer.getUri();
      await mongoose.connect(mongoUri);
      console.log('✅ MongoDB Connected to in-memory database successfully');
      await seedSuperAdmin();
    } catch (memErr) {
      console.error('❌ Failed to start in-memory database:', memErr);
    }
  });

// ---------------- SOCKET EVENTS ----------------
io.on('connection', (socket) => {
  console.log('🔌 New socket connection:', socket.id);

  // ── Existing events ──
  socket.on('doctor:join', (doctorId) => {
    if (doctorId) {
      socket.join(`doctor_${doctorId}`);
      console.log(`👨‍⚕️ Doctor ${doctorId} joined room`);
    }
  });

  socket.on('staff:join', () => {
    socket.join('emergency_staff');
    console.log('🩺 Staff joined emergency room');
  });

  // ─── TELEMEDICINE SOCKET EVENTS ───

  // Initialize doctor status storage
  if (!global.doctorStatus) {
    global.doctorStatus = new Map();
  }
  if (!global.socketToDoctor) {
    global.socketToDoctor = new Map();
  }

  // ── FIX: Doctor goes online/offline ──
  // Broadcast to ALL patients (not just clinic-filtered) because clinicId
  // on the doctor's JWT may differ from the clinicId stored on patient records.
  socket.on('doctor:status', async ({ doctorId, status, clinicId }) => {
    if (!doctorId) return;

    global.doctorStatus.set(doctorId, {
      status: status,
      lastSeen: new Date(),
      clinicId: clinicId,
      socketId: socket.id
    });

    socket.join(`doctor_${doctorId}`);
    global.socketToDoctor.set(socket.id, doctorId);

    // Broadcast to ALL connected patients so the online indicator always works
    io.emit('doctor:status-change', {
      doctorId,
      status,
      timestamp: new Date()
    });

    console.log(`👨‍⚕️ Doctor ${doctorId} is now ${status}`);
  });

  socket.on('doctor:register-socket', ({ doctorId }) => {
    global.socketToDoctor.set(socket.id, doctorId);
    console.log(`📝 Registered socket ${socket.id} to doctor ${doctorId}`);
  });

  socket.on('patient:join-clinic', ({ clinicId, patientId }) => {
    // Always join the personal patient room — this is what matters for
    // receiving targeted events (payment, status updates, meeting links).
    if (patientId) {
      socket.join(`patient_${patientId}`);
      console.log(`👤 Patient ${patientId} joined personal room`);
    }
    // Also join clinic room if clinicId is available (non-critical)
    if (clinicId) {
      socket.join(`clinic_${clinicId}_patients`);
      console.log(`👤 Patient ${patientId} joined clinic ${clinicId} room`);
    }
  });

  // ── FIX: doctor:get-online — removed clinicId filter ──
  // clinicId on doctor JWT != clinicId stored on patient, so the filter
  // always returned 0 results for patients. Return ALL online doctors instead.
  socket.on('doctor:get-online', ({ clinicId }, callback) => {
    const onlineDoctors = [];
    for (const [docId, data] of global.doctorStatus.entries()) {
      if (data.status === 'online') {
        onlineDoctors.push({
          doctorId: docId,
          lastSeen: data.lastSeen,
          status: data.status
        });
      }
    }

    if (callback && typeof callback === 'function') {
      callback(onlineDoctors);
    } else {
      socket.emit('doctor:online-list', { onlineDoctors });
    }
  });

  // Telemedicine specific events
  socket.on('telemedicine:request-sent', ({ doctorId, patientId, requestId, patientName, urgency }) => {
    io.to(`doctor_${doctorId}`).emit('telemedicine:new-request', {
      requestId,
      patientId,
      patientName,
      urgency,
      timestamp: new Date(),
      message: `📱 New telemedicine request from ${patientName}`
    });
  });

  socket.on('telemedicine:status-update', ({ requestId, patientId, doctorId, status, notes }) => {
    io.to(`patient_${patientId}`).emit('telemedicine:status-update', {
      requestId,
      status,
      notes,
      timestamp: new Date()
    });
    io.to(`doctor_${doctorId}`).emit('telemedicine:status-update', {
      requestId,
      status,
      notes,
      timestamp: new Date()
    });
  });

  // ── Payment related socket events ──
  socket.on('telemedicine:payment-required', ({ requestId, patientId, doctorId, consultationFee }) => {
    io.to(`patient_${patientId}`).emit('telemedicine:payment-required', {
      requestId,
      doctorId,
      consultationFee,
      timestamp: new Date(),
      message: `💳 Payment required: ₹${consultationFee}`
    });
  });

  socket.on('telemedicine:payment-success', ({ requestId, patientId, doctorId, meetingLink }) => {
    io.to(`patient_${patientId}`).emit('telemedicine:payment-success', {
      requestId,
      meetingLink,
      timestamp: new Date(),
      message: '✅ Payment successful! Consultation confirmed.'
    });
    io.to(`doctor_${doctorId}`).emit('telemedicine:payment-received', {
      requestId,
      patientId,
      timestamp: new Date(),
      message: '✅ Payment received'
    });
  });

  socket.on('telemedicine:payout-requested', ({ requestId, doctorId, amount }) => {
    io.to(`doctor_${doctorId}`).emit('telemedicine:payout-requested', {
      requestId,
      amount,
      timestamp: new Date(),
      message: `💰 Payout requested: ₹${amount}`
    });
  });

  socket.on('telemedicine:payout-approved', ({ requestId, doctorId, amount }) => {
    io.to(`doctor_${doctorId}`).emit('telemedicine:payout-approved', {
      requestId,
      amount,
      timestamp: new Date(),
      message: `✅ Payout approved: ₹${amount}`
    });
  });

  socket.on('telemedicine:meeting-started', ({ requestId, patientId, doctorId, meetingLink }) => {
    io.to(`patient_${patientId}`).emit('telemedicine:meeting-started', {
      requestId,
      meetingLink,
      doctorId,
      timestamp: new Date()
    });
  });

  socket.on('telemedicine:meeting-ended', ({ requestId, patientId, doctorId, duration }) => {
    io.to(`patient_${patientId}`).emit('telemedicine:meeting-ended', {
      requestId,
      duration,
      doctorId,
      timestamp: new Date()
    });
    io.to(`doctor_${doctorId}`).emit('telemedicine:meeting-ended', {
      requestId,
      duration,
      patientId,
      timestamp: new Date()
    });
  });

  // socket.on('join_queue', ({ clinicId, doctorId, date }) => {
  //   const room = `queue_${clinicId}_${doctorId}_${date}`;
  //   socket.join(room);

  //   console.log(`Joined ${room}`);
// });

  socket.on('disconnect', () => {
    console.log('🔌 Socket disconnected:', socket.id);
    const doctorId = global.socketToDoctor.get(socket.id);
    if (doctorId && global.doctorStatus) {
      const status = global.doctorStatus.get(doctorId);
      if (status) {
        status.status = 'offline';
        status.lastSeen = new Date();
        global.doctorStatus.set(doctorId, status);

        // FIX: Broadcast to ALL patients on disconnect too
        io.emit('doctor:status-change', {
          doctorId,
          status: 'offline',
          timestamp: new Date()
        });
        console.log(`👨‍⚕️ Doctor ${doctorId} is now offline (disconnected)`);
      }
      global.socketToDoctor.delete(socket.id);
    }
  });
});

// Inject io into factories
const emergencyRoutes = emergencyRoutesFactory(io);
const tasksRoutes = taskRoutesFactory(io);

// ---------------- CRON JOB ----------------
cron.schedule('0 * * * *', async () => {
  try {
    const now = new Date();

    const overdueTasks = await Task.find({
      deadline: { $lt: now },
      status: { $ne: 'Completed' }
    });

    for (const task of overdueTasks) {
      io.to(`doctor_${task.assignedTo}`).emit('task:overdue', task);
    }

    const slaTasks = await Task.find({
      slaHours: { $gt: 0 },
      slaBreached: { $ne: true },
      status: { $ne: 'Completed' }
    });

    for (const task of slaTasks) {
      const slaDeadline =
        new Date(task.createdAt.getTime() + task.slaHours * 60 * 60 * 1000);

      if (now >= slaDeadline) {
        task.slaBreached = true;
        task.slaBreachedAt = now;
        await task.save();

        await Notification.create({
          userId: task.assignedTo,
          message: `SLA BREACHED: ${task.title}`,
          taskId: task._id,
          clinicId: task.clinicId
        });

        io.to(`doctor_${task.assignedTo}`).emit('task:sla-breach', task);
      }
    }

    console.log('Cron executed successfully');
  } catch (err) {
    console.error('Cron error:', err);
  }
});

// ---------------- ROUTES ----------------
app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/billing-requests', billingRequestRoutes);
app.use('/api/admissions', admissionRoutes);
app.use('/api/pharmacy', pharmacyRoutes);
app.use('/api/lab', labRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/vendors', vendorRoutes);
app.use('/api/equipment', equipmentRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/tokens', tokenRoutes);
app.use('/api/patient-records', patientRecordRoutes);
app.use('/api/staff-work', staffWorkRoutes);
app.use('/api/room-settings', roomRoutes);
app.use('/api/patient-portal', patientPortalRoutes);
app.use('/api/clinics', clinicRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/emergency', emergencyRoutes);
app.use('/api/prescriptions', prescriptionRoutes);
app.use('/api/medicines', medicineRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/telemedicine', telemedicineRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/consultations', consultationRoutes);
app.use('/api/v1/ims', imsRoutes);

// app.use('/api/clinic', clinicApp);

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        db: mongoose.connection.readyState === 1
            ? 'connected'
            : 'disconnected',
        endpoints: {
            hms: '/api',
            ims: '/api/v1/ims',
            clinic: '/api/clinic'
        },
        websockets: true
    });
});

app.use(notFound);
app.use(errorHandler);

// await clinicConnection.asPromise();

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});