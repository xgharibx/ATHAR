"""Phase 65b: Add route-change focus management to AppShell + announce page title."""
import sys, os
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
base = r'c:\Users\Amrab\Downloads\noor-adhkar'
path = os.path.join(base, 'src/components/layout/AppShell.tsx')
with open(path, encoding='utf-8') as f:
    c = f.read()

# 1. Add useEffect for focus-on-route-change (after the duplicate-shell useEffect)
old = "  if (!isPrimaryShell) return null;"
new = """  // A11y: move focus to main content on route change (SPA navigation)
  React.useEffect(() => {
    const main = document.getElementById('main-content');
    if (main) main.focus({ preventScroll: false });
  }, [location.pathname]);

  if (!isPrimaryShell) return null;"""

if old in c:
    c = c.replace(old, new)
    print('  OK  [AppShell] focus-on-route-change')
else:
    print('  MISS[AppShell] focus-on-route-change')

with open(path, 'w', encoding='utf-8') as f:
    f.write(c)

print('\nDone.')
