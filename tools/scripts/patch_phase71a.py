"""Phase 71: aria-controls for expand/collapse panels."""
import sys, os
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
base = r'c:\Users\Amrab\Downloads\noor-adhkar'

patches = [
    (
        'src/pages/Leaderboard.tsx',
        [
            (
                '        <Button variant={expanded ? "secondary" : "outline"} aria-expanded={expanded} onClick={() => setExpanded((v) => !v)}>',
                '        <Button variant={expanded ? "secondary" : "outline"} aria-expanded={expanded} aria-controls="lb-admin-panel" onClick={() => setExpanded((v) => !v)}>',
                'Leaderboard admin button aria-controls'
            ),
            (
                '        <div className="mt-4 space-y-4">',
                '        <div id="lb-admin-panel" className="mt-4 space-y-4">',
                'Leaderboard admin panel id'
            ),
            (
                '        <Button variant="secondary" aria-expanded={expanded} onClick={() => setExpanded((v) => !v)}>',
                '        <Button variant="secondary" aria-expanded={expanded} aria-controls="lb-friends-import" onClick={() => setExpanded((v) => !v)}>',
                'Leaderboard friends button aria-controls'
            ),
            (
                '        <div className="mt-4 space-y-3 border-t border-[var(--stroke)] pt-4">',
                '        <div id="lb-friends-import" className="mt-4 space-y-3 border-t border-[var(--stroke)] pt-4">',
                'Leaderboard friends import panel id'
            ),
        ]
    ),
    (
        'src/pages/CustomAdhkar.tsx',
        [
            (
                '            aria-label="عرض الأذكار"\n            aria-expanded={expanded}',
                '            aria-label="عرض الأذكار"\n            aria-expanded={expanded}\n            aria-controls={`pack-items-${pack.id}`}',
                'CustomAdhkar pack expand aria-controls'
            ),
            (
                '      {expanded && pack.items.length > 0 && (\n        <div className="space-y-1 border-t border-[var(--stroke)] pt-3">',
                '      {expanded && pack.items.length > 0 && (\n        <div id={`pack-items-${pack.id}`} className="space-y-1 border-t border-[var(--stroke)] pt-3">',
                'CustomAdhkar pack items div id'
            ),
        ]
    ),
]

for relpath, file_patches in patches:
    path = os.path.join(base, relpath.replace('/', os.sep))
    with open(path, encoding='utf-8') as f:
        c = f.read()
    for old, new, label in file_patches:
        if old in c:
            c = c.replace(old, new)
            print(f'  OK  [{label}]')
        else:
            print(f'  MISS[{label}]')
    with open(path, 'w', encoding='utf-8') as f:
        f.write(c)

print('\nDone.')
