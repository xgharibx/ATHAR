"""Phase 20: Add .light overrides for onboarding-card, onboarding-dot, quran-mem-span."""

OVERRIDES = '''
/* ── Onboarding card (sheet) ── */
.light .onboarding-card {
  background: color-mix(in srgb, var(--bg) 98%, var(--fg));
  border: 1px solid var(--stroke);
}

/* ── Onboarding step dots ── */
.light .onboarding-dot {
  background: var(--card-2);
}

/* ── Quran memorization span ── */
.light .quran-mem-span {
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.5), 0 1px 3px rgba(0,0,0,0.10);
}
'''

with open('src/styles/globals.css', encoding='utf-8') as f:
    content = f.read()

if '.light .onboarding-card {' in content:
    print('Already applied!')
else:
    content = content + OVERRIDES
    with open('src/styles/globals.css', 'w', encoding='utf-8') as f:
        f.write(content)
    print('Phase 20 overrides added.')
