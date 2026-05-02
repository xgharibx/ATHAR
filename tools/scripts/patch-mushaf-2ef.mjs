/**
 * patch-mushaf-2ef.mjs
 * Phase 2E — Per-Ayah Reflections (تدبّر)
 * Phase 2F — Reading Timer + Page Scrubber Strip
 */
import fs from "fs";

const mushafPath = "src/pages/Mushaf.tsx";
const cssPath = "src/styles/globals.css";

let mushaf = fs.readFileSync(mushafPath, "utf8").replace(/\r\n/g, "\n");
let css = fs.readFileSync(cssPath, "utf8").replace(/\r\n/g, "\n");

function replace(src, label, oldStr, newStr) {
  if (!src.includes(oldStr)) throw new Error(`❌ Cannot find anchor for: ${label}`);
  if ((src.split(oldStr).length - 1) > 1) throw new Error(`❌ Multiple matches for: ${label}`);
  return src.replace(oldStr, newStr);
}

/* ═══════════════════════════════════════════════════
   A. Add Phase 2F state refs after note sheet state
   ══════════════════════════════════════════════════ */
mushaf = replace(mushaf, "A: Phase 2F state refs",
  `  // Note sheet
  const [noteSheetOpen, setNoteSheetOpen] = React.useState(false);
  const [noteDraft, setNoteDraft] = React.useState("");`,
  `  // Note sheet
  const [noteSheetOpen, setNoteSheetOpen] = React.useState(false);
  const [noteDraft, setNoteDraft] = React.useState("");

  // Phase 2F: Reading timer
  const sessionStartRef = React.useRef(Date.now());
  const pagesReadRef = React.useRef(new Set<number>());
  const [showSessionSummary, setShowSessionSummary] = React.useState(false);
  const [sessionDurationMin, setSessionDurationMin] = React.useState(0);

  // Phase 2F: Page scrubber strip
  const pageStripRef = React.useRef<HTMLDivElement>(null);`
);

/* ═══════════════════════════════════════════════════
   B. Add page-tracking & strip auto-scroll effects
      Insert after the note-sheet useEffect
   ══════════════════════════════════════════════════ */
mushaf = replace(mushaf, "B: page-tracking effects",
  `  }, [notes, selectedItem]);

  // Audio refs & state`,
  `  }, [notes, selectedItem]);

  // Phase 2F: Track pages visited in this session
  React.useEffect(() => {
    pagesReadRef.current.add(currentPage);
  }, [currentPage]);

  // Phase 2F: Auto-scroll page strip to keep current page centred
  React.useEffect(() => {
    if (!pageStripRef.current) return;
    const chip = pageStripRef.current.querySelector<HTMLElement>(\`[data-page="\${currentPage}"]\`);
    if (chip) chip.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [currentPage]);

  // Audio refs & state`
);

/* ═══════════════════════════════════════════════════
   C. Add handleBack callback (before JSX return)
      Anchor on the existing "M4: Pinch-to-zoom refs" block
   ══════════════════════════════════════════════════ */
mushaf = replace(mushaf, "C: handleBack callback",
  `  // M4: Pinch-to-zoom refs
  const pinchStartDist = React.useRef<number | null>(null);
  const pinchStartScale = React.useRef<number>(0.88);`,
  `  // M4: Pinch-to-zoom refs
  const pinchStartDist = React.useRef<number | null>(null);
  const pinchStartScale = React.useRef<number>(0.88);

  // Phase 2F: Back with session summary
  const handleBack = React.useCallback(() => {
    const elapsed = Math.round((Date.now() - sessionStartRef.current) / 60000);
    if (elapsed >= 1) {
      setSessionDurationMin(elapsed);
      setShowSessionSummary(true);
    } else {
      navigate("/quran");
    }
  }, [navigate]);`
);

/* ═══════════════════════════════════════════════════
   D. Intercept back button click with handleBack
   ══════════════════════════════════════════════════ */
