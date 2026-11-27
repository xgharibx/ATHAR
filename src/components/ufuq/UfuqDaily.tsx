/**
 * «زاد اليوم» on the home of «أفق»: the ayah of the day, the hadith of the day
 * and the sunnah of the day, in one card with three tabs. The picks are the
 * same as the classic home's (same pools, same day): the hadith is a real
 * hadeethenc.com record with its grade and its explanation; the sunnah comes
 * from the app's own collection of sunan with its source.
 */
import * as React from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, BookOpenText, ChevronDown, Share2 } from "lucide-react";
import { DAILY_VERSES } from "@/data/dailyVerses";
import type { Section } from "@/data/types";
import { useTodayKey } from "@/hooks/useTodayKey";
import { arNum } from "@/lib/formatNumber";
import { shareText } from "@/lib/shareTargets";
import { useDailyHadith } from "@/lib/useDailyHadith";

type Kind = "ayah" | "hadith" | "sunnah";

const KINDS: Array<{ id: Kind; label: string }> = [
  { id: "ayah", label: "آية اليوم" },
  { id: "hadith", label: "حديث اليوم" },
  { id: "sunnah", label: "سُنّة اليوم" },
];

function dailyIndex(key: string, length: number, seed = 7): number {
  let hash = seed;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  return length ? hash % length : 0;
}

