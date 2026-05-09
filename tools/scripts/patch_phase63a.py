import sys, os
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
base = r'c:\Users\Amrab\Downloads\noor-adhkar'

patches = {
    'src/pages/AsmaAlHusna.tsx': [
        # Add role="search" to container
        (
            '              className="flex items-center gap-2 px-3 py-2 rounded-xl mb-3"\n'
            '              style={{ background: "var(--card)", border: "1px solid var(--stroke)" }}',
            '              role="search"\n'
            '              aria-label="بحث في أسماء الله الحسنى"\n'
            '              className="flex items-center gap-2 px-3 py-2 rounded-xl mb-3"\n'
            '              style={{ background: "var(--card)", border: "1px solid var(--stroke)" }}',
            'container role=search'
        ),
        # Add type="search" and remove duplicate aria-label from input
        (
            '                value={query}\n'
            '                onChange={(e) => setQuery(e.target.value)}\n'
            '                placeholder="ابحث بالاسم أو المعنى..."\n'
            '                aria-label="بحث في أسماء الله الحسنى"',
            '                type="search"\n'
            '                value={query}\n'
            '                onChange={(e) => setQuery(e.target.value)}\n'
            '                placeholder="ابحث بالاسم أو المعنى..."',
            'input type=search'
        ),
    ],
    'src/pages/Duas.tsx': [
        # Add role="search" to container
        (
            '              className="flex items-center gap-2 px-3 py-2 rounded-xl mb-3"\n'
            '              style={{ background: "var(--card)", border: "1px solid var(--stroke)" }}',
            '              role="search"\n'
            '              aria-label="بحث في الأدعية"\n'
            '              className="flex items-center gap-2 px-3 py-2 rounded-xl mb-3"\n'
            '              style={{ background: "var(--card)", border: "1px solid var(--stroke)" }}',
            'container role=search'
        ),
        # Add type="search" to input
        (
            '                value={query}\n'
            '                onChange={(e) => setQuery(e.target.value)}\n'
            '                placeholder="ابحث في الأدعية..."\n'
            '                aria-label="بحث في الأدعية"',
            '                type="search"\n'
            '                value={query}\n'
            '                onChange={(e) => setQuery(e.target.value)}\n'
            '                placeholder="ابحث في الأدعية..."',
            'input type=search'
        ),
    ],
    'src/pages/Library.tsx': [
        # Add role="search" to container div, and type="search" to Input
        (
            '        <div className="flex items-center gap-2">',
            '        <div className="flex items-center gap-2" role="search" aria-label="بحث في المكتبة">',
            'container role=search'
        ),
        (
            'placeholder="ابحث في الحديث، الراوي، الفوائد، أو الموضوع…" aria-label="بحث في المكتبة"',
            'type="search" placeholder="ابحث في الحديث، الراوي، الفوائد، أو الموضوع…" aria-label="بحث في المكتبة"',
            'input type=search'
        ),
    ],
    'src/pages/VideoLibrary.tsx': [
        # Add role="search" to container div
        (
            '            <div className="relative mb-4">',
            '            <div className="relative mb-4" role="search" aria-label="بحث في مكتبة الدروس">',
            'container role=search'
        ),
        # Add type="search" to input
        (
            '                value={q}\n'
            '                onChange={(e) => setQ(e.target.value)}\n'
            '                placeholder="ابحث عن شيخ، دورة، أو درس..."\n'
            '                aria-label="بحث في مكتبة الدروس"',
            '                type="search"\n'
            '                value={q}\n'
            '                onChange={(e) => setQ(e.target.value)}\n'
            '                placeholder="ابحث عن شيخ، دورة، أو درس..."\n'
            '                aria-label="بحث في مكتبة الدروس"',
            'input type=search'
        ),
    ],
}

for rel, pats in patches.items():
    path = os.path.join(base, rel)
    name = rel.split('/')[-1]
    print(f'=== {name} ===')
    with open(path, encoding='utf-8') as f:
        c = f.read()
    for old, new, label in pats:
        if old in c:
            c = c.replace(old, new)
            print(f'  OK  [{label}]')
        else:
            print(f'  MISS[{label}]')
    with open(path, 'w', encoding='utf-8') as f:
        f.write(c)
