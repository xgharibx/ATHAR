/**
 * patch-mushaf.mjs
 * Applies all Phase 3A fixes to src/pages/Mushaf.tsx:
 *  1. Remove WBW translation (keep tajweed data fetch intact)
 *  2. Fix radio URLs HTTP → HTTPS
 *  3. Add showMoreSheet state + khatma store selectors
 *  4. Slim toolbar to 3 buttons
 *  5. Add more-actions sheet (search, translation, memorize, zoom, khatma mark, jump, shortcuts, plans)
 *  6. Larger/clearer settings toggles
 */

import fs from "fs";

const file = "src/pages/Mushaf.tsx";
let c = fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n");

// ─── 1. Fix radio URLs ────────────────────────────────────────────────────────
c = c
  .replace("http://stream1.mp3quran.net:8192/", "https://media.mp3quran.net/quran/radio/")
  .replace("http://Alafasy.mp3quran.net:9300/",  "https://media.mp3quran.net/alafasy/radio/")
  .replace("http://Ghamadi.mp3quran.net:9200/",  "https://media.mp3quran.net/ghamadi/radio/")
  .replace("http://Yasser.mp3quran.net:9100/",   "https://media.mp3quran.net/yasser/radio/")
  .replace("http://Maher.mp3quran.net:9100/",    "https://media.mp3quran.net/maher/radio/");
console.log("✓ radio URLs fixed");

// ─── 2. Remove wbwMode state, keep wbwData + wbwLoading ──────────────────────
const wbwModeBlock = `  const [wbwMode, setWbwModeState] = React.useState(() => prefs.mushafWbwMode ?? false);
  const setWbwMode = React.useCallback((v: boolean | ((prev: boolean) => boolean)) => {
    setWbwModeState((prev) => {
      const next = typeof v === "function" ? v(prev) : v;
      setPrefs({ mushafWbwMode: next });
      return next;
    });
  }, [setPrefs]);
  const [wbwData, setWbwData] = React.useState<Record<number, WbwSurah>>({});
  const [wbwLoading, setWbwLoading] = React.useState(false);`;

const wbwModeBlockNew = `  // Phase 2B: WBW data used by Tajweed mode
  const [wbwData, setWbwData] = React.useState<Record<number, WbwSurah>>({});
  const [wbwLoading, setWbwLoading] = React.useState(false);`;

if (!c.includes(wbwModeBlock)) throw new Error("wbwMode block not found");
c = c.replace(wbwModeBlock, wbwModeBlockNew);
console.log("✓ wbwMode state removed");

// ─── 3. Add khatma store selectors ───────────────────────────────────────────
const recordReadLine = `  const recordQuranRead = useNoorStore((s) => s.recordQuranRead);
  const lastRead = useNoorStore((s) => s.quranLastRead);`;
const recordReadLineNew = `  const recordQuranRead = useNoorStore((s) => s.recordQuranRead);
  const khatmaStartISO = useNoorStore((s) => s.khatmaStartISO);
  const setKhatmaDone = useNoorStore((s) => s.setKhatmaDone);
  const lastRead = useNoorStore((s) => s.quranLastRead);`;

if (!c.includes(recordReadLine)) throw new Error("recordQuranRead line not found");
c = c.replace(recordReadLine, recordReadLineNew);
console.log("✓ khatma store selectors added");

// ─── 4. Add showMoreSheet state ───────────────────────────────────────────────
const showSettingsState = `  // Settings sheet
  const [showSettings, setShowSettings] = React.useState(false);

  // Q11: Tafsir sheet`;
const showSettingsStateNew = `  // Settings sheet
  const [showSettings, setShowSettings] = React.useState(false);
  // More actions sheet
  const [showMoreSheet, setShowMoreSheet] = React.useState(false);

  // Q11: Tafsir sheet`;

if (!c.includes(showSettingsState)) throw new Error("showSettings state block not found");
c = c.replace(showSettingsState, showSettingsStateNew);
console.log("✓ showMoreSheet state added");

