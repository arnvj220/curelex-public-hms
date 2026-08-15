// hms-backend/scripts/seedDemoHospitals.js
//
// One-time demo-data seeder. Creates two fully-populated demo hospitals
// (staff, patients, appointments, admissions, billing, pharmacy stock, lab
// orders, today's token queue, and IMS products/sales) so the dashboards
// look like a real, active hospital instead of an empty trial account.
//
// This is a standalone script — it does NOT run as part of the live server
// boot path, so it never touches real clinic data by accident.
//
// Usage:
//   cd hms-backend
//   MONGO_URI="mongodb://..." node scripts/seedDemoHospitals.js
//   (or just `node scripts/seedDemoHospitals.js` if MONGO_URI is in your .env)
//
// Safe to re-run: if a demo clinic (matched by its fixed admin email) already
// exists, that clinic is skipped entirely rather than duplicated. Delete the
// clinic's data first if you want a completely fresh reseed.
//
// After it creates the two clinics, use scripts/generateDailyTokens.js
// (wired to a daily cron job) to keep the token queue looking active going
// forward — see the printed instructions at the end of this script.

import 'dotenv/config';
import mongoose from 'mongoose';

import Clinic from '../models/Clinic.js';
import User from '../models/User.js';
import DoctorProfile from '../models/DoctorProfile.js';
import Patient from '../models/Patient.js';
import Appointment from '../models/Appointment.js';
import Admission from '../models/Admission.js';
import Billing from '../models/Billing.js';
import Inventory from '../models/Inventory.js';
import Lab from '../models/Lab.js';
// Registers the Medicine model — Inventory's post-save hook looks it up by
// name via mongoose.model('Medicine') to auto-sync stock, and throws a
// MissingSchemaError if nothing has imported it yet. Side-effect import only.
import '../models/Medicine.js';

import Product from '../ims/src/models/Product.js';
import ImsInventory from '../ims/src/models/Inventory.js';
import Customer from '../ims/src/models/Customer.js';
import Sale from '../ims/src/models/Sale.js';

import {
  DEMO_CLINICS, MEDICINES, LAB_TESTS,
  pick, randomInt, randomName, randomPhone, randomPassword, daysAgo,
  createTokensForDate,
} from './demoData.helpers.js';

const credentials = []; // { clinic, role, email, password }

function logCred(clinic, role, email, password) {
  credentials.push({ clinic, role, email, password });
}

async function createStaff(clinicDoc, clinicKey, role, dept, feeInfo) {
  const { name, gender } = randomName();
  const emailSlug = name.toLowerCase().replace(/\s+/g, '.') + Math.random().toString(36).slice(2, 6);
  const email = `${emailSlug}@${clinicKey}-demo.curelex.in`;
  const password = randomPassword();

  const permissionsByRole = {
    admin: ['dashboard', 'patients', 'billing', 'staff', 'pharmacy', 'lab', 'admissions', 'reports', 'inventory'],
    doctor: ['dashboard', 'patients', 'appointments', 'prescriptions', 'admissions', 'lab'],
    nurse: ['dashboard', 'patients', 'admissions', 'lab'],
    receptionist: ['dashboard', 'patients', 'appointments', 'billing', 'tokens'],
    pharmacist: ['dashboard', 'pharmacy', 'inventory'],
    lab_technician: ['dashboard', 'lab'],
  };

  const user = await User.create({
    name,
    email,
    password,
    role,
    department: dept,
    phone: randomPhone(),
    isActive: true,
    clinicId: clinicDoc._id,
    permissions: permissionsByRole[role] || ['dashboard'],
    consultationFee: role === 'doctor' ? (feeInfo || 500) : 0,
  });

  logCred(clinicDoc.name, role, email, password);

  if (role === 'doctor') {
    await DoctorProfile.create({
      userId: user._id,
      name,
      email,
      mobile: user.phone,
      specialization: dept,
      qualification: pick(['MBBS, MD', 'MBBS, MS', 'MBBS, DNB', 'MBBS, MD, DM']),
      experience: randomInt(3, 22),
      licenseNumber: 'MCI' + randomInt(100000, 999999),
      currentInstitute: clinicDoc.name,
      consultationFee: feeInfo || 500,
      bio: `Experienced ${dept} specialist at ${clinicDoc.name}.`,
      verificationStatus: 'approved',
      isActive: true,
    });
  }

  return { user, gender };
}

