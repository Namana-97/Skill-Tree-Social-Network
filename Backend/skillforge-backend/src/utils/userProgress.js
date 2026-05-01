async function applyXpDelta(client, userId, delta) {
  await client.query(
    `UPDATE users
     SET xp = GREATEST(0, xp + $1),
         level = GREATEST(1, CEIL(GREATEST(0, xp + $1) / 100.0)::int)
     WHERE id = $2`,
    [delta, userId]
  );
}

module.exports = { applyXpDelta };
