"""Phase 88: Add role=list/listitem to Leaderboard score rows and VideoLibrary grids"""
import sys, os
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

WORKSPACE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
changes = 0

def patch_file(path, old, new, label):
    global changes
    with open(path, encoding='utf-8') as f:
        content = f.read()
    if old in content:
        content = content.replace(old, new, 1)
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f'OK: {label}')
        changes += 1
    else:
        print(f'FAIL: {label}')
        # Debug: show surrounding content
        idx = content.find(old[:30])
        if idx >= 0:
            print(f'  (found prefix at {idx}: {repr(content[idx:idx+80])})')

lb_path = os.path.join(WORKSPACE, 'src', 'pages', 'Leaderboard.tsx')

# --- Main score list container ---
patch_file(lb_path,
    '        <div className="space-y-2">\n          {mergedRows.length === 0 ?',
    '        <div className="space-y-2" role="list" aria-label="\u062a\u0631\u062a\u064a\u0628 \u0627\u0644\u0645\u062a\u0633\u0627\u0628\u0642\u064a\u0646">\n          {mergedRows.length === 0 ?',
    'Leaderboard main score list role=list'
)

# --- Main score list row items ---
patch_file(lb_path,
    '            mergedRows.map((r, idx) => (\n              <div key={r.id} className={cn(\n                "glass rounded-3xl p-3 border flex items-center justify-between gap-3",\n                r.id === myEntry.id ? "border-accent-35 bg-accent-8" : "border-[var(--stroke)]"\n              )}>',
    '            mergedRows.map((r, idx) => (\n              <div key={r.id} role="listitem" className={cn(\n                "glass rounded-3xl p-3 border flex items-center justify-between gap-3",\n                r.id === myEntry.id ? "border-accent-35 bg-accent-8" : "border-[var(--stroke)]"\n              )}>',
    'Leaderboard main score row role=listitem'
)

# --- Friends list container ---
patch_file(lb_path,
    '      {/* Friend list */}\n      <div className="mt-3 space-y-2">',
    '      {/* Friend list */}\n      <div className="mt-3 space-y-2" role="list" aria-label="\u0642\u0627\u0626\u0645\u0629 \u0627\u0644\u0623\u0635\u062f\u0642\u0627\u0621">',
    'Leaderboard friends list role=list'
)

# --- Friends list row items ---
patch_file(lb_path,
    '          allRows.map((f, idx) => (\n            <div\n              key={f.id}\n              className={cn(\n                "glass rounded-3xl p-3 border flex items-center justify-between gap-3",\n                f.id === props.myStats.id ? "border-accent-35 bg-accent-8" : "border-[var(--stroke)]"\n              )}\n            >',
    '          allRows.map((f, idx) => (\n            <div\n              key={f.id}\n              role="listitem"\n              className={cn(\n                "glass rounded-3xl p-3 border flex items-center justify-between gap-3",\n                f.id === props.myStats.id ? "border-accent-35 bg-accent-8" : "border-[var(--stroke)]"\n              )}\n            >',
    'Leaderboard friends list row role=listitem'
)

# --- VideoLibrary: channel screen video list ---
vl_path = os.path.join(WORKSPACE, 'src', 'pages', 'VideoLibrary.tsx')
patch_file(vl_path,
    '          <div className="space-y-2">\n            {visibleVideos.slice(0, videoPage * PAGE_SIZE).map((v) => (\n              <VideoListRow',
    '          <div className="space-y-2" role="list" aria-label="\u0642\u0627\u0626\u0645\u0629 \u0627\u0644\u0641\u064a\u062f\u064a\u0648\u0647\u0627\u062a">\n            {visibleVideos.slice(0, videoPage * PAGE_SIZE).map((v) => (\n              <VideoListRow',
    'VideoLibrary channel video list role=list'
)

print(f'\nTotal changes: {changes}')
