const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const vm = require('vm');

const projectRoot = path.resolve(__dirname, '..', '..');
const ignored = new Set(['node_modules', '.git', '.runtime', '.deploy']);
const required = [
  'index.html', 'featured-properties.html', 'rent.html', 'property-details.html',
  'contact.html', 'list-property.html', 'admin/login.html', 'admin/dashboard.html',
  'database/landline.sql', 'backend/.env.example'
];
const failures = [];

for (const file of required) {
  if (!fs.existsSync(path.join(projectRoot, file))) failures.push(`Missing required file: ${file}`);
}

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name.endsWith('.js')) {
      const result = spawnSync(process.execPath, ['--check', full], { encoding: 'utf8' });
      if (result.status !== 0) failures.push(`Invalid JavaScript: ${path.relative(projectRoot, full)}\n${result.stderr}`);
    } else if (entry.name.endsWith('.html')) {
      const html = fs.readFileSync(full, 'utf8');
      const references = [...html.matchAll(/\b(?:href|src)=["']([^"'#?]+)["']/gi)].map(match => match[1]);
      for (const rawReference of references) {
        if (/^(?:https?:|data:|mailto:|tel:|javascript:|\/\/|\/)/i.test(rawReference)) continue;
        const reference = rawReference.replace(/&amp;/g, '&');
        const target = path.resolve(path.dirname(full), reference);
        if (!fs.existsSync(target)) failures.push(`Broken local reference: ${path.relative(projectRoot, full)} -> ${reference}`);
      }
      const scripts = [...html.matchAll(/<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/gi)];
      scripts.forEach((match, index) => {
        if (/application\/ld\+json/i.test(match[1])) return;
        try { new vm.Script(`(function(){${match[2]}\n})`, { filename: `${full}:inline-${index + 1}` }); }
        catch (error) { failures.push(`Invalid inline JavaScript: ${path.relative(projectRoot, full)} (${error.message})`); }
      });
    }
  }
}
walk(projectRoot);

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log('Project checks passed: required files exist and JavaScript syntax is valid.');
