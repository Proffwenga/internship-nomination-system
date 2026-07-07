const jwt = require('jsonwebtoken');

const SECRET = process.env.SESSION_SECRET || 'dev-secret-change-me';

function issueToken(role) {
  return jwt.sign({ role }, SECRET, { expiresIn: '12h' });
}

// Accepts the token either as "Authorization: Bearer <token>" (used by the
// JS-driven pages) or as a "?token=" query string (used by plain <a> links
// for file downloads and CSV exports, which cannot set custom headers).
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    const header = req.headers.authorization || '';
    const token = (header.startsWith('Bearer ') ? header.slice(7) : null) || req.query.token || null;
    if (!token) return res.status(401).json({ error: 'Missing access token. Please log in again.' });
    try {
      const payload = jwt.verify(token, SECRET);
      if (!allowedRoles.includes(payload.role)) {
        return res.status(403).json({ error: 'You do not have permission to do that.' });
      }
      req.role = payload.role;
      next();
    } catch (e) {
      return res.status(401).json({ error: 'Your session has expired. Please log in again.' });
    }
  };
}

module.exports = { issueToken, requireRole, SECRET };
