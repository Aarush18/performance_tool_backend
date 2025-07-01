import express from 'express';
import { login, forgotPassword, resetPassword } from '../controllers/authController.js';
import { getQuickLoginUsers } from "../controllers/authController.js"

const router = express.Router();

router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get("/quick-login-users", getQuickLoginUsers)


export default router;
