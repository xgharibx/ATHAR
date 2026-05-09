"""Phase 74a: Add aria-controls to PrayerTimes tabs + DailyCarousel tab-panel links + Leaderboard BoardTab."""
import sys, os
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
base = r'c:\Users\Amrab\Downloads\noor-adhkar'
ok = 0
miss = 0

def patch_file(path, patches):
    global ok, miss
    with open(path, encoding='utf-8') as f:
        c = f.read()
    for old, new, label in patches:
        if old in c:
            c = c.replace(old, new)
            print(f'  OK  [{label}]')
            ok += 1
        else:
            print(f'  MISS[{label}]')
            miss += 1
    with open(path, 'w', encoding='utf-8') as f:
        f.write(c)

# ─── PrayerTimes.tsx ─────────────────────────────────────────────────────────
pt_path = os.path.join(base, 'src', 'pages', 'PrayerTimes.tsx')
patch_file(pt_path, [
    (
        'id={`pt-tab-${tab.key}`} role="tab" aria-selected={activeTab === tab.key}',
        'id={`pt-tab-${tab.key}`} role="tab" aria-controls={`pt-panel-${tab.key}`} aria-selected={activeTab === tab.key}',
        'PrayerTimes tabs aria-controls'
    ),
])

# ─── DailyCarousel.tsx ────────────────────────────────────────────────────────
dc_path = os.path.join(base, 'src', 'components', 'ui', 'DailyCarousel.tsx')
patch_file(dc_path, [
    # Add ids to slides
    (
        'role="group" aria-roledescription="\u0634\u0631\u064a\u062d\u0629" aria-label="\u0622\u064a\u0629 \u0627\u0644\u064a\u0648\u0645" style={{ flex: "0 0 100%", width: "100%", padding: "0.75rem 1rem 1rem" }}>',
        'id="carousel-slide-0" role="group" aria-roledescription="\u0634\u0631\u064a\u062d\u0629" aria-label="\u0622\u064a\u0629 \u0627\u0644\u064a\u0648\u0645" style={{ flex: "0 0 100%", width: "100%", padding: "0.75rem 1rem 1rem" }}>',
        'DailyCarousel slide-0 id'
    ),
    (
        'role="group" aria-roledescription="\u0634\u0631\u064a\u062d\u0629" aria-label="\u062d\u062f\u064a\u062b \u0627\u0644\u064a\u0648\u0645" style={{ flex: "0 0 100%", width: "100%", padding: "0.75rem 1rem 1rem" }}>',
        'id="carousel-slide-1" role="group" aria-roledescription="\u0634\u0631\u064a\u062d\u0629" aria-label="\u062d\u062f\u064a\u062b \u0627\u0644\u064a\u0648\u0645" style={{ flex: "0 0 100%", width: "100%", padding: "0.75rem 1rem 1rem" }}>',
        'DailyCarousel slide-1 id'
    ),
    (
        'role="group" aria-roledescription="\u0634\u0631\u064a\u062d\u0629" aria-label="\u062a\u062f\u0628\u0631 \u0627\u0644\u064a\u0648\u0645" style={{ flex: "0 0 100%", width: "100%", padding: "0.75rem 1rem 1rem" }}>',
        'id="carousel-slide-2" role="group" aria-roledescription="\u0634\u0631\u064a\u062d\u0629" aria-label="\u062a\u062f\u0628\u0631 \u0627\u0644\u064a\u0648\u0645" style={{ flex: "0 0 100%", width: "100%", padding: "0.75rem 1rem 1rem" }}>',
        'DailyCarousel slide-2 id'
    ),
    # Add aria-controls to dot tabs
    (
        '            role="tab"\n            aria-selected={activeIdx === i}\n            aria-label={SLIDE_LABELS[i]}',
        '            role="tab"\n            aria-controls={`carousel-slide-${i}`}\n            aria-selected={activeIdx === i}\n            aria-label={SLIDE_LABELS[i]}',
        'DailyCarousel dot tabs aria-controls'
    ),
])

