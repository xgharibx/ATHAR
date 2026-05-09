import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
path = 'src/components/layout/QuranRadioFab.tsx'
with open(path, encoding='utf-8') as f:
    c = f.read()
old = '         </div>\n          <button type="button"\n            onClick={() => setOpen(false)}\n            className="w-9 h-9 rounded-full'
new = '         </div>\n          <button type="button"\n            autoFocus\n            onClick={() => setOpen(false)}\n            className="w-9 h-9 rounded-full'
if old in c:
    c = c.replace(old, new, 1)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(c)
    print('OK QuranRadioFab autoFocus')
else:
    print('MISS')
    idx = c.find('onClick={() => setOpen(false)}')
    while idx != -1:
        print(repr(c[max(0,idx-80):idx+40]))
        idx = c.find('onClick={() => setOpen(false)}', idx+1)
