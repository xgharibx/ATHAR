"""Phase 66: Add aria-label to unlabeled Switches in Leaderboard."""
import sys, os
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
base = r'c:\Users\Amrab\Downloads\noor-adhkar'
path = os.path.join(base, 'src/pages/Leaderboard.tsx')
with open(path, encoding='utf-8') as f:
    c = f.read()

patches = [
    ('<Switch checked={hidden} onCheckedChange={(v) => setHidden(!!v)} />',
     '<Switch aria-label="إخفاء من اللوحة" checked={hidden} onCheckedChange={(v) => setHidden(!!v)} />',
     'hidden switch'),
    ('<Switch checked={releaseAliasClaim} onCheckedChange={(v) => setReleaseAliasClaim(!!v)} />',
     '<Switch aria-label="حرر الاسم المحجوز عند إزالة الإدارة" checked={releaseAliasClaim} onCheckedChange={(v) => setReleaseAliasClaim(!!v)} />',
     'releaseAliasClaim switch'),
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