mushaf = replace(mushaf, "D: back button intercept",
  `          onClick={(e) => { e.stopPropagation(); navigate("/quran"); }}
          aria-label="رجوع إلى القرآن"`,
  `          onClick={(e) => { e.stopPropagation(); handleBack(); }}
          aria-label="رجوع إلى القرآن"`
);

/* ═══════════════════════════════════════════════════
   E. Rename "ملاحظة" → "تدبّر" + prefill on click
   ══════════════════════════════════════════════════ */
mushaf = replace(mushaf, "E: rename ملاحظة → تدبّر",
  `          <button
            className={\`mushaf-action-btn\${notes[selKey] ? " active" : ""}\`}
            onClick={(e) => { e.stopPropagation(); setNoteSheetOpen(true); }}
            title="ملاحظة"
          >
            <Pencil size={18} />
            <span>ملاحظة</span>
          </button>`,
  `          <button
            className={\`mushaf-action-btn\${notes[selKey] ? " active" : ""}\`}
            onClick={(e) => {
              e.stopPropagation();
              if (!notes[selKey]) {
                setNoteDraft(\`\${selectedItem.surahName} ﴿\${toArabicNumeral(selectedItem.displayAyah)}﴾\\n\\n\`);
              }
              setNoteSheetOpen(true);
            }}
            title="تدبّر"
          >
            <Pencil size={18} />
            <span>تدبّر</span>
          </button>`
);

/* ═══════════════════════════════════════════════════
   F. Upgrade note sheet to full تدبّر reflection sheet
   ══════════════════════════════════════════════════ */
