"""Phase 68: Add aria-describedby to Leaderboard forced alias validation + role=alert to error divs."""
import sys, os
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
base = r'c:\Users\Amrab\Downloads\noor-adhkar'
path = os.path.join(base, 'src/pages/Leaderboard.tsx')
with open(path, encoding='utf-8') as f:
    c = f.read()

patches = [
    # Add aria-describedby to the Input + role=alert + id to the error message
    ('                  <Input\n                    value={forcedAlias}\n                    onChange={(e) => setForcedAlias(e.target.value)}\n                    placeholder="اسم إجباري آمن (اختياري)"\n                    aria-label="اسم إجباري"\n                  />',
     '                  <Input\n                    value={forcedAlias}\n                    onChange={(e) => setForcedAlias(e.target.value)}\n                    placeholder="اسم إجباري آمن (اختياري)"\n                    aria-label="اسم إجباري"\n                    aria-describedby="forced-alias-error"\n                  />',
     'forcedAlias Input aria-describedby'),
    ('<div className="text-[11px] text-[var(--danger)]">{forcedAliasValidation.message}</div>',
     '<div id="forced-alias-error" role="alert" className="text-[11px] text-[var(--danger)]">{forcedAliasValidation.message}</div>',
     'forcedAliasValidation error role=alert'),
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
