import * as React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Shuffle, RotateCcw } from "lucide-react";
import { QURAN_VOCAB, type VocabWord } from "@/data/quranVocab";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

export function QuranVocabPage() {
  const navigate = useNavigate();
  const [deck, setDeck] = React.useState<VocabWord[]>(() => [...QURAN_VOCAB]);
  const [cardIndex, setCardIndex] = React.useState(0);
  const [flipped, setFlipped] = React.useState(false);
  const [seen, setSeen] = React.useState<Set<number>>(new Set());

  const card = deck[cardIndex];

  function handleNext() {
    const nextIndex = cardIndex + 1;
    if (nextIndex < deck.length) {
      setCardIndex(nextIndex);
      setFlipped(false);
      if (card) setSeen((s) => new Set([...s, card.id]));
    }
  }

  function handlePrev() {
    if (cardIndex > 0) {
      setCardIndex(cardIndex - 1);
      setFlipped(false);
    }
  }

  function handleShuffle() {
    setDeck(shuffle(QURAN_VOCAB));
    setCardIndex(0);
    setFlipped(false);
    setSeen(new Set());
  }

  function handleReset() {
    setDeck([...QURAN_VOCAB]);
    setCardIndex(0);
    setFlipped(false);
    setSeen(new Set());
  }

  if (!card) return null;

  const progress = ((cardIndex + 1) / deck.length) * 100;

  return (
    <div dir="rtl" className="min-h-screen-safe pb-32">
      {/* Header */}
      <div
        className="sticky top-0 z-20 px-4 pt-4 pb-3"
        style={{ background: "var(--bg)", borderBottom: "1px solid var(--card-border)" }}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <button
              onClick={handleShuffle}
              className="p-2 rounded-xl"
              style={{ background: "var(--card-bg)", color: "var(--accent)" }}
              title="خلط البطاقات"
            >
              <Shuffle size={16} />
            </button>
            <button
              onClick={handleReset}
              className="p-2 rounded-xl"
              style={{ background: "var(--card-bg)", color: "var(--fg)" }}
              title="إعادة تعيين"
            >
              <RotateCcw size={16} />
            </button>
          </div>
          <div className="text-center flex-1">
            <h1 className="font-bold text-base" style={{ color: "var(--fg)" }}>
              مفردات القرآن
            </h1>
            <p className="text-xs opacity-60" style={{ color: "var(--fg)" }}>
              {cardIndex + 1} / {deck.length}
            </p>
          </div>
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl"
            style={{ background: "var(--card-bg)", color: "var(--fg)" }}
          >
            <ArrowRight size={18} />
          </button>
        </div>
        {/* Progress bar */}
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--card-border)" }}>
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${progress}%`, background: "var(--accent)" }}
          />
        </div>
      </div>

      {/* Flashcard */}
      <div className="px-4 pt-8 flex flex-col items-center gap-6">
        <button
          onClick={() => setFlipped((f) => !f)}
          className="w-full max-w-sm rounded-3xl min-h-56 flex flex-col items-center justify-center p-8 transition-all duration-300 active:scale-95 cursor-pointer"
          style={{
            background: flipped ? "var(--accent)" : "var(--card-bg)",
            border: "1px solid var(--card-border)",
            color: flipped ? "#fff" : "var(--fg)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
          }}
        >
          {!flipped ? (
            <div className="text-center">
              <div
                className="text-5xl font-bold mb-4"
                style={{ fontFamily: "var(--font-arabic, inherit)" }}
              >
                {card.arabic}
              </div>
              <p className="text-xs opacity-50">اضغط للكشف عن المعنى</p>
            </div>
          ) : (
            <div className="text-center space-y-3">
              <div
                className="text-3xl font-bold"
                style={{ fontFamily: "var(--font-arabic, inherit)" }}
              >
                {card.arabic}
              </div>
              <div className="h-px opacity-30" style={{ background: "#fff" }} />
              <p className="text-lg leading-relaxed font-medium">{card.meaning}</p>
              {card.frequency > 0 && (
                <p className="text-xs opacity-70">
                  تكرّر في القرآن ~{card.frequency} مرة
                </p>
              )}
            </div>
          )}
        </button>

        {/* Navigation */}
        <div className="flex items-center gap-4">
          <button
            onClick={handleNext}
            disabled={cardIndex >= deck.length - 1}
            className="px-6 py-3 rounded-2xl font-bold text-sm transition-all disabled:opacity-30"
            style={{ background: "var(--accent)", color: "#fff" }}
          >
            التالي ←
          </button>
          <button
            onClick={handlePrev}
            disabled={cardIndex === 0}
            className="px-6 py-3 rounded-2xl font-bold text-sm transition-all disabled:opacity-30"
            style={{ background: "var(--card-bg)", color: "var(--fg)", border: "1px solid var(--card-border)" }}
          >
            → السابق
          </button>
        </div>

        {/* Stats */}
        <p className="text-xs opacity-50" style={{ color: "var(--fg)" }}>
          شاهدت {seen.size} كلمة من {deck.length}
        </p>
      </div>
    </div>
  );
}