export function UfuqDaily({ sections }: { sections: Section[] }) {
  const navigate = useNavigate();
  const today = useTodayKey();
  const [kind, setKind] = React.useState<Kind>("ayah");
  const [explain, setExplain] = React.useState(false);
  const verse = DAILY_VERSES[dailyIndex(today, DAILY_VERSES.length)];
  const hadith = useDailyHadith(today, { syncWidget: true });
  const sunnahPool = React.useMemo(
    () => sections.filter((s) => s.id === "sunan" || s.id.startsWith("sunan_")).flatMap((s) => s.content),
    [sections],
  );
  // The same pick as the classic home's «سنة اليوم».
  const sunnah = sunnahPool.length ? sunnahPool[dailyIndex(today, sunnahPool.length, 197)] : undefined;
  const touchX = React.useRef<number | null>(null);

  const move = (step: number) => {
    const i = KINDS.findIndex((k) => k.id === kind);
    const next = KINDS[(i + step + KINDS.length) % KINDS.length]!;
    setKind(next.id);
    setExplain(false);
  };

  return (
    <figure
      className="u-card u-verse u-daily"
      onTouchStart={(e) => (touchX.current = e.touches[0]?.clientX ?? null)}
      onTouchEnd={(e) => {
        const start = touchX.current;
        touchX.current = null;
        const end = e.changedTouches[0]?.clientX;
        if (start === null || end === undefined || Math.abs(end - start) < 50) return;
        // Right to left: a swipe to the left brings the next one.
        move(end < start ? 1 : -1);
      }}
    >
      <div className="u-daily-tabs" role="tablist" aria-label="زاد اليوم">
        {KINDS.map((k) => (
          <button
            key={k.id}
            type="button"
            role="tab"
            aria-selected={kind === k.id}
            className={`u-daily-tab${kind === k.id ? " is-on" : ""}`}
            onClick={() => {
              setKind(k.id);
              setExplain(false);
            }}
          >
            {k.label}
          </button>
        ))}
      </div>

      {kind === "ayah" && verse ? (
        <div role="tabpanel" aria-label="آية اليوم" className="u-daily-panel">
          <blockquote className="u-verse-text">{verse.arabic}</blockquote>
          <div className="u-verse-ref">{`${verse.surahName}، الآية ${arNum(verse.ayahIndex)}`}</div>
          {verse.meaning ? <p className="mt-3 text-[13.5px] leading-7 text-(--muted)">{verse.meaning}</p> : null}
          <div className="mt-5 flex items-center justify-center gap-2">
            <button type="button" className="u-pill-btn is-quiet" onClick={() => navigate(`/quran/read/${verse.surahId}?a=${verse.ayahIndex}`)}>
              <BookOpen size={16} aria-hidden="true" />
              في المصحف
            </button>
            <button
              type="button"
              className="u-pill-btn is-quiet"
              aria-label="مشاركة الآية"
              onClick={() => void shareText(`﴿${verse.arabic}﴾\n— ${verse.surahName}، ${arNum(verse.ayahIndex)}`)}
            >
              <Share2 size={16} aria-hidden="true" />
              مشاركة
            </button>
          </div>
        </div>
      ) : null}

      {kind === "hadith" ? (
        <div role="tabpanel" aria-label="حديث اليوم" className="u-daily-panel">
          {hadith.hadith ? (
            <>
              <blockquote className="u-daily-text">«{hadith.hadith.hadeeth}»</blockquote>
              <div className="u-daily-tags">
                {hadith.hadith.attribution ? <span>{hadith.hadith.attribution}</span> : null}
                {hadith.hadith.grade ? <span className="is-ok">{hadith.hadith.grade}</span> : null}
              </div>
              {hadith.hadith.explanation ? (
                <>
                  <button type="button" className="u-daily-more" aria-expanded={explain} onClick={() => setExplain((v) => !v)}>
                    <BookOpenText size={15} aria-hidden="true" />
                    الشرح
                    <ChevronDown size={15} aria-hidden="true" style={{ transform: explain ? "rotate(180deg)" : undefined }} />
                  </button>
                  {explain ? <p className="u-daily-explain">{hadith.hadith.explanation}</p> : null}
                </>
              ) : null}
              <div className="mt-4 flex items-center justify-center gap-2">
                <button type="button" className="u-pill-btn is-quiet" onClick={() => navigate(`/library/sharh?h=${hadith.hadith!.id}`)}>
                  <BookOpenText size={16} aria-hidden="true" />
                  المصدر الكامل
                </button>
                <button
                  type="button"
                  className="u-pill-btn is-quiet"
                  aria-label="مشاركة الحديث"
                  onClick={() =>
                    void shareText(
                      [
                        hadith.hadith!.hadeeth,
                        `— ${[hadith.hadith!.attribution, hadith.hadith!.grade].filter(Boolean).join("، ")}`,
                        hadith.hadith!.explanation ? `\n━━━━━ شرح الحديث ━━━━━\n${hadith.hadith!.explanation}` : "",
                      ]
                        .filter(Boolean)
                        .join("\n"),
                    )
                  }
                >
                  <Share2 size={16} aria-hidden="true" />
                  مشاركة
                </button>
              </div>
            </>
          ) : (
            <p className="u-daily-empty">{hadith.done ? "تعذّر جلب حديث اليوم الآن، يظهر عند الاتصال." : "جارٍ التحميل…"}</p>
          )}
        </div>
      ) : null}

      {kind === "sunnah" ? (
        <div role="tabpanel" aria-label="سنة اليوم" className="u-daily-panel">
          {sunnah ? (
            <>
              <blockquote className="u-daily-text">{sunnah.text}</blockquote>
              {sunnah.benefit ? <p className="u-daily-explain">{sunnah.benefit}</p> : null}
              {sunnah.source_label || sunnah.source ? (
                <div className="u-daily-tags">
                  <span>{sunnah.source_label || sunnah.source}</span>
                </div>
              ) : null}
              <div className="mt-4 flex items-center justify-center gap-2">
                <button type="button" className="u-pill-btn is-quiet" onClick={() => navigate("/c/forgotten_sunnahs")}>
                  <BookOpen size={16} aria-hidden="true" />
                  السنن المهجورة
                </button>
                <button
                  type="button"
                  className="u-pill-btn is-quiet"
                  aria-label="مشاركة السنة"
                  onClick={() => void shareText([sunnah.text, sunnah.benefit, sunnah.source_label].filter(Boolean).join("\n"))}
                >
                  <Share2 size={16} aria-hidden="true" />
                  مشاركة
                </button>
              </div>
            </>
          ) : (
            <p className="u-daily-empty">جارٍ التحميل…</p>
          )}
        </div>
      ) : null}
    </figure>
  );
}