# ─── Leaderboard.tsx: BoardTab component ────────────────────────────────────
lb_path = os.path.join(base, 'src', 'pages', 'Leaderboard.tsx')
patch_file(lb_path, [
    # Add controls prop to BoardTab type + usage
    (
        'function BoardTab(props: { label: string; active: boolean; onClick: () => void }) {\n  return (\n    <Button\n      role="tab"\n      aria-selected={props.active}',
        'function BoardTab(props: { label: string; active: boolean; onClick: () => void; controls?: string }) {\n  return (\n    <Button\n      role="tab"\n      aria-controls={props.controls}\n      aria-selected={props.active}',
        'Leaderboard BoardTab controls prop'
    ),
    # Add id to the board content card and controls to period tabs
    (
        '          <BoardTab label="\u0623\u0633\u0628\u0648\u0639\u064a" active={period === "weekly"} onClick={() => setPeriod("weekly")} />',
        '          <BoardTab label="\u0623\u0633\u0628\u0648\u0639\u064a" active={period === "weekly"} onClick={() => setPeriod("weekly")} controls="lb-board-panel" />',
        'Leaderboard period weekly controls'
    ),
    (
        '          <BoardTab label="\u0634\u0647\u0631\u064a" active={period === "monthly"} onClick={() => setPeriod("monthly")} />',
        '          <BoardTab label="\u0634\u0647\u0631\u064a" active={period === "monthly"} onClick={() => setPeriod("monthly")} controls="lb-board-panel" />',
        'Leaderboard period monthly controls'
    ),
    (
        '          <BoardTab label="\u0633\u0646\u0648\u064a" active={period === "yearly"} onClick={() => setPeriod("yearly")} />',
        '          <BoardTab label="\u0633\u0646\u0648\u064a" active={period === "yearly"} onClick={() => setPeriod("yearly")} controls="lb-board-panel" />',
        'Leaderboard period yearly controls'
    ),
    # Board type tabs
    (
        '          <BoardTab label="\u0627\u0644\u0630\u0643\u0631" active={board === "dhikr"} onClick={() => setBoard("dhikr")} />',
        '          <BoardTab label="\u0627\u0644\u0630\u0643\u0631" active={board === "dhikr"} onClick={() => setBoard("dhikr")} controls="lb-board-panel" />',
        'Leaderboard board dhikr controls'
    ),
    (
        '          <BoardTab label="\u0627\u0644\u0642\u0631\u0622\u0646" active={board === "quran"} onClick={() => setBoard("quran")} />',
        '          <BoardTab label="\u0627\u0644\u0642\u0631\u0622\u0646" active={board === "quran"} onClick={() => setBoard("quran")} controls="lb-board-panel" />',
        'Leaderboard board quran controls'
    ),
    (
        '          <BoardTab label="\u0627\u0644\u0635\u0644\u0648\u0627\u062a" active={board === "prayers"} onClick={() => setBoard("prayers")} />',
        '          <BoardTab label="\u0627\u0644\u0635\u0644\u0648\u0627\u062a" active={board === "prayers"} onClick={() => setBoard("prayers")} controls="lb-board-panel" />',
        'Leaderboard board prayers controls'
    ),
    (
        '          <BoardTab label="\u062a\u0633\u0628\u064a\u062d \u0627\u0644\u064a\u0648\u0645" active={board === "tasbeeh_daily"} onClick={() => setBoard("tasbeeh_daily")} />',
        '          <BoardTab label="\u062a\u0633\u0628\u064a\u062d \u0627\u0644\u064a\u0648\u0645" active={board === "tasbeeh_daily"} onClick={() => setBoard("tasbeeh_daily")} controls="lb-board-panel" />',
        'Leaderboard board tasbeeh controls'
    ),
    (
        '          <BoardTab label="\u0642\u0633\u0645" active={board === "section"} onClick={() => setBoard("section")} />',
        '          <BoardTab label="\u0642\u0633\u0645" active={board === "section"} onClick={() => setBoard("section")} controls="lb-board-panel" />',
        'Leaderboard board section controls'
    ),
    # Add id to the board content card
    (
        '      <Card className="p-5">\n        <div className="text-sm font-semibold mb-3">\n          {board === "global"',
        '      <Card id="lb-board-panel" className="p-5">\n        <div className="text-sm font-semibold mb-3">\n          {board === "global"',
        'Leaderboard board panel id'
    ),
])

print(f'\nTotal OK={ok} MISS={miss}')
print('Done.')
