const test = require('node:test');
const assert = require('node:assert/strict');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'automated-test-secret-at-least-32-characters';
process.env.CORS_ORIGINS = 'http://localhost:5500';
process.env.NODE_ENV = 'test';

const { pool } = require('../config/db');
pool.getConnection = async () => ({ release() {} });
pool.query = async (sql) => {
  if (/COUNT\(\*\) AS total FROM properties/i.test(sql)) return [[{ total: 1 }]];
  if (/SELECT[\s\S]+FROM properties p/i.test(sql)) return [[{
    id: 1, title: 'Test Property', slug: 'test-property', property_type: 'Apartment',
    purpose: 'Buy', price: 15000000, city: 'Gurgaon', locality: 'Sector 65',
    featured: 1, verified: 1, new_launch: 0, status: 'published', cover_image: null
  }]];
  throw new Error(`Unexpected smoke-test query: ${sql}`);
};

const app = require('../server');
let server;
let baseUrl;

test.before(async () => {
  await new Promise(resolve => { server = app.listen(0, '127.0.0.1', resolve); });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
  await new Promise(resolve => server.close(resolve));
  await pool.end();
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
  const response = await fetch(`${baseUrl}/api/properties?purpose=Unknown`);
  assert.equal(response.status, 400);
  const result = await response.json();
  assert.equal(result.success, false);
});

test('unknown API route returns JSON 404', async () => {
  const response = await fetch(`${baseUrl}/api/not-a-route`);
  assert.equal(response.status, 404);
  assert.equal((await response.json()).success, false);
});
