import express from "express"
import auth, { authorizeRoles } from "../middlewares/auth.js"
import { getTimelineByEmployeeId } from "../controllers/timelineController.js"

const router = express.Router()

// Endpoint to fetch timeline of notes for a specific employee
router.get("/:employeeId", auth, authorizeRoles(["ceo", "manager"]), getTimelineByEmployeeId)

export default router
