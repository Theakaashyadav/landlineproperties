require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');

const { pool, testConnection } = require('./config/db');
const { errorHandler } = require('./middleware/errorHandler');

const authRoutes = require('./routes/authRoutes');
const propertyRoutes = require('./routes/propertyRoutes');
const adminPropertyRoutes = require('./routes/adminPropertyRoutes');
const leadRoutes = require('./routes/leadRoutes');
const adminLeadRoutes = require('./routes/adminLeadRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const publicSubmissionRoutes = require('./routes/publicSubmissionRoutes');
const projectRoutes = require('./routes/projectRoutes');
const settingsRoutes = require('./routes/settingsRoutes');

const app = express();
const frontendDir = path.resolve(__dirname, '..');
const productionAssetMaxAge = process.env.NODE_ENV === 'production' ? '7d' : 0;
if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1);

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32 || process.env.JWT_SECRET.includes('replace_this')) {
  throw new Error('JWT_SECRET must be set to a random value of at least 32 characters.');
}

// ---- Security & core middleware ----
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net', 'https://cdnjs.cloudflare.com'],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https://images.unsplash.com', 'https://images.pexels.com'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", 'data:'],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      frameAncestors: ["'none'"]
    }
  }
}));

const allowedOrigins = [...new Set([
  ...(process.env.CORS_ORIGINS || '').split(','),
  process.env.SITE_URL || ''
].map((origin) => origin.trim().replace(/\/$/, '')).filter(Boolean))];
app.use(cors({
  origin: (origin, callback) => {
    const normalizedOrigin = origin && origin.replace(/\/$/, '');
    if (!origin || allowedOrigins.includes(normalizedOrigin)) {
      return callback(null, true);
    }
    const error = new Error('This website origin is not allowed to access the API.');
    error.statusCode = 403;
    callback(error);
  },
  credentials: true
}));

app.use(compression());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(cookieParser());

// Serve the CMS from the same HTTP origin as the API. This prevents browsers
// from assigning the admin pages a unique `file://` origin when login.html is
// opened directly from disk.
app.use('/admin', express.static(path.join(frontendDir, 'admin'), {
  dotfiles: 'deny',
  etag: true,
  maxAge: productionAssetMaxAge,
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache');
  }
}));

// General API rate limit (separate, stricter limiters exist on login/leads)
app.use('/api', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false
}));

// Serve uploaded images
app.use('/uploads', express.static(path.join(__dirname, process.env.UPLOAD_DIR || 'uploads')));

// ---- Routes ----
app.get('/api/health', async (req, res, next) => {
  try {
    await testConnection({ exitOnFailure: false, quiet: true });
    res.json({ success: true, message: 'API and database are running.' });
  } catch (error) {
    error.statusCode = 503;
    next(error);
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/admin/properties', adminPropertyRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/admin/leads', adminLeadRoutes);
app.use('/api/admin/dashboard', dashboardRoutes);
app.use('/api/list-property', publicSubmissionRoutes);

const publicPages = [
  '', 'featured-properties.html', 'rent.html', 'investment.html', 'new-projects.html',
  'gallery-profile.html', 'locations.html', 'gurgaon-properties.html',
  'noida-properties.html', 'greater-noida-properties.html', 'delhi-properties.html',
  'about.html', 'contact.html', 'list-property.html', 'property-details.html', 'project-details.html',
  'privacy-policy.html', 'terms-and-conditions.html'
];
app.get('/robots.txt', (req, res) => {
  const siteUrl = (process.env.SITE_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
  res.type('text/plain').send(`User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /api/\nSitemap: ${siteUrl}/sitemap.xml\n`);
});
app.get('/sitemap.xml', async (req, res, next) => {
  try {
  const siteUrl = (process.env.SITE_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
  const [properties] = await pool.query('SELECT slug, updated_at FROM properties WHERE status = ? ORDER BY updated_at DESC', ['published']);
  const [projects] = await pool.query('SELECT slug, updated_at FROM projects WHERE status = ? ORDER BY updated_at DESC', ['published']);
  const escapeXml = value => String(value).replace(/[<>&'\"]/g, char => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '\"': '&quot;' }[char]));
  const staticUrls = publicPages.map(page => `<url><loc>${escapeXml(`${siteUrl}/${page}`)}</loc></url>`);
  const propertyUrls = properties.map(property => `<url><loc>${escapeXml(`${siteUrl}/property-details.html?slug=${encodeURIComponent(property.slug)}`)}</loc><lastmod>${new Date(property.updated_at).toISOString()}</lastmod></url>`);
  const projectUrls = projects.map(project => `<url><loc>${escapeXml(`${siteUrl}/project-details.html?slug=${encodeURIComponent(project.slug)}`)}</loc><lastmod>${new Date(project.updated_at).toISOString()}</lastmod></url>`);
  const urls = [...staticUrls, ...propertyUrls, ...projectUrls].join('');
  res.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`);
  } catch (error) {
    next(error);
  }
});

// Serve only known public asset directories and single root files. Never mount
// the repository root: encoded paths such as /%62ackend/server.js must not be
// able to reach application source, the database schema or future backups.
const publicStaticOptions = {
  dotfiles: 'deny',
  etag: true,
  maxAge: productionAssetMaxAge,
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache');
  }
};
app.use('/image', express.static(path.join(frontendDir, 'image'), publicStaticOptions));
app.use('/js', express.static(path.join(frontendDir, 'js'), publicStaticOptions));

const publicRootExtensions = new Set([
  '.html', '.css', '.js', '.ico', '.png', '.jpg', '.jpeg', '.webp', '.svg', '.webmanifest'
]);
app.get('/', (req, res, next) => {
  res.sendFile(path.join(frontendDir, 'index.html'), publicStaticOptions, (error) => error && next(error));
});
app.get('/:file', (req, res, next) => {
  const file = req.params.file;
  if (path.basename(file) !== file || !publicRootExtensions.has(path.extname(file).toLowerCase())) return next();
  res.sendFile(path.join(frontendDir, file), publicStaticOptions, (error) => {
    if (!error) return;
    if (error.statusCode === 404) return next();
    next(error);
  });
});

app.use((req, res) => res.status(404).json({ success: false, message: 'Route not found.' }));

app.use(errorHandler);

const PORT = process.env.PORT || 5000;

if (require.main === module) {
  (async () => {
    await testConnection();
    app.listen(PORT, () => {
      console.log(`Landline Properties API running on http://localhost:${PORT}`);
    });
  })();
}

module.exports = app;
