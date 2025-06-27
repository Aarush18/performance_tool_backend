import express from 'express';
import { getEmployeeList } from '../controllers/performanceController.js';
import { getMyEmployees } from '../controllers/employeeController.js';
import auth from '../middlewares/auth.js';
import { checkRole } from '../middlewares/rbac.js';

const router = express.Router();

router.get('/employees', auth, checkRole(["ceo", "manager", "hr"]), getEmployeeList)
router.get("/my-employees", auth, checkRole(["manager"]), getMyEmployees);


export default router;
