import sys, os
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
base = r'c:\Users\Amrab\Downloads\noor-adhkar'

path = os.path.join(base, 'src/components/layout/FloatingNav.tsx')
with open(path, encoding='utf-8') as f:
    c = f.read()

patches = [
    # Icon - already has aria-hidden on the icon component? No, let's add to the div wrapper
    # The icon is inside a <div className="relative"> - add aria-hidden to div
    (
        '<div className="relative">\n'
        '                <item.icon size={18} strokeWidth={active ? 2.2 : 1.8} />',
        '<div className="relative" aria-hidden="true">\n'
        '                <item.icon size={18} strokeWidth={active ? 2.2 : 1.8} />',
        'icon wrapper aria-hidden'
    ),
    # Hide the label span from SR since aria-label on NavLink covers it
    (
        '              <span>{item.label}</span>',
        '              <span aria-hidden="true">{item.label}</span>',
        'label span aria-hidden'
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
