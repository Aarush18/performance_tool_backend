import express from 'express';
import {
  addPerformanceNote,
  getPerformanceNotes,
  updatePerformanceNote,
  deletePerformanceNote,
  exportNotes,
  getActivityLogs,
  getNoteYears,
  exportNotesForEmployee
} from '../controllers/performanceController.js';

import { checkRole } from '../middlewares/rbac.js';
import auth from '../middlewares/auth.js';


const router = express.Router();

// Add note - only CEO and Manager can add
router.post('/addNote', auth, checkRole(['ceo', 'manager']), addPerformanceNote);

// Get notes - CEO can view all, Manager their own, HR public notes
router.get('/getNotes', auth, checkRole(['ceo', 'manager', 'hr']), getPerformanceNotes);

// ✅ Edit note - only CEO or Manager (with restrictions)
router.put('/notes/:id', auth, checkRole(['ceo', 'manager']), updatePerformanceNote);

// ✅ Delete note - only CEO or Manager (with restrictions)
router.delete('/notes/:id', auth, checkRole(['ceo', 'manager']), deletePerformanceNote);

// Export - only CEO can export
router.get('/export', auth, checkRole(['ceo']), exportNotes);

// Activity logs - only CEO can see logs
router.get('/activityLogs', auth, checkRole(['ceo']), getActivityLogs);

// Note years - accessible to all 3
router.get('/noteYears', auth, checkRole(['ceo', 'manager', 'hr']), getNoteYears);

// Export notes for a specific employee - only CEO can access
router.get('/export/:employeeId', auth, checkRole(['ceo']), exportNotesForEmployee);


export default router;
