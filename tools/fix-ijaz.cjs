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
let fixedCount = 0;
files.forEach(f => {
  let c = fs.readFileSync(f, 'utf8');
  const orig = c;

  // Fix @/components/ -> @/ijaz/components/ (only those missing ijaz)
  c = c.replace(/from '@\/components\//g, "from '@/ijaz/components/");
  c = c.replace(/import\('\.?\/?@\/components\//g, "import('@/ijaz/components/");

  // Convert dynamic() to React.lazy() - handle multiline with 's' flag via workaround
  // Replace the entire dynamic(... { ssr: false ...}) block
  // Using repeated non-greedy matching for the options object
  c = c.replace(/dynamic\(\(\) => import\('([^']+)'\),\s*\{[^}]*\}\)/g, (m, p1) => {
    return "React.lazy(() => import('" + p1 + "'))";
  });

  if (c !== orig) {
    fs.writeFileSync(f, c, 'utf8');
    fixedCount++;
    console.log('Fixed: ' + path.basename(f));
  }
});
console.log('Total: ' + fixedCount + ' files fixed');
