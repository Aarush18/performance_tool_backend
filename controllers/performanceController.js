import pool from "../config/db.js";
import pdfkit from 'pdfkit';
import jwt from "jsonwebtoken";
import { logActivity } from "../utils/logger.js";


export const getPerformanceNotes = async (req, res) => {
  try {
    const role = req.user.role;
    const userId = req.user.id;

    let result;

    if (role === "ceo") {
      // ✅ CEO sees ALL notes, including private
      result = await pool.query(`
        SELECT pn.id, pn.employee_id, e.name AS employee_name, pn.note, pn.type AS note_type,
               pn.is_private, pn.created_at AS timestamp, LOWER(r.name) AS creator_role
        FROM performance_notes pn
        JOIN employees e ON pn.employee_id = e.id
        JOIN users u ON pn.created_by = u.id
        JOIN roles r ON u.role_id = r.id
        ORDER BY pn.created_at DESC
      `);
    }

    else if (role === "manager") {
      // ✅ Manager sees notes of employees mapped to them, excluding private notes
      result = await pool.query(`
        SELECT pn.id, pn.employee_id, e.name AS employee_name, pn.note, pn.type AS note_type,
               pn.is_private, pn.created_at AS timestamp, LOWER(r.name) AS creator_role
        FROM performance_notes pn
        JOIN employees e ON pn.employee_id = e.id
        JOIN users u ON pn.created_by = u.id
        JOIN roles r ON u.role_id = r.id
        WHERE e.manager_id = $1 AND pn.is_private = false
        ORDER BY pn.created_at DESC
      `, [userId]);
    }

    else if (role === "hr") {
      // ✅ HR sees only public notes (is_private = false)
      result = await pool.query(`
        SELECT pn.id, pn.employee_id, e.name AS employee_name, pn.note, pn.type AS note_type,
               pn.is_private, pn.created_at AS timestamp, LOWER(r.name) AS creator_role
        FROM performance_notes pn
        JOIN employees e ON pn.employee_id = e.id
        JOIN users u ON pn.created_by = u.id
        JOIN roles r ON u.role_id = r.id
        WHERE pn.is_private = false
        ORDER BY pn.created_at DESC
      `);
    }

    else {
      return res.status(403).json({ message: "Access denied" });
    }

    res.status(200).json(result.rows);
  } catch (err) {
    console.error("❌ Error fetching notes:", err);
    res.status(500).json({ message: "Error fetching notes" });
  }
};

export const addPerformanceNote = async (req, res) => {
  const { employeeId, noteType, performanceNote, is_private } = req.body;
  const token = req.headers.authorization?.split(" ")[1];

  if (!employeeId || !noteType || !performanceNote || !token) {
    return res.status(400).json({ message: "Missing required fields or token" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const createdBy = decoded.id;
    const role = decoded.role;
    const year = new Date().getFullYear();
    const timestamp = new Date();

    const lowerCaseNoteType = noteType.toLowerCase();
    const isPrivate = role === "ceo" && is_private === true;

    await pool.query(
      `INSERT INTO performance_notes 
      (employee_id, created_by, note, year, type, created_at, is_private)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [employeeId, createdBy, performanceNote, year, lowerCaseNoteType, timestamp, isPrivate]
    );

    await logActivity(createdBy, "Added Note", `Added ${noteType} note for Employee ID ${employeeId}`);

    res.status(201).json({ message: "Note added successfully" });
  } catch (err) {
    console.error("❌ Error adding note:", err.message);
    res.status(500).json({ message: "Error adding note" });
  }

};




export const exportNotes = async (req, res) => {
  try {
    console.log("📦 Export Notes triggered");

    const result = await pool.query(`
      SELECT e.name AS employee_name, pn.note, pn.type AS note_type, pn.created_at AS timestamp
      FROM performance_notes pn
      JOIN employees e ON pn.employee_id = e.id
      ORDER BY pn.created_at DESC
    `);

    const notes = result.rows;
    const doc = new pdfkit();
    const filename = `Performance_Notes_${Date.now()}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    doc.pipe(res);

    doc.fontSize(18).text("Performance Notes", { align: "center" }).moveDown();

    notes.forEach((note, index) => {
      doc
        .fontSize(12)
        .text(
          `${index + 1}. Employee: ${note.employee_name}\nNote: ${note.note}\nType: ${note.note_type}\nDate: ${note.timestamp}`,
          { paragraphGap: 10 }
        )
        .moveDown();
    });

    doc.end();
  } catch (err) {
    console.error("❌ Error exporting notes:", err);
    res.status(500).json({ message: "Error exporting notes", error: err.message });
  }
};


// Get activity logs
export const getActivityLogs = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        al.id, 
        al.user_id, 
        u.email AS user_email, 
        al.action, 
        al.details, 
        al.target_id, 
        al.timestamp
      FROM activity_logs al
      JOIN users u ON al.user_id = u.id
      ORDER BY al.timestamp DESC
    `);

    res.status(200).json(result.rows);
  } catch (err) {
    console.error('❌ Error fetching activity logs:', err);
    res.status(500).json({ message: 'Error fetching activity logs' });
  }
};


export const getEmployeeList = async (req, res) => {
  try {
    const userRole = req.user.role;
    const userId = req.user.id;

    let result;

    // CEO and HR can view all active employees
    if (userRole === "ceo" || userRole === "hr") {
      result = await pool.query(
        `SELECT id, name FROM employees WHERE active_flag = true`
      );
    }

    // Managers can only view their team
    else if (userRole === "manager") {
      result = await pool.query(
        `SELECT id, name FROM employees WHERE active_flag = true AND manager_id = $1`,
        [userId]
      );
    }

    else {
      return res.status(403).json({ message: "Access denied" });
    }

    res.status(200).json(result.rows);
  } catch (err) {
    console.error("Error fetching employees:", err);
    res.status(500).json({ message: "Error fetching employees" });
  }
};



export const getNoteYears = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT EXTRACT(YEAR FROM created_at) AS year
      FROM performance_notes
      ORDER BY year DESC
    `);

    const years = result.rows.map(row => row.year.toString());
    res.status(200).json(years);
  } catch (err) {
    console.error("Error fetching years:", err);
    res.status(500).json({ message: "Error fetching years" });
  }
};