// ─── 5. Fix wbwData fetch condition ──────────────────────────────────────────
const fetchConditionOld = "    if (!wbwMode && !tajweedMode) return;";
const fetchConditionNew = "    if (!tajweedMode) return;";

if (!c.includes(fetchConditionOld)) throw new Error("wbw fetch condition not found");
c = c.replace(fetchConditionOld, fetchConditionNew);
console.log("✓ wbw fetch condition fixed");

// ─── 6. Fix wbwVerse computation ─────────────────────────────────────────────
const wbwVerseOld = `                    // Phase 2A/2B: Word-by-word data (needed for both WBW and Tajweed modes)
                    const wbwVerse = (wbwMode || tajweedMode) ? (wbwData[item.surahId]?.[item.originalAyah] ?? null) : null;`;
const wbwVerseNew = `                    // Phase 2B: Word-by-word data for Tajweed mode
                    const wbwVerse = tajweedMode ? (wbwData[item.surahId]?.[item.originalAyah] ?? null) : null;`;

if (!c.includes(wbwVerseOld)) throw new Error("wbwVerse computation not found");
c = c.replace(wbwVerseOld, wbwVerseNew);
console.log("✓ wbwVerse computation fixed");

// ─── 7. Fix ayah rendering — remove WBW ruby branch ──────────────────────────
const renderOld = `                        {/* Phase 2A/2B: Word-by-word ruby tags (with optional tajweed colors) OR plain/tajweed text */}
                        {wbwVerse && wbwMode ? (
                          // WBW + optional Tajweed: ruby annotations
                          wbwVerse.map((word, wi) => (
                            <ruby key={wi} className="mushaf-wbw-ruby">
                              {tajweedMode ? renderTajweed(word.tj) : word.ar}
                              <rt className="mushaf-wbw-rt">{word.tr}</rt>
                            </ruby>
                          ))
                        ) : wbwVerse && tajweedMode ? (
                          // Tajweed-only: colored words, no ruby annotations
                          wbwVerse.map((word, wi) => (
                            <React.Fragment key={wi}>{renderTajweed(word.tj)}{" "}</React.Fragment>
                          ))
                        ) : (
                          item.text
                        )}
                        {(wbwMode || tajweedMode) && wbwLoading && !wbwVerse ? (
                          <span className="mushaf-wbw-loading">⋯</span>
                        ) : null}`;
const renderNew = `                        {/* Phase 2B: Tajweed coloring OR plain text */}
                        {wbwVerse && tajweedMode ? (
                          wbwVerse.map((word, wi) => (
                            <React.Fragment key={wi}>{renderTajweed(word.tj)}{" "}</React.Fragment>
                          ))
                        ) : (
                          item.text
                        )}
                        {tajweedMode && wbwLoading && !wbwVerse ? (
                          <span className="mushaf-wbw-loading">⋯</span>
                        ) : null}`;

if (!c.includes(renderOld)) throw new Error("ayah render block not found");
c = c.replace(renderOld, renderNew);
console.log("✓ ayah rendering simplified");

// ─── 8. Remove WBW toolbar button ────────────────────────────────────────────
const wbwToolbarBtn = `        {/* Phase 2A: Word-by-word toggle */}
        <button
          className={\`mushaf-chrome-icon-btn\${wbwMode ? " active" : ""}\`}
          title="ترجمة كلمة بكلمة"
          aria-label="كلمة بكلمة"
          onClick={(e) => { e.stopPropagation(); setWbwMode((v) => !v); }}
        >
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "-0.5px", fontFamily: "system-ui" }}>W</span>
        </button>
        {/* Phase 2B: Tajweed color toggle */}`;
const wbwToolbarBtnNew = `        {/* Phase 2B: Tajweed color toggle */}`;

if (!c.includes(wbwToolbarBtn)) throw new Error("WBW toolbar button not found");
c = c.replace(wbwToolbarBtn, wbwToolbarBtnNew);
console.log("✓ WBW toolbar button removed");

