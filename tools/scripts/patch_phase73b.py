"""Phase 73b: HadithBookView - Virtuoso listProps + empty state role=status."""
import sys, os
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
base = r'c:\Users\Amrab\Downloads\noor-adhkar'
path = os.path.join(base, 'src', 'pages', 'HadithBookView.tsx')
with open(path, encoding='utf-8') as f:
    c = f.read()

patches = [
    # Add listProps to Virtuoso for accessibility
    (
        '          <Virtuoso\n            ref={virtuoso}\n            totalCount={listRows.length}',
        '          <Virtuoso\n            ref={virtuoso}\n            totalCount={listRows.length}\n            listProps={{ role: "list", "aria-label": "قائمة الأحاديث" }}',
        'HadithBookView Virtuoso listProps role=list'
    ),
    # Empty state role=status
    (
        '        <div dir="rtl" className="flex-1 flex items-center justify-center text-[var(--muted)] font-arabic">\n          لا توجد أحاديث في هذا الباب',
        '        <div dir="rtl" role="status" className="flex-1 flex items-center justify-center text-[var(--muted)] font-arabic">\n          لا توجد أحاديث في هذا الباب',
        'HadithBookView empty state role=status'
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
