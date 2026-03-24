const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
  const header = req.headers['authorization'];
  
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: No token provided.' });
  }

  const token = header.split(' ')[1];

  try {
    // Ensure your .env has JWT_SECRET defined
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret_key');
    req.user = payload; // This passes { id, username, email } to the controllers
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or expired token.' });
  }
}

module.exports = authMiddleware;