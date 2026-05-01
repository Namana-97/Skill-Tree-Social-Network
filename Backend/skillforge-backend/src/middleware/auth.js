const jwt = require('jsonwebtoken');
const { getJwtSecret } = require('../utils/jwt');

function authMiddleware(req, res, next) {
  const header = req.headers['authorization'];
  
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: No token provided.' });
  }

  const token = header.split(' ')[1];

  try {
    const payload = jwt.verify(token, getJwtSecret());
    req.user = payload; // This passes { id, username, email } to the controllers
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or expired token.' });
  }
}

module.exports = authMiddleware;
