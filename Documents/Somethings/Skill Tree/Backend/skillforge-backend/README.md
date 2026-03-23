# SkillForge — Backend

Node.js · Express · PostgreSQL

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Copy env file and fill in your DB credentials
cp .env.example .env

# 3. Create the database in PostgreSQL
createdb skillforge

# 4. Run migrations (creates all tables)
npm run db:migrate

# 5. Seed with demo data (optional)
npm run db:seed

# 6. Start dev server (hot reload)
npm run dev
```

Server runs on **http://localhost:3001**

---

## Project Structure

```
skillforge-backend/
├── src/
│   ├── index.js                 ← Express app entry point
│   ├── routes/
│   │   └── index.js             ← All routes wired together
│   ├── controllers/
│   │   ├── authController.js    ← Register / login / me
│   │   ├── skillsController.js  ← CRUD skills + edges + match recompute
│   │   ├── vouchController.js   ← Create / delete vouches (with level check)
│   │   └── matchController.js   ← Discover + complement matching algorithm
│   ├── middleware/
│   │   └── auth.js              ← JWT verification middleware
│   └── db/
│       ├── pool.js              ← PostgreSQL connection pool
│       ├── migrate.js           ← Schema creation
│       └── seed.js              ← Demo data
├── API.md                       ← Full endpoint reference
├── .env.example
└── package.json
```

## Key Design Decisions

**Complement Matching Algorithm**
The score between user A and user B is:
```
score = (skills they have that A doesn't + skills A has that they don't)
        ─────────────────────────────────────────────────────────────── × 100
                    total unique skills combined
```
Scores are cached in the `matches` table and recomputed asynchronously whenever a user updates their tree (fire-and-forget, non-blocking).

**Vouch Constraint**
Enforced in `vouchController.js`: you can only vouch for a skill if you yourself hold that skill at ≥ the recipient's level. This prevents inflation.

**XP System**
- +20 XP per skill level when adding a new skill
- +20 XP × (level delta) when leveling up an existing skill
- +15 XP to the recipient per vouch received
