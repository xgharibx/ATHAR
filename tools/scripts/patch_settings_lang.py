"""Patch Settings.tsx: add aria-pressed to language selector and text direction buttons."""
path = r'c:\Users\Amrab\Downloads\noor-adhkar\src\pages\Settings.tsx'
content = open(path, 'r', encoding='utf-8').read()

# 1. Add aria-pressed to language buttons
old1 = '''                <button type="button"
                  key={lang}
                  onClick={() => lang === "ar" ? setPrefs({ uiLanguage: lang }) : toast("\u0627\u0644\u062a\u0631\u062c\u0645\u0629 \u0627\u0644\u0625\u0646\u062c\u0644\u064a\u0632\u064a\u0629 \u0642\u0631\u064a\u0628\u064b\u0627 \ud83c\udf10")}
                  className={['''
new1 = '''                <button type="button"
                  key={lang}
                  onClick={() => lang === "ar" ? setPrefs({ uiLanguage: lang }) : toast("\u0627\u0644\u062a\u0631\u062c\u0645\u0629 \u0627\u0644\u0625\u0646\u062c\u0644\u064a\u0632\u064a\u0629 \u0642\u0631\u064a\u0628\u064b\u0627 \ud83c\udf10")}
                  aria-pressed={(prefs.uiLanguage ?? "ar") === lang}
                  className={['''

patches = [(old1, new1)]
for old, new in patches:
    if old in content:
        content = content.replace(old, new, 1)
        print(f'PATCHED: {old[:60]!r}')
    elif new in content:
        print(f'ALREADY_HAS: {new[:60]!r}')
    else:
        print(f'NOT_FOUND: {old[:60]!r}')

open(path, 'w', encoding='utf-8').write(content)
print('Done.')
