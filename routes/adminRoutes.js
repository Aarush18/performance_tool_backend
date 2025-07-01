import express from 'express'
import {
  createUser,
  deleteUser,
  getAllUsers,
  updateUserByAdmin,
  updateUserRole, 
  forceResetPassword,  // ✅ include this
  updateUserStatus,
  getManagers,
  getManagerTeam,
  getUnassignedEmployees,
  addEmployeeToTeam,
  removeEmployeeFromTeam,
  getAllEmployeesWithStatus,
  importManagerMappingsCSV,
  importEmployeesCSV,
  getFilteredUsers
} from '../controllers/adminController.js'
import auth, { authorizeRoles } from '../middlewares/auth.js'
import multer from 'multer'
import { getDashboardStats } from '../controllers/superAdminController.js'

const router = express.Router()
const upload = multer({ dest: 'uploads/' })

// Admin-only routes
router.post('/create-user', auth, authorizeRoles(['admin']), createUser)
router.delete('/delete-user/:userId', auth, authorizeRoles(['admin']), deleteUser)
router.get('/users', auth, authorizeRoles(['admin']), getAllUsers)
router.put("/users/:id", auth, authorizeRoles(["admin"]), updateUserByAdmin)
router.put("/users/:id/status", auth, authorizeRoles(["admin"]), updateUserStatus)
router.put("/users/:id/role", auth, authorizeRoles(["admin"]), updateUserRole) // ✅ add this route
router.post("/force-reset-password", auth, forceResetPassword);

// Team management routes
router.get('/managers', auth, authorizeRoles(['admin']), getManagers);
router.get('/employees-with-status', auth, authorizeRoles(['admin']), getAllEmployeesWithStatus);
router.post('/managers/:managerId/team', auth, authorizeRoles(['admin']), addEmployeeToTeam);
router.delete('/managers/:managerId/team/:employeeId', auth, authorizeRoles(['admin']), removeEmployeeFromTeam);

// Bulk import routes
router.post(
  '/mappings/bulk-import',
  auth,
  authorizeRoles(['admin']),
  upload.single('file'),
  importManagerMappingsCSV
);

// Bulk import employees
router.post(
  '/import-employees',
  auth,
  authorizeRoles(['admin']),
  upload.single('file'),
  importEmployeesCSV
);

// Filtered user list for Admin, Super Admin, CEO
router.get(
  '/users/list',
  auth,
  authorizeRoles(['admin', 'super-admin', 'ceo']),
  getFilteredUsers
);

// Dashboard stats for admin and ceo
router.get('/dashboard-stats', auth, authorizeRoles(['admin', 'ceo']), getDashboardStats);

export default router
