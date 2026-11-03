const fs = require('fs');
const path = require('path');

function containsHomepage(directory) {
  try {
    return fs.statSync(path.join(directory, 'index.html')).isFile();
  } catch (error) {
    if (error.code === 'ENOENT' || error.code === 'ENOTDIR') return false;
    throw error;
  }
}

function resolveFrontendDir(serverDir, environment = process.env) {
  const runtimeDir = path.resolve(serverDir);
  const configured = String(environment.LANDLINE_FRONTEND_DIR || '').trim();
  if (configured) {
    // Resolve relative configuration against the entry module, never cwd.
    const directory = path.resolve(runtimeDir, configured);
    if (!containsHomepage(directory)) {
      throw new Error(`LANDLINE_FRONTEND_DIR must contain index.html: ${directory}`);
    }
    return directory;
  }

  const parentDir = path.dirname(runtimeDir);
  // The checkout keeps public files beside backend/. Hostinger may instead
  // flatten backend/ into nodejs/ and publish the frontend to public_html/.
  const candidates = [parentDir, runtimeDir];
  if (path.basename(runtimeDir) === 'nodejs') {
    candidates.push(path.join(parentDir, 'public_html'));
  } else if (path.basename(runtimeDir) === 'backend' && path.basename(parentDir) === 'nodejs') {
    candidates.push(path.join(path.dirname(parentDir), 'public_html'));
  }
  candidates.push(path.join(runtimeDir, 'dist'), path.join(parentDir, 'dist'));

  const uniqueCandidates = [...new Set(candidates)];
  const directory = uniqueCandidates.find(containsHomepage);
  if (directory) return directory;

  // Never search current/, previous builds or another site's public_html.
  // Fail at startup so a deployment with missing assets cannot look healthy.
  throw new Error(`Frontend files are missing. Deploy index.html and its assets to this build's public_html or dist directory, or set LANDLINE_FRONTEND_DIR. Checked: ${uniqueCandidates.join(', ')}`);
}

module.exports = { resolveFrontendDir };
