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

// Internal ijaz route roots that need the /ijaz prefix
const routes = ['miracles', 'categories', 'journey', 'refute', 'timeline', 'verse-explorer', 'search'];

const files = walk(base);
let totalFixed = 0;
files.forEach(f => {
  let c = fs.readFileSync(f, 'utf8');
  const orig = c;

  // to="/route..." (double quote string)  -> to="/ijaz/route..."
  routes.forEach(r => {
    c = c.replace(new RegExp('to="/' + r + '(["/])', 'g'), 'to="/ijaz/' + r + '$1');
  });

  // to={`/route...`} (template literal) -> to={`/ijaz/route...`}
  routes.forEach(r => {
    c = c.replace(new RegExp('to=\\{`/' + r + '([`/])', 'g'), 'to={`/ijaz/' + r + '$1');
  });

  // to="/" home links -> to="/ijaz"
  c = c.replace(/to="\/"/g, 'to="/ijaz"');

  if (c !== orig) {
    fs.writeFileSync(f, c, 'utf8');
    totalFixed++;
    console.log('Fixed: ' + path.relative(base, f));
  }
});
console.log('Total files fixed: ' + totalFixed);
