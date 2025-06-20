import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import pool from '../config/db.js';
import crypto from 'crypto';
import { sendResetEmail } from '../utils/mailer.js';

dotenv.config();

// ✅ LOGIN Controller
export const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Fetch user with role and forcePasswordReset status
    const result = await pool.query(
      `SELECT u.id, u.email, u.password_hash, r.name AS role, u.forcepasswordreset AS "forceReset"
   FROM users u
   JOIN roles r ON u.role_id = r.id
   WHERE u.email = $1`,
      [email]
    );


    if (result.rows.length === 0) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const user = result.rows[0];

    // ✅ Check password (for simplicity, plain comparison)
    if (password !== user.password_hash) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // ✅ Create JWT payload
    const payload = {
      id: user.id,
      email: user.email,
      role: user.role.toLowerCase(),
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    // ✅ Send forceReset flag if applicable
    return res.status(200).json({
      message: "Login successful",
      user: payload,
      token,
      forceReset: user.forcepasswordreset || false,
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};


// ✅ FORGOT PASSWORD
export const forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = result.rows[0];
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    const expiry = new Date(Date.now() + 15 * 60 * 1000); // 15 min

    await pool.query(
      'UPDATE users SET reset_token = $1, reset_token_expiry = $2 WHERE id = $3',
      [hashedToken, expiry, user.id]
    );

    const resetLink = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
    console.log('🔗 Reset Link:', resetLink);

    await sendResetEmail(email, resetToken);

    res.status(200).json({ message: 'Reset link sent to your email.' });
  } catch (err) {
    console.error('Forgot Password Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ✅ RESET PASSWORD
export const resetPassword = async (req, res) => {
  const { token } = req.params;
  const { newPassword } = req.body;

  try {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const result = await pool.query(
      'SELECT * FROM users WHERE reset_token = $1 AND reset_token_expiry > NOW()',
      [hashedToken]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }

    const userId = result.rows[0].id;

    // Save plain text password (for now, dev only)
    await pool.query(
      'UPDATE users SET password_hash = $1, reset_token = NULL, reset_token_expiry = NULL WHERE id = $2',
      [newPassword, userId]
    );

    res.status(200).json({ message: 'Password reset successful' });
  } catch (err) {
    console.error('Reset Password Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getQuickLoginUsers = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT u.id, u.email, r.name AS role
      FROM users u
      JOIN roles r ON u.role_id = r.id
    `)
    res.json(result.rows)
  } catch (err) {
    console.error("Failed to fetch quick login users", err)
    res.status(500).json({ message: "Server error" })
  }
}
