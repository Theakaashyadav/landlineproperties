const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const { connectDatabase, disconnectDatabase, databaseName } = require('../config/db');
const { Location, Setting, syncCounter, ensureIndexes } = require('../models');

const locations = [
  { id: 1, city: 'Gurgaon', name: 'Gurgaon', slug: 'gurgaon', description: 'Premium residential, commercial and lifestyle locations in Gurgaon.', status: 'published' },
  { id: 2, city: 'Noida', name: 'Noida', slug: 'noida', description: 'Planned sectors, new projects and business districts in Noida.', status: 'published' },
  { id: 3, city: 'Greater Noida', name: 'Greater Noida', slug: 'greater-noida', description: 'Spacious homes, plots and emerging micro-markets in Greater Noida.', status: 'published' },
  { id: 4, city: 'Delhi NCR', name: 'Delhi NCR', slug: 'delhi-ncr', description: 'Properties across the broader Delhi NCR region.', status: 'published' },
  { id: 5, city: 'Uttarakhand', name: 'Uttarakhand', slug: 'uttarakhand', description: 'Holiday homes, villas, plots and lifestyle properties across Uttarakhand.', status: 'published' }
];

const settings = {
  id: 1,
  company_name: 'Landline Properties',
  phone: '+919876543210',
  email: 'hello@landline.com',
  whatsapp: '919876543210',
  seo_default_title: 'Landline Properties | Real Estate in Gurgaon, Noida, Greater Noida & Delhi NCR',
  seo_default_description: 'Find verified properties, new projects and trusted brokers across Delhi NCR with Landline Properties.'
};

async function seedDatabase() {
  await connectDatabase();
  await ensureIndexes();

  for (const location of locations) {
    await Location.updateOne(
      { slug: location.slug },
      { $setOnInsert: location },
      { upsert: true, runValidators: true }
    );
  }
  await syncCounter('locations', locations.length);

  await Setting.updateOne(
    { id: 1 },
    { $setOnInsert: settings },
    { upsert: true, runValidators: true }
  );

  console.log(`MongoDB database ${databaseName()} is ready with ${locations.length} default locations and global settings.`);
}

seedDatabase()
  .catch((error) => {
    console.error('Failed to initialise MongoDB:', error.message);
    process.exitCode = 1;
  })
  .finally(() => disconnectDatabase().catch(() => {}));
