"""Phase 78: Focus return for QuickTasbeehFab and QuranRadioFab"""
import sys, os
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

WORKSPACE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def patch(rel_path, old, new, label):
    path = os.path.join(WORKSPACE, rel_path.replace('/', os.sep))
    with open(path, encoding='utf-8') as f:
        content = f.read()
    if old not in content:
        print(f'MISS  {label}')
        return False
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content.replace(old, new, 1))
    print(f'OK    {label}')
    return True

# ── 1. QuickTasbeehFab: add fabRef + focus return effect ────────────────────
# Add fabRef declaration after existing hooks
patch(
    'src/components/layout/QuickTasbeehFab.tsx',
    '''  // Close expansion when the hamburger drawer opens
  React.useEffect(() => { if (drawerOpen) setOpen(false); }, [drawerOpen]);''',
    '''  // Ref for the FAB trigger button (for focus return on dialog close)
  const fabRef = React.useRef<HTMLButtonElement>(null);
  // Return focus to FAB trigger when dialog closes
  React.useEffect(() => {
    if (!open && !drawerOpen) { fabRef.current?.focus(); }
  }, [open, drawerOpen]);
  // Close expansion when the hamburger drawer opens
  React.useEffect(() => { if (drawerOpen) setOpen(false); }, [drawerOpen]);''',
    'QuickTasbeehFab: add fabRef + effect',
)

# Add ref to the trigger button
patch(
    'src/components/layout/QuickTasbeehFab.tsx',
    '''  if (!open) {
    return (
      <button type="button"
        className="fab xl:hidden"''',
    '''  if (!open) {
    return (
      <button type="button"
        ref={fabRef}
        className="fab xl:hidden"''',
    'QuickTasbeehFab: add ref to trigger button',
)

# ── 2. QuranRadioFab: add fabRef + focus return effect ───────────────────────
patch(
    'src/components/layout/QuranRadioFab.tsx',
    '''  // Close expansion when the hamburger drawer opens
  React.useEffect(() => { if (drawerOpen) setOpen(false); }, [drawerOpen]);''',
    '''  // Ref for the FAB trigger button (for focus return on dialog close)
  const fabRef = React.useRef<HTMLButtonElement>(null);
  // Return focus to FAB trigger when dialog closes
  React.useEffect(() => {
    if (!open && !drawerOpen) { fabRef.current?.focus(); }
  }, [open, drawerOpen]);
  // Close expansion when the hamburger drawer opens
  React.useEffect(() => { if (drawerOpen) setOpen(false); }, [drawerOpen]);''',
    'QuranRadioFab: add fabRef + effect',
)

# Add ref to the trigger button
patch(
    'src/components/layout/QuranRadioFab.tsx',
    '''  if (!open) {
    return (
      <button type="button"
        className={cn(
          "fab xl:hidden",''',
    '''  if (!open) {
    return (
      <button type="button"
        ref={fabRef}
        className={cn(
          "fab xl:hidden",''',
    'QuranRadioFab: add ref to trigger button',
)

print('\nDone.')
