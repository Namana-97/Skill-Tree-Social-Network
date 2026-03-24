const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const pool   = require('../db/pool');

// ── Validation rules ──────────────────────────────────
const registerRules = [
  body('username').trim().isLength({ min:3, max:40 }).withMessage('Username must be 3–40 characters.'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required.'),
  body('password').isLength({ min:6 }).withMessage('Password must be at least 6 characters.'),
  body('display_name').trim().notEmpty().withMessage('Display name required.'),
];

const loginRules = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required.'),
  body('password').notEmpty().withMessage('Password required.'),
];

// ── POST /auth/register ───────────────────────────────
async function register(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }

  const { username, email, password, display_name, role_title } = req.body;

  try {
    const exists = await pool.query(
      'SELECT id FROM users WHERE email=$1 OR username=$2',
      [email, username]
    );
    if (exists.rows.length > 0) {
      return res.status(409).json({ error: 'Username or email already taken.' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const initials = display_name
      .split(' ').slice(0, 2).map(w => w[0].toUpperCase()).join('');

    const { rows } = await pool.query(
      `INSERT INTO users (username, email, password_hash, display_name, role_title, avatar_initials)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING id, username, email, display_name, role_title, level, xp`,
      [username, email, password_hash, display_name, role_title || '', initials]
    );

    const token = signToken(rows[0]);
    res.status(201).json({ token, user: rows[0] });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Registration failed.' });
  }
}

// ── POST /auth/login ──────────────────────────────────
async function login(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }

  const { email, password } = req.body;

  try {
    const { rows } = await pool.query(
      'SELECT * FROM users WHERE email=$1',
      [email]
    );
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const ok = await bcrypt.compare(password, rows[0].password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials.' });

    const { password_hash, ...safeUser } = rows[0];
    res.json({ token: signToken(rows[0]), user: safeUser });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed.' });
  }
}

// ── GET /auth/me ──────────────────────────────────────
async function me(req, res) {
  try {
    const { rows } = await pool.query(
      `SELECT id, username, email, display_name, role_title, bio,
              avatar_initials, avatar_color, xp, level, created_at
       FROM users WHERE id=$1`,
      [req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'User not found.' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not fetch user.' });
  }
}

// ── Helper ────────────────────────────────────────────
function signToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

module.exports = { register, registerRules, login, loginRules, me };