async function createPatient(clinicDoc, registeredByUser, viaPortal) {
  const { name, gender } = randomName();
  const phone = randomPhone();
  const emailSlug = name.toLowerCase().replace(/\s+/g, '.') + Math.random().toString(36).slice(2, 6);
  const email = `${emailSlug}@example-patient.curelex.in`;
  const dob = new Date(1950 + randomInt(0, 65), randomInt(0, 11), randomInt(1, 28));
  const age = new Date().getFullYear() - dob.getFullYear();

  let userId = null;
  let password = null;

  if (viaPortal) {
    password = randomPassword();
    const patientUser = await User.create({
      name, email, password, role: 'patient',
      clinicId: clinicDoc._id,
      permissions: ['patient-dashboard', 'appointments', 'prescriptions', 'profile', 'telemedicine'],
      isActive: true,
      phone,
    });
    userId = patientUser._id;
  }

  const patient = await Patient.create({
    userId,
    name, email, phone, dob, age, gender,
    bloodGroup: pick(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']),
    address: `${randomInt(1, 200)}, ${pick(['MG Road', 'Gandhi Street', 'Park Avenue', 'Church Road', 'Market Street'])}`,
    city: clinicDoc.city,
    state: clinicDoc.state,
    pincode: clinicDoc.pincode,
    clinicIds: [clinicDoc._id],
    status: 'Active',
    registrationDate: daysAgo(randomInt(0, 120)),
    registeredBy: viaPortal ? null : registeredByUser?._id || null,
  });

  if (viaPortal) logCred(clinicDoc.name, 'patient (portal)', email, password);

  return patient;
}

async function run() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('❌ MONGO_URI not set. Export it or put it in hms-backend/.env before running this script.');
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log('✅ Connected to MongoDB\n');

  for (const def of DEMO_CLINICS) {
    const existing = await Clinic.findOne({ email: def.adminEmail });
    if (existing) {
      console.log(`⏭️  Skipping "${def.name}" — already seeded (admin email ${def.adminEmail} exists).`);
      continue;
    }

    console.log(`\n🏥 Creating ${def.name}...`);

    const clinicDoc = await Clinic.create({
      name: def.name,
      email: def.adminEmail,
      phone: def.phone,
      address: def.address,
      type: def.type,
      plan: 'pro',
      planActivatedAt: new Date().toISOString(),
      owner: def.name + ' Administration',
      state: def.state,
      district: def.district,
      city: def.city,
      pincode: def.pincode,
    });
    // ── Admin ──
    const adminPassword = randomPassword();
    const adminUser = await User.create({
      name: `${def.name} Admin`,
      email: def.adminEmail,
      password: adminPassword,
      role: 'admin',
      clinicId: clinicDoc._id,
      permissions: ['dashboard', 'patients', 'billing', 'staff', 'pharmacy', 'lab', 'admissions', 'reports', 'inventory'],
      isActive: true,
      phone: def.phone,
    });
    logCred(def.name, 'admin', def.adminEmail, adminPassword);

    // ── Doctors ──
    const doctors = [];
    for (const d of def.doctors) {
      const { user } = await createStaff(clinicDoc, def.key, 'doctor', d.dept, d.fee);
      doctors.push(user);
    }

    // ── Other staff ──
    const staffByRole = {};
    for (const s of def.staff) {
      const { user } = await createStaff(clinicDoc, def.key, s.role, s.dept);
      staffByRole[s.role] = staffByRole[s.role] || [];
      staffByRole[s.role].push(user);
    }
    const receptionist = staffByRole.receptionist?.[0] || adminUser;
    const nurse = staffByRole.nurse?.[0] || null;

    // ── Patients: mix of patient-portal-registered and staff-registered ──
    const PATIENT_COUNT = randomInt(20, 26);
    const patients = [];
    for (let i = 0; i < PATIENT_COUNT; i++) {
      const viaPortal = i < Math.round(PATIENT_COUNT * 0.4); // ~40% self-registered via portal
      const p = await createPatient(clinicDoc, receptionist, viaPortal);
      patients.push(p);
    }
    console.log(`   👥 ${patients.length} patients created`);

    // ── Appointments: spread across the last 45 days, plus a guaranteed
    // handful pinned to today so "today's appointments" never randomly
    // lands on zero (random daysBack alone made that a real possibility).
    const HISTORICAL_APPT_COUNT = randomInt(35, 50);
    const TODAY_APPT_COUNT = randomInt(4, 8);
    const daysBackForIndex = (i) => (i < TODAY_APPT_COUNT ? 0 : randomInt(1, 45));

    for (let i = 0; i < HISTORICAL_APPT_COUNT + TODAY_APPT_COUNT; i++) {
      const daysBack = daysBackForIndex(i);
      const apptDate = daysAgo(daysBack);
      apptDate.setHours(randomInt(9, 17), pick([0, 15, 30, 45]), 0, 0);
      const isPast = daysBack > 0;
      const status = isPast
        ? pick(['Completed', 'Completed', 'Completed', 'Cancelled', 'No-Show'])
        : pick(['Scheduled', 'Scheduled', 'Completed']);

      await Appointment.create({
        clinicId: String(clinicDoc._id),
        patient: pick(patients)._id,
        doctor: pick(doctors)._id,
        date: apptDate,
        time: apptDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
        status,
        reason: pick(['Fever', 'Routine Checkup', 'Follow-up', 'Consultation', 'Body pain', 'Cough & cold']),
      });
    }
    console.log(`   📅 ${HISTORICAL_APPT_COUNT + TODAY_APPT_COUNT} appointments created (${TODAY_APPT_COUNT} today)`);

    // ── Admissions: a handful currently admitted ──
    const ADMISSION_COUNT = randomInt(3, 6);
    const admittedPatients = patients.slice(0, ADMISSION_COUNT);
    for (const patient of admittedPatients) {
      const roomType = pick(['General Ward', 'General Ward', 'Semi-Private', 'Private Room', 'ICU']);
      const admissionDate = daysAgo(randomInt(0, 10));
      await Admission.create({
        clinicId: String(clinicDoc._id),
        patient: patient._id,
        doctor: pick(doctors)._id,
        admittedBy: (nurse || receptionist)._id,
        admittedByName: (nurse || receptionist).name,
        admissionDate,
        roomType,
        roomNumber: `${randomInt(1, 4)}0${randomInt(1, 9)}`,
        roomRatePerDay: roomType === 'ICU' ? 3500 : roomType === 'Private Room' ? 2000 : roomType === 'Semi-Private' ? 1200 : 800,
        status: 'Admitted',
        medicineLog: [{
          medicineName: pick(MEDICINES).name,
          dosage: '1-0-1',
          quantity: 2,
          givenAt: new Date(),
          givenBy: (nurse || receptionist)._id,
          givenByName: (nurse || receptionist).name,
        }],
        followupLog: [{
          note: 'Patient stable, vitals normal.',
          type: 'Nurse',
          writtenBy: (nurse || receptionist)._id,
          writtenByName: (nurse || receptionist).name,
          vitals: { bp: '120/80', temp: '98.6', pulse: '76', spo2: '98%' },
        }],
      });
    }
    console.log(`   🛏️  ${admittedPatients.length} active admissions created`);

    // ── Billing: spread over the last 6 months for the revenue chart ──
    const BILLING_COUNT = randomInt(45, 65);
    for (let i = 0; i < BILLING_COUNT; i++) {
      const patient = pick(patients);
      const doctor = pick(doctors);
      const itemCount = randomInt(1, 3);
      const items = [];
      for (let j = 0; j < itemCount; j++) {
        const category = pick(['Consultation', 'Medicine', 'Lab', 'Procedure']);
        const qty = category === 'Medicine' ? randomInt(1, 3) : 1;
        const unitPrice = category === 'Consultation' ? doctor.consultationFee || 500
          : category === 'Lab' ? pick(LAB_TESTS).price
          : category === 'Medicine' ? pick(MEDICINES).price
          : randomInt(300, 2000);
        items.push({
          description: category === 'Consultation' ? `Consultation - ${doctor.name}` : category,
          category,
          quantity: qty,
          unitPrice,
          total: qty * unitPrice,
        });
      }
      const subtotal = items.reduce((s, it) => s + it.total, 0);
      const paymentStatus = pick(['Paid', 'Paid', 'Paid', 'Pending', 'Partial']);
      const paidAmount = paymentStatus === 'Paid' ? subtotal : paymentStatus === 'Partial' ? Math.round(subtotal * 0.5) : 0;

      const bill = await Billing.create({
        clinicId: String(clinicDoc._id),
        patient: patient._id,
        items,
        subtotal,
        totalAmount: subtotal,
        paidAmount,
        paymentMethod: paymentStatus === 'Pending' ? 'Pending' : pick(['Cash', 'Card', 'UPI']),
        paymentStatus,
        generatedBy: receptionist._id,
      });

      // Backdate createdAt across the last 6 months for a realistic revenue
      // chart. Mongoose's timestamps plugin silently strips `createdAt` out
      // of $set on Model.updateOne() specifically to stop it being changed
      // after creation — so this has to go through the raw driver collection
      // (bypassing all Mongoose middleware) to actually stick.
      const backdate = daysAgo(randomInt(0, 180));
      await Billing.collection.updateOne({ _id: bill._id }, { $set: { createdAt: backdate } });
    }
    console.log(`   💳 ${BILLING_COUNT} billing records created (spread over 6 months)`);

    // ── Pharmacy stock (Inventory) ──
    for (const med of MEDICINES) {
      const quantity = pick([0, 0, randomInt(1, 9), randomInt(1, 9), randomInt(20, 300), randomInt(20, 300), randomInt(20, 300)]);
      await Inventory.create({
        clinicId: clinicDoc._id,
        name: med.name,
        category: 'Medicine',
        description: `${med.form} — standard stock item`,
        quantity,
        unit: med.form === 'Syrup' ? 'Bottles' : med.form === 'Injection' ? 'Vials' : 'Units',
        unitPrice: med.price,
        reorderLevel: 10,
        supplier: { name: pick(['MedPlus Distributors', 'Apollo Pharma Supply', 'Wellness Wholesale']), contact: randomPhone() },
        lastRestockedAt: daysAgo(randomInt(1, 30)),
        status: 'Active',
      });
    }
    console.log(`   💊 ${MEDICINES.length} pharmacy inventory items created`);

    // ── Lab orders ──
    const LAB_COUNT = randomInt(10, 16);
    for (let i = 0; i < LAB_COUNT; i++) {
      const testCount = randomInt(1, 2);
      const tests = [];
      for (let j = 0; j < testCount; j++) {
        const t = pick(LAB_TESTS);
        tests.push({
          testName: t.testName,
          category: t.category,
          price: t.price,
          status: pick(['Pending', 'Processing', 'Completed', 'Completed']),
        });
      }
      await Lab.create({
        clinicId: clinicDoc._id,
        patient: pick(patients)._id,
        orderedBy: pick(doctors)._id,
        tests,
        totalAmount: tests.reduce((s, t) => s + t.price, 0),
        priority: pick(['Normal', 'Normal', 'Normal', 'Urgent', 'STAT']),
        status: pick(['Ordered', 'Sample Collected', 'Processing', 'Completed', 'Completed']),
      });
    }
    console.log(`   🧪 ${LAB_COUNT} lab orders created`);

    // ── Today's token queue (15-20) ──
    const tokenCount = await createTokensForDate(clinicDoc, doctors, patients, receptionist, new Date());
    console.log(`   🎫 ${tokenCount} tokens generated for today`);

    // ── IMS: products, stock, customers, sales ──
    await seedImsData(clinicDoc, staffByRole.pharmacist?.[0] || adminUser, patients);
    console.log(`   🛒 IMS products/customers/sales created`);
  }

  // Let Inventory's post-save setImmediate Medicine-sync hooks flush before we disconnect.
  await new Promise((resolve) => setTimeout(resolve, 2000));

  printCredentials();

  await mongoose.disconnect();
  console.log('\n✅ Done.');
}