export const updatePerformanceNote = async (req, res) => {
  const noteId = req.params.id;
  const { note, type } = req.body;
  const userRole = req.user.role;
  const userId = req.user.id;

  try {
    const result = await pool.query(
      `SELECT pn.*, e.manager_id FROM performance_notes pn
       JOIN employees e ON pn.employee_id = e.id
       WHERE pn.id = $1`,
      [noteId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Note not found" });
    }

    const existingNote = result.rows[0];

    // Check role-based access
    if (
      userRole === "manager" &&
      (existingNote.manager_id !== userId || existingNote.is_private)
    ) {
      return res.status(403).json({ message: "Access denied" });
    }

    if (userRole === "hr") {
      return res.status(403).json({ message: "Access denied" });
    }

    await pool.query(
      `UPDATE performance_notes SET note = $1, type = $2 WHERE id = $3`,
      [note, type, noteId]
    );

    res.status(200).json({ message: "Note updated successfully" });
  } catch (err) {
    console.error("❌ Error updating note:", err);
    res.status(500).json({ message: "Error updating note" });
  }
};


export const deletePerformanceNote = async (req, res) => {
  const noteId = req.params.id;
  const userRole = req.user.role;
  const userId = req.user.id;

  try {
    const result = await pool.query(
      `SELECT pn.*, e.manager_id FROM performance_notes pn
       JOIN employees e ON pn.employee_id = e.id
       WHERE pn.id = $1`,
      [noteId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Note not found" });
    }

    const existingNote = result.rows[0];

    // Check role-based access
    if (
      userRole === "manager" &&
      (existingNote.manager_id !== userId || existingNote.is_private)
    ) {
      return res.status(403).json({ message: "Access denied" });
    }

    if (userRole === "hr") {
      return res.status(403).json({ message: "Access denied" });
    }

    await pool.query(`DELETE FROM performance_notes WHERE id = $1`, [noteId]);

    res.status(200).json({ message: "Note deleted successfully" });
  } catch (err) {
    console.error("❌ Error deleting note:", err);
    res.status(500).json({ message: "Error deleting note" });
  }
};

export const exportNotesForEmployee = async (req, res) => {
  try {
    // ✅ Extract token from query if not in headers
    let token = req.headers.authorization?.split(" ")[1] || req.query.token;

    if (!token) return res.status(401).json({ message: "No token provided" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const role = decoded.role;

    if (role !== "ceo") return res.status(403).json({ message: "Only CEO can export notes" });

    const employeeId = req.params.employeeId;

    const result = await pool.query(`
      SELECT pn.note, pn.type AS note_type, pn.created_at AS timestamp, e.name AS employee_name
      FROM performance_notes pn
      JOIN employees e ON pn.employee_id = e.id
      WHERE pn.employee_id = $1
      ORDER BY pn.created_at DESC
    `, [employeeId]);

    const notes = result.rows;

    const doc = new pdfkit();
    const filename = `Employee_${employeeId}_Performance_Notes.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    doc.pipe(res);

    doc.fontSize(18).text(`Performance Notes for Employee ID ${employeeId}`, { align: "center" }).moveDown();

    notes.forEach((note, index) => {
      doc
        .fontSize(12)
        .text(`${index + 1}. Note: ${note.note}\nType: ${note.note_type}\nDate: ${new Date(note.timestamp).toLocaleString()}\n`, { paragraphGap: 10 })
        .moveDown();
    });

    doc.end();

  } catch (err) {
    console.error("❌ Error exporting PDF:", err.message);
    res.status(500).json({ message: "Error generating PDF" });
  }
};
