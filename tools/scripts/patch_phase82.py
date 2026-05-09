"""Phase 82: Add focus trap (Tab cycling) to QuickTasbeehFab and QuranRadioFab dialogs"""
import sys, os
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

WORKSPACE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

FOCUS_TRAP_CODE = '''
  // Focus trap: cycle Tab/Shift+Tab within the open dialog
  const panelRef = React.useRef<HTMLDivElement>(null);
  const trapFocus = React.useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Tab") return;
    const el = panelRef.current;
    if (!el) return;
    const focusable = Array.from(el.querySelectorAll<HTMLElement>(
      'button:not([disabled]),[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'
    ));
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last.focus(); }
    } else {
      if (document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }, []);'''

# --- Patch QuickTasbeehFab ---
fab_path = os.path.join(WORKSPACE, 'src', 'components', 'layout', 'QuickTasbeehFab.tsx')
with open(fab_path, encoding='utf-8') as f:
    content = f.read()

# 1. Add panelRef + trapFocus after fabRef declaration
old = '  // Return focus to FAB trigger when dialog closes\n  React.useEffect(() => {\n    if (!open && !drawerOpen) { fabRef.current?.focus(); }\n  }, [open, drawerOpen]);'
new = FOCUS_TRAP_CODE + '\n' + old
if old in content:
    content = content.replace(old, new, 1)
    print('QuickTasbeehFab: added panelRef + trapFocus')
else:
    print('QuickTasbeehFab: OLD TEXT NOT FOUND for focus trap')

# 2. Add ref+onKeyDown to panel div
old2 = '        role="dialog"\n        aria-modal="true"\n        aria-label="\u062a\u0633\u0628\u064a\u062d \u0633\u0631\u064a\u0639"'
new2 = '        ref={panelRef}\n        onKeyDown={trapFocus}\n        role="dialog"\n        aria-modal="true"\n        aria-label="\u062a\u0633\u0628\u064a\u062d \u0633\u0631\u064a\u0639"'
if old2 in content:
    content = content.replace(old2, new2, 1)
    print('QuickTasbeehFab: added ref+onKeyDown to panel div')
else:
    print('QuickTasbeehFab: OLD TEXT NOT FOUND for panel div')

with open(fab_path, 'w', encoding='utf-8') as f:
    f.write(content)

# --- Patch QuranRadioFab ---
radio_path = os.path.join(WORKSPACE, 'src', 'components', 'layout', 'QuranRadioFab.tsx')
with open(radio_path, encoding='utf-8') as f:
    content = f.read()

# 1. Add panelRef + trapFocus after fabRef declaration
old = '  // Return focus to FAB trigger when dialog closes\n  React.useEffect(() => {\n    if (!open && !drawerOpen) { fabRef.current?.focus(); }\n  }, [open, drawerOpen]);'
new = FOCUS_TRAP_CODE + '\n' + old
if old in content:
    content = content.replace(old, new, 1)
    print('QuranRadioFab: added panelRef + trapFocus')
else:
    print('QuranRadioFab: OLD TEXT NOT FOUND for focus trap')

# 2. Add ref+onKeyDown to panel div
old2 = '        role="dialog"\n        aria-modal="true"\n        aria-label="\u0631\u0627\u062f\u064a\u0648 \u0627\u0644\u0642\u0631\u0622\u0646"'
new2 = '        ref={panelRef}\n        onKeyDown={trapFocus}\n        role="dialog"\n        aria-modal="true"\n        aria-label="\u0631\u0627\u062f\u064a\u0648 \u0627\u0644\u0642\u0631\u0622\u0646"'
if old2 in content:
    content = content.replace(old2, new2, 1)
    print('QuranRadioFab: added ref+onKeyDown to panel div')
else:
    print('QuranRadioFab: OLD TEXT NOT FOUND for panel div')

with open(radio_path, 'w', encoding='utf-8') as f:
    f.write(content)

print('\nDone.')
