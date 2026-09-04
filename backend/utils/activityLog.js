const { ActivityLog } = require('../models');

async function logActivity({ userId, action, entity, entityId, ip }) {
  try {
    await ActivityLog.create({
      user_id: userId || null,
      action,
      entity: entity || null,
      entity_id: entityId || null,
      ip_address: ip || null
    });
  } catch (error) {
    // Activity logging must never break the primary request.
    console.error('Activity log failed:', error.message);
  }
}

module.exports = { logActivity };
