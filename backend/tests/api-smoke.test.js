const test = require('node:test');
const assert = require('node:assert/strict');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'automated-test-secret-at-least-32-characters';
process.env.CORS_ORIGINS = 'http://localhost:5500';
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017';
process.env.MONGODB_DB_NAME = 'landline_properties_test';

const database = require('../config/db');
const { Property, PropertyImage } = require('../models');
const databaseInitializer = require('../services/initializeDatabase');

database.testConnection = async () => true;
database.connectDatabase = async () => true;
databaseInitializer.ensureDatabaseInitialized = async () => true;

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
let lastPropertyFilter;
Property.find = (filter) => {
  propertyQueryCount += 1;
  lastPropertyFilter = filter;
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

// Evaluate the query sent to MongoDB against representative records. This keeps
// coverage focused on region membership and filter combinations, not query shape.
function matchesFilter(record, filter) {
  return Object.entries(filter).every(([key, condition]) => {
    if (key === '$and') return condition.every(clause => matchesFilter(record, clause));
    if (key === '$or') return condition.some(clause => matchesFilter(record, clause));
    if (condition && typeof condition === 'object' && '$regex' in condition) {
      return new RegExp(condition.$regex, condition.$options).test(record[key] || '');
    }
    return record[key] === condition;
  });
}

test('Delhi NCR region includes its city names and excludes Uttarakhand', async () => {
  const response = await fetch(`${baseUrl}/api/properties?region=delhi-ncr&purpose=Buy`);
  assert.equal(response.status, 200);
  const record = { status: 'published', purpose: 'Buy' };
  for (const city of ['New Delhi', 'Delhi NCR', 'Gurgaon', 'gurugram', 'Noida', 'Greater Noida West', 'Faridabad', 'Ghaziabad']) {
    assert.equal(matchesFilter({ ...record, city }, lastPropertyFilter), true, city);
  }
  for (const city of ['Dehradun', 'Nainital', 'Uttarakhand', 'Mumbai']) {
    assert.equal(matchesFilter({ ...record, city }, lastPropertyFilter), false, city);
  }
});

test('Uttarakhand region includes hill towns and excludes Delhi NCR', async () => {
  const response = await fetch(`${baseUrl}/api/properties?region=uttarakhand`);
  assert.equal(response.status, 200);
  const record = { status: 'published' };
  for (const city of ['Uttarakhand', 'Dehradun, Uttarakhand', 'MUSSOORIE', 'Nainital', 'Rishikesh', 'Haridwar', 'Haldwani', 'Bhimtal', 'Mukteshwar', 'Naukuchiatal', 'Ramnagar', 'Almora']) {
    assert.equal(matchesFilter({ ...record, city }, lastPropertyFilter), true, city);
  }
  for (const city of ['Gurgaon', 'New Delhi', 'Noida', 'Mumbai']) {
    assert.equal(matchesFilter({ ...record, city }, lastPropertyFilter), false, city);
  }
});

test('Gurgaon location filters include both city spellings within the selected region', async () => {
  const record = { status: 'published', purpose: 'Buy' };
  for (const location of ['Gurgaon', 'gUrUgRaM']) {
    const response = await fetch(`${baseUrl}/api/properties?region=delhi-ncr&location=${location}&purpose=Buy`);
    assert.equal(response.status, 200);
    for (const city of ['Gurgaon', 'Gurugram', 'Gurugram, Haryana']) {
      assert.equal(matchesFilter({ ...record, city }, lastPropertyFilter), true, `${location}: ${city}`);
    }
    for (const city of ['Noida', 'Delhi', 'Dehradun', 'Gurgaonshire']) {
      assert.equal(matchesFilter({ ...record, city }, lastPropertyFilter), false, `${location}: ${city}`);
    }
    assert.equal(matchesFilter({ ...record, city: 'Gurugram', status: 'draft' }, lastPropertyFilter), false);
  }
});

test('region, location, search and property filters all narrow the same results', async () => {
  const response = await fetch(`${baseUrl}/api/properties?region=delhi-ncr&location=Sector%2065&q=garden&type=Apartment&purpose=Buy`);
  assert.equal(response.status, 200);
  const record = { status: 'published', purpose: 'Buy', property_type: 'Apartment', city: 'Gurgaon', locality: 'Sector 65', title: 'Garden apartment' };
  assert.equal(matchesFilter(record, lastPropertyFilter), true);
  for (const different of [
    { city: 'Dehradun' }, { locality: 'Sector 50' }, { title: 'City apartment' },
    { property_type: 'Villa' }, { purpose: 'Rent' }, { status: 'draft' }
  ]) {
    assert.equal(matchesFilter({ ...record, ...different }, lastPropertyFilter), false, JSON.stringify(different));
  }
});

test('unknown region is rejected before querying properties', async () => {
  const before = propertyQueryCount;
  const response = await fetch(`${baseUrl}/api/properties?region=unknown-region`);
  assert.equal(response.status, 400);
  assert.equal((await response.json()).success, false);
  assert.equal(propertyQueryCount, before);
});

test('unknown API route returns JSON 404', async () => {
  const response = await fetch(`${baseUrl}/api/not-a-route`);
  assert.equal(response.status, 404);
  assert.equal((await response.json()).success, false);
});
