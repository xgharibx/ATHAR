import * as React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Bell, BookOpen, Play, Trash2 } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { toast } from "react-hot-toast";
import { useQ2Meta, useQ2Text } from "../hooks";
import { useQ2Store } from "../store";
import { useHifzToday } from "../hifz/useHifzToday";
import { memoryMap } from "../hifz/plan";
import { retrievability, TARGET_RETENTION } from "../hifz/fsrs";
import { learnPage } from "../hifz/actions";
import { arCount, arDigits } from "../data/arabic";
import { juzOf, pageRange, refFromIndex } from "../data/meta";
import { pageLabel } from "../data/pages";
import { Q2Error, Q2Loading, Q2Sheet } from "../components/ui";
import { syncQuran2Native } from "../native/sync";
import { useNoorStore } from "@/store/noorStore";
import { hadithDueOn, localDayKey } from "@/lib/reviewToday";

/** The colour of a page on the map: how likely you are to recall it today. */
function recallColor(r: number | null): string {
  if (r == null) return "var(--q2-line)";
  if (r >= 0.95) return "var(--q2-green)";
  if (r >= TARGET_RETENTION) return "color-mix(in srgb, var(--q2-green) 62%, transparent)";
  if (r >= 0.8) return "var(--q2-gold)";
  return "var(--q2-danger)";
}

const DAY = 86_400_000;

/** The daily reminder for the session: phones only (the web cannot ring at a set time). */
function ReminderRow() {
  const reminder = useQ2Store((s) => s.prefs.hifzReminder);
  const setPrefs = useQ2Store((s) => s.setPrefs);
  const [busy, setBusy] = React.useState(false);
  if (!Capacitor.isNativePlatform()) return null;
  const apply = async (next: { enabled: boolean; time: string }) => {
    setPrefs({ hifzReminder: next });
    if (!next.enabled) {
      void syncQuran2Native();
      return;
    }
    setBusy(true);
    const ok = await syncQuran2Native(true);
    setBusy(false);
    if (!ok) {
      setPrefs({ hifzReminder: { ...next, enabled: false } });
      toast.error("اسمح لأثر بالإشعارات من إعدادات الهاتف ليصلك التذكير");
    }
  };
  return (
    <div className="q2-card" style={{ marginTop: 12 }}>
      <div className="q2-row" style={{ cursor: "default", gap: 10 }}>
        <Bell size={18} aria-hidden="true" style={{ color: "var(--q2-green)", flex: "none" }} />
        <span style={{ flex: 1 }}>
          <b style={{ display: "block", fontSize: 14.5 }}>ذكّرني بجلسة الحفظ</b>
          <span className="q2-small">كل يوم في وقتك، بعدد ما ينتظرك من صفحات</span>
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={reminder.enabled}
          aria-label="تذكير يومي بجلسة الحفظ"
          disabled={busy}
          className={`q2-chip${reminder.enabled ? " is-on" : ""}`}
          onClick={() => void apply({ ...reminder, enabled: !reminder.enabled })}
        >
          {reminder.enabled ? "مفعّل" : "متوقف"}
        </button>
      </div>
      {reminder.enabled ? (
        <label className="q2-row" style={{ cursor: "default" }}>
          <span style={{ flex: 1 }}>وقت التذكير</span>
          <input
            type="time"
            value={reminder.time}
            onChange={(e) => e.target.value && void apply({ enabled: true, time: e.target.value })}
            style={{ font: "inherit", color: "var(--q2-ink)", background: "transparent", border: "1px solid var(--q2-line)", borderRadius: 10, padding: "6px 10px" }}
          />
        </label>
      ) : null}
    </div>
  );
}

function dueLabel(due: number, now: number): string {
  const days = Math.round((due - now) / DAY);
  if (days <= 0) return "اليوم";
  if (days === 1) return "غدًا";
  return `بعد ${arCount(days, "يوم", "يومين", "أيام", "يومًا")}`;
}

/** The hadith side of «مراجعة اليوم»: its cards due today, one tap away. */
function HadithDueRow() {
  const navigate = useNavigate();
  const due = useNoorStore((s) => hadithDueOn(s.hadithMemoCards, localDayKey()));
  const cards = useNoorStore((s) => Object.keys(s.hadithMemoCards).length);
  if (!cards) return null;
  return (
    <button type="button" className="q2-card q2-row q2-press" style={{ width: "100%", marginTop: 12, textAlign: "right" }} onClick={() => navigate("/hadith/memo")}>
      <span style={{ flex: 1, minWidth: 0 }}>
        <b style={{ fontSize: 15 }}>بطاقات الحديث</b>
        <span className="q2-small" style={{ display: "block" }}>{due ? "تنتظرك اليوم مع جلسة القرآن" : "لا شيء منها اليوم"}</span>
      </span>
      <b style={{ fontSize: 20 }}>{arDigits(due)}</b>
    </button>
  );
}

