import sys, os
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
base = r'c:\Users\Amrab\Downloads\noor-adhkar'

patches = {
    'src/pages/Companions.tsx': [
        (
            '<div className="relative mt-2">',
            '<div className="relative mt-2" role="search" aria-label="بحث في الصحابة">',
            'container role=search'
        ),
    ],
    'src/pages/HadithBooks.tsx': [
        (
            '      <div className="relative mb-5">',
            '      <div className="relative mb-5" role="search" aria-label="بحث في الأحاديث">',
            'container role=search'
        ),
    ],
    'src/pages/ProphetStories.tsx': [
        (
            '            <div className="relative">',
            '            <div className="relative" role="search" aria-label="بحث في قصص الأنبياء">',
            'container role=search'
        ),
    ],
    'src/pages/SeerahTimeline.tsx': [
        (
            '          <div className="relative mt-2">',
            '          <div className="relative mt-2" role="search" aria-label="بحث في السيرة النبوية">',
            'container role=search'
        ),
    ],
    'src/pages/Mushaf.tsx': [
        (
            '        <div className="mushaf-search-bar" onClick={(e) => e.stopPropagation()}>',
            '        <div className="mushaf-search-bar" role="search" aria-label="بحث في الصفحة" onClick={(e) => e.stopPropagation()}>',
            'container role=search'
        ),
        (
            '            type="text"\n'
            '            value={inPageSearch}\n'
            '            onChange={(e) => setInPageSearch(e.target.value)}\n'
            '            placeholder="بحث في الصفحة…"',
            '            type="search"\n'
            '            value={inPageSearch}\n'
            '            onChange={(e) => setInPageSearch(e.target.value)}\n'
            '            placeholder="بحث في الصفحة…"',
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