// ─── 9. Remove Search, Translation, Memorize, Review, Zoom, Shortcuts from toolbar
//       Replace with just: Tajweed | Settings | More
const toolbarBefore = `        {/* Q17: In-page search */}
        <button
          className={\`mushaf-chrome-icon-btn\${showSearch ? " active" : ""}\`}
          title="بحث في الصفحة"
          aria-label="بحث"
          onClick={(e) => { e.stopPropagation(); setShowSearch((v) => !v); if (showSearch) setInPageSearch(""); }}
        >
          <Search size={16} />
        </button>
        {/* Q3: Translation toggle */}
        <button
          className={\`mushaf-chrome-icon-btn\${showTranslation ? " active" : ""}\`}
          title="الترجمة الإنجليزية"
          aria-label="ترجمة"
          onClick={(e) => { e.stopPropagation(); setShowTranslation((v) => !v); }}
        >
          <Languages size={16} />
        </button>
        {/* Phase 2B: Tajweed color toggle */}
        <button
          className={\`mushaf-chrome-icon-btn\${tajweedMode ? " active" : ""}\`}
          title="تلوين التجويد"
          aria-label="تجويد"
          onClick={(e) => { e.stopPropagation(); setTajweedMode((v) => !v); }}
        >
          <span style={{ fontSize: 10, fontWeight: 700, fontFamily: "system-ui" }}>ت</span>
        </button>
        <button
          className={\`mushaf-chrome-icon-btn\${memorizationMode ? " active" : ""}\`}
          title={memorizationMode ? "إيقاف وضع الحفظ" : "وضع الحفظ"}
          aria-label={memorizationMode ? "إظهار النص" : "وضع الحفظ"}
          onClick={(e) => { e.stopPropagation(); setMemorizationMode((value) => { if (value) setRevealedItems(new Set()); return !value; }); flashChrome(); }}
        >
          {memorizationMode ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
        <button
          className="mushaf-chrome-icon-btn"
          title="حفظ مراجعة الصفحة"
          aria-label="حفظ مراجعة الصفحة"
          onClick={(e) => { e.stopPropagation(); markPageReviewed(); }}
        >
          <CheckCircle2 size={17} />
        </button>
        <button
          className="mushaf-chrome-icon-btn"
          title="تصغير الخط"
          aria-label="تصغير"
          onClick={(e) => { e.stopPropagation(); bumpFont(-0.1); }}
        >
          <ZoomOut size={16} />
        </button>
        <button
          className="mushaf-chrome-icon-btn"
          title="تكبير الخط"
          aria-label="تكبير"
          onClick={(e) => { e.stopPropagation(); bumpFont(0.1); }}
        >
          <ZoomIn size={16} />
        </button>
        {/* Settings */}
        <button
          className={\`mushaf-chrome-icon-btn\${showSettings ? " active" : ""}\`}
          title="إعدادات"
          aria-label="إعدادات"
          onClick={(e) => { e.stopPropagation(); setShowSettings((v) => !v); }}
        >
          <Settings size={16} />
        </button>
        {/* Q21: Shortcuts */}
        <button
          className="mushaf-chrome-icon-btn"
          title="اختصارات (?)"
          aria-label="اختصارات"
          onClick={(e) => { e.stopPropagation(); setShowShortcuts((v) => !v); }}
        >
          <HelpCircle size={16} />
        </button>
        <button
          className="mushaf-chrome-icon-btn"
          title="انتقال للصفحة"
          aria-label="انتقال"
          onClick={(e) => { e.stopPropagation(); setShowJump(true); }}
        >
          <MoreVertical size={17} />
        </button>`;

