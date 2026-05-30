const fs = require('fs');
const path = require('path');
const base = 'c:/Users/Amrab/Downloads/noor-adhkar/src/ijaz';

function walk(dir) {
  let files = [];
  fs.readdirSync(dir).forEach(f => {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) files = files.concat(walk(full));
    else if (f.endsWith('.tsx') || f.endsWith('.ts')) files.push(full);
  });
  return files;
}

const files = walk(base);
let anyIssues = false;
files.forEach(f => {
  const c = fs.readFileSync(f, 'utf8');
  const rel = f.replace(base + '/', '').replace(base + '\\', '');
  const issues = [];
  if (c.includes("next/")) issues.push("next/ import");
  if (c.includes("dynamic(")) issues.push("dynamic()");
  if (c.includes("notFound")) issues.push("notFound()");
  if (/from '@\/components\/(?!.*ijaz)/.test(c)) issues.push("@/components/ without ijaz");
  if (c.includes("useParams") && !c.includes("from 'react-router-dom'")) issues.push("useParams not imported from react-router-dom");
  if (issues.length) {
    console.log('\nISSUES in ' + rel + ':');
    issues.forEach(i => console.log('  - ' + i));
    anyIssues = true;
  }
});
if (!anyIssues) console.log('All files clean!');
