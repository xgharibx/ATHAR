import os, sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

WORKSPACE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Settings.tsx: add role="listitem" to the HomeWidgets order map div
settings_path = os.path.join(WORKSPACE, 'src', 'pages', 'Settings.tsx')
with open(settings_path, 'r', encoding='utf-8') as f:
    content = f.read()

old = '          <div\n            key={key}\n            className="flex items-center gap-3 glass rounded-2xl border border-[var(--stroke)] px-3 py-2.5"'
new = '          <div\n            key={key}\n            role="listitem"\n            className="flex items-center gap-3 glass rounded-2xl border border-[var(--stroke)] px-3 py-2.5"'

if old in content:
    content = content.replace(old, new, 1)
    with open(settings_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print('Settings.tsx: PATCHED')
else:
    print('Settings.tsx: NOT FOUND')
    # Debug: show surrounding content
    idx = content.find('role="list" aria-label=')
    if idx >= 0:
        print('Found list at:', idx)
        print(repr(content[idx:idx+300]))
