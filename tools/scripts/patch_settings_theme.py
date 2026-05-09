"""Patch Settings.tsx: add aria-pressed to ThemeChip, add role=group to theme selector, add aria-label to reset accent button."""
path = r'c:\Users\Amrab\Downloads\noor-adhkar\src\pages\Settings.tsx'
content = open(path, 'r', encoding='utf-8').read()

# 1. Add aria-pressed to ThemeChip button
old1 = '''function ThemeChip(props: { value: NoorTheme; label: string; active: boolean; onClick: () => void }) {
  const dotColor = THEME_ACCENTS[props.value];
  return (
    <button type="button"
      onClick={props.onClick}
      className={['''
new1 = '''function ThemeChip(props: { value: NoorTheme; label: string; active: boolean; onClick: () => void }) {
  const dotColor = THEME_ACCENTS[props.value];
  return (
    <button type="button"
      onClick={props.onClick}
      aria-pressed={props.active}
      className={['''

# 2. Add role="group" and aria-label to the theme chip container
old2 = '        <div className="mt-4 flex flex-wrap gap-2">'
new2 = '        <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="\u0627\u062e\u062a\u064a\u0627\u0631 \u0627\u0644\u0645\u0638\u0647\u0631">'

# 3. Add aria-label to the reset accent button
old3 = '''                <button type="button"
                  onClick={() => setPrefs({ customAccent: undefined })}
                  className="text-xs px-2.5 py-1.5 rounded-xl bg-white/8 border border-white/10 opacity-70 hover:opacity-100 transition min-h-[36px]"
                >
                  \u0625\u0639\u0627\u062f\u0629 \u0636\u0628\u0637'''
new3 = '''                <button type="button"
                  onClick={() => setPrefs({ customAccent: undefined })}
                  aria-label="\u0625\u0639\u0627\u062f\u0629 \u0636\u0628\u0637 \u0627\u0644\u0644\u0648\u0646 \u0627\u0644\u0645\u062e\u0635\u0635"
                  className="text-xs px-2.5 py-1.5 rounded-xl bg-white/8 border border-white/10 opacity-70 hover:opacity-100 transition min-h-[36px]"
                >
                  \u0625\u0639\u0627\u062f\u0629 \u0636\u0628\u0637'''

patches = [(old1, new1), (old2, new2), (old3, new3)]
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