async function seedImsData(clinicDoc, pharmacistUser, patients) {
  const clinicIdStr = String(clinicDoc._id);
  const products = [];

  for (let i = 0; i < MEDICINES.length; i++) {
    const med = MEDICINES[i];
    const costPrice = med.price;
    const mrpPrice = Math.round(costPrice * 1.4);
    const sellPrice = Math.round(costPrice * 1.25);
    const product = await Product.create({
      clinicId: clinicIdStr,
      name: med.name,
      category: 'Pharmacy',
      mrpPrice,
      costPrice,
      price: sellPrice,
      sku: `MED-${String(i + 1).padStart(3, '0')}`,
      description: `${med.form} — OTC/prescription stock`,
      gstRate: 12,
      lowStockThreshold: 10,
      isActive: true,
    });
    products.push(product);

    await ImsInventory.create({
      clinicId: clinicIdStr,
      product: product._id,
      quantity: pick([randomInt(0, 5), randomInt(20, 200), randomInt(20, 200)]),
      updatedBy: pharmacistUser._id,
    });
  }

  const customers = [];
  for (let i = 0; i < 10; i++) {
    const { name } = randomName();
    const customer = await Customer.create({
      clinicId: clinicIdStr,
      name,
      phone: randomPhone(),
      email: '',
    });
    customers.push(customer);
  }

  const SALE_COUNT = randomInt(12, 18);
  for (let i = 0; i < SALE_COUNT; i++) {
    const itemCount = randomInt(1, 4);
    const items = [];
    for (let j = 0; j < itemCount; j++) {
      const product = pick(products);
      const quantity = randomInt(1, 5);
      const lineAmount = product.price * quantity;
      const lineTax = Math.round(lineAmount * (product.gstRate / 100));
      items.push({
        product: product._id,
        name: product.name,
        sku: product.sku,
        quantity,
        unitPrice: product.price,
        gstRate: product.gstRate,
        lineAmount,
        lineTax,
        lineTotal: lineAmount + lineTax,
      });
    }
    const subtotal = items.reduce((s, it) => s + it.lineAmount, 0);
    const totalTax = items.reduce((s, it) => s + it.lineTax, 0);
    const finalAmount = subtotal + totalTax;

    const sale = await Sale.create({
      clinicId: clinicIdStr,
      invoiceNo: `INV-${new Date().getFullYear()}-${String(i + 1).padStart(4, '0')}`,
      customer: Math.random() < 0.6 ? pick(customers)._id : undefined,
      walkInName: Math.random() < 0.6 ? '' : randomName().name,
      items,
      subtotal,
      totalTax,
      finalAmount,
      paymentMethod: pick(['Cash', 'UPI', 'Card', 'Credit']),
      status: 'finalized',
      createdBy: pharmacistUser._id,
    });

    // Same Mongoose timestamps caveat as the Billing backdating above — has
    // to go through .collection to bypass the strip-createdAt-from-$set hook.
    await Sale.collection.updateOne({ _id: sale._id }, { $set: { createdAt: daysAgo(randomInt(0, 60)) } });
  }
}

