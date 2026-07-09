// hms-backend/tests/payroll.test.js
import { expect } from 'chai';
import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import User from '../models/User.js';
import Clinic from '../models/Clinic.js';
import Payroll from '../models/Payroll.js';
import payrollRoutes from '../routes/payroll.js';
import jwt from 'jsonwebtoken';

let mongoServer;
let app;
let superAdminToken;
let doctorToken;
let superAdminUser;
let doctorUser;
let clinic;

const JWT_SECRET = 'super_secret_for_hms';
process.env.JWT_SECRET = JWT_SECRET;

before(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  // Setup Express app
  app = express();
  app.use(express.json());
  
  // Setup routes
  app.use('/api/payroll', payrollRoutes);
  
  // Seed a clinic
  clinic = await Clinic.create({
    name: 'Test Clinic',
    email: 'clinic@test.com',
    phone: '1234567890'
  });

  // Seed users
  superAdminUser = await User.create({
    name: 'Super Admin',
    email: 'superadmin@test.com',
    password: 'password123',
    role: 'super_admin',
    clinicId: clinic._id
  });

  doctorUser = await User.create({
    name: 'Doctor User',
    email: 'doctor@test.com',
    password: 'password123',
    role: 'doctor',
    clinicId: clinic._id,
    baseSalary: 50000
  });

  // Generate tokens
  superAdminToken = jwt.sign({ id: superAdminUser._id, role: 'super_admin', clinicId: clinic._id }, JWT_SECRET);
  doctorToken = jwt.sign({ id: doctorUser._id, role: 'doctor', clinicId: clinic._id }, JWT_SECRET);
});

after(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Payroll Management E2E/Integration Tests', () => {
  describe('Authorization Checks', () => {
    it('should deny access if no auth token is provided', async () => {
      const res = await request(app).get('/api/payroll');
      expect(res.status).to.equal(401);
    });

    it('should deny access to non-superadmin users', async () => {
      const res = await request(app)
        .get('/api/payroll')
        .set('Authorization', `Bearer ${doctorToken}`);
      expect(res.status).to.equal(403);
      expect(res.body.message).to.equal('Access denied. Required role: super_admin');
    });

    it('should allow access to superadmin users', async () => {
      const res = await request(app)
        .get('/api/payroll')
        .set('Authorization', `Bearer ${superAdminToken}`);
      expect(res.status).to.equal(200);
      expect(res.body.success).to.be.true;
    });
  });

  describe('Salary Configuration', () => {
    it('should update base salary of a staff member', async () => {
      const res = await request(app)
        .put('/api/payroll/base-salary')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ staffId: doctorUser._id, baseSalary: 75000 });

      expect(res.status).to.equal(200);
      expect(res.body.success).to.be.true;
      expect(res.body.user.baseSalary).to.equal(75000);

      // Verify DB change
      const updatedUser = await User.findById(doctorUser._id);
      expect(updatedUser.baseSalary).to.equal(75000);
    });
  });

  describe('Payroll Slip Generation', () => {
    it('should generate a payroll record for a doctor', async () => {
      const res = await request(app)
        .post('/api/payroll/generate')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          staffId: doctorUser._id,
          month: 6,
          year: 2026,
          allowances: 5000,
          deductions: 2000,
          notes: 'June performance bonus'
        });

      expect(res.status).to.equal(201);
      expect(res.body.success).to.be.true;
      expect(res.body.payroll.netSalary).to.equal(78000); // 75000 + 5000 - 2000
      expect(res.body.payroll.status).to.equal('pending');
    });

    it('should prevent generating duplicate payroll records for the same month/year', async () => {
      const res = await request(app)
        .post('/api/payroll/generate')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          staffId: doctorUser._id,
          month: 6,
          year: 2026,
          allowances: 1000,
          deductions: 0
        });

      expect(res.status).to.equal(400);
      expect(res.body.success).to.be.false;
      expect(res.body.message).to.contain('already exists');
    });
  });

  describe('Record Payments & Delete Slips', () => {
    let payrollRecord;

    beforeEach(async () => {
      // Remove any existing records
      await Payroll.deleteMany({});
      // Create a fresh pending record
      payrollRecord = await Payroll.create({
        staffId: doctorUser._id,
        clinicId: clinic._id,
        month: 7,
        year: 2026,
        baseSalary: 75000,
        netSalary: 75000,
        status: 'pending'
      });
    });

    it('should record salary payment details', async () => {
      const res = await request(app)
        .put(`/api/payroll/${payrollRecord._id}/pay`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          paymentMethod: 'UPI',
          transactionId: 'TXN778899',
          notes: 'Paid successfully'
        });

      expect(res.status).to.equal(200);
      expect(res.body.success).to.be.true;
      expect(res.body.payroll.status).to.equal('paid');
      expect(res.body.payroll.paymentMethod).to.equal('UPI');
      expect(res.body.payroll.transactionId).to.equal('TXN778899');
    });

    it('should delete pending payroll records', async () => {
      const res = await request(app)
        .delete(`/api/payroll/${payrollRecord._id}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).to.equal(200);
      expect(res.body.success).to.be.true;

      const check = await Payroll.findById(payrollRecord._id);
      expect(check).to.be.null;
    });

    it('should prevent deletion of paid payroll records', async () => {
      // Mark as paid
      payrollRecord.status = 'paid';
      await payrollRecord.save();

      const res = await request(app)
        .delete(`/api/payroll/${payrollRecord._id}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).to.equal(400);
      expect(res.body.success).to.be.false;
    });
  });
});
