const pool = require('../db/pool');

// ── GET /users/:userId/skills ─────────────────────────
// Returns all skill nodes + edges for a user's tree
async function getSkillTree(req, res) {
  const userId = parseInt(req.params.userId);
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
         FROM skill_edges se
         WHERE se.user_id = $1`,
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
// Add a new skill node
async function addSkill(req, res) {
  const { name, level, color, proof_url } = req.body;
  const userId = req.user.id;

  try {
    const { rows } = await pool.query(
      `INSERT INTO skills (user_id, name, level, color, proof_url)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING *`,
      [userId, name, level, color || '#E63B3B', proof_url || null]
    );

    // Award XP: level * 20
    await pool.query(
      'UPDATE users SET xp = xp + $1 WHERE id = $2',
      [level * 20, userId]
    );

    // Recompute matches asynchronously (don't await — fire and forget)
    recomputeMatches(userId).catch(console.error);

    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') {  // unique violation
      return res.status(409).json({ error: 'You already have this skill. Update it instead.' });
    }
    console.error(err);
    res.status(500).json({ error: 'Could not add skill.' });
  }
}

// ── PUT /skills/:skillId ──────────────────────────────
// Update level / color / proof for an existing skill (owner only)
async function updateSkill(req, res) {
  const skillId = parseInt(req.params.skillId);
  const { level, color, proof_url } = req.body;
  const userId = req.user.id;

  try {
    // Confirm ownership
    const own = await pool.query(
      'SELECT id, level FROM skills WHERE id=$1 AND user_id=$2',
      [skillId, userId]
    );
    if (own.rows.length === 0) {
      return res.status(403).json({ error: 'Not your skill.' });
    }

    const oldLevel = own.rows[0].level;
    const { rows } = await pool.query(
      `UPDATE skills SET level=$1, color=$2, proof_url=$3, updated_at=NOW()
       WHERE id=$4 RETURNING *`,
      [level ?? oldLevel, color ?? own.rows[0].color, proof_url ?? own.rows[0].proof_url, skillId]
    );

    // If level increased, award XP
    if (level > oldLevel) {
      const xpGain = (level - oldLevel) * 20;
      await pool.query('UPDATE users SET xp=xp+$1 WHERE id=$2', [xpGain, userId]);
    }

    recomputeMatches(userId).catch(console.error);
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not update skill.' });
  }
}

// ── DELETE /skills/:skillId ───────────────────────────
async function deleteSkill(req, res) {
  const skillId = parseInt(req.params.skillId);
  const userId  = req.user.id;
  try {
    const result = await pool.query(
      'DELETE FROM skills WHERE id=$1 AND user_id=$2 RETURNING id',
      [skillId, userId]
    );
    if (result.rowCount === 0) {
      return res.status(403).json({ error: 'Not your skill.' });
    }
    res.json({ deleted: skillId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not delete skill.' });
  }
}

// ── POST /skills/edges ────────────────────────────────
// Connect two skill nodes
async function addEdge(req, res) {
  const { source_skill_id, target_skill_id } = req.body;
  const userId = req.user.id;

  // Verify both skills belong to this user
  try {
    const check = await pool.query(
      'SELECT id FROM skills WHERE id IN ($1,$2) AND user_id=$3',
      [source_skill_id, target_skill_id, userId]
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
  const userId = req.user.id;
  try {
    const result = await pool.query(
      'DELETE FROM skill_edges WHERE id=$1 AND user_id=$2 RETURNING id',
      [edgeId, userId]
    );
    if (result.rowCount === 0) return res.status(403).json({ error: 'Not your edge.' });
    res.json({ deleted: edgeId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not delete edge.' });
  }
}

// ── INTERNAL: recompute complement scores ─────────────
// Called after any tree mutation. Runs against all other users.
async function recomputeMatches(userId) {
  // Get this user's skill names
  const mine = await pool.query('SELECT name, level FROM skills WHERE user_id=$1', [userId]);
  const mySkills = mine.rows;

  // Get all other users' skills
  const others = await pool.query(
    `SELECT s.user_id, s.name, s.level FROM skills s
     WHERE s.user_id != $1`,
    [userId]
  );

  // Group by user
  const byUser = {};
  others.rows.forEach(r => {
    if (!byUser[r.user_id]) byUser[r.user_id] = [];
    byUser[r.user_id].push(r);
  });

  const myNames   = new Set(mySkills.map(s => s.name));
  const myNames_a = [...myNames];

  for (const [otherId, theirSkills] of Object.entries(byUser)) {
    const theirNames = new Set(theirSkills.map(s => s.name));
    const theirNames_a = [...theirNames];

    const theyFill = theirNames_a.filter(n => !myNames.has(n)).length;
    const youFill  = myNames_a.filter(n => !theirNames.has(n)).length;
    const total    = new Set([...myNames_a, ...theirNames_a]).size;

    const score = total > 0 ? Math.round(((theyFill + youFill) / total) * 100) : 0;

    await pool.query(
      `INSERT INTO matches (user_a_id, user_b_id, score)
       VALUES ($1,$2,$3)
       ON CONFLICT (user_a_id, user_b_id) DO UPDATE SET score=$3, computed_at=NOW()`,
      [userId, parseInt(otherId), score]
    );
  }
}

module.exports = { getSkillTree, addSkill, updateSkill, deleteSkill, addEdge, deleteEdge };
