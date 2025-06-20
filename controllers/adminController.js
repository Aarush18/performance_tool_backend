import pool from '../config/db.js';
import bcrypt from 'bcrypt';

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
  const { userId } = req.params;

  try {
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.email, r.name AS role
       FROM users u
       JOIN roles r ON u.role_id = r.id`
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Get users error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
export const updateUserByAdmin = async (req, res) => {
    const { email, role } = req.body;
    const userId = req.params.id;
  
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

  try {
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
