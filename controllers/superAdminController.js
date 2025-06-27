import pool from "../config/db.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { logActivity } from "../utils/logger.js";
import multer from 'multer'
import fs from 'fs'
import { parse } from 'csv-parse'

// ==================== USER MANAGEMENT (Admin Functions) ====================

export const createUser = async (req, res) => {
    const { email, password, role } = req.body;

    if (!email || !password || !role) {
        return res.status(400).json({ message: "All fields are required" });
    }

    try {
        // Check if user already exists
        const existingUser = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
        if (existingUser.rows.length > 0) {
            return res.status(400).json({ message: "User already exists" });
        }

        // Hash password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Get role ID
        const roleResult = await pool.query("SELECT id FROM roles WHERE name = $1", [role.toLowerCase()]);
        if (roleResult.rows.length === 0) {
            return res.status(400).json({ message: "Invalid role" });
        }

        const roleId = roleResult.rows[0].id;

        // Create user
        const result = await pool.query(
            "INSERT INTO users (email, password_hash, role_id) VALUES ($1, $2, $3) RETURNING id, email",
            [email, hashedPassword, roleId]
        );

        await logActivity(req.user.id, "Create User", `Created user: ${email} with role: ${role}`);

        res.status(201).json({
            message: "User created successfully",
            user: result.rows[0]
        });
    } catch (err) {
        console.error("Create user error:", err);
        res.status(500).json({ message: "Server error" });
    }
};

export const getAllUsers = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT u.id, u.email, r.name AS role
             FROM users u
             JOIN roles r ON u.role_id = r.id
             ORDER BY u.id`
        );
        res.json(result.rows);
    } catch (err) {
        console.error("Get users error:", err);
        res.status(500).json({ message: "Server error" });
    }
};

export const updateUserBySuperAdmin = async (req, res) => {
    const { id } = req.params;
    const { email, role } = req.body;

    if (!email || !role) {
        return res.status(400).json({ message: "Email and role are required" });
    }

    try {
        // Get role ID
        const roleResult = await pool.query("SELECT id FROM roles WHERE name = $1", [role.toLowerCase()]);
        if (roleResult.rows.length === 0) {
            return res.status(400).json({ message: "Invalid role" });
        }

        const roleId = roleResult.rows[0].id;

        // Update user
        const result = await pool.query(
            "UPDATE users SET email = $1, role_id = $2 WHERE id = $3 RETURNING id, email",
            [email, roleId, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "User not found" });
        }

        await logActivity(req.user.id, "Update User", `Updated user: ${email} with role: ${role}`);

        res.json({
            message: "User updated successfully",
            user: result.rows[0]
        });
    } catch (err) {
        console.error("Update user error:", err);
        res.status(500).json({ message: "Server error" });
    }
};

export const deleteUser = async (req, res) => {
    const { id } = req.params;

    try {
        // Get user info before deletion for logging
        const userResult = await pool.query("SELECT email FROM users WHERE id = $1", [id]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ message: "User not found" });
        }

        const userEmail = userResult.rows[0].email;

        // Delete user
        const result = await pool.query("DELETE FROM users WHERE id = $1", [id]);

        if (result.rowCount === 0) {
            return res.status(404).json({ message: "User not found" });
        }

        await logActivity(req.user.id, "Delete User", `Deleted user: ${userEmail}`);

        res.json({ message: "User deleted successfully" });
    } catch (err) {
        console.error("Delete user error:", err);
        res.status(500).json({ message: "Server error" });
    }
};

export const updateUserRole = async (req, res) => {
    const { id } = req.params;
    const { role } = req.body;

    if (!role) {
        return res.status(400).json({ message: "Role is required" });
    }

    try {
        // Get role ID
        const roleResult = await pool.query("SELECT id FROM roles WHERE name = $1", [role.toLowerCase()]);
        if (roleResult.rows.length === 0) {
            return res.status(400).json({ message: "Invalid role" });
        }

        const roleId = roleResult.rows[0].id;

        // Update user role
        const result = await pool.query(
            "UPDATE users SET role_id = $1 WHERE id = $2 RETURNING id, email",
            [roleId, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "User not found" });
        }

        await logActivity(req.user.id, "Update User Role", `Updated user ${result.rows[0].email} role to: ${role}`);

        res.json({
            message: "User role updated successfully",
            user: result.rows[0]
        });
    } catch (err) {
        console.error("Update user role error:", err);
        res.status(500).json({ message: "Server error" });
    }
};

export const forceResetPassword = async (req, res) => {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword) {
        return res.status(400).json({ message: "New password is required" });
    }

    try {
        // Hash new password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

        // Update password
        const result = await pool.query(
            "UPDATE users SET password_hash = $1, forcepasswordreset = true WHERE id = $2 RETURNING id, email",
            [hashedPassword, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "User not found" });
        }

        await logActivity(req.user.id, "Force Password Reset", `Forced password reset for user: ${result.rows[0].email}`);

        res.json({
            message: "Password reset successfully",
            user: result.rows[0]
        });
    } catch (err) {
        console.error("Force password reset error:", err);
        res.status(500).json({ message: "Server error" });
    }
};

// ==================== TEAM MANAGEMENT (Admin Functions) ====================

export const getManagers = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT u.id, u.email 
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE r.name = 'manager'
       ORDER BY u.email`
        );
        res.json(result.rows);
    } catch (err) {
        console.error("Get managers error:", err);
        res.status(500).json({ message: "Server error" });
    }
};

