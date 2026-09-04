const test = require('node:test');
const assert = require('node:assert/strict');

process.env.MONGODB_DB_NAME = 'landline_properties';

const { databaseName } = require('../config/db');
const models = require('../models');
const { generateUniqueSlug } = require('../utils/slugify');
const { cleanDocument, escapeRegex, numericId } = require('../utils/documents');

test('MongoDB is isolated in the configured application database', () => {
  assert.equal(databaseName(), 'landline_properties');
  const original = process.env.MONGODB_DB_NAME;
  process.env.MONGODB_DB_NAME = 'admin';
  assert.throws(() => databaseName(), /application database/);
  process.env.MONGODB_DB_NAME = original;
});

test('all former SQL entities have dedicated MongoDB collections', () => {
  const expected = {
    User: 'users', Location: 'locations', Broker: 'brokers', Property: 'properties',
    PropertyImage: 'property_images', Project: 'projects', ProjectImage: 'project_images',
    Lead: 'leads', LeadNote: 'lead_notes', HomepageSection: 'homepage_sections',
    PartnerLogo: 'partner_logos', Faq: 'faqs', Media: 'media',
    SeoSetting: 'seo_settings', Setting: 'settings', ActivityLog: 'activity_logs',
    Counter: 'counters'
  };
  for (const [name, collection] of Object.entries(expected)) {
    assert.equal(models[name].collection.collectionName, collection);
  }
});

test('property schema preserves the existing numeric API IDs and field names', async () => {
  const property = new models.Property({
    id: 42,
    title: 'Test Apartment',
    slug: 'test-apartment',
    property_type: 'Apartment',
    purpose: 'Buy',
    price: 12000000,
    city: 'Gurgaon',
    amenities: ['Gym', 'Pool']
  });
  await property.validate();
  const value = property.toJSON();
  assert.equal(value.id, 42);
  assert.equal(value.property_type, 'Apartment');
  assert.deepEqual(value.amenities, ['Gym', 'Pool']);
  assert.equal(Object.hasOwn(value, '_id'), false);
});

test('MongoDB model validation rejects invalid property enums', async () => {
  const property = new models.Property({
    id: 43,
    title: 'Invalid Property',
    slug: 'invalid-property',
    property_type: 'Spaceship',
    purpose: 'Buy',
    city: 'Gurgaon'
  });
  await assert.rejects(property.validate(), /property_type/);
});

test('slug generation checks MongoDB model uniqueness', async () => {
  const existing = new Set(['luxury-home', 'luxury-home-2']);
  const Model = { exists: async ({ slug }) => existing.has(slug) };
  assert.equal(await generateUniqueSlug(Model, 'Luxury Home'), 'luxury-home-3');
});

test('MongoDB document helpers safely normalize API values', () => {
  assert.deepEqual(cleanDocument({ _id: 'hidden', __v: 0, id: 7, nested: { _id: 'hidden-too', ok: true } }), {
    id: 7,
    nested: { ok: true }
  });
  assert.equal(escapeRegex('a+b?'), 'a\\+b\\?');
  assert.equal(numericId('12'), 12);
  assert.equal(numericId('bad'), null);
});
