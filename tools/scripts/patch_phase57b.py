"""Phase 57b: Add role=list to Home.tsx containers + icon aria-hidden in Insights bar chart containers."""
import pathlib, re

root = pathlib.Path(r"c:\Users\Amrab\Downloads\noor-adhkar")
f = root / "src/pages/Home.tsx"
src = f.read_text(encoding="utf-8")

replacements = [
    # 1. Daily checklist items container
    (
        '                <div id="home-checklist-items" className="mt-3 space-y-2">',
        '                <div id="home-checklist-items" className="mt-3 space-y-2" role="list" aria-label="قائمة العبادات اليومية">',
        "Home: checklist items role=list"
    ),
    # 2. Quests container
    (
        '              <div className="mt-2.5 flex gap-2 flex-wrap">\n                {quests.map((q) => (',
        '              <div className="mt-2.5 flex gap-2 flex-wrap" role="list" aria-label="المهام">\n                {quests.map((q) => (',
        "Home: quests role=list"
    ),
    # 3. Quest item role=listitem
    (
        '                  <div\n                    key={q.id}\n                    className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-all"',
        '                  <div\n                    key={q.id}\n                    role="listitem"\n                    className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-all"',
        "Home: quest item role=listitem"
    ),
    # 4. Daily wird grid container
    (
        '                <div id="home-daily-wird-content" className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">',
        '                <div id="home-daily-wird-content" className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3" role="list" aria-label="ورد اليوم">',
        "Home: daily wird role=list"
    ),
    # 5. Quick tasbeeh grid container
    (
        '              <div className="mt-4 grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3">\n                {QUICK_TASBEEH.map((it) => {',
        '              <div className="mt-4 grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3" role="list" aria-label="التسابيح السريعة">\n                {QUICK_TASBEEH.map((it) => {',
        "Home: quick tasbeeh role=list"
    ),
]

for old, new, label in replacements:
    if old in src:
        src = src.replace(old, new, 1)
        print(f"  patched {label}")
    else:
        print(f"  SKIP: {label} not found")

f.write_text(src, encoding="utf-8")

# --- Insights.tsx: add aria-hidden to decorative SVG icons in bar chart bars ---
# The chart container needs accessible identification; bars are decorative
f2 = root / "src/pages/Insights.tsx"
src2 = f2.read_text(encoding="utf-8")

# Add aria-label to the bar chart container for last7Days
old_chart1 = '        <div className="flex items-end gap-1.5" style={{ height: "80px" }}>\n          {last7Days.map((day) => {'
new_chart1 = '        <div className="flex items-end gap-1.5" style={{ height: "80px" }} role="img" aria-label="مخطط نشاط الأسبوع: آخر ٧ أيام">\n          {last7Days.map((day) => {'
if old_chart1 in src2:
    src2 = src2.replace(old_chart1, new_chart1, 1)
    print("  patched Insights: last7Days chart role=img")
else:
    print("  SKIP: Insights last7Days chart pattern not found")

# Add aria-label to quranLast7Days bar chart
old_chart2 = '        <div className="flex items-end gap-1.5" style={{ height: "72px" }}>\n          {quranLast7Days.map((day) => {'
new_chart2 = '        <div className="flex items-end gap-1.5" style={{ height: "72px" }} role="img" aria-label="مخطط قراءة القرآن: آخر ٧ أيام">\n          {quranLast7Days.map((day) => {'
if old_chart2 in src2:
    src2 = src2.replace(old_chart2, new_chart2, 1)
    print("  patched Insights: quranLast7Days chart role=img")
else:
    print("  SKIP: Insights quranLast7Days chart pattern not found")

f2.write_text(src2, encoding="utf-8")
print("Phase 57b DONE")
