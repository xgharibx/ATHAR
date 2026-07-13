/**
 * أثر — AI companion page.
 *
 * One AI for every user. No model picker, no API keys, no settings.
 * Features wired here:
 *  - Live-journey greeting + one primary "next step" CTA
 *  - Quick prompts, deep-linked `?ask=…`
 *  - Streaming chat with animated thinking state
 *  - In-line citation chips for Quran/hadith refs the user message can deep-link
 *  - Three suggested follow-up chips beneath every reply
 *  - Voice overlay: STT input + Arabic TTS playback
 *  - Pin any reply to Favorites, share reply as image, copy
 *  - Conversation history with fuzzy search (Fuse.js — already a dep)
 *  - Persisted partial streams to IndexedDB so a closed tab doesn't lose long replies
 *  - Onboarding micro-question after the first welcome so the AI adapts fast
 *  - Verification banner when cited verses can't be matched locally
 */
import * as React from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  Sparkles, Send, History, Plus, Pencil, Check, Copy, X as XIcon,
  Mic, MicOff, Volume2, VolumeX, Search, Pin, Share2, Image as ImageIcon,
  AlertCircle, Loader2, MessageSquareQuote, Download,
} from "lucide-react";
import { toast } from "react-hot-toast";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";
import Fuse from "fuse.js";
import { toPng } from "html-to-image";

import {
  ROUTE_LABELS,
  buildCompanionContext,
  buildWeeklyReflectionPrompt,
  clearMemory,
  isCompanionReady,
  streamCompanionReply,
  type CompanionMessage,
  type VerificationReport,
} from "@/lib/companionAI";
import { appLinksToMarkdown } from "@/lib/companionMarkdown";
import {
  exportConversationText,
  groupConversationsByRecency,
  previewSnippet,
  type HistoryGroup,
} from "@/lib/companionHistoryGroup";
import {
  addPin,
  deleteConversation,
  getConversation,
  listConversations,
  newConversationId,
  renameConversation,
  saveConversation,
  savePartialStream,
  loadPartialStream,
  clearPartialStream,
  titleFromMessages,
  type CompanionConversation,
} from "@/lib/companionHistory";
import {
  getVoiceEnabled, isVoiceSupported, setVoiceEnabled,
  speakArabic, startListening, stopListening, stopSpeaking,
} from "@/lib/companionVoice";
import {
  LEVEL_LABEL,
  loadProfile,
  updateProfile,
  type CompanionProfile,
} from "@/lib/companionProfile";
import { useScrollRestoration } from "@/hooks/useScrollRestoration";

function relativeTime(ms: number): string {
  const diff = Date.now() - ms;
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "الآن";
  if (min < 60) return `قبل ${min.toLocaleString("ar-EG")} د`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `قبل ${hr.toLocaleString("ar-EG")} س`;
  const day = Math.floor(hr / 24);
  return `قبل ${day.toLocaleString("ar-EG")} يوم`;
}

const QUICK_PROMPTS = [
  "ما الخطوة الأنسب لي الآن في يومي الإيماني؟",
  "اشرح لي فضل أذكار الصباح والمساء",
  "اقترح لي وردًا قرآنيًا يناسب وقتي",
  "كيف أحافظ على سلسلة المواظبة دون فتور؟",
  "دعاءٌ مأثورٌ يناسب حالي اليوم",
];

const MOOD_PROMPTS: Array<[string, string]> = [
  ["هل أنا بخير؟ أحسّ بقلق هذه الأيام", "مضطرب"],
  ["أحسّ بفتور عن الذكر، أنصحني", "مُفتَر"],
  ["أنا سعيد وأريد الشكر والحمد", "شاكر"],
  ["عندي ذنوب وأحتاج توبة", "تائب"],
  ["تعبان ومرهق ولا أستطيع التركيز", "مُنهَك"],
];

const FRIDAY = "خاطرة الجمعة";
const ASK_PARAM = "ask";