const toolbarAfter = `        {/* Phase 2B: Tajweed color toggle */}
        <button
          className={\`mushaf-chrome-icon-btn\${tajweedMode ? " active" : ""}\`}
          title="تلوين التجويد"
          aria-label="تجويد"
          onClick={(e) => { e.stopPropagation(); setTajweedMode((v) => !v); }}
        >
          <span style={{ fontSize: 11, fontWeight: 700, fontFamily: "system-ui" }}>ت</span>
        </button>
        {/* Settings */}
        <button
          className={\`mushaf-chrome-icon-btn\${showSettings ? " active" : ""}\`}
          title="إعدادات"
          aria-label="إعدادات"
          onClick={(e) => { e.stopPropagation(); setShowSettings((v) => !v); }}
        >
          <Settings size={16} />
        </button>
        {/* More actions */}
        <button
          className={\`mushaf-chrome-icon-btn\${showMoreSheet ? " active" : ""}\`}
          title="المزيد"
          aria-label="المزيد"
          onClick={(e) => { e.stopPropagation(); setShowMoreSheet((v) => !v); }}
        >
          <MoreVertical size={17} />
        </button>`;

if (!c.includes(toolbarBefore)) throw new Error("toolbar block not found");
c = c.replace(toolbarBefore, toolbarAfter);
console.log("✓ toolbar slimmed to 3 buttons");

// ─── 10. Remove WBW settings row ─────────────────────────────────────────────
const wbwSettingsRow = `            {/* Phase 2A: Word-by-word translation */}
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-xs opacity-65">ترجمة كلمة بكلمة</div>
                <div className="text-[10px] opacity-40">ترجمة فورية لكل كلمة</div>
              </div>
              <button
                onClick={() => setWbwMode((v) => !v)}
                className={\`relative w-10 h-5 rounded-full transition \${wbwMode ? "bg-[var(--accent)]" : "bg-white/20"}\`}
                role="switch" aria-checked={wbwMode}
              >
                <span className={\`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all \${wbwMode ? "right-0.5" : "right-5"}\`} />
              </button>
            </div>

            {/* Phase 2B: Tajweed color coding */}`;
const wbwSettingsRowNew = `            {/* Phase 2B: Tajweed color coding */}`;

if (!c.includes(wbwSettingsRow)) throw new Error("WBW settings row not found");
c = c.replace(wbwSettingsRow, wbwSettingsRowNew);
console.log("✓ WBW settings row removed");

// ─── 11. Upgrade ALL settings toggles to w-12 h-6 ────────────────────────────
// Pattern: relative w-10 h-5 (main settings) → w-12 h-6
// Pattern: relative w-9 h-5 (sub-toggles) → w-12 h-6
// Knob: top-0.5 → top-1; right-0.5 → right-1; right-5/right-4.5 → right-7
// OFF track: bg-white/20 or bg-white/15 → bg-white/10 ring-1 ring-white/20

