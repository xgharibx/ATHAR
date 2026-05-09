import re

with open("src/pages/VideoLibrary.tsx", encoding="utf-8") as f:
    content = f.read()

content = content.replace(
    'color: "rgba(255,255,255,0.65)", background: "rgba(255,255,255,0.05)"',
    'color: "var(--fg)", background: "var(--card)"'
)
content = content.replace(
    '"rgba(255,255,255,0.35)"',
    '"var(--muted-2)"'
)

with open("src/pages/VideoLibrary.tsx", "w", encoding="utf-8") as f:
    f.write(content)

remaining = re.findall(r"rgba\(255,\s*255,\s*255", content)
print(f"VideoLibrary remaining: {len(remaining)}")
for m in remaining:
    print(" ", m)
