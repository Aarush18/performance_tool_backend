import jwt from 'jsonwebtoken'

const auth = (req, res, next) => {
  try {
    // ✅ Try both: header OR query param
    const token =
      req.headers.authorization?.startsWith('Bearer ')
        ? req.headers.authorization.split(" ")[1]
        : req.query.token

    if (!token) {
      return res.status(401).json({ message: 'Unauthorized: No token provided' })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.user = decoded
    next()
  } catch (err) {
    console.error('Auth error:', err.message || err)
    res.status(401).json({ message: 'Unauthorized: Invalid or expired token' })
  }
}

export default auth

export const authorizeRoles = (roles = []) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied: Insufficient role' })
    }
    next()
  }
}
