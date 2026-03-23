const pool = require('../db/pool');

// ── POST /vouches ─────────────────────────────────────
// Body: { skill_id, message? }
// Rule: You can only vouch for a skill if YOU hold the same skill at >= their level
async function createVouch(req, res) {
  const voucherId  = req.user.id;
  const { skill_id, message } = req.body;

  try {
    // 1. Get the target skill (with owner + level)
    const { rows: targetRows } = await pool.query(
      'SELECT * FROM skills WHERE id=$1',
      [skill_id]
    );
    if (targetRows.length === 0) {
      return res.status(404).json({ error: 'Skill not found.' });
    }
    const target = targetRows[0];

    // Can't vouch your own skill
    if (target.user_id === voucherId) {
      return res.status(400).json({ error: 'You cannot vouch your own skill.' });
    }

    // 2. Check that the voucher holds the same skill at >= target level
    const { rows: mySkill } = await pool.query(
      'SELECT level FROM skills WHERE user_id=$1 AND name=$2',
      [voucherId, target.name]
    );
    if (mySkill.length === 0 || mySkill[0].level < target.level) {
      return res.status(403).json({
        error: `You must hold "${target.name}" at level ${target.level} or higher to vouch for it.`
      });
    }

    // 3. Insert vouch
    const { rows } = await pool.query(
      `INSERT INTO vouches (voucher_id, recipient_id, skill_id, message)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (voucher_id, skill_id) DO NOTHING
       RETURNING *`,
      [voucherId, target.user_id, skill_id, message || null]
    );

    if (rows.length === 0) {
      return res.status(409).json({ error: 'You already vouched for this skill.' });
    }

    // 4. Award XP to recipient: +15 per vouch
    await pool.query('UPDATE users SET xp=xp+15 WHERE id=$1', [target.user_id]);

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not create vouch.' });
  }
}

// ── GET /users/:userId/vouches ────────────────────────
// Returns all vouches a user has received, grouped by skill
async function getVouchesForUser(req, res) {
  const userId = parseInt(req.params.userId);
  try {
    const { rows } = await pool.query(
      `SELECT v.id, v.message, v.created_at,
              s.name AS skill_name, s.level AS skill_level, s.color,
              u.display_name AS voucher_name, u.avatar_initials, u.avatar_color
       FROM vouches v
       JOIN skills  s ON s.id = v.skill_id
       JOIN users   u ON u.id = v.voucher_id
       WHERE v.recipient_id = $1
       ORDER BY v.created_at DESC`,
      [userId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not fetch vouches.' });
  }
}

// ── DELETE /vouches/:vouchId ──────────────────────────
async function deleteVouch(req, res) {
  const vouchId  = parseInt(req.params.vouchId);
  const voucherId = req.user.id;
  try {
    const result = await pool.query(
      'DELETE FROM vouches WHERE id=$1 AND voucher_id=$2 RETURNING id',
      [vouchId, voucherId]
    );
    if (result.rowCount === 0) {
      return res.status(403).json({ error: 'Not your vouch.' });
    }
    res.json({ deleted: vouchId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not delete vouch.' });
  }
}

module.exports = { createVouch, getVouchesForUser, deleteVouch };
