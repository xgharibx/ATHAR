with open("src/store/noorStore.ts", encoding="utf-8", errors="surrogatepass") as f:
    lines = f.readlines()
for i, line in enumerate(lines):
    if "quranTheme" in line and (":" in line or "=" in line):
        print(f"Line {i+1}: {line.rstrip()}")
