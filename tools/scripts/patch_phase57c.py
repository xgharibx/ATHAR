"""Phase 57c: Insights milestones role=list, milestone items aria-label, emoji aria-hidden."""
import pathlib

root = pathlib.Path(r"c:\Users\Amrab\Downloads\noor-adhkar")

# --- Insights.tsx ---
f = root / "src/pages/Insights.tsx"
src = f.read_text(encoding="utf-8")

replacements = [
    # 1. Milestones grid container role=list
    (
        '        <div className="grid grid-cols-4 gap-2">\n          {unlockedMilestones.map((m) => (',
        '        <div className="grid grid-cols-4 gap-2" role="list" aria-label="الإنجازات">\n          {unlockedMilestones.map((m) => (',
        "Insights: milestones role=list"
    ),
    # 2. Milestone item role=listitem + aria-label (replacing title attr)
    (
        '            className={[\n                "flex flex-col items-center gap-1 py-3 rounded-2xl border transition-all",\n                m.unlocked\n                  ? "border-accent-35 bg-accent-10"\n                  : "border-[var(--stroke)] bg-[var(--card)] opacity-40 grayscale",\n              ].join(" ")}\n              title={m.unlocked ? `مفتوح — ${m.type === "total" ? `${m.req.toLocaleString("ar-EG")} ذكر` : `${m.req.toLocaleString("ar-EG")} يوم سلسلة`}` : `يتطلب ${m.type === "total" ? `${m.req.toLocaleString("ar-EG")} ذكر` : `${m.req.toLocaleString("ar-EG")} يوم متواصل`}`}',
        '            role="listitem"\n            className={[\n                "flex flex-col items-center gap-1 py-3 rounded-2xl border transition-all",\n                m.unlocked\n                  ? "border-accent-35 bg-accent-10"\n                  : "border-[var(--stroke)] bg-[var(--card)] opacity-40 grayscale",\n              ].join(" ")}\n              aria-label={m.unlocked ? `${m.label} — مفتوح — ${m.type === "total" ? `${m.req.toLocaleString("ar-EG")} ذكر` : `${m.req.toLocaleString("ar-EG")} يوم سلسلة`}` : `${m.label} — يتطلب ${m.type === "total" ? `${m.req.toLocaleString("ar-EG")} ذكر` : `${m.req.toLocaleString("ar-EG")} يوم متواصل`}`}',
        "Insights: milestone item role=listitem + aria-label"
    ),
    # 3. Milestone emoji aria-hidden
    (
        '              <span className="text-2xl leading-none">{m.emoji}</span>',
        '              <span className="text-2xl leading-none" aria-hidden="true">{m.emoji}</span>',
        "Insights: milestone emoji aria-hidden"
    ),
]

for old, new, label in replacements:
    if old in src:
        src = src.replace(old, new, 1)
        print(f"  patched {label}")
    else:
        print(f"  SKIP: {label} not found")

f.write_text(src, encoding="utf-8")

# --- Settings.tsx: DailyGoal stepper preset buttons need aria-pressed ---
f2 = root / "src/pages/Settings.tsx"
src2 = f2.read_text(encoding="utf-8")

# Check the daily goal preset buttons pattern
old_goal = '''              {([
                { label: "١٠ آيات", value: 10 },
                { label: "صفحة (١٥)", value: 15 },
                { label: "٥ صفحات (٧٥)", value: 75 },
                { label: "جزء (٢٠٨)", value: 208 },
              ]).map((p) => ('''
if old_goal in src2:
    # Find the button pattern for the preset
    idx = src2.find(old_goal)
    snippet = src2[idx:idx+600]
    print(f"  Found daily goal at offset {idx}, snippet: {repr(snippet[:200])}")
else:
    print("  SKIP: daily goal presets not found")

f2.write_text(src2, encoding="utf-8")
print("Phase 57c DONE")
