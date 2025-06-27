import pool from '../config/db.js';
import bcrypt from 'bcrypt';
import { logActivity } from "../utils/logger.js";
import fs from 'fs'
import { parse } from 'csv-parse'

export const createUser = async (req, res) => {
    const { email, password, role } = req.body;
  
    if (!email || !password || !role) {
      return res.status(400).json({ message: "All fields are required" });
    }
  
    try {
      // ✅ Get role_id from role name
      const roleQuery = await pool.query('SELECT id FROM roles WHERE name = $1', [role]);
      if (roleQuery.rows.length === 0) {
        return res.status(400).json({ message: "Invalid role" });
      }
  
      const roleId = roleQuery.rows[0].id;
  
      // ✅ Insert into users
      await pool.query(
        'INSERT INTO users (email, password_hash, role_id) VALUES ($1, $2, $3)',
        [email, password, roleId]
      );
  
      res.status(201).json({ message: "User created successfully" });
    } catch (err) {
      console.error("Error creating user:", err);
      if (err.code === '23505') {
        return res.status(400).json({ message: "Email already exists" });
      }
      res.status(500).json({ message: "Server error" });
    }
  };
  
 

export const deleteUser = async (req, res) => {
  const userId = req.params.id;
  const adminId = req.user.id;

  try {
    // Get user email for logging
    const userResult = await pool.query(
      "SELECT email FROM users WHERE id = $1",
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const userEmail = userResult.rows[0].email;

    // Delete user
    await pool.query("DELETE FROM users WHERE id = $1", [userId]);

    await logActivity(adminId, "Delete User", `Deleted user ${userEmail}`);

    res.json({ message: "User deleted successfully" });
  } catch (err) {
    console.error("Error deleting user:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const getAllUsers = async (req, res) => {
  const adminId = req.user.id;
  try {
    const result = await pool.query(`
      SELECT 
        u.id,
        u.email,
        r.name AS role
      FROM users u
      JOIN roles r ON u.role_id = r.id
      ORDER BY u.id
    `);

    await logActivity(adminId, "View Users", "Accessed user management page");

    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).json({ message: "Server error" });
  }
};
export const updateUserByAdmin = async (req, res) => {
    const { email, role } = req.body;
    const userId = req.params.id;
    const adminId = req.user.id;
  
    if (!email || !role) {
      return res.status(400).json({ message: "Email and role are required" });
    }
  
    try {
      // ✅ Convert role name to role_id
      const roleName = (role || "").toLowerCase().trim();
      const roleQuery = await pool.query('SELECT id FROM roles WHERE name = $1', [roleName]);
      
      if (roleQuery.rows.length === 0) {
        return res.status(400).json({ message: "Invalid role" });
      }
  
      const roleId = roleQuery.rows[0].id;
  
      // ✅ Update user
      await pool.query(
        'UPDATE users SET email = $1, role_id = $2 WHERE id = $3',
        [email, roleId, userId]
      );

      await logActivity(adminId, "Update User", `Updated user ${email} with role ${role}`);
  
      res.status(200).json({ message: "User updated successfully" });
    } catch (err) {
      console.error("Error updating user:", err);
      res.status(500).json({ message: "Server error" });
    }
  };
  

// Controller to update a user's role and trigger password reset
export const updateUserRole = async (req, res) => {
  const userId = req.params.id;
  const { role } = req.body;
  const adminId = req.user.id;

  try {
    // Get user email for logging
    const userResult = await pool.query(
      "SELECT email FROM users WHERE id = $1",
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const userEmail = userResult.rows[0].email;

    // 1. Get the role ID for the new role name
    const roleResult = await pool.query(
      "SELECT id FROM roles WHERE name = $1",
      [role.toLowerCase()]
    );

    if (roleResult.rows.length === 0) {
      return res.status(400).json({ message: "Invalid role name" });
    }

    const newRoleId = roleResult.rows[0].id;

    // 2. Update user's role and force password reset
    await pool.query(
      "UPDATE users SET role_id = $1, forcepasswordreset = true WHERE id = $2",
      [newRoleId, userId]
    );

    await logActivity(adminId, "Update User Role", `Updated role for user ${userEmail} to ${role} and triggered password reset`);

    res.status(200).json({
      message: "Role updated successfully. Password reset triggered.",
    });
  } catch (err) {
    console.error("🔴 Role update error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// ✅ FORCE RESET PASSWORD (when user is forced after role change)
export const forceResetPassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user.id; // From auth middleware

  try {
    const result = await pool.query("SELECT password_hash FROM users WHERE id = $1", [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = result.rows[0];

    // For dev: plain-text check, prod: bcrypt.compare
    if (user.password_hash !== currentPassword) {
      return res.status(401).json({ message: "Incorrect current password" });
    }

    await pool.query(
      `UPDATE users 
       SET password_hash = $1, 
           forcepasswordreset = FALSE 
       WHERE id = $2`,
      [newPassword, userId]
    );

    res.status(200).json({ message: "Password updated successfully" });
  } catch (err) {
    console.error("Force Reset Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const getManagers = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.email 
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE r.name = 'manager'`
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
       WHERE mt.manager_id = $1`,
      [managerId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Get manager team error:", err);
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
       LEFT JOIN manager_teams mt ON e.id = mt.employee_id`
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Get all employees with status error:", err);
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
       WHERE r.name = 'employee' AND mt.manager_id IS NULL`
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Get unassigned employees error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const addEmployeeToTeam = async (req, res) => {
  const { managerId } = req.params;
  const { employeeId } = req.body;

  try {
    await pool.query(
      'INSERT INTO manager_teams (manager_id, employee_id) VALUES ($1, $2)',
      [managerId, employeeId]
    );
    res.status(201).json({ message: 'Employee added to team successfully' });
  } catch (err) {
    console.error("Add employee to team error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const removeEmployeeFromTeam = async (req, res) => {
  const { managerId, employeeId } = req.params;
  const adminId = req.user.id;
  try {
    await pool.query(
      'DELETE FROM manager_teams WHERE manager_id = $1 AND employee_id = $2',
      [managerId, employeeId]
    );
    await logActivity(adminId, "Remove from Team", `Removed employee ${employeeId} from manager ${managerId}`);
    res.status(200).json({ message: "Employee removed from team" });
  } catch (err) {
    console.error("Remove employee from team error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const importManagerMappingsCSV = async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
  
    const results = [];
    const errors = [];
    const filePath = req.file.path;
  
    fs.createReadStream(filePath)
      .pipe(parse({ columns: true, trim: true }))
      .on('data', (row) => {
        if (!row.manager_email || !row.employee_email) {
          errors.push({ row, error: 'Missing manager_email or employee_email' });
          return;
        }
        results.push(row);
      })
      .on('end', async () => {
        let successCount = 0;
  
        for (const mapping of results) {
          try {
            // Get manager ID
            const managerRes = await pool.query(
              `SELECT u.id, r.name as role 
               FROM users u 
               JOIN roles r ON u.role_id = r.id 
               WHERE u.email = $1 AND r.name = 'manager'`,
              [mapping.manager_email]
            );
            if (managerRes.rows.length === 0) {
              errors.push({ row: mapping, error: `Manager not found or is not a manager: ${mapping.manager_email}` });
              continue;
            }
            const managerId = managerRes.rows[0].id;
  
            // Get employee ID
            const employeeRes = await pool.query(
              'SELECT id FROM users WHERE email = $1',
              [mapping.employee_email]
            );
            if (employeeRes.rows.length === 0) {
              errors.push({ row: mapping, error: `Employee not found: ${mapping.employee_email}` });
              continue;
            }
            const employeeId = employeeRes.rows[0].id;
  
            // Insert into manager_teams, ignoring if it already exists
            await pool.query(
              `INSERT INTO manager_teams (manager_id, employee_id) 
               VALUES ($1, $2) 
               ON CONFLICT (manager_id, employee_id) DO NOTHING`,
              [managerId, employeeId]
            );
            successCount++;
          } catch (err) {
            errors.push({ row: mapping, error: err.message });
          }
        }
  
        fs.unlinkSync(filePath); // Clean up uploaded file
        
        if (errors.length > 0) {
          return res.status(207).json({
            message: `Processed with ${successCount} successes and ${errors.length} failures.`,
            successes: successCount,
            errors,
          });
        }
  
        res.json({
          message: `Successfully imported ${successCount} manager-employee mappings.`,
        });
      })
      .on('error', (err) => {
        fs.unlinkSync(filePath);
        res.status(500).json({ message: 'CSV parse error', error: err.message });
      });
  };
