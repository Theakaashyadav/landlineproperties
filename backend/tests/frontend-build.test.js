const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { buildFrontend } = require('../scripts/build-frontend');

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'landline-build-'));
  t.after(() => {
    assert.equal(path.dirname(root), path.resolve(os.tmpdir()));
    assert.ok(path.basename(root).startsWith('landline-build-'));
    fs.rmSync(root, { recursive: true, force: true });
  });
  return root;
}

function write(root, file, contents = 'fixture') {
  const target = path.join(root, file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, contents);
}

test('deployment output includes the website and admin assets without private application files', t => {
  const root = fixture(t);
  const publicFiles = [
    'index.html', 'contact.html', 'theme.css', 'site.js', 'robots.txt', 'sitemap.xml',
    'admin/login.html', 'admin/js/login.js', 'image/home/example.jpg', 'js/projects.js'
  ];
  const privateFiles = [
    'server.js', '.env', 'package.json', 'package-lock.json', 'README.md',
    'backend/server.js', 'backend/.env', 'backend/uploads/private.jpg',
    'database/schema.json', 'node_modules/example/index.js', '.git/config',
    'admin/.env', 'image/.private/internal.jpg'
  ];
  for (const file of [...publicFiles, ...privateFiles]) write(root, file, file);

  const { outputDir } = buildFrontend(root);
  for (const file of publicFiles) {
    assert.equal(fs.readFileSync(path.join(outputDir, file), 'utf8'), file);
  }
  for (const file of privateFiles) {
    assert.equal(fs.existsSync(path.join(outputDir, file)), false, file);
    assert.equal(fs.readFileSync(path.join(root, file), 'utf8'), file);
  }
});

test('rebuilding drops obsolete public files and includes current content', t => {
  const root = fixture(t);
  write(root, 'index.html', 'original homepage');
  write(root, 'old.html', 'obsolete page');
  const { outputDir } = buildFrontend(root);
  fs.unlinkSync(path.join(root, 'old.html'));
  write(root, 'index.html', 'updated homepage');

  buildFrontend(root);
  assert.equal(fs.readFileSync(path.join(outputDir, 'index.html'), 'utf8'), 'updated homepage');
  assert.equal(fs.existsSync(path.join(outputDir, 'old.html')), false);
});

test('invalid output directories cannot overwrite source or unrelated files', t => {
  const root = fixture(t);
  write(root, 'index.html', 'homepage');
  write(root, 'backend/server.js', 'server source');
  write(root, 'notes/keep.txt', 'keep this file');
  for (const directory of ['.', 'backend', 'image', '../outside-project', 'notes']) {
    assert.throws(() => buildFrontend(root, directory), /dedicated directory|Refusing to replace/);
  }
  assert.equal(fs.readFileSync(path.join(root, 'index.html'), 'utf8'), 'homepage');
  assert.equal(fs.readFileSync(path.join(root, 'backend/server.js'), 'utf8'), 'server source');
  assert.equal(fs.readFileSync(path.join(root, 'notes/keep.txt'), 'utf8'), 'keep this file');
});

test('a missing source homepage fails before changing a previous build', t => {
  const root = fixture(t);
  write(root, 'dist/index.html', 'previous build');
  assert.throws(() => buildFrontend(root), /source index\.html is missing/);
  assert.equal(fs.readFileSync(path.join(root, 'dist/index.html'), 'utf8'), 'previous build');
});