// Upgrade main toggles (w-10 h-5)
// Translation
c = c.replace(
  `onClick={() => setShowTranslation((v) => !v)}
                className={\`relative w-10 h-5 rounded-full transition \${showTranslation ? "bg-[var(--accent)]" : "bg-white/20"}\`}
                role="switch" aria-checked={showTranslation}
              >
                <span className={\`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all \${showTranslation ? "right-0.5" : "right-5"}\`} />`,
  `onClick={() => setShowTranslation((v) => !v)}
                className={\`relative w-12 h-6 rounded-full transition-colors \${showTranslation ? "bg-[var(--accent)]" : "bg-white/10 ring-1 ring-white/20"}\`}
                role="switch" aria-checked={showTranslation}
              >
                <span className={\`absolute top-1 h-4 w-4 rounded-full bg-white shadow-md transition-all \${showTranslation ? "right-1" : "right-7"}\`} />`
);
// Tajweed in settings
c = c.replace(
  `onClick={() => setTajweedMode((v) => !v)}
                className={\`relative w-10 h-5 rounded-full transition \${tajweedMode ? "bg-[var(--accent)]" : "bg-white/20"}\`}
                role="switch" aria-checked={tajweedMode}
              >
                <span className={\`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all \${tajweedMode ? "right-0.5" : "right-5"}\`} />`,
  `onClick={() => setTajweedMode((v) => !v)}
                className={\`relative w-12 h-6 rounded-full transition-colors \${tajweedMode ? "bg-[var(--accent)]" : "bg-white/10 ring-1 ring-white/20"}\`}
                role="switch" aria-checked={tajweedMode}
              >
                <span className={\`absolute top-1 h-4 w-4 rounded-full bg-white shadow-md transition-all \${tajweedMode ? "right-1" : "right-7"}\`} />`
);
// Inline Tafseer
c = c.replace(
  `onClick={() => setInlineTafseer((v) => !v)}
                  className={\`relative w-10 h-5 rounded-full transition \${inlineTafseer ? "bg-[var(--accent)]" : "bg-white/20"}\`}
                  role="switch" aria-checked={inlineTafseer}
                >
                  <span className={\`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all \${inlineTafseer ? "right-0.5" : "right-5"}\`} />`,
  `onClick={() => setInlineTafseer((v) => !v)}
                  className={\`relative w-12 h-6 rounded-full transition-colors \${inlineTafseer ? "bg-[var(--accent)]" : "bg-white/10 ring-1 ring-white/20"}\`}
                  role="switch" aria-checked={inlineTafseer}
                >
                  <span className={\`absolute top-1 h-4 w-4 rounded-full bg-white shadow-md transition-all \${inlineTafseer ? "right-1" : "right-7"}\`} />`
);
// Loop toggle (w-9)
c = c.replace(
  `onClick={() => setLoopEnabled((v) => !v)}
                  className={\`relative w-9 h-5 rounded-full transition \${loopEnabled ? "bg-[var(--accent)]" : "bg-white/15"}\`}
                  role="switch" aria-checked={loopEnabled}
                >
                  <span className={\`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all \${loopEnabled ? "right-0.5" : "right-4.5"}\`} />`,
  `onClick={() => setLoopEnabled((v) => !v)}
                  className={\`relative w-12 h-6 rounded-full transition-colors \${loopEnabled ? "bg-[var(--accent)]" : "bg-white/10 ring-1 ring-white/20"}\`}
                  role="switch" aria-checked={loopEnabled}
                >
                  <span className={\`absolute top-1 h-4 w-4 rounded-full bg-white shadow-md transition-all \${loopEnabled ? "right-1" : "right-7"}\`} />`
);
// Auto-advance toggle (w-9)
c = c.replace(
  `onClick={() => setAutoAdvance((v) => !v)}
                className={\`relative w-9 h-5 rounded-full transition \${autoAdvance ? "bg-[var(--accent)]" : "bg-white/15"}\`}
                role="switch" aria-checked={autoAdvance}
              >
                <span className={\`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all \${autoAdvance ? "right-0.5" : "right-4.5"}\`} />`,
  `onClick={() => setAutoAdvance((v) => !v)}
                className={\`relative w-12 h-6 rounded-full transition-colors \${autoAdvance ? "bg-[var(--accent)]" : "bg-white/10 ring-1 ring-white/20"}\`}
                role="switch" aria-checked={autoAdvance}
              >
                <span className={\`absolute top-1 h-4 w-4 rounded-full bg-white shadow-md transition-all \${autoAdvance ? "right-1" : "right-7"}\`} />`
);
// Range loop toggle (w-9) — has complex onClick
c = c.replace(
  `className={\`relative w-9 h-5 rounded-full transition \${loopRange ? "bg-[var(--accent)]" : "bg-white/15"}\`}
                    role="switch" aria-checked={loopRange}
                  >
                    <span className={\`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all \${loopRange ? "right-0.5" : "right-4.5"}\`} />`,
  `className={\`relative w-12 h-6 rounded-full transition-colors \${loopRange ? "bg-[var(--accent)]" : "bg-white/10 ring-1 ring-white/20"}\`}
                    role="switch" aria-checked={loopRange}
                  >
                    <span className={\`absolute top-1 h-4 w-4 rounded-full bg-white shadow-md transition-all \${loopRange ? "right-1" : "right-7"}\`} />`
);
// EQ toggle (w-9)
c = c.replace(
  `onClick={() => setEqEnabled((v) => !v)}
                  className={\`relative w-9 h-5 rounded-full transition \${eqEnabled ? "bg-[var(--accent)]" : "bg-white/15"}\`}
                  role="switch" aria-checked={eqEnabled}
                >
                  <span className={\`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all \${eqEnabled ? "right-0.5" : "right-4.5"}\`} />`,
  `onClick={() => setEqEnabled((v) => !v)}
                  className={\`relative w-12 h-6 rounded-full transition-colors \${eqEnabled ? "bg-[var(--accent)]" : "bg-white/10 ring-1 ring-white/20"}\`}
                  role="switch" aria-checked={eqEnabled}
                >
                  <span className={\`absolute top-1 h-4 w-4 rounded-full bg-white shadow-md transition-all \${eqEnabled ? "right-1" : "right-7"}\`} />`
);
console.log("✓ all settings toggles upgraded to w-12 h-6");

