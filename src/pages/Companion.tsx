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
  AlertCircle, MessageSquareQuote, Download, Star, Trash2,
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
  type PersistedToolCall,
} from "@/lib/companionAI";
import {
  splitIntoSegments,
} from "@/lib/companionBlocks";
import {
  exportConversationText,
  groupConversationsByRecency,
  previewSnippet,
  type HistoryLayout,
} from "@/lib/companionHistoryGroup";
import {
  addPin,
  clearAllConversations,
  deleteConversation,
  getConversation,
  listConversations,
  newConversationId,
  pinConversation,
  renameConversation,
  removePin,
  saveConversation,
  savePartialStream,
  loadPartialStream,
  clearPartialStream,
  listPins,
  titleFromMessages,
  type CompanionConversation,
  type PinnedReply,
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
import { useNoorStore } from "@/store/noorStore";

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
  const [showPins, setShowPins] = React.useState(false);
  const [pins, setPins] = React.useState<PinnedReply[]>(() => listPins());
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

  // Bridge action buttons (rendered from markdown) → react-router navigation
  React.useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ route: string }>).detail;
      if (detail?.route) navigate(detail.route);
    };
    window.addEventListener("athar-companion-navigate", handler);
    return () => window.removeEventListener("athar-companion-navigate", handler);
  }, [navigate]);

  const greeting = React.useMemo(() => {
    const salam = "السلام عليكم";
    const name = profile.greetingName ? ` يا ${profile.greetingName}` : "";
    const weekdayName = ctx.weekdayAr.replace(/^يوم\s*/, "");
    switch (ctx.timePhase) {
      case "qiyam": return `${salam}${name} — قيام مبارك، ربي يقبل منك 🌙`;
      case "fajr-pre": return `${salam}${name} — أظنّك ساهر الليلة، ثَبِّتْك الله 🌙`;
      case "fajr": return `${salam}${name}، صباحٌ مبارك — أذكار الصباح تُفتحِك على يومٍ طيّب ☀️`;
      case "duha": return `${salam}${name}، الضحى حلو، لو تسبّح قبل أن تنشغل يكون يومك أنور 🌿`;
      case "dhuhr": return `${salam}${name} — وقتٌ مبارك، احفظ سورة قصيرة الآن وتأملها قبل المغرب 🌤️`;
      case "asr": return `${salam}${name}، العصر يكاد يدخل — ختمها قبل أن تُفوتك 🌇`;
      case "maghrib": return `${salam}${name}، أُفطرت تقبّل الله، لو تقرأ آية الكرسي قبل النوم فعلاً 🌆`;
      case "isha": return `${salam}${name}، ليلةٌ طيبة، أذكار النوم الآن قبل أن يسبقك النعاس 🌙`;
      case "late-night": return `${salam}${name} — تأخّرت الليلة، ولو «سبحان الله» ثلاثين مرة فقد جبرتها ✨`;
      default: return `${salam}${name}، ${weekdayName} مبارك ✨`;
    }
  }, [ctx.timePhase, ctx.weekdayAr, profile.greetingName]);

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
    const text = `${lastUser} ${reply}`;
    const lower = text.toLowerCase();
    const candidates: Array<[RegExp, string]> = [
      [/صبر|ابتلاء|همّ|حزن|مصيبة/, "ادعُ لي بالصبر على الابتلاء"],
      [/شكر|حمد|سعادة|فرح/, "اقترح لي أذكارًا للشكر"],
      [/استغفر|توبة|ذنب|مقصّر/, "علّمني بابًا من أبواب التوبة العمليّة"],
      [/آية|تدبر|قرآن|سورة/, "اقترح آية قصيرة عن حالي"],
      [/صلاة|ركوع|سجود|إمام/, "علِّمني دعاءً يقال بعد الصلاة"],
      [/سبح|تسبيح|ذكر|استغفار/, "ما أفضل صيغ التسبيح الآن؟"],
      [/موت|ميت|فقد|فقدت/, "ادعُ لي ولأهلي ولمن فقدتهم"],
      [/قلق|خوف|همّ|ضيق|أرق/, "اقترح دعاءً يصرف الهم"],
      [/دراسة|امتحان|دراسة|عمل/, "ادعُ لي بالتيسير والتوفيق"],
      [/زواج|خطبة|زوجه/, "اقترح دعاءً للتوفيق في أمر الزواج"],
      [/رزق|مال|عمل/, "ما أفضل دعاء لتوسعة الرزق؟"],
      [/ابن|بنت|ولد|أطفال/, "علّمني كيف أعلّم أطفالي الصلاة"],
      [/بر|أم|أب|والدين/, "ما فضل بر الوالدين عمليًا؟"],
    ];
    const matches = candidates.filter(([re]) => re.test(lower)).map(([, q]) => q);
    const fallbacks = ["اقترح آية قصيرة عن حالي", "علِّمني دعاءً مأثورًا اليومي", "ادعُ لي ولأهلي"];
    const out: string[] = [];
    for (const q of [...matches, ...fallbacks]) {
      if (!out.includes(q)) out.push(q);
      if (out.length === 3) break;
    }
    return out;
  }, []);

  const speakFinal = React.useCallback((text: string) => {
    if (!voiceOn) return;
    setIsSpeaking(true);
    // Strip markdown syntax so the TTS engine doesn't read brackets, links,
    // or backtick fences aloud. Only "text" segments are spoken; callouts
    // and action blocks become short Arabic summaries.
    const segments = splitIntoSegments(text);
    const parts: string[] = [];
    for (const seg of segments) {
      if (seg.kind === "text") {
        const cleaned = seg.text
          .replace(/\[\/?route[^\]]*\]/gi, " ")
          .replace(/\[[^\]]+\]\([^)]+\)/g, " ")
          .replace(/```[\s\S]*?```/g, " ")
          .replace(/`[^`]+`/g, " ")
          .replace(/[#*_>~|]/g, " ")
          .replace(/\s{2,}/g, " ")
          .trim();
        if (cleaned) parts.push(cleaned);
      }
    }
    const speakable = parts.join(" ").trim() || text.replace(/[#*_>`]/g, " ").trim();
    speakArabic(speakable, true);
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
            if (acc.trim()) {
              setMessages((m) => [...m, { role: "assistant", content: acc }]);
              setPartialStopped(true);
            }
            setStreamingText(null);
            clearPartialStream();
          },
          onToolCalls: (calls: PersistedToolCall[]) => {
            for (const c of calls) {
              if (c.name !== "create_reminder") continue;
              const repeatRaw = typeof c.input.repeat === "string" ? c.input.repeat : "once";
              const repeat = (VALID_REPEATS_PAGE as string[]).includes(repeatRaw)
                ? (repeatRaw as ParsedReminderView["repeat"])
                : "once";
              const categoryRaw = typeof c.input.category === "string" ? c.input.category : "";
              const category = (VALID_CATEGORIES_PAGE as string[]).includes(categoryRaw)
                ? (categoryRaw as ParsedReminderView["category"])
                : "custom";
              const anchorRaw = typeof c.input.anchorKey === "string" ? c.input.anchorKey : "";
              const anchorKey = (VALID_ANCHORS_PAGE as string[]).includes(anchorRaw)
                ? (anchorRaw as NonNullable<ParsedReminderView["anchorKey"]>)
                : undefined;
              let deeplink: ParsedReminderView["deeplink"] = undefined;
              if (c.input.deeplink && typeof c.input.deeplink === "object") {
                const d = c.input.deeplink as { route?: unknown; hash?: unknown };
                if (typeof d.route === "string") deeplink = { route: d.route, hash: typeof d.hash === "string" ? d.hash : undefined };
              } else if (typeof c.input.deeplink === "string" && c.input.deeplink.startsWith("/")) {
                deeplink = { route: c.input.deeplink };
              }
              const parsed: ParsedReminderView = {
                id: `tool_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
                category,
                title: typeof c.input.title === "string" ? c.input.title : "",
                description: typeof c.input.description === "string" ? c.input.description : undefined,
                repeat,
                atTimeOfDay: typeof c.input.atTimeOfDay === "string" ? c.input.atTimeOfDay : undefined,
                anchorKey,
                anchorOffsetMinutes: typeof c.input.anchorOffsetMinutes === "number" ? c.input.anchorOffsetMinutes : undefined,
                deeplink,
                suggestion: typeof c.input.suggestion === "string" ? c.input.suggestion : undefined,
              };
              dispatchCreateReminderPage(parsed);
            }
          },
        },
        controller.signal,
      );
    } finally {
      busyRef.current = false;
      abortRef.current = null;
      if (!done) {
        if (acc.trim()) {
          // User hit Stop — keep the partial reply so they can copy/resume.
          setMessages((m) => [...m, { role: "assistant", content: acc }]);
          setPartialStopped(true);
        }
        setStreamingText(null);
        clearPartialStream();
      }
    }
  }, [generateFollowUps, messages, persistPartial, speakFinal]);

  const [partialStopped, setPartialStopped] = React.useState(false);

  const stop = React.useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    busyRef.current = false;
    setStreamingText(null);
    stopSpeaking();
    setIsSpeaking(false);
    setPartialStopped(true);
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
      setPins(listPins());
      toast.success("حُفظ في الإجابات المثبَّتة");
    } catch {
      toast.error("تعذَّر الحفظ");
    }
  };

  const deletePin = (id: string) => {
    try {
      removePin(id);
      setPins(listPins());
    } catch {
      toast.error("تعذَّر الحذف");
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
    // Normalise the query: strip diacritics + leading الـ so Arabic articles
    // don't block matches. Fuse's threshold is loosened slightly for the
    // morphology differences between common Arabic spellings.
    const normalizedQuery = historyQuery
      .replace(/[\u064B-\u0652\u0670\u0640]/g, "")
      .replace(/^ال/, "");
    const f = new Fuse(history, { keys: ["title", "messages.content"], threshold: 0.3, ignoreLocation: true });
    return f.search(normalizedQuery || historyQuery).map((r) => r.item);
  }, [history, historyQuery]);

  const togglePinConversation = React.useCallback(async (conv: CompanionConversation) => {
    const next = !conv.pinned;
    setHistory((cur) => cur.map((c) => c.id === conv.id ? { ...c, pinned: next, pinnedAt: next ? Date.now() : undefined } : c));
    if (currentIdRef.current === conv.id) {
      setMessages((m) => m);
    }
    await pinConversation(conv.id, next);
  }, []);

  const historyLayout = React.useMemo(() => groupConversationsByRecency(filteredHistory), [filteredHistory]);

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
            onClick={() => setShowPins(true)}
            aria-label="الإجابات المثبَّتة"
            className="relative rounded-xl border border-[var(--stroke)] bg-[var(--card)] p-2.5 hover:bg-[var(--card-2)] transition">
            <Pin className="h-4 w-4" aria-hidden="true" />
            {pins.length > 0 ? (
              <span className="absolute -top-1 -end-1 grid h-4 min-w-4 place-items-center rounded-full bg-[var(--accent)] px-1 text-[9px] font-bold text-black">
                {pins.length.toLocaleString("ar-EG")}
              </span>
            ) : null}
          </button>
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
              {history.length > 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    if (typeof window !== "undefined" && !window.confirm("هل تريد فعلًا مسح كل المحادثات؟ لا يمكن التراجع.")) return;
                    void clearAllConversations().then(() => { startNewChat(); void refreshHistory(); });
                  }}
                  className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-[var(--stroke)] px-3 py-2 text-xs font-semibold text-[var(--muted)] hover:bg-red-500/10 hover:text-red-500 transition"
                  aria-label="مسح كل المحادثات"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> مسح كل المحادثات
                </button>
              ) : null}
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
                  layout={historyLayout}
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
                  onTogglePin={togglePinConversation}
                />
              )}
            </div>

            {/* Companion status footer — local-only data summary */}
            <div
              data-testid="athar-companion-status-footer"
              className="flex items-center justify-between gap-2 border-t border-[var(--stroke)] bg-[var(--card)]/60 px-4 py-2.5 text-[10.5px] text-[var(--muted)] backdrop-blur"
            >
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
                <span className="font-semibold text-[var(--fg)]">حالة الرفيق</span>
              </span>
              <span className="flex items-center gap-3 tabular-nums">
                <span>
                  <span className="opacity-60">المحادثات:</span>{" "}
                  <span data-testid="athar-status-conv-count" className="font-semibold text-[var(--fg)]">
                    {history.length.toLocaleString("ar-EG")}
                  </span>
                </span>
                <span className="opacity-30">·</span>
                <span>
                  <span className="opacity-60">المثبَّتة:</span>{" "}
                  <span data-testid="athar-status-pinned-count" className="font-semibold text-amber-300">
                    {history.filter((c) => c.pinned).length.toLocaleString("ar-EG")}
                  </span>
                </span>
              </span>
            </div>
          </div>
        </div>
      ) : null}

      {/* Pinned replies slide-over */}
      {showPins ? (
        <div className="fixed inset-0 z-50 flex justify-start" dir="rtl">
          <button type="button" aria-label="إغلاق" onClick={() => setShowPins(false)}
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
          <div className="relative flex h-full w-[92%] max-w-md flex-col bg-[var(--bg)] shadow-2xl">
            <div className="flex items-center justify-between gap-2 border-b border-[var(--stroke)] p-4">
              <div>
                <h2 className="flex items-center gap-1.5 text-sm font-bold">
                  <Pin className="h-4 w-4 text-amber-300" aria-hidden="true" />
                  الإجابات المثبَّتة
                </h2>
                <p className="text-[11px] text-[var(--muted-2)]">
                  {pins.length === 0
                    ? "لم تثبّت أي إجابة بعد"
                    : `${pins.length.toLocaleString("ar-EG")} إجابة محفوظة على جهازك`}
                </p>
              </div>
              <button type="button" onClick={() => setShowPins(false)} aria-label="إغلاق"
                className="rounded-lg p-1.5 hover:bg-[var(--card-2)] transition">
                <XIcon className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
              {pins.length === 0 ? (
                <div className="px-4 py-10 text-center">
                  <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-amber-500/15 border border-amber-300/30 mb-3">
                    <Pin className="h-6 w-6 text-amber-300" aria-hidden="true" />
                  </div>
                  <p className="text-sm font-semibold">لا توجد إجابات مثبَّتة</p>
                  <p className="mt-1 text-xs text-[var(--muted-2)]">اضغط «حفظ» تحت أي رد من «أثر» لتثبيته هنا ومراجعته لاحقًا.</p>
                </div>
              ) : (
                pins.map((p) => (
                  <PinnedReplyCard key={p.id} pin={p} onDelete={() => deletePin(p.id)} />
                ))
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
          onSkip={() => {
            // Mark onboarded so we don't show the card again, but keep the
            // default profile so the AI still has a baseline to work from.
            const next = updateProfile({ onboarded: true });
            setProfile(next);
            setShowOnboarding(false);
          }}
          initial={profile}
        />
      ) : null}

      {/* Welcome hero (only when no conversation yet and not onboarding) */}
      {messages.length === 0 && streamingText === null && !showOnboarding ? (
        <div className="mt-3 space-y-3.5">
          <div className="relative overflow-hidden rounded-2xl border border-accent-35 bg-accent-8 p-4 text-center">
            <div className="pointer-events-none absolute inset-0 -z-10 opacity-60"
              style={{ background: "radial-gradient(ellipse at top, color-mix(in srgb, var(--accent) 18%, transparent), transparent 65%)" }} />
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-accent-15 border border-accent-35 animate-pulse">
              <Sparkles className="h-6 w-6 text-[var(--accent)]" aria-hidden="true" />
            </div>
            <h2 className="mt-2 text-base font-bold text-[var(--fg)]">
              {greeting}
            </h2>
            <p className="mx-auto mt-1 max-w-md text-[13px] leading-relaxed text-[var(--muted)]">
              أنا <span className="font-semibold text-[var(--accent)]">أثر</span>، رفيقك في الطريق إلى الله.
              {ctx.streakDays > 1 ? ` سلسلتك ${ctx.streakDays.toLocaleString("ar-EG")} يوم 🔥 — ` : " "}
              بمَ أُعينك اليوم؟
            </p>
            {profile.onboarded ? (
              <p className="mt-0.5 text-[10.5px] text-[var(--muted-2)]">
                أنت {LEVEL_LABEL[profile.level]}
              </p>
            ) : null}
          </div>

          {/* Awareness strip: Friday countdown + prayer countdown + Hijri date */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded-full border border-[var(--stroke)] bg-[var(--card)] px-2.5 py-0.5 text-[10.5px] text-[var(--muted)]">
              🕌 {fridayCountdown}
            </span>
            {prayerCountdown ? (
              <span className="rounded-full border border-[var(--stroke)] bg-[var(--card)] px-2.5 py-0.5 text-[10.5px] text-[var(--muted)]">
                ⏰ {prayerCountdown}
              </span>
            ) : null}
            {ctx.hijriDate ? (
              <span className="rounded-full border border-accent-35 bg-accent-15 px-2.5 py-0.5 text-[10.5px] text-[var(--accent)]">
                {ctx.hijriDate}
              </span>
            ) : null}
          </div>

          {primary ? (
            <button type="button" onClick={primary.onClick}
              className="flex w-full items-center gap-2.5 rounded-xl border border-[var(--stroke)] bg-[var(--card)] p-2.5 text-start transition hover:border-accent-35 active:scale-[0.99]">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent-15 text-base" aria-hidden="true">{primary.icon}</span>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] text-[var(--muted-2)]">خطوتك التالية الآن</div>
                <div className="truncate text-[12.5px] font-semibold text-[var(--fg)]">{primary.label}</div>
              </div>
              <span className="shrink-0 rounded-md bg-accent-15 border border-accent-35 px-2.5 py-0.5 text-[11px] font-semibold text-[var(--accent)]">
                {primary.action}
              </span>
            </button>
          ) : null}

          {/* 7-day adherence mini-bar — gives Athar's "I see you" feel */}
          {ctx.adherenceWeek.some((d) => d.score > 0) ? (
            <div className="rounded-xl border border-[var(--stroke)] bg-[var(--card)] px-2.5 py-2">
              <div className="mb-1 flex items-center justify-between text-[10px] text-[var(--muted-2)]">
                <span>أسبوعك (الأقدم → الأحدث)</span>
                <span>{ctx.streakDays} يوم متواصل</span>
              </div>
              <div className="flex items-end gap-1">
                {ctx.adherenceWeek.map((d) => {
                  const h = Math.min(24, Math.max(4, d.score * 4));
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
                      <span className={["text-[8.5px]", isToday ? "text-[var(--accent)] font-bold" : "text-[var(--muted-2)]"].join(" ")}>
                        {d.weekdayAr.slice(0, 3)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          <div>
            <div className="mb-1.5 px-1 text-[10.5px] text-[var(--muted)]">جرّب أن تسألني</div>
            <div className="flex flex-wrap gap-1.5">
              {new Date().getDay() === 5 ? (
                <button type="button"
                  onClick={() => void send(buildWeeklyReflectionPrompt())}
                  className="rounded-full border border-accent-35 bg-accent-15 px-2.5 py-1 text-[11.5px] font-semibold text-[var(--accent)] transition hover:bg-accent-15/80">
                  ✨ {FRIDAY}
                </button>
              ) : null}
              {QUICK_PROMPTS.map((q) => (
                <button type="button" key={q}
                  onClick={() => void send(q)}
                  className="rounded-full border border-[var(--stroke)] bg-[var(--card-2)] px-2.5 py-1 text-[11.5px] transition hover:border-accent-35">
                  {q}
                </button>
              ))}
            </div>
            <div className="mt-2 grid grid-cols-2 gap-1 text-[10.5px]">
              {MOOD_PROMPTS.map(([label, mood]) => (
                <button type="button" key={mood}
                  onClick={() => void send(label)}
                  className="rounded-lg border border-[var(--stroke)] bg-[var(--card)] px-2 py-1.5 text-start text-[var(--muted-2)] hover:bg-[var(--card-2)] transition">
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
            ? <MessageBubble role="assistant" text={streamingText} streaming tokens={countTokens(streamingText)} />
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
        {partialStopped && !isBusy ? (
          <div className="mt-2 flex items-center gap-2 rounded-2xl border border-white/10 bg-[var(--card)] px-3 py-1.5 text-[11px] text-[var(--muted)]">
            <XIcon className="h-3 w-3" aria-hidden="true" />
            <span>اكتمل جزئيًا — أوقفت الرد قبل انتهائه.</span>
            <button type="button" onClick={() => setPartialStopped(false)} className="ms-auto text-[var(--accent)] hover:underline">إخفاء</button>
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

function OnboardingCard({ onDone, onSkip, initial }: { onDone: (p: Partial<CompanionProfile>) => void; onSkip: () => void; initial: CompanionProfile }) {
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
      <button type="button"
        onClick={onSkip}
        className="w-full text-[11px] text-[var(--muted-2)] hover:text-[var(--accent)] transition">
        أكمل لاحقًا
      </button>
    </div>
  );
}

/* ─── Thinking indicator with stop button + speaking state ──────────────── */

function ThinkingIndicator({ onStop, isSpeaking }: { onStop: () => void; isSpeaking: boolean }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-accent-35 bg-gradient-to-br from-accent-15 via-[var(--card)] to-[var(--card)] px-4 py-3.5 shadow-[0_0_24px_-6px_var(--accent)]">
      {/* Sweeping gradient stripe */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 -start-1/2 w-1/2 bg-gradient-to-r from-transparent via-[var(--accent)]/15 to-transparent"
        style={{ animation: "athar-thinking-sweep 2.4s ease-in-out infinite" }}
      />
      <div className="relative flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* Concentric gradient orb */}
          <span className="relative grid h-10 w-10 place-items-center rounded-full">
            <span
              className="absolute inset-0 rounded-full opacity-60"
              style={{
                background: "conic-gradient(from 0deg, var(--accent), color-mix(in srgb, var(--accent) 30%, transparent), var(--accent))",
                animation: "athar-orb-spin 3s linear infinite",
                filter: "blur(2px)",
              }}
            />
            <span className="absolute inset-1 rounded-full bg-gradient-to-br from-emerald-300/40 via-emerald-500/30 to-teal-500/30 backdrop-blur" />
            <Sparkles className="relative h-4 w-4 text-emerald-100" aria-hidden="true" />
          </span>
          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-[var(--fg)]">
              {isSpeaking ? "يلقيها عليك صوتيًا" : "يفكّر معك الآن"}
            </span>
            <span className="text-[10px] text-[var(--muted-2)] flex items-center gap-1">
              <span
                className="inline-block h-1 w-1 rounded-full bg-[var(--accent)]"
                style={{ animation: "athar-pulse 1.2s ease-in-out infinite" }}
              />
              <span
                className="inline-block h-1 w-1 rounded-full bg-[var(--accent)]"
                style={{ animation: "athar-pulse 1.2s ease-in-out infinite", animationDelay: "0.15s" }}
              />
              <span
                className="inline-block h-1 w-1 rounded-full bg-[var(--accent)]"
                style={{ animation: "athar-pulse 1.2s ease-in-out infinite", animationDelay: "0.3s" }}
              />
            </span>
          </div>
        </div>
        <button type="button" onClick={onStop}
          className="rounded-lg border border-[var(--stroke)] bg-[var(--bg)]/60 px-2.5 py-1 text-[11px] text-[var(--muted)] backdrop-blur-sm transition hover:text-[var(--fg)]">
          إيقاف
        </button>
      </div>
      <style>{`@keyframes athar-orb-spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } } @keyframes athar-pulse { 0%, 100% { opacity: 0.3; transform: scale(0.85) } 50% { opacity: 1; transform: scale(1.1) } } @keyframes athar-thinking-sweep { 0% { transform: translateX(-100%) } 100% { transform: translateX(300%) } }`}</style>
    </div>
  );
}

/* ─── Message bubble with share + pin ──────────────────────────────────── */

function MessageBubble(props: {
  role: "user" | "assistant";
  text: string;
  streaming?: boolean;
  tokens?: number;
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
          <BubbleContent text={props.text} streaming={!!props.streaming} tokens={props.tokens} />
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
            <span className="opacity-30">·</span>
            <ReminderFooterLink />
          </div>
        ) : null}
      </div>
      <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center self-start rounded-xl bg-accent-15 border border-accent-35">
        <Sparkles className="h-4 w-4 text-[var(--accent)]" aria-hidden="true" />
      </span>
    </div>
  );
}

/* ─── Markdown renderer with action buttons + callout blocks ────────────── */

function navigateRoute(route: string) {
  try {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("athar-companion-navigate", { detail: { route } }));
    }
  } catch { /* ignore */ }
}

/* ─── Bubble content: pre-split into text / callout / action segments ─── */

const CALLOUT_STYLES: Record<string, { border: string; bg: string; label: string; icon: string; accent: string }> = {
  verse: { border: "border-sky-400/50", bg: "bg-sky-500/10", label: "آية", icon: "📖", accent: "text-sky-200" },
  hadith: { border: "border-emerald-400/50", bg: "bg-emerald-500/10", label: "حديث", icon: "📜", accent: "text-emerald-200" },
  dua: { border: "border-rose-400/50", bg: "bg-rose-500/10", label: "دعاء", icon: "🤲", accent: "text-rose-200" },
  tip: { border: "border-amber-400/50", bg: "bg-amber-500/10", label: "نصيحة", icon: "💡", accent: "text-amber-200" },
  warn: { border: "border-red-400/50", bg: "bg-red-500/10", label: "تنبيه", icon: "⚠️", accent: "text-red-200" },
  info: { border: "border-violet-400/50", bg: "bg-violet-500/10", label: "معلومة", icon: "ℹ️", accent: "text-violet-200" },
  cite: { border: "border-cyan-400/50", bg: "bg-cyan-500/10", label: "مرجع", icon: "🔗", accent: "text-cyan-200" },
};

function CalloutBlock({ kind, children }: { kind: keyof typeof CALLOUT_STYLES; children: React.ReactNode }) {
  const style = CALLOUT_STYLES[kind];
  return (
    <div className={["my-2 overflow-hidden rounded-2xl border", style.border, style.bg].join(" ")}>
      <div className={["flex items-center gap-1.5 px-3 py-1.5 text-[10.5px] font-bold uppercase tracking-wider", style.accent].join(" ")}>
        <span aria-hidden="true">{style.icon}</span>
        <span>{style.label}</span>
      </div>
      <div className="arabic-text px-3 pb-3 pt-1 text-[15.5px] leading-8 text-[var(--fg)] whitespace-pre-wrap">{children}</div>
    </div>
  );
}

/* ─── AI-created custom reminder chip ──────────────────────────────────── */

type ParsedReminderView = {
  id: string;
  category: "dhikr" | "quran" | "sunnah" | "fast" | "salat" | "dua" | "custom";
  title: string;
  description?: string;
  body?: string;
  icon?: string;
  repeat:
    | "once" | "daily" | "weekly" | "monthly"
    | "sunnah_aligned" | "prayer_aligned" | "fasting_aligned";
  atTimeOfDay?: string;
  anchorKey?:
    | "tahajjud" | "duha" | "witr" | "fajr" | "dhuhr" | "asr" | "maghrib" | "isha" | "sunrise";
  anchorOffsetMinutes?: number;
  deeplink?: { route: string; hash?: string };
  suggestion?: string;
};

const REMINDER_BLOCK_RE_PAGE = /:::reminder\n([\s\S]*?)\n:::/g;

const VALID_CATEGORIES_PAGE: ParsedReminderView["category"][] = [
  "dhikr", "quran", "sunnah", "fast", "salat", "dua", "custom",
];

const VALID_REPEATS_PAGE: ParsedReminderView["repeat"][] = [
  "once", "daily", "weekly", "monthly", "sunnah_aligned", "prayer_aligned", "fasting_aligned",
];

const VALID_ANCHORS_PAGE: NonNullable<ParsedReminderView["anchorKey"]>[] = [
  "tahajjud", "duha", "witr", "fajr", "dhuhr", "asr", "maghrib", "isha", "sunrise",
];

export function parseReminderToolCallsPage(text: string): ParsedReminderView[] {
  const out: ParsedReminderView[] = [];
  for (const m of text.matchAll(REMINDER_BLOCK_RE_PAGE)) {
    const raw = m[1] ?? "";
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      if (typeof parsed.title !== "string") continue;
      const repeat = String(parsed.repeat ?? "") as ParsedReminderView["repeat"];
      if (!VALID_REPEATS_PAGE.includes(repeat)) continue;
      const category = (VALID_CATEGORIES_PAGE as string[]).includes(String(parsed.category))
        ? (parsed.category as ParsedReminderView["category"])
        : "custom";
      const anchorKey = (VALID_ANCHORS_PAGE as string[]).includes(String(parsed.anchorKey ?? ""))
        ? (parsed.anchorKey as NonNullable<ParsedReminderView["anchorKey"]>)
        : undefined;
      let deeplink: ParsedReminderView["deeplink"] = undefined;
      if (parsed.deeplink && typeof parsed.deeplink === "object") {
        const d = parsed.deeplink as { route?: unknown; hash?: unknown };
        if (typeof d.route === "string") deeplink = { route: d.route, hash: typeof d.hash === "string" ? d.hash : undefined };
      } else if (typeof parsed.deeplink === "string" && parsed.deeplink.startsWith("/")) {
        deeplink = { route: parsed.deeplink };
      }
      out.push({
        id: `pr_${out.length}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        category,
        title: parsed.title,
        description: typeof parsed.description === "string" ? parsed.description : undefined,
        body: typeof parsed.body === "string" ? parsed.body : undefined,
        icon: typeof parsed.icon === "string" ? parsed.icon : undefined,
        repeat,
        atTimeOfDay: typeof parsed.atTimeOfDay === "string" ? parsed.atTimeOfDay : undefined,
        anchorKey,
        anchorOffsetMinutes: typeof parsed.anchorOffsetMinutes === "number" ? parsed.anchorOffsetMinutes : undefined,
        deeplink,
        suggestion: typeof parsed.suggestion === "string" ? parsed.suggestion : undefined,
      });
    } catch { /* skip */ }
  }
  return out;
}

