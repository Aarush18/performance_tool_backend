import express from 'express';
import { addPerformanceNote, getPerformanceNotes, exportNotes, getActivityLogs } from '../controllers/performanceController.js';
import { checkRole } from '../middlewares/rbac.js';
import auth from '../middlewares/auth.js';

const router = express.Router();

// Add note 
router.post('/addNote', auth, checkRole(['ceo', 'manager']), addPerformanceNote);

// Get notes 
router.get('/getNotes', auth, checkRole(['ceo', 'manager']), getPerformanceNotes);

// Export
router.get('/export', auth, checkRole(['ceo']), exportNotes);

// Activity logs 
router.get('/activityLogs', auth, checkRole(['ceo', 'manager']), getActivityLogs);

export default router;
