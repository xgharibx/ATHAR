"""Patch Settings.tsx: add aria-label to reset accent button."""
path = r'c:\Users\Amrab\Downloads\noor-adhkar\src\pages\Settings.tsx'
content = open(path, 'r', encoding='utf-8').read()

# Find the reset accent button by a unique substring around it
old = 'onClick={() => { setPrefs({ customAccent: undefined }); toast("\u062a\u0645 \u0645\u0633\u062d \u0627\u0644\u0644\u0648\u0646 \u0627\u0644\u0645\u062e\u0635\u0635"); }}'
if old in content:
    # Insert aria-label before the className
    new = old + '\n                  aria-label="\u0625\u0639\u0627\u062f\u0629 \u0636\u0628\u0637 \u0627\u0644\u0644\u0648\u0646 \u0627\u0644\u0645\u062e\u0635\u0635"'
    content = content.replace(old, new, 1)
    open(path, 'w', encoding='utf-8').write(content)
    print('PATCHED reset accent button aria-label')
else:
    # Try to find what's actually there
    import re
    m = re.search(r'setPrefs\(\{ customAccent: undefined \}\)[^>]*\)', content)
    if m:
        print(repr(content[max(0, m.start()-50):m.end()+50]))
    else:
        print('NOT_FOUND: Could not locate reset accent button')