function dispatchCreateReminderPage(parsed: ParsedReminderView): string | null {
  try {
    const store = useNoorStore.getState();
    return store.addCustomReminder({
      category: parsed.category,
      title: parsed.title,
      description: parsed.description,
      body: parsed.body,
      icon: parsed.icon,
      repeat: parsed.repeat,
      atTimeOfDay: parsed.atTimeOfDay,
      anchorKey: parsed.anchorKey,
      anchorOffsetMinutes: parsed.anchorOffsetMinutes,
      deeplink: parsed.deeplink,
      suggestion: parsed.suggestion,
    });
  } catch { return null; }
}

function ReminderChip({
  reminder,
  onCancel,
  onOpen,
}: {
  reminder: ParsedReminderView;
  onCancel: () => void;
  onOpen: () => void;
}) {
  const when = reminder.atTimeOfDay ?? "—";
  return (
    <div className="my-1.5 flex items-center justify-between gap-2 rounded-2xl border border-emerald-400/35 bg-emerald-500/10 px-3 py-2 text-[12.5px] text-emerald-50">
      <button
        type="button"
        onClick={onOpen}
        className="flex min-w-0 flex-1 items-center gap-1.5 text-start"
        aria-label={`افتح ${reminder.title}`}
      >
        <span aria-hidden="true">✓</span>
        <span className="truncate font-semibold">{`أُضيفت التذكير: ${reminder.title} — ${when}`}</span>
        <span className="ms-1 shrink-0 text-[10px] text-emerald-200/70">↗</span>
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="shrink-0 rounded-md bg-white/5 px-2 py-0.5 text-[11px] text-emerald-200/80 hover:bg-red-500/20 hover:text-red-200"
        aria-label={`إلغاء ${reminder.title}`}
      >
        إلغاء
      </button>
    </div>
  );
}

