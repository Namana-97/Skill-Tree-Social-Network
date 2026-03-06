const pool = require('../db/pool');

// ── GET /match/:userId ────────────────────────────────
// Returns top complement matches for a user, with gap analysis
async function getMatches(req, res) {
  const userId = parseInt(req.params.userId);
  const limit  = parseInt(req.query.limit) || 10;

  try {
    const { rows } = await pool.query(
      `SELECT
         m.score,
         u.id, u.display_name, u.role_title, u.avatar_initials, u.avatar_color, u.level,
         -- Aggregate their skills as JSON array
         COALESCE(
           json_agg(json_build_object('name',s.name,'level',s.level,'color',s.color))
           FILTER (WHERE s.id IS NOT NULL), '[]'
         ) AS their_skills,
         -- Total vouches they've received
         (SELECT COUNT(*) FROM vouches WHERE recipient_id = u.id)::int AS vouch_count
       FROM matches m
       JOIN users u ON u.id = m.user_b_id
       LEFT JOIN skills s ON s.user_id = u.id
       WHERE m.user_a_id = $1
       GROUP BY m.score, u.id
       ORDER BY m.score DESC
       LIMIT $2`,
      [userId, limit]
    );

    // For each match, compute gap details (what they have that you don't, and vice versa)
    const mySkills = await pool.query(
      'SELECT name, level FROM skills WHERE user_id=$1',
      [userId]
    );
    const myNames = new Set(mySkills.rows.map(s => s.name));

    const enriched = rows.map(match => {
      const theirNames = new Set(match.their_skills.map(s => s.name));
      return {
        ...match,
        fills_your_gaps:  match.their_skills.filter(s => !myNames.has(s.name)),
        you_fill_theirs:  mySkills.rows.filter(s => !theirNames.has(s.name)),
        shared_skills:    match.their_skills.filter(s => myNames.has(s.name)),
      };
    });

    res.json(enriched);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not compute matches.' });
  }
}

// ── GET /discover ─────────────────────────────────────
// Public search: filter by skill name, role, sort order
async function discover(req, res) {
  const { skill, role, sort = 'level', page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const viewerId = req.user?.id;  // optional (auth middleware may be skipped)

  try {
    let baseQuery = `
      SELECT
        u.id, u.display_name, u.username, u.role_title,
        u.avatar_initials, u.avatar_color, u.level, u.xp,
        COALESCE(json_agg(
          json_build_object('name',s.name,'level',s.level,'color',s.color)
          ORDER BY s.level DESC
        ) FILTER (WHERE s.id IS NOT NULL), '[]') AS skills,
        (SELECT COUNT(*) FROM vouches WHERE recipient_id=u.id)::int AS vouch_count
        ${viewerId ? `, (SELECT score FROM matches WHERE user_a_id=${viewerId} AND user_b_id=u.id) AS match_score` : ''}
      FROM users u
      LEFT JOIN skills s ON s.user_id = u.id
      ${viewerId ? `WHERE u.id != ${viewerId}` : 'WHERE 1=1'}
    `;

    const params = [];

    if (skill) {
      params.push(`%${skill.toLowerCase()}%`);
      baseQuery += ` AND u.id IN (
        SELECT user_id FROM skills WHERE LOWER(name) LIKE $${params.length}
      )`;
    }
    if (role) {
      params.push(`%${role.toLowerCase()}%`);
      baseQuery += ` AND LOWER(u.role_title) LIKE $${params.length}`;
    }

    baseQuery += ' GROUP BY u.id';

    const orderMap = {
      level:   'u.level DESC',
      vouches: 'vouch_count DESC',
      match:   viewerId ? 'match_score DESC NULLS LAST' : 'u.level DESC',
      newest:  'u.created_at DESC',
    };
    baseQuery += ` ORDER BY ${orderMap[sort] || orderMap.level}`;

    params.push(parseInt(limit), offset);
    baseQuery += ` LIMIT $${params.length - 1} OFFSET $${params.length}`;

    const { rows } = await pool.query(baseQuery, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Discover query failed.' });
  }
}

// ── GET /users/:userId/profile ────────────────────────
// Full public profile — user + skills + vouch count
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
      user: userRes.rows[0],
      skills: skillsRes.rows,
      total_vouches: vouchCountRes.rows[0].total,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not load profile.' });
  }
}

module.exports = { getMatches, discover, getProfile };