mushaf = replace(mushaf, "F: upgrade note sheet",
  `      {/* ── Note sheet ────────────────────────────────────── */}
      {noteSheetOpen && selectedItem && (
        <>
          <div className="mushaf-overlay" onClick={() => setNoteSheetOpen(false)} />
          <div className="mushaf-note-sheet" onClick={(e) => e.stopPropagation()} dir="rtl">
            <div className="mushaf-sheet-handle" />
            <div className="flex items-center justify-between mb-3">
              <span className="mushaf-sheet-title">
                ملاحظة للآية ﴿{toArabicNumeral(selectedItem.displayAyah)}﴾
              </span>
              <button
                className="mushaf-icon-close"
                onClick={() => setNoteSheetOpen(false)}
                aria-label="إغلاق"
              >
                <X size={16} />
              </button>
            </div>
            <textarea
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              placeholder="اكتب ملاحظة…"
              rows={5}
              autoFocus
              className="mushaf-textarea"
            />
            <div className="flex items-center justify-between mt-1 mb-2 px-1">
              <span className="text-[10px] opacity-30">{noteDraft.length} حرف</span>
            </div>
            <div className="flex gap-2 mt-1">
              <button
                className="mushaf-btn-primary flex-1"
                onClick={() => {
                  const clean = noteDraft.trim();
                  if (clean) { setQuranNote(selectedItem.surahId, selectedItem.displayAyah, clean); toast.success("تم الحفظ"); }
                  else clearQuranNote(selectedItem.surahId, selectedItem.displayAyah);
                  setNoteSheetOpen(false);
                }}
              >
                حفظ
              </button>
              {notes[selKey] && (
                <button
                  className="mushaf-btn-secondary"
                  onClick={() => {
                    clearQuranNote(selectedItem.surahId, selectedItem.displayAyah);
                    setNoteDraft("");
                    setNoteSheetOpen(false);
                    toast.success("تم الحذف");
                  }}
                >
                  حذف
                </button>
              )}
            </div>
          </div>
        </>
      )}`,
  `      {/* ── تدبّر (Reflection) sheet ──────────────────────── */}
      {noteSheetOpen && selectedItem && (
        <>
          <div className="mushaf-overlay" onClick={() => setNoteSheetOpen(false)} />
          <div className="mushaf-note-sheet" onClick={(e) => e.stopPropagation()} dir="rtl">
            <div className="mushaf-sheet-handle" />
            <div className="flex items-center justify-between mb-3">
              <span className="mushaf-sheet-title">
                تدبّر · {selectedItem.surahName} ﴿{toArabicNumeral(selectedItem.displayAyah)}﴾
              </span>
              <button
                className="mushaf-icon-close"
                onClick={() => setNoteSheetOpen(false)}
                aria-label="إغلاق"
              >
                <X size={16} />
              </button>
            </div>
            {/* Quoted ayah text */}
            <div className="mushaf-tadabbur-quote" dir="rtl">{selectedItem.text}</div>
            <textarea
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              placeholder="اكتب تدبّرك في هذه الآية…"
              rows={4}
              autoFocus
              className="mushaf-textarea mt-2"
            />
            <div className="flex items-center justify-between mt-1 mb-2 px-1">
              <span className="text-[10px] opacity-30">{noteDraft.length} حرف</span>
            </div>
            <div className="flex gap-2 mt-1">
              <button
                className="mushaf-btn-primary flex-1"
                onClick={() => {
                  const clean = noteDraft.trim();
                  if (clean) { setQuranNote(selectedItem.surahId, selectedItem.displayAyah, clean); toast.success("تم الحفظ ✓"); }
                  else clearQuranNote(selectedItem.surahId, selectedItem.displayAyah);
                  setNoteSheetOpen(false);
                }}
              >
                حفظ
              </button>
              <button
                className="mushaf-btn-secondary"
                title="مشاركة التدبّر"
                onClick={async () => {
                  const reflection = noteDraft.trim();
                  if (!reflection) { toast.error("اكتب تدبّرك أولاً"); return; }
                  try {
                    const blob = await renderDhikrPosterBlob({
                      text: reflection,
                      subtitle: \`\${selectedItem.surahName} · آية \${toArabicNumeral(selectedItem.displayAyah)}\`,
                      footerAppName: "أثر • ATHAR",
                      footerUrl: "athar.app",
                    });
                    const fname = \`tadabbur-\${selectedItem.surahId}-\${selectedItem.displayAyah}.png\`;
                    const file = new File([blob], fname, { type: "image/png" });
                    if (navigator.share && navigator.canShare?.({ files: [file] })) {
                      await navigator.share({ files: [file] });
                    } else {
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a"); a.href = url; a.download = fname; a.click();
                      setTimeout(() => URL.revokeObjectURL(url), 5000);
                    }
                  } catch { toast.error("تعذرت المشاركة"); }
                }}
              >
                <Share2 size={15} />
              </button>
              {notes[selKey] && (
                <button
                  className="mushaf-btn-secondary"
                  onClick={() => {
                    clearQuranNote(selectedItem.surahId, selectedItem.displayAyah);
                    setNoteDraft("");
                    setNoteSheetOpen(false);
                    toast.success("تم الحذف");
                  }}
                >
                  حذف
                </button>
              )}
            </div>
          </div>
        </>
      )}`
);

/* ═══════════════════════════════════════════════════
   G. Add page scrubber strip before audio bar
   ══════════════════════════════════════════════════ */
mushaf = replace(mushaf, "G: page scrubber strip",
  `      {/* ── Audio player bar ──────────────────────────────── */}`,
  `      {/* ── Page scrubber strip (Phase 2F) ─────────────────── */}
      <div className="mushaf-page-strip" ref={pageStripRef} onClick={(e) => e.stopPropagation()}>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
          <button
            key={p}
            data-page={p}
            className={\`mushaf-page-chip\${p === currentPage ? " active" : ""}\`}
            onClick={(e) => { e.stopPropagation(); goPage(p); }}
          >
            {p}
          </button>
        ))}
      </div>

      {/* ── Audio player bar ──────────────────────────────── */}`
);

/* ═══════════════════════════════════════════════════
   H. Add session summary overlay before closing div
   ══════════════════════════════════════════════════ */
