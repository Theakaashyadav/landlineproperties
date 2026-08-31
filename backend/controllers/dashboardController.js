const { pool } = require('../config/db');
const { asyncHandler } = require('../middleware/errorHandler');

// GET /api/admin/dashboard/stats
const getStats = asyncHandler(async (req, res) => {
  const [[properties]] = await pool.query(`
    SELECT
      COUNT(*) AS total,
      SUM(status = 'published') AS active,
      SUM(status = 'pending') AS pending,
      SUM(featured = 1) AS featured
    FROM properties`);

  const [[projects]] = await pool.query('SELECT COUNT(*) AS total FROM projects');
  const [[brokers]] = await pool.query('SELECT COUNT(*) AS total FROM brokers');
  const [[leads]] = await pool.query(`
    SELECT COUNT(*) AS total, SUM(status = 'New') AS new_leads,
           SUM(status = 'Site Visit') AS site_visits
    FROM leads`);

  const [recentProperties] = await pool.query(
    'SELECT id, title, city, price, status, created_at FROM properties ORDER BY created_at DESC LIMIT 5'
  );
  const [recentLeads] = await pool.query(
    'SELECT id, name, phone, requirement, status, created_at FROM leads ORDER BY created_at DESC LIMIT 5'
  );
  const [recentActivity] = await pool.query(
    `SELECT a.action, a.entity, a.entity_id, a.created_at, u.name AS user_name
     FROM activity_logs a LEFT JOIN users u ON u.id = a.user_id
     ORDER BY a.created_at DESC LIMIT 10`
  );

  const [enquiryTrend] = await pool.query(`
    SELECT DATE_FORMAT(created_at, '%Y-%m') AS month, COUNT(*) AS count
    FROM leads
    WHERE created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
    GROUP BY month ORDER BY month ASC`);

  res.json({
    success: true,
    data: {
      totalProperties: properties.total || 0,
      activeProperties: properties.active || 0,
      featuredProperties: properties.featured || 0,
      pendingProperties: properties.pending || 0,
      totalProjects: projects.total || 0,
      totalBrokers: brokers.total || 0,
      totalLeads: leads.total || 0,
      newLeads: leads.new_leads || 0,
      siteVisitRequests: leads.site_visits || 0,
      recentProperties,
      recentLeads,
      recentActivity,
      enquiryTrend
    }
  });
});

module.exports = { getStats };