// ─── 12. Add more-actions sheet before keyboard shortcuts modal ───────────────
const shortcutsModal = `      {/* ── Q21: Keyboard shortcuts modal ──────────────── */}
      {showShortcuts && (`;

const moreSheetJSX = `      {/* ── More actions sheet ──────────────────────────── */}
      {showMoreSheet && (
        <>
          <div className="mushaf-overlay" onClick={() => setShowMoreSheet(false)} />
          <div className="mushaf-jump-sheet" style={{ maxHeight: "80vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()} dir="rtl">
            <div className="mushaf-sheet-handle" />
            <div className="flex items-center justify-between mb-4">
              <span className="mushaf-sheet-title">الإجراءات السريعة</span>
              <button className="mushaf-icon-close" onClick={() => setShowMoreSheet(false)}><X size={16} /></button>
            </div>

            {/* ── سجّل ورد اليوم — only when khatma plan active ── */}
            {khatmaStartISO && (
              <button
                className="w-full flex items-center gap-3 rounded-2xl p-3.5 mb-4 text-right transition active:scale-[0.98]"
                style={{ background: "color-mix(in srgb, var(--accent) 14%, transparent)", border: "1px solid color-mix(in srgb, var(--accent) 35%, transparent)" }}
                onClick={() => {
                  const d = new Date();
                  const iso = \`\${d.getFullYear()}-\${String(d.getMonth()+1).padStart(2,"0")}-\${String(d.getDate()).padStart(2,"0")}\`;
                  setKhatmaDone(iso, true);
                  recordQuranRead(playableItems.length);
                  setShowMoreSheet(false);
                  toast.success("✓ سُجِّل ورد اليوم 🌟");
                }}
              >
                <span className="text-2xl">📅</span>
                <div className="flex-1">
                  <div className="text-sm font-semibold" style={{ color: "var(--accent)" }}>سجّل ورد اليوم</div>
                  <div className="text-[11px] opacity-55">تحديد اليوم كمكتمل في خطة الختمة</div>
                </div>
              </button>
            )}

            {/* ── Toggle rows ── */}
            {([
              { label: "بحث في الصفحة", sub: "ابحث داخل آيات الصفحة الحالية", icon: <Search size={16} />, active: showSearch,
                onPress: () => { setShowSearch((v) => !v); if (showSearch) setInPageSearch(""); setShowMoreSheet(false); } },
              { label: "الترجمة الإنجليزية", sub: "ترجمة Sahih International", icon: <Languages size={16} />, active: showTranslation,
                onPress: () => { setShowTranslation((v) => !v); setShowMoreSheet(false); } },
              { label: memorizationMode ? "إيقاف وضع الحفظ" : "وضع الحفظ", sub: "اختبر حفظك آية بآية", icon: memorizationMode ? <EyeOff size={16} /> : <Eye size={16} />, active: memorizationMode,
                onPress: () => { setMemorizationMode((v) => { if (v) setRevealedItems(new Set()); return !v; }); flashChrome(); setShowMoreSheet(false); } },
            ] as Array<{ label: string; sub: string; icon: React.ReactNode; active: boolean; onPress: () => void }>).map(({ label, sub, icon, active, onPress }) => (
              <button
                key={label}
                className="w-full flex items-center justify-between gap-3 py-3.5 px-1 border-b transition"
                style={{ borderColor: "rgba(255,255,255,0.07)" }}
                onClick={onPress}
              >
                <div className="flex items-center gap-3">
                  <span className="opacity-55">{icon}</span>
                  <div className="text-right">
                    <div className="text-sm">{label}</div>
                    <div className="text-[10px] opacity-40">{sub}</div>
                  </div>
                </div>
                <div className={\`relative w-12 h-6 rounded-full transition-colors shrink-0 \${active ? "bg-[var(--accent)]" : "bg-white/10 ring-1 ring-white/20"}\`}>
                  <span className={\`absolute top-1 h-4 w-4 rounded-full bg-white shadow-md transition-all \${active ? "right-1" : "right-7"}\`} />
                </div>
              </button>
            ))}

            {/* ── Font size ── */}
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

            {/* ── Mark page reviewed ── */}
            <button
              className="w-full flex items-center gap-3 py-3.5 px-1 border-b text-right transition"
              style={{ borderColor: "rgba(255,255,255,0.07)" }}
              onClick={() => { markPageReviewed(); setShowMoreSheet(false); }}
            >
              <span className="opacity-55"><CheckCircle2 size={16} /></span>
              <div>
                <div className="text-sm">حفظ مراجعة الصفحة</div>
                <div className="text-[10px] opacity-40">تسجيل قراءة جميع آيات هذه الصفحة</div>
              </div>
            </button>

            {/* ── Jump to page ── */}
            <button
              className="w-full flex items-center gap-3 py-3.5 px-1 border-b text-right transition"
              style={{ borderColor: "rgba(255,255,255,0.07)" }}
              onClick={() => { setShowJump(true); setShowMoreSheet(false); }}
            >
              <span className="opacity-55"><MoreVertical size={16} /></span>
              <div>
                <div className="text-sm">الانتقال إلى صفحة</div>
                <div className="text-[10px] opacity-40">الصفحة {currentPage} من {totalPages}</div>
              </div>
            </button>

            {/* ── Keyboard shortcuts ── */}
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

            {/* ── Reading plans ── */}
            <button
              className="w-full flex items-center gap-3 py-3.5 px-1 text-right transition"
              onClick={() => { setShowMoreSheet(false); navigate("/quran/plans"); }}
            >
              <span className="opacity-55 text-lg">📅</span>
              <div>
                <div className="text-sm">خطط التلاوة</div>
                <div className="text-[10px] opacity-40">إدارة ورد الختمة والمراجعة اليومية</div>
              </div>
            </button>
          </div>
        </>
      )}

      {/* ── Q21: Keyboard shortcuts modal ──────────────── */}
      {showShortcuts && (`;

if (!c.includes(shortcutsModal)) throw new Error("shortcuts modal anchor not found");
c = c.replace(shortcutsModal, moreSheetJSX);
console.log("✓ more-actions sheet added");

// ─── Write back ───────────────────────────────────────────────────────────────
fs.writeFileSync(file, c, "utf8");
console.log("\n✅ All patches applied successfully!");

// ─── Verify key changes ───────────────────────────────────────────────────────
const result = fs.readFileSync(file, "utf8");
const checks = [
  ["HTTPS radio", "media.mp3quran.net"],
  ["wbwMode removed", !result.includes("setWbwMode")],
  ["khatmaDone selector", "setKhatmaDone"],
  ["showMoreSheet", "showMoreSheet"],
  ["toolbar slimmed", !result.includes("mushaf-chrome-icon-btn${showSearch")],
  ["more sheet", "الإجراءات السريعة"],
  ["w-12 h-6 toggle", "w-12 h-6"],
];
let allOk = true;
for (const [name, check] of checks) {
  const ok = typeof check === "boolean" ? check : result.includes(check);
  console.log(`  ${ok ? "✓" : "✗"} ${name}`);
  if (!ok) allOk = false;
}
process.exit(allOk ? 0 : 1);
