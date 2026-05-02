import fs from "fs";
const file = "src/pages/Mushaf.tsx";
let src = fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n");

const patches = [
  // 1. Fix radio URLs → official qurango.net HTTPS streams
  {
    label: "radio URLs",
    from: `const QURAN_RADIO_STATIONS: Array<{ label: string; url: string }> = [
  { label: "راديو القرآن",         url: "https://media.mp3quran.net/quran/radio/" },
  { label: "مشاري العفاسي",        url: "https://media.mp3quran.net/alafasy/radio/" },
  { label: "سعد الغامدي",          url: "https://media.mp3quran.net/ghamadi/radio/" },
  { label: "ياسر الدوسري",         url: "https://media.mp3quran.net/yasser/radio/" },
  { label: "ماهر المعيقلي",        url: "https://media.mp3quran.net/maher/radio/" },
];`,
    to: `const QURAN_RADIO_STATIONS: Array<{ label: string; url: string }> = [
  { label: "راديو القرآن الكريم",  url: "https://stream.radiojar.com/0tpy1h0kxtzuv" },
  { label: "مشاري العفاسي",        url: "https://backup.qurango.net/radio/mishary_alafasi" },
  { label: "سعد الغامدي",          url: "https://backup.qurango.net/radio/saad_alghamdi" },
  { label: "ياسر الدوسري",         url: "https://backup.qurango.net/radio/yasser_aldosari" },
  { label: "ماهر المعيقلي",        url: "https://backup.qurango.net/radio/maher" },
];`,
  },

  // 2. Remove HelpCircle from lucide imports
  {
    label: "remove HelpCircle import",
    from: `  Eye, EyeOff, CheckCircle2, Languages, Search, HelpCircle,`,
    to: `  Eye, EyeOff, CheckCircle2, Languages, Search,`,
  },

  // 3. Remove showShortcuts state
  {
    label: "remove showShortcuts state",
    from: `  // Q21: Keyboard shortcuts modal
  const [showShortcuts, setShowShortcuts] = React.useState(false);`,
    to: ``,
  },

  // 4. Remove "?" key handler
  {
    label: "remove ? key handler",
    from: `      else if (e.key === "?") setShowShortcuts((v) => !v);
      else if (e.key === "s") setShowSettings((v) => !v);`,
    to: `      else if (e.key === "s") setShowSettings((v) => !v);`,
  },

  // 5. Remove showShortcuts from Escape handler
  {
    label: "remove showShortcuts from Escape",
    from: `        if (showSettings) { setShowSettings(false); return; }
        if (showShortcuts) { setShowShortcuts(false); return; }
        if (showSearch) { setShowSearch(false); setInPageSearch(""); return; }`,
    to: `        if (showSettings) { setShowSettings(false); return; }
        if (showSearch) { setShowSearch(false); setInPageSearch(""); return; }`,
  },

  // 6. Remove showShortcuts from useEffect deps
  {
    label: "remove showShortcuts from deps",
    from: `  }, [currentPage, goPage, navigate, noteSheetOpen, selectedItem, showJump, showSettings, showShortcuts, showSearch, tafsirItem]);`,
    to: `  }, [currentPage, goPage, navigate, noteSheetOpen, selectedItem, showJump, showSettings, showSearch, tafsirItem]);`,
  },

  // 7. Add font controls to toolbar (after surah info div, before ت button)
  {
    label: "add font controls to toolbar",
    from: `        {/* Phase 2B: Tajweed color toggle */}
        <button
          className={\`mushaf-chrome-icon-btn\${tajweedMode ? " active" : ""}\`}
          title="تلوين التجويد"
          aria-label="تجويد"
          onClick={(e) => { e.stopPropagation(); setTajweedMode((v) => !v); }}
        >
          <span style={{ fontSize: 11, fontWeight: 700, fontFamily: "system-ui" }}>ت</span>
        </button>`,
    to: `        {/* Font scale controls in toolbar */}
        <div className="flex items-center shrink-0" onClick={(e) => e.stopPropagation()}>
          <button className="mushaf-chrome-icon-btn !p-1" title="تصغير الخط" onClick={(e) => { e.stopPropagation(); bumpFont(-0.1); }}><ZoomOut size={13} /></button>
          <span className="text-[10px] opacity-50 tabular-nums w-7 text-center select-none">{Math.round(fontScale * 100)}%</span>
          <button className="mushaf-chrome-icon-btn !p-1" title="تكبير الخط" onClick={(e) => { e.stopPropagation(); bumpFont(0.1); }}><ZoomIn size={13} /></button>
        </div>
        {/* Phase 2B: Tajweed color toggle */}
        <button
          className={\`mushaf-chrome-icon-btn\${tajweedMode ? " active" : ""}\`}
          title="تلوين التجويد"
          aria-label="تجويد"
          onClick={(e) => { e.stopPropagation(); setTajweedMode((v) => !v); }}
        >
          <span style={{ fontSize: 11, fontWeight: 700, fontFamily: "system-ui" }}>ت</span>
        </button>`,
  },

  // 8. Remove font size row from more sheet
  {
    label: "remove font size from more sheet",
    from: `            {/* ── Font size ── */}
            <div className="flex items-center justify-between py-3.5 px-1 border-b" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
              <div className="flex items-center gap-3">
                <span className="opacity-55"><ZoomIn size={16} /></span>
                <div className="text-right">
                  <div className="text-sm">حجم الخط</div>
                  <div className="text-[10px] opacity-40">{Math.round(fontScale * 100)}٪</div>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button className="mushaf-btn-secondary !px-2.5 !py-1.5" onClick={(e) => { e.stopPropagation(); bumpFont(-0.1); }}><ZoomOut size={14} /></button>
                <button className="mushaf-btn-secondary !px-2.5 !py-1.5" onClick={(e) => { e.stopPropagation(); bumpFont(0.1); }}><ZoomIn size={14} /></button>
              </div>
            </div>

            {/* ── Mark page reviewed ── */}`,
    to: `            {/* ── Mark page reviewed ── */}`,
  },

  // 9. Remove keyboard shortcuts button from more sheet
  {
    label: "remove keyboard shortcuts button from more sheet",
    from: `            {/* ── Keyboard shortcuts ── */}
            <button
              className="w-full flex items-center gap-3 py-3.5 px-1 border-b text-right transition"
              style={{ borderColor: "rgba(255,255,255,0.07)" }}
              onClick={() => { setShowShortcuts(true); setShowMoreSheet(false); }}
            >
              <span className="opacity-55"><HelpCircle size={16} /></span>
              <div>
                <div className="text-sm">اختصارات لوحة المفاتيح</div>
                <div className="text-[10px] opacity-40">عرض جميع الاختصارات المتاحة</div>
              </div>
            </button>

            {/* ── Reading plans ── */}`,
    to: `            {/* ── Reading plans ── */}`,
  },

  // 10. Remove keyboard shortcuts modal
  {
    label: "remove keyboard shortcuts modal",
    from: `      {/* ── Q21: Keyboard shortcuts modal ──────────────── */}
      {showShortcuts && (
        <>
          <div className="mushaf-overlay" onClick={() => setShowShortcuts(false)} />
          <div
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[201] w-[90vw] max-w-sm"
            style={{ background: "var(--glass-bg,rgba(18,22,30,0.95))", borderRadius: 24, border: "1px solid rgba(255,255,255,0.1)", padding: 20 }}
            onClick={(e) => e.stopPropagation()} dir="rtl"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-semibold opacity-80">اختصارات لوحة المفاتيح</span>
              <button className="mushaf-icon-close" onClick={() => setShowShortcuts(false)}><X size={14} /></button>
            </div>
            <div className="space-y-2 text-sm">
              {([
                ["←", "الصفحة التالية"],
                ["→", "الصفحة السابقة"],
                ["m", "وضع الحفظ"],
                ["t", "عرض الترجمة"],
                ["/", "بحث في الصفحة"],
                ["s", "إعدادات"],
                ["?", "هذه القائمة"],
                ["Esc", "إغلاق / رجوع"],
              ] as [string, string][]).map(([key, desc]) => (
                <div key={key} className="flex items-center justify-between gap-3 opacity-80">
                  <kbd className="px-2 py-0.5 rounded-lg bg-white/10 text-xs font-mono shrink-0">{key}</kbd>
                  <span className="text-xs flex-1 text-right">{desc}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}`,
    to: ``,
  },

  // 11. All toggle OFF colors: bg-white/10 ring-1 ring-white/20 → bg-red-500/25 ring-1 ring-red-500/30
  // (replace all 8 occurrences via global replace)
];

let patchCount = 0;
for (const p of patches) {
  if (!src.includes(p.from)) {
    console.error(`❌ PATCH NOT FOUND: ${p.label}`);
    console.error("  Expected:", JSON.stringify(p.from.substring(0, 80)));
    process.exit(1);
  }
  src = src.replace(p.from, p.to);
  patchCount++;
  console.log(`✅ ${p.label}`);
}

// 12. Global replace toggle OFF colors
const toggleOff = `"bg-white/10 ring-1 ring-white/20"`;
const toggleOffNew = `"bg-red-500/25 ring-1 ring-red-500/30"`;
const countBefore = src.split(toggleOff).length - 1;
src = src.split(toggleOff).join(toggleOffNew);
const countAfter = src.split(toggleOffNew).length - 1;
console.log(`✅ toggle OFF colors: replaced ${countBefore} → ${countAfter} instances`);

fs.writeFileSync(file, src, "utf8");
console.log(`\n✅ Done — ${patchCount + 1} patches applied to ${file}`);
