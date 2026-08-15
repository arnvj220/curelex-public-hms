// hms-backend/scripts/generateDailyTokens.js
//
// Meant to run once a day via crontab on the server, to keep the two demo
// hospitals' token queue looking like an active clinic instead of going
// stale after the initial seed. Generates 15-20 new Token documents dated
// today for each demo clinic, using its existing doctors/patients.
//
// Only ever touches the two demo clinics (looked up by their fixed admin
// email from demoData.helpers.js) — never runs against real clinic data.
//
// Usage (one-off test run):
//   cd hms-backend
//   MONGO_URI="mongodb://..." node scripts/generateDailyTokens.js
//
// Crontab entry (runs every day at 8am server time):
//   0 8 * * * cd /var/www/curelex/hms-backend && /usr/bin/node scripts/generateDailyTokens.js >> /var/log/curelex/daily-tokens.log 2>&1

import 'dotenv/config';
import mongoose from 'mongoose';

import Clinic from '../models/Clinic.js';
import User from '../models/User.js';
import Patient from '../models/Patient.js';

import { DEMO_CLINICS, createTokensForDate } from './demoData.helpers.js';

async function run() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('❌ MONGO_URI not set. Export it or put it in hms-backend/.env before running this script.');
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log(`✅ Connected to MongoDB — ${new Date().toISOString()}`);

  for (const def of DEMO_CLINICS) {
    const clinicDoc = await Clinic.findOne({ email: def.adminEmail });
    if (!clinicDoc) {
      console.log(`⚠️  "${def.name}" not found — run scripts/seedDemoHospitals.js first. Skipping.`);
      continue;
    }

    const doctors = await User.find({ clinicId: clinicDoc._id, role: 'doctor' });
    const patients = await Patient.find({ clinicIds: clinicDoc._id });
    const receptionist = await User.findOne({ clinicId: clinicDoc._id, role: 'receptionist' })
      || await User.findOne({ clinicId: clinicDoc._id, role: 'admin' });

    if (doctors.length === 0 || patients.length === 0 || !receptionist) {
      console.log(`⚠️  "${def.name}" is missing doctors/patients/staff — skipping.`);
      continue;
    }

    const count = await createTokensForDate(clinicDoc, doctors, patients, receptionist, new Date());
    console.log(`🎫 ${def.name}: generated ${count} tokens for today.`);
  }

  await mongoose.disconnect();
  console.log('✅ Done.');
}

run().catch((err) => {
  console.error('❌ Daily token generation failed:', err);
  process.exit(1);
});
