export const checkRole = (allowedRoles) => {
    return (req, res, next) => {
      const userRole = req.user.role; 
      console.log('User role:', req.user.role, 'Allowed:', allowedRoles);  // ✅ Ye line add kar

      if (allowedRoles.includes(userRole)) {
        next();
      } else {
        res.status(403).json({ message: 'Access Denied' });
      }
    };
};
  