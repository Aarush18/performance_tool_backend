import express from "express"
import auth, { authorizeRoles } from "../middlewares/auth.js"
import {
  getAllPerformanceNotes,
  addPerformanceNote,
  deleteNoteById,
  updateNoteById,
  getManagerActivityLogs,
  updateManagerActivityLog,
  deleteManagerActivityLog
} from "../controllers/managerController.js"

const router = express.Router()

// ✅ All routes below require JWT and 'manager' role
router.use(auth)
router.use(authorizeRoles(["manager"]))

// GET all performance notes (only ones created by the manager)
router.get("/notes", getAllPerformanceNotes)

// POST add a new performance note
router.post("/notes", addPerformanceNote)

// PUT update a note
router.put("/notes/:noteId", updateNoteById)

// DELETE a note
router.delete("/notes/:noteId", deleteNoteById)

// Activity Logs
router.get("/activityLogs", auth, authorizeRoles(["manager"]), getManagerActivityLogs)
router.put("/activityLogs/:id", auth, authorizeRoles(["manager"]), updateManagerActivityLog)
router.delete("/activityLogs/:id", auth, authorizeRoles(["manager"]), deleteManagerActivityLog)

export default router
