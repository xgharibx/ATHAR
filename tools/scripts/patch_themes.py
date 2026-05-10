import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open("src/pages/Mushaf.tsx", "r", encoding="utf-8", errors="surrogatepass") as f:
    c = f.read()

old = '(["default", "sepia", "midnight", "parchment"] as const)'
new = '(["default", "sepia", "midnight", "parchment", "forest", "rose", "ocean", "desert", "dawn"] as const)'
assert old in c, "anchor not found"
c = c.replace(old, new, 1)

# Fix the label map (one-liner dict after the themes array)
old2 = '{{ default: "\U0001f311 \u0627\u0641\u062a\u0631\u0627\u0636\u064a", sepia: "\U0001f7eb \u0633\u064a\u0628\u064a\u0627", midnight: "\U0001f319 \u0644\u064a\u0644\u064a", parchment: "\U0001f4dc \u0631\u0642" }[t]}'
new2 = '{{ default: "\U0001f311 \u0627\u0641\u062a\u0631\u0627\u0636\u064a", sepia: "\U0001f7eb \u0633\u064a\u0628\u064a\u0627", midnight: "\U0001f319 \u0644\u064a\u0644\u064a", parchment: "\U0001f4dc \u0631\u0642", forest: "\U0001f332 \u063a\u0627\u0628\u0629", rose: "\U0001f339 \u0648\u0631\u062f\u064a", ocean: "\U0001f30a \u0628\u062d\u0631", desert: "\U0001f3dc\ufe0f \u0635\u062d\u0631\u0627\u0621", dawn: "\U0001f305 \u0641\u062c\u0631" }[t]}'
assert old2 in c, "label map anchor not found"
c = c.replace(old2, new2, 1)

with open("src/pages/Mushaf.tsx", "w", encoding="utf-8", errors="surrogatepass", newline="\n") as f:
    f.write(c)

print("Mushaf.tsx updated: 9 themes in picker")
