"""Phase 52: Settings sound groups."""

path = r'c:\Users\Amrab\Downloads\noor-adhkar\src\pages\Settings.tsx'

content = open(path, 'r', encoding='utf-8').read()
changed = False

# 1. Reminder sound grid -> add role=group
old1 = '          <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-2">\n            {REMINDER_SOUND_OPTIONS.map((option) => {'
new1 = '          <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-2" role="group" aria-label="\u0627\u062e\u062a\u064a\u0627\u0631 \u0635\u0648\u062a \u0627\u0644\u062a\u0630\u0643\u064a\u0631">\n            {REMINDER_SOUND_OPTIONS.map((option) => {'
if old1 in content:
    content = content.replace(old1, new1, 1)
    changed = True
    print('PATCHED: reminder sound grid group')
elif new1 in content:
    print('ALREADY: reminder sound grid')
else:
    print('MISS: reminder sound grid')
    idx = content.find('REMINDER_SOUND_OPTIONS.map')
    if idx != -1:
        print(f'  Context: {repr(content[max(0,idx-100):idx+50])}')

# 2. Find Adhan sound options
if 'ADHAN_SOUND_OPTIONS' in content:
    idx2 = content.find('ADHAN_SOUND_OPTIONS.map')
    # Look for grid container
    grid_idx = content.rfind('<div', 0, idx2)
    grid_end = content.find('>', grid_idx)
    grid_div = content[grid_idx:grid_end+1]
    print(f'  Adhan grid div: {repr(grid_div)}')
    if 'role=' not in grid_div:
        # Add role=group to it
        old2 = grid_div
        new2 = grid_div.replace('>', ' role="group" aria-label="\u0627\u062e\u062a\u064a\u0627\u0631 \u0635\u0648\u062a \u0627\u0644\u0623\u0630\u0627\u0646">', 1)
        if old2 in content:
            content = content.replace(old2, new2, 1)
            changed = True
            print('PATCHED: adhan sound grid group')
        else:
            print('MISS: adhan grid')
    else:
        print('ALREADY: adhan grid')

if changed:
    open(path, 'w', encoding='utf-8').write(content)
    print('Saved Settings.tsx')
else:
    print('No changes needed')
