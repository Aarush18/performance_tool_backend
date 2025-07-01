import express from 'express'
import {
  // User Management
  createUser,
  getAllUsers,
  updateUserBySuperAdmin,
  deleteUser,
  updateUserRole, 
  forceResetPassword,
  updateUserStatus,
  changeUserPassword,
  
  // Team Management
  getManagers,
  getManagerTeam,
  addEmployeeToTeam,
  removeEmployeeFromTeam,
  getUnassignedEmployees,
  getAllEmployeesWithStatus,
  
  // Performance Notes
  addPerformanceNote,
  getPerformanceNotes,
  updatePerformanceNote,
  deletePerformanceNote,
  exportNotes,
  getActivityLogs,
  getNoteYears,
  exportNotesForEmployee,
  
  // Dashboard Stats
  getDashboardStats,
  getAllEmployees,
  createEmployee,
  updateActivityLog,
  deleteActivityLog,
} from '../controllers/superAdminController.js'
import auth, { authorizeRoles } from '../middlewares/auth.js'
import multer from 'multer'
const upload = multer({ dest: 'uploads/' })
import { importEmployeesCSV } from '../controllers/superAdminController.js'


const router = express.Router()

// Dashboard Statistics
router.get('/dashboard-stats', auth, authorizeRoles(['super-admin']), getDashboardStats)

// User Management Routes
router.post('/create-user', auth, authorizeRoles(['super-admin']), createUser)
router.get('/users', auth, authorizeRoles(['super-admin']), getAllUsers)
router.put('/users/:id', auth, authorizeRoles(['super-admin']), updateUserBySuperAdmin)
router.put('/users/:id/status', auth, authorizeRoles(['super-admin']), updateUserStatus)
router.delete('/delete-user/:id', auth, authorizeRoles(['super-admin']), deleteUser)
router.put('/users/:id/role', auth, authorizeRoles(['super-admin']), updateUserRole)
router.post('/users/:id/reset-password', auth, authorizeRoles(['super-admin']), forceResetPassword)
router.put('/users/:id/change-password', auth, authorizeRoles(['super-admin']), changeUserPassword)
router.post('/employees/import', auth, authorizeRoles(['super-admin']), upload.single('file'), importEmployeesCSV)

// Team Management Routes
router.get('/managers', auth, authorizeRoles(['super-admin']), getManagers)
router.get('/managers/:managerId/team', auth, authorizeRoles(['super-admin']), getManagerTeam)
router.post('/managers/:managerId/team', auth, authorizeRoles(['super-admin']), addEmployeeToTeam)
router.delete('/managers/:managerId/team/:employeeId', auth, authorizeRoles(['super-admin']), removeEmployeeFromTeam)
router.get('/employees/unassigned', auth, authorizeRoles(['super-admin']), getUnassignedEmployees)
router.get('/employees-with-status', auth, authorizeRoles(['super-admin']), getAllEmployeesWithStatus)
router.get('/employees', auth, authorizeRoles(['super-admin']), getAllEmployees)

// Performance Notes Routes
router.post('/addNote', auth, authorizeRoles(['super-admin']), addPerformanceNote)
router.get('/notes', auth, authorizeRoles(['super-admin']), getPerformanceNotes)
router.get('/getNotes', auth, authorizeRoles(['super-admin']), getPerformanceNotes)
router.put('/notes/:id', auth, authorizeRoles(['super-admin']), updatePerformanceNote)
router.delete('/notes/:id', auth, authorizeRoles(['super-admin']), deletePerformanceNote)
router.get('/export', auth, authorizeRoles(['super-admin']), exportNotes)
router.get('/activityLogs', auth, authorizeRoles(['super-admin']), getActivityLogs)
router.get('/noteYears', auth, authorizeRoles(['super-admin']), getNoteYears)
router.get('/export/:employeeId', auth, authorizeRoles(['super-admin']), exportNotesForEmployee)

// Activity Logs
router.get("/activityLogs", auth, authorizeRoles(["super-admin"]), getActivityLogs)
router.put("/activityLogs/:id", auth, authorizeRoles(["super-admin"]), updateActivityLog)
router.delete("/activityLogs/:id", auth, authorizeRoles(["super-admin"]), deleteActivityLog)

// Employee Management Route
router.post('/employees', auth, authorizeRoles(['super-admin']), createEmployee)

export default router 