const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { buildSite } = require('../scripts/build-site');
const { checkSite } = require('../scripts/check-site');

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'landline-static-build-'));
  t.after(() => {
    assert.equal(path.dirname(root), path.resolve(os.tmpdir()));
    assert.ok(path.basename(root).startsWith('landline-static-build-'));
    fs.rmSync(root, { recursive: true, force: true });
  });
  return root;
}
function write(root, name, content = name) {
  const target = path.join(root, name);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
}

test('the static artifact preserves public file contents and excludes server/admin/tooling files', t => {
  const root = fixture(t);
  const publicFiles = [
    'index.html', 'contact.html', 'site.js', 'theme.css', 'robots.txt', 'sitemap.xml',
    'image/home/cover.jpg', 'image/home/SOURCES.txt', 'js/catalog.js'
  ];
  const privateFiles = [
    '.env', 'server.js', 'package.json', 'package-lock.json', 'README.md',
    'admin/login.html', 'admin/js/login.js', 'backend/server.js', 'database/data.json',
    'scripts/preview-site.js', 'tests/example.test.js', 'node_modules/example/index.js',
    '.git/config', 'image/.hidden/private.jpg'
  ];
  for (const name of [...publicFiles, ...privateFiles]) write(root, name);
  const result = buildSite(root);
  assert.equal(result.files, publicFiles.length);
  for (const name of publicFiles) assert.deepEqual(fs.readFileSync(path.join(result.outputDir, name)), fs.readFileSync(path.join(root, name)), name);
  for (const name of privateFiles) {
    assert.equal(fs.existsSync(path.join(result.outputDir, name)), false, name);
    assert.equal(fs.readFileSync(path.join(root, name), 'utf8'), name, name);
  }
});

test('rebuilding includes current content and removes obsolete generated files', t => {
  const root = fixture(t);
  write(root, 'index.html', 'old homepage');
  write(root, 'obsolete.html');
  const { outputDir } = buildSite(root);
  fs.unlinkSync(path.join(root, 'obsolete.html'));
  write(root, 'index.html', 'updated homepage');
  buildSite(root);
  assert.equal(fs.readFileSync(path.join(outputDir, 'index.html'), 'utf8'), 'updated homepage');
  assert.equal(fs.existsSync(path.join(outputDir, 'obsolete.html')), false);
});

test('invalid output paths cannot overwrite source, tools or unrelated files', t => {
  const root = fixture(t);
  write(root, 'index.html', 'homepage');
  write(root, 'notes/keep.txt', 'keep');
  for (const output of ['.', 'image', 'js', 'admin', 'backend', 'scripts', 'tests', '../outside', 'notes']) {
    assert.throws(() => buildSite(root, output), /dedicated directory|Refusing to replace/, output);
  }
  assert.equal(fs.readFileSync(path.join(root, 'index.html'), 'utf8'), 'homepage');
  assert.equal(fs.readFileSync(path.join(root, 'notes/keep.txt'), 'utf8'), 'keep');
});

test('missing source homepage does not erase an existing artifact', t => {
  const root = fixture(t);
  write(root, 'dist/index.html', 'existing artifact');
  assert.throws(() => buildSite(root), /source index\.html is missing/);
  assert.equal(fs.readFileSync(path.join(root, 'dist/index.html'), 'utf8'), 'existing artifact');
});

test('static checks reject broken references and runtime API calls while allowing source URLs', t => {
  const root = fixture(t);
  for (const name of ['index.html', 'featured-properties.html', 'rent.html', 'property-details.html', 'project-details.html', 'contact.html', 'list-property.html']) write(root, name, '<!doctype html><title>Fixture</title>');
  write(root, 'js/delhi-ncr-projects.js', "window.catalog = { image_source: 'https://example.com/api/image' };");
  assert.deepEqual(checkSite(root), []);
  write(root, 'index.html', '<!doctype html><link rel="stylesheet" href="missing.css"><script>fetch("/api/properties")</script>');
  const failures = checkSite(root);
  assert.ok(failures.some(message => message.includes('Broken local reference') && message.includes('missing.css')));
  assert.ok(failures.some(message => message.includes('backend/network API')));
});