// Change H: use unique anchor — the Reading plans button text + closing JSX
mushaf = replace(mushaf, "H: session summary overlay",
  `                <div className="text-sm">خطط التلاوة</div>
                <div className="text-[10px] opacity-40">إدارة ورد الختمة والمراجعة اليومية</div>
              </div>
            </button>
          </div>
        </>
      )}


    </div>
  );
}`,
  `                <div className="text-sm">خطط التلاوة</div>
                <div className="text-[10px] opacity-40">إدارة ورد الختمة والمراجعة اليومية</div>
              </div>
            </button>
          </div>
        </>
      )}

      {/* ── Session summary (Phase 2F) ───────────────────── */}
      {showSessionSummary && (
        <>
          <div
            className="mushaf-overlay"
            style={{ zIndex: 249 }}
            onClick={() => { setShowSessionSummary(false); navigate("/quran"); }}
          />
          <div className="mushaf-session-card" dir="rtl">
            <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>📖</div>
            <div style={{ fontWeight: 700, fontSize: "1.1rem", marginBottom: "0.3rem" }}>جلسة قراءة</div>
            <div style={{ fontSize: "0.85rem", opacity: 0.65, marginBottom: "1.25rem" }}>
              {toArabicNumeral(sessionDurationMin)} دقيقة · {toArabicNumeral(pagesReadRef.current.size)} صفحة
            </div>
            <button
              className="mushaf-btn-primary"
              style={{ width: "100%" }}
              onClick={() => { setShowSessionSummary(false); navigate("/quran"); }}
            >
              حسناً
            </button>
          </div>
        </>
      )}

    </div>
  );
}`
);

fs.writeFileSync(mushafPath, mushaf, "utf8");
console.log("✅ Mushaf.tsx patched");

/* ═══════════════════════════════════════════════════
   CSS: Add tadabbur quote, page strip, session card
   ══════════════════════════════════════════════════ */
css = replace(css, "CSS: new blocks",
  `.mushaf-icon-close {
  background: none;
  border: none;
  color: #1a1208;`,
  `/* ── Tadabbur (reflection) ayah quote ───────────── */
.mushaf-tadabbur-quote {
  background: rgba(47, 79, 55, 0.06);
  border-right: 3px solid #2F4F37;
  border-radius: 0 10px 10px 0;
  padding: 0.55rem 0.85rem 0.55rem 0.6rem;
  font-size: 1.05rem;
  line-height: 2.1;
  color: #1a1208;
  direction: rtl;
  max-height: 110px;
  overflow-y: auto;
  margin-bottom: 0.25rem;
  scrollbar-width: none;
}
.mushaf-tadabbur-quote::-webkit-scrollbar { display: none; }

/* ── Page scrubber strip ─────────────────────────── */
.mushaf-page-strip {
  position: fixed;
  bottom: 0;
  inset-inline: 0;
  z-index: 145;
  height: 40px;
  display: flex;
  align-items: center;
  overflow-x: auto;
  overflow-y: hidden;
  gap: 3px;
  padding: 0 8px;
  background: rgba(255, 251, 240, 0.97);
  backdrop-filter: blur(8px);
  border-top: 1px solid rgba(201, 162, 39, 0.15);
  scrollbar-width: none;
}
.mushaf-page-strip::-webkit-scrollbar { display: none; }

.mushaf-page-chip {
  flex-shrink: 0;
  width: 30px;
  height: 26px;
  border-radius: 6px;
  font-size: 0.6rem;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(47, 79, 55, 0.06);
  color: rgba(26, 18, 8, 0.5);
  border: none;
  cursor: pointer;
  transition: background 0.12s, color 0.12s;
}
.mushaf-page-chip:hover {
  background: rgba(47, 79, 55, 0.14);
  color: #1a1208;
}
.mushaf-page-chip.active {
  background: #2F4F37;
  color: white;
  font-weight: 700;
}

/* ── Session summary card ────────────────────────── */
.mushaf-session-card {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 250;
  background: #fffbf0;
  color: #1a1208;
  border-radius: 22px;
  padding: 2rem 1.75rem;
  text-align: center;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.22);
  min-width: 240px;
  direction: rtl;
}

.mushaf-icon-close {
  background: none;
  border: none;
  color: #1a1208;`
);

fs.writeFileSync(cssPath, css, "utf8");
console.log("✅ globals.css patched");
console.log("\nPhase 2E + 2F patched successfully.");
