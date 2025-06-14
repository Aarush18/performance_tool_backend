import jwt from 'jsonwebtoken'

// ✅ Middleware to verify JWT token
const auth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized: No token provided' })
    }

    const token = authHeader.split(' ')[1]

    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.user = decoded // inject user { id, email, role } into req

    next()
  } catch (err) {
    console.error('Auth error:', err.message || err)
    res.status(401).json({ message: 'Unauthorized: Invalid or expired token' })
  }
}

export default auth

// ✅ Middleware to restrict access based on roles
export const authorizeRoles = (roles = []) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied: Insufficient role' })
    }
    next()
  }
}
