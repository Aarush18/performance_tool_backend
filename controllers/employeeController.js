// controllers/employeeController.js
import pool from "../config/db.js";

// ✅ Get only the employees assigned to the currently logged-in manager
export const getMyEmployees = async (req, res) => {
  const managerId = req.user.id;

  try {
    const result = await pool.query(
      `SELECT e.id, e.name
       FROM manager_teams mt
       JOIN employees e ON mt.employee_id = e.id
       WHERE mt.manager_id = $1`,
      [managerId]
    );

    res.status(200).json(result.rows);
  } catch (err) {
    console.error("❌ Error fetching employees for manager:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
