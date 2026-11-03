const fs = require('fs');
const path = require('path');

const ROOT_PUBLIC_EXTENSIONS = new Set([
  '.html', '.css', '.js', '.ico', '.svg', '.png', '.jpg', '.jpeg', '.gif',
  '.webp', '.avif', '.webmanifest'
]);
const PUBLIC_EXTENSIONS = new Set([
  ...ROOT_PUBLIC_EXTENSIONS, '.woff', '.woff2', '.ttf', '.otf', '.eot',
  '.pdf', '.mp4', '.webm', '.mp3', '.ogg', '.wav'
]);
const PUBLIC_DIRECTORIES = ['image', 'js'];
const RESERVED_DIRECTORIES = new Set([
  ...PUBLIC_DIRECTORIES, 'admin', 'backend', 'database', 'scripts', 'tests',
  'node_modules', '.git', '.github', '.agents', '.codex', '.aws', '.runtime', '.deploy'
]);
const BUILD_MARKER = '.landline-static-build';
const BUILD_MARKER_CONTENT = 'landline-properties-static-v1\n';

function isRootPublicFile(name) {
  if (name === '.htaccess') return true;
  return !name.startsWith('.') && name.toLowerCase() !== 'server.js' &&
    (ROOT_PUBLIC_EXTENSIONS.has(path.extname(name).toLowerCase()) || ['robots.txt', 'sitemap.xml'].includes(name));
}

function buildSite(projectRoot, outputDir = 'dist') {
  const root = fs.realpathSync.native(path.resolve(projectRoot));
  const indexFile = path.join(root, 'index.html');
  if (!fs.existsSync(indexFile) || !fs.lstatSync(indexFile).isFile()) {
    throw new Error(`Static source index.html is missing from ${root}`);
  }

  const output = path.resolve(root, outputDir);
  const relativeOutput = path.relative(root, output);
  const outputParts = relativeOutput.split(path.sep);
  if (!relativeOutput || relativeOutput === '..' || relativeOutput.startsWith(`..${path.sep}`) ||
      path.isAbsolute(relativeOutput) || RESERVED_DIRECTORIES.has(outputParts[0].toLowerCase())) {
    throw new Error('Static output must be a dedicated directory inside the project root.');
  }

  // Check the resolved destination before removing generated output. Refuse
  // junctions/symlinks so a rebuild cannot follow one outside this project.
  let component = root;
  for (const part of outputParts) {
    component = path.join(component, part);
    if (!fs.existsSync(component)) continue;
    const stat = fs.lstatSync(component);
    if (stat.isSymbolicLink() || !stat.isDirectory()) {
      throw new Error('Static output and its parents must be regular directories.');
    }
  }

  if (fs.existsSync(output)) {
    const marker = path.join(output, BUILD_MARKER);
    const owned = fs.existsSync(marker) && fs.lstatSync(marker).isFile() &&
      fs.readFileSync(marker, 'utf8') === BUILD_MARKER_CONTENT;
    if (output !== path.join(root, 'dist') && !owned && fs.readdirSync(output).length) {
      throw new Error('Refusing to replace a nonempty directory that is not a static build.');
    }
    fs.rmSync(output, { recursive: true, force: true });
  }
  fs.mkdirSync(output, { recursive: true });
  fs.writeFileSync(path.join(output, BUILD_MARKER), BUILD_MARKER_CONTENT);

  let files = 0;
  function copyFile(source, destination) {
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(source, destination);
    files += 1;
  }
  function copyDirectory(source, destination) {
    if (!fs.existsSync(source) || !fs.lstatSync(source).isDirectory()) return;
    for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
      if (entry.name.startsWith('.') || entry.isSymbolicLink()) continue;
      const input = path.join(source, entry.name);
      const target = path.join(destination, entry.name);
      if (entry.isDirectory()) copyDirectory(input, target);
      else if (entry.isFile() && (PUBLIC_EXTENSIONS.has(path.extname(entry.name).toLowerCase()) || entry.name === 'SOURCES.txt')) copyFile(input, target);
    }
  }

  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (entry.isFile() && isRootPublicFile(entry.name)) copyFile(path.join(root, entry.name), path.join(output, entry.name));
  }
  for (const directory of PUBLIC_DIRECTORIES) copyDirectory(path.join(root, directory), path.join(output, directory));
  return { outputDir: output, files };
}

if (require.main === module) {
  try {
    const result = buildSite(path.resolve(__dirname, '..'));
    console.log(`Static build complete: ${result.files} public files copied to ${result.outputDir}`);
  } catch (error) {
    console.error(`Static build failed: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = { buildSite, isRootPublicFile, PUBLIC_DIRECTORIES, PUBLIC_EXTENSIONS };
