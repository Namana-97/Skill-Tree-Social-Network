const { body, validationResult } = require('express-validator');
const pool = require('../db/pool');
const { applyXpDelta } = require('../utils/userProgress');

// ── Validation rules ──────────────────────────────────
const addSkillRules = [
  body('name').trim().notEmpty().isLength({ max: 80 }).withMessage('Skill name required (max 80 chars).'),
  body('level').isInt({ min: 1, max: 5 }).withMessage('Level must be between 1 and 5.'),
  body('color').optional().matches(/^#[0-9A-Fa-f]{6}$/).withMessage('Color must be a valid hex code.'),
  body('proof_url').optional({ values: 'falsy' }).isURL({ require_protocol: true }).withMessage('Proof URL must be a valid URL.'),
];

const updateSkillRules = [
  body('level').optional().isInt({ min: 1, max: 5 }).withMessage('Level must be between 1 and 5.'),
  body('color').optional().matches(/^#[0-9A-Fa-f]{6}$/).withMessage('Color must be a valid hex code.'),
  body('proof_url').optional({ values: 'falsy' }).isURL({ require_protocol: true }).withMessage('Proof URL must be a valid URL.'),
];

// ── GET /users/:userId/skills ─────────────────────────
async function getSkillTree(req, res) {
  const userId = parseInt(req.params.userId);
  if (isNaN(userId)) return res.status(400).json({ error: 'Invalid user ID.' });

  try {
    const [nodesRes, edgesRes] = await Promise.all([
      pool.query(
        `SELECT s.id, s.name, s.level, s.color, s.proof_url, s.created_at,
                COUNT(v.id)::int AS vouch_count
         FROM skills s
         LEFT JOIN vouches v ON v.skill_id = s.id
         WHERE s.user_id = $1
         GROUP BY s.id
         ORDER BY s.level DESC, s.name`,
        [userId]
      ),
      pool.query(
        `SELECT se.id, se.source_skill_id AS source, se.target_skill_id AS target
         FROM skill_edges se WHERE se.user_id = $1`,
        [userId]
      )
    ]);
    res.json({ nodes: nodesRes.rows, edges: edgesRes.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not fetch skill tree.' });
  }
}

// ── POST /skills ──────────────────────────────────────
async function addSkill(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }

  const { name, level, color, proof_url } = req.body;
  const userId = req.user.id;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `INSERT INTO skills (user_id, name, level, color, proof_url)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [userId, name.trim(), level, color || '#E63B3B', proof_url || null]
    );

    await applyXpDelta(client, userId, level * 20);

    await client.query('COMMIT');
    recomputeMatches(userId).catch(console.error);
    res.status(201).json(rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') {
      return res.status(409).json({ error: 'You already have this skill. Update it instead.' });
    }
    console.error(err);
    res.status(500).json({ error: 'Could not add skill.' });
  } finally {
    client.release();
  }
}

// ── PUT /skills/:skillId ──────────────────────────────
async function updateSkill(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }

  const skillId = parseInt(req.params.skillId);
  if (isNaN(skillId)) return res.status(400).json({ error: 'Invalid skill ID.' });

  const { level, color, proof_url } = req.body;
  const userId = req.user.id;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const own = await client.query(
      'SELECT id, level, color, proof_url FROM skills WHERE id=$1 AND user_id=$2',
      [skillId, userId]
    );
    if (own.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Not your skill.' });
    }

    const old = own.rows[0];
    const newLevel = level ?? old.level;
    const { rows } = await client.query(
      `UPDATE skills SET level=$1, color=$2, proof_url=$3, updated_at=NOW()
       WHERE id=$4 RETURNING *`,
      [newLevel, color ?? old.color, proof_url ?? old.proof_url, skillId]
    );

    const xpDelta = (newLevel - old.level) * 20;
    if (xpDelta !== 0) {
      await applyXpDelta(client, userId, xpDelta);
    }

    await client.query('COMMIT');
    recomputeMatches(userId).catch(console.error);
    res.json(rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Could not update skill.' });
  } finally {
    client.release();
  }
}

// ── DELETE /skills/:skillId ───────────────────────────
async function deleteSkill(req, res) {
  const skillId = parseInt(req.params.skillId);
  if (isNaN(skillId)) return res.status(400).json({ error: 'Invalid skill ID.' });
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const own = await client.query(
      'SELECT level FROM skills WHERE id=$1 AND user_id=$2',
      [skillId, req.user.id]
    );
    if (own.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Not your skill.' });
    }

    const result = await client.query(
      'DELETE FROM skills WHERE id=$1 AND user_id=$2 RETURNING id',
      [skillId, req.user.id]
    );

    await applyXpDelta(client, req.user.id, -own.rows[0].level * 20);
    await client.query('COMMIT');

    recomputeMatches(req.user.id).catch(console.error);
    res.json({ deleted: skillId });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Could not delete skill.' });
  } finally {
    client.release();
  }
}

// ── POST /skills/edges ────────────────────────────────
async function addEdge(req, res) {
  const { source_skill_id, target_skill_id } = req.body;
  if (!source_skill_id || !target_skill_id) {
    return res.status(400).json({ error: 'source_skill_id and target_skill_id required.' });
  }
  if (source_skill_id === target_skill_id) {
    return res.status(400).json({ error: 'Cannot connect a skill to itself.' });
  }

  const userId = req.user.id;
  try {
    const check = await pool.query(
      'SELECT id FROM skills WHERE id = ANY($1::int[]) AND user_id=$2',
      [[source_skill_id, target_skill_id], userId]
    );
    if (check.rows.length < 2) {
      return res.status(403).json({ error: 'Skills must both belong to you.' });
    }

    const { rows } = await pool.query(
      `INSERT INTO skill_edges (user_id, source_skill_id, target_skill_id)
       VALUES ($1,$2,$3) ON CONFLICT DO NOTHING RETURNING *`,
      [userId, source_skill_id, target_skill_id]
    );
    res.status(201).json(rows[0] || { message: 'Edge already exists.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not add edge.' });
  }
}

// ── DELETE /skills/edges/:edgeId ──────────────────────
async function deleteEdge(req, res) {
  const edgeId = parseInt(req.params.edgeId);
  if (isNaN(edgeId)) return res.status(400).json({ error: 'Invalid edge ID.' });

  try {
    const result = await pool.query(
      'DELETE FROM skill_edges WHERE id=$1 AND user_id=$2 RETURNING id',
      [edgeId, req.user.id]
    );
    if (result.rowCount === 0) return res.status(403).json({ error: 'Not your edge.' });
    res.json({ deleted: edgeId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not delete edge.' });
  }
}

// ── INTERNAL: recompute complement scores ─────────────
async function recomputeMatches(userId) {
  const [mine, otherUsers, otherSkills] = await Promise.all([
    pool.query('SELECT name FROM skills WHERE user_id=$1', [userId]),
    pool.query('SELECT id FROM users WHERE id != $1', [userId]),
    pool.query('SELECT user_id, name FROM skills WHERE user_id != $1', [userId]),
  ]);

  const myNames = new Set(mine.rows.map(s => s.name));
  const myNamesArr = [...myNames];

  const byUser = new Map(otherUsers.rows.map(row => [row.id, []]));
  otherSkills.rows.forEach(row => {
    if (!byUser.has(row.user_id)) byUser.set(row.user_id, []);
    byUser.get(row.user_id).push(row.name);
  });

  await pool.query('DELETE FROM matches WHERE user_a_id=$1 OR user_b_id=$1', [userId]);

  for (const [otherId, names] of byUser.entries()) {
    const theirNames = new Set(names);
    const theirNamesArr = [...theirNames];
    const theyFill = theirNamesArr.filter(name => !myNames.has(name)).length;
    const youFill = myNamesArr.filter(name => !theirNames.has(name)).length;
    const total = new Set([...myNamesArr, ...theirNamesArr]).size;
    const score = total > 0 ? Math.round(((theyFill + youFill) / total) * 100) : 0;

    await pool.query(
      `INSERT INTO matches (user_a_id, user_b_id, score, computed_at)
       VALUES ($1,$2,$3,NOW()), ($2,$1,$3,NOW())
       ON CONFLICT (user_a_id, user_b_id)
       DO UPDATE SET score = EXCLUDED.score, computed_at = NOW()`,
      [userId, otherId, score]
    );
  }
}

module.exports = {
  getSkillTree, addSkill, addSkillRules,
  updateSkill, updateSkillRules,
  deleteSkill, addEdge, deleteEdge
};
