"""Phase 70: PTRIndicator arrow aria-hidden + role=status."""
import sys, os
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
base = r'c:\Users\Amrab\Downloads\noor-adhkar'
path = os.path.join(base, 'src/hooks/usePullToRefresh.tsx')
with open(path, encoding='utf-8') as f:
    c = f.read()

patches = [
    (
        '      aria-live="polite"\n      aria-label={isRefreshing ? "\u062c\u0627\u0631\u064d \u0627\u0644\u062a\u062d\u062f\u064a\u062b" : "\u0627\u0633\u062d\u0628 \u0644\u0644\u062a\u062d\u062f\u064a\u062b"}',
        '      role="status"\n      aria-live="polite"\n      aria-label={isRefreshing ? "\u062c\u0627\u0631\u064d \u0627\u0644\u062a\u062d\u062f\u064a\u062b" : "\u0627\u0633\u062d\u0628 \u0644\u0644\u062a\u062d\u062f\u064a\u062b"}',
        'PTRIndicator role=status'
    ),
    (
        '<span style={{ fontSize: "0.8rem" }}>↓</span>',
        '<span style={{ fontSize: "0.8rem" }} aria-hidden="true">↓</span>',
        'PTRIndicator arrow aria-hidden'
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
