/**
 * «ختمتي»: how far the khatma has come, what to read today to
 * finish on time, the days you read, and each juz' at a glance.
 */
import * as React from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, Flag, RotateCcw } from "lucide-react";
import { dayKey, useQ2Meta } from "../hooks";
import { useQ2Store } from "../store";
import { useNoorStore } from "@/store/noorStore";
import { arCount, arDigits } from "../data/arabic";
import { decodeBits, firstUnread, juzShares, khatmaPace, pageShares, readingStreak, countBits, TOTAL_AYAHS } from "../reading/khatma";
import { Q2Error, Q2Loading, Q2Strip } from "../components/ui";
import { KhatmaPlanPanel } from "../reading/KhatmaPlanPanel";

const dateLabel = (ms: number) => new Date(ms).toLocaleDateString("ar-u-nu-arab", { day: "numeric", month: "long", year: "numeric" });

export default function Q2Khatma() {
  const navigate = useNavigate();
  const meta = useQ2Meta();
  const khatma = useQ2Store((s) => s.khatma);
  const readLog = useQ2Store((s) => s.readLog);
  const setGoal = useQ2Store((s) => s.setKhatmaGoal);
  // The khatma's deadline is the app's plan (set here or before, in the plans page).
  const planDays = useNoorStore((s) => s.khatmaDays);
  React.useEffect(() => {
    if ((planDays ?? null) !== khatma.goalDays) setGoal(planDays ?? null);
  }, [planDays, khatma.goalDays, setGoal]);
  const newKhatma = useQ2Store((s) => s.newKhatma);
  const [confirmNew, setConfirmNew] = React.useState(false);
  const [now] = React.useState(() => Date.now());

  const view = React.useMemo(() => {
    if (!meta.data) return null;
    const bits = decodeBits(khatma.bits);
    const pages = pageShares(meta.data, bits);
    return {
      ayahs: countBits(bits),
      pagesRead: pages.filter((x) => x >= 1).length,
      juz: juzShares(meta.data, bits),
      next: firstUnread(meta.data, bits),
    };
  }, [meta.data, khatma.bits]);

  if (meta.isError) return <Q2Error label="تعذّر تحميل المصحف." />;
  if (!meta.data || !view) return <Q2Loading />;
  const m = meta.data;
  const today = new Date(now);
  const todayAyahs = readLog[dayKey(today)] ?? 0;
  const streak = readingStreak(readLog, today);
  const last30 = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (29 - i));
    return readLog[dayKey(d)] ?? 0;
  });
  const pace = khatma.goalDays ? khatmaPace({ pagesRead: view.pagesRead, startedAt: khatma.startedAt, goalDays: khatma.goalDays, now }) : null;
  const done = view.ayahs >= TOTAL_AYAHS;
  const share = view.ayahs / TOTAL_AYAHS;

  return (
    <main className="q2-main">
      <h1 className="q2-h1">ختمتي</h1>
      <p className="q2-soft" style={{ marginTop: 4 }}>بدأتها في {dateLabel(khatma.startedAt)}.</p>

      <div className="q2-card" style={{ padding: 18, marginTop: 14 }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 10 }}>
          <b style={{ fontSize: 40, lineHeight: 1 }}>{arDigits(view.pagesRead)}</b>
          <span className="q2-small" style={{ paddingBottom: 4 }}>من ٦٠٤ صفحة قرأتها كاملة</span>
          <b style={{ marginInlineStart: "auto", fontSize: 22, color: "var(--q2-green)" }}>{arDigits(Math.floor(share * 100))}٪</b>
        </div>
        <div className="q2-bar" style={{ marginTop: 10 }}><span style={{ width: `${share * 100}%` }} /></div>
        <p className="q2-small" style={{ marginTop: 8 }}>{arCount(view.ayahs, "آية واحدة", "آيتان", "آيات", "آية")} من {arDigits(TOTAL_AYAHS)}.</p>
        {done ? (
          <div style={{ marginTop: 12 }}>
            <b style={{ fontFamily: "var(--q2-serif)", fontSize: 22, color: "var(--q2-gold)" }}>
              <Flag size={18} aria-hidden="true" /> ختمتَ القرآن، تقبّل الله منك
            </b>
            <button type="button" className="q2-btn q2-press" style={{ width: "100%", marginTop: 10 }} onClick={newKhatma}>
              ابدأ ختمة جديدة
            </button>
          </div>
        ) : view.next ? (
          <button
            type="button"
            className="q2-btn q2-press"
            style={{ width: "100%", marginTop: 12 }}
            onClick={() => navigate(`/quran/read/${view.next![0]}?a=${view.next![1]}`)}
          >
            <BookOpen size={17} aria-hidden="true" /> تابع من سورة {m.surahs[view.next[0] - 1]!.name}، الآية {arDigits(view.next[1])}
          </button>
        ) : null}
      </div>

      <section className="q2-section">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10 }}>
          {[
            { n: todayAyahs, label: "آية اليوم" },
            { n: streak, label: streak === 1 ? "يوم متتابع" : "أيام متتابعة" },
            { n: khatma.finished.length, label: "ختمة أتممتها" },
          ].map((x) => (
            <div key={x.label} className="q2-card" style={{ padding: 12, textAlign: "center" }}>
              <b style={{ fontSize: 26 }}>{arDigits(x.n)}</b>
              <span className="q2-small" style={{ display: "block" }}>{x.label}</span>
            </div>
          ))}
        </div>
      </section>

      <KhatmaPlanPanel onChoose={(days) => setGoal(days)} />
      {pace && !done ? (
        <p className="q2-card" style={{ padding: 14, marginTop: 10, lineHeight: 2 }}>
          بحساب الصفحات: اقرأ اليوم {arCount(pace.perDay, "صفحة واحدة", "صفحتين", "صفحات", "صفحة")} لتختم في موعدك؛
          {pace.daysLeft === 1 ? " بقي هذا اليوم." : ` بقي ${arCount(pace.daysLeft, "يوم", "يومان", "أيام", "يومًا")}.`}{" "}
          <b style={{ color: pace.onTrack ? "var(--q2-green)" : "var(--q2-gold)" }}>{pace.onTrack ? "أنت على الموعد." : "تأخرتَ عن الموعد، وإدراكه ممكن."}</b>
        </p>
      ) : null}

      <section className="q2-section">
        <div className="q2-head">
          <h2 className="q2-h2"><span className="q2-orn" aria-hidden="true" /> آخر ثلاثين يومًا</h2>
          <span className="q2-small">{arDigits(last30.reduce((a, b) => a + b, 0))} آية</span>
        </div>
        <div style={{ marginTop: 10 }}>
          <Q2Strip counts={last30} label="الآيات المقروءة في كل يوم من آخر ثلاثين يومًا" startLabel="قبل شهر" endLabel="اليوم" />
        </div>
      </section>

      <section className="q2-section">
        <h2 className="q2-h2"><span className="q2-orn" aria-hidden="true" /> الأجزاء</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, minmax(0, 1fr))", gap: 6, marginTop: 10 }}>
          {view.juz.map((x, i) => (
            <div
              key={i}
              className="q2-card"
              style={{ padding: "8px 0", textAlign: "center", background: x >= 1 ? "var(--q2-green-soft)" : undefined, position: "relative", overflow: "hidden" }}
              aria-label={`الجزء ${i + 1}: ${Math.round(x * 100)}٪`}
            >
              <span aria-hidden="true" style={{ position: "absolute", insetInline: 0, bottom: 0, height: 4, background: "var(--q2-green)", width: `${x * 100}%` }} />
              <b style={{ fontSize: 15 }}>{arDigits(i + 1)}</b>
            </div>
          ))}
        </div>
      </section>

      {khatma.finished.length ? (
        <section className="q2-section">
          <h2 className="q2-h2"><span className="q2-orn" aria-hidden="true" /> ختماتك</h2>
          <div className="q2-card" style={{ marginTop: 10 }}>
            {[...khatma.finished].reverse().map((at, i) => (
              <div key={at} className="q2-row" style={{ cursor: "default" }}>
                <span style={{ flex: 1 }}>الختمة {arDigits(khatma.finished.length - i)}</span>
                <span className="q2-small">{dateLabel(at)}</span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {!done && view.ayahs > 0 ? (
        <button
          type="button"
          className="q2-btn is-ghost q2-press"
          style={{ width: "100%", marginTop: 22 }}
          onClick={() => {
            if (!confirmNew) {
              setConfirmNew(true);
              return;
            }
            newKhatma();
            setConfirmNew(false);
          }}
        >
          <RotateCcw size={16} aria-hidden="true" /> {confirmNew ? "تأكيد: ابدأ من أول المصحف" : "ابدأ ختمة جديدة من الأول"}
        </button>
      ) : null}

      <p className="q2-small" style={{ marginTop: 16, lineHeight: 1.9 }}>
        تُحسب الآية مقروءة إذا بقيت على الشاشة قدر قراءتها، أو تلاها القارئ وأنت تستمع. لا يُحسب التمرير السريع. كل ذلك على جهازك ومع نسختك الاحتياطية.
      </p>
    </main>
  );
}
