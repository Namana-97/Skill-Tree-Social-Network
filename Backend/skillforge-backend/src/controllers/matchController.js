const pool = require('../db/pool');

// ── GET /match/:userId ────────────────────────────────
async function getMatches(req, res) {
  const userId = parseInt(req.params.userId);
  if (isNaN(userId)) return res.status(400).json({ error: 'Invalid user ID.' });
  if (userId !== req.user.id) {
    return res.status(403).json({ error: 'You can only view your own matches.' });
  }

  const limit  = parseInt(req.query.limit) || 10;

  try {
    const { rows } = await pool.query(
      `SELECT
         m.score, m.computed_at,
         u.id, u.display_name, u.role_title, u.avatar_initials, u.avatar_color, u.level,
         COALESCE(
           json_agg(json_build_object('name',s.name,'level',s.level,'color',s.color))
           FILTER (WHERE s.id IS NOT NULL), '[]'
         ) AS their_skills,
         (SELECT COUNT(*) FROM vouches WHERE recipient_id = u.id)::int AS vouch_count
       FROM matches m
       JOIN users u ON u.id = m.user_b_id
       LEFT JOIN skills s ON s.user_id = u.id
       WHERE m.user_a_id = $1
       GROUP BY m.id, m.score, m.computed_at, u.id
       ORDER BY m.score DESC
       LIMIT $2`,
      [userId, limit]
    );

    const mySkills = await pool.query(
      'SELECT name, level FROM skills WHERE user_id=$1',
      [userId]
    );
    const myNames = new Set(mySkills.rows.map(s => s.name));

    const enriched = rows.map(match => {
      const theirNames = new Set(match.their_skills.map(s => s.name));
      return {
        ...match,
        fills_your_gaps: match.their_skills.filter(s => !myNames.has(s.name)),
        you_fill_theirs: mySkills.rows.filter(s => !theirNames.has(s.name)),
        shared_skills:   match.their_skills.filter(s => myNames.has(s.name)),
      };
    });

    res.json(enriched);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not compute matches.' });
  }
}

// ── GET /discover ─────────────────────────────────────
async function discover(req, res) {
  const { q, skill, role, sort = 'level', page = 1, limit = 20 } = req.query;
  const safePage = Math.max(1, parseInt(page) || 1);
  const safeLimit = Math.min(50, Math.max(1, parseInt(limit) || 20));
  const offset   = (safePage - 1) * safeLimit;
  const viewerId = req.user?.id ? parseInt(req.user.id) : null;

  try {
    const params = [];

    let selectClause = `
      SELECT
        u.id, u.display_name, u.username, u.role_title,
        u.avatar_initials, u.avatar_color, u.level, u.xp,
        COALESCE(json_agg(
          json_build_object('name',s.name,'level',s.level,'color',s.color)
          ORDER BY s.level DESC
        ) FILTER (WHERE s.id IS NOT NULL), '[]') AS skills,
        (SELECT COUNT(*) FROM vouches WHERE recipient_id=u.id)::int AS vouch_count
    `;

    if (viewerId) {
      params.push(viewerId);
      selectClause += `,
        (SELECT score FROM matches WHERE user_a_id=$${params.length} AND user_b_id=u.id) AS match_score`;
    }

    let whereClause = 'WHERE 1=1';
    if (viewerId) {
      params.push(viewerId);
      whereClause += ` AND u.id != $${params.length}`;
    }

    if (q) {
      params.push(`%${q.toLowerCase()}%`);
      whereClause += ` AND (
        LOWER(u.display_name) LIKE $${params.length}
        OR LOWER(u.username) LIKE $${params.length}
        OR LOWER(COALESCE(u.role_title, '')) LIKE $${params.length}
        OR EXISTS (
          SELECT 1
          FROM skills qs
          WHERE qs.user_id = u.id
            AND LOWER(qs.name) LIKE $${params.length}
        )
      )`;
    }

    if (skill) {
      params.push(`%${skill.toLowerCase()}%`);
      whereClause += ` AND u.id IN (SELECT user_id FROM skills WHERE LOWER(name) LIKE $${params.length})`;
    }
    if (role) {
      params.push(`%${role.toLowerCase()}%`);
      whereClause += ` AND LOWER(u.role_title) LIKE $${params.length}`;
    }

    const orderMap = {
      level:   'u.level DESC',
      vouches: 'vouch_count DESC',
      match:   viewerId ? 'match_score DESC NULLS LAST' : 'u.level DESC',
      newest:  'u.created_at DESC',
    };
    const orderClause = orderMap[sort] || orderMap.level;

    params.push(safeLimit, offset);
    const limitClause = `LIMIT $${params.length - 1} OFFSET $${params.length}`;

    const fullQuery = `
      ${selectClause}
      FROM users u
      LEFT JOIN skills s ON s.user_id = u.id
      ${whereClause}
      GROUP BY u.id
      ORDER BY ${orderClause}
      ${limitClause}
    `;

    const { rows } = await pool.query(fullQuery, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Discover query failed.' });
  }
}

// ── GET /users/:userId/profile ────────────────────────
async function getProfile(req, res) {
  const userId = parseInt(req.params.userId);
  try {
    const userRes = await pool.query(
      `SELECT id, username, display_name, role_title, bio,
              avatar_initials, avatar_color, level, xp, created_at
       FROM users WHERE id=$1`,
      [userId]
    );
    if (userRes.rows.length === 0) return res.status(404).json({ error: 'User not found.' });

    const [skillsRes, vouchCountRes] = await Promise.all([
      pool.query(
        `SELECT s.*, COUNT(v.id)::int AS vouch_count
         FROM skills s LEFT JOIN vouches v ON v.skill_id=s.id
         WHERE s.user_id=$1 GROUP BY s.id ORDER BY s.level DESC`,
        [userId]
      ),
      pool.query(
        'SELECT COUNT(*)::int AS total FROM vouches WHERE recipient_id=$1',
        [userId]
      )
    ]);

    res.json({
      user:         userRes.rows[0],
      skills:       skillsRes.rows,
      total_vouches: vouchCountRes.rows[0].total,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not load profile.' });
  }
}

module.exports = { getMatches, discover, getProfile };
