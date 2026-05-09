"""Patch Settings.tsx: add aria-pressed to language selector buttons."""
path = r'c:\Users\Amrab\Downloads\noor-adhkar\src\pages\Settings.tsx'
content = open(path, 'r', encoding='utf-8').read()

import re

# Find the lang button and add aria-pressed after type="button"
# Match the button in the language loop
old = '''                <button type="button"
                  key={lang}
                  onClick={() => lang === "ar" ? setPrefs({ uiLanguage: lang }) : toast('''
new = '''                <button type="button"
                  key={lang}
                  aria-pressed={(prefs.uiLanguage ?? "ar") === lang}
                  onClick={() => lang === "ar" ? setPrefs({ uiLanguage: lang }) : toast('''

if old in content:
    content = content.replace(old, new, 1)
    open(path, 'w', encoding='utf-8').write(content)
    print('PATCHED: lang button aria-pressed')
else:
    # Try a broader match
    m = re.search(r'<button type="button"\s+key=\{lang\}', content)
    if m:
        print(repr(content[m.start():m.start()+200]))
    else:
        print('NOT_FOUND: lang button not located')
