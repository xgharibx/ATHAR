"""Patch Mushaf in-page search input with aria-label."""

path = r'c:\Users\Amrab\Downloads\noor-adhkar\src\pages\Mushaf.tsx'

old = '''            placeholder="بحث في الصفحة…"
            className="flex-1 bg-transparent outline-none text-sm"
            autoFocus
            dir="rtl"
            spellCheck={false}
            autoComplete="off"'''

new = '''            placeholder="بحث في الصفحة…"
            aria-label="البحث في الصفحة الحالية"
            className="flex-1 bg-transparent outline-none text-sm"
            autoFocus
            dir="rtl"
            spellCheck={false}
            autoComplete="off"'''

content = open(path, 'r', encoding='utf-8').read()
if old in content:
    content = content.replace(old, new, 1)
    open(path, 'w', encoding='utf-8').write(content)
    print('PATCHED: Mushaf.tsx search input aria-label')
elif new in content:
    print('ALREADY: Mushaf.tsx')
else:
    print('MISS: Mushaf.tsx - searching for context...')
    idx = content.find('البحث في الصفحة')
    print(f'  Closest match at {idx}: {repr(content[max(0,idx-20):idx+80]) if idx != -1 else "NOT FOUND"}')