export function CompanionPage() {
  useScrollRestoration();
  const navigate = useNavigate();

  const [showHistory, setShowHistory] = React.useState(false);
  const [history, setHistory] = React.useState<CompanionConversation[]>([]);
  const [historyQuery, setHistoryQuery] = React.useState("");
  const [renamingId, setRenamingId] = React.useState<string | null>(null);
  const [renameDraft, setRenameDraft] = React.useState("");
  const [confirmDeleteId, setConfirmDeleteId] = React.useState<string | null>(null);
  const currentIdRef = React.useRef<string | null>(null);
  const currentTitleRef = React.useRef<string>("");
  const createdAtRef = React.useRef<number>(Date.now());

  const [messages, setMessages] = React.useState<CompanionMessage[]>([]);
  const [input, setInput] = React.useState("");
  const [streamingText, setStreamingText] = React.useState<string | null>(null);
  const [followUps, setFollowUps] = React.useState<string[]>([]);
  const [verification, setVerification] = React.useState<VerificationReport | null>(null);
  const [voiceOn, setVoiceOn] = React.useState(getVoiceEnabled);
  const [voiceLive, setVoiceLive] = React.useState({ supported: isVoiceSupported(), listening: false, transcript: "", error: null as string | null });
  const [isSpeaking, setIsSpeaking] = React.useState(false);

  const [profile, setProfile] = React.useState<CompanionProfile>(() => loadProfile());
  const [showOnboarding, setShowOnboarding] = React.useState(false);

  const busyRef = React.useRef(false);
  const abortRef = React.useRef<AbortController | null>(null);
  const endRef = React.useRef<HTMLDivElement>(null);
  const ctx = React.useMemo(buildCompanionContext, []);

  const greeting = React.useMemo(() => {
    const hour = new Date().getHours();
    const salam = "السلام عليكم";
    if (hour < 5) return `${salam} — قيامٌ مبارك 🌙`;
    if (hour < 12) return `${salam}، صباحك خير ☀️`;
    if (hour < 17) return `${salam} 🌿`;
    if (hour < 20) return `${salam}، مساؤك خير 🌆`;
    return `${salam}، طابت ليلتك 🌙`;
  }, []);

  const fridayCountdown = React.useMemo(() => {
    if (ctx.isFriday) return "اليوم الجمعة 🌿";
    if (ctx.daysToFriday === 1) return "غدًا الجمعة";
    if (ctx.daysToFriday === 2) return "بعد غدٍ الجمعة";
    return `الجمعة بعد ${ctx.daysToFriday} أيام`;
  }, [ctx.isFriday, ctx.daysToFriday]);

  const prayerCountdown = React.useMemo(() => {
    if (!ctx.nextPrayer || ctx.hoursToNextPrayer === null) return null;
    const h = ctx.hoursToNextPrayer;
    if (h < 1) return `${Math.max(1, Math.round(h * 60))} دقيقة حتى ${ctx.nextPrayer.nameAr}`;
    if (h < 3) return `${h.toFixed(1)} ساعة حتى ${ctx.nextPrayer.nameAr}`;
    return `${ctx.nextPrayer.nameAr} في ${ctx.nextPrayer.time}`;
  }, [ctx.nextPrayer, ctx.hoursToNextPrayer]);

  const primary = React.useMemo(() => {
    const hour = new Date().getHours();
    const morning = { icon: "☀️", label: "أذكار الصباح لم تكتمل بعد", action: "ابدأ", onClick: () => navigate("/c/morning") };
    const evening = { icon: "🌙", label: "أذكار المساء بانتظارك", action: "ابدأ", onClick: () => navigate("/c/evening") };
    if (!ctx.morningDone && hour < 12) return morning;
    if (!ctx.eveningDone && hour >= 15) return evening;
    if (ctx.ayahsReadToday < ctx.dailyGoal)
      return { icon: "📖", label: `وردك اليوم: ${ctx.ayahsReadToday} من ${ctx.dailyGoal} آية`, action: "أكمل", onClick: () => navigate("/quran") };
    if (!ctx.morningDone) return morning;
    if (!ctx.eveningDone) return evening;
    if (ctx.nextPrayer)
      return { icon: "🕌", label: `الصلاة القادمة: ${ctx.nextPrayer.nameAr} في ${ctx.nextPrayer.time}`, action: "المواقيت", onClick: () => navigate("/prayer-times") };
    return {
      icon: "📿",
      label: ctx.tasbeehToday > 0 ? `سبَّحت اليوم ${ctx.tasbeehToday} مرة — أكمل` : "افتتح وقتك بالتسبيح",
      action: "السبحة",
      onClick: () => navigate("/sebha"),
    };
  }, [ctx, navigate]);

  const refreshHistory = React.useCallback(async () => {
    setHistory(await listConversations());
  }, []);

  React.useEffect(() => { void refreshHistory(); }, [refreshHistory]);

  // Show onboarding if the user has never told the AI anything about themselves
  React.useEffect(() => {
    if (!profile.onboarded) setShowOnboarding(true);
  }, [profile.onboarded]);

  // Load deep-link question (?ask=…) on mount
  const [searchParams, setSearchParams] = useSearchParams();
  const askHandled = React.useRef(false);
  React.useEffect(() => {
    const ask = searchParams.get(ASK_PARAM);
    if (!ask || askHandled.current) return;
    askHandled.current = true;
    setSearchParams({}, { replace: true });
    if (isCompanionReady()) void send(ask);
    else setInput(ask);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Restore partial stream from a previous session if any
  React.useEffect(() => {
    const partial = loadPartialStream();
    if (partial && partial.text) {
      setMessages(partial.messages);
      setStreamingText(partial.text);
    }
  }, []);

  // Auto-scroll
  React.useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, streamingText]);

  // Save full conversation on every change
  React.useEffect(() => {
    if (messages.length === 0) return;
    if (!currentIdRef.current) {
      currentIdRef.current = newConversationId();
      createdAtRef.current = Date.now();
    }
    if (!currentTitleRef.current) currentTitleRef.current = titleFromMessages(messages);
    void saveConversation({
      id: currentIdRef.current,
      title: currentTitleRef.current,
      messages,
      createdAt: createdAtRef.current,
      updatedAt: Date.now(),
    }).then(refreshHistory);
  }, [messages, refreshHistory]);

  const persistPartial = React.useCallback((text: string) => {
    if (!currentIdRef.current) return;
    savePartialStream(currentIdRef.current, messages, text);
  }, [messages]);

  const generateFollowUps = React.useCallback((lastUser: string, reply: string): string[] => {
    const text = `${lastUser} ${reply}`.toLowerCase();
    const out: string[] = [];
    if (/صبر|ابتلاء|همّ|حزن/.test(text)) out.push("ادعُ لي بالصبر على الابتلاء");
    if (/شكر|حمد|سعادة/.test(text)) out.push("اقترح لي أذكارًا للشكر");
    if (/استغفر|توبة|ذنب/.test(text)) out.push("ما فضل الاستغفار في اليوم؟");
    if (/قرآن|تدبر|آية/.test(text)) out.push("اقترح آية قصيرة عن حالي");
    if (/صلاة|دعاء|ركوع/.test(text)) out.push("علِّمني دعاءً يقال بعد الصلاة");
    if (/سبح|تسبيح|ذكر/.test(text)) out.push("ما أفضل صيغ التسبيح الآن؟");
    while (out.length < 3) out.push(["حدثني عن حديث اليوم", "ما الخطوة التالية عمليًا؟", "ادعُ لي ولأهلي"][out.length] ?? "أعطني آية عن حالي");
    return Array.from(new Set(out)).slice(0, 3);
  }, []);

  const speakFinal = React.useCallback((text: string) => {
    if (!voiceOn) return;
    setIsSpeaking(true);
    speakArabic(text, true);
    const interval = window.setInterval(() => {
      if (!("speechSynthesis" in window) || !window.speechSynthesis.speaking) {
        window.clearInterval(interval);
        setIsSpeaking(false);
      }
    }, 250);
  }, [voiceOn]);

  const send = React.useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || busyRef.current) return;
    if (!isCompanionReady()) {
      toast("جاري تهيئة الرفيق…", { icon: "✨" });
      return;
    }

    busyRef.current = true;
    const controller = new AbortController();
    abortRef.current = controller;
    const history: CompanionMessage[] = [...messages, { role: "user", content: trimmed }];
    setMessages(history);
    setInput("");
    setStreamingText("");
    setVerification(null);
    setFollowUps([]);

    let acc = "";
    let done = false;
    try {
      await streamCompanionReply(
        history,
        {
          onText: (chunk) => {
            acc += chunk;
            setStreamingText(acc);
            persistPartial(acc);
          },
          onDone: (fullText, ver) => {
            done = true;
            setMessages((m) => [...m, { role: "assistant", content: fullText }]);
            setVerification(ver);
            setStreamingText(null);
            clearPartialStream();
            setFollowUps(generateFollowUps(trimmed, fullText));
            speakFinal(fullText);
          },
          onError: (err) => {
            toast.error(err.message);
            setStreamingText(null);
            clearPartialStream();
          },
        },
        controller.signal,
      );
    } finally {
      busyRef.current = false;
      abortRef.current = null;
      if (!done) {
        setStreamingText(null);
      }
    }
  }, [generateFollowUps, messages, persistPartial, speakFinal]);

  const stop = React.useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    busyRef.current = false;
    setStreamingText(null);
    stopSpeaking();
    setIsSpeaking(false);
  }, []);

  const startNewChat = React.useCallback(() => {
    currentIdRef.current = null;
    currentTitleRef.current = "";
    createdAtRef.current = Date.now();
    setMessages([]);
    setStreamingText(null);
    setInput("");
    setVerification(null);
    setFollowUps([]);
    clearPartialStream();
    setShowHistory(false);
  }, []);

  const loadConversation = React.useCallback((conv: CompanionConversation) => {
    currentIdRef.current = conv.id;
    currentTitleRef.current = conv.title;
    createdAtRef.current = conv.createdAt;
    setMessages(conv.messages);
    setStreamingText(null);
    setInput("");
    setVerification(null);
    setFollowUps([]);
    setShowHistory(false);
  }, []);

  const openConversation = React.useCallback((id: string) => {
    void getConversation(id).then((conv) => { if (conv) loadConversation(conv); });
  }, [loadConversation]);

  const commitRename = React.useCallback((id: string) => {
    const title = renameDraft.trim();
    setRenamingId(null);
    if (!title) return;
    if (id === currentIdRef.current) currentTitleRef.current = title;
    void renameConversation(id, title).then(refreshHistory);
  }, [renameDraft, refreshHistory]);

  const confirmDelete = React.useCallback((id: string) => {
    if (confirmDeleteId !== id) { setConfirmDeleteId(id); return; }
    setConfirmDeleteId(null);
    if (id === currentIdRef.current) startNewChat();
    void deleteConversation(id).then(refreshHistory);
  }, [confirmDeleteId, refreshHistory, startNewChat]);

  // Voice control
  const onVoiceClick = () => {
    if (!voiceLive.supported) {
      toast("المتصفح لا يدعم التعرف على الصوت", { icon: "🎙️" });
      return;
    }
    if (voiceLive.listening) {
      stopListening();
      return;
    }
    startListening(setVoiceLive);
  };
  React.useEffect(() => {
    if (!voiceLive.listening && voiceLive.transcript && !busyRef.current) {
      setInput(voiceLive.transcript);
    }
  }, [voiceLive.listening, voiceLive.transcript]);

  // Pin reply (stored locally only)
  const pinReply = (text: string) => {
    try {
      addPin(text);
      toast.success("حُفظ في الإجابات المثبَّتة");
    } catch {
      toast.error("تعذَّر الحفظ");
    }
  };

  // Share reply as an image
  const shareAsImage = async (text: string) => {
    try {
      const node = document.createElement("div");
      node.style.cssText = "padding:32px;background:linear-gradient(160deg,#0f3a2e,#1f6049);color:#fff;font-family:'Noto Naskh Arabic',serif;direction:rtl;width:520px;border-radius:24px;line-height:1.9;box-shadow:0 10px 60px rgba(0,0,0,.45)";
      node.innerHTML = `<div style="font-size:22px;font-weight:700;color:#a7f3d0;margin-bottom:14px">✨ أثر</div><div style="font-size:18px;white-space:pre-wrap">${text.replace(/</g, "&lt;")}</div><div style="margin-top:18px;font-size:12px;opacity:.6">athark.org</div>`;
      document.body.appendChild(node);
      const dataUrl = await toPng(node, { cacheBust: true, pixelRatio: 2 });
      document.body.removeChild(node);
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], `athar-${Date.now()}.png`, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "أثر" });
      } else {
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = `athar-${Date.now()}.png`;
        a.click();
      }
    } catch {
      toast.error("تعذَّر إنشاء الصورة");
    }
  };

  const filteredHistory = React.useMemo(() => {
    if (!historyQuery.trim()) return history;
    const f = new Fuse(history, { keys: ["title", "messages.content"], threshold: 0.4, ignoreLocation: true });
    return f.search(historyQuery).map((r) => r.item);
  }, [history, historyQuery]);

  const isBusy = streamingText !== null;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-44 pt-4" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-accent-15 border border-accent-35">
            <Sparkles className="h-5 w-5 text-[var(--accent)]" aria-hidden="true" />
          </span>
          <div>
            <h1 className="flex items-center gap-2 text-lg font-bold text-[var(--fg)]">
              أثر
            </h1>
            <p className="text-xs text-[var(--muted-2)]">
              رفيقك في الطريق إلى الله — يعرف رحلتك ويمشي معك خطوة خطوة
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button type="button"
            onClick={() => setShowHistory(true)}
            aria-label="المحادثات السابقة"
            className="rounded-xl border border-[var(--stroke)] bg-[var(--card)] p-2.5 hover:bg-[var(--card-2)] transition">
            <History className="h-4 w-4" aria-hidden="true" />
          </button>
          <button type="button"
            onClick={() => { clearMemory(); toast("تم مسح الذاكرة", { icon: "🧹" }); }}
            aria-label="مسح الذاكرة"
            className="rounded-xl border border-[var(--stroke)] bg-[var(--card)] p-2.5 hover:bg-[var(--card-2)] transition">
            <Sparkles className="h-4 w-4 opacity-70" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* History slide-over */}
      {showHistory ? (
        <div className="fixed inset-0 z-50 flex justify-start" dir="rtl">
          <button type="button" aria-label="إغلاق" onClick={() => setShowHistory(false)}
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
          <div className="relative flex h-full w-[92%] max-w-md flex-col bg-[var(--bg)] shadow-2xl">
            <div className="flex items-center justify-between gap-2 border-b border-[var(--stroke)] p-4">
              <div>
                <h2 className="text-sm font-bold">المحادثات السابقة</h2>
                <p className="text-[11px] text-[var(--muted-2)]">
                  {history.length === 0
                    ? "تبدأ رحلتك من هنا"
                    : `${history.length.toLocaleString("ar-EG")} محادثة محفوظة على جهازك`}
                </p>
              </div>
              <button type="button" onClick={() => setShowHistory(false)} aria-label="إغلاق"
                className="rounded-lg p-1.5 hover:bg-[var(--card-2)] transition">
                <XIcon className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="border-b border-[var(--stroke)] p-3 space-y-2">
              <div className="relative">
                <Search className="absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-50" aria-hidden="true" />
                <input
                  value={historyQuery}
                  onChange={(e) => setHistoryQuery(e.target.value)}
                  placeholder="ابحث في محادثاتك…"
                  className="form-field-readable w-full rounded-xl border border-[var(--stroke)] bg-[var(--card)] px-3 py-2 ps-3 pe-9 text-sm"
                  aria-label="بحث في المحادثات"
                />
              </div>
              <button type="button" onClick={startNewChat}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-[var(--accent)] px-3 py-2.5 text-sm font-bold text-black/80 active:scale-[0.99] transition">
                <Plus className="h-4 w-4" aria-hidden="true" /> محادثة جديدة
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-2 pb-4">
              {filteredHistory.length === 0 ? (
                <div className="px-4 py-10 text-center">
                  <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-accent-15 border border-accent-35 mb-3">
                    <Sparkles className="h-6 w-6 text-[var(--accent)]" aria-hidden="true" />
                  </div>
                  <p className="text-sm font-semibold">
                    {historyQuery ? "لا توجد نتائج" : "لا توجد محادثات بعد"}
                  </p>
                  <p className="mt-1 text-xs text-[var(--muted-2)]">
                    {historyQuery
                      ? "جرّب كلمة مختلفة أو افتح محادثة جديدة."
                      : "ابدأ أول محادثة مع «أثر» وستظهر هنا تلقائيًا."}
                  </p>
                </div>
              ) : (
                <HistoryGroups
                  conversations={filteredHistory}
                  currentId={currentIdRef.current}
                  renamingId={renamingId}
                  renameDraft={renameDraft}
                  onRenameDraftChange={setRenameDraft}
                  confirmDeleteId={confirmDeleteId}
                  query={historyQuery}
                  onOpen={openConversation}
                  onStartRename={(c) => { setRenamingId(c.id); setRenameDraft(c.title); }}
                  onCommitRename={commitRename}
                  onConfirmDelete={confirmDelete}
                  onExport={(c) => downloadConversation(c)}
                />
              )}
            </div>
          </div>
        </div>
      ) : null}

      {/* Onboarding card (first run only) */}
      {showOnboarding && messages.length === 0 ? (
        <OnboardingCard
          onDone={(patch) => {
            const next = updateProfile(patch);
            setProfile(next);
            setShowOnboarding(false);
            toast.success("تعريفنا عليك ساعد الرفيق يفهمك أكثر");
          }}
          initial={profile}
        />
      ) : null}

      {/* Welcome hero (only when no conversation yet and not onboarding) */}
      {messages.length === 0 && streamingText === null && !showOnboarding ? (
        <div className="mt-6 space-y-5">
          <div className="relative overflow-hidden rounded-3xl border border-accent-35 bg-accent-8 p-6 text-center">
            <div className="pointer-events-none absolute inset-0 -z-10 opacity-60"
              style={{ background: "radial-gradient(ellipse at top, color-mix(in srgb, var(--accent) 18%, transparent), transparent 65%)" }} />
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-accent-15 border border-accent-35 animate-pulse">
              <Sparkles className="h-8 w-8 text-[var(--accent)]" aria-hidden="true" />
            </div>
            <h2 className="mt-3 text-lg font-bold text-[var(--fg)]">
              {greeting}{profile.greetingName ? ` ${profile.greetingName}` : ""}
            </h2>
            <p className="mx-auto mt-1.5 max-w-md text-sm leading-relaxed text-[var(--muted)]">
              أنا <span className="font-semibold text-[var(--accent)]">أثر</span>، رفيقك في الطريق إلى الله.
              {ctx.streakDays > 1 ? ` سلسلتك ${ctx.streakDays.toLocaleString("ar-EG")} يوم 🔥 — ` : " "}
              بمَ أُعينك اليوم؟
            </p>
            {profile.onboarded ? (
              <p className="mt-1 text-[11px] text-[var(--muted-2)]">
                أنت {LEVEL_LABEL[profile.level]}
              </p>
            ) : null}
          </div>

          {/* Awareness strip: Friday countdown + prayer countdown + Hijri date */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded-full border border-[var(--stroke)] bg-[var(--card)] px-2.5 py-1 text-[11px] text-[var(--muted)]">
              🕌 {fridayCountdown}
            </span>
            {prayerCountdown ? (
              <span className="rounded-full border border-[var(--stroke)] bg-[var(--card)] px-2.5 py-1 text-[11px] text-[var(--muted)]">
                ⏰ {prayerCountdown}
              </span>
            ) : null}
            {ctx.hijriDate ? (
              <span className="rounded-full border border-accent-35 bg-accent-15 px-2.5 py-1 text-[11px] text-[var(--accent)]">
                {ctx.hijriDate}
              </span>
            ) : null}
          </div>

          {primary ? (
            <button type="button" onClick={primary.onClick}
              className="flex w-full items-center gap-3 rounded-2xl border border-[var(--stroke)] bg-[var(--card)] p-3.5 text-start transition hover:border-accent-35 active:scale-[0.99]">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent-15 text-lg" aria-hidden="true">{primary.icon}</span>
              <div className="min-w-0 flex-1">
                <div className="text-[11px] text-[var(--muted-2)]">خطوتك التالية الآن</div>
                <div className="truncate text-sm font-semibold text-[var(--fg)]">{primary.label}</div>
              </div>
              <span className="shrink-0 rounded-lg bg-accent-15 border border-accent-35 px-3 py-1 text-xs font-semibold text-[var(--accent)]">
                {primary.action}
              </span>
            </button>
          ) : null}

          {/* 7-day adherence mini-bar — gives Athar's "I see you" feel */}
          {ctx.adherenceWeek.some((d) => d.score > 0) ? (
            <div className="rounded-2xl border border-[var(--stroke)] bg-[var(--card)] px-3 py-2.5">
              <div className="mb-1.5 flex items-center justify-between text-[10.5px] text-[var(--muted-2)]">
                <span>أسبوعك (الأقدم → الأحدث)</span>
                <span>{ctx.streakDays} يوم متواصل</span>
              </div>
              <div className="flex items-end gap-1">
                {ctx.adherenceWeek.map((d) => {
                  const h = Math.min(28, Math.max(4, d.score * 4));
                  const isToday = d.dateISO === ctx.adherenceWeek[ctx.adherenceWeek.length - 1].dateISO;
                  return (
                    <div key={d.dateISO} className="flex flex-1 flex-col items-center gap-1">
                      <div
                        className={[
                          "w-full rounded-md transition-all",
                          d.score > 0 ? (isToday ? "bg-[var(--accent)]" : "bg-accent-35") : "bg-[var(--card-2)]",
                        ].join(" ")}
                        style={{ height: `${h}px` }}
                        title={`${d.weekdayAr}: ${d.score} نشاط`}
                      />
                      <span className={["text-[9px]", isToday ? "text-[var(--accent)] font-bold" : "text-[var(--muted-2)]"].join(" ")}>
                        {d.weekdayAr.slice(0, 3)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          <div>
            <div className="mb-2 px-1 text-xs text-[var(--muted)]">جرّب أن تسألني</div>
            <div className="flex flex-wrap gap-2">
              {new Date().getDay() === 5 ? (
                <button type="button"
                  onClick={() => void send(buildWeeklyReflectionPrompt())}
                  className="rounded-full border border-accent-35 bg-accent-15 px-3 py-1.5 text-xs font-semibold text-[var(--accent)] transition hover:bg-accent-15/80">
                  ✨ اكتب لي {FRIDAY}
                </button>
              ) : null}
              {QUICK_PROMPTS.map((q) => (
                <button type="button" key={q}
                  onClick={() => void send(q)}
                  className="rounded-full border border-[var(--stroke)] bg-[var(--card-2)] px-3 py-1.5 text-xs transition hover:border-accent-35">
                  {q}
                </button>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-1.5 text-[11px]">
              {MOOD_PROMPTS.map(([label, mood]) => (
                <button type="button" key={mood}
                  onClick={() => void send(label)}
                  className="rounded-xl border border-[var(--stroke)] bg-[var(--card)] px-2 py-1.5 text-start text-[var(--muted-2)] hover:bg-[var(--card-2)] transition">
                  {mood === "مضطرب" ? "😟" : mood === "مُفتَر" ? "🍂" : mood === "شاكر" ? "🤲" : mood === "تائب" ? "💧" : "🌙"} {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {/* Conversation */}
      <div className="mt-5 space-y-3" aria-live="polite">
        {messages.map((m, i) => (
          <MessageBubble key={i} role={m.role} text={m.content} onPin={() => pinReply(m.content)} onShare={() => shareAsImage(m.content)} />
        ))}
        {streamingText !== null ? (
          streamingText
            ? <MessageBubble role="assistant" text={streamingText} streaming />
            : <ThinkingIndicator onStop={stop} isSpeaking={isSpeaking} />
        ) : null}
        {followUps.length > 0 && !isBusy ? (
          <div className="mt-2 flex flex-wrap gap-2">
            {followUps.map((s) => (
              <button type="button" key={s}
                onClick={() => void send(s)}
                className="rounded-full border border-accent-35 bg-accent-15 px-3 py-1.5 text-xs text-[var(--accent)] hover:bg-accent-15/80 transition">
                {s}
              </button>
            ))}
          </div>
        ) : null}
        {verification?.flagged && !isBusy ? (
          <div className="mt-2 flex items-start gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <p className="font-semibold">تحقَّق من المصدر</p>
              <ul className="mt-1 list-inside list-disc">
                {verification.notes.map((n, i) => <li key={i}>{n}</li>)}
              </ul>
            </div>
          </div>
        ) : null}
        <div ref={endRef} />
      </div>

      {/* Composer */}
      <div className="fixed inset-x-0 z-40" style={{ bottom: "calc(var(--mobile-nav-height) + var(--sab) + 16px)" }}>
        <div className="mx-auto w-full max-w-3xl px-4">
          <div className="flex items-end gap-1.5 rounded-2xl border border-[var(--stroke)] bg-[var(--bg)]/95 p-2 shadow-2xl backdrop-blur-xl">
            <button type="button"
              onClick={onVoiceClick}
              aria-label={voiceLive.listening ? "إيقاف التسجيل" : "تسجيل صوتي"}
              className={[
                "grid h-10 w-10 shrink-0 place-items-center rounded-xl border transition",
                voiceLive.listening
                  ? "border-red-500/40 bg-red-500/15 text-red-400"
                  : "border-[var(--stroke)] bg-[var(--card)]",
              ].join(" ")}>
              {voiceLive.listening ? <MicOff className="h-4 w-4" aria-hidden="true" /> : <Mic className="h-4 w-4" aria-hidden="true" />}
            </button>
            <button type="button"
              onClick={() => { const nv = !voiceOn; setVoiceOn(nv); setVoiceEnabled(nv); if (!nv) stopSpeaking(); }}
              aria-label={voiceOn ? "إيقاف القراءة الصوتية" : "تشغيل القراءة الصوتية"}
              className={[
                "grid h-10 w-10 shrink-0 place-items-center rounded-xl border transition",
                voiceOn
                  ? "border-accent-35 bg-accent-15 text-[var(--accent)]"
                  : "border-[var(--stroke)] bg-[var(--card)] opacity-70",
              ].join(" ")}>
              {voiceOn ? <Volume2 className="h-4 w-4" aria-hidden="true" /> : <VolumeX className="h-4 w-4" aria-hidden="true" />}
            </button>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send(input);
                }
              }}
              rows={1}
              placeholder={voiceLive.listening ? "أستمع إليك…" : "اكتب سؤالك لرفيق أثر…"}
              aria-label="رسالتك"
              className="form-field-readable max-h-32 flex-1 resize-none rounded-xl border border-transparent bg-transparent px-3 py-2 text-sm focus:outline-none"
            />
            {isBusy ? (
              <button type="button"
                onClick={stop}
                aria-label="إيقاف"
                className="grid h-10 w-10 place-items-center rounded-xl border border-[var(--stroke)] bg-[var(--card)]">
                <XIcon className="h-4 w-4" aria-hidden="true" />
              </button>
            ) : (
              <button type="button"
                onClick={() => void send(input)}
                disabled={!input.trim()}
                aria-label="إرسال"
                className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--accent)] text-black/80 disabled:opacity-40 active:scale-95 transition">
                <Send className="h-4 w-4 -scale-x-100" aria-hidden="true" />
              </button>
            )}
          </div>
          <p className="mt-1.5 text-center text-[10px] text-[var(--muted-2)]">
            قد يخطئ الذكاء الاصطناعي — تحقَّق دائمًا من المصادر، واستشر أهل العلم في الفتوى.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ─── Onboarding ─────────────────────────────────────────────────────────── */

function OnboardingCard({ onDone, initial }: { onDone: (p: Partial<CompanionProfile>) => void; initial: CompanionProfile }) {
  const [level, setLevel] = React.useState<CompanionProfile["level"]>(initial.level);
  const [goals, setGoals] = React.useState<string[]>(initial.goals);
  const [name, setName] = React.useState(initial.greetingName);

  const toggleGoal = (g: string) =>
    setGoals((cur) => cur.includes(g) ? cur.filter((x) => x !== g) : [...cur, g]);

  return (
    <div className="mt-6 rounded-3xl border border-accent-35 bg-accent-8 p-5 space-y-4">
      <div>
        <h3 className="text-sm font-bold">عرّفني على نفسك بجملتين</h3>
        <p className="mt-1 text-xs text-[var(--muted)]">سيكون ردّي مُلائمًا أكثر إذا عرفتك قليلًا — لا أطلب اسمك الكامل ولا أي شيء حساس.</p>
      </div>

      <div>
        <div className="text-[11px] text-[var(--muted)] mb-1.5">اختر اسمًا مختصرًا (اختياري)</div>
        <input
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, 20))}
          placeholder="مثلًا: أبو عبدالله"
          className="form-field-readable w-full rounded-xl border border-[var(--stroke)] bg-[var(--card)] px-3 py-2 text-sm"
          aria-label="اسم مختصر"
        />
      </div>

      <div>
        <div className="text-[11px] text-[var(--muted)] mb-1.5">مستواك الآن</div>
        <div className="grid grid-cols-3 gap-2">
          {(["new", "regular", "advanced"] as const).map((l) => (
            <button type="button" key={l}
              onClick={() => setLevel(l)}
              className={[
                "rounded-xl border px-3 py-2 text-xs transition",
                level === l ? "border-accent-35 bg-accent-15 text-[var(--accent)]" : "border-[var(--stroke)] bg-[var(--card)]",
              ].join(" ")}>
              {l === "new" ? "مبتدئ" : l === "regular" ? "منتظم" : "متقدّم"}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="text-[11px] text-[var(--muted)] mb-1.5">ما الذي يهمّك هذه الفترة؟ (متعدّد)</div>
        <div className="flex flex-wrap gap-2">
          {([
            ["quran", "القرآن"], ["adhkar", "الأذكار"], ["consistency", "المواظبة"],
            ["learning", "تعلُّم العلم"], ["tarbiyah", "تزكية النفس"],
          ] as const).map(([k, label]) => (
            <button type="button" key={k}
              onClick={() => toggleGoal(k)}
              className={[
                "rounded-full border px-3 py-1.5 text-xs transition",
                goals.includes(k) ? "border-accent-35 bg-accent-15 text-[var(--accent)]" : "border-[var(--stroke)] bg-[var(--card)]",
              ].join(" ")}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <button type="button"
        onClick={() => onDone({ level, goals: goals.length ? (goals as CompanionProfile["goals"]) : ["consistency"], greetingName: name.trim(), onboarded: true, createdAt: Date.now() })}
        className="w-full rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-bold text-black/80 active:scale-95 transition">
        ابدأ الرحلة
      </button>
    </div>
  );
}

/* ─── Thinking indicator with stop button + speaking state ──────────────── */

function ThinkingIndicator({ onStop, isSpeaking }: { onStop: () => void; isSpeaking: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-accent-35 bg-accent-8 px-4 py-3.5">
      <div className="flex items-center gap-3">
        <span className="relative grid h-8 w-8 place-items-center rounded-full border border-accent-35 bg-accent-15">
          <span className="absolute inset-0 rounded-full bg-[var(--accent)]/30 animate-ping" />
          <Sparkles className="h-4 w-4 text-[var(--accent)]" aria-hidden="true" />
        </span>
        <div className="flex flex-col">
          <span className="text-xs font-semibold text-[var(--fg)]">أثر يفكّر…</span>
          <span className="text-[10px] text-[var(--muted-2)]">
            {isSpeaking ? "يُلقي عليك الإجابة صوتيًا" : "يقرأ سؤالك ويبحث في الموسوعة"}
          </span>
        </div>
      </div>
      <button type="button" onClick={onStop}
        className="flex items-center gap-1 rounded-lg border border-[var(--stroke)] bg-[var(--card)] px-2 py-1 text-[11px] text-[var(--muted)]">
        <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" /> إيقاف
      </button>
    </div>
  );
}

/* ─── Message bubble with share + pin ──────────────────────────────────── */

function MessageBubble(props: {
  role: "user" | "assistant";
  text: string;
  streaming?: boolean;
  onStop?: () => void;
  onPin?: () => void;
  onShare?: () => void;
}) {
  const isUser = props.role === "user";
  const [copied, setCopied] = React.useState(false);
  const copy = React.useCallback(async () => {
    try { await navigator.clipboard.writeText(props.text); setCopied(true); setTimeout(() => setCopied(false), 1600); } catch { /* ignore */ }
  }, [props.text]);

  if (isUser) {
    return (
      <div className="flex justify-start">
        <div className="max-w-[88%] whitespace-pre-wrap rounded-2xl rounded-br-md border border-accent-35 bg-accent-15 px-4 py-3 text-sm leading-relaxed">
          {props.text}
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-end gap-2">
      <div className="min-w-0 max-w-[88%]">
        <div className="rounded-2xl rounded-tl-md border border-[var(--stroke)] bg-[var(--card)] px-4 py-3 text-sm leading-relaxed">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
            {appLinksToMarkdown(props.text)}
          </ReactMarkdown>
          {props.streaming ? <span className="inline-block animate-pulse"> ▍</span> : null}
        </div>
        {!props.streaming && props.text.trim() ? (
          <div className="mt-1.5 flex items-center gap-1 px-1 text-[11px] text-[var(--muted-2)]">
            <button type="button" onClick={copy} className="flex items-center gap-1 hover:text-[var(--fg)] transition" aria-label="نسخ الرد">
              {copied ? <Check className="h-3 w-3 text-[var(--ok)]" aria-hidden="true" /> : <Copy className="h-3 w-3" aria-hidden="true" />}
              {copied ? "نُسخ" : "نسخ"}
            </button>
            <span className="opacity-30">·</span>
            <button type="button" onClick={props.onPin} className="flex items-center gap-1 hover:text-[var(--fg)] transition" aria-label="حفظ في المفضلة">
              <Pin className="h-3 w-3" aria-hidden="true" /> حفظ
            </button>
            <span className="opacity-30">·</span>
            <button type="button" onClick={props.onShare} className="flex items-center gap-1 hover:text-[var(--fg)] transition" aria-label="مشاركة كصورة">
              <ImageIcon className="h-3 w-3" aria-hidden="true" /> صورة
            </button>
          </div>
        ) : null}
      </div>
      <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center self-start rounded-xl bg-accent-15 border border-accent-35">
        <Sparkles className="h-4 w-4 text-[var(--accent)]" aria-hidden="true" />
      </span>
    </div>
  );
}

/* ─── Markdown renderer (chips for routes, real links otherwise) ───────── */

const markdownComponents: Components = {
  a: ({ href, children }) => {
    const to = href ?? "";
    if (to.startsWith("/")) {
      return (
        <Link to={to} className="mx-0.5 inline-block rounded-lg bg-accent-15 px-2 py-0.5 text-xs font-semibold text-[var(--accent)] underline-offset-2 hover:underline">
          {children}
        </Link>
      );
    }
    return (
      <a href={to} target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] underline underline-offset-2">
        {children}
      </a>
    );
  },
  h1: ({ children }) => <h3 className="mb-1.5 mt-2 text-base font-bold text-[var(--fg)] first:mt-0">{children}</h3>,
  h2: ({ children }) => <h4 className="mb-1.5 mt-2 text-[15px] font-bold text-[var(--fg)] first:mt-0">{children}</h4>,
  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
  strong: ({ children }) => <strong className="font-bold text-[var(--fg)]">{children}</strong>,
  ul: ({ children }) => <ul className="mb-2 me-4 list-disc space-y-1 last:mb-0">{children}</ul>,
  ol: ({ children }) => <ol className="mb-2 me-4 list-decimal space-y-1 last:mb-0">{children}</ol>,
  blockquote: ({ children }) => (
    <blockquote className="my-2 border-e-2 border-accent-35 pe-3 text-[var(--muted)]">{children}</blockquote>
  ),
  em: ({ children }) => <em className="italic text-[var(--fg)]">{children}</em>,
  code: ({ children }) => <code className="rounded bg-[var(--card-2)] px-1 py-0.5 font-mono text-[12px]" dir="ltr">{children}</code>,
  pre: ({ children }) => <pre className="my-2 overflow-x-auto rounded-lg bg-[var(--card-2)] p-3 text-xs leading-6" dir="ltr">{children}</pre>,
  hr: () => <hr className="my-3 border-[var(--stroke)]" />,
};

/* ─── Conversation history grouping + export helpers (in lib) ────────────── */

function downloadConversation(conv: CompanionConversation): void {
  try {
    const blob = new Blob([exportConversationText(conv)], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `athar-${conv.id.slice(2, 10)}.txt`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast.success("تم تنزيل المحادثة");
  } catch {
    toast.error("تعذَّر تصدير المحادثة");
  }
}

function HistoryGroups(props: {
  conversations: CompanionConversation[];
  currentId: string | null;
  renamingId: string | null;
  renameDraft: string;
  onRenameDraftChange: (v: string) => void;
  confirmDeleteId: string | null;
  query: string;
  onOpen: (id: string) => void;
  onStartRename: (c: CompanionConversation) => void;
  onCommitRename: (id: string) => void;
  onConfirmDelete: (id: string) => void;
  onExport: (c: CompanionConversation) => void;
}) {
  const groups = React.useMemo(() => groupConversationsByRecency(props.conversations), [props.conversations]);
  if (groups.length === 0) return null;
  return (
    <div className="space-y-4 pt-2">
      {groups.map((g) => (
        <section key={g.key}>
          <header className="sticky top-0 z-[1] -mx-2 mb-1.5 bg-[var(--bg)]/95 px-3 py-1 backdrop-blur-sm">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-2)]">
              <span>{g.label}</span>
              <span className="text-[var(--muted-2)]/60">·</span>
              <span>{g.items.length.toLocaleString("ar-EG")}</span>
            </div>
          </header>
          <div className="space-y-1.5">
            {g.items.map((conv) => (
              <HistoryItem
                key={conv.id}
                conv={conv}
                isCurrent={conv.id === props.currentId}
                isRenaming={props.renamingId === conv.id}
                renameDraft={props.renameDraft}
                onRenameDraftChange={props.onRenameDraftChange}
                confirmDelete={props.confirmDeleteId === conv.id}
                query={props.query}
                onOpen={() => props.onOpen(conv.id)}
                onStartRename={() => props.onStartRename(conv)}
                onCommitRename={() => props.onCommitRename(conv.id)}
                onConfirmDelete={() => props.onConfirmDelete(conv.id)}
                onExport={() => props.onExport(conv)}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function HistoryItem(props: {
  conv: CompanionConversation;
  isCurrent: boolean;
  isRenaming: boolean;
  renameDraft: string;
  onRenameDraftChange: (v: string) => void;
  confirmDelete: boolean;
  query: string;
  onOpen: () => void;
  onStartRename: () => void;
  onCommitRename: () => void;
  onConfirmDelete: () => void;
  onExport: () => void;
}) {
  const preview = React.useMemo(() => previewSnippet(props.conv), [props.conv]);
  return (
    <div
      className={[
        "rounded-2xl border transition",
        props.isCurrent ? "border-accent-35 bg-accent-15" : "border-[var(--stroke)] bg-[var(--card)] hover:border-accent-35/60",
      ].join(" ")}
    >
      {props.isRenaming ? (
        <div className="flex items-center gap-1.5 px-3 py-2.5">
          <input
            autoFocus
            value={props.renameDraft}
            onChange={(e) => props.onRenameDraftChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") props.onCommitRename(); if (e.key === "Escape") props.onOpen(); }}
            className="form-field-readable flex-1 rounded-lg border border-[var(--stroke)] px-2 py-1 text-xs"
          />
          <button type="button" onClick={props.onCommitRename} aria-label="حفظ الاسم" className="rounded-lg p-1.5 hover:bg-[var(--card-2)]">
            <Check className="h-3.5 w-3.5 text-[var(--ok)]" aria-hidden="true" />
          </button>
        </div>
      ) : (
        <button type="button" onClick={props.onOpen} className="block w-full px-3 py-2.5 text-start">
          <div className="flex items-start gap-2">
            <span className="mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-accent-15 border border-accent-35">
              <MessageSquareQuote className="h-3.5 w-3.5 text-[var(--accent)]" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-semibold">{props.conv.title}</span>
                {props.isCurrent ? (
                  <span className="shrink-0 rounded-full bg-accent-15 border border-accent-35 px-1.5 py-0.5 text-[9px] font-bold text-[var(--accent)]">
                    الحالية
                  </span>
                ) : null}
              </div>
              {preview ? (
                <div className="mt-1 line-clamp-2 text-[11.5px] leading-5 text-[var(--muted)]">{preview}</div>
              ) : null}
              <div className="mt-1.5 flex items-center gap-2 text-[10.5px] text-[var(--muted-2)]">
                <span>{relativeTime(props.conv.updatedAt)}</span>
                <span className="opacity-40">·</span>
                <span>{props.conv.messages.length.toLocaleString("ar-EG")} رسالة</span>
              </div>
            </div>
          </div>
        </button>
      )}
      {!props.isRenaming ? (
        <div className="flex items-center gap-0.5 border-t border-[var(--stroke)] px-2 py-1">
          <button type="button"
            onClick={props.onStartRename}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] text-[var(--muted)] hover:text-[var(--fg)] hover:bg-[var(--card-2)] transition">
            <Pencil className="h-3 w-3" aria-hidden="true" /> تسمية
          </button>
          <button type="button"
            onClick={props.onExport}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] text-[var(--muted)] hover:text-[var(--fg)] hover:bg-[var(--card-2)] transition">
            <Download className="h-3 w-3" aria-hidden="true" /> تصدير
          </button>
          <span className="flex-1" />
          <button type="button"
            onClick={props.onConfirmDelete}
            className={[
              "flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] transition",
              props.confirmDelete ? "bg-[var(--danger)]/15 text-[var(--danger)]" : "text-[var(--muted)] hover:text-[var(--danger)] hover:bg-[var(--card-2)]",
            ].join(" ")}>
            {props.confirmDelete ? "تأكيد الحذف؟" : "حذف"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
