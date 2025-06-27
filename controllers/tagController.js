import pool from "../config/db.js";

// ➕ Add tag to an employee
export const addTagToEmployee = async (req, res) => {
  const { employeeId } = req.params;
  const { tag } = req.body;
  const createdBy = req.user.id;
  const role = req.user.role;

  if (!tag) {
    return res.status(400).json({ message: "Tag is required" });
  }

  try {
    // 🔐 Manager: Only allowed if employee is in their team
    if (role === "manager") {
      const check = await pool.query(
        `SELECT 1 FROM manager_teams WHERE employee_id = $1 AND manager_id = $2`,
        [employeeId, createdBy]
      );
      if (check.rows.length === 0) {
        return res.status(403).json({ message: "Access denied: not your employee" });
      }
    }

    const result = await pool.query(
      `INSERT INTO employee_tags (employee_id, tag, created_by)
       VALUES ($1, $2, $3) RETURNING *`,
      [employeeId, tag, createdBy]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("❌ Error adding tag:", err.message);
    res.status(500).json({ message: "Failed to add tag" });
  }
};

// 📄 Get tags for a specific employee
export const getTagsForEmployee = async (req, res) => {
  const { employeeId } = req.params;
  const userId = req.user.id;
  const role = req.user.role;

  try {
    if (role === "manager") {
      const accessCheck = await pool.query(
        `SELECT 1 FROM manager_teams WHERE employee_id = $1 AND manager_id = $2`,
        [employeeId, userId]
      );

      if (accessCheck.rows.length === 0) {
        return res.status(403).json({ message: "Access denied: not your employee" });
      }

      const tags = await pool.query(
        `SELECT t.tag, r.name AS created_by_role, t.created_at
         FROM employee_tags t
         JOIN users u ON u.id = t.created_by
         JOIN roles r ON r.id = u.role_id
         WHERE t.employee_id = $1 AND t.created_by = $2
         ORDER BY t.created_at DESC`,
        [employeeId, userId]
      );
      return res.status(200).json(tags.rows);
    }

    // CEO and HR: can see all tags for employee
    const allTags = await pool.query(
      `SELECT t.tag, r.name AS created_by_role, t.created_at
       FROM employee_tags t
       JOIN users u ON u.id = t.created_by
       JOIN roles r ON r.id = u.role_id
       WHERE t.employee_id = $1
       ORDER BY t.created_at DESC`,
      [employeeId]
    );

    res.status(200).json(allTags.rows);
  } catch (err) {
    console.error("❌ Error fetching tags:", err.message);
    res.status(500).json({ message: "Failed to fetch tags" });
  }
};
