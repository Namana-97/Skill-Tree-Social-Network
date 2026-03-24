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
  color       VARCHAR(20)  DEFAULT '#E63B3B'
);

CREATE TABLE IF NOT EXISTS matches (
  id          SERIAL PRIMARY KEY,
  user_a_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_b_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  score       NUMERIC(5,2) NOT NULL,
  UNIQUE (user_a_id, user_b_id)
);
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