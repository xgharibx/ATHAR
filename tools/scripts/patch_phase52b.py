"""Phase 52b: Insights heatmap view group + Home page improvements."""

import re

base_pages = r'c:\Users\Amrab\Downloads\noor-adhkar\src\pages'
base_comp = r'c:\Users\Amrab\Downloads\noor-adhkar\src\components'

def patch(path, old, new, label=''):
    content = open(path, 'r', encoding='utf-8').read()
    name = path.split('\\')[-1]
    if old in content:
        content = content.replace(old, new, 1)
        open(path, 'w', encoding='utf-8').write(content)
        print(f'  PATCHED: {name} {label}')
        return True
    elif new in content:
        print(f'  ALREADY: {name} {label}')
        return True
    else:
        print(f'  MISS:    {name} {label}')
        return False

# ---- 1. Insights: heatmap view buttons group ----
print('Insights heatmap view group:')
patch(
    base_pages + r'\Insights.tsx',
    '          <div className="mr-auto flex gap-1">',
    '          <div className="mr-auto flex gap-1" role="group" aria-label="\u0639\u0631\u0636 \u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0646\u0634\u0627\u0637">',
    'heatmap group'
)

# ---- 2. Insights: check for other button groups without role=group ----
print('Insights XP period group:')
# Look for the period filter buttons 
content_ins = open(base_pages + r'\Insights.tsx', 'r', encoding='utf-8').read()
period_idx = content_ins.find('aria-pressed={heatmapView === v}')
# Check nearby for role=group
nearby = content_ins[max(0, period_idx-200):period_idx]
if 'role="group"' not in nearby:
    print('  Looking for period buttons container...')

# Check for more button groups in Insights
groups = re.findall(r'aria-pressed=\{[^}]+\}', content_ins)
print(f'  Total aria-pressed occurrences: {len(groups)}')
# Find each and check if wrapped in role=group
for m in re.finditer(r'aria-pressed=\{[^}]+\}', content_ins):
    start = max(0, m.start() - 400)
    ctx = content_ins[start:m.start()]
    if 'role="group"' not in ctx and 'role="tablist"' not in ctx:
        # Find the button element
        btn_start = content_ins.rfind('<button', 0, m.start())
        line_num = content_ins[:m.start()].count('\n') + 1
        print(f'    Line ~{line_num}: aria-pressed without group wrapper')
        # Show context
        print(f'    Context: {repr(content_ins[max(0,m.start()-50):m.start()+30])}')

print('\nDone.')
