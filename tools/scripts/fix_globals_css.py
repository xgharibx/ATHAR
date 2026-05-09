"""
Phase 15b: Fix hardcoded rgba(255,255,255,...) in globals.css
Replace with CSS variables so all themes (including light) render correctly.
"""

with open('src/styles/globals.css', encoding='utf-8') as f:
    css = f.read()

original = css

# ── Ayah tooltip ─────────────────────────────────────────────────────────────
css = css.replace(
    '  border: 1px solid rgba(255, 255, 255, 0.15);\n  border-radius: 999px;\n  padding: 4px 6px;',
    '  border: 1px solid var(--stroke);\n  border-radius: 999px;\n  padding: 4px 6px;'
)
css = css.replace(
    '  color: rgba(255, 255, 255, 0.80);\n  cursor: pointer;\n  user-select: none;',
    '  color: var(--muted);\n  cursor: pointer;\n  user-select: none;'
)
css = css.replace(
    '.ayah-tooltip-btn:hover { background: rgba(255, 255, 255, 0.34); color: #111827; }',
    '.ayah-tooltip-btn:hover { background: var(--card-2); color: var(--fg); }'
)
css = css.replace(
    '  background: rgba(255, 255, 255, 0.11);\n  flex-shrink: 0;\n  margin: 0 1px;',
    '  background: var(--stroke);\n  flex-shrink: 0;\n  margin: 0 1px;'
)

# ── Quran note sheet handle ────────────────────────────────────────────────────
css = css.replace(
    '  background: rgba(255, 255, 255, 0.16);\n',
    '  background: var(--card-2);\n',
)

# ── Full-screen chrome header/footer borders ──────────────────────────────────
css = css.replace(
    '  border-bottom: 1px solid rgba(255, 255, 255, 0.07);\n  padding-top: calc(0.5rem + env(safe-area-inset-top, 0px));',
    '  border-bottom: 1px solid var(--stroke);\n  padding-top: calc(0.5rem + env(safe-area-inset-top, 0px));'
)
css = css.replace(
    '  border-top: 1px solid rgba(255, 255, 255, 0.07);\n  padding-bottom: calc(0.5rem + env(safe-area-inset-bottom, 0px));',
    '  border-top: 1px solid var(--stroke);\n  padding-bottom: calc(0.5rem + env(safe-area-inset-bottom, 0px));'
)

# ── Continuous scroll ayah border ──────────────────────────────────────────────
css = css.replace(
    '  border-bottom: 1px solid rgba(255,255,255,0.04);\n  scroll-margin-top: 80px;',
    '  border-bottom: 1px solid color-mix(in srgb, var(--stroke) 45%, transparent);\n  scroll-margin-top: 80px;'
)

# ── Juz navigation buttons ────────────────────────────────────────────────────
css = css.replace(
    '  border: 1px solid rgba(255,255,255,0.10);\n  background: rgba(255,255,255,0.05);\n  font-size: 0.7rem;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  cursor: pointer;\n  transition: background 0.15s, border-color 0.15s;',
    '  border: 1px solid var(--stroke);\n  background: var(--card);\n  font-size: 0.7rem;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  cursor: pointer;\n  transition: background 0.15s, border-color 0.15s;'
)
css = css.replace(
    '.quran-juz-btn:hover { background: rgba(255,255,255,0.10); }',
    '.quran-juz-btn:hover { background: var(--card-2); }'
)

# ── Quran timer badge ─────────────────────────────────────────────────────────
css = css.replace(
    '  background: rgba(255,255,255,0.06);\n  border: 1px solid rgba(255,255,255,0.10);\n  font-size: 0.68rem;',
    '  background: var(--card);\n  border: 1px solid var(--stroke);\n  font-size: 0.68rem;'
)

# ── Quran goal bar wrap ────────────────────────────────────────────────────────
css = css.replace(
    '  background: rgba(255,255,255,0.08);\n  overflow: hidden;\n  margin-top: 0.4rem;',
    '  background: var(--card-2);\n  overflow: hidden;\n  margin-top: 0.4rem;'
)

# ── Scrollbar thumb ──────────────────────────────────────────────────────────
css = css.replace(
    '  background: rgba(255, 255, 255, 0.14);\n  border-radius: 10px;',
    '  background: var(--stroke);\n  border-radius: 10px;'
)

# ── Quran settings sheet panel box-shadow ring ─────────────────────────────────
css = css.replace(
    '  box-shadow: 0 24px 64px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.04);',
    '  box-shadow: 0 24px 64px rgba(0,0,0,0.45), 0 0 0 1px var(--stroke);'
)

# ── Mushaf action buttons ─────────────────────────────────────────────────────
css = css.replace(
    '  color: rgba(255, 255, 255, 0.8);\n  cursor: pointer;\n  border-radius: 12px;',
    '  color: var(--muted);\n  cursor: pointer;\n  border-radius: 12px;'
)
css = css.replace(
    '.mushaf-action-btn:hover { background: rgba(255, 255, 255, 0.08); }',
    '.mushaf-action-btn:hover { background: var(--card-2); }'
)

# ── Mushaf juz overlay chip ────────────────────────────────────────────────────
css = css.replace(
    '  color: rgba(255, 255, 255, 0.92);\n  border: 1px solid rgba(255, 255, 255, 0.12);',
    '  color: var(--fg);\n  border: 1px solid var(--stroke);'
)
# Override the hardcoded dark background for light theme
css = css.replace(
    '  background: rgba(10, 14, 20, 0.88);\n  color: var(--fg);\n  border: 1px solid var(--stroke);',
    '  background: color-mix(in srgb, var(--bg) 88%, var(--fg));\n  color: var(--fg);\n  border: 1px solid var(--stroke);'
)

if css != original:
    with open('src/styles/globals.css', 'w', encoding='utf-8') as f:
        f.write(css)
    print('Fixed globals.css')
else:
    print('No changes made to globals.css')

# Count remaining
import re
remaining = len(re.findall(r'rgba\(255,\s*255,\s*255', css))
print(f'Remaining rgba(white) patterns in globals.css: {remaining}')
