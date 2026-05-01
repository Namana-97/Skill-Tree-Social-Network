const pool = require('../db/pool');

const FEATURED_USER_SETTING_KEY = 'landing_featured_user_id';

async function getLandingContent(req, res) {
  try {
    const [statsRes, settingRes, testimonialsRes, tickerRes] = await Promise.all([
      pool.query(`
        SELECT
          (SELECT COUNT(*)::int FROM users) AS trees,
          (SELECT COUNT(*)::int FROM vouches) AS vouches,
          (SELECT COUNT(*)::int FROM skills) AS skills
      `),
      pool.query(
        'SELECT value_text FROM site_settings WHERE key = $1',
        [FEATURED_USER_SETTING_KEY]
      ),
      pool.query(`
        SELECT display_name, role_title, quote, avatar_initials, avatar_color
        FROM testimonials
        ORDER BY sort_order ASC, created_at ASC
        LIMIT 3
      `),
      pool.query(`
        WITH recent_vouches AS (
          SELECT
            u.display_name AS who,
            'Vouched ' || s.name || ' · Lv.' || s.level AS what,
            v.created_at AS happened_at
          FROM vouches v
          JOIN users u ON u.id = v.voucher_id
          JOIN skills s ON s.id = v.skill_id
          ORDER BY v.created_at DESC
          LIMIT 3
        ),
        recent_skills AS (
          SELECT
            u.display_name AS who,
            'Added ' || s.name || ' · Lv.' || s.level AS what,
            s.created_at AS happened_at
          FROM skills s
          JOIN users u ON u.id = s.user_id
          ORDER BY s.created_at DESC
          LIMIT 3
        ),
        recent_matches AS (
          SELECT
            u.display_name AS who,
            'Found complement match' AS what,
            m.computed_at AS happened_at
          FROM matches m
          JOIN users u ON u.id = m.user_a_id
          WHERE m.user_a_id < m.user_b_id
          ORDER BY m.computed_at DESC
          LIMIT 2
        )
        SELECT who, what
        FROM (
          SELECT * FROM recent_vouches
          UNION ALL
          SELECT * FROM recent_skills
          UNION ALL
          SELECT * FROM recent_matches
        ) activity
        ORDER BY happened_at DESC NULLS LAST
        LIMIT 6
      `),
    ]);

    const configuredId = parseInt(settingRes.rows[0]?.value_text, 10);
    const featuredProfile = await loadFeaturedProfile(Number.isNaN(configuredId) ? null : configuredId);
    const featuredTree = featuredProfile
      ? await loadFeaturedTree(featuredProfile.id)
      : { nodes: [], edges: [] };

    res.json({
      stats: statsRes.rows[0] || { trees: 0, vouches: 0, skills: 0 },
      featured_profile: featuredProfile,
      featured_tree: featuredTree,
      ticker: tickerRes.rows,
      testimonials: testimonialsRes.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not load landing content.' });
  }
}

async function loadFeaturedProfile(configuredId) {
  if (configuredId) {
    const configured = await queryFeaturedUser(configuredId);
    if (configured) return configured;
  }

  const fallback = await pool.query(`
    SELECT id
    FROM users
    ORDER BY level DESC, xp DESC, created_at ASC
    LIMIT 1
  `);

  if (!fallback.rows.length) return null;
  return queryFeaturedUser(fallback.rows[0].id);
}

async function queryFeaturedUser(userId) {
  const { rows } = await pool.query(`
    SELECT
      u.id,
      u.display_name,
      u.role_title,
      u.avatar_initials,
      u.avatar_color,
      u.level,
      u.xp,
      COALESCE(vt.total_vouches, 0)::int AS total_vouches,
      COALESCE(vr.recent_vouches, 0)::int AS recent_vouches
    FROM users u
    LEFT JOIN LATERAL (
      SELECT COUNT(*)::int AS total_vouches
      FROM vouches
      WHERE recipient_id = u.id
    ) vt ON true
    LEFT JOIN LATERAL (
      SELECT COUNT(*)::int AS recent_vouches
      FROM vouches
      WHERE recipient_id = u.id
        AND created_at >= NOW() - INTERVAL '30 days'
    ) vr ON true
    WHERE u.id = $1
  `, [userId]);

  return rows[0] || null;
}

async function loadFeaturedTree(userId) {
  const nodesRes = await pool.query(`
    SELECT
      s.id,
      s.name,
      s.level,
      s.color,
      COUNT(v.id)::int AS vouch_count
    FROM skills s
    LEFT JOIN vouches v ON v.skill_id = s.id
    WHERE s.user_id = $1
    GROUP BY s.id
    ORDER BY s.level DESC, s.name ASC
    LIMIT 7
  `, [userId]);

  const nodeIds = nodesRes.rows.map(row => row.id);
  if (!nodeIds.length) {
    return { nodes: [], edges: [] };
  }

  const edgesRes = await pool.query(`
    SELECT
      source_skill_id AS source,
      target_skill_id AS target
    FROM skill_edges
    WHERE user_id = $1
      AND source_skill_id = ANY($2::int[])
      AND target_skill_id = ANY($2::int[])
  `, [userId, nodeIds]);

  return {
    nodes: nodesRes.rows,
    edges: edgesRes.rows,
  };
}

module.exports = { getLandingContent };
