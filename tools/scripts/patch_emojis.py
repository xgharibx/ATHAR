import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open("src/pages/Home.tsx", "r", encoding="utf-8", errors="surrogatepass") as f:
    c = f.read()

# The garbled emoji sequences appear as b'\xef\xbf\xbd\xef\xbf\xbd\xef\xbf\xbd\xef\xbf\xbd\xef\xbf\xbd\xef\xbf\xbd' = 6 replacement chars
GARBLED = "\ufffd\ufffd\ufffd\ufffd\ufffd\ufffd"

fixes = [
    # line ~1480: garbled آية اليوم label
    (GARBLED + " \u0622\u064a\u0629 \u0627\u0644\u064a\u0648\u0645", "\u2728 \u0622\u064a\u0629 \u0627\u0644\u064a\u0648\u0645"),
    # line ~1545: goal pill emoji (the unmet emoji)
    ('"' + GARBLED + '"', '"\U0001f4d6"'),
    # line ~1614: khatma pill emoji
    (">" + GARBLED + "<", ">\U0001f4d6<"),
]

count = 0
for old, new in fixes:
    n = c.count(old)
    if n > 0:
        c = c.replace(old, new, 1)
        print(f"Fixed: '{old[:20]}' -> '{new[:20]}' ({n} occurrence)")
        count += 1
    else:
        print(f"WARNING: not found: '{old[:40]}'")

with open("src/pages/Home.tsx", "w", encoding="utf-8", errors="surrogatepass", newline="\n") as f:
    f.write(c)

print(f"Done. {count} fixes applied.")
