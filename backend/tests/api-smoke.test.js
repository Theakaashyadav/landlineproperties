const test = require('node:test');
const assert = require('node:assert/strict');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'automated-test-secret-at-least-32-characters';
process.env.CORS_ORIGINS = 'http://localhost:5500';
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017';
process.env.MONGODB_DB_NAME = 'landline_properties_test';

const database = require('../config/db');
const { Property, PropertyImage } = require('../models');

database.testConnection = async () => true;
database.connectDatabase = async () => true;

function queryResult(value) {
  return {
    select() { return this; },
    sort() { return this; },
    skip() { return this; },
    limit() { return this; },
    lean: async () => value
  };
}

let propertyQueryCount = 0;
Property.find = () => {
  propertyQueryCount += 1;
  return queryResult([{
    id: 1, title: 'Test Property', slug: 'test-property', property_type: 'Apartment',
    purpose: 'Buy', price: 15000000, city: 'Gurgaon', locality: 'Sector 65',
    featured: 1, verified: 1, new_launch: 0, status: 'published', cover_image: null
  }]);
};
Property.countDocuments = async () => 1;
PropertyImage.find = () => queryResult([]);

const app = require('../server');
let server;
let baseUrl;

test.before(async () => {
  await new Promise(resolve => { server = app.listen(0, '127.0.0.1', resolve); });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
  await new Promise(resolve => server.close(resolve));
});

test('health endpoint verifies API and database availability', async () => {
  const response = await fetch(`${baseUrl}/api/health`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { success: true, message: 'API and database are running.' });
});

test('public property listing returns the standard response shape', async () => {
  const response = await fetch(`${baseUrl}/api/properties?purpose=Buy&limit=12`, {
    headers: { Origin: 'http://localhost:5500' }
  });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('access-control-allow-origin'), 'http://localhost:5500');
  const result = await response.json();
  assert.equal(result.success, true);
  assert.equal(result.data[0].slug, 'test-property');
  assert.equal(result.pagination.total, 1);
});

test('invalid public purpose is rejected without querying the database', async () => {
  const before = propertyQueryCount;
  const response = await fetch(`${baseUrl}/api/properties?purpose=Unknown`);
  assert.equal(response.status, 400);
  const result = await response.json();
  assert.equal(result.success, false);
  assert.equal(propertyQueryCount, before);
});

test('unknown API route returns JSON 404', async () => {
  const response = await fetch(`${baseUrl}/api/not-a-route`);
  assert.equal(response.status, 404);
  assert.equal((await response.json()).success, false);
});