export default function Q2Hifz() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const text = useQ2Text();
  const meta = useQ2Meta();
  const hifz = useQ2Store((s) => s.hifz);
  const prefs = useQ2Store((s) => s.prefs);
  const setPrefs = useQ2Store((s) => s.setPrefs);
  const removeHifz = useQ2Store((s) => s.removeHifz);
  const today = useHifzToday();
  const picked = Number(params.get("page")) || null;
  const map = React.useMemo(() => memoryMap(hifz, today.now), [hifz, today.now]);

  if (text.isError || meta.isError) return <Q2Error label="تعذّر تحميل المصحف." />;
  if (!text.data || !meta.data) return <Q2Loading />;
  const m = meta.data;
  const memorised = today.memorised;
  const juzDone = Array.from({ length: 30 }, (_, j) => j + 1).filter((juz) => {
    for (let p = 1; p <= 604; p++) {
      const [s, a] = refFromIndex(m, pageRange(m, p)[0]);
      if (juzOf(m, s, a) === juz && !hifz[p]) return false;
    }
    return true;
  }).length;
  const { newPages, near, far } = today.plan;
  const total = newPages.length + near.length + far.length;
  const card = picked ? hifz[picked] : undefined;

  return (
    <main className="q2-main">
      <h1 className="q2-h1">الحفظ</h1>
      <p className="q2-soft" style={{ marginTop: 4, lineHeight: 1.9 }}>
        على طريقة الحلقات: درس جديد، ومراجعة لما قرب، ومراجعة لما بعد في وقتها، بنموذج ذاكرة يقدّر متى توشك أن تنسى كل صفحة.
      </p>

      <div className="q2-card" style={{ padding: 16, marginTop: 14, display: "flex", gap: 16 }}>
        <div style={{ flex: 1 }}>
          <b style={{ fontSize: 28 }}>{arDigits(memorised)}</b>
          <span className="q2-small"> من ٦٠٤ صفحة</span>
          <div className="q2-bar" style={{ marginTop: 8 }}><span style={{ width: `${(memorised / 604) * 100}%` }} /></div>
        </div>
        <div style={{ textAlign: "center" }}>
          <b style={{ fontSize: 28 }}>{arDigits(juzDone)}</b>
          <span className="q2-small" style={{ display: "block" }}>جزءًا تامًا</span>
        </div>
      </div>

      <section className="q2-section">
        <div className="q2-head">
          <h2 className="q2-h2"><span className="q2-orn" aria-hidden="true" /> جلسة اليوم</h2>
          <span className="q2-small">{total ? `${arDigits(total)} صفحة` : "لا شيء الآن"}</span>
        </div>
        <div className="q2-card">
          {[
            { label: "الجديد", hint: "الدرس الجديد", pages: newPages },
            { label: "القريب", hint: "آخر ما حفظت، كل يوم حتى يثبت", pages: near },
            { label: "البعيد", hint: "ما حان وقته قبل أن يُنسى", pages: far },
          ].map((row) => (
            <div key={row.label} className="q2-row" style={{ alignItems: "flex-start" }}>
              <span style={{ flex: 1, minWidth: 0 }}>
                <b style={{ fontSize: 15 }}>{row.label}</b>
                <span className="q2-small" style={{ display: "block" }}>{row.hint}</span>
                {row.pages.length ? (
                  <span className="q2-small" style={{ display: "block", marginTop: 4, color: "var(--q2-ink)" }}>
                    {row.pages.slice(0, 3).map((p) => `ص ${arDigits(p)} (${pageLabel(text.data!, m, p)})`).join("، ")}
                    {row.pages.length > 3 ? ` و${arDigits(row.pages.length - 3)} غيرها` : ""}
                  </span>
                ) : null}
              </span>
              <b style={{ fontSize: 20 }}>{arDigits(row.pages.length)}</b>
            </div>
          ))}
        </div>
        <button type="button" className="q2-btn q2-press" style={{ width: "100%", marginTop: 12 }} disabled={!total} onClick={() => navigate("/quran/hifz/session")}>
          <Play size={17} aria-hidden="true" /> ابدأ جلسة اليوم
        </button>
        <button type="button" className="q2-btn is-ghost q2-press" style={{ width: "100%", marginTop: 8 }} onClick={() => navigate("/quran/hifz/similar")}>
          تدرّب على المتشابهات
        </button>
        <HadithDueRow />
        <ReminderRow />
      </section>

      <section className="q2-section">
        <div className="q2-head">
          <h2 className="q2-h2"><span className="q2-orn" aria-hidden="true" /> خريطة حفظك</h2>
          <span className="q2-small">٦٠٤ صفحات</span>
        </div>
        <div className="q2-map" role="group" aria-label="صفحات المصحف ملوّنة بقوة حفظها">
          {map.map((r, i) => (
            <button
              key={i}
              type="button"
              style={{ background: recallColor(r) }}
              className={today.learnedToday.includes(i + 1) ? "is-today" : undefined}
              aria-label={`الصفحة ${i + 1}${r == null ? "" : `، احتمال تذكّرها ${Math.round(r * 100)}٪`}`}
              onClick={() => setParams({ page: String(i + 1) })}
            />
          ))}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 10 }}>
          {[
            { c: recallColor(0.97), t: "راسخ" },
            { c: recallColor(0.92), t: "ثابت" },
            { c: recallColor(0.85), t: "يحتاج مراجعة" },
            { c: recallColor(0.5), t: "يوشك أن يُنسى" },
            { c: recallColor(null), t: "لم يُحفظ" },
          ].map((l) => (
            <span className="q2-legend" key={l.t}><i style={{ background: l.c }} />{l.t}</span>
          ))}
        </div>
        <p className="q2-small" style={{ marginTop: 8 }}>الصفحة ١ أعلى اليمين، والصفحات تمضي من اليمين إلى اليسار سطرًا سطرًا حتى ٦٠٤. المس أي صفحة.</p>
      </section>

      <section className="q2-section">
        <h2 className="q2-h2"><span className="q2-orn" aria-hidden="true" /> خطتك</h2>
        <div className="q2-small" style={{ marginTop: 10 }}>مقدار الجديد كل يوم</div>
        <div className="q2-chips" style={{ marginTop: 6 }}>
          {[
            { v: 0.5, t: "نصف صفحة" },
            { v: 1, t: "صفحة" },
            { v: 2, t: "صفحتان" },
          ].map((o) => (
            <button key={o.v} type="button" className={`q2-chip${prefs.newPerDay === o.v ? " is-on" : ""}`} aria-pressed={prefs.newPerDay === o.v} onClick={() => setPrefs({ newPerDay: o.v })}>{o.t}</button>
          ))}
        </div>
        <div className="q2-small" style={{ marginTop: 12 }}>من أين تبدأ</div>
        <div className="q2-chips" style={{ marginTop: 6 }}>
          <button type="button" className={`q2-chip${prefs.direction === "end" ? " is-on" : ""}`} aria-pressed={prefs.direction === "end"} onClick={() => setPrefs({ direction: "end" })}>من آخر المصحف (جزء عمّ)</button>
          <button type="button" className={`q2-chip${prefs.direction === "start" ? " is-on" : ""}`} aria-pressed={prefs.direction === "start"} onClick={() => setPrefs({ direction: "start" })}>من أوله</button>
        </div>
        <div className="q2-small" style={{ marginTop: 12 }}>القريب: كم صفحة من آخر ما حفظت تراجع كل يوم</div>
        <div className="q2-chips" style={{ marginTop: 6 }}>
          {[5, 10, 20].map((n) => (
            <button key={n} type="button" className={`q2-chip${prefs.nearCount === n ? " is-on" : ""}`} aria-pressed={prefs.nearCount === n} onClick={() => setPrefs({ nearCount: n })}>{arDigits(n)} صفحات</button>
          ))}
        </div>
        <p className="q2-small" style={{ marginTop: 14, lineHeight: 1.9 }}>
          البعيد يُجدوَل بنموذج FSRS: بعد كل مراجعة تقيّم حفظك، فيقدّر النموذج ثبات الصفحة ويعيدها قبل أن ينزل احتمال تذكّرها عن ٩٠٪. كل ذلك على جهازك فقط.
        </p>
      </section>

      <Q2Sheet open={Boolean(picked)} onClose={() => setParams({}, { replace: true })} label="صفحة">
        {picked ? (
          <div>
            <div className="q2-eyebrow">الصفحة {arDigits(picked)}</div>
            <h3 className="q2-h2" style={{ marginTop: 4 }}>{pageLabel(text.data, m, picked)}</h3>
            {card ? (
              <p className="q2-soft" style={{ marginTop: 8, lineHeight: 1.9 }}>
                احتمال تذكّرها اليوم {arDigits(Math.round(retrievability(card, today.now) * 100))}٪، مراجعتها القادمة {dueLabel(card.due, today.now)} ،
                رُوجعت {arCount(card.reps, "مرة", "مرتين", "مرات", "مرة")}
                {card.lapses ? `، نُسيت ${arCount(card.lapses, "مرة", "مرتين", "مرات", "مرة")}` : ""}
              </p>
            ) : (
              <p className="q2-soft" style={{ marginTop: 8 }}>ليست في حفظك بعد.</p>
            )}
            <div className="q2-chips" style={{ marginTop: 12, flexWrap: "wrap" }}>
              <button type="button" className="q2-chip is-on q2-press" onClick={() => navigate(`/quran/hifz/session?pages=${picked}`)}>
                <Play size={15} aria-hidden="true" /> {card ? "راجعها الآن" : "احفظها الآن"}
              </button>
              <button
                type="button"
                className="q2-chip q2-press"
                onClick={() => {
                  const [s, a] = refFromIndex(m, pageRange(m, picked)[0]);
                  navigate(`/quran/read/${s}?a=${a}`);
                }}
              >
                <BookOpen size={15} aria-hidden="true" /> اقرأها
              </button>
              {card ? (
                <button type="button" className="q2-chip q2-press" onClick={() => removeHifz(picked)}>
                  <Trash2 size={15} aria-hidden="true" /> أزلها من حفظي
                </button>
              ) : (
                <button type="button" className="q2-chip q2-press" onClick={() => learnPage(picked)}>
                  أحفظها من قبل
                </button>
              )}
            </div>
          </div>
        ) : null}
      </Q2Sheet>
    </main>
  );
}
