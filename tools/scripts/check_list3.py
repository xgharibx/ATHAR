import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
files = ['src/pages/Settings.tsx', 'src/pages/VideoLibrary.tsx']
rl = 'role="list"'
rli = 'role="listitem"'
for f in files:
    with open(f, encoding='utf-8') as fp:
        c = fp.read()
    print(f + ': list=' + str(c.count(rl)) + ', listitem=' + str(c.count(rli)))
