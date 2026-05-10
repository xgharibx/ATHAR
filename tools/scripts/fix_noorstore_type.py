with open("src/store/noorStore.ts", "r", encoding="utf-8", errors="surrogatepass") as f:
    c = f.read()

old = '  quranTheme: "default" | "sepia" | "midnight" | "parchment";'
new = '  quranTheme: "default" | "sepia" | "midnight" | "parchment" | "forest" | "rose" | "ocean" | "desert" | "dawn";'

assert old in c, f"Anchor not found in noorStore.ts"
c = c.replace(old, new, 1)

with open("src/store/noorStore.ts", "w", encoding="utf-8", errors="surrogatepass", newline="\n") as f:
    f.write(c)

print("noorStore.ts: quranTheme type expanded to 9 values")
