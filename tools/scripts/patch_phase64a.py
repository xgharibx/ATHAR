import sys, os
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
base = r'c:\Users\Amrab\Downloads\noor-adhkar'

path = os.path.join(base, 'src/components/layout/AppShell.tsx')
with open(path, encoding='utf-8') as f:
    c = f.read()

old = '<main id="main-content" aria-label="المحتوى الرئيسي" className="col-span-12 xl:col-span-9 2xl:col-span-10">'
new = '<main id="main-content" tabIndex={-1} aria-label="المحتوى الرئيسي" className="col-span-12 xl:col-span-9 2xl:col-span-10 focus:outline-none">'

if old in c:
    c = c.replace(old, new)
    print('OK patched main tabIndex=-1')
    with open(path, 'w', encoding='utf-8') as f:
        f.write(c)
else:
    print('MISS')
