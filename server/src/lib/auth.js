import jwt from 'jsonwebtoken'

const jwtSecret = process.env.JWT_SECRET || 'dev_secret'

/**
 * Signs a JWT token with user payload
 * @param {Object} payload - User data to include in the token (userId, role, companyId)
 * @param {boolean} rememberMe - If true, token expires in 30 days; otherwise 7 days
 * @returns {string} Signed JWT token
 */
export function signToken(payload, rememberMe = false) {
  const expiresIn = rememberMe ? '30d' : '7d'
  return jwt.sign(payload, jwtSecret, { expiresIn })
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const decoded = jwt.verify(token, jwtSecret)
    req.user = decoded
    return next()
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' })
  }
}

export function requireRole(roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    return next()
  }
}
