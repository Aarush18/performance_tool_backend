import pool from "../config/db.js";
import { logActivity } from "../utils/logger.js";

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
    );

    res.json(result.rows);
  } catch (err) {
    console.error("❌ Error fetching manager notes:", err);
    res.status(500).json({ message: "Failed to fetch notes" });
  }
};

// ✅ Add a new performance note (check if employee is in manager's team)
export const addPerformanceNote = async (req, res) => {
  const { employee_id, note, note_type, is_private } = req.body;
  const createdBy = req.user.id;
  const timestamp = new Date();
  const year = timestamp.getFullYear();

  console.log("Add note request by:", req.user);
  console.log("Body:", req.body);

  try {
    // Get employee name for logging
    const empResult = await pool.query(
      `SELECT name FROM employees WHERE id = $1`,
      [employee_id]
    );

    if (!empResult.rows.length) {
      return res.status(404).json({ message: "Employee not found" });
    }

    const employeeName = empResult.rows[0].name;

    // 🔐 Check if the employee belongs to the logged-in manager
    const empCheck = await pool.query(
      `SELECT 1 FROM manager_teams 
       WHERE manager_id = $1 AND employee_id = $2`,
      [createdBy, employee_id]
    );

    if (!empCheck.rowCount) {
      await logActivity(createdBy, "Failed Note Creation", `Unauthorized attempt to add note for employee ${employeeName}`);
      return res.status(403).json({ message: "You are not authorized to add note for this employee" });
    }

    await pool.query(
      `INSERT INTO performance_notes 
        (employee_id, note, type, created_at, created_by, year, is_private)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [employee_id, note, note_type.toLowerCase(), timestamp, createdBy, year, is_private || false]
    );

    await logActivity(createdBy, "Add Note", `Added ${note_type} note for employee ${employeeName}`);

    res.status(201).json({ message: "Note added successfully" });
  } catch (err) {
    console.error("❌ Error adding note:", err);
    res.status(500).json({ message: "Failed to add note" });
  }
};

// ✅ Update a note by ID (only manager's own note)
export const updateNoteById = async (req, res) => {
  const { noteId } = req.params;
  const { note, note_type, is_private } = req.body;
  const managerId = req.user.id;

  if (!note || !note_type || typeof note_type !== "string") {
    return res.status(400).json({ message: "Invalid or missing note/note_type" });
  }

  try {
    const check = await pool.query(
      `SELECT created_by FROM performance_notes WHERE id = $1`,
      [noteId]
    );

    if (!check.rows.length) return res.status(404).json({ message: "Note not found" });
    if (check.rows[0].created_by !== managerId)
      return res.status(403).json({ message: "Unauthorized" });

    await pool.query(
      `UPDATE performance_notes 
       SET note = $1, type = $2, is_private = $3 
       WHERE id = $4`,
      [note, note_type.toLowerCase(), is_private || false, noteId]
    );

    res.json({ message: "Note updated successfully" });
  } catch (err) {
    console.error("❌ Update error:", err);
    res.status(500).json({ message: "Failed to update note" });
  }
};

// ✅ Delete a note by ID (only manager's own note)
export const deleteNoteById = async (req, res) => {
  const { noteId } = req.params;
  const managerId = req.user.id;

  try {
    const check = await pool.query(
      `SELECT created_by FROM performance_notes WHERE id = $1`,
      [noteId]
    );

    if (!check.rows.length) return res.status(404).json({ message: "Note not found" });
    if (check.rows[0].created_by !== managerId)
      return res.status(403).json({ message: "Unauthorized" });

    await pool.query(`DELETE FROM performance_notes WHERE id = $1`, [noteId]);

    res.json({ message: "Note deleted successfully" });
  } catch (err) {
    console.error("❌ Delete error:", err);
    res.status(500).json({ message: "Failed to delete note" });
  }
};

// Get notes for manager's team
export const getTeamNotes = async (req, res) => {
  const managerId = req.user.id;

  try {
    const result = await pool.query(
      `SELECT 
        pn.id,
        pn.note,
        pn.type,
        pn.created_at,
        pn.is_private,
        e.id AS employee_id,
        e.name AS employee_name,
        u.email AS creator_email
      FROM performance_notes pn
      JOIN employees e ON pn.employee_id = e.id
      JOIN users u ON pn.created_by = u.id
      JOIN manager_teams mt ON e.id = mt.employee_id
      WHERE mt.manager_id = $1
      ORDER BY pn.created_at DESC`,
      [managerId]
    );

    await logActivity(managerId, "View Team Notes", "Accessed team performance notes");

    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching team notes:", err);
    res.status(500).json({ message: "Failed to fetch team notes" });
  }
};

// Update note
export const updateNote = async (req, res) => {
  const { id } = req.params;
  const { note, type } = req.body;
  const managerId = req.user.id;

  try {
    // Check if note exists and belongs to manager's team
    const noteCheck = await pool.query(
      `SELECT pn.*, e.name as employee_name
       FROM performance_notes pn
       JOIN employees e ON pn.employee_id = e.id
       JOIN manager_teams mt ON e.id = mt.employee_id
       WHERE pn.id = $1 AND mt.manager_id = $2`,
      [id, managerId]
    );

    if (!noteCheck.rows.length) {
      await logActivity(managerId, "Failed Note Update", `Unauthorized attempt to update note ID ${id}`);
      return res.status(403).json({ message: "Note not found or you're not authorized to update it" });
    }

    const employeeName = noteCheck.rows[0].employee_name;

    await pool.query(
      `UPDATE performance_notes 
       SET note = $1, type = $2 
       WHERE id = $3`,
      [note, type, id]
    );

    await logActivity(managerId, "Update Note", `Updated ${type} note for employee ${employeeName}`);

    res.json({ message: "Note updated successfully" });
  } catch (err) {
    console.error("Error updating note:", err);
    res.status(500).json({ message: "Failed to update note" });
  }
};

// Delete note
export const deleteNote = async (req, res) => {
  const { id } = req.params;
  const managerId = req.user.id;

  try {
    // Check if note exists and belongs to manager's team
    const noteCheck = await pool.query(
      `SELECT pn.*, e.name as employee_name
       FROM performance_notes pn
       JOIN employees e ON pn.employee_id = e.id
       JOIN manager_teams mt ON e.id = mt.employee_id
       WHERE pn.id = $1 AND mt.manager_id = $2`,
      [id, managerId]
    );

    if (!noteCheck.rows.length) {
      await logActivity(managerId, "Failed Note Deletion", `Unauthorized attempt to delete note ID ${id}`);
      return res.status(403).json({ message: "Note not found or you're not authorized to delete it" });
    }

    const employeeName = noteCheck.rows[0].employee_name;

    await pool.query("DELETE FROM performance_notes WHERE id = $1", [id]);

    await logActivity(managerId, "Delete Note", `Deleted note for employee ${employeeName}`);

    res.json({ message: "Note deleted successfully" });
  } catch (err) {
    console.error("Error deleting note:", err);
    res.status(500).json({ message: "Failed to delete note" });
  }
};

export const getManagerActivityLogs = async (req, res) => {
  const managerId = req.user.id;
  try {
    const result = await pool.query(`
      SELECT al.*, u.email as user_email FROM activity_logs al
      JOIN users u ON al.user_id = u.id
      WHERE al.user_id = $1 OR al.user_id IN (SELECT employee_id FROM manager_teams WHERE manager_id = $1)
      ORDER BY al.timestamp DESC
    `, [managerId]);
    res.json(result.rows);
  } catch (err) {
    console.error("Get manager activity logs error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const updateManagerActivityLog = async (req, res) => {
  const { id } = req.params;
  const { action, details } = req.body;
  const managerId = req.user.id;

  if (!action || !details) {
    return res.status(400).json({ message: "Action and details are required" });
  }

  try {
    // Check if manager is allowed to edit this log
    const logRes = await pool.query('SELECT user_id FROM activity_logs WHERE id = $1', [id]);
    if (logRes.rows.length === 0) {
      return res.status(404).json({ message: 'Log not found' });
    }
    const logUserId = logRes.rows[0].user_id;

    const teamRes = await pool.query('SELECT employee_id FROM manager_teams WHERE manager_id = $1', [managerId]);
    const teamIds = teamRes.rows.map(r => r.employee_id);

    if (logUserId !== managerId && !teamIds.includes(logUserId)) {
      return res.status(403).json({ message: 'Forbidden: You can only edit logs for your team' });
    }

    const result = await pool.query(
        `UPDATE activity_logs SET action = $1, details = $2 WHERE id = $3 RETURNING *`,
        [action, details, id]
    );

    res.json({ message: "Activity log updated successfully", log: result.rows[0] });
  } catch (err) {
    console.error("Update manager activity log error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const deleteManagerActivityLog = async (req, res) => {
  const { id } = req.params;
  const managerId = req.user.id;

  try {
    // Check if manager is allowed to delete this log
    const logRes = await pool.query('SELECT user_id FROM activity_logs WHERE id = $1', [id]);
    if (logRes.rows.length === 0) {
      return res.status(404).json({ message: 'Log not found' });
    }
    const logUserId = logRes.rows[0].user_id;
    
    const teamRes = await pool.query('SELECT employee_id FROM manager_teams WHERE manager_id = $1', [managerId]);
    const teamIds = teamRes.rows.map(r => r.employee_id);

    if (logUserId !== managerId && !teamIds.includes(logUserId)) {
      return res.status(403).json({ message: 'Forbidden: You can only delete logs for your team' });
    }
    
    await pool.query("DELETE FROM activity_logs WHERE id = $1", [id]);
    res.json({ message: "Activity log deleted successfully" });
  } catch (err) {
    console.error("Delete manager activity log error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
