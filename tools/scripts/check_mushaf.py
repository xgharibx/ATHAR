with open("src/pages/Mushaf.tsx", "r", encoding="utf-8", errors="surrogatepass") as f:
    c = f.read()
anchor = '(["default", "sepia", "midnight", "parchment"] as const)'
print("anchor found:", anchor in c)
