"""
Phase 17: Fix Settings.tsx bg-white/X and border-white/X Tailwind classes
Replace with CSS variable equivalents for proper light/dark theme support.
"""

with open('src/pages/Settings.tsx', encoding='utf-8') as f:
    content = f.read()

original = content

# Ordered from most specific to least specific to avoid partial matches

# ── Inactive option button patterns ────────────────────────────────────────
# The most common pattern: inactive state
content = content.replace(
    '"bg-white/6 border-white/10 hover:bg-white/8"',
    '"bg-[var(--card)] border-[var(--stroke)] hover:bg-[var(--card-2)]"'
)
content = content.replace(
    '"bg-white/6 border-white/10 hover:bg-white/10 opacity-60"',
    '"bg-[var(--card)] border-[var(--stroke)] hover:bg-[var(--card-2)] opacity-60"'
)
content = content.replace(
    '"bg-white/6 border-white/10 hover:bg-white/10"',
    '"bg-[var(--card)] border-[var(--stroke)] hover:bg-[var(--card-2)]"'
)

# ── Info/stat cards ─────────────────────────────────────────────────────────
content = content.replace(
    '"rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 text-center"',
    '"rounded-2xl border border-[var(--stroke)] bg-[var(--card)] px-3 py-2.5 text-center"'
)

# ── Action buttons ──────────────────────────────────────────────────────────
content = content.replace(
    '"inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-2xl border border-white/15 bg-white/6 hover:bg-white/10 transition"',
    '"inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-2xl border border-[var(--stroke)] bg-[var(--card)] hover:bg-[var(--card-2)] transition"'
)
content = content.replace(
    '"flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/15 bg-white/6 hover:bg-white/10 transition text-xs min-h-[40px]"',
    '"flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[var(--stroke)] bg-[var(--card)] hover:bg-[var(--card-2)] transition text-xs min-h-[40px]"'
)
content = content.replace(
    '"text-xs px-2.5 py-1.5 rounded-xl bg-white/8 border border-white/10 opacity-70 hover:opacity-100 transition min-h-[36px]"',
    '"text-xs px-2.5 py-1.5 rounded-xl bg-[var(--card-2)] border border-[var(--stroke)] opacity-70 hover:opacity-100 transition min-h-[36px]"'
)

# ── Section dividers ─────────────────────────────────────────────────────────
content = content.replace('"mt-5 pt-4 border-t border-white/8"', '"mt-5 pt-4 border-t border-[var(--stroke)]"')
content = content.replace('"mt-5 pt-4 border-t border-white/8 flex items-center justify-between gap-3"',
                          '"mt-5 pt-4 border-t border-[var(--stroke)] flex items-center justify-between gap-3"')

# ── Color swatch border ─────────────────────────────────────────────────────
content = content.replace(
    '"block w-9 h-9 rounded-2xl border-2 border-white/20 shadow-inner ring-1 ring-black/20 transition hover:scale-105"',
    '"block w-9 h-9 rounded-2xl border-2 border-[var(--stroke)] shadow-inner ring-1 ring-black/20 transition hover:scale-105"'
)

# ── "Coming soon" badge ──────────────────────────────────────────────────────
content = content.replace(
    '"text-[9px] bg-white/15 rounded px-1 py-0.5 leading-none"',
    '"text-[9px] bg-[var(--card-2)] rounded px-1 py-0.5 leading-none"'
)

# ── Glass container with explicit white border ────────────────────────────────
content = content.replace(
    '"glass rounded-3xl p-4 border border-white/10"',
    '"glass rounded-3xl p-4 border border-[var(--stroke)]"'
)

# ── Emoji/icon picker button ─────────────────────────────────────────────────
content = content.replace(
    '"w-8 h-8 rounded-xl bg-white/8 border border-white/12 flex items-center justify-center hover:bg-white/12 transition text-base"',
    '"w-8 h-8 rounded-xl bg-[var(--card-2)] border border-[var(--stroke)] flex items-center justify-center hover:bg-[var(--card-2)] transition text-base"'
)

if content != original:
    with open('src/pages/Settings.tsx', 'w', encoding='utf-8') as f:
        f.write(content)
    print('Fixed Settings.tsx')
else:
    print('No changes - check exact string matching')

# Count remaining
import re
remaining_bg = len(re.findall(r'bg-white/', content))
remaining_border = len(re.findall(r'border-white/', content))
print(f'Remaining bg-white/: {remaining_bg}, border-white/: {remaining_border}')