function ReminderFooterLink() {
  return (
    <a
      href="/reminders"
      onClick={(e) => {
        e.preventDefault();
        navigateRoute("/reminders");
      }}
      className="ms-2 inline-flex items-center gap-1 text-[10.5px] text-emerald-200/70 underline-offset-2 hover:underline"
      aria-label="افتح صفحة التذكيرات"
    >
      افتح صفحة التذكيرات ↗
    </a>
  );
}

function ActionButton({ route, children }: { route: string; children: React.ReactNode }) {
  const label = ROUTE_LABELS[route] ?? route;
  return (
    <button
      type="button"
      onClick={() => navigateRoute(route)}
      className="group my-1.5 flex w-full items-center justify-between gap-2 rounded-2xl border border-accent-35 bg-gradient-to-br from-emerald-500/15 to-teal-500/10 px-3.5 py-2.5 text-start text-sm font-semibold text-emerald-100 shadow-sm transition hover:border-emerald-400/60 hover:from-emerald-500/25 hover:to-teal-500/15 active:scale-[0.99]"
    >
      <span className="flex items-center gap-2">
        <span className="grid h-7 w-7 place-items-center rounded-xl bg-emerald-500/30 text-emerald-100">
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
        <span>{children}</span>
      </span>
      <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-emerald-300/80">
        <span>{label}</span>
        <span className="transition group-hover:-translate-x-0.5">←</span>
      </span>
    </button>
  );
}

