"""Phase 52: Settings language/direction groups + QuranRadioFab group."""

base_pages = r'c:\Users\Amrab\Downloads\noor-adhkar\src\pages'
base_comp = r'c:\Users\Amrab\Downloads\noor-adhkar\src\components'

def patch(path, old, new, label=''):
    content = open(path, 'r', encoding='utf-8').read()
    name = path.split('\\')[-1]
    if old in content:
        content = content.replace(old, new, 1)
        open(path, 'w', encoding='utf-8').write(content)
        print(f'  PATCHED: {name} {label}')
        return True
    elif new in content:
        print(f'  ALREADY: {name} {label}')
        return True
    else:
        print(f'  MISS:    {name} {label}')
        return False

# ---- 1. Settings: language switcher group ----
print('Settings language group:')
patch(
    base_pages + r'\Settings.tsx',
    '            <div className="flex gap-1.5">\n              {(["ar", "en"] as const).map((lang) => (',
    '            <div className="flex gap-1.5" role="group" aria-label="\u0627\u062e\u062a\u064a\u0627\u0631 \u0644\u063a\u0629 \u0627\u0644\u0648\u0627\u062c\u0647\u0629">\n              {(["ar", "en"] as const).map((lang) => (',
    'language group'
)

# ---- 2. Settings: text direction group ----
print('Settings direction group:')
patch(
    base_pages + r'\Settings.tsx',
    '            <div className="flex gap-1.5">\n              {([\n                { id: "auto", label: "\u062a\u0644\u0642\u0627\u0626\u064a" }',
    '            <div className="flex gap-1.5" role="group" aria-label="\u0627\u062e\u062a\u064a\u0627\u0631 \u0627\u062a\u062c\u0627\u0647 \u0627\u0644\u0646\u0635">\n              {([\n                { id: "auto", label: "\u062a\u0644\u0642\u0627\u0626\u064a" }',
    'direction group'
)

# ---- 3. QuranRadioFab: radio station buttons group ----
print('QuranRadioFab stations group:')
radio_path = base_comp + r'\ui\QuranRadioFab.tsx'
content = open(radio_path, 'r', encoding='utf-8').read()
# Find the container for radio station buttons
if 'role="group"' in content:
    print('  ALREADY: radio stations group')
else:
    # Look for the stations list container
    import re
    # Find a div that contains the radio station buttons with aria-pressed
    idx = content.find('aria-pressed={radio.playing && radio.stationIdx === i}')
    if idx != -1:
        # Look back for a div
        div_idx = content.rfind('<div', 0, idx)
        line_num = content[:idx].count('\n') + 1
        print(f'  Found aria-pressed at line {line_num}')
        ctx_before = content[max(0, div_idx-50):div_idx+200]
        print(f'  Context: {repr(ctx_before[:200])}')
    else:
        print('  MISS: radio station aria-pressed not found')

print('\nDone.')
