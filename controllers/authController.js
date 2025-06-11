import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import bcrypt from "bcrypt";
import pool from "../config/db.js";


dotenv.config();

// const users = [
//   { id: '1', name: 'Aarush', role: 'Manager', username: 'aarush', password: 'manager123', email: 'aarush@example.com' },
//   { id: '2', name: 'Rahul', role: 'CEO', username: 'rahul', password: 'ceo123', email: 'rahul@example.com' }
// ];


export const login = async (req, res) => {
  const { username, password } = req.body;

  try {
    // 1️⃣ Find user in DB
    const result = await pool.query(
      "SELECT id, name, email, role, password FROM users WHERE username = $1",
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const user = result.rows[0];

    // 2️⃣ Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // 3️⃣ Create JWT
    const payload = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1h" });

    // 4️⃣ Send response
    res.status(200).json({
      message: "Login successful",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      token
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};