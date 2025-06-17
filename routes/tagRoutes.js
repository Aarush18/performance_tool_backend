import express from "express"
import auth, { authorizeRoles } from "../middlewares/auth.js"
import { addTagToEmployee, getTagsForEmployee } from "../controllers/tagController.js"

const router = express.Router()

router.post("/:employeeId", auth, authorizeRoles(["ceo", "manager"]), addTagToEmployee)
router.get("/:employeeId", auth, getTagsForEmployee)

export default router
