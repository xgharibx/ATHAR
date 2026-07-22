import * as React from "react";
import { Download, Upload, Palette, SlidersHorizontal, Sparkles, Bell, Trash2, BookMarked, BookOpen, Play, Square, RotateCcw, RotateCw, Globe, ArrowUp, ArrowDown, Fingerprint, Layers, Share2, ChevronLeft, Search, X, Vibrate, Moon, Volume2, ChevronDown } from "lucide-react";
import toast from "react-hot-toast";
import { Link, useNavigate } from "react-router-dom";
import pkgJson from "../../package.json";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Switch } from "@/components/ui/Switch";
import { Slider } from "@/components/ui/Slider";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { useNoorStore, DEFAULT_HOME_WIDGETS_ORDER, type NoorTheme, type ExportBlobV1, type HomeWidgetKey } from "@/store/noorStore";
import { downloadJson } from "@/lib/download";
import { clamp } from "@/lib/utils";
import { toArabicNumeral } from "@/lib/quranMeta";
import {
  cancelAllReminders,
  ensureExactAlarmPermission,
  getNotificationPermission,
  isNativePlatform,
  playPrayerSoundPreview,
  playReminderSoundPreview,
  PRAYER_SOUND_OPTIONS,
  REMINDER_SOUND_OPTIONS,
  requestNotificationPermission,
  stopSoundPreview,
  syncReminders
} from "@/lib/reminders";
import { downloadMushafCore, getMushafOfflineStatus, clearMushafOfflineCore, type MushafOfflineProgress, type MushafOfflineStatus } from "@/lib/mushafOffline";
import { QURAN_RECITERS, getReciter } from "@/lib/quranReciters";
import { ReciterPicker } from "@/components/quran/ReciterPicker";
import { TranslationPicker } from "@/components/quran/TranslationPicker";
import { TRANSLATION_SOURCES, getTranslation as getTranslationAny, type TranslationId } from "@/lib/quranTranslations";
import { useScrollRestoration } from "@/hooks/useScrollRestoration";
import { arNum } from "@/lib/formatNumber";

import {
  SECTIONS,
  SETTINGS_CATEGORIES,
  type SettingsSectionId,
  filterSettingsSections,
} from "@/lib/settingsLayout";

const THEME_ACCENTS: Record<NoorTheme, string> = {
  system:   "#ffd780",
  dark:     "#ffd780",
  light:    "#ffd780",
  noor:     "#ffd780",
  midnight: "#38bdf8",
  forest:   "#34d399",
  bees:     "#fbbf24",
  roses:    "#fda4af",
  sapphire: "#60a5fa",
  violet:   "#c4b5fd",
  sunset:   "#fb923c",
  mist:     "#e5e7eb",
  bustan:   "#c96f4a",
  waraq:    "#8f3b2c",
  fanous:   "#ffb84d",
  sajjada:  "#e8b04b",
  mihrab:   "#2ec4b6",
  midad:    "#4dff88",
  layl:     "#aab8ff",
  teen:     "#7b6cf6",
  jura:     "#ff4d2e",
  andalus:  "#a8781f",
  sakina:   "#7a8a6f",
  shafaq:   "#6ef2c3",
  mushaf:   "#e9c36a",
  sama:     "#ffe8a0",
  diwan:    "#1f6b4a",
};

const PRAYER_ALERT_OPTIONS = [
  { id: "Fajr", label: "الفجر" },
  { id: "Dhuhr", label: "الظهر" },
  { id: "Asr", label: "العصر" },
  { id: "Maghrib", label: "المغرب" },
  { id: "Isha", label: "العشاء" },
] as const;

function ThemeChip(props: { value: NoorTheme; label: string; active: boolean; onClick: () => void }) {
  const dotColor = THEME_ACCENTS[props.value];
  return (
    <button type="button"
      onClick={props.onClick}
      aria-pressed={props.active}
      className={[
        "px-3 py-2.5 rounded-2xl border text-sm transition flex items-center gap-2 min-h-[44px]",
        props.active
          ? "bg-accent-15 border-accent-35"
          : "bg-[var(--card)] border-[var(--stroke)] hover:bg-[var(--card-2)]"
      ].join(" ")}
    >
      <span
        className="w-2.5 h-2.5 rounded-full shrink-0 ring-1 ring-[var(--stroke)]"
        style={{ backgroundColor: dotColor }}
      />
      {props.label}
    </button>
  );
}

/* ── Smart Settings: 4 most-used toggles pinned to the top ──────────────── */
function QuickTogglesStrip(props: {
  prefs: ReturnType<typeof useNoorStore.getState>["prefs"];
  setPrefs: ReturnType<typeof useNoorStore.getState>["setPrefs"];
  reminders: ReturnType<typeof useNoorStore.getState>["reminders"];
  setReminders: ReturnType<typeof useNoorStore.getState>["setReminders"];
}) {
  const { prefs, setPrefs, reminders, setReminders } = props;
  const isDark =
    prefs.theme === "dark" ||
    prefs.theme === "noor" ||
    prefs.theme === "midnight" ||
    prefs.theme === "forest";
  const toggleDark = (next: boolean) => {
    setPrefs({ theme: next ? "dark" : "light" });
  };
  // Sound ≈ reminder.soundProfile being non-default + reminders.enabled — the most
  // common reason users toggle "sound" is to silence reminders.
  const soundOn = reminders.enabled;
  const toggleSound = (next: boolean) => setReminders({ enabled: next });

  const cycleSoundProfile = () => {
    const idx = REMINDER_SOUND_OPTIONS.findIndex((o) => o.id === reminders.soundProfile);
    const next = REMINDER_SOUND_OPTIONS[(idx + 1) % REMINDER_SOUND_OPTIONS.length];
    if (next) setReminders({ soundProfile: next.id });
  };

  return (
    <div className="mt-2 flex gap-1.5 overflow-x-auto no-scrollbar" role="toolbar" aria-label="تبديلات سريعة">
      <button
        type="button"
        aria-pressed={!!prefs.enableHaptics}
        onClick={() => setPrefs({ enableHaptics: !prefs.enableHaptics })}
        className={[
          "shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[11.5px] transition",
          prefs.enableHaptics
            ? "bg-accent-15 border-accent-35 text-[var(--accent)]"
            : "border-[var(--stroke)] bg-[var(--card)] opacity-80",
        ].join(" ")}
        title="اهتزاز"
      >
        <Vibrate size={12} aria-hidden="true" />
        اهتزاز
      </button>
      <button
        type="button"
        aria-pressed={soundOn}
        onClick={() => toggleSound(!soundOn)}
        className={[
          "shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[11.5px] transition",
          soundOn
            ? "bg-accent-15 border-accent-35 text-[var(--accent)]"
            : "border-[var(--stroke)] bg-[var(--card)] opacity-80",
        ].join(" ")}
        title="الأصوات"
      >
        <Volume2 size={12} aria-hidden="true" />
        الأصوات
      </button>
      <button
        type="button"
        aria-pressed={isDark}
        onClick={() => toggleDark(!isDark)}
        className={[
          "shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[11.5px] transition",
          isDark
            ? "bg-accent-15 border-accent-35 text-[var(--accent)]"
            : "border-[var(--stroke)] bg-[var(--card)] opacity-80",
        ].join(" ")}
        title="الوضع الداكن"
      >
        <Moon size={12} aria-hidden="true" />
        ليلي
      </button>
      <button
        type="button"
        onClick={cycleSoundProfile}
        className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[var(--stroke)] bg-[var(--card)] hover:bg-[var(--card-2)] text-[11.5px] transition"
        title="صوت التذكير"
      >
        <Bell size={12} aria-hidden="true" />
        {REMINDER_SOUND_OPTIONS.find((o) => o.id === reminders.soundProfile)?.label ?? "صوت"}
      </button>
    </div>
  );
}

