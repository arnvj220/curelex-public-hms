// hms-backend/scripts/demoData.helpers.js
//
// Shared name pools, random-data helpers, and the two demo-clinic definitions
// used by both scripts/seedDemoHospitals.js (one-time setup) and
// scripts/generateDailyTokens.js (daily cron job). Keeping the clinic roster
// here means both scripts always agree on which doctors/staff exist.
//
// Pure exports only (no top-level side effects) — safe for either script to
// import without triggering the other's run() call.

import Token from '../models/Token.js';

export const FIRST_NAMES_MALE = [
  'Arjun', 'Rohan', 'Vikram', 'Aditya', 'Karan', 'Suresh', 'Ramesh', 'Manoj',
  'Sanjay', 'Vijay', 'Anil', 'Rajesh', 'Deepak', 'Amit', 'Nikhil', 'Siddharth',
  'Arun', 'Prakash', 'Ravi', 'Ganesh', 'Ashok', 'Naveen', 'Kiran', 'Mahesh',
];

export const FIRST_NAMES_FEMALE = [
  'Priya', 'Anita', 'Sunita', 'Kavya', 'Divya', 'Neha', 'Pooja', 'Shreya',
  'Meera', 'Lakshmi', 'Radha', 'Swathi', 'Deepa', 'Anjali', 'Kavitha', 'Nandini',
  'Sangeeta', 'Rekha', 'Latha', 'Bhavya', 'Uma', 'Preeti', 'Geetha', 'Vidya',
];

export const LAST_NAMES = [
  'Sharma', 'Verma', 'Iyer', 'Nair', 'Reddy', 'Rao', 'Menon', 'Pillai',
  'Gupta', 'Kumar', 'Krishnan', 'Subramanian', 'Joshi', 'Desai', 'Patel',
  'Mehta', 'Chowdhury', 'Bose', 'Das', 'Pandey', 'Mishra', 'Nayar',
];

export function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function randomName() {
  const isMale = Math.random() < 0.5;
  const first = pick(isMale ? FIRST_NAMES_MALE : FIRST_NAMES_FEMALE);
  const last = pick(LAST_NAMES);
  return { name: `${first} ${last}`, gender: isMale ? 'Male' : 'Female' };
}

export function randomPhone() {
  const start = pick(['6', '7', '8', '9']);
  let rest = '';
  for (let i = 0; i < 9; i++) rest += randomInt(0, 9);
  return start + rest;
}

// Random password: readable but not guessable — e.g. "Curelex-7f3a92"
export function randomPassword() {
  return 'Curelex-' + Math.random().toString(36).slice(2, 8);
}

export function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

export function ymd(date) {
  return date.toISOString().slice(0, 10); // "YYYY-MM-DD"
}

// ── The two demo hospitals ──────────────────────────────────────────────
// Fictional names/details — not modeled on any real hospital.
export const DEMO_CLINICS = [
  {
    key: 'sunrise',
    name: 'Sunrise Multispeciality Hospital',
    type: 'hospital',
    adminEmail: 'admin@sunrise-demo.curelex.in',
    phone: '9840011122',
    address: '221 Anna Salai',
    city: 'Coimbatore',
    state: 'Tamil Nadu',
    district: 'Coimbatore',
    pincode: '641001',
    doctors: [
      { dept: 'General Medicine', fee: 500 },
      { dept: 'Pediatrics', fee: 600 },
      { dept: 'Orthopedics', fee: 700 },
      { dept: 'Gynecology', fee: 650 },
    ],
    staff: [
      { role: 'nurse', dept: 'General Ward' },
      { role: 'nurse', dept: 'ICU' },
      { role: 'receptionist', dept: 'Front Desk' },
      { role: 'pharmacist', dept: 'Pharmacy' },
      { role: 'lab_technician', dept: 'Laboratory' },
    ],
  },
  {
    key: 'greenfield',
    name: 'Greenfield Family Clinic',
    type: 'clinic',
    adminEmail: 'admin@greenfield-demo.curelex.in',
    phone: '9884455667',
    address: '48 Gandhi Nagar Main Road',
    city: 'Chennai',
    state: 'Tamil Nadu',
    district: 'Chennai',
    pincode: '600020',
    doctors: [
      { dept: 'General Physician', fee: 400 },
      { dept: 'Dermatology', fee: 550 },
    ],
    staff: [
      { role: 'receptionist', dept: 'Front Desk' },
      { role: 'pharmacist', dept: 'Pharmacy' },
    ],
  },
];

