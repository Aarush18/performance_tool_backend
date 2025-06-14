import express from 'express';
import {
  addPerformanceNote,
  getPerformanceNotes,
  exportNotes,
  getActivityLogs,
  getNoteYears,
} from '../controllers/performanceController.js';

import { checkRole } from '../middlewares/rbac.js';
import auth from '../middlewares/auth.js';

const router = express.Router();

// Add note - only CEO and Manager can add
router.post('/addNote', auth, checkRole(['ceo', 'manager']), addPerformanceNote);

// Get notes - CEO can view all, Manager their own, HR public notes
router.get('/getNotes', auth, checkRole(['ceo', 'manager', 'hr']), getPerformanceNotes);

// Export - only CEO can export
router.get('/export', auth, checkRole(['ceo']), exportNotes);

// Activity logs - only CEO can see logs
router.get('/activityLogs', auth, checkRole(['ceo']), getActivityLogs);

// Note years - accessible to all 3
router.get('/noteYears', auth, checkRole(['ceo', 'manager', 'hr']), getNoteYears);

export default router;
