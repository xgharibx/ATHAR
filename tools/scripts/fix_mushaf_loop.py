import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
path = 'src/pages/Mushaf.tsx'
with open(path, encoding='utf-8') as f:
    c = f.read()

old = '                      onClick={() => setLoopCount(n)}\n                      className={`px-2.5 py-1 rounded-xl text-xs border transition ${loopCount === n ? "bg-accent-20 bor'
new = '                      onClick={() => setLoopCount(n)}\n                      aria-label={n === -1 ? "\u062a\u0643\u0631\u0627\u0631 \u0644\u0627 \u0646\u0647\u0627\u0626\u064a" : `\u062a\u0643\u0631\u0627\u0631 ${n} \u0645\u0631\u0627\u062a`}\n                      aria-pressed={loopCount === n}\n                      className={`px-2.5 py-1 rounded-xl text-xs border transition ${loopCount === n ? "bg-accent-20 bor'

if old in c:
    c = c.replace(old, new, 1)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(c)
    print('OK loop count buttons')
else:
    print('MISS')
    idx = c.find('setLoopCount(n)')
    while idx != -1:
        print(repr(c[max(0,idx-100):idx+80]))
        print()
        idx = c.find('setLoopCount(n)', idx+1)
