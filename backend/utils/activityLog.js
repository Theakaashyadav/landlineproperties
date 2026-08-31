async function logActivity(pool, { userId, action, entity, entityId, ip }) {
  try {
    await pool.query(
      `INSERT INTO activity_logs (user_id, action, entity, entity_id, ip_address) VALUES (?, ?, ?, ?, ?)`,
      [userId || null, action, entity || null, entityId || null, ip || null]
    );
  } catch (err) {
    // Activity logging must never break the primary request.
    console.error('Activity log failed:', err.message);
  }
}

module.exports = { logActivity };
