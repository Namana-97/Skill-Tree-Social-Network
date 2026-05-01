function getJwtSecret() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  return 'dev_secret_key';
}

module.exports = { getJwtSecret };
