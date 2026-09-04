const bcrypt = require('bcryptjs');
const { Location, Setting, User, syncCounter, ensureIndexes } = require('../models');

const DEFAULT_LOCATIONS = [
  { id: 1, city: 'Gurgaon', name: 'Gurgaon', slug: 'gurgaon', description: 'Premium residential, commercial and lifestyle locations in Gurgaon.', status: 'published' },
  { id: 2, city: 'Noida', name: 'Noida', slug: 'noida', description: 'Planned sectors, new projects and business districts in Noida.', status: 'published' },
  { id: 3, city: 'Greater Noida', name: 'Greater Noida', slug: 'greater-noida', description: 'Spacious homes, plots and emerging micro-markets in Greater Noida.', status: 'published' },
  { id: 4, city: 'Delhi NCR', name: 'Delhi NCR', slug: 'delhi-ncr', description: 'Properties across the broader Delhi NCR region.', status: 'published' },
  { id: 5, city: 'Uttarakhand', name: 'Uttarakhand', slug: 'uttarakhand', description: 'Holiday homes, villas, plots and lifestyle properties across Uttarakhand.', status: 'published' }
];

const DEFAULT_SETTINGS = {
  id: 1,
  company_name: 'Landline Properties',
  phone: '+919876543210',
  email: 'hello@landline.com',
  whatsapp: '919876543210',
  seo_default_title: 'Landline Properties | Real Estate in Gurgaon, Noida, Greater Noida & Delhi NCR',
  seo_default_description: 'Find verified properties, new projects and trusted brokers across Delhi NCR with Landline Properties.'
};

let initializationPromise = null;

async function seedAdminFromEnvironment({ required = false } = {}) {
  const email = String(process.env.SEED_ADMIN_EMAIL || '').trim().toLowerCase();
  const password = String(process.env.SEED_ADMIN_PASSWORD || '');
  const name = String(process.env.SEED_ADMIN_NAME || 'Admin').trim().slice(0, 120);
  const configured = email && password && password !== 'change_me_before_running_seed';

  if (!configured) {
    if (required) throw new Error('Set SEED_ADMIN_EMAIL and a real SEED_ADMIN_PASSWORD before seeding the admin.');
    return { created: false, reason: 'not-configured' };
  }
  if (password.length < 8) throw new Error('SEED_ADMIN_PASSWORD must be at least 8 characters.');
  if (await User.exists({ email })) return { created: false, reason: 'exists', email };

  try {
    const user = await User.create({
      name: name || 'Admin',
      email,
      password_hash: await bcrypt.hash(password, 12),
      role: 'super_admin',
      is_active: 1
    });
    return { created: true, email, id: user.id };
  } catch (error) {
    // Multiple Hostinger workers can initialise simultaneously. A unique-email
    // race means another worker already created the same requested admin.
    if (error.code === 11000 && await User.exists({ email })) {
      return { created: false, reason: 'exists', email };
    }
    throw error;
  }
}

async function initialise() {
  await ensureIndexes();

  for (const location of DEFAULT_LOCATIONS) {
    await Location.updateOne(
      { slug: location.slug },
      { $setOnInsert: location },
      { upsert: true, runValidators: true }
    );
  }
  await syncCounter('locations', DEFAULT_LOCATIONS.length);

  await Setting.updateOne(
    { id: 1 },
    { $setOnInsert: DEFAULT_SETTINGS },
    { upsert: true, runValidators: true }
  );

  const admin = await seedAdminFromEnvironment();
  return { locations: DEFAULT_LOCATIONS.length, admin };
}

async function ensureDatabaseInitialized() {
  if (!initializationPromise) {
    initializationPromise = initialise().catch((error) => {
      initializationPromise = null;
      throw error;
    });
  }
  return initializationPromise;
}

module.exports = {
  DEFAULT_LOCATIONS,
  DEFAULT_SETTINGS,
  ensureDatabaseInitialized,
  seedAdminFromEnvironment
};
