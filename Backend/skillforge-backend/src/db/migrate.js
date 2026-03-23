/**
 * migrate.js — Run this once to create the SkillForge schema.
 * Usage: node src/db/migrate.js
 */
require('dotenv').config();
const pool = require('./pool');

const SQL = `

-- ─────────────────────────────────────────
-- USERS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  username      VARCHAR(40)  UNIQUE NOT NULL,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT         NOT NULL,
  display_name  VARCHAR(80)  NOT NULL,
  role_title    VARCHAR(120),          -- e.g. "Full-Stack Developer"
  bio           TEXT,
  avatar_initials VARCHAR(3),
  avatar_color  VARCHAR(20)  DEFAULT '#E63B3B',
  xp            INTEGER      DEFAULT 0,
  level         INTEGER      DEFAULT 1,
  created_at    TIMESTAMPTZ  DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- SKILLS  (nodes in the tree)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS skills (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        VARCHAR(80)  NOT NULL,
  level       SMALLINT     NOT NULL CHECK (level BETWEEN 1 AND 5),
  color       VARCHAR(20)  DEFAULT '#E63B3B',
  proof_url   TEXT,                    -- link to project / repo
  created_at  TIMESTAMPTZ  DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  DEFAULT NOW(),
  -- Each user can only have one entry per skill name
  UNIQUE (user_id, name)
);

-- ─────────────────────────────────────────
-- SKILL EDGES  (links between nodes)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS skill_edges (
  id           SERIAL PRIMARY KEY,
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source_skill_id INTEGER NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  target_skill_id INTEGER NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, source_skill_id, target_skill_id)
);

-- ─────────────────────────────────────────
-- VOUCHES
-- A vouch = one user vouching for another user's skill.
-- CONSTRAINT: voucher must hold the same skill at >= the target level.
-- That check is enforced in application logic (controller).
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vouches (
  id              SERIAL PRIMARY KEY,
  voucher_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  skill_id        INTEGER NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  message         TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  -- One vouch per voucher per skill
  UNIQUE (voucher_id, skill_id)
);

-- ─────────────────────────────────────────
-- MATCHES  (cached complement scores)
-- Recomputed when a user updates their tree.
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS matches (
  id          SERIAL PRIMARY KEY,
  user_a_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_b_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  score       NUMERIC(5,2) NOT NULL,  -- 0.00 – 100.00
  computed_at TIMESTAMPTZ  DEFAULT NOW(),
  UNIQUE (user_a_id, user_b_id)
);

-- ─────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_skills_user_id      ON skills(user_id);
CREATE INDEX IF NOT EXISTS idx_skill_edges_user_id ON skill_edges(user_id);
CREATE INDEX IF NOT EXISTS idx_vouches_recipient   ON vouches(recipient_id);
CREATE INDEX IF NOT EXISTS idx_vouches_skill       ON vouches(skill_id);
CREATE INDEX IF NOT EXISTS idx_matches_user_a      ON matches(user_a_id);
CREATE INDEX IF NOT EXISTS idx_matches_user_b      ON matches(user_b_id);
CREATE INDEX IF NOT EXISTS idx_matches_score       ON matches(score DESC);

`;

async function migrate() {
  console.log('🔧  Running SkillForge migrations...');
  const client = await pool.connect();
  try {
    await client.query(SQL);
    console.log('✅  All tables created (or already exist).');
  } catch (err) {
    console.error('❌  Migration failed:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
