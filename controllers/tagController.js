import pool from "../config/db.js"

export const addTagToEmployee = async (req, res) => {
    const { employeeId } = req.params
    const { tag } = req.body
    const createdBy = req.user.id

    if (!tag) {
        return res.status(400).json({ message: "Tag is required" })
    }

    try {
        const result = await pool.query(
            `INSERT INTO employee_tags (employee_id, tag, created_by) VALUES ($1, $2, $3) RETURNING *`,
            [employeeId, tag, createdBy]
        )
        res.status(201).json(result.rows[0])
    } catch (err) {
        console.error("❌ Error adding tag:", err.message)
        res.status(500).json({ message: "Failed to add tag" })
    }
}

export const getTagsForEmployee = async (req, res) => {
    const { employeeId } = req.params
  
    try {
        const result = await pool.query(`
        SELECT t.tag, r.name AS created_by_role
        FROM employee_tags t
        JOIN users u ON u.id = t.created_by
        JOIN roles r ON r.id = u.role_id
        WHERE t.employee_id = $1
      `, [employeeId])
      
  
      res.json(result.rows)
    } catch (err) {
      console.error("❌ Error fetching tags:", err.message)
      res.status(500).json({ message: "Failed to fetch tags" })
    }
  }
  