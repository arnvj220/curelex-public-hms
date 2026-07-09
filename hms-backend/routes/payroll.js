// hms-backend/routes/payroll.js
import express from 'express';
import { auth } from '../middleware/auth.js';
import roleCheck from '../middleware/roleCheck.js';
import * as payrollController from '../controllers/payrollController.js';

const router = express.Router();

// All payroll routes require authentication and super_admin role
router.use(auth);
router.use(roleCheck('super_admin'));

router.get('/', payrollController.getPayrollRecords);
router.put('/base-salary', payrollController.updateBaseSalary);
router.post('/generate', payrollController.generatePayroll);
router.put('/:id/pay', payrollController.payPayroll);
router.delete('/:id', payrollController.deletePayroll);

export default router;
