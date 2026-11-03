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
const PUBLIC_DIRECTORIES = ['admin', 'image', 'js'];
const RESERVED_DIRECTORIES = new Set([
  ...PUBLIC_DIRECTORIES, 'backend', 'database', 'node_modules', '.git', '.github',
  '.agents', '.codex', '.aws'
]);
const BUILD_MARKER = '.landline-frontend-build';
const BUILD_MARKER_CONTENT = 'landline-properties-frontend-v1\n';

function buildFrontend(projectRoot, outputDir = 'dist') {
  const root = fs.realpathSync(path.resolve(projectRoot));
  const indexFile = path.join(root, 'index.html');
  if (!fs.existsSync(indexFile) || !fs.lstatSync(indexFile).isFile()) {
    throw new Error(`Frontend source index.html is missing from ${root}`);
  }

  const output = path.resolve(root, outputDir);
  const relativeOutput = path.relative(root, output);
  const outputParts = relativeOutput.split(path.sep);
  if (!relativeOutput || relativeOutput === '..' || relativeOutput.startsWith(`..${path.sep}`) ||
      path.isAbsolute(relativeOutput) || RESERVED_DIRECTORIES.has(outputParts[0].toLowerCase())) {
    throw new Error('Frontend output must be a dedicated directory inside the project root.');
  }

  // Validate every existing component before removing a previous build. In
  // particular, never follow a junction/symlink out of the selected project.
  let component = root;
  for (const part of outputParts) {
    component = path.join(component, part);
    if (!fs.existsSync(component)) continue;
    const stat = fs.lstatSync(component);
    if (stat.isSymbolicLink() || !stat.isDirectory()) {
      throw new Error('Frontend output and its parents must be regular directories.');
    }
  }

  if (fs.existsSync(output)) {
    const marker = path.join(output, BUILD_MARKER);
    const ownedOutput = fs.existsSync(marker) && fs.lstatSync(marker).isFile() &&
      fs.readFileSync(marker, 'utf8') === BUILD_MARKER_CONTENT;
    if (output !== path.join(root, 'dist') && !ownedOutput && fs.readdirSync(output).length) {
      throw new Error('Refusing to replace a nonempty directory that is not a frontend build.');
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

  function copyPublicDirectory(source, destination) {
    if (!fs.existsSync(source) || !fs.lstatSync(source).isDirectory()) return;
    for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
      if (entry.name.startsWith('.') || entry.isSymbolicLink()) continue;
      const sourceFile = path.join(source, entry.name);
      const destinationFile = path.join(destination, entry.name);
      if (entry.isDirectory()) copyPublicDirectory(sourceFile, destinationFile);
      else if (entry.isFile() && (PUBLIC_EXTENSIONS.has(path.extname(entry.name).toLowerCase()) || entry.name === 'SOURCES.txt')) {
        copyFile(sourceFile, destinationFile);
      }
    }
  }

  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (!entry.isFile() || entry.name.startsWith('.') || entry.name.toLowerCase() === 'server.js') continue;
    const publicFile = ROOT_PUBLIC_EXTENSIONS.has(path.extname(entry.name).toLowerCase()) ||
      ['robots.txt', 'sitemap.xml'].includes(entry.name);
    if (publicFile) copyFile(path.join(root, entry.name), path.join(output, entry.name));
  }
  for (const directory of PUBLIC_DIRECTORIES) {
    copyPublicDirectory(path.join(root, directory), path.join(output, directory));
  }

  if (!fs.existsSync(path.join(output, 'index.html'))) {
    throw new Error('Frontend build did not produce index.html.');
  }
  return { outputDir: output, files };
}

if (require.main === module) {
  try {
    const result = buildFrontend(path.resolve(__dirname, '..', '..'));
    console.log(`Frontend build complete: ${result.files} public files copied to ${result.outputDir}`);
  } catch (error) {
    console.error(`Frontend build failed: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = { buildFrontend };