export const MEDICINES = [
  { name: 'Paracetamol 500mg', form: 'Tablet', price: 2 },
  { name: 'Amoxicillin 250mg', form: 'Capsule', price: 6 },
  { name: 'Cetirizine 10mg', form: 'Tablet', price: 3 },
  { name: 'Azithromycin 500mg', form: 'Tablet', price: 12 },
  { name: 'Pantoprazole 40mg', form: 'Tablet', price: 5 },
  { name: 'Metformin 500mg', form: 'Tablet', price: 4 },
  { name: 'Amlodipine 5mg', form: 'Tablet', price: 3 },
  { name: 'ORS Sachet', form: 'Powder', price: 15 },
  { name: 'Cough Syrup', form: 'Syrup', price: 65 },
  { name: 'Multivitamin Tablets', form: 'Tablet', price: 8 },
  { name: 'Ibuprofen 400mg', form: 'Tablet', price: 3 },
  { name: 'Insulin Injection', form: 'Injection', price: 320 },
  { name: 'Antiseptic Cream', form: 'Cream', price: 45 },
  { name: 'Eye Drops', form: 'Drops', price: 55 },
  { name: 'Salbutamol Inhaler', form: 'Inhaler', price: 180 },
  { name: 'ORS + Zinc Powder', form: 'Powder', price: 22 },
];

export const LAB_TESTS = [
  { testName: 'Complete Blood Count (CBC)', category: 'Blood', price: 300 },
  { testName: 'Fasting Blood Sugar', category: 'Blood', price: 150 },
  { testName: 'Lipid Profile', category: 'Blood', price: 500 },
  { testName: 'Liver Function Test', category: 'Blood', price: 600 },
  { testName: 'Urine Routine', category: 'Urine', price: 120 },
  { testName: 'Chest X-Ray', category: 'Imaging', price: 400 },
  { testName: 'Thyroid Profile', category: 'Blood', price: 550 },
  { testName: 'Widal Test', category: 'Microbiology', price: 250 },
];

// ── Shared token-creation logic — used by both the initial seed and the
// daily cron job. Looks up each doctor's actual highest existing tokenNumber
// for the given date first (same pattern routes/tokens.js uses), so this is
// safe to call more than once for the same date without hitting the
// {clinicId, doctor, date, tokenNumber} unique index.
export async function createTokensForDate(clinicDoc, doctors, patients, generatedByUser, dateObj) {
  const date = ymd(dateObj);
  const count = randomInt(15, 20);
  const isToday = ymd(new Date()) === date;

  const perDoctorCounter = new Map();
  for (const doctor of doctors) {
    const last = await Token.findOne({ clinicId: clinicDoc._id, doctor: doctor._id, date })
      .sort({ tokenNumber: -1 })
      .select('tokenNumber');
    perDoctorCounter.set(String(doctor._id), last ? last.tokenNumber : 0);
  }

  for (let i = 0; i < count; i++) {
    const doctor = pick(doctors);
    const patient = pick(patients);
    const key = String(doctor._id);
    const tokenNumber = (perDoctorCounter.get(key) || 0) + 1;
    perDoctorCounter.set(key, tokenNumber);

    // Earlier tokens in the queue are more likely to be already handled.
    const progress = i / count;
    const status = !isToday
      ? 'Done'
      : progress < 0.4 ? pick(['Done', 'Done', 'Skipped'])
      : progress < 0.7 ? pick(['Called', 'Done'])
      : pick(['Waiting', 'Pending']);

    const source = Math.random() < 0.3 ? 'patient' : 'staff';
    const paid = status === 'Done';

    await Token.create({
      tokenNumber,
      date,
      clinicId: clinicDoc._id,
      doctor: doctor._id,
      patient: patient._id,
      generatedBy: generatedByUser._id,
      patientName: patient.name,
      phone: patient.phone,
      email: patient.email,
      age: patient.age,
      gender: patient.gender,
      status,
      calledAt: status !== 'Waiting' && status !== 'Pending' ? new Date() : undefined,
      completedAt: status === 'Done' ? new Date() : undefined,
      source,
      consultationType: 'in-person',
      consultationFee: doctor.consultationFee || 500,
      paymentMethod: paid ? pick(['cash', 'upi', 'card']) : null,
      paymentStatus: paid ? 'paid' : 'pending',
      paymentAmount: paid ? (doctor.consultationFee || 500) : 0,
    });
  }

  return count;
}
