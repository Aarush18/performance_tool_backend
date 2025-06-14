import pool from "../config/db.js"

export const logActivity = async (userId, action, details = null) => {
  try {
    await pool.query(
      `INSERT INTO activity_logs (user_id, action, details, timestamp)
       VALUES ($1, $2, $3, NOW())`,
      [userId, action, details]
    )
  } catch (err) {
    console.error("❌ Error logging activity:", err.message)
  }
}
