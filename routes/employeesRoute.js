import express from 'express';
import { getEmployeeList } from '../controllers/performanceController.js';
import auth from '../middlewares/auth.js';
import { checkRole } from '../middlewares/rbac.js';

const router = express.Router();

router.get('/employees', auth, checkRole(["ceo", "manager", "hr"]), getEmployeeList);

export default router;
