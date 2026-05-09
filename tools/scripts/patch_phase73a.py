"""Phase 73a: SplashIntro aria-hidden (decorative splash screen)."""
import sys, os
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
base = r'c:\Users\Amrab\Downloads\noor-adhkar'
path = os.path.join(base, 'src', 'components', 'brand', 'SplashIntro.tsx')
with open(path, encoding='utf-8') as f:
    c = f.read()

patches = [
    (
        '        <motion.div\n          key="splash"\n          initial={{ opacity: 1 }}',
        '        <motion.div\n          key="splash"\n          aria-hidden="true"\n          initial={{ opacity: 1 }}',
        'SplashIntro motion.div aria-hidden'
    ),
]

for old, new, label in patches:
    if old in c:
        c = c.replace(old, new)
        print(f'  OK  [{label}]')
    else:
        print(f'  MISS[{label}]')

with open(path, 'w', encoding='utf-8') as f:
    f.write(c)
print('\nDone.')
