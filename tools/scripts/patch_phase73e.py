"""Phase 73e: HadithBookView - add aria-controls to tablist + id to panel."""
import sys, os
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
base = r'c:\Users\Amrab\Downloads\noor-adhkar'
path = os.path.join(base, 'src', 'pages', 'HadithBookView.tsx')
with open(path, encoding='utf-8') as f:
    c = f.read()

patches = [
    # Add aria-controls to the static "all" tab
    (
        '          <button type="button"\n            role="tab"\n            aria-selected={activeSectionId === null}',
        '          <button type="button"\n            role="tab"\n            aria-controls="hbv-list-panel"\n            aria-selected={activeSectionId === null}',
        'HBV all-tab aria-controls'
    ),
    # Add aria-controls to section tabs (in the .map)
    (
        '            <button type="button"\n              key={s.id}\n              role="tab"\n              aria-selected={activeSectionId === s.id}',
        '            <button type="button"\n              key={s.id}\n              role="tab"\n              aria-controls="hbv-list-panel"\n              aria-selected={activeSectionId === s.id}',
        'HBV section-tab aria-controls'
    ),
    # Add id to the list wrapper div
    (
        '        <div className="flex-1">\n          <Virtuoso',
        '        <div id="hbv-list-panel" className="flex-1">\n          <Virtuoso',
        'HBV list panel id'
    ),
]

for old, new, label in patches:
    if old in c:
        c = c.replace(old, new)
        print(f'  OK  [{label}]')
    else:
        print(f'  MISS[{label}]')

with open(path, 'w', encoding='utf-8') as f:
    f.write(c)
print('Done.')