function printCredentials() {
  console.log('\n' + '='.repeat(72));
  console.log('LOGIN CREDENTIALS — save these now, passwords are not stored anywhere else');
  console.log('='.repeat(72));

  let currentClinic = null;
  for (const c of credentials) {
    if (c.clinic !== currentClinic) {
      currentClinic = c.clinic;
      console.log(`\n${currentClinic}`);
      console.log('-'.repeat(currentClinic.length));
    }
    console.log(`  ${c.role.padEnd(20)} ${c.email.padEnd(42)} ${c.password}`);
  }
  console.log('\n' + '='.repeat(72));
  console.log(
    'Tip: only the "admin" and "patient (portal)" rows are ones you\'d actually\n' +
    'hand to someone to log in with — doctor/nurse/receptionist/pharmacist\n' +
    'credentials are listed in case you want to demo those dashboards too.'
  );
  console.log(
    '\nTo keep the token queue looking active every day, add this to the\n' +
    'server\'s crontab (crontab -e):\n' +
    '  0 8 * * * cd /var/www/curelex/hms-backend && /usr/bin/node scripts/generateDailyTokens.js >> /var/log/curelex/daily-tokens.log 2>&1'
  );
}

run().catch((err) => {
  console.error('❌ Seed script failed:', err);
  process.exit(1);
});
