import express from 'express'
import {
  createUser,
  deleteUser,
  getAllUsers,
  updateUserByAdmin,
  updateUserRole, 
  forceResetPassword  // ✅ include this
} from '../controllers/adminController.js'
import auth, { authorizeRoles } from '../middlewares/auth.js'

const router = express.Router()

// Admin-only routes
router.post('/create-user', auth, authorizeRoles(['admin']), createUser)
router.delete('/delete-user/:userId', auth, authorizeRoles(['admin']), deleteUser)
router.get('/users', auth, authorizeRoles(['admin']), getAllUsers)
router.put("/users/:id", auth, authorizeRoles(["admin"]), updateUserByAdmin)
router.put("/users/:id/role", auth, authorizeRoles(["admin"]), updateUserRole) // ✅ add this route
router.post("/force-reset-password", auth, forceResetPassword);


export default router
