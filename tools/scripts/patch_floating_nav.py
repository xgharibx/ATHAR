"""Patch FloatingNav.tsx: expose badge indicators in aria-label for screen readers."""
path = r'c:\Users\Amrab\Downloads\noor-adhkar\src\components\layout\FloatingNav.tsx'
content = open(path, 'r', encoding='utf-8').read()

# Replace the static aria-label with a dynamic one that includes badge state
old = '              aria-label={item.label}\n              aria-current={active ? "page" : undefined}'
new = '''              aria-label={
                item.path === "/quran" && khatmaDueToday
                  ? `${item.label} \u2014 \u0648\u0631\u062f \u0627\u0644\u0642\u0631\u0622\u0646 \u0645\u0637\u0644\u0648\u0628`
                  : item.path === "/" && todayCount > 0
                  ? `${item.label} \u2014 ${todayCount} \u062a\u0633\u0628\u064a\u062d`
                  : item.label
              }
              aria-current={active ? "page" : undefined}'''

if old in content:
    content = content.replace(old, new, 1)
    open(path, 'w', encoding='utf-8').write(content)
    print('PATCHED: FloatingNav aria-label with badge info')
else:
    print('NOT_FOUND')
    # Debug: show the surrounding lines
    for i, line in enumerate(content.split('\n')):
        if 'aria-label={item.label}' in line:
            lines = content.split('\n')
            print(f'Found at line {i}:')
            for j in range(max(0, i-2), min(len(lines), i+4)):
                print(f'  {j}: {repr(lines[j])}')