export const getManagerTeam = async (req, res) => {
    const { managerId } = req.params;
    try {
        const result = await pool.query(
            `SELECT u.id, u.email 
       FROM users u
       JOIN manager_teams mt ON u.id = mt.employee_id
       WHERE mt.manager_id = $1
       ORDER BY u.email`,
            [managerId]
        );
        res.json(result.rows);
    } catch (err) {
        console.error("Get manager team error:", err);
        res.status(500).json({ message: "Server error" });
    }
};

export const addEmployeeToTeam = async (req, res) => {
    const { managerId } = req.params;
    const { employeeId } = req.body;

    if (!employeeId) {
        return res.status(400).json({ message: "Employee ID is required" });
    }

    try {
        // Check if assignment already exists
        const existingAssignment = await pool.query(
            "SELECT * FROM manager_teams WHERE manager_id = $1 AND employee_id = $2",
            [managerId, employeeId]
        );

        if (existingAssignment.rows.length > 0) {
            return res.status(400).json({ message: "Employee is already assigned to this manager" });
        }

        // Add employee to team
        await pool.query(
            "INSERT INTO manager_teams (manager_id, employee_id) VALUES ($1, $2)",
            [managerId, employeeId]
        );

        await logActivity(req.user.id, "Add Employee to Team", `Added employee ${employeeId} to manager ${managerId}`);

        res.json({ message: "Employee added to team successfully" });
    } catch (err) {
        console.error("Add employee to team error:", err);
        res.status(500).json({ message: "Server error" });
    }
};

export const removeEmployeeFromTeam = async (req, res) => {
    const { managerId, employeeId } = req.params;

    try {
        const result = await pool.query(
            "DELETE FROM manager_teams WHERE manager_id = $1 AND employee_id = $2",
            [managerId, employeeId]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ message: "Assignment not found" });
        }

        await logActivity(req.user.id, "Remove Employee from Team", `Removed employee ${employeeId} from manager ${managerId}`);

        res.json({ message: "Employee removed from team successfully" });
    } catch (err) {
        console.error("Remove employee from team error:", err);
        res.status(500).json({ message: "Server error" });
    }
};

export const getUnassignedEmployees = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT u.id, u.email 
       FROM users u
       LEFT JOIN manager_teams mt ON u.id = mt.employee_id
       JOIN roles r ON u.role_id = r.id
       WHERE r.name = 'employee' AND mt.manager_id IS NULL
       ORDER BY u.email`
        );
        res.json(result.rows);
    } catch (err) {
        console.error("Get unassigned employees error:", err);
        res.status(500).json({ message: "Server error" });
    }
};

export const getAllEmployeesWithStatus = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT 
                e.id, 
                e.email, 
                e.name,
                mt.manager_id
             FROM employees e
             LEFT JOIN manager_teams mt ON e.id = mt.employee_id
             ORDER BY e.email`
        );
        res.json(result.rows);
    } catch (err) {
        console.error("Get employees with status error:", err);
        res.status(500).json({ message: "Server error" });
    }
};

