import pool from "../config/db.js";
import pdfkit from 'pdfkit';


export const getPerformanceNotes = async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM notes ORDER BY timestamp DESC');
        res.status(200).json(result.rows);
    } catch (err) {
        console.error('Error fetching notes:', err);
        res.status(500).json({ message: 'Error fetching notes' });
    }
};

export const addPerformanceNote = async (req, res) => {
  const { employeeName, noteType, performanceNote } = req.body;
  const timestamp = new Date();

  try {
    await pool.query(
      'INSERT INTO notes(employee_name, note, note_type, timestamp) VALUES($1, $2, $3, $4)',
      [employeeName, performanceNote, noteType, timestamp]
    );
    res.status(200).json({ message: 'Note added successfully' });
  } catch (err) {
    console.error('Error adding note:', err);
    res.status(500).json({ message: 'Error adding note' });
  }
};


export const exportNotes = async (req, res) => {
    try {
      const result = await pool.query('SELECT * FROM notes ORDER BY timestamp DESC');
      const notes = result.rows;
  
      const doc = new pdfkit();
      const filename = `Performance_Notes_${Date.now()}.pdf`;
  
      // Pipe PDF to response
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      doc.pipe(res);
  
      // Add content
      doc.fontSize(18).text('Performance Notes', { align: 'center' });
      doc.moveDown();
  
      notes.forEach((note, index) => {
        doc.fontSize(12).text(
          `${index + 1}. Employee: ${note.employee_name}\nNote: ${note.note}\nDate: ${note.timestamp}\n`,
          { paragraphGap: 10 }
        );
        doc.moveDown();
      });
  
      doc.end();
    } catch (err) {
      console.error('Error exporting notes:', err);
      res.status(500).json({ message: 'Error exporting notes' });
    }
  };
  
  // Fetch activity logs (basic example)
  export const getActivityLogs = async (req, res) => {
    try {
      const result = await pool.query('SELECT * FROM activity_logs ORDER BY timestamp DESC');
      res.status(200).json(result.rows);
    } catch (err) {
      console.error('Error fetching activity logs:', err);
      res.status(500).json({ message: 'Error fetching activity logs' });
    }
  };