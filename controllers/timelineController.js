import pool from "../config/db.js"

// Get timeline (notes sorted by date) for a specific employee
export const getTimelineByEmployeeId = async (req, res) => {
  try {
    const employeeId = req.params.employeeId

    const result = await pool.query(`
      SELECT 
        pn.id,
        pn.note,
        pn.type AS note_type,
        pn.created_at AS timestamp,
        u.email AS creator_email,       -- ✅ this is needed
        pn.is_private,
        pn.year,
        e.name AS employee_name
      FROM performance_notes pn
      JOIN employees e ON e.id = pn.employee_id
      JOIN users u ON u.id = pn.created_by       -- ✅ JOIN with users table
      WHERE pn.employee_id = $1
      ORDER BY pn.created_at ASC
    `, [employeeId])

    res.json(result.rows)
  } catch (err) {
    console.error("❌ Error fetching timeline:", err.message)
    res.status(500).json({ message: "Failed to fetch timeline" })
  }
}
