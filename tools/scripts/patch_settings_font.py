"""Patch Settings.tsx: add aria-pressed to font selector buttons and language buttons."""
path = r'c:\Users\Amrab\Downloads\noor-adhkar\src\pages\Settings.tsx'
content = open(path, 'r', encoding='utf-8').read()

# 1. Add aria-pressed to font selector buttons 
old1 = '''              <button type="button"
                key={f.id}
                onClick={() => setPrefs({ arabicFont: f.id })}
                className={['''
new1 = '''              <button type="button"
                key={f.id}
                onClick={() => setPrefs({ arabicFont: f.id })}
                aria-pressed={(prefs.arabicFont ?? "noto_naskh") === f.id}
                className={['''

# 2. Add role="group" to font selector container  
old2 = '''          <div className="flex flex-wrap gap-2">
            {([
              { id: "noto_naskh", label: "\u0646\u0648\u062a\u0648 \u0646\u0633\u062e", sample: "\u0628\u0633\u0645 \u0627\u0644\u0644\u0647" },'''
new2 = '''          <div className="flex flex-wrap gap-2" role="group" aria-label="\u0627\u062e\u062a\u064a\u0627\u0631 \u062e\u0637 \u0627\u0644\u0642\u0631\u0627\u0621\u0629">
            {([
              { id: "noto_naskh", label: "\u0646\u0648\u062a\u0648 \u0646\u0633\u062e", sample: "\u0628\u0633\u0645 \u0627\u0644\u0644\u0647" },'''

patches = [(old1, new1), (old2, new2)]
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
