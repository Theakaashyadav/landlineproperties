const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { resolveFrontendDir } = require('../utils/frontendDirectory');

function temporaryDeployment(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'landline-frontend-'));
  t.after(() => {
    assert.equal(path.dirname(root), path.resolve(os.tmpdir()));
    assert.ok(path.basename(root).startsWith('landline-frontend-'));
    fs.rmSync(root, { recursive: true, force: true });
  });
  return root;
}

function writeFile(root, relative, content = '<!doctype html><title>Landline</title>') {
  const target = path.join(root, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
  return path.dirname(target);
}

test('the source checkout serves its public files beside backend', () => {
  assert.equal(resolveFrontendDir(path.resolve(__dirname, '..'), {}), path.resolve(__dirname, '../..'));
});

test('a flattened Hostinger backend uses only its own build public_html', t => {
  const deployment = temporaryDeployment(t);
  const frontend = writeFile(deployment, 'versions/active/public_html/index.html');
  assert.equal(resolveFrontendDir(path.join(deployment, 'versions/active/nodejs'), {}), frontend);
});

test('a preserved backend directory uses its own build public_html', t => {
  const deployment = temporaryDeployment(t);
  const frontend = writeFile(deployment, 'versions/active/public_html/index.html');
  assert.equal(resolveFrontendDir(path.join(deployment, 'versions/active/nodejs/backend'), {}), frontend);
});

test('a relocated entry may serve public files beside itself', t => {
  const deployment = temporaryDeployment(t);
  const frontend = writeFile(deployment, 'versions/active/nodejs/index.html');
  assert.equal(resolveFrontendDir(frontend, {}), frontend);
});

test('frontend builds may live in the runtime or repository dist directory', t => {
  const deployment = temporaryDeployment(t);
  const runtimeOutput = writeFile(deployment, 'runtime/nodejs/dist/index.html');
  const repositoryOutput = writeFile(deployment, 'repository/dist/index.html');
  assert.equal(resolveFrontendDir(path.join(deployment, 'runtime/nodejs'), {}), runtimeOutput);
  assert.equal(resolveFrontendDir(path.join(deployment, 'repository/backend'), {}), repositoryOutput);
});

test('explicit frontend configuration wins and relative paths use the server directory', t => {
  const deployment = temporaryDeployment(t);
  const source = writeFile(deployment, 'repository/index.html');
  const configured = writeFile(deployment, 'selected/index.html');
  const serverDir = path.join(source, 'backend');
  assert.equal(resolveFrontendDir(serverDir, { LANDLINE_FRONTEND_DIR: configured }), configured);
  assert.equal(resolveFrontendDir(serverDir, { LANDLINE_FRONTEND_DIR: '../../selected' }), configured);
  assert.throws(() => resolveFrontendDir(serverDir, { LANDLINE_FRONTEND_DIR: '../missing' }), /LANDLINE_FRONTEND_DIR must contain index\.html/);
});

test('missing current assets fail clearly without using another build or site-wide output', t => {
  const deployment = temporaryDeployment(t);
  writeFile(deployment, 'versions/previous/public_html/index.html');
  writeFile(deployment, 'current/public_html/index.html');
  writeFile(deployment, 'public_html/index.html');
  writeFile(deployment, 'versions/active/public_html/.htaccess', 'PassengerEnabled on');
  assert.throws(() => resolveFrontendDir(path.join(deployment, 'versions/active/nodejs'), {}), /Frontend files are missing\..*LANDLINE_FRONTEND_DIR/);
});

test('the HTTP server serves configured frontend assets while keeping backend files private', async t => {
  const deployment = temporaryDeployment(t);
  const frontend = writeFile(deployment, 'public_html/index.html', '<!doctype html><h1>Deployment homepage</h1>');
  writeFile(frontend, 'theme.css', 'body { color: green; }');
  writeFile(frontend, 'js/app.js', 'window.deploymentReady = true;');
  writeFile(frontend, 'image/example.svg', '<svg xmlns="http://www.w3.org/2000/svg"></svg>');
  writeFile(frontend, 'admin/login.html', '<!doctype html><h1>Admin login</h1>');
  // These files must never be reachable, even if accidentally packaged.
  writeFile(frontend, 'backend/server.js', 'private backend source');
  writeFile(frontend, 'server.js', 'private server entry');
  writeFile(frontend, '.env', 'PRIVATE_VALUE=private');
  writeFile(frontend, 'package.json', '{"private":true}');

  const previous = { frontend: process.env.LANDLINE_FRONTEND_DIR, secret: process.env.JWT_SECRET };
  process.env.LANDLINE_FRONTEND_DIR = frontend;
  process.env.JWT_SECRET = 'frontend-deployment-test-secret-at-least-32-characters';
  t.after(() => {
    if (previous.frontend === undefined) delete process.env.LANDLINE_FRONTEND_DIR;
    else process.env.LANDLINE_FRONTEND_DIR = previous.frontend;
    if (previous.secret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previous.secret;
  });

  const app = require('../server');
  const server = await new Promise(resolve => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
  });
  t.after(() => new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())));
  const origin = `http://127.0.0.1:${server.address().port}`;

  for (const [route, expected] of [
    ['/', 'Deployment homepage'], ['/index.html', 'Deployment homepage'],
    ['/theme.css', 'color: green'], ['/js/app.js', 'deploymentReady'],
    ['/image/example.svg', '<svg'], ['/admin/login.html', 'Admin login']
  ]) {
    const response = await fetch(`${origin}${route}`);
    assert.equal(response.status, 200, route);
    assert.ok((await response.text()).includes(expected), route);
  }
  for (const route of ['/server.js', '/backend/server.js', '/%62ackend/server.js', '/.env', '/package.json']) {
    const response = await fetch(`${origin}${route}`);
    assert.equal(response.status, 404, route);
    assert.ok(!(await response.text()).includes('private backend source'), route);
  }
});
