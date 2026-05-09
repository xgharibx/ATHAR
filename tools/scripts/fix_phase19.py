"""Phase 19: Add all missing .light theme overrides to globals.css."""

LIGHT_OVERRIDES = '''
/* ═══════════════════════════════════════════════════════════════
   Phase 19 — Missing .light theme overrides
   These ensure dark-by-default components look correct in light mode
   ═══════════════════════════════════════════════════════════════ */

/* ── Floating bottom nav ── */
.light .floating-nav {
  background: color-mix(in srgb, var(--bg) 92%, var(--fg));
  border: 1px solid var(--stroke);
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.12),
    0 0 0 1px var(--stroke),
    inset 0 1px 0 rgba(255, 255, 255, 0.6);
}

.light .floating-nav-item {
  color: rgba(15, 19, 37, 0.50);
}

/* ── Dhikr star dots ── */
.light .dhikr-page-stars {
  background-image:
    radial-gradient(circle at 14% 18%, rgba(15, 19, 37, 0.14) 0 1px, transparent 1.6px),
    radial-gradient(circle at 72% 22%, rgba(15, 19, 37, 0.10) 0 1.1px, transparent 1.8px),
    radial-gradient(circle at 36% 64%, rgba(15, 19, 37, 0.08) 0 0.9px, transparent 1.4px),
    radial-gradient(circle at 82% 74%, rgba(15, 19, 37, 0.12) 0 1px, transparent 1.6px),
    radial-gradient(circle at 22% 86%, rgba(15, 19, 37, 0.08) 0 0.9px, transparent 1.5px);
}

.light .dhikr-card-stars {
  background-image:
    radial-gradient(circle at 18% 22%, rgba(15, 19, 37, 0.15) 0 0.9px, transparent 1.5px),
    radial-gradient(circle at 74% 28%, rgba(15, 19, 37, 0.10) 0 0.85px, transparent 1.4px),
    radial-gradient(circle at 48% 72%, rgba(15, 19, 37, 0.12) 0 0.8px, transparent 1.35px),
    radial-gradient(circle at 86% 82%, rgba(15, 19, 37, 0.09) 0 0.9px, transparent 1.5px);
}

/* ── Count button ripple ── */
.light .btn-count::after {
  background: radial-gradient(circle at 50% 50%, rgba(15, 19, 37, 0.18), transparent 60%);
}

/* ── Mushaf sleep timer chip ── */
.light .mushaf-sleep-chip {
  background: color-mix(in srgb, var(--bg) 90%, var(--fg));
  color: var(--muted);
  border: 1px solid var(--stroke);
}

/* ── CSS tooltips ── */
.light [data-noor-tip]::after {
  background: color-mix(in srgb, var(--bg) 96%, var(--fg));
  color: var(--fg);
  border: 1px solid var(--stroke);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.10);
}

/* ── Pull-to-refresh indicator ── */
.light .ptr-indicator {
  background: color-mix(in srgb, var(--bg) 92%, var(--fg));
  border: 1px solid var(--stroke);
  color: var(--muted);
}

.light .ptr-indicator .ptr-spinner {
  border-color: var(--stroke);
  border-top-color: var(--accent);
}

/* ── Context menu ── */
.light .ctx-menu {
  background: color-mix(in srgb, var(--bg) 96%, var(--fg));
  border: 1px solid var(--stroke);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.12), 0 0 0 1px var(--stroke);
}

.light .ctx-menu-item {
  color: var(--fg);
}

.light .ctx-menu-item:hover {
  background: var(--card);
  color: var(--fg);
}

.light .ctx-menu-separator {
  background: var(--stroke);
}
'''

with open('src/styles/globals.css', encoding='utf-8') as f:
    content = f.read()

# Check if already added
if '.light .floating-nav {' in content:
    print('Already applied! Skipping.')
else:
    content = content + LIGHT_OVERRIDES
    with open('src/styles/globals.css', 'w', encoding='utf-8') as f:
        f.write(content)
    print('Phase 19 light overrides added successfully.')
    print(f'Added {len(LIGHT_OVERRIDES.split(chr(10)))} lines.')
