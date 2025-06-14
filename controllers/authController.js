import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import pool from '../config/db.js';
import crypto from 'crypto';
import { sendResetEmail } from '../utils/mailer.js';

dotenv.config();

// ✅ LOGIN
export const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await pool.query(
      'SELECT id, email, password_hash, role_id FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = result.rows[0];

    if (password !== user.password_hash) {
      console.log('❌ Password mismatch');
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const roleRes = await pool.query('SELECT name FROM roles WHERE id = $1', [user.role_id]);
    const roleName = roleRes.rows[0]?.name?.toLowerCase() || 'user';

    const payload = {
      id: user.id,
      email: user.email,
      role: roleName,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

    res.status(200).json({
      message: 'Login successful',
      user: payload,
      token,
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Internal server error' });
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
