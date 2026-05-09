"""Patch Settings.tsx: add aria-pressed to text direction buttons."""
path = r'c:\Users\Amrab\Downloads\noor-adhkar\src\pages\Settings.tsx'
content = open(path, 'r', encoding='utf-8').read()

old = '''                <button type="button"
                  key={d.id}
                  onClick={() => setPrefs({ textDir: d.id })}
                  className={['''
new = '''                <button type="button"
                  key={d.id}
                  onClick={() => setPrefs({ textDir: d.id })}
                  aria-pressed={(prefs.textDir ?? "auto") === d.id}
                  className={['''

if old in content:
    content = content.replace(old, new, 1)
    open(path, 'w', encoding='utf-8').write(content)
    print('PATCHED: text direction button aria-pressed')
else:
    print('NOT_FOUND')
