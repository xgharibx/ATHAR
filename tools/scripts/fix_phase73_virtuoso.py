"""Phase 73 fix: Remove invalid listProps from Virtuoso in HadithBookView."""
import sys, os
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
base = r'c:\Users\Amrab\Downloads\noor-adhkar'
path = os.path.join(base, 'src', 'pages', 'HadithBookView.tsx')
with open(path, encoding='utf-8') as f:
    c = f.read()

old = '            listProps={{ role: "list", "aria-label": "قائمة الأحاديث" }}\n            itemContent={renderItem}'
new = '            itemContent={renderItem}'
if old in c:
    c = c.replace(old, new)
    print('  OK  [Removed invalid listProps]')
else:
    print('  MISS[listProps removal]')

with open(path, 'w', encoding='utf-8') as f:
    f.write(c)
print('Done.')
