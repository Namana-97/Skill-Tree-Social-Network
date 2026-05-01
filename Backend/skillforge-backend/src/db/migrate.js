require('dotenv').config();
const pool = require('./pool');

const SQL = `
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  username      VARCHAR(40)  UNIQUE NOT NULL,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT         NOT NULL,
  display_name  VARCHAR(80)  NOT NULL,
  role_title    VARCHAR(120),
  bio           TEXT,
  avatar_initials VARCHAR(3),
  avatar_color  VARCHAR(20)  DEFAULT '#E63B3B',
  xp            INTEGER      DEFAULT 0,
  level         INTEGER      DEFAULT 1,
  created_at    TIMESTAMPTZ  DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS skills (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        VARCHAR(80)  NOT NULL,
  level       SMALLINT     NOT NULL CHECK (level BETWEEN 1 AND 5),
  color       VARCHAR(20)  DEFAULT '#E63B3B',
  proof_url   TEXT,
  created_at  TIMESTAMPTZ  DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  DEFAULT NOW(),
  UNIQUE (user_id, name)
);

CREATE TABLE IF NOT EXISTS skill_edges (
  id               SERIAL PRIMARY KEY,
  user_id          INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source_skill_id  INTEGER NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  target_skill_id  INTEGER NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  CHECK (source_skill_id <> target_skill_id),
  UNIQUE (user_id, source_skill_id, target_skill_id)
);

CREATE TABLE IF NOT EXISTS vouches (
  id           SERIAL PRIMARY KEY,
  voucher_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  skill_id     INTEGER NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  message      TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (voucher_id, skill_id)
);

CREATE TABLE IF NOT EXISTS matches (
  id          SERIAL PRIMARY KEY,
  user_a_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_b_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  score       NUMERIC(5,2) NOT NULL,
  computed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_a_id, user_b_id)
);

CREATE TABLE IF NOT EXISTS site_settings (
  key         VARCHAR(80) PRIMARY KEY,
  value_text  TEXT,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS testimonials (
  id              SERIAL PRIMARY KEY,
  slug            VARCHAR(80) UNIQUE NOT NULL,
  display_name    VARCHAR(80) NOT NULL,
  role_title      VARCHAR(120),
  quote           TEXT NOT NULL,
  avatar_initials VARCHAR(3),
  avatar_color    VARCHAR(20) DEFAULT '#E63B3B',
  sort_order      INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS avatar_initials VARCHAR(3),
  ADD COLUMN IF NOT EXISTS avatar_color VARCHAR(20) DEFAULT '#E63B3B',
  ADD COLUMN IF NOT EXISTS xp INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE skills
  ADD COLUMN IF NOT EXISTS color VARCHAR(20) DEFAULT '#E63B3B',
  ADD COLUMN IF NOT EXISTS proof_url TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS computed_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE testimonials
  ADD COLUMN IF NOT EXISTS slug VARCHAR(80),
  ADD COLUMN IF NOT EXISTS display_name VARCHAR(80),
  ADD COLUMN IF NOT EXISTS role_title VARCHAR(120),
  ADD COLUMN IF NOT EXISTS quote TEXT,
  ADD COLUMN IF NOT EXISTS avatar_initials VARCHAR(3),
  ADD COLUMN IF NOT EXISTS avatar_color VARCHAR(20) DEFAULT '#E63B3B',
  ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'skills_user_id_name_key'
  ) THEN
    ALTER TABLE skills ADD CONSTRAINT skills_user_id_name_key UNIQUE (user_id, name);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'testimonials_slug_key'
  ) THEN
    ALTER TABLE testimonials ADD CONSTRAINT testimonials_slug_key UNIQUE (slug);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_skills_user_id ON skills(user_id);
CREATE INDEX IF NOT EXISTS idx_skill_edges_user_id ON skill_edges(user_id);
CREATE INDEX IF NOT EXISTS idx_vouches_recipient_id ON vouches(recipient_id);
CREATE INDEX IF NOT EXISTS idx_matches_user_a_id ON matches(user_a_id);
CREATE INDEX IF NOT EXISTS idx_testimonials_sort_order ON testimonials(sort_order, created_at);
`;

async function migrate() {
  try {
    await pool.query(SQL);
    console.log('✅ Database Schema Synced');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration Failed:', err.message);
    process.exit(1);
  }
}

migrate();