// ==================== PERFORMANCE NOTES (CEO Functions) ====================

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
        const isPrivate = role === "super-admin" && is_private === true;

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

export const getPerformanceNotes = async (req, res) => {
    try {
        const result = await pool.query(`
      SELECT 
        pn.id,
        pn.note AS performance_note,
        pn.type AS note_type,
        pn.created_at,
        pn.is_private,
        e.id AS employee_id,
        e.name AS employee_name,
        e.email AS employee_email,
        u.id AS creator_id,
        u.email AS creator_email,
        r.name AS creator_role
      FROM performance_notes pn
      JOIN employees e ON pn.employee_id = e.id
      JOIN users u ON pn.created_by = u.id
      JOIN roles r ON u.role_id = r.id
      ORDER BY pn.created_at DESC;
    `);

        res.status(200).json(result.rows);
    } catch (err) {
        console.error("❌ Error fetching notes:", err);
        res.status(500).json({ message: "Error fetching notes" });
    }
};

export const updatePerformanceNote = async (req, res) => {
    const { id } = req.params;
    const { note, type, is_private } = req.body;

    try {
        const result = await pool.query(
            `UPDATE performance_notes 
       SET note = $1, type = $2, is_private = $3 
       WHERE id = $4 RETURNING *`,
            [note, type, is_private, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Note not found" });
        }

        await logActivity(req.user.id, "Update Note", `Updated note ID ${id}`);

        res.json({ message: "Note updated successfully", note: result.rows[0] });
    } catch (err) {
        console.error("Update note error:", err);
        res.status(500).json({ message: "Server error" });
    }
};

export const deletePerformanceNote = async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query("DELETE FROM performance_notes WHERE id = $1", [id]);

        if (result.rowCount === 0) {
            return res.status(404).json({ message: "Note not found" });
        }

        await logActivity(req.user.id, "Delete Note", `Deleted note ID ${id}`);

        res.json({ message: "Note deleted successfully" });
    } catch (err) {
        console.error("Delete note error:", err);
        res.status(500).json({ message: "Server error" });
    }
};

export const exportNotes = async (req, res) => {
    try {
        const result = await pool.query(`
      SELECT 
        pn.note,
        pn.type,
        pn.created_at,
        e.name AS employee_name,
        u.email AS creator_email
      FROM performance_notes pn
      JOIN employees e ON pn.employee_id = e.id
      JOIN users u ON pn.created_by = u.id
      ORDER BY pn.created_at DESC
    `);

        // Create PDF logic here (similar to existing export functionality)
        res.json({ message: "Export functionality to be implemented", data: result.rows });
    } catch (err) {
        console.error("Export notes error:", err);
        res.status(500).json({ message: "Server error" });
    }
};

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

export const updateActivityLog = async (req, res) => {
    const { id } = req.params;
    const { action, details } = req.body;

    if (!action || !details) {
        return res.status(400).json({ message: "Action and details are required" });
    }

    try {
        const result = await pool.query(
            `UPDATE activity_logs 
             SET action = $1, details = $2 
             WHERE id = $3 RETURNING *`,
            [action, details, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Activity log not found" });
        }

        await logActivity(req.user.id, "Update Activity Log", `Updated log ID ${id}`);

        res.json({
            message: "Activity log updated successfully",
            log: result.rows[0]
        });
    } catch (err) {
        console.error("Update activity log error:", err);
        res.status(500).json({ message: "Server error" });
    }
};

export const deleteActivityLog = async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query("DELETE FROM activity_logs WHERE id = $1", [id]);

        if (result.rowCount === 0) {
            return res.status(404).json({ message: "Activity log not found" });
        }

        await logActivity(req.user.id, "Delete Activity Log", `Deleted log ID ${id}`);

        res.json({ message: "Activity log deleted successfully" });
    } catch (err) {
        console.error("Delete activity log error:", err);
        res.status(500).json({ message: "Server error" });
    }
};

export const getNoteYears = async (req, res) => {
    try {
        const result = await pool.query(`
      SELECT DISTINCT year 
      FROM performance_notes 
      ORDER BY year DESC
    `);

        const years = result.rows.map(row => row.year.toString());
        res.json(years);
    } catch (err) {
        console.error("Get note years error:", err);
        res.status(500).json({ message: "Server error" });
    }
};

