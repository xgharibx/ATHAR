"""Phase 73c: HadithBookView - hadith card role=button missing aria-label."""
import sys, os
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
base = r'c:\Users\Amrab\Downloads\noor-adhkar'
path = os.path.join(base, 'src', 'pages', 'HadithBookView.tsx')
with open(path, encoding='utf-8') as f:
    c = f.read()

old = '        role="button"\n        tabIndex={0}\n        onClick={() => navigate(`/hadith/${bookKey}/${item.n}`)}'
new = '        role="button"\n        tabIndex={0}\n        aria-label={`الحديث رقم ${item.n.toLocaleString("ar-EG")} — اضغط للقراءة`}\n        onClick={() => navigate(`/hadith/${bookKey}/${item.n}`)}'

if old in c:
    c = c.replace(old, new)
    print('  OK  [HadithCard aria-label]')
else:
    print('  MISS[HadithCard aria-label]')

with open(path, 'w', encoding='utf-8') as f:
    f.write(c)
print('Done.')
