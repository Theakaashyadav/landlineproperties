const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { isRootPublicFile, PUBLIC_DIRECTORIES } = require('./build-site');

function checkSite(projectRoot) {
  const root = path.resolve(projectRoot);
  const failures = [];
  const required = [
    'index.html', 'featured-properties.html', 'rent.html', 'property-details.html',
    'project-details.html', 'contact.html', 'list-property.html', 'js/delhi-ncr-projects.js'
  ];
  for (const file of required) if (!fs.existsSync(path.join(root, file))) failures.push(`Missing required file: ${file}`);

  function syntax(source, filename) {
    try { new vm.Script(source, { filename }); }
    catch (error) { failures.push(`Invalid JavaScript: ${filename} (${error.message})`); }
  }
  function staticBrowserCode(source, filename) {
    if (/\b(?:fetch|XMLHttpRequest|WebSocket|EventSource)\s*\(/.test(source) || /\b(?:LANDLINE_API_ORIGIN|LandlineAPI)\b|localhost:5000|127\.0\.0\.1:5000/.test(source)) {
      failures.push(`Browser code requires a backend/network API: ${filename}`);
    }
  }
  function localReference(raw, filename) {
    const reference = raw.replace(/&amp;/g, '&').trim();
    if (!reference || /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(reference)) return;
    let pathname;
    try { pathname = decodeURIComponent(reference.split(/[?#]/)[0]); }
    catch { failures.push(`Invalid local reference: ${filename} -> ${reference}`); return; }
    const target = pathname.startsWith('/') ? path.resolve(root, `.${pathname}`) : path.resolve(path.dirname(filename), pathname);
    const relative = path.relative(root, target);
    if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative) || !fs.existsSync(target)) {
      failures.push(`Broken local reference: ${path.relative(root, filename)} -> ${reference}`);
    }
  }
  function checkFile(filename, browser = true) {
    const extension = path.extname(filename).toLowerCase();
    if (!['.html', '.js', '.css'].includes(extension)) return;
    const source = fs.readFileSync(filename, 'utf8');
    if (extension === '.js') {
      syntax(source, filename);
      if (browser) staticBrowserCode(source, filename);
    } else if (extension === '.html') {
      const scripts = [...source.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
      for (const [index, script] of scripts.entries()) {
        if (/\bsrc\s*=|application\/ld\+json/i.test(script[1])) continue;
        syntax(script[2], `${filename}:inline-${index + 1}`);
        staticBrowserCode(script[2], `${filename}:inline-${index + 1}`);
      }
      const markup = source.replace(/(<script\b[^>]*>)[\s\S]*?<\/script>/gi, '$1</script>');
      for (const reference of markup.matchAll(/\b(?:href|src)\s*=\s*(["'])(.*?)\1/gi)) localReference(reference[2], filename);
    } else {
      for (const reference of source.matchAll(/url\(\s*(["']?)(.*?)\1\s*\)/gi)) localReference(reference[2], filename);
    }
  }
  function walk(directory, browser = true) {
    if (!fs.existsSync(directory)) return;
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (entry.name.startsWith('.') || entry.isSymbolicLink()) continue;
      const filename = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(filename, browser);
      else if (entry.isFile()) checkFile(filename, browser);
    }
  }
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (entry.isFile() && isRootPublicFile(entry.name)) checkFile(path.join(root, entry.name));
  }
  for (const directory of PUBLIC_DIRECTORIES) walk(path.join(root, directory));
  for (const directory of ['scripts', 'tests']) walk(path.join(root, directory), false);
  return failures;
}

if (require.main === module) {
  const failures = checkSite(path.resolve(__dirname, '..'));
  if (failures.length) {
    console.error(failures.join('\n'));
    process.exitCode = 1;
  } else console.log('Static site checks passed: references, JavaScript syntax and browser independence.');
}

module.exports = { checkSite };
