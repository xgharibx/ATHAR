import sys, re
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
files = ['src/pages/Leaderboard.tsx', 'src/pages/Library.tsx', 'src/pages/Search.tsx', 'src/pages/VideoLibrary.tsx']
for f in files:
    with open(f, encoding='utf-8') as fp:
        c = fp.read()
    rl = c.count('role="list"')
    rli = c.count('role="listitem"')
    ra = c.count('role="article"')
    print(f'{f}: list={rl}, listitem={rli}, article={ra}')
