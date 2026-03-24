require('dotenv').config();
const express   = require('express');
const cors      = require('cors');
const rateLimit = require('express-rate-limit');
const routes    = require('./routes');

const app  = express();
const PORT = process.env.PORT || 3001;

// ── CORS ──────────────────────────────────────────────
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',').map(o => o.trim()).filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (curl, Postman, mobile) or matching origin
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    // FIX: use cb(null, false) not cb(new Error(...)) — avoids leaking stack traces
    return cb(null, false);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── BODY PARSER ───────────────────────────────────────
app.use(express.json());

// ── RATE LIMITING ─────────────────────────────────────
// FIX: was '/auth' and '/vouches' — never matched because routes are under /api/*
// Corrected to '/api/auth' and '/api/vouches'
app.use('/api/auth', rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 min
  max: 20,
  message: { error: 'Too many auth requests. Try again later.' },
}));

app.use('/api/vouches', rateLimit({
  windowMs: 60 * 60 * 1000,  // 1 hour
  max: 50,
  message: { error: 'Vouch rate limit exceeded.' },
}));

// ── HEALTH CHECK ──────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok', ts: new Date() }));

// ── ROUTES ────────────────────────────────────────────
app.use('/api', routes);

// ── 404 ───────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `No route: ${req.method} ${req.path}` });
});

// ── ERROR HANDLER ─────────────────────────────────────
// Must have exactly 4 params for Express to treat as error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || 'Internal server error.' });
});

// ── START ─────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n⬡  SkillForge API running on http://localhost:${PORT}`);
  console.log(`   Environment : ${process.env.NODE_ENV || 'development'}`);
  console.log(`   DB          : ${process.env.DB_NAME}@${process.env.DB_HOST}\n`);
});