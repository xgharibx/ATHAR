"""Fix .quran-note-sheet border-top to use var(--stroke)."""

with open('src/styles/globals.css', encoding='utf-8') as f:
    content = f.read()

OLD = '  border-top: 1px solid rgba(255, 255, 255, 0.10);\n  border-radius: 1.5rem 1.5rem 0 0;\n  box-shadow: 0 -8px 40px rgba(0, 0, 0, 0.30);\n  animation: noteSheetSlideUp 250ms'
NEW = '  border-top: 1px solid var(--stroke);\n  border-radius: 1.5rem 1.5rem 0 0;\n  box-shadow: 0 -8px 40px rgba(0, 0, 0, 0.30);\n  animation: noteSheetSlideUp 250ms'

if OLD in content:
    content = content.replace(OLD, NEW, 1)
    print('Fixed .quran-note-sheet border-top')
else:
    print('NOT FOUND - checking exact bytes...')
    # Find the line manually
    import re
    m = re.search(r'border-top: 1px solid rgba\(255, 255, 255, 0\.10\);\s*\n\s*border-radius: 1\.5rem', content)
    if m:
        print(f'Found at char {m.start()}: {repr(content[m.start():m.start()+60])}')
    else:
        print('Pattern not found at all!')

with open('src/styles/globals.css', 'w', encoding='utf-8') as f:
    f.write(content)