function BubbleContent({ text, streaming, tokens }: { text: string; streaming?: boolean; tokens?: number }) {
  const segments = React.useMemo(() => splitIntoSegments(text), [text]);
  const reminders = React.useMemo(() => (streaming ? [] : parseReminderToolCallsPage(text)), [text, streaming]);
  const deleteReminder = useNoorStore((s) => s.deleteCustomReminder);
  const navigate = useNavigate();
  return (
    <>
      {segments.map((seg, i) => {
        if (seg.kind === "callout") {
          return (
            <CalloutBlock key={`c-${i}`} kind={seg.calloutKind}>
              {seg.text}
            </CalloutBlock>
          );
        }
        if (seg.kind === "action") {
          return <ActionButton key={`a-${i}`} route={seg.route}>{seg.label}</ActionButton>;
        }
        return (
          <ReactMarkdown key={`t-${i}`} remarkPlugins={[remarkGfm]} components={markdownComponents}>
            {seg.text}
          </ReactMarkdown>
        );
      })}
      {!streaming && reminders.length > 0 ? (
        <div className="mt-2 space-y-1.5">
          {reminders.map((r) => (
            <ReminderChip
              key={r.id}
              reminder={r}
              onCancel={() => {
                const store = useNoorStore.getState();
                const actual = store.customReminders.find((x) => x.title === r.title);
                if (actual) deleteReminder(actual.id);
              }}
              onOpen={() => {
                const store = useNoorStore.getState();
                const actual = store.customReminders.find((x) => x.title === r.title);
                navigate(actual?.deeplink?.route || "/reminders");
              }}
            />
          ))}
          <div className="flex justify-end">
            <ReminderFooterLink />
          </div>
        </div>
      ) : null}
      {streaming ? <ShimmerCursor tokens={typeof tokens === "number" ? tokens : undefined} /> : null}
    </>
  );
}

