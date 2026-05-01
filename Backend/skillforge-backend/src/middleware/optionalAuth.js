const jwt = require('jsonwebtoken');
const { getJwtSecret } = require('../utils/jwt');

function optionalAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return next();
  }

  const token = header.split(' ')[1];
  try {
    req.user = jwt.verify(token, getJwtSecret());
  } catch {
    req.user = null;
  }

  next();
}

module.exports = optionalAuth;
