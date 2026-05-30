/* Transform CMIRC (Next.js) source ported into src/ijaz to Vite/React Router. */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', 'src', 'ijaz');
const ROUTES = ['miracles', 'categories', 'journey', 'refute', 'timeline', 'verse-explorer', 'search'];
const routeAlt = ROUTES.join('|');

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(t|j)sx?$/.test(entry.name)) out.push(full);
  }
  return out;
}

let changed = 0;
for (const file of walk(ROOT)) {
  let s = fs.readFileSync(file, 'utf8');
  const orig = s;

  // strip BOM
  s = s.replace(/^\uFEFF/, '');

  // 1) remove "use client"
  s = s.replace(/^\s*['"]use client['"];?[ \t]*\r?\n/m, '');

  // 2) page-level dynamic(...) with options object -> static default import
  s = s.replace(
    /const\s+(\w+)\s*=\s*dynamic\(\s*\(\)\s*=>\s*import\(\s*('[^']+')\s*\)\s*,\s*\{[\s\S]*?\}\s*\);/g,
    (m, name, p) => `import ${name} from ${p};`
  );

  // 3) inline dynamic(() => import('x'), { ssr: false }) -> lazy(() => import('x'))
  s = s.replace(
    /dynamic\(\s*\(\)\s*=>\s*import\(\s*('[^']+')\s*\)\s*,\s*\{\s*ssr:\s*false\s*\}\s*\)/g,
    'lazy(() => import($1))'
  );

  // 4) remove next/dynamic import
  s = s.replace(/^[ \t]*import\s+dynamic\s+from\s+'next\/dynamic';[ \t]*\r?\n/m, '');

  // 5) next/link -> react-router Link
  s = s.replace(/import\s+Link\s+from\s+'next\/link';/g, "import { Link } from 'react-router-dom';");
  // href -> to inside <Link ...> opening tags
  s = s.replace(/<Link\b([^>]*?)\shref=/g, '<Link$1 to=');

  // 6) next/navigation conversions
  s = s.replace(/^[ \t]*import\s+\{\s*notFound\s*\}\s+from\s+'next\/navigation';[ \t]*\r?\n/m, '');
  s = s.replace(/import\s+\{\s*useRouter\s*\}\s+from\s+'next\/navigation';/g, "import { useNavigate } from 'react-router-dom';");
  s = s.replace(/const\s+router\s*=\s*useRouter\(\);/g, 'const navigate = useNavigate();');
  s = s.replace(/router\.push\(/g, 'navigate(');
  s = s.replace(/import\s+\{\s*usePathname\s*\}\s+from\s+'next\/navigation';/g, "import { useLocation } from 'react-router-dom';");
  s = s.replace(/const\s+pathname\s*=\s*usePathname\(\);/g, 'const pathname = useLocation().pathname;');

  // 7) @/ alias -> @/ijaz/
  s = s.replace(/from '@\//g, "from '@/ijaz/");
  s = s.replace(/import\('@\//g, "import('@/ijaz/");

  // 8) /ijaz route prefixing
  s = s.replace(new RegExp('to="/(' + routeAlt + ')', 'g'), 'to="/ijaz/$1');
  s = s.replace(new RegExp('to=\\{`/(' + routeAlt + ')', 'g'), 'to={`/ijaz/$1');
  s = s.replace(new RegExp("href: '/(" + routeAlt + ")", 'g'), "href: '/ijaz/$1");
  s = s.replace(/to="\/"/g, 'to="/ijaz"');
  s = s.replace(/href: '\/'/g, "href: '/ijaz'");

  if (s !== orig) {
    fs.writeFileSync(file, s, 'utf8');
    changed++;
    console.log('transformed:', path.relative(ROOT, file));
  }
}
console.log('\nTotal files changed:', changed);
