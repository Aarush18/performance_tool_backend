import pool from "../config/db.js"

// GET all notes (can filter by employee if needed)
export const getAllPerformanceNotes = async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT 
           pn.id,
           pn.employee_id,
           e.name AS employee_name,
           pn.note,
           pn.type AS note_type,
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
      console.error("Error fetching notes:", err)
      res.status(500).json({ message: "Failed to fetch notes" })
    }
  }
  

// POST add a note
export const addPerformanceNote = async (req, res) => {
    const { employee_id, note, note_type } = req.body;
    const year = new Date().getFullYear();

  try {
    await pool.query(
        `INSERT INTO performance_notes 
         (employee_id, note, type, created_at, created_by, year) 
         VALUES ($1, $2, $3, NOW(), $4, $5)`,
        [employee_id, note, note_type, req.user.id, year]
      );
    res.status(201).json({ message: "Note added successfully" })
  } catch (err) {
    console.error("Error adding note:", err)
    res.status(500).json({ message: "Failed to add note" })
  }
}

// PUT update
export const updateNoteById = async (req, res) => {
  const { noteId } = req.params
  const { note, note_type } = req.body

  try {
    await pool.query(
      "UPDATE performance_notes SET note = $1, note_type = $2 WHERE id = $3",
      [note, note_type, noteId]
    )
    res.json({ message: "Note updated" })
  } catch (err) {
    console.error("Update error:", err)
    res.status(500).json({ message: "Failed to update note" })
  }
}

// DELETE note
export const deleteNoteById = async (req, res) => {
  const { noteId } = req.params

  try {
    await pool.query("DELETE FROM performance_notes WHERE id = $1", [noteId])
    res.json({ message: "Note deleted" })
  } catch (err) {
    console.error("Delete error:", err)
    res.status(500).json({ message: "Failed to delete note" })
  }
}
