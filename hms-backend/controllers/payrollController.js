// hms-backend/controllers/payrollController.js
import Payroll from '../models/Payroll.js';
import User from '../models/User.js';

// Get all payroll records (for super admin)
export const getPayrollRecords = async (req, res) => {
  try {
    const { clinicId, month, year, staffId } = req.query;
    const filter = {};

    if (clinicId) filter.clinicId = clinicId;
    if (month) filter.month = Number(month);
    if (year) filter.year = Number(year);
    if (staffId) filter.staffId = staffId;

    const payrolls = await Payroll.find(filter)
      .populate('staffId', 'name email role department baseSalary')
      .populate('clinicId', 'name')
      .sort({ year: -1, month: -1, createdAt: -1 });

    res.json({ success: true, payrolls });
  } catch (error) {
    console.error('Error fetching payroll records:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update base salary of a staff member
export const updateBaseSalary = async (req, res) => {
  try {
    const { staffId, baseSalary } = req.body;

    if (!staffId) {
      return res.status(400).json({ success: false, message: 'Staff ID is required' });
    }

    const user = await User.findById(staffId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Staff member not found' });
    }

    user.baseSalary = Number(baseSalary) || 0;
    await user.save();

    res.json({ 
      success: true, 
      message: `Base salary for ${user.name} updated to ₹${user.baseSalary}`,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        baseSalary: user.baseSalary
      }
    });
  } catch (error) {
    console.error('Error updating base salary:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Generate payroll record
export const generatePayroll = async (req, res) => {
  try {
    const { staffId, month, year, allowances, deductions, notes } = req.body;

    if (!staffId || !month || !year) {
      return res.status(400).json({ success: false, message: 'Staff ID, month, and year are required' });
    }

    // Check if payroll already exists
    const existing = await Payroll.findOne({ staffId, month: Number(month), year: Number(year) });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Payroll record already exists for this month and year' });
    }

    const user = await User.findById(staffId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Staff member not found' });
    }

    const baseSalary = user.baseSalary || 0;
    const allowanceVal = Number(allowances) || 0;
    const deductionVal = Number(deductions) || 0;
    const netSalary = baseSalary + allowanceVal - deductionVal;

    const payroll = await Payroll.create({
      staffId,
      clinicId: user.clinicId,
      month: Number(month),
      year: Number(year),
      baseSalary,
      allowances: allowanceVal,
      deductions: deductionVal,
      netSalary,
      status: 'pending',
      notes: notes || ''
    });

    await payroll.populate([
      { path: 'staffId', select: 'name email role department' },
      { path: 'clinicId', select: 'name' }
    ]);

    res.status(201).json({ success: true, message: 'Payroll generated successfully', payroll });
  } catch (error) {
    console.error('Error generating payroll:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Pay payroll record
export const payPayroll = async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentMethod, transactionId, notes } = req.body;

    const payroll = await Payroll.findById(id);
    if (!payroll) {
      return res.status(404).json({ success: false, message: 'Payroll record not found' });
    }

    if (payroll.status === 'paid') {
      return res.status(400).json({ success: false, message: 'Payroll record is already paid' });
    }

    payroll.status = 'paid';
    payroll.paymentDate = new Date();
    payroll.paymentMethod = paymentMethod || 'Bank Transfer';
    payroll.transactionId = transactionId || '';
    if (notes) payroll.notes = notes;

    await payroll.save();
    
    await payroll.populate([
      { path: 'staffId', select: 'name email role department' },
      { path: 'clinicId', select: 'name' }
    ]);

    res.json({ success: true, message: 'Payment recorded successfully', payroll });
  } catch (error) {
    console.error('Error paying payroll:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete pending payroll record
export const deletePayroll = async (req, res) => {
  try {
    const { id } = req.params;

    const payroll = await Payroll.findById(id);
    if (!payroll) {
      return res.status(404).json({ success: false, message: 'Payroll record not found' });
    }

    if (payroll.status === 'paid') {
      return res.status(400).json({ success: false, message: 'Cannot delete a paid payroll record' });
    }

    await Payroll.findByIdAndDelete(id);

    res.json({ success: true, message: 'Payroll record deleted successfully' });
  } catch (error) {
    console.error('Error deleting payroll record:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
