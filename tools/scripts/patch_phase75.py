"""Phase 75: Accessible name fixes for search inputs + FAB dialog keyboard/focus."""
import sys, os
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
base = r'c:\Users\Amrab\Downloads\noor-adhkar'
ok = 0
miss = 0

def patch(path, patches):
    global ok, miss
    with open(path, encoding='utf-8') as f:
        c = f.read()
    for old, new, label in patches:
        if old in c:
            c = c.replace(old, new, 1)
            print(f'  OK  [{label}]')
            ok += 1
        else:
            print(f'  MISS[{label}]')
            miss += 1
    with open(path, 'w', encoding='utf-8') as f:
        f.write(c)

# --- AsmaAlHusna.tsx: add aria-label to search input -------------------------
patch(os.path.join(base, 'src/pages/AsmaAlHusna.tsx'), [
    (
        '              <input\n                type="search"\n                value={query}\n                onChange={(e) => setQuery(e.target.value)}\n                placeholder="\u0627\u0628\u062d\u062b \u0628\u0627\u0644\u0627\u0633\u0645 \u0623\u0648 \u0627\u0644\u0645\u0639\u0646\u0649..."',
        '              <input\n                type="search"\n                value={query}\n                onChange={(e) => setQuery(e.target.value)}\n                aria-label="\u0628\u062d\u062b \u0641\u064a \u0623\u0633\u0645\u0627\u0621 \u0627\u0644\u0644\u0647 \u0627\u0644\u062d\u0633\u0646\u0649"\n                placeholder="\u0627\u0628\u062d\u062b \u0628\u0627\u0644\u0627\u0633\u0645 \u0623\u0648 \u0627\u0644\u0645\u0639\u0646\u0649..."',
        'AsmaAlHusna search input aria-label'
    ),
])

# --- Duas.tsx: add aria-label to search input --------------------------------
patch(os.path.join(base, 'src/pages/Duas.tsx'), [
    (
        '              <input\n                type="search"\n                value={query}\n                onChange={(e) => setQuery(e.target.value)}\n                placeholder="\u0627\u0628\u062d\u062b \u0641\u064a \u0627\u0644\u0623\u062f\u0639\u064a\u0629..."',
        '              <input\n                type="search"\n                value={query}\n                onChange={(e) => setQuery(e.target.value)}\n                aria-label="\u0628\u062d\u062b \u0641\u064a \u0627\u0644\u0623\u062f\u0639\u064a\u0629"\n                placeholder="\u0627\u0628\u062d\u062b \u0641\u064a \u0627\u0644\u0623\u062f\u0639\u064a\u0629..."',
        'Duas search input aria-label'
    ),
])

# --- AppShell.tsx: add aria-keyshortcuts to Ctrl+K search button -----------
patch(os.path.join(base, 'src/components/layout/AppShell.tsx'), [
    (
        '<IconButton aria-label="\u0628\u062d\u062b (Ctrl+K)" onClick={() => setPaletteOpen(true)}>',
        '<IconButton aria-label="\u0628\u062d\u062b (Ctrl+K)" aria-keyshortcuts="Control+k" onClick={() => setPaletteOpen(true)}>',
        'AppShell search button aria-keyshortcuts'
    ),
])

# --- QuickTasbeehFab.tsx: Escape key handler + autoFocus on close -----------
qt_path = os.path.join(base, 'src/components/layout/QuickTasbeehFab.tsx')
patch(qt_path, [
    # Add onKeyDown for Escape to the outer fixed wrapper div
    (
        '  return (\n    <div\n      className="fixed z-[9990] xl:hidden"\n      style={{\n        bottom: "calc(var(--mobile-nav-height) + (var(--mobile-nav-gap) * 2) + var(--sab))",\n        right: "calc(16px + var(--sar))",\n      }}\n    >',
        '  return (\n    <div\n      className="fixed z-[9990] xl:hidden"\n      style={{\n        bottom: "calc(var(--mobile-nav-height) + (var(--mobile-nav-gap) * 2) + var(--sab))",\n        right: "calc(16px + var(--sar))",\n      }}\n      onKeyDown={(e) => { if (e.key === "Escape") { e.stopPropagation(); setOpen(false); } }}\n    >',
        'QuickTasbeehFab Escape key handler'
    ),
    # Add autoFocus to close button
    (
        '          <button type="button"\n            onClick={() => setOpen(false)}\n            className="w-11 h-11 rounded-full bg-[var(--card)] border border-[var(--stroke)] grid place-items-',
        '          <button type="button"\n            autoFocus\n            onClick={() => setOpen(false)}\n            className="w-11 h-11 rounded-full bg-[var(--card)] border border-[var(--stroke)] grid place-items-',
        'QuickTasbeehFab close button autoFocus'
    ),
])

# --- QuranRadioFab.tsx: Escape key handler + autoFocus on close -----------
qr_path = os.path.join(base, 'src/components/layout/QuranRadioFab.tsx')
patch(qr_path, [
    # Add onKeyDown for Escape to the outer fixed wrapper div
    (
        '  return (\n    <div\n      className="fixed z-[9990] xl:hidden"\n      style={{\n        bottom: "calc(var(--mobile-nav-height) + (var(--mobile-nav-gap) * 2) + var(--sab))",\n        left: "16px",\n      }}\n    >',
        '  return (\n    <div\n      className="fixed z-[9990] xl:hidden"\n      style={{\n        bottom: "calc(var(--mobile-nav-height) + (var(--mobile-nav-gap) * 2) + var(--sab))",\n        left: "16px",\n      }}\n      onKeyDown={(e) => { if (e.key === "Escape") { e.stopPropagation(); setOpen(false); } }}\n    >',
        'QuranRadioFab Escape key handler'
    ),
    # Add autoFocus to close button
    (
        '          <button type="button"\n            onClick={() => setOpen(false)}\n            className="w-9 h-9 rounded-full bg-[var(--card)] border border-[var(--stroke)] grid place-items-ce\n            aria-label="\u0625\u063a\u0644\u0627\u0642"',
        '          <button type="button"\n            autoFocus\n            onClick={() => setOpen(false)}\n            className="w-9 h-9 rounded-full bg-[var(--card)] border border-[var(--stroke)] grid place-items-ce\n            aria-label="\u0625\u063a\u0644\u0627\u0642"',
        'QuranRadioFab close button autoFocus'
    ),
])

print(f'\nTotal OK={ok} MISS={miss}')
print('Done.')