function ShimmerCursor({ tokens }: { tokens?: number }) {
  const formatted = typeof tokens === "number"
    ? tokens.toLocaleString("ar-EG")
    : null;
  return (
    <span className="relative inline-flex items-end align-baseline" aria-hidden="true">
      <span className="relative inline-block">
        <span
          className="absolute -start-1 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-[var(--accent)]/30 blur-md"
          style={{ animation: "athar-cursor-glow 1s ease-in-out infinite" }}
        />
        <span
          className="relative inline-block h-[1.15em] w-[3px] -mb-[3px] ms-0.5 rounded-full"
          style={{
            background: "linear-gradient(180deg, color-mix(in srgb, var(--accent) 100%, transparent 0%) 0%, color-mix(in srgb, var(--accent) 35%, transparent 65%) 100%)",
            boxShadow: "0 0 10px color-mix(in srgb, var(--accent) 75%, transparent), 0 0 2px var(--accent)",
            animation: "athar-cursor-blink 0.9s ease-in-out infinite",
          }}
        />
      </span>
      {formatted !== null ? (
        <span
          data-testid="athar-token-counter"
          className="ms-1.5 -mb-1 text-[9.5px] font-medium text-[var(--muted-2)] tabular-nums tracking-wide"
          aria-live="polite"
        >
          جاري توليد {formatted} رمز
        </span>
      ) : null}
      <style>{`@keyframes athar-cursor-blink { 0%, 100% { opacity: 1 } 50% { opacity: 0.35 } } @keyframes athar-cursor-glow { 0%, 100% { opacity: 0.4; transform: translateY(-50%) scale(1) } 50% { opacity: 0.85; transform: translateY(-50%) scale(1.4) }`}</style>
    </span>
  );
}

