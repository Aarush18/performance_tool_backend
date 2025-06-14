import express from "express"
import auth, { authorizeRoles } from "../middlewares/auth.js"
import {
  getAllPerformanceNotes,
  addPerformanceNote,
  deleteNoteById,
  updateNoteById,
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

export default router