export const exportNotesForEmployee = async (req, res) => {
    const { employeeId } = req.params;

    try {
        const result = await pool.query(`
      SELECT 
        pn.note,
        pn.type,
        pn.created_at,
        e.name AS employee_name,
        u.email AS creator_email
      FROM performance_notes pn
      JOIN employees e ON pn.employee_id = e.id
      JOIN users u ON pn.created_by = u.id
      WHERE pn.employee_id = $1
      ORDER BY pn.created_at DESC
    `, [employeeId]);

        // Create PDF logic here (similar to existing export functionality)
        res.json({ message: "Export functionality to be implemented", data: result.rows });
    } catch (err) {
        console.error("Export notes for employee error:", err);
        res.status(500).json({ message: "Server error" });
    }
};

// ==================== DASHBOARD STATISTICS ====================

export const getDashboardStats = async (req, res) => {
    try {
        const totalUsers = await pool.query("SELECT COUNT(*) FROM users")
        const totalNotes = await pool.query("SELECT COUNT(*) FROM performance_notes")
        const totalManagers = await pool.query(
            "SELECT COUNT(*) FROM users u JOIN roles r ON u.role_id = r.id WHERE r.name = 'manager'"
        )
        const totalEmployees = await pool.query("SELECT COUNT(*) FROM employees WHERE active_flag = true")

        res.status(200).json({
            totalUsers: parseInt(totalUsers.rows[0].count, 10),
            totalNotes: parseInt(totalNotes.rows[0].count, 10),
            totalManagers: parseInt(totalManagers.rows[0].count, 10),
            totalEmployees: parseInt(totalEmployees.rows[0].count, 10),
        })
    } catch (err) {
        console.error("Error fetching dashboard stats:", err)
        res.status(500).json({ message: "Server error" })
    }
}

export const getAllEmployees = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT id, name, email FROM employees WHERE active_flag = true ORDER BY name`
        );
        res.json(result.rows);
    } catch (err) {
        console.error("Get all employees error:", err);
        res.status(500).json({ message: "Server error" });
    }
};

// ==================== EMPLOYEE MANAGEMENT (Super Admin) ====================

export const createEmployee = async (req, res) => {
    const { name, email } = req.body;
    if (!name || !email) {
        return res.status(400).json({ message: "Name and email are required" });
    }
    try {
        // Check if employee already exists
        const existing = await pool.query("SELECT * FROM employees WHERE email = $1", [email]);
        if (existing.rows.length > 0) {
            return res.status(400).json({ message: "Employee already exists" });
        }
        // Insert into employees table
        const result = await pool.query(
            "INSERT INTO employees (name, email, active_flag) VALUES ($1, $2, true) RETURNING *",
            [name, email]
        );
        await logActivity(req.user.id, "Create Employee", `Created employee: ${email}`);
        res.status(201).json({ message: "Employee created successfully", employee: result.rows[0] });
    } catch (err) {
        console.error("Create employee error:", err);
        res.status(500).json({ message: "Server error" });
    }
};

export const importEmployeesCSV = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' })
    }

    const results = []
    const errors = []
    const filePath = req.file.path

    fs.createReadStream(filePath)
        .pipe(parse({ columns: true, trim: true }))
        .on('data', (row) => {
            // Validate row
            if (!row.name || !row.email) {
                errors.push({ row, error: 'Missing name or email' })
                return
            }
            results.push(row)
        })
        .on('end', async () => {
            // Insert employees in bulk
            let successCount = 0
            for (const emp of results) {
                try {
                    await pool.query(
                        'INSERT INTO employees (name, email, active_flag) VALUES ($1, $2, true) ON CONFLICT (email) DO NOTHING',
                        [emp.name, emp.email]
                    )
                    successCount++
                } catch (err) {
                    errors.push({ row: emp, error: err.message })
                }
            }
            fs.unlinkSync(filePath) // Clean up uploaded file
            res.json({
                message: `Imported ${successCount} employees.`,
                errors,
            })
        })
        .on('error', (err) => {
            fs.unlinkSync(filePath)
            res.status(500).json({ message: 'CSV parse error', error: err.message })
        })
} 