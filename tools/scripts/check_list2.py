import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
files = ['src/pages/Settings.tsx', 'src/pages/VideoLibrary.tsx']
for f in files:
    with open(f, encoding='utf-8') as fp:
        c = fp.read()
    print(f'{f}:')
    print(f'  role=list: {c.count("role=\"list\"")}')
    print(f'  role=listitem: {c.count("role=\"listitem\"")}')
