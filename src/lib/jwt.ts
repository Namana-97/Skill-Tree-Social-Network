export function getJwtSecret() {
  return process.env.JWT_SECRET || 'dev_secret_key';
}
