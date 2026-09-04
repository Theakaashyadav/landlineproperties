const { Property, Project, Broker, Lead, ActivityLog, User } = require('../models');
const { asyncHandler } = require('../middleware/errorHandler');
const { cleanDocument } = require('../utils/documents');

// GET /api/admin/dashboard/stats
const getStats = asyncHandler(async (req, res) => {
  const trendStart = new Date();
  trendStart.setUTCMonth(trendStart.getUTCMonth() - 6);

  const [
    totalProperties, activeProperties, pendingProperties, featuredProperties,
    totalProjects, totalBrokers, totalLeads, newLeads, siteVisitRequests,
    recentPropertiesRaw, recentLeadsRaw, recentActivityRaw, enquiryTrendRaw
  ] = await Promise.all([
    Property.countDocuments(),
    Property.countDocuments({ status: 'published' }),
    Property.countDocuments({ status: 'pending' }),
    Property.countDocuments({ featured: 1 }),
    Project.countDocuments(),
    Broker.countDocuments(),
    Lead.countDocuments(),
    Lead.countDocuments({ status: 'New' }),
    Lead.countDocuments({ status: 'Site Visit' }),
    Property.find().select('id title city price status created_at -_id').sort({ created_at: -1 }).limit(5).lean(),
    Lead.find().select('id name phone requirement status created_at -_id').sort({ created_at: -1 }).limit(5).lean(),
    ActivityLog.find().select('user_id action entity entity_id created_at -_id').sort({ created_at: -1 }).limit(10).lean(),
    Lead.aggregate([
      { $match: { created_at: { $gte: trendStart } } },
      { $group: { _id: { year: { $year: '$created_at' }, month: { $month: '$created_at' } }, count: { $sum: 1 } } },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ])
  ]);

  const userIds = [...new Set(recentActivityRaw.map((entry) => entry.user_id).filter(Boolean))];
  const users = userIds.length
    ? await User.find({ id: { $in: userIds } }).select('id name -_id').lean()
    : [];
  const userNames = new Map(users.map((user) => [user.id, user.name]));
  const recentActivity = recentActivityRaw.map((entry) => ({
    action: entry.action,
    entity: entry.entity,
    entity_id: entry.entity_id,
    created_at: entry.created_at,
    user_name: userNames.get(entry.user_id) || null
  }));
  const enquiryTrend = enquiryTrendRaw.map((entry) => ({
    month: `${entry._id.year}-${String(entry._id.month).padStart(2, '0')}`,
    count: entry.count
  }));

  res.json({
    success: true,
    data: {
      totalProperties,
      activeProperties,
      featuredProperties,
      pendingProperties,
      totalProjects,
      totalBrokers,
      totalLeads,
      newLeads,
      siteVisitRequests,
      recentProperties: cleanDocument(recentPropertiesRaw),
      recentLeads: cleanDocument(recentLeadsRaw),
      recentActivity,
      enquiryTrend
    }
  });
});

module.exports = { getStats };
