import sys, os
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
base = r'c:\Users\Amrab\Downloads\noor-adhkar'

path = os.path.join(base, 'src/components/layout/AppShell.tsx')
with open(path, encoding='utf-8') as f:
    c = f.read()

patches = [
    # Emoji icon in sidebar — decorative, info already in title
    (
        '        className="w-10 h-10 rounded-xl grid place-items-center shrink-0 text-lg"\n'
        '        style={{ background: `${identity.accent}18` }}\n'
        '      >\n'
        '        {identity.icon}',
        '        aria-hidden="true"\n'
        '        className="w-10 h-10 rounded-xl grid place-items-center shrink-0 text-lg"\n'
        '        style={{ background: `${identity.accent}18` }}\n'
        '      >\n'
        '        {identity.icon}',
        'emoji icon aria-hidden'
    ),
    # Inline mini progress bar — duplicate of the text percentage
    (
        '          <div className="flex-1 h-1 rounded-full bg-[var(--card-2)] overflow-hidden">\n'
        '            <div\n'
        '              className="h-full rounded-full transition-[width] duration-300"\n'
        '              style={{ width: `${percent}%`, background: identity.accent }}\n'
        '            />\n'
        '          </div>',
        '          <div aria-hidden="true" className="flex-1 h-1 rounded-full bg-[var(--card-2)] overflow-hidden">\n'
        '            <div\n'
        '              className="h-full rounded-full transition-[width] duration-300"\n'
        '              style={{ width: `${percent}%`, background: identity.accent }}\n'
        '            />\n'
        '          </div>',
        'mini progress bar aria-hidden'
    ),
]

for old, new, label in patches:
    if old in c:
        c = c.replace(old, new)
        print(f'  OK  [{label}]')
    else:
        print(f'  MISS[{label}]')

with open(path, 'w', encoding='utf-8') as f:
    f.write(c)