/**
 * Rough whitespace-aware word/segment count. Chat-model tokens vary but
 * Arabic text averages ~1.5 tokens per word; this UI counter is a calm
 * "this reply is still growing" affordance, not a billing meter.
 */
function countTokens(text: string): number {
  if (!text) return 0;
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

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
  h1: ({ children }) => <h3 className="mb-2 mt-3 text-base font-bold text-[var(--fg)] first:mt-0">{children}</h3>,
  h2: ({ children }) => <h4 className="mb-2 mt-3 text-[15px] font-bold text-[var(--fg)] first:mt-0">{children}</h4>,
  h3: ({ children }) => <h5 className="mb-1.5 mt-2 text-[14px] font-bold text-[var(--accent)] first:mt-0">{children}</h5>,
  p: ({ children }) => <p className="mb-2 last:mb-0 leading-7">{children}</p>,
  strong: ({ children }) => <strong className="font-bold text-[var(--fg)]">{children}</strong>,
  em: ({ children }) => <em className="italic text-[var(--accent)]">{children}</em>,
  ul: ({ children }) => <ul className="mb-2.5 me-5 list-disc space-y-1.5 last:mb-0 marker:text-[var(--accent)]">{children}</ul>,
  ol: ({ children }) => <ol className="mb-2.5 me-5 list-decimal space-y-1.5 last:mb-0 marker:text-[var(--accent)] marker:font-bold">{children}</ol>,
  li: ({ children }) => <li className="leading-7">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="my-2.5 rounded-xl border-s-4 border-accent-35 bg-accent-8 ps-3 pe-2 py-2 text-[var(--muted)]">{children}</blockquote>
  ),
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
  layout: HistoryLayout;
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
  onTogglePin: (c: CompanionConversation) => void;
}) {
  const { pinned, groups } = props.layout;
  if (pinned.length === 0 && groups.length === 0) return null;
  return (
    <div className="space-y-5 pt-2">
      {pinned.length > 0 ? (
        <section>
          <header className="sticky top-0 z-[1] -mx-2 mb-2 bg-gradient-to-b from-[var(--bg)] via-[var(--bg)]/95 to-transparent px-3 py-1.5 backdrop-blur-md">
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-300/90">
              <Star className="h-3 w-3 fill-amber-300 text-amber-300" aria-hidden="true" />
              <span>المثبَّتة</span>
              <span className="text-amber-300/50">·</span>
              <span>{pinned.length.toLocaleString("ar-EG")}</span>
            </div>
          </header>
          <div className="space-y-1.5">
            {pinned.map((conv) => (
              <HistoryItem
                key={conv.id}
                conv={conv}
                isCurrent={conv.id === props.currentId}
                isRenaming={props.renamingId === conv.id}
                renameDraft={props.renameDraft}
                onRenameDraftChange={props.onRenameDraftChange}
                confirmDelete={props.confirmDeleteId === conv.id}
                query={props.query}
                variant="pinned"
                onOpen={() => props.onOpen(conv.id)}
                onStartRename={() => props.onStartRename(conv)}
                onCommitRename={() => props.onCommitRename(conv.id)}
                onConfirmDelete={() => props.onConfirmDelete(conv.id)}
                onExport={() => props.onExport(conv)}
                onTogglePin={() => props.onTogglePin(conv)}
              />
            ))}
          </div>
        </section>
      ) : null}
      {groups.map((g) => (
        <section key={g.key}>
          <header className="sticky top-0 z-[1] -mx-2 mb-1.5 bg-gradient-to-b from-[var(--bg)] via-[var(--bg)]/95 to-transparent px-3 py-1.5 backdrop-blur-md">
            <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wider text-[var(--muted-2)]">
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
                variant="default"
                onOpen={() => props.onOpen(conv.id)}
                onStartRename={() => props.onStartRename(conv)}
                onCommitRename={() => props.onCommitRename(conv.id)}
                onConfirmDelete={() => props.onConfirmDelete(conv.id)}
                onExport={() => props.onExport(conv)}
                onTogglePin={() => props.onTogglePin(conv)}
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
  variant: "default" | "pinned";
  onOpen: () => void;
  onStartRename: () => void;
  onCommitRename: () => void;
  onConfirmDelete: () => void;
  onExport: () => void;
  onTogglePin: () => void;
}) {
  const preview = React.useMemo(() => previewSnippet(props.conv), [props.conv]);
  const variant = props.variant;

  const containerCls = [
    "group relative overflow-hidden rounded-2xl border transition-all duration-200",
    variant === "pinned"
      ? "border-amber-300/35 shadow-[0_4px_24px_-8px_rgba(251,191,36,0.4)]"
      : props.isCurrent
        ? "border-accent-35 shadow-[0_4px_20px_-8px_var(--accent)]"
        : "border-[var(--stroke)]/70 shadow-sm",
  ].join(" ");

  const containerBg = variant === "pinned"
    ? "bg-gradient-to-br from-amber-500/[0.12] via-[var(--card)]/95 to-emerald-500/[0.06] backdrop-blur-xl"
    : props.isCurrent
      ? "bg-gradient-to-br from-accent-15 via-[var(--card)]/95 to-[var(--card)]/95 backdrop-blur-xl"
      : "bg-[var(--card)]/75 backdrop-blur-xl hover:bg-[var(--card)]/95 hover:border-accent-35/50";

  const iconCls = [
    "mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl border shadow-inner",
    variant === "pinned"
      ? "bg-gradient-to-br from-amber-400/20 to-amber-500/10 border-amber-300/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
      : props.isCurrent
        ? "bg-gradient-to-br from-[var(--accent)]/20 to-[var(--accent)]/5 border-accent-35 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
        : "bg-gradient-to-br from-accent-15 to-[var(--card-2)] border-accent-35/40",
  ].join(" ");

  const iconEl = variant === "pinned"
    ? <Star className="h-4 w-4 fill-amber-300 text-amber-300" aria-hidden="true" />
    : <MessageSquareQuote className="h-4 w-4 text-[var(--accent)]" aria-hidden="true" />;

  return (
    <div className={[containerCls, containerBg].join(" ")}>
      {/* Top-edge spark for premium feel — small rotating star at top-left */}
      <div
        aria-hidden="true"
        className={[
          "pointer-events-none absolute -start-2 -top-2 h-12 w-12 rounded-full opacity-60 blur-md transition-opacity group-hover:opacity-90",
          variant === "pinned"
            ? "bg-gradient-to-br from-amber-300/40 to-transparent"
            : props.isCurrent
              ? "bg-gradient-to-br from-[var(--accent)]/40 to-transparent"
              : "bg-gradient-to-br from-[var(--accent)]/15 to-transparent",
        ].join(" ")}
      />
      {/* Right-edge strip */}
      <div
        aria-hidden="true"
        className={[
          "pointer-events-none absolute inset-y-0 end-0 w-[3px]",
          variant === "pinned"
            ? "bg-gradient-to-b from-amber-300/80 via-amber-300/30 to-transparent"
            : props.isCurrent
              ? "bg-gradient-to-b from-[var(--accent)]/80 via-[var(--accent)]/30 to-transparent"
              : "bg-gradient-to-b from-[var(--accent)]/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition",
        ].join(" ")}
      />
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
        <button type="button" onClick={props.onOpen} className="block w-full px-3.5 py-3 text-start">
          <div className="flex items-start gap-3">
            <span className={iconCls}>{iconEl}</span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className={[
                  "truncate text-[14px] font-extrabold leading-tight tracking-tight",
                  variant === "pinned" ? "text-amber-50" : "text-[var(--fg)]",
                ].join(" ")}>{props.conv.title}</span>
                {props.isCurrent ? (
                  <span className="shrink-0 rounded-full bg-[var(--accent)] px-1.5 py-0.5 text-[9px] font-extrabold text-black shadow-sm">
                    جارية
                  </span>
                ) : null}
              </div>
              {preview ? (
                <div className={[
                  "mt-1.5 line-clamp-2 text-[11.5px] leading-5",
                  variant === "pinned" ? "text-amber-100/75" : "text-[var(--muted)]",
                ].join(" ")}>{preview}</div>
              ) : null}
              <div className={[
                "mt-2 flex items-center gap-1.5 text-[10px] font-medium",
                variant === "pinned" ? "text-amber-200/70" : "text-[var(--muted-2)]",
              ].join(" ")}>
                <span>{relativeTime(props.conv.updatedAt)}</span>
                <span className="opacity-40">·</span>
                <span>{props.conv.messages.length.toLocaleString("ar-EG")} رسالة</span>
              </div>
            </div>
          </div>
        </button>
      )}
      {!props.isRenaming ? (
        <div className="flex items-center gap-0.5 border-t border-[var(--stroke)]/60 bg-[var(--bg)]/30 px-1.5 py-0.5 backdrop-blur-sm">
          <button type="button"
            onClick={props.onTogglePin}
            className={[
              "flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] transition",
              variant === "pinned"
                ? "text-amber-200 hover:text-amber-100"
                : "text-[var(--muted)] hover:text-amber-300 hover:bg-amber-500/10",
            ].join(" ")}
            aria-label={variant === "pinned" ? "إلغاء التثبيت" : "تثبيت"}>
            <Star className={["h-3 w-3", variant === "pinned" ? "fill-amber-300 text-amber-300" : ""].join(" ")} aria-hidden="true" />
            {variant === "pinned" ? "مثبتة" : "تثبيت"}
          </button>
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

/* ─── Pinned reply card (per-reply, not per-conversation) ─────────────── */

function PinnedReplyCard({ pin, onDelete }: { pin: PinnedReply; onDelete: () => void }) {
  const [copied, setCopied] = React.useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(pin.text); setCopied(true); setTimeout(() => setCopied(false), 1600); } catch { /* ignore */ }
  };
  const share = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ text: pin.text, title: "أثر" });
      } else {
        await navigator.clipboard.writeText(pin.text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      }
    } catch { /* user cancelled */ }
  };
  return (
    <div className="rounded-2xl border border-amber-300/30 bg-gradient-to-br from-amber-500/[0.08] via-[var(--card)] to-[var(--card)] p-3">
      <p className="whitespace-pre-wrap text-[12.5px] leading-6 text-[var(--fg)] line-clamp-6">{pin.text}</p>
      <div className="mt-2 flex items-center gap-1 text-[11px] text-[var(--muted-2)]">
        <button type="button" onClick={copy} className="flex items-center gap-1 hover:text-[var(--fg)] transition" aria-label="نسخ">
          {copied ? <Check className="h-3 w-3 text-[var(--ok)]" aria-hidden="true" /> : <Copy className="h-3 w-3" aria-hidden="true" />}
          {copied ? "نُسخ" : "نسخ"}
        </button>
        <span className="opacity-30">·</span>
        <button type="button" onClick={share} className="flex items-center gap-1 hover:text-[var(--fg)] transition" aria-label="مشاركة">
          <Share2 className="h-3 w-3" aria-hidden="true" /> مشاركة
        </button>
        <span className="flex-1" />
        <span className="text-[10px]">{relativeTime(pin.savedAt)}</span>
        <span className="opacity-30">·</span>
        <button type="button" onClick={onDelete} className="flex items-center gap-1 hover:text-[var(--danger)] transition" aria-label="حذف المثبَّت">
          <XIcon className="h-3 w-3" aria-hidden="true" /> حذف
        </button>
      </div>
    </div>
  );
}