export function SettingsPage() {
  const navigate = useNavigate();
  const prefs = useNoorStore((s) => s.prefs);
  useScrollRestoration();
  const setPrefs = useNoorStore((s) => s.setPrefs);
  const resetPrefs = useNoorStore((s) => s.resetPrefs);
  const reminders = useNoorStore((s) => s.reminders);
  const setReminders = useNoorStore((s) => s.setReminders);
  /* New — surfaced per user request: the on-device custom-reminders that the
     Companion AI creates via the create_reminder tool call. They live in
     IDB through noorStore and were invisible in Settings before. */
  const customReminders = useNoorStore((s) => s.customReminders) ?? [];
  const exportState = useNoorStore((s) => s.exportState);
  const importState = useNoorStore((s) => s.importState);
  const sebhaTarget = useNoorStore((s) => s.sebhaTarget);
  const setSebhaTarget = useNoorStore((s) => s.setSebhaTarget);
  const [showReciterPicker, setShowReciterPicker] = React.useState(false);
  const favorites = useNoorStore((s) => s.favorites);
  const quranBookmarks = useNoorStore((s) => s.quranBookmarks);
  const activity = useNoorStore((s) => s.activity);
  const progress = useNoorStore((s) => s.progress);

  const dataSummary = React.useMemo(() => {
    const favoriteCount = Object.values(favorites).filter(Boolean).length;
    const bookmarkCount = Object.values(quranBookmarks).filter(Boolean).length;
    const activeDays = Object.values(activity).filter((n) => (n ?? 0) > 0).length;
    const touchedItems = Object.values(progress).filter((n) => (n ?? 0) > 0).length;
    return { favoriteCount, bookmarkCount, activeDays, touchedItems };
  }, [activity, favorites, progress, quranBookmarks]);

  const [isNative, setIsNative] = React.useState(false);
  const [notifPerm, setNotifPerm] = React.useState<"unknown" | "granted" | "denied" | "prompt">("unknown");
  const [playingPreview, setPlayingPreview] = React.useState<string | null>(null);
  const [mushafOfflineStatus, setMushafOfflineStatus] = React.useState<MushafOfflineStatus | null>(null);
  const [mushafOfflineProgress, setMushafOfflineProgress] = React.useState<MushafOfflineProgress | null>(null);

  const refreshMushafOfflineStatus = React.useCallback(async () => {
    setMushafOfflineStatus(await getMushafOfflineStatus());
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const native = await isNativePlatform();
        if (cancelled) return;
        setIsNative(native);
        if (!native) return;
        const p = await getNotificationPermission();
        if (cancelled) return;
        setNotifPerm(p);
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    return () => {
      stopSoundPreview();
    };
  }, []);

  React.useEffect(() => {
    void refreshMushafOfflineStatus();
  }, [refreshMushafOfflineStatus]);

  const downloadOfflineMushaf = React.useCallback(async () => {
    setMushafOfflineProgress({ done: 0, total: 3, label: "تهيئة النسخة المحلية" });
    try {
      await downloadMushafCore(setMushafOfflineProgress);
      await refreshMushafOfflineStatus();
      toast.success("تم تحديث نسخة المصحف المحلية");
    } catch {
      toast.error("تعذر تحديث نسخة المصحف المحلية");
    } finally {
      setMushafOfflineProgress(null);
    }
  }, [refreshMushafOfflineStatus]);

  const mushafProgressPct = mushafOfflineProgress
    ? Math.round((mushafOfflineProgress.done / mushafOfflineProgress.total) * 100)
    : 0;
  const mushafPinnedDate = mushafOfflineStatus?.pinnedAt
    ? new Date(mushafOfflineStatus.pinnedAt).toLocaleDateString("ar-EG")
    : null;

  const toggleReminderPreview = async (soundProfile: typeof REMINDER_SOUND_OPTIONS[number]["id"]) => {
    const key = `reminder:${soundProfile}`;
    if (playingPreview === key) {
      stopSoundPreview();
      setPlayingPreview(null);
      return;
    }

    setPlayingPreview(key);
    try {
      await playReminderSoundPreview(soundProfile, () => setPlayingPreview(null));
    } catch {
      setPlayingPreview(null);
      toast.error("تعذر تشغيل المعاينة");
    }
  };

  const togglePrayerPreview = async (soundProfile: typeof PRAYER_SOUND_OPTIONS[number]["id"]) => {
    const key = `prayer:${soundProfile}`;
    if (playingPreview === key) {
      stopSoundPreview();
      setPlayingPreview(null);
      return;
    }

    setPlayingPreview(key);
    try {
      await playPrayerSoundPreview(soundProfile, () => setPlayingPreview(null));
    } catch {
      setPlayingPreview(null);
      toast.error("تعذر تشغيل المعاينة");
    }
  };

  const onBackup = () => {
    try {
      const blob = exportState();
      downloadJson(`ATHAR-نسخة-احتياطية-${blob.exportedAt.slice(0, 10)}.athar`, blob);
      toast.success("تم تنزيل النسخة الاحتياطية");
    } catch {
      toast.error("فشل تنزيل النسخة الاحتياطية");
    }
  };

  // Se7: Share backup via native share sheet (for cloud save to Google Drive / iCloud)
  const onShareBackup = async () => {
    try {
      const blob = exportState();
      const json = JSON.stringify(blob, null, 2);
      const file = new File([json], `ATHAR-${blob.exportedAt.slice(0, 10)}.athar`, { type: "application/json" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "ATHAR نسخة احتياطية" });
      } else {
        onBackup();
      }
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") return;
      onBackup();
    }
  };

  const onRestore = async (file: File) => {
    try {
      const text = await file.text();
      // Security: validate it's a proper object before trusting it
      const raw: unknown = JSON.parse(text);
      if (
        typeof raw !== "object" ||
        raw === null ||
        Array.isArray(raw) ||
        (raw as Record<string, unknown>).version !== 1 ||
        typeof (raw as Record<string, unknown>).exportedAt !== "string"
      ) {
        toast.error("ملف النسخة الاحتياطية غير معروف أو تالف");
        return;
      }
      const json = raw as ExportBlobV1;
      importState(json);
      toast.success("تم الاستيراد بنجاح");
      // Soft reload: replace history state then reload to re-init store
      setTimeout(() => window.location.reload(), 400);
    } catch {
      toast.error("ملف غير صالح");
    }
  };

  // ── Smart Settings: search + auto-highlight nav + collapse-by-default ──
  const [search, setSearch] = React.useState("");
  const [activeSection, setActiveSection] = React.useState<SettingsSectionId | null>(null);
  const visibleIds = React.useMemo(() => filterSettingsSections(search), [search]);
  const visibleSet = React.useMemo(() => new Set(visibleIds), [visibleIds]);

  // Auto-highlight the section currently in view (IntersectionObserver).
  React.useEffect(() => {
    const targets = SECTIONS
      .map((s) => document.getElementById(`settings-${s.id}`))
      .filter((el): el is HTMLElement => !!el);
    if (targets.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]?.target.id) {
          const id = visible[0].target.id.replace(/^settings-/, "") as SettingsSectionId;
          setActiveSection((cur) => (cur === id ? cur : id));
        }
      },
      { rootMargin: "-20% 0px -55% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] },
    );
    for (const t of targets) observer.observe(t);
    return () => observer.disconnect();
  }, []);

  // Toggle each <#settings-*> section's visibility based on the search query.
  // Avoids touching every Card body in this 1700-line file; the filter just sets
  // display:none on whole anchors. Default-opened section is exempted.
  React.useEffect(() => {
    for (const s of SECTIONS) {
      const el = document.getElementById(`settings-${s.id}`);
      if (!el) continue;
      const visible = visibleSet.has(s.id);
      el.style.display = visible ? "" : "none";
    }
    return () => {
      // On unmount, restore everything so navigating away doesn't leave stale styles.
      for (const s of SECTIONS) {
        const el = document.getElementById(`settings-${s.id}`);
        if (el) el.style.display = "";
      }
    };
  }, [visibleSet]);

  return (
    <div className="space-y-4 page-enter">
      {/* ── Search bar ── */}
      <div className="sticky top-0 z-20 -mx-3 px-3 pt-1 pb-2 bg-gradient-to-b from-[var(--bg)] via-[var(--bg)] to-[var(--bg)]/85 backdrop-blur-md">
        <div className="relative">
          <Search size={14} className="absolute top-1/2 -translate-y-1/2 start-3 opacity-50 pointer-events-none" aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث في الإعدادات… (مظهر، تذكيرات، ترجمة…)"
            aria-label="البحث في الإعدادات"
            className="w-full ps-9 pe-9 py-2.5 rounded-2xl border border-[var(--stroke)] bg-[var(--card)] text-sm focus:outline-none focus:ring-2 focus:ring-accent-30 placeholder:opacity-50"
          />
          {search ? (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute top-1/2 -translate-y-1/2 end-2 p-1 rounded-full hover:bg-[var(--card-2)] opacity-60 hover:opacity-100"
              aria-label="مسح البحث"
            >
              <X size={14} aria-hidden="true" />
            </button>
          ) : null}
        </div>

        {/* ── Quick toggles — 4 most-used prefs always one tap away ── */}
        <QuickTogglesStrip prefs={prefs} setPrefs={setPrefs} reminders={reminders} setReminders={setReminders} />
      </div>

      {/* Quick backup strip */}
      <div className="flex items-center justify-between gap-3 px-1">
        <span className="text-xs opacity-55">احتفظ ببياناتك بأمان</span>
        <button type="button"
          onClick={onBackup}
          className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-2xl border border-[var(--stroke)] bg-[var(--card)] hover:bg-[var(--card-2)] transition"
        >
          <Download size={12} aria-hidden="true" />
          نسخ احتياطي
        </button>
      </div>

      <Card id="settings-appearance" className="p-5">
        <div className="flex items-center gap-2">
          <Palette size={18} aria-hidden="true" className="text-[var(--accent)]" />
          <div className="font-semibold">المظهر</div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="اختيار المظهر">
          <ThemeChip
            value="system"
            label="تلقائي"
            active={prefs.theme === "system"}
            onClick={() => setPrefs({ theme: "system" })}
          />
          <ThemeChip value="dark" label="داكن" active={prefs.theme === "dark"} onClick={() => setPrefs({ theme: "dark" })} />
          <ThemeChip value="light" label="فاتح" active={prefs.theme === "light"} onClick={() => setPrefs({ theme: "light" })} />
          <ThemeChip value="noor" label="نور" active={prefs.theme === "noor"} onClick={() => setPrefs({ theme: "noor" })} />
          <ThemeChip value="midnight" label="ليلي" active={prefs.theme === "midnight"} onClick={() => setPrefs({ theme: "midnight" })} />
          <ThemeChip value="forest" label="غابة" active={prefs.theme === "forest"} onClick={() => setPrefs({ theme: "forest" })} />
          <ThemeChip value="bees" label="نحل" active={prefs.theme === "bees"} onClick={() => setPrefs({ theme: "bees" })} />
          <ThemeChip value="roses" label="زهور" active={prefs.theme === "roses"} onClick={() => setPrefs({ theme: "roses" })} />
          <ThemeChip value="sapphire" label="ياقوت" active={prefs.theme === "sapphire"} onClick={() => setPrefs({ theme: "sapphire" })} />
          <ThemeChip value="violet" label="بنفسجي" active={prefs.theme === "violet"} onClick={() => setPrefs({ theme: "violet" })} />
          <ThemeChip value="sunset" label="غروب" active={prefs.theme === "sunset"} onClick={() => setPrefs({ theme: "sunset" })} />
          <ThemeChip value="mist" label="ضباب" active={prefs.theme === "mist"} onClick={() => setPrefs({ theme: "mist" })} />
          <ThemeChip value="bustan" label="بستان 🦋" active={prefs.theme === "bustan"} onClick={() => setPrefs({ theme: "bustan" })} />
          <ThemeChip value="waraq" label="ورق 📜" active={prefs.theme === "waraq"} onClick={() => setPrefs({ theme: "waraq" })} />
          <ThemeChip value="fanous" label="فانوس 🏮" active={prefs.theme === "fanous"} onClick={() => setPrefs({ theme: "fanous" })} />
          <ThemeChip value="sajjada" label="سجادة 🧿" active={prefs.theme === "sajjada"} onClick={() => setPrefs({ theme: "sajjada" })} />
          <ThemeChip value="mihrab" label="محراب 🕌" active={prefs.theme === "mihrab"} onClick={() => setPrefs({ theme: "mihrab" })} />
          <ThemeChip value="sama" label="سماء 🌅" active={prefs.theme === "sama"} onClick={() => setPrefs({ theme: "sama" })} />
          <ThemeChip value="midad" label="مداد 🖥️" active={prefs.theme === "midad"} onClick={() => setPrefs({ theme: "midad" })} />
          <ThemeChip value="layl" label="ليل 🌌" active={prefs.theme === "layl"} onClick={() => setPrefs({ theme: "layl" })} />
          <ThemeChip value="teen" label="طين 🏺" active={prefs.theme === "teen"} onClick={() => setPrefs({ theme: "teen" })} />
          <ThemeChip value="jura" label="جرأة ⬛" active={prefs.theme === "jura"} onClick={() => setPrefs({ theme: "jura" })} />
          <ThemeChip value="andalus" label="أندلس 🏛️" active={prefs.theme === "andalus"} onClick={() => setPrefs({ theme: "andalus" })} />
          <ThemeChip value="sakina" label="سكينة 🎋" active={prefs.theme === "sakina"} onClick={() => setPrefs({ theme: "sakina" })} />
          <ThemeChip value="shafaq" label="شفق ❄️" active={prefs.theme === "shafaq"} onClick={() => setPrefs({ theme: "shafaq" })} />
          <ThemeChip value="mushaf" label="مصحف 📕" active={prefs.theme === "mushaf"} onClick={() => setPrefs({ theme: "mushaf" })} />
          <ThemeChip value="diwan" label="الديوان 🪶" active={prefs.theme === "diwan"} onClick={() => setPrefs({ theme: "diwan" })} />
        </div>

        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <SettingRow
            title="خلفية ثلاثية الأبعاد"
            desc="خلفية نجوم ثلاثية الأبعاد — قد تستهلك البطارية"
            right={
              <Switch checked={prefs.enable3D} onCheckedChange={(v) => setPrefs({ enable3D: v })} />
            }
          />
          <SettingRow
            title="أصوات التطبيق"
            desc="تشغيل الأصوات العامة للتنبيهات والإشعارات"
            right={
              <Switch checked={prefs.enableSounds} onCheckedChange={(v) => setPrefs({ enableSounds: v })} />
            }
          />
          <SettingRow
            title="تقليل الحركة"
            desc="لأجهزة أبطأ أو لتقليل الدوخة"
            right={
              <Switch checked={prefs.reduceMotion} onCheckedChange={(v) => setPrefs({ reduceMotion: v })} />
            }
          />
          <SettingRow
            title="الوضع الشفاف"
            desc="خلفية زجاجية مضيئة للبطاقات"
            right={
              <Switch checked={prefs.transparentMode} onCheckedChange={(v) => setPrefs({ transparentMode: v })} />
            }
          />
        </div>

        {/* Custom accent color */}
        <div className="mt-5 pt-4 border-t border-[var(--stroke)]">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <div className="text-sm font-medium">لون مخصص</div>
              <div className="text-xs opacity-60 mt-0.5">تخصيص لون التمييز بشكل حر</div>
            </div>
            <div className="flex items-center gap-2">
              <label className="relative cursor-pointer">
                <input
                  type="color"
                  value={prefs.customAccent ?? "#10b981"}
                  onChange={(e) => setPrefs({ customAccent: e.target.value })}
                  className="sr-only"
                  aria-label="اختيار لون مخصص"
                />
                <span
                  className="block w-9 h-9 rounded-2xl border-2 border-[var(--stroke)] shadow-inner ring-1 ring-black/20 transition hover:scale-105"
                  style={{ background: prefs.customAccent ?? "var(--accent)" }}
                />
              </label>
              {prefs.customAccent && (
                <button type="button"
                  onClick={() => { setPrefs({ customAccent: undefined }); toast("تم مسح اللون المخصص"); }}
                  aria-label="إعادة ضبط اللون المخصص"
                  className="text-xs px-2.5 py-1.5 rounded-xl bg-[var(--card)] border border-[var(--stroke)] opacity-70 hover:opacity-100 transition min-h-[36px]"
                >
                  إعادة ضبط
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Se3: Language switcher */}
        <div className="mt-5 pt-4 border-t border-[var(--stroke)]">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Globe size={15} className="text-[var(--accent)]" aria-hidden="true" />
              <div>
                <div className="text-sm font-medium">لغة الواجهة</div>
                <div className="text-xs opacity-60 mt-0.5">Arabic ↔ English</div>
              </div>
            </div>
            <div className="flex gap-1.5" role="group" aria-label="اختيار لغة الواجهة">
              {(["ar", "en"] as const).map((lang) => (
                <button type="button"
                  key={lang}
                  aria-pressed={(prefs.uiLanguage ?? "ar") === lang}
                  onClick={() => setPrefs({ uiLanguage: lang })}
                  className={[
                    "px-4 py-2 rounded-xl border text-sm transition min-h-[40px] relative",
                    (prefs.uiLanguage ?? "ar") === lang
                      ? "bg-accent-15 border-accent-35 font-semibold"
                      : "bg-[var(--card)] border-[var(--stroke)] hover:bg-[var(--card-2)] opacity-60"
                  ].join(" ")}
                >
                  {lang === "ar" ? "عربي" : <span className="flex items-center gap-1">English <span className="text-[9px] bg-[var(--card-2)] rounded px-1 py-0.5 leading-none">قريبًا</span></span>}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Se4: Text direction */}
        <div className="mt-5 pt-4 border-t border-[var(--stroke)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium">اتجاه النص</div>
              <div className="text-xs opacity-60 mt-0.5">RTL / LTR · مفيد لمستخدمي الإنجليزية</div>
            </div>
            <div className="flex gap-1.5" role="group" aria-label="اختيار اتجاه النص">
              {([
                { id: "auto", label: "تلقائي" },
                { id: "rtl", label: "RTL ←" },
                { id: "ltr", label: "→ LTR" },
              ] as const).map((d) => (
                <button type="button"
                  key={d.id}
                  onClick={() => setPrefs({ textDir: d.id })}
                  aria-pressed={(prefs.textDir ?? "auto") === d.id}
                  className={[
                    "px-3 py-2 rounded-xl border text-xs transition min-h-[40px]",
                    (prefs.textDir ?? "auto") === d.id
                      ? "bg-accent-15 border-accent-35 font-semibold"
                      : "bg-[var(--card)] border-[var(--stroke)] hover:bg-[var(--card-2)]"
                  ].join(" ")}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Se6: Restore defaults */}
        <div className="mt-5 pt-4 border-t border-[var(--stroke)] flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-medium">إعادة الضبط الافتراضي</div>
            <div className="text-xs opacity-60 mt-0.5">إعادة إعدادات المظهر والقراءة دون فقدان التقدّم</div>
          </div>
          <button type="button"
            onClick={() => { resetPrefs(); toast.success("تم إعادة الضبط الافتراضي"); }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[var(--stroke)] bg-[var(--card)] hover:bg-[var(--card-2)] transition text-xs min-h-[40px]"
          >
            <RotateCcw size={13} aria-hidden="true" />
            إعادة ضبط
          </button>
        </div>
      </Card>

      {/* Se5: Home widgets reorder */}
      <div id="settings-home-widgets">
        <HomeWidgetsCard prefs={prefs} setPrefs={setPrefs} />
      </div>

      <Card id="settings-reading" className="p-5">
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={18} aria-hidden="true" className="text-[var(--accent)]" />
          <div className="font-semibold">القراءة</div>
        </div>

        <div className="mt-5 space-y-5">
          <div>
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-medium">حجم الخط</div>
              <div className="text-xs opacity-70 tabular-nums">{arNum(Math.round(prefs.fontScale * 100))}٪</div>
            </div>
            <div className="mt-3">
              <Slider
                value={[prefs.fontScale]}
                min={0.9}
                max={1.6}
                step={0.01}
                onValueChange={(v) => setPrefs({ fontScale: clamp(v[0] ?? 1.05, 0.9, 1.6) })}
                aria-label="حجم الخط"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-medium">تباعد السطور</div>
              <div className="text-xs opacity-70 tabular-nums">{arNum(parseFloat(prefs.lineHeight.toFixed(1)))}×</div>
            </div>
            <div className="mt-3">
              <Slider
                value={[prefs.lineHeight]}
                min={1.6}
                max={2.4}
                step={0.01}
                onValueChange={(v) => setPrefs({ lineHeight: clamp(v[0] ?? 1.95, 1.6, 2.4) })}
                aria-label="تباعد السطور"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-medium">حجم خط القرآن</div>
              <div className="text-xs opacity-70 tabular-nums">{arNum(Math.round((prefs.mushafFontScale ?? 1) * 100))}٪</div>
            </div>
            <div className="mt-3">
              <Slider
                value={[prefs.mushafFontScale ?? 1]}
                min={0.7}
                max={1.6}
                step={0.01}
                onValueChange={(v) => setPrefs({ mushafFontScale: clamp(v[0] ?? 1, 0.7, 1.6) })}
                aria-label="حجم خط القرآن"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-medium">تباعد سطور القرآن</div>
              <div className="text-xs opacity-70 tabular-nums">{arNum(parseFloat(prefs.quranLineHeight.toFixed(1)))}×</div>
            </div>
            <div className="mt-3">
              <Slider
                value={[prefs.quranLineHeight]}
                min={1.8}
                max={3}
                step={0.01}
                onValueChange={(v) => setPrefs({ quranLineHeight: clamp(v[0] ?? 2.55, 1.8, 3) })}
                aria-label="تباعد سطور القرآن"
              />
            </div>
          </div>

          {/* ── Live Preview — right after the main sliders ── */}
          <div className="glass rounded-3xl p-4 border border-[var(--stroke)]">
            <div className="text-xs opacity-65 mb-3">معاينة مباشرة</div>
            <div
              className="arabic-text"
              style={{ fontSize: `${prefs.fontScale}rem`, lineHeight: prefs.lineHeight }}
            >
              سُبْحَانَ اللَّهِ وَبِحَمْدِهِ
            </div>
            <div
              className="arabic-text quran-text mt-3"
              style={{
                fontSize: `${18 * (prefs.mushafFontScale ?? 1)}px`,
                lineHeight: prefs.quranLineHeight,
                letterSpacing: `${prefs.quranLetterSpacing ?? 0}em`,
                wordSpacing: `${prefs.quranWordSpacing ?? 0}em`,
              }}
            >
              ٱهْدِنَا ٱلصِّرَٰطَ ٱلْمُسْتَقِيمَ
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SettingRow
              title="إخفاء أرقام الآيات"
              desc="وضع تركيز للقراءة بدون علامات"
              right={
                <Switch checked={prefs.quranHideMarkers} onCheckedChange={(v) => setPrefs({ quranHideMarkers: v })} />
              }
            />
            <SettingRow
              title="إظهار الفوائد والإحصائيات"
              desc="إظهار صندوق الفضل إن وُجد"
              right={
                <Switch checked={prefs.showBenefits} onCheckedChange={(v) => setPrefs({ showBenefits: v })} />
              }
            />
            <SettingRow
              title="حذف الحركات من المصحف"
              desc="مفيد للبحث والحفظ (قد يغير القراءة)"
              right={
                <Switch
                  checked={prefs.stripDiacritics}
                  onCheckedChange={(v) => setPrefs({ stripDiacritics: v })}
                />
              }
            />
          </div>

          {/* ── Quran paper theme control ──── */}
          <SettingRow
            title="خلفية المصحف"
            desc="لون خلفية صفحة القراءة"
            right={
              <div className="flex items-center gap-1 flex-wrap">
                {(["default", "sepia", "midnight", "parchment", "forest", "rose", "ocean", "desert", "dawn"] as const).map((t) => (
                  <button type="button"
                    key={t}
                    onClick={() => setPrefs({ quranTheme: t })}
                    aria-pressed={prefs.quranTheme === t}
                    className={[
                      "text-[10px] px-2.5 py-1.5 rounded-xl border transition min-h-[36px]",
                      prefs.quranTheme === t
                        ? "bg-accent-15 border-accent-35"
                        : "bg-[var(--card)] border-[var(--stroke)] hover:bg-[var(--card-2)]"
                    ].join(" ")}
                  >
                    {{ default: "🌑 افتراضي", sepia: "🟫 سيبيا", midnight: "🌙 ليلي", parchment: "📜 رق", forest: "🌲 غابة", rose: "🌹 وردي", ocean: "🌊 بحر", desert: "🏜️ صحراء", dawn: "🌅 فجر" }[t]}
                  </button>
                ))}
              </div>
            }
          />

          {/* ── Letter spacing slider ──── */}
          <div>
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-medium">تباعد الحروف</div>
              <div className="text-xs opacity-70 tabular-nums">{arNum(parseInt(((prefs.quranLetterSpacing ?? 0) * 100).toFixed(0)))}٪</div>
            </div>
            <div className="mt-3">
              <Slider
                value={[prefs.quranLetterSpacing ?? 0]}
                min={0}
                max={0.12}
                step={0.005}
                onValueChange={(v) => setPrefs({ quranLetterSpacing: clamp(v[0] ?? 0, 0, 0.12) })}
                aria-label="تباعد الحروف"
              />
            </div>
          </div>

          {/* ── Word spacing slider ──── */}
          <div>
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-medium">تباعد الكلمات</div>
              <div className="text-xs opacity-70 tabular-nums">{arNum(parseInt(((prefs.quranWordSpacing ?? 0) * 100).toFixed(0)))}٪</div>
            </div>
            <div className="mt-3">
              <Slider
                value={[prefs.quranWordSpacing ?? 0]}
                min={0}
                max={0.25}
                step={0.01}
                onValueChange={(v) => setPrefs({ quranWordSpacing: clamp(v[0] ?? 0, 0, 0.25) })}
                aria-label="تباعد الكلمات"
              />
            </div>
          </div>

          {/* ── Se10: Daily goal stepper + preset buttons ──── */}
          <div className="glass rounded-3xl p-4 border border-[var(--stroke)]">
            <div className="text-sm font-semibold mb-1">الهدف اليومي للقرآن</div>
            <div className="text-xs opacity-65 mb-3">عدد الآيات المستهدف يومياً</div>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Presets */}
              {([
                { label: "مبتدئ — ١٠ آيات", value: 10 },
                { label: "منتظم — صفحة", value: 15 },
                { label: "متميز — ٥ صفحات", value: 75 },
                { label: "حافظ — جزء كامل", value: 208 },
              ]).map((p) => (
                <button type="button"
                  key={p.value}
                  onClick={() => setPrefs({ quranDailyGoal: p.value })}
                  aria-pressed={(prefs.quranDailyGoal ?? 10) === p.value}
                  className={[
                    "px-3 py-2 rounded-xl border text-xs transition min-h-[36px]",
                    (prefs.quranDailyGoal ?? 10) === p.value
                      ? "bg-accent-15 border-accent-35 font-semibold"
                      : "bg-[var(--card)] border-[var(--stroke)] hover:bg-[var(--card-2)]"
                  ].join(" ")}
                >
                  {p.label}
                </button>
              ))}
              <div className="flex items-center gap-2 mr-auto">
                <button type="button"
                  className="w-8 h-8 rounded-xl bg-[var(--card)] border border-[var(--stroke)] flex items-center justify-center hover:bg-[var(--card-2)] transition text-base"
                  onClick={() => setPrefs({ quranDailyGoal: Math.max(1, (prefs.quranDailyGoal ?? 10) - 5) })}
                  aria-label="تقليل الهدف"
                >−</button>
                <span className="w-12 text-center text-sm tabular-nums font-semibold">{arNum((prefs.quranDailyGoal ?? 10))}</span>
                <button type="button"
                  className="w-8 h-8 rounded-xl bg-[var(--card)] border border-[var(--stroke)] flex items-center justify-center hover:bg-[var(--card-2)] transition text-base"
                  onClick={() => setPrefs({ quranDailyGoal: Math.min(604, (prefs.quranDailyGoal ?? 10) + 5) })}
                  aria-label="زيادة الهدف"
                >+</button>
              </div>
            </div>
          </div>

          {/* ── Reciter selection (unified picker, same as Quran + Mushaf) ──── */}
          <SettingRow
            title="القارئ"
            desc="اختر صوت التلاوة للاستماع. التصنيفات تسهّل الاختيار من بين 28 صوتًا."
            right={null}
          />
          <button type="button"
            onClick={() => setShowReciterPicker(true)}
            aria-label="اختيار القارئ"
            className="flex w-full items-center justify-between gap-3 rounded-2xl border border-[var(--stroke)] bg-[var(--card)] p-3 text-start transition hover:border-accent-35 active:scale-[0.99]">
            <div className="flex items-center gap-3 min-w-0">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent-15 border border-accent-35 text-base">🎙</span>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">{getReciter(prefs.quranReciter ?? "Alafasy_128kbps")?.label ?? "القارئ"}</div>
                <div className="truncate text-[10.5px] text-[var(--muted-2)]">
                  اضغط للاختيار من {arNum(QURAN_RECITERS.length)} قارئًا مع بحث
                </div>
              </div>
            </div>
            <span className="text-[var(--muted-2)] text-sm">←</span>
          </button>

        </div>
      </Card>

      <QuranSettingsCard />
      <TranslationSettingsCard />

      <Card id="settings-tasbeeh" className="p-5">
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-[var(--accent)]" aria-hidden="true" />
          <div className="font-semibold">تجربة التسبیح</div>
        </div>

        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <SettingRow
            title="الاهتزاز"
            desc="اهتزاز خفيف عند العدّ"
            right={
              <Switch checked={prefs.enableHaptics} onCheckedChange={(v) => setPrefs({ enableHaptics: v })} />
            }
          />
          <SettingRow
            title="قوة الاهتزاز"
            desc="خفيف · متوسط · قوي · إيقاف"
            right={
              <div className="flex items-center gap-1 rounded-xl border border-[var(--stroke)] bg-[var(--card)] p-1">
                {(["off", "light", "medium", "strong"] as const).map((v) => (
                  <button type="button"
                    key={v}
                    onClick={() => setPrefs({ hapticStrength: v })}
                    aria-pressed={(prefs.hapticStrength ?? "medium") === v}
                    className={[
                      "px-2.5 py-1.5 text-xs font-semibold rounded-lg transition",
                      (prefs.hapticStrength ?? "medium") === v
                        ? "bg-[var(--accent)] text-[var(--on-accent)]"
                        : "text-[var(--muted)] hover:bg-[var(--card-2)]",
                    ].join(" ")}
                  >
                    {v === "off" ? "إيقاف" : v === "light" ? "خفيف" : v === "medium" ? "متوسط" : "قوي"}
                  </button>
                ))}
              </div>
            }
          />
          <SettingRow
            title="أصوات العدّ"
            desc="نغمة لطيفة عند اكتمال الهدف"
            right={
              <Switch
                checked={prefs.tasbeehSoundEnabled ?? true}
                onCheckedChange={(v) => setPrefs({ tasbeehSoundEnabled: v })}
              />
            }
          />
          <SettingRow
            title="الانتقال التلقائي"
            desc="ينتقل للذكر التالي عند الاكتمال"
            right={
              <Switch checked={prefs.autoAdvanceDhikr ?? true} onCheckedChange={(v) => setPrefs({ autoAdvanceDhikr: v })} />
            }
          />
        </div>

        {/* ── Sebha / quick-tasbeeh goal ── */}
        <div className="mt-5 glass rounded-3xl p-4 border border-[var(--stroke)]">
          <div className="text-sm font-semibold mb-1">هدف السبحة اليومي</div>
          <div className="text-xs opacity-65 mb-3">يُطبَّق في الصفحة الرئيسية وصفحة السبحة</div>
          <div className="flex items-center gap-2 flex-wrap">
            {([33, 100, 200, 500] as const).map((v) => (
              <button type="button"
                key={v}
                onClick={() => setSebhaTarget(v)}
                aria-pressed={sebhaTarget === v}
                className={[
                  "px-4 py-2 rounded-xl border text-sm font-semibold transition min-h-[40px]",
                  sebhaTarget === v
                    ? "bg-accent-15 border-accent-35"
                    : "bg-[var(--card)] border-[var(--stroke)] hover:bg-[var(--card-2)]"
                ].join(" ")}
              >
                {arNum(v)}
              </button>
            ))}
            <div className="flex items-center gap-2 mr-auto">
              <button type="button"
                className="w-9 h-9 rounded-xl bg-[var(--card)] border border-[var(--stroke)] flex items-center justify-center hover:bg-[var(--card-2)] transition text-base"
                onClick={() => setSebhaTarget(Math.max(10, sebhaTarget - 10))}
                aria-label="تقليل الهدف"
              >−</button>
              <span className="w-14 text-center text-sm tabular-nums font-semibold">
                {arNum(sebhaTarget)}
              </span>
              <button type="button"
                className="w-9 h-9 rounded-xl bg-[var(--card)] border border-[var(--stroke)] flex items-center justify-center hover:bg-[var(--card-2)] transition text-base"
                onClick={() => setSebhaTarget(Math.min(9999, sebhaTarget + 10))}
                aria-label="زيادة الهدف"
              >+</button>
            </div>
          </div>
        </div>
      </Card>

      <Card id="settings-offline-content" className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-2 min-w-0">
            <Download size={18} className="mt-1 text-[var(--accent)] shrink-0" aria-hidden="true" />
            <div className="min-w-0">
              <div className="font-semibold">المحتوى دون إنترنت</div>
              <div className="text-xs opacity-65 mt-1 leading-6">
                بيانات المصحف الأساسية مضمّنة داخل التطبيق، وتعمل بعد تثبيت APK مباشرة.
              </div>
            </div>
          </div>
          <span
            className="rounded-full border px-3 py-1 text-[11px] font-semibold"
            style={{
              borderColor: mushafOfflineStatus?.ready ? "color-mix(in srgb, var(--ok) 35%, transparent)" : "var(--stroke)",
              background: mushafOfflineStatus?.ready ? "color-mix(in srgb, var(--ok) 12%, transparent)" : "var(--card)",
              color: mushafOfflineStatus?.ready ? "var(--ok)" : "var(--muted)",
            }}
          >
            مضمّن
          </span>
        </div>

        <div className="mt-4 rounded-3xl border border-[var(--stroke)] bg-[var(--card)] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-semibold">المصحف للقراءة</div>
              <div className="text-xs opacity-65 mt-1 leading-6">
                {mushafOfflineStatus?.ready
                  ? (mushafOfflineStatus.indexedDBReady
                    ? `مضمّن داخل APK ونسخة التخزين المحلي جاهزة منذ ${mushafPinnedDate ?? "آخر تشغيل"}`
                    : `مضمّن داخل APK، والحجم التقريبي ${mushafOfflineStatus.sizeLabel}`)
                  : "جارٍ التحقق من نسخة المصحف"}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant={mushafOfflineStatus?.indexedDBReady ? "secondary" : "primary"}
                onClick={() => void downloadOfflineMushaf()}
                disabled={!!mushafOfflineProgress}
              >
                <Download size={14} aria-hidden="true" />
                {mushafOfflineStatus?.indexedDBReady ? "تحديث النسخة المحلية" : "تجهيز التخزين المحلي"}
              </Button>
            </div>
          </div>
          {mushafOfflineProgress && (
            <div className="mt-4" role="status" aria-live="polite">
              <div className="flex items-center justify-between gap-3 text-xs opacity-70">
                <span>{mushafOfflineProgress.label}</span>
                <span className="tabular-nums">{mushafProgressPct}%</span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-[var(--card-2)] overflow-hidden border border-[var(--stroke)]">
                <div className="h-full rounded-full transition-all" style={{ width: `${mushafProgressPct}%`, background: "var(--accent)" }} />
              </div>
            </div>
          )}
        </div>
      </Card>

      <Card id="settings-reminders" className="p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Bell size={18} className="text-[var(--accent)]" aria-hidden="true" />
            <div>
              <div className="font-semibold">التذكيرات</div>
              <div className="text-xs opacity-65 mt-1 leading-6">
                تذكيرات يومية للأذكار وورد القرآن.
              </div>
            </div>
          </div>
          <Switch
            aria-label="تفعيل التذكيرات"
            checked={reminders.enabled}
            onCheckedChange={async (v) => {
              setReminders({ enabled: v });
              if (!isNative) return;

              if (!v) {
                await cancelAllReminders();
                toast.success("تم إيقاف التذكيرات");
                return;
              }

              // Turning on: try to request permission and schedule once.
              try {
                const p = await requestNotificationPermission();
                setNotifPerm(p);
                if (p !== "granted") {
                  setReminders({ enabled: false });
                  toast.error("لم يتم السماح بالإشعارات");
                  return;
                }
                await ensureExactAlarmPermission();
                await syncReminders({ ...reminders, enabled: true });
                toast.success("تم تفعيل التذكيرات");
              } catch {
                setReminders({ enabled: false });
                toast.error("تعذر تفعيل التذكيرات");
              }
            }}
          />
        </div>

        {isNative && reminders.enabled && (
          <div className="mt-2 flex justify-end">
            <button type="button"
              onClick={async () => {
                try {
                  await syncReminders(reminders);
                  toast.success("تمت مزامنة التذكيرات");
                } catch {
                  toast.error("تعذرت المزامنة");
                }
              }}
              className="text-xs px-3 py-1.5 rounded-xl border border-[var(--stroke)] bg-[var(--card)] hover:bg-[var(--card-2)] transition flex items-center gap-1.5 min-h-[36px]"
            >
              <RotateCw size={12} aria-hidden="true" />
              مزامنة الآن
            </button>
          </div>
        )}

        {!isNative ? (
          <div className="mt-4 text-xs opacity-65 leading-6">
            التذكيرات تعمل داخل تطبيق الهاتف.
          </div>
        ) : notifPerm !== "granted" ? (
          <div className="mt-4 text-xs opacity-65 leading-6">
            حالة الإذن: {notifPerm === "denied" ? "مرفوض" : "غير مفعّل"}. فعّل التذكيرات لطلب الإذن.
          </div>
        ) : null}

        {/* New — surfaced per user request: the on-device custom-reminders
           that the Companion AI creates via the create_reminder tool call.
           They live in IDB through noorStore and were invisible in Settings
           before. This card links straight into the reminders page where they
           can be created, edited, deleted, and AI-created ones are tagged. */}
        <div
          className="mt-4 rounded-3xl border border-accent-35 bg-gradient-to-br from-accent-12 to-accent-5 p-4"
          data-testid="settings-custom-reminders-card"
        >
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3 min-w-0">
              <span
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-accent-35 bg-accent-20"
                aria-hidden="true"
              >
                <Sparkles size={16} className="text-[var(--accent)]" />
              </span>
              <div className="min-w-0">
                <div className="text-sm font-semibold flex items-center gap-2">
                  تذكيراتي المخصّصة
                  {customReminders.length > 0 ? (
                    <Badge>
                      {toArabicNumeral(customReminders.length)}
                    </Badge>
                  ) : null}
                </div>
                <div className="text-xs opacity-70 mt-0.5 leading-6">
                  تذكيرات قابلة للبرمجة — يمكنك إنشاؤها يدويًا أو إن يضيفها «أثر» بالذكاء الاصطناعي.
                </div>
              </div>
            </div>
            <Link
              to="/reminders"
              className="text-xs px-3 py-1.5 rounded-xl border border-[var(--accent)]/55 bg-[var(--accent)]/12 text-[var(--accent)] hover:bg-[var(--accent)]/20 transition flex items-center gap-1.5 min-h-[36px] font-semibold"
            >
              <BookOpen size={12} aria-hidden="true" />
              فتح صفحة التذكيرات
            </Link>
          </div>
          {customReminders.length > 0 ? (
            <div className="mt-3 text-[11px] opacity-65 flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-200 px-2 py-0.5">
                <Sparkles size={9} aria-hidden="true" />
                أُنشئ من «أثر»
              </span>
              وسيُرسلك إشعار به في الوقت المحدد.
            </div>
          ) : (
            <div className="mt-3 text-[11px] opacity-55">
              لم تُنشأ أي تذكيرات بعد. جرّب أن تقول ل«أثر»: «ذكّرني بأذكار الصباح كل يوم».
            </div>
          )}
        </div>

        <div className="mt-4 rounded-3xl border border-[var(--stroke)] bg-[var(--card)] p-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <div className="text-sm font-semibold">صوت التذكير</div>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-2" role="group" aria-label="اختيار صوت التذكير">
            {REMINDER_SOUND_OPTIONS.map((option) => {
              const active = reminders.soundProfile === option.id;
              return (
                <div
                  key={option.id}
                  className={[
                    "rounded-2xl border p-3 transition flex flex-wrap items-center justify-between gap-3",
                    active
                      ? "bg-accent-12 border-accent-30"
                      : "bg-[var(--card)] border-[var(--stroke)]",
                  ].join(" ")}
                >
                  <button type="button"
                    onClick={() => setReminders({ soundProfile: option.id })}
                    className="min-w-0 flex-1 text-right"
                    aria-pressed={active}
                    aria-label={`صوت التذكير: اختيار صوت ${option.label}`}
                    disabled={!reminders.enabled && isNative}
                  >
                    <div className="text-sm font-semibold">{option.label}</div>
                  </button>
                  <div className="flex justify-end">
                    <button type="button"
                      onClick={() => void toggleReminderPreview(option.id)}
                      aria-label={playingPreview === `reminder:${option.id}` ? `إيقاف معاينة صوت ${option.label}` : `معاينة صوت ${option.label}`}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--stroke)] bg-[var(--card)] px-3 py-2 text-xs transition hover:bg-[var(--card-2)]"
                    >
                      {playingPreview === `reminder:${option.id}` ? <Square size={12} aria-hidden="true" /> : <Play size={12} aria-hidden="true" />}
                      {playingPreview === `reminder:${option.id}` ? "إيقاف" : "معاينة"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div id="prayer-settings" className="glass rounded-3xl p-4 border border-[var(--stroke)] md:col-span-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">تنبيهات الصلوات</div>
              </div>
              <Switch
                aria-label="تنبيهات الصلوات"
                checked={reminders.prayerAlertsEnabled}
                onCheckedChange={(v) => setReminders({ prayerAlertsEnabled: v })}
                disabled={!reminders.enabled}
              />
            </div>

            <div className="mt-4 rounded-2xl border border-[var(--stroke)] bg-[var(--card)] p-3">
              <div className="text-xs font-semibold">اختر الصلوات التي تريد الأذان لها</div>
              <div className="mt-3 grid grid-cols-2 md:grid-cols-5 gap-2">
                {PRAYER_ALERT_OPTIONS.map((prayer) => (
                  <label
                    key={prayer.id}
                    className="rounded-2xl border border-[var(--stroke)] bg-[var(--card-2)] px-3 py-2.5 flex items-center justify-between gap-2 text-sm"
                  >
                    <span>{prayer.label}</span>
                    <Switch
                      aria-label={`تنبيه ${prayer.label}`}
                      checked={reminders.prayerAlerts?.[prayer.id] ?? true}
                      onCheckedChange={(v) => setReminders({
                        prayerAlerts: { ...reminders.prayerAlerts, [prayer.id]: v },
                      })}
                      disabled={!reminders.enabled || !reminders.prayerAlertsEnabled}
                    />
                  </label>
                ))}
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-[var(--stroke)] bg-[var(--card-2)] p-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <div className="text-sm font-semibold">صوت الأذان</div>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-2" role="group" aria-label="اختيار صوت الأذان">
                {PRAYER_SOUND_OPTIONS.map((option) => {
                  const active = reminders.prayerSoundProfile === option.id;
                  return (
                    <div
                      key={option.id}
                      className={[
                        "rounded-2xl border p-3 transition flex flex-wrap items-center justify-between gap-3",
                        active
                          ? "bg-accent-12 border-accent-30"
                          : "bg-[var(--card)] border-[var(--stroke)]",
                      ].join(" ")}
                    >
                      <button type="button"
                        onClick={() => setReminders({ prayerSoundProfile: option.id })}
                        className="min-w-0 flex-1 text-right"
                        aria-pressed={active}
                        aria-label={`صوت الأذان: اختيار صوت ${option.label}`}
                        disabled={!reminders.enabled && isNative}
                      >
                        <div className="text-sm font-semibold">{option.label}</div>
                      </button>
                      <div className="flex justify-end">
                        <button type="button"
                          onClick={() => void togglePrayerPreview(option.id)}
                          aria-label={playingPreview === `prayer:${option.id}` ? `إيقاف معاينة صوت ${option.label}` : `معاينة صوت ${option.label}`}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--stroke)] bg-[var(--card)] px-3 py-2 text-xs transition hover:bg-[var(--card-2)]"
                        >
                          {playingPreview === `prayer:${option.id}` ? <Square size={12} aria-hidden="true" /> : <Play size={12} aria-hidden="true" />}
                          {playingPreview === `prayer:${option.id}` ? "إيقاف" : "معاينة"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="md:col-span-2 pt-3 pb-1">
            <div className="text-xs font-semibold opacity-55 border-b border-[var(--stroke)] pb-2">تذكيرات الأذكار اليومية</div>
          </div>
          <div className="glass rounded-3xl p-4 border border-[var(--stroke)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">أذكار الصباح</div>
                <div className="text-xs opacity-65 mt-1">تذكير يومي</div>
              </div>
              <Switch
                aria-label="تذكير أذكار الصباح"
                checked={reminders.morningEnabled}
                onCheckedChange={(v) => setReminders({ morningEnabled: v })}
                disabled={!reminders.enabled}
              />
            </div>
            <div className="mt-3">
              <Input
                type="time"
                dir="ltr"
                value={reminders.morningTime}
                onChange={(e) => setReminders({ morningTime: e.target.value })}
                disabled={!reminders.enabled || !reminders.morningEnabled}
              />
            </div>
          </div>

          <div className="glass rounded-3xl p-4 border border-[var(--stroke)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">أذكار المساء</div>
                <div className="text-xs opacity-65 mt-1">تذكير يومي</div>
              </div>
              <Switch
                aria-label="تذكير أذكار المساء"
                checked={reminders.eveningEnabled}
                onCheckedChange={(v) => setReminders({ eveningEnabled: v })}
                disabled={!reminders.enabled}
              />
            </div>
            <div className="mt-3">
              <Input
                type="time"
                dir="ltr"
                value={reminders.eveningTime}
                onChange={(e) => setReminders({ eveningTime: e.target.value })}
                disabled={!reminders.enabled || !reminders.eveningEnabled}
              />
            </div>
          </div>

          <div className="glass rounded-3xl p-4 border border-[var(--stroke)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">ورد اليوم (القرآن)</div>
                <div className="text-xs opacity-65 mt-1">تذكير يومي</div>
              </div>
              <Switch
                aria-label="تذكير ورد اليوم"
                checked={reminders.dailyWirdEnabled}
                onCheckedChange={(v) => setReminders({ dailyWirdEnabled: v })}
                disabled={!reminders.enabled}
              />
            </div>
            <div className="mt-3">
              <Input
                type="time"
                dir="ltr"
                value={reminders.dailyWirdTime}
                onChange={(e) => setReminders({ dailyWirdTime: e.target.value })}
                disabled={!reminders.enabled || !reminders.dailyWirdEnabled}
              />
            </div>
          </div>

          <div className="glass rounded-3xl p-4 border border-[var(--stroke)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">خطة الختمة</div>
                <div className="text-xs opacity-65 mt-1">تذكير يومي</div>
              </div>
              <Switch
                aria-label="تذكير خطة الختمة"
                checked={reminders.khatmaEnabled}
                onCheckedChange={(v) => setReminders({ khatmaEnabled: v })}
                disabled={!reminders.enabled}
              />
            </div>
            <div className="mt-3">
              <Input
                type="time"
                dir="ltr"
                value={reminders.khatmaTime}
                onChange={(e) => setReminders({ khatmaTime: e.target.value })}
                disabled={!reminders.enabled || !reminders.khatmaEnabled}
              />
            </div>
          </div>

          {/* Phase 10 — Daily hadith at Fajr */}
          <div className="glass rounded-3xl p-4 border border-[var(--stroke)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">حديث الفجر اليومي</div>
                <div className="text-xs opacity-65 mt-1">
                  يُرسل حديثًا نبويًا عند أذان الفجر يوميًا
                </div>
              </div>
              <Switch
                aria-label="حديث الفجر اليومي"
                checked={reminders.dailyHadithNotif ?? false}
                onCheckedChange={(v) => setReminders({ dailyHadithNotif: v })}
                disabled={!reminders.enabled}
              />
            </div>
          </div>

          {/* N6 — Tasbeeh & istighfar nudge */}
          <div className="glass rounded-3xl p-4 border border-[var(--stroke)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">تسبيح واستغفار</div>
                <div className="text-xs opacity-65 mt-1">تذكير لطيف للذكر خلال يومك</div>
              </div>
              <Switch
                aria-label="تذكير التسبيح والاستغفار"
                checked={reminders.tasbeehEnabled ?? false}
                onCheckedChange={(v) => setReminders({ tasbeehEnabled: v })}
                disabled={!reminders.enabled}
              />
            </div>
            <div className="mt-3">
              <Input
                type="time"
                dir="ltr"
                value={reminders.tasbeehTime}
                onChange={(e) => setReminders({ tasbeehTime: e.target.value })}
                disabled={!reminders.enabled || !reminders.tasbeehEnabled}
              />
            </div>
          </div>
        </div>
      </Card>

      <Card id="settings-backup" className="p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-semibold">النسخ الاحتياطي</div>
            <div className="text-xs opacity-65 mt-1 leading-6">
              تصدير/استيراد التقدّم + المفضلة + إعداداتك.
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <Button variant="secondary" onClick={onBackup}>
              <Download size={16} aria-hidden="true" />
              تصدير
            </Button>

            {/* Se7: Share to cloud (Google Drive / iCloud via native share sheet) */}
            <Button variant="secondary" onClick={() => void onShareBackup()}>
              <Share2 size={16} aria-hidden="true" />
              مشاركة
            </Button>

            <label className="inline-flex">
              <input
                type="file"
                accept=".athar,application/json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void onRestore(file);
                }}
              />
              <span className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[var(--card)] hover:bg-[var(--card-2)] border border-[var(--stroke)] cursor-pointer text-sm min-h-[44px]">
                <Upload size={16} aria-hidden="true" />
                استيراد
              </span>
            </label>
          </div>
        </div>
        <div className="mt-3 text-xs opacity-50 leading-5">
          💡 يمكنك حفظ النسخة الاحتياطية في Google Drive أو iCloud عبر زر المشاركة
        </div>
      </Card>

      {/* Se8 + Se9: Security & Advanced */}
      <Card id="settings-security" className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Fingerprint size={18} aria-hidden="true" className="text-[var(--accent)]" />
          <div className="font-semibold">الأمان والمتقدّم</div>
        </div>
        <div className="space-y-3">
          {/* Se8: Biometric lock — only shown on native. Not implemented yet (no native
              biometric plugin wired in), so this is an honest "coming soon" stub rather
              than a switch that falsely promises protection it can't enforce. */}
          {isNative && (
            <SettingRow
              title="القفل البيومتري"
              desc="حماية التطبيق ببصمة الإصبع أو التعرف على الوجه — قريبًا"
              right={
                <Switch
                  checked={false}
                  disabled
                  onCheckedChange={() => toast("قريبًا — القفل البيومتري قيد التطوير")}
                />
              }
            />
          )}
          {/* Se9: App icon variants */}
          <div className="glass rounded-3xl p-4 border border-[var(--stroke)]">
            <div className="flex items-center gap-2 mb-2">
              <Layers size={14} aria-hidden="true" className="text-[var(--accent)]" />
              <div className="text-sm font-semibold">أيقونة التطبيق</div>
            </div>
            <div className="text-xs opacity-60 mb-3">اختر نمط أيقونة التطبيق على شاشتك الرئيسية</div>
            {isNative ? (
              <div className="flex flex-wrap gap-2">
                {([
                  { id: "default", label: "🌿 الافتراضي" },
                  { id: "light", label: "☀️ فاتح" },
                  { id: "dark", label: "🌑 داكن" },
                  { id: "ramadan", label: "🌙 رمضان" },
                  { id: "gold", label: "✨ ذهبي" },
                ]).map((icon) => (
                  <button type="button"
                    key={icon.id}
                    onClick={() => toast("قريبًا — تغيير أيقونة التطبيق قيد التطوير")}
                    className="px-3 py-2 rounded-xl border border-[var(--stroke)] bg-[var(--card)] text-xs transition min-h-[36px] opacity-60 cursor-not-allowed"
                  >
                    {icon.label}
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-xs opacity-55">متاح في تطبيق iOS / Android فقط</div>
            )}
          </div>
        </div>
      </Card>

      {/* محتوى وأدلة */}
      <Card id="settings-content" className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-base" aria-hidden="true">📚</span>
          <div className="text-sm font-semibold">محتوى وأدلة</div>
        </div>
        <div className="space-y-1">
          {[
            { icon: "✨", label: "أسماء الله الحسنى", desc: "تصفح الأسماء الـ٩٩ مع المعاني", route: "/asma" },
            { icon: "🤲", label: "الأدعية", desc: "أدعية قرآنية ونبوية", route: "/duas" },
            { icon: "📖", label: "مفردات القرآن", desc: "بطاقات تعليمية لمئتي كلمة", route: "/quran-vocab" },
            { icon: "🕌", label: "قصص الأنبياء", desc: "سير مختصرة ودروس مستفادة", route: "/stories" },
            { icon: "🧎", label: "كيفية الصلاة", desc: "دليل مفصّل خطوة بخطوة", route: "/prayer-guide" },
            { icon: "💧", label: "كيفية الوضوء", desc: "خطوات الوضوء الصحيح", route: "/wudu" },
          ].map(({ icon, label, desc, route }) => (
            <button type="button"
              key={route}
              onClick={() => navigate(route)}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl transition text-right"
              style={{ background: "var(--card)", border: "1px solid var(--stroke)" }}
            >
              <span className="text-xl flex-shrink-0">{icon}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium" style={{ color: "var(--fg)" }}>{label}</div>
                <div className="text-xs opacity-55 mt-0.5" style={{ color: "var(--fg)" }}>{desc}</div>
              </div>
              <ChevronLeft size={14} aria-hidden="true" className="opacity-35 flex-shrink-0" />
            </button>
          ))}
        </div>
      </Card>

      <DangerZone />

      <div className="text-[11px] opacity-40 text-center pb-2 leading-5">
        ATHAR • أثر · v{pkgJson.version} · بيانات محلية
      </div>

      <ReciterPicker
        open={showReciterPicker}
        value={prefs.quranReciter ?? "Alafasy_128kbps"}
        onChange={(id) => setPrefs({ quranReciter: id })}
        onClose={() => setShowReciterPicker(false)}
      />
    </div>
  );
}

function TranslationSettingsCard() {
  const prefs = useNoorStore((s) => s.prefs);
  const setPrefs = useNoorStore((s) => s.setPrefs);
  const [status, setStatus] = React.useState<Partial<Record<TranslationId, "ready">>>({});

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      const next: Partial<Record<TranslationId, "ready">> = {};
      for (const src of TRANSLATION_SOURCES) {
        if (src.bundled) continue;
        try {
          await getTranslationAny(src.id, 1);
          if (cancelled) return;
          next[src.id] = "ready";
        } catch {
          // Network failure is non-fatal — Saheeh is the safe fallback.
        }
      }
      if (!cancelled) setStatus(next);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Card id="settings-translation" className="p-5">
      <div className="flex items-center gap-2">
        <Globe size={18} className="text-[var(--accent)]" aria-hidden="true" />
        <div className="font-semibold">ترجمة القرآن</div>
      </div>
      <div className="mt-1 text-[11px] text-[var(--muted-2)]">
        اختر مصدر الترجمة الذي يظهر أسفل كل آية في المصحف.
      </div>
      <div className="mt-4">
        <TranslationPicker
          enabled={!!prefs.mushafShowTranslation}
          value={(prefs.quranTranslationId as TranslationId | undefined) ?? "saheeh"}
          onEnabledChange={(v) => setPrefs({ mushafShowTranslation: v })}
          onChange={(id) => setPrefs({ quranTranslationId: id })}
          status={status}
        />
      </div>
    </Card>
  );
}

function QuranSettingsCard() {
  const prefs = useNoorStore((s) => s.prefs);
  const setPrefs = useNoorStore((s) => s.setPrefs);
  const [offline, setOffline] = React.useState<MushafOfflineStatus | null>(null);
  const [progress, setProgress] = React.useState<MushafOfflineProgress | null>(null);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => { void getMushafOfflineStatus().then(setOffline); }, []);

  const startDownload = async () => {
    setBusy(true);
    try {
      await downloadMushafCore((p) => setProgress(p));
      setOffline(await getMushafOfflineStatus());
      toast.success("تم تثبيت المصحف محليًا");
    } catch {
      toast.error("تعذّر تثبيت المصحف محليًا");
    } finally {
      setBusy(false);
      setProgress(null);
    }
  };
  const clearDownload = async () => {
    setBusy(true);
    try {
      setOffline(await clearMushafOfflineCore());
      toast.success("تم رفع التثبيت المحلي");
    } catch {
      toast.error("تعذّر الرفع");
    } finally {
      setBusy(false);
    }
  };

  const QURAN_DAILY_GOAL_PRESETS = [
    { value: 1, label: "آية واحدة" },
    { value: 5, label: "٥ آيات" },
    { value: 10, label: "١٠ آيات" },
    { value: 20, label: "صفحة" },
    { value: 60, label: "ربع حزب" },
    { value: 120, label: "نصف حزب" },
  ];

  const FONT_OPTIONS: Array<{ id: "noto_naskh" | "amiri" | "hafs"; label: string; sample: string }> = [
    { id: "noto_naskh", label: "نوتو نسخ", sample: "البقرة" },
    { id: "amiri",      label: "أميري",      sample: "البقرة" },
    { id: "hafs",       label: "حفص",        sample: "البقرة" },
  ];

  return (
    <Card id="settings-quran" className="p-5">
      <div className="flex items-center gap-2">
        <BookOpen size={18} className="text-[var(--accent)]" aria-hidden="true" />
        <div className="font-semibold">القرآن</div>
      </div>

      {/* Mushaf offline status */}
      <div className="mt-5 rounded-2xl border border-[var(--stroke)] bg-[var(--card-2)] p-3.5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">المصحف محليًا</div>
            <div className="text-[11px] text-[var(--muted-2)]">
              {offline?.indexedDBReady
                ? `مثبَّت · ${offline.sizeLabel}`
                : "غير مثبَّت — النسخة المضمّنة في التطبيق تعمل، التثبيت المحلي يجعلها فورية"}
            </div>
          </div>
          {offline?.indexedDBReady ? (
            <Button variant="outline" size="sm" onClick={clearDownload} disabled={busy}>
              رفع التثبيت
            </Button>
          ) : (
            <Button size="sm" onClick={startDownload} disabled={busy}>
              {busy ? "جاري التثبيت…" : "تثبيت محليًا"}
            </Button>
          )}
        </div>
        {progress ? (
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-[var(--stroke)]/40">
            <div
              className="h-full rounded-full bg-[var(--accent)] transition-all duration-300"
              style={{ width: `${Math.round((progress.done / progress.total) * 100)}%` }}
            />
          </div>
        ) : null}
        {progress ? (
          <p className="mt-1 text-[10.5px] text-[var(--muted-2)]">{progress.label}</p>
        ) : null}
      </div>

      {/* Daily goal presets */}
      <div className="mt-5">
        <div className="text-sm font-semibold">ورد اليوم</div>
        <div className="mt-1 text-[11px] text-[var(--muted-2)]">عدد الآيات الذي تريد قراءتها كل يوم</div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {QURAN_DAILY_GOAL_PRESETS.map((p) => (
            <button key={p.value} type="button"
              onClick={() => setPrefs({ quranDailyGoal: p.value })}
              aria-pressed={(prefs.quranDailyGoal ?? 10) === p.value}
              className={[
                "rounded-xl border px-3 py-1.5 text-[12px] font-semibold transition active:scale-95",
                (prefs.quranDailyGoal ?? 10) === p.value
                  ? "bg-accent-15 border-accent-35 text-[var(--accent)]"
                  : "bg-[var(--card)] border-[var(--stroke)] hover:bg-[var(--card-2)]",
              ].join(" ")}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Arabic font picker */}
      <div className="mt-5">
        <div className="text-sm font-semibold">خط القرآن</div>
        <div className="mt-1 text-[11px] text-[var(--muted-2)]">اختر الخط المفضّل لقراءة المصحف</div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {FONT_OPTIONS.map((f) => (
            <button key={f.id} type="button"
              onClick={() => setPrefs({ arabicFont: f.id })}
              aria-pressed={(prefs.arabicFont ?? "noto_naskh") === f.id}
              className={[
                "rounded-2xl border p-3 text-center transition",
                (prefs.arabicFont ?? "noto_naskh") === f.id
                  ? "bg-accent-15 border-accent-35"
                  : "bg-[var(--card)] border-[var(--stroke)] hover:bg-[var(--card-2)]",
              ].join(" ")}>
              <div className={[
                "text-2xl",
                f.id === "noto_naskh" ? "arabic-text" : f.id === "amiri" ? "font-amiri" : "font-hafs",
              ].join(" ")} style={{ lineHeight: 1 }}>{f.sample}</div>
              <div className="mt-1.5 text-[11px] font-semibold">{f.label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Background vibrancy */}
      <div className="mt-5 flex items-center justify-between gap-3 rounded-2xl border border-[var(--stroke)] bg-[var(--card-2)] p-3.5">
        <div>
          <div className="text-sm font-semibold">حيوية الخلفية في المصحف</div>
          <div className="text-[11px] text-[var(--muted-2)]">يظهر لون زاهي خلف الصفحة بدل الرمادي الخافت</div>
        </div>
        <Switch
          checked={!!prefs.bgVibrancyBoost}
          onCheckedChange={(v) => setPrefs({ bgVibrancyBoost: v })}
        />
      </div>

      {/* Quran font scale slider */}
      <div className="mt-5">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-semibold">حجم خط قراءة القرآن</div>
          <div className="text-xs opacity-70 tabular-nums">{arNum(Math.round((prefs.quranFontScale ?? 1.0) * 100))}٪</div>
        </div>
        <div className="mt-1 text-[11px] text-[var(--muted-2)]">يطبَّق على قائمة آيات القرآن، ليس المصحف نفسه</div>
        <div className="mt-3">
          <Slider
            value={[prefs.quranFontScale ?? 1.0]}
            min={0.9}
            max={1.6}
            step={0.01}
            onValueChange={(v) => setPrefs({ quranFontScale: clamp(v[0] ?? 1.0, 0.9, 1.6) })}
            aria-label="حجم خط القرآن"
          />
        </div>
      </div>

      {/* Quran page size (ayahs per virtual page in list view) */}
      <div className="mt-5">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-semibold">عدد الآيات في الصفحة</div>
          <div className="text-xs opacity-70 tabular-nums">{arNum((prefs.quranPageSize ?? 12))} آية</div>
        </div>
        <div className="mt-3">
          <Slider
            value={[prefs.quranPageSize ?? 12]}
            min={5}
            max={25}
            step={1}
            onValueChange={(v) => setPrefs({ quranPageSize: clamp(Math.round(v[0] ?? 12), 5, 25) })}
            aria-label="عدد الآيات في الصفحة"
          />
        </div>
      </div>

      {/* Quran scroll mode (page mode = flip, scroll mode = continuous) */}
      <div className="mt-5 flex items-center justify-between gap-3 rounded-2xl border border-[var(--stroke)] bg-[var(--card-2)] p-3.5">
        <div>
          <div className="text-sm font-semibold">نمط التصفح</div>
          <div className="text-[11px] text-[var(--muted-2)]">صفحة بصفحة أو تمرير مستمر</div>
        </div>
        <div className="flex gap-1.5" role="group" aria-label="نمط تصفح القرآن">
          {([
            { id: "page", label: "صفحات" },
            { id: "scroll", label: "تمرير" },
          ] as const).map((m) => (
            <button key={m.id} type="button"
              onClick={() => setPrefs({ quranScrollMode: m.id })}
              aria-pressed={(prefs.quranScrollMode ?? "page") === m.id}
              className={[
                "rounded-xl border px-3 py-1.5 text-xs font-semibold transition min-h-[36px]",
                (prefs.quranScrollMode ?? "page") === m.id
                  ? "bg-accent-15 border-accent-35"
                  : "bg-[var(--card)] border-[var(--stroke)] hover:bg-[var(--card-2)]",
              ].join(" ")}>
              {m.label}
            </button>
          ))}
        </div>
      </div>
    </Card>
  );
}

const HOME_WIDGET_LABELS: Record<HomeWidgetKey, string> = {
  prayer: "مواقيت الصلاة",
  hadith: "حديث اليوم",
  wisdom: "حكمة اليوم",
  smart: "الذكر الذكي",
  checklist: "القائمة اليومية",
  dailyStep: "خطوة النمو",
  tasbeeh: "التسبيح السريع",
  dailyWird: "الورد اليومي",
  dailyVerse: "آية اليوم",
  quests: "المهام اليومية",
};

function HomeWidgetsCard(props: {
  prefs: import("@/store/noorStore").Preferences;
  setPrefs: (partial: Partial<import("@/store/noorStore").Preferences>) => void;
}) {
  const { prefs, setPrefs } = props;
  const order: HomeWidgetKey[] = prefs.homeWidgetsOrder ?? [...DEFAULT_HOME_WIDGETS_ORDER];

  const moveUp = (i: number) => {
    if (i === 0) return;
    const next = [...order];
    [next[i - 1], next[i]] = [next[i], next[i - 1]];
    setPrefs({ homeWidgetsOrder: next });
  };

  const moveDown = (i: number) => {
    if (i === order.length - 1) return;
    const next = [...order];
    [next[i], next[i + 1]] = [next[i + 1], next[i]];
    setPrefs({ homeWidgetsOrder: next });
  };

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-4">
        <Layers size={18} aria-hidden="true" className="text-[var(--accent)]" />
        <div>
          <div className="font-semibold">عناصر الصفحة الرئيسية</div>
          <div className="text-xs opacity-60 mt-0.5">تفعيل وترتيب البطاقات</div>
        </div>
      </div>
      <div role="list" aria-label="ترتيب عناصر الصفحة الرئيسية" className="space-y-2">
        {order.map((key, i) => (
          <div
            key={key}
            role="listitem"
            className="flex items-center gap-3 glass rounded-2xl border border-[var(--stroke)] px-3 py-2.5"
          >
            <div className="flex flex-col gap-0.5">
              <button type="button"
                onClick={() => moveUp(i)}
                disabled={i === 0}
                className="p-1 rounded-lg hover:bg-[var(--card-2)] transition disabled:opacity-25"
                aria-label={`تحريك ${HOME_WIDGET_LABELS[key]} لأعلى`}
              >
                <ArrowUp size={12} aria-hidden="true" />
              </button>
              <button type="button"
                onClick={() => moveDown(i)}
                disabled={i === order.length - 1}
                className="p-1 rounded-lg hover:bg-[var(--card-2)] transition disabled:opacity-25"
                aria-label={`تحريك ${HOME_WIDGET_LABELS[key]} لأسفل`}
              >
                <ArrowDown size={12} aria-hidden="true" />
              </button>
            </div>
            <span
              className={`flex-1 text-sm ${key === "prayer" ? "cursor-pointer hover:text-[var(--accent)] transition-colors" : ""}`}
              role={key === "prayer" ? "button" : undefined}
              tabIndex={key === "prayer" ? 0 : undefined}
              onClick={key === "prayer" ? () => { document.getElementById("prayer-settings")?.scrollIntoView({ behavior: "smooth", block: "center" }); } : undefined}
              onKeyDown={key === "prayer" ? (e) => { if (e.key === "Enter" || e.key === " ") document.getElementById("prayer-settings")?.scrollIntoView({ behavior: "smooth", block: "center" }); } : undefined}
            >
              {HOME_WIDGET_LABELS[key]}
              {(key === "wisdom" || key === "dailyVerse") && (
                <span className="text-[10px] opacity-35 bg-[var(--card)] rounded-md px-1.5 py-0.5 mr-1 whitespace-nowrap">ضمن شريط اليومي</span>
              )}
              {key === "quests" && (
                <span className="text-[10px] opacity-35 bg-[var(--card)] rounded-md px-1.5 py-0.5 mr-1 whitespace-nowrap">ضمن القائمة</span>
              )}
            </span>
            <Switch
              aria-label={HOME_WIDGET_LABELS[key]}
              checked={prefs.homeWidgets[key] ?? true}
              onCheckedChange={(v) => setPrefs({ homeWidgets: { ...prefs.homeWidgets, [key]: v } })}
            />
          </div>
        ))}
      </div>
    </Card>
  );
}

function SettingRow(props: { title: string; desc: string; right: React.ReactNode; disabled?: boolean }) {
  // Inject aria-label on the right element so screen readers can name the control
  const labeledRight = React.isValidElement(props.right)
    ? React.cloneElement(props.right as React.ReactElement<Record<string, unknown>>, { "aria-label": props.title })
    : props.right;
  return (
    <div className={`glass rounded-3xl p-4 border border-[var(--stroke)] flex items-center justify-between gap-4${props.disabled ? " opacity-35 pointer-events-none select-none" : ""}`}>
      <div className="min-w-0">
        <div className="text-sm font-semibold">{props.title}</div>
        <div className="text-xs opacity-65 mt-1 leading-5">{props.desc}</div>
      </div>
      <div>{labeledRight}</div>
    </div>
  );
}

function DangerZone() {
  const [confirm, setConfirm] = React.useState<"all" | "adhkar" | "quran" | null>(null);

  const resetAdhkarProgress = useNoorStore((s) => s.resetAdhkarProgress);
  const resetQuranData = useNoorStore((s) => s.resetQuranData);

  const resetAll = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
      // Also wipe all IndexedDB databases (quran cache, etc.)
      if (typeof indexedDB !== "undefined" && indexedDB.databases) {
        void indexedDB.databases().then((dbs) => {
          for (const db of dbs) {
            if (db.name) indexedDB.deleteDatabase(db.name);
          }
        });
      } else {
        indexedDB.deleteDatabase("noor-quran-cache-v1");
      }
      toast.success("تم مسح جميع البيانات");
      setTimeout(() => window.location.reload(), 800);
    } catch {
      toast.error("تعذر مسح البيانات");
    }
  };

  const handleReset = () => {
    if (confirm === "adhkar") {
      resetAdhkarProgress();
      toast.success("تم مسح تقدّم الأذكار");
      setConfirm(null);
    } else if (confirm === "quran") {
      resetQuranData();
      toast.success("تم مسح بيانات القرآن");
      setConfirm(null);
    } else if (confirm === "all") {
      resetAll();
    }
  };

  return (
    <Card className="p-5 border border-danger-20">
      <div className="flex items-center gap-2 mb-3">
        <Trash2 size={16} className="text-[var(--danger)]" aria-hidden="true" />
        <div className="text-sm font-semibold text-[var(--danger)]">منطقة الخطر</div>
      </div>
      <div className="text-xs opacity-65 mb-4 leading-6">
        إعادة تعيين بياناتك المحلية. لا يمكن التراجع عن هذه الإجراءات.
      </div>

      {confirm ? (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="border-danger-40 text-[var(--danger)] hover:bg-danger-10"
            onClick={handleReset}
          >
            <Trash2 size={15} aria-hidden="true" />
            {confirm === "adhkar" && "تأكيد مسح الأذكار"}
            {confirm === "quran" && "تأكيد مسح القرآن"}
            {confirm === "all" && "تأكيد المسح الكامل"}
          </Button>
          <Button variant="secondary" onClick={() => setConfirm(null)}>إلغاء</Button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <Button
            variant="outline"
            className="justify-start border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/8"
            onClick={() => setConfirm("adhkar")}
          >
            <BookMarked size={15} aria-hidden="true" />
            مسح تقدّم الأذكار والمفضلة
          </Button>
          <Button
            variant="outline"
            className="justify-start border-orange-500/30 text-orange-600 dark:text-orange-400 hover:bg-orange-500/8"
            onClick={() => setConfirm("quran")}
          >
            <BookOpen size={15} aria-hidden="true" />
            مسح بيانات القرآن والإشارات
          </Button>
          <Button
            variant="outline"
            className="justify-start border-danger-30 text-danger-80 hover:bg-danger-8"
            onClick={() => setConfirm("all")}
          >
            <Trash2 size={15} aria-hidden="true" />
            مسح جميع البيانات
          </Button>
        </div>
      )}
    </Card>
  );
}
