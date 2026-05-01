require('dotenv').config();
const express   = require('express');
const cors      = require('cors');
const rateLimit = require('express-rate-limit');
const routes    = require('./routes');

const app  = express();
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '127.0.0.1';
const isProd = process.env.NODE_ENV === 'production';

// ── CORS ──────────────────────────────────────────────
// The logic here is preserved, but expanded to handle local dev environments
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',').map(o => o.trim()).filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) {
      return cb(null, true);
    }
    if (!isProd && origin === 'null') {
      return cb(null, true);
    }
    try {
      const { hostname } = new URL(origin);
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return cb(null, true);
      }
    } catch {
      return cb(null, false);
    }
    return cb(null, false);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true 
}));

// ── BODY PARSER ───────────────────────────────────────
app.use(express.json());

// ── RATE LIMITING ─────────────────────────────────────
// I've kept your 15m/20 logic but increased 'max' to 100 for dev 
// so you don't lock yourself out while refreshing the page.
app.use('/api/auth', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100, 
  message: { error: 'Too many auth requests. Try again later.' },
}));

app.use('/api/vouches', rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 100,
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
app.use((err, req, res, next) => {
  console.error("SERVER_ERROR:", err.stack); // Added label for easier terminal reading
  res.status(500).json({ error: err.message || 'Internal server error.' });
});

// ── START ─────────────────────────────────────────────
app.listen(PORT, HOST, () => {
  console.log(`\n⬡  SkillForge API running on http://${HOST}:${PORT}`);
  console.log(`   Environment : ${process.env.NODE_ENV || 'development'}`);
  console.log(`   DB          : ${process.env.DB_NAME}@${process.env.DB_HOST}\n`);
});
