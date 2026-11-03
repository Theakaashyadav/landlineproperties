const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const plain = value => JSON.parse(JSON.stringify(value));

function loadCatalog() {
  let networkCalls = 0;
  const context = vm.createContext({
    window: {},
    URLSearchParams,
    fetch() {
      networkCalls += 1;
      throw new Error('Static catalogue must not request a server.');
    }
  });
  for (const file of ['js/delhi-ncr-projects.js', 'js/static-data.js']) {
    vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, { filename: file });
  }
  return {
    data: context.window.LandlineData,
    projects: context.window.LandlineProjects.projects,
    networkCalls: () => networkCalls
  };
}

test('bundled projects remain browsable in their regions without a server', async () => {
  const catalog = loadCatalog();
  const slugs = [];
  for (const region of ['delhi-ncr', 'uttarakhand']) {
    const result = await catalog.data.request(`/projects?region=${region}`);
    assert.ok(result.data.length > 0, region);
    for (const project of result.data) {
      assert.equal(project.region, region);
      assert.ok(fs.existsSync(path.join(root, project.image.replace(/^\//, ''))), project.image);
      const detail = await catalog.data.request(`/projects/${encodeURIComponent(project.slug)}`);
      assert.equal(detail.data.name, project.name);
      assert.equal(detail.data.region, region);
      slugs.push(project.slug);
    }
  }
  assert.equal(slugs.length, catalog.projects.length);
  assert.equal(new Set(slugs).size, slugs.length);
  assert.equal(catalog.networkCalls(), 0);
});

test('project searches combine region, city, type, keyword and configuration', async () => {
  const { data } = loadCatalog();
  const result = await data.request('/projects?region=delhi-ncr&location=Noida&type=Apartment&q=ACE%20ARTE&configuration=4%20BHK');
  assert.deepEqual(plain(result.data.map(project => project.slug)), ['ace-arte-sector-150']);
  const otherRegion = await data.request('/projects?region=uttarakhand&q=ACE%20ARTE');
  assert.equal(otherRegion.data.length, 0);
});

test('projects with unpublished prices do not appear in price-filtered results', async () => {
  const { data } = loadCatalog();
  for (const filter of ['budget=100', 'min_price=1', 'max_price=50000000']) {
    const result = await data.request(`/projects?region=uttarakhand&${filter}`);
    assert.equal(result.data.length, 0, filter);
  }
});

test('project pagination covers each result once and keeps the total consistent', async () => {
  const { data } = loadCatalog();
  const all = await data.request('/projects?region=delhi-ncr');
  const first = await data.request('/projects?region=delhi-ncr&limit=2&page=1');
  const second = await data.request('/projects?region=delhi-ncr&limit=2&page=2');
  const pages = [...first.data, ...second.data].map(project => project.slug);
  assert.deepEqual(plain(pages), plain(all.data.map(project => project.slug)));
  assert.equal(new Set(pages).size, all.data.length);
  assert.equal(first.pagination.total, all.data.length);
  assert.equal(second.pagination.total, all.data.length);
  assert.equal(first.pagination.totalPages, 2);
  assert.equal(second.pagination.page, 2);
  const outside = await data.request('/projects?region=delhi-ncr&limit=2&page=99');
  assert.equal(outside.data.length, 0);
  assert.equal(outside.pagination.total, all.data.length);
});

test('returned records cannot change the shared project catalogue', async () => {
  const { data } = loadCatalog();
  const first = await data.request('/projects/ace-arte-sector-150');
  const originalName = first.data.name;
  first.data.name = 'Changed by a consumer';
  first.data.amenities.push('Unpublished amenity');
  first.data.images[0].alt_text = 'Changed image';
  const again = await data.request('/projects/ace-arte-sector-150');
  assert.equal(again.data.name, originalName);
  assert.ok(!again.data.amenities.includes('Unpublished amenity'));
  assert.notEqual(again.data.images[0].alt_text, 'Changed image');
  const listing = await data.request('/projects?region=delhi-ncr');
  assert.equal(listing.data.find(project => project.slug === 'ace-arte-sector-150').name, originalName);
});

test('project information is not fabricated into available units or rentals', async () => {
  const { data } = loadCatalog();
  assert.equal(data.properties.length, 0);
  for (const query of ['', '?purpose=Buy', '?purpose=Rent', '?featured=true', '?new_launch=true']) {
    const result = await data.request(`/properties${query}`);
    assert.equal(result.data.length, 0);
    assert.equal(result.pagination.total, 0);
  }
  await assert.rejects(data.request('/properties/ace-arte-sector-150'), /Property not found/);
});

test('manually published units support filtering and keep unknown prices last when sorted', async () => {
  const { data } = loadCatalog();
  const common = {
    region: 'delhi-ncr', purpose: 'Buy', property_type: 'Apartment',
    city: 'Gurugram', locality: 'Sector 65', title: 'Garden apartment',
    bhk: '3 BHK', furnishing: 'Semi Furnished', area: 1300
  };
  data.properties.push(
    { ...common, id: 1, slug: 'higher-price', price: 13000000 },
    { ...common, id: 2, slug: 'unpublished-price', price: null },
    { ...common, id: 3, slug: 'lower-price', price: 7000000 }
  );
  const filter = await data.request('/properties?region=delhi-ncr&purpose=Buy&location=Gurgaon&type=Apartment&bhk=3%20BHK&min_area=1200&min_price=5000000&max_price=10000000&q=garden');
  assert.deepEqual(plain(filter.data.map(property => property.slug)), ['lower-price']);
  const low = await data.request('/properties?sort=price_low');
  const high = await data.request('/properties?sort=price_high');
  assert.deepEqual(plain(low.data.map(property => property.slug)), ['lower-price', 'higher-price', 'unpublished-price']);
  assert.deepEqual(plain(high.data.map(property => property.slug)), ['higher-price', 'lower-price', 'unpublished-price']);
  assert.deepEqual(plain(data.properties.map(property => property.slug)), ['higher-price', 'unpublished-price', 'lower-price']);
  const detail = await data.request('/properties/lower-price');
  detail.data.title = 'Consumer edit';
  assert.equal((await data.request('/properties/lower-price')).data.title, common.title);
});

test('cancelled selections, writes and missing records fail locally without network calls', async () => {
  const catalog = loadCatalog();
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(catalog.data.request('/projects', { signal: controller.signal }), error => error.name === 'AbortError');
  for (const method of ['POST', 'DELETE']) {
    await assert.rejects(catalog.data.request('/projects', { method }), /contact form or WhatsApp/);
  }
  await assert.rejects(catalog.data.request('/projects/missing-project'), /Project not found/);
  await assert.rejects(catalog.data.request('https://example.invalid/projects'), /Information not found/);
  assert.equal(catalog.networkCalls(), 0);
});
