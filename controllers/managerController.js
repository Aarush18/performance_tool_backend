import pool from "../config/db.js"

// ✅ Get all notes created by this manager
export const getAllPerformanceNotes = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
         pn.id,
         pn.employee_id,
         e.name AS employee_name,
         pn.note,
         pn.type AS note_type,
         pn.is_private,
         pn.created_at AS timestamp,
         pn.year
       FROM performance_notes pn
       JOIN employees e ON pn.employee_id = e.id
       WHERE pn.created_by = $1
       ORDER BY pn.created_at DESC`,
      [req.user.id]
    )

    res.json(result.rows)
  } catch (err) {
    console.error("❌ Error fetching manager notes:", err)
    res.status(500).json({ message: "Failed to fetch notes" })
  }
}

// ✅ Add a new performance note (manager)
export const addPerformanceNote = async (req, res) => {
  const { employee_id, note, note_type, is_private } = req.body
  const createdBy = req.user.id
  const timestamp = new Date()
  const year = timestamp.getFullYear()

  try {
    await pool.query(
      `INSERT INTO performance_notes 
        (employee_id, note, type, created_at, created_by, year, is_private)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [employee_id, note, note_type.toLowerCase(), timestamp, createdBy, year, is_private || false]
    )

    res.status(201).json({ message: "Note added successfully" })
  } catch (err) {
    console.error("❌ Error adding note:", err)
    res.status(500).json({ message: "Failed to add note" })
  }
}

// ✅ Update a note by ID (only manager’s own note)
export const updateNoteById = async (req, res) => {
  const { noteId } = req.params
  const { note, note_type, is_private } = req.body
  const managerId = req.user.id

  try {
    // Check if the note belongs to this manager
    const check = await pool.query(`SELECT created_by FROM performance_notes WHERE id = $1`, [noteId])
    if (!check.rows.length) return res.status(404).json({ message: "Note not found" })
    if (check.rows[0].created_by !== managerId) return res.status(403).json({ message: "Unauthorized" })

    await pool.query(
      `UPDATE performance_notes SET note = $1, type = $2, is_private = $3 WHERE id = $4`,
      [note, note_type.toLowerCase(), is_private || false, noteId]
    )

    res.json({ message: "Note updated successfully" })
  } catch (err) {
    console.error("❌ Update error:", err)
    res.status(500).json({ message: "Failed to update note" })
  }
}

// ✅ Delete a note by ID (only manager’s own note)
export const deleteNoteById = async (req, res) => {
  const { noteId } = req.params
  const managerId = req.user.id

  try {
    // Ensure the manager owns this note
    const check = await pool.query(`SELECT created_by FROM performance_notes WHERE id = $1`, [noteId])
    if (!check.rows.length) return res.status(404).json({ message: "Note not found" })
    if (check.rows[0].created_by !== managerId) return res.status(403).json({ message: "Unauthorized" })

    await pool.query(`DELETE FROM performance_notes WHERE id = $1`, [noteId])

    res.json({ message: "Note deleted successfully" })
  } catch (err) {
    console.error("❌ Delete error:", err)
    res.status(500).json({ message: "Failed to delete note" })
  }
}
