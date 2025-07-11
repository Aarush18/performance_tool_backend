import express from "express"
import auth, { authorizeRoles } from "../middlewares/auth.js"
import { addTagToEmployee, getTagsForEmployee } from "../controllers/tagController.js"

const router = express.Router()

router.post("/:employeeId", auth, authorizeRoles(["ceo", "manager", "super-admin"]), addTagToEmployee)
router.get("/:employeeId", auth, authorizeRoles(["ceo", "manager", "super-admin"]), getTagsForEmployee)

export default router
