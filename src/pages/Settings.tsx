import * as React from "react";
import { Download, Upload, Palette, SlidersHorizontal, Sparkles, Bell, Trash2, Keyboard, BookMarked, BookOpen, Play } from "lucide-react";
import toast from "react-hot-toast";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Switch } from "@/components/ui/Switch";
import { Slider } from "@/components/ui/Slider";
import { Input } from "@/components/ui/Input";
import { useNoorStore, type NoorTheme, type ExportBlobV1 } from "@/store/noorStore";
import { downloadJson } from "@/lib/download";
import { clamp } from "@/lib/utils";
import {
  cancelAllReminders,
  getNotificationPermission,
  isNativePlatform,
  playReminderSoundPreview,
  REMINDER_SOUND_OPTIONS,
  requestNotificationPermission,
  syncReminders
} from "@/lib/reminders";

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
};

const RECITERS: Array<{ id: string; label: string }> = [
  { id: "Alafasy_128kbps",              label: "مشاري العفاسي" },
  { id: "Abdul_Basit_Murattal_192kbps", label: "عبد الباسط المرتل" },
  { id: "Hudhaify_128kbps",             label: "عبدالرحمن الحذيفي" },
  { id: "Minshawy_Murattal_128kbps",    label: "محمد المنشاوي" },
  { id: "Abdullah_Basfar_192kbps",      label: "عبدالله بصفر" },
  { id: "Husary_128kbps",               label: "محمود الحصري" },
];

function ThemeChip(props: { value: NoorTheme; label: string; active: boolean; onClick: () => void }) {
  const dotColor = THEME_ACCENTS[props.value];
  return (
    <button
      onClick={props.onClick}
      className={[
        "px-3 py-2.5 rounded-2xl border text-sm transition flex items-center gap-2 min-h-[44px]",
        props.active
          ? "bg-[var(--accent)]/15 border-[var(--accent)]/35"
          : "bg-white/6 border-white/10 hover:bg-white/8"
      ].join(" ")}
    >
      <span
        className="w-2.5 h-2.5 rounded-full shrink-0 ring-1 ring-white/20"
        style={{ backgroundColor: dotColor }}
      />
      {props.label}
    </button>
  );
}

export function SettingsPage() {
  const prefs = useNoorStore((s) => s.prefs);
  const setPrefs = useNoorStore((s) => s.setPrefs);
  const reminders = useNoorStore((s) => s.reminders);
  const setReminders = useNoorStore((s) => s.setReminders);
  const exportState = useNoorStore((s) => s.exportState);
  const importState = useNoorStore((s) => s.importState);
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

  const onBackup = () => {
    const blob = exportState();
    downloadJson(`ATHAR-نسخة-احتياطية-${blob.exportedAt.slice(0, 10)}.athar`, blob);
    toast.success("تم تنزيل النسخة الاحتياطية");
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

  return (
    <div className="space-y-4 page-enter">
      {/* Quick backup strip */}
      <div className="flex items-center justify-between gap-3 px-1">
        <span className="text-xs opacity-55">احتفظ ببياناتك بأمان</span>
        <button
          type="button"
          onClick={onBackup}
          className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-2xl border border-white/15 bg-white/6 hover:bg-white/10 transition"
        >
          <Download size={12} />
          نسخ احتياطي
        </button>
      </div>

      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={16} className="text-[var(--accent)]" />
          <div className="text-sm font-semibold">ملخص بياناتك</div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 text-center">
            <div className="text-[11px] opacity-55">المفضلة</div>
            <div className="mt-1 text-sm font-bold tabular-nums">{dataSummary.favoriteCount}</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 text-center">
            <div className="text-[11px] opacity-55">علامات القرآن</div>
            <div className="mt-1 text-sm font-bold tabular-nums">{dataSummary.bookmarkCount}</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 text-center">
            <div className="text-[11px] opacity-55">أيام النشاط</div>
            <div className="mt-1 text-sm font-bold tabular-nums">{dataSummary.activeDays}</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 text-center">
            <div className="text-[11px] opacity-55">عناصر متقدمة</div>
            <div className="mt-1 text-sm font-bold tabular-nums">{dataSummary.touchedItems}</div>
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex items-center gap-2">
          <Palette size={18} className="text-[var(--accent)]" />
          <div className="font-semibold">المظهر</div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
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
            title="تقليل الحركة"
            desc="لأجهزة أبطأ أو لتقليل الدوخة"
            right={
              <Switch checked={prefs.reduceMotion} onCheckedChange={(v) => setPrefs({ reduceMotion: v })} />
            }
          />
        </div>

        {/* Custom accent color */}
        <div className="mt-5 pt-4 border-t border-white/8">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <div className="text-sm font-medium">لون مخصص</div>
              <div className="text-xs opacity-60 mt-0.5">تخصيص لون التمييز بشكل حر</div>
            </div>
            <div className="flex items-center gap-2">
              <label className="relative cursor-pointer">
                <input
                  type="color"
                  value={prefs.customAccent ?? "#fda4af"}
                  onChange={(e) => setPrefs({ customAccent: e.target.value })}
                  className="sr-only"
                />
                <span
                  className="block w-9 h-9 rounded-2xl border-2 border-white/20 shadow-inner ring-1 ring-black/20 transition hover:scale-105"
                  style={{ background: prefs.customAccent ?? "var(--accent)" }}
                />
              </label>
              {prefs.customAccent && (
                <button
                  onClick={() => setPrefs({ customAccent: undefined })}
                  className="text-xs px-2.5 py-1.5 rounded-xl bg-white/8 border border-white/10 opacity-70 hover:opacity-100 transition min-h-[36px]"
                >
                  إعادة ضبط
                </button>
              )}
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={18} className="text-[var(--accent)]" />
          <div className="font-semibold">القراءة</div>
        </div>

        <div className="mt-5 space-y-5">
          <div>
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-medium">حجم الخط</div>
              <div className="text-xs opacity-70 tabular-nums">{Math.round(prefs.fontScale * 100)}%</div>
            </div>
            <div className="mt-3">
              <Slider
                value={[prefs.fontScale]}
                min={0.9}
                max={1.6}
                step={0.01}
                onValueChange={(v) => setPrefs({ fontScale: clamp(v[0] ?? 1.05, 0.9, 1.6) })}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-medium">تباعد السطور</div>
              <div className="text-xs opacity-70 tabular-nums">{prefs.lineHeight.toFixed(1)}×</div>
            </div>
            <div className="mt-3">
              <Slider
                value={[prefs.lineHeight]}
                min={1.6}
                max={2.4}
                step={0.01}
                onValueChange={(v) => setPrefs({ lineHeight: clamp(v[0] ?? 1.95, 1.6, 2.4) })}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-medium">حجم خط القرآن</div>
              <div className="text-xs opacity-70 tabular-nums">{Math.round(prefs.quranFontScale * 100)}%</div>
            </div>
            <div className="mt-3">
              <Slider
                value={[prefs.quranFontScale]}
                min={0.9}
                max={1.6}
                step={0.01}
                onValueChange={(v) => setPrefs({ quranFontScale: clamp(v[0] ?? 1.1, 0.9, 1.6) })}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-medium">تباعد سطور القرآن</div>
              <div className="text-xs opacity-70 tabular-nums">{prefs.quranLineHeight.toFixed(1)}×</div>
            </div>
            <div className="mt-3">
              <Slider
                value={[prefs.quranLineHeight]}
                min={1.8}
                max={3}
                step={0.01}
                onValueChange={(v) => setPrefs({ quranLineHeight: clamp(v[0] ?? 2.55, 1.8, 3) })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SettingRow
              title="حجم صفحة المصحف"
              desc={`عدد الآيات بكل صفحة: ${prefs.quranPageSize}`}
              right={
                <div className="flex items-center gap-2">
                  {[8, 12, 16].map((n) => (
                    <button
                      key={n}
                      onClick={() => setPrefs({ quranPageSize: n })}
                      className={[
                        "px-4 py-3 rounded-xl border text-sm transition min-h-[44px]",
                        prefs.quranPageSize === n
                          ? "bg-[var(--accent)]/15 border-[var(--accent)]/35"
                          : "bg-white/6 border-white/10 hover:bg-white/10"
                      ].join(" ")}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              }
            />
            <SettingRow
              title="إخفاء أرقام الآيات"
              desc="وضع تركيز للقراءة بدون علامات"
              right={
                <Switch checked={prefs.quranHideMarkers} onCheckedChange={(v) => setPrefs({ quranHideMarkers: v })} />
              }
            />
            <SettingRow
              title="إظهار الفضل / المصدر"
              desc="إظهار صندوق الفضل إن وُجد"
              right={
                <Switch checked={prefs.showBenefits} onCheckedChange={(v) => setPrefs({ showBenefits: v })} />
              }
            />
            <SettingRow
              title="إزالة التشكيل"
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
              <div className="flex items-center gap-1.5 flex-wrap">
                {(["default", "sepia", "midnight", "parchment"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setPrefs({ quranTheme: t })}
                    className={[
                      "text-[10px] px-2.5 py-1.5 rounded-xl border transition min-h-[36px]",
                      prefs.quranTheme === t
                        ? "bg-[var(--accent)]/15 border-[var(--accent)]/35"
                        : "bg-white/6 border-white/10 hover:bg-white/10"
                    ].join(" ")}
                  >
                    {{ default: "🌑 افتراضي", sepia: "🟫 سيبيا", midnight: "🌙 ليلي", parchment: "📜 رق" }[t]}
                  </button>
                ))}
              </div>
            }
          />

          {/* ── Quran scroll mode control ──── */}
          <SettingRow
            title="وضع التمرير"
            desc="صفحات منفصلة أو تمرير متواصل"
            right={
              <div className="flex gap-2">
                {(["page", "scroll"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setPrefs({ quranScrollMode: m })}
                    className={[
                      "text-xs px-3 py-2 rounded-xl border transition min-h-[36px]",
                      prefs.quranScrollMode === m
                        ? "bg-[var(--accent)]/15 border-[var(--accent)]/35"
                        : "bg-white/6 border-white/10 hover:bg-white/10"
                    ].join(" ")}
                  >
                    {m === "page" ? "📄 صفحات" : "📜 تمرير"}
                  </button>
                ))}
              </div>
            }
          />

          {/* ── Letter spacing slider ──── */}
          <div>
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-medium">تباعد الحروف</div>
              <div className="text-xs opacity-70 tabular-nums">{((prefs.quranLetterSpacing ?? 0) * 100).toFixed(0)}%</div>
            </div>
            <div className="mt-3">
              <Slider
                value={[prefs.quranLetterSpacing ?? 0]}
                min={0}
                max={0.12}
                step={0.005}
                onValueChange={(v) => setPrefs({ quranLetterSpacing: clamp(v[0] ?? 0, 0, 0.12) })}
              />
            </div>
          </div>

          {/* ── Word spacing slider ──── */}
          <div>
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-medium">تباعد الكلمات</div>
              <div className="text-xs opacity-70 tabular-nums">{((prefs.quranWordSpacing ?? 0) * 100).toFixed(0)}%</div>
            </div>
            <div className="mt-3">
              <Slider
                value={[prefs.quranWordSpacing ?? 0]}
                min={0}
                max={0.25}
                step={0.01}
                onValueChange={(v) => setPrefs({ quranWordSpacing: clamp(v[0] ?? 0, 0, 0.25) })}
              />
            </div>
          </div>

          {/* ── Daily goal stepper ──── */}
          <SettingRow
            title="الهدف اليومي"
            desc="عدد الآيات المستهدف يومياً"
            right={
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="w-8 h-8 rounded-xl bg-white/8 border border-white/12 flex items-center justify-center hover:bg-white/12 transition text-base"
                  onClick={() => setPrefs({ quranDailyGoal: Math.max(1, (prefs.quranDailyGoal ?? 10) - 5) })}
                  aria-label="تقليل الهدف"
                >−</button>
                <span className="w-12 text-center text-sm tabular-nums font-semibold">{prefs.quranDailyGoal ?? 10}</span>
                <button
                  type="button"
                  className="w-8 h-8 rounded-xl bg-white/8 border border-white/12 flex items-center justify-center hover:bg-white/12 transition text-base"
                  onClick={() => setPrefs({ quranDailyGoal: Math.min(300, (prefs.quranDailyGoal ?? 10) + 5) })}
                  aria-label="زيادة الهدف"
                >+</button>
              </div>
            }
          />

          {/* ── Reciter selection ──── */}
          <SettingRow
            title="القارئ"
            desc="اختر صوت التلاوة للاستماع"
            right={null}
          />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {RECITERS.map((r) => (
              <button
                key={r.id}
                onClick={() => setPrefs({ quranReciter: r.id })}
                className={[
                  "px-3 py-2.5 rounded-2xl border text-sm transition flex items-center gap-2 min-h-[44px] text-right",
                  (prefs.quranReciter ?? "Alafasy_128kbps") === r.id
                    ? "bg-[var(--accent)]/15 border-[var(--accent)]/35"
                    : "bg-white/6 border-white/10 hover:bg-white/8"
                ].join(" ")}
              >
                <span className="text-base shrink-0">🎙</span>
                <span className="text-xs">{r.label}</span>
              </button>
            ))}
          </div>

          <div className="glass rounded-3xl p-4 border border-white/10">
            <div className="text-xs opacity-65 mb-2">معاينة مباشرة</div>
            <div
              className="arabic-text"
              style={{ fontSize: `${prefs.fontScale}rem`, lineHeight: prefs.lineHeight }}
            >
              سُبْحَانَ اللَّهِ وَبِحَمْدِهِ
            </div>
            <div
              className="arabic-text quran-text mt-3"
              style={{
                fontSize: `${18 * prefs.quranFontScale}px`,
                lineHeight: prefs.quranLineHeight,
                letterSpacing: `${prefs.quranLetterSpacing ?? 0}em`,
                wordSpacing: `${prefs.quranWordSpacing ?? 0}em`,
              }}
            >
              ٱهْدِنَا ٱلصِّرَٰطَ ٱلْمُسْتَقِيمَ
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-[var(--accent)]" />
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
            title="الصوت"
            desc="صوت بسيط عند العدّ"
            right={
              <Switch checked={prefs.enableSounds} onCheckedChange={(v) => setPrefs({ enableSounds: v })} />
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
      </Card>

      <Card className="p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Bell size={18} className="text-[var(--accent)]" />
            <div>
              <div className="font-semibold">التذكيرات</div>
              <div className="text-xs opacity-65 mt-1 leading-6">
                تذكيرات يومية للأذكار وورد القرآن.
              </div>
            </div>
          </div>
          <Switch
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
                await syncReminders({ ...reminders, enabled: true });
                toast.success("تم تفعيل التذكيرات");
              } catch {
                setReminders({ enabled: false });
                toast.error("تعذر تفعيل التذكيرات");
              }
            }}
          />
        </div>

        {!isNative ? (
          <div className="mt-4 text-xs opacity-65 leading-6">
            ملاحظة: التذكيرات تعمل بشكل أفضل داخل تطبيق Android (Capacitor). على الويب قد لا تعمل التذكيرات بالخلفية.
          </div>
        ) : notifPerm !== "granted" ? (
          <div className="mt-4 text-xs opacity-65 leading-6">
            حالة الإذن: {notifPerm === "denied" ? "مرفوض" : "غير مفعّل"}. فعّل التذكيرات لطلب الإذن.
          </div>
        ) : null}

        <div className="mt-4 rounded-3xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <div className="text-sm font-semibold">نغمة التذكير</div>
              <div className="text-xs opacity-65 mt-1 leading-6">
                اختر صوتًا طبيعيًا هادئًا لتذكيرات الأذكار وورد القرآن على Android.
              </div>
            </div>
            <div className="text-[11px] opacity-50">الشعار سيظهر بدل علامة التعجب</div>
          </div>

          <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-2">
            {REMINDER_SOUND_OPTIONS.map((option) => {
              const active = reminders.soundProfile === option.id;
              return (
                <div
                  key={option.id}
                  className={[
                    "rounded-2xl border p-3 transition",
                    active
                      ? "bg-[var(--accent)]/12 border-[var(--accent)]/30"
                      : "bg-white/4 border-white/10",
                  ].join(" ")}
                >
                  <button
                    type="button"
                    onClick={() => setReminders({ soundProfile: option.id })}
                    className="w-full text-right"
                    disabled={!reminders.enabled && isNative}
                  >
                    <div className="text-sm font-semibold">{option.label}</div>
                    <div className="text-[11px] opacity-60 mt-1 leading-5">{option.description}</div>
                  </button>
                  <div className="mt-3 flex justify-end">
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await playReminderSoundPreview(option.id);
                        } catch {
                          toast.error("تعذر تشغيل المعاينة");
                        }
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-white/12 bg-white/6 px-3 py-2 text-xs transition hover:bg-white/10"
                    >
                      <Play size={12} />
                      معاينة
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="glass rounded-3xl p-4 border border-white/10 md:col-span-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">تنبيهات الصلوات</div>
                <div className="text-xs opacity-65 mt-1 leading-6">
                  الفجر والظهر والعصر والمغرب والعشاء حسب مواقيت اليوم، وتُحدَّث تلقائياً عند تحديث المواقيت.
                </div>
              </div>
              <Switch
                checked={reminders.prayerAlertsEnabled}
                onCheckedChange={(v) => setReminders({ prayerAlertsEnabled: v })}
                disabled={!reminders.enabled}
              />
            </div>
          </div>

          <div className="glass rounded-3xl p-4 border border-white/10">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">أذكار الصباح</div>
                <div className="text-xs opacity-65 mt-1">تذكير يومي</div>
              </div>
              <Switch
                checked={reminders.morningEnabled}
                onCheckedChange={(v) => setReminders({ morningEnabled: v })}
                disabled={!reminders.enabled}
              />
            </div>
            <div className="mt-3">
              <Input
                type="time"
                value={reminders.morningTime}
                onChange={(e) => setReminders({ morningTime: e.target.value })}
                disabled={!reminders.enabled || !reminders.morningEnabled}
              />
            </div>
          </div>

          <div className="glass rounded-3xl p-4 border border-white/10">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">أذكار المساء</div>
                <div className="text-xs opacity-65 mt-1">تذكير يومي</div>
              </div>
              <Switch
                checked={reminders.eveningEnabled}
                onCheckedChange={(v) => setReminders({ eveningEnabled: v })}
                disabled={!reminders.enabled}
              />
            </div>
            <div className="mt-3">
              <Input
                type="time"
                value={reminders.eveningTime}
                onChange={(e) => setReminders({ eveningTime: e.target.value })}
                disabled={!reminders.enabled || !reminders.eveningEnabled}
              />
            </div>
          </div>

          <div className="glass rounded-3xl p-4 border border-white/10">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">ورد اليوم (القرآن)</div>
                <div className="text-xs opacity-65 mt-1">تذكير يومي</div>
              </div>
              <Switch
                checked={reminders.dailyWirdEnabled}
                onCheckedChange={(v) => setReminders({ dailyWirdEnabled: v })}
                disabled={!reminders.enabled}
              />
            </div>
            <div className="mt-3">
              <Input
                type="time"
                value={reminders.dailyWirdTime}
                onChange={(e) => setReminders({ dailyWirdTime: e.target.value })}
                disabled={!reminders.enabled || !reminders.dailyWirdEnabled}
              />
            </div>
          </div>

          <div className="glass rounded-3xl p-4 border border-white/10">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">خطة الختمة</div>
                <div className="text-xs opacity-65 mt-1">تذكير يومي</div>
              </div>
              <Switch
                checked={reminders.khatmaEnabled}
                onCheckedChange={(v) => setReminders({ khatmaEnabled: v })}
                disabled={!reminders.enabled}
              />
            </div>
            <div className="mt-3">
              <Input
                type="time"
                value={reminders.khatmaTime}
                onChange={(e) => setReminders({ khatmaTime: e.target.value })}
                disabled={!reminders.enabled || !reminders.khatmaEnabled}
              />
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-semibold">النسخ الاحتياطي</div>
            <div className="text-xs opacity-65 mt-1 leading-6">
              تصدير/استيراد التقدّم + المفضلة + إعداداتك.
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={onBackup}>
              <Download size={16} />
              تصدير
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
              <span className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/12 border border-white/10 cursor-pointer text-sm min-h-[44px]">
                <Upload size={16} />
                استيراد
              </span>
            </label>
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Keyboard size={16} className="text-[var(--accent)]" />
          <div className="font-semibold text-sm">اختصارات لوحة المفاتيح</div>
          <span className="text-[11px] opacity-45 mr-auto">سطح المكتب فقط</span>
        </div>
        <div className="space-y-2.5 text-sm">
          {([
            { keys: "Ctrl + K", label: "البحث السريع" },
            { keys: "G ثم H", label: "الرئيسية" },
            { keys: "G ثم Q", label: "القرآن الكريم" },
            { keys: "G ثم F", label: "المفضلة" },
            { keys: "G ثم I", label: "الإحصاءات" },
            { keys: "G ثم S", label: "الإعدادات" },
            { keys: "?", label: "عرض الاختصارات" },
            { keys: "Esc", label: "إغلاق الحوار" },
          ] as { keys: string; label: string }[]).map((s) => (
            <div key={s.label} className="flex items-center justify-between gap-3">
              <span className="opacity-70">{s.label}</span>
              <kbd className="px-2 py-0.5 rounded-lg bg-white/10 border border-white/15 text-[11px] font-mono tracking-wide text-[var(--accent)] select-none">
                {s.keys}
              </kbd>
            </div>
          ))}
        </div>
      </Card>

      <DangerZone />

      <div className="text-[11px] opacity-40 text-center pb-2 leading-5">
        ATHAR • أثر · v1.0.0 · بيانات محلية
      </div>
    </div>
  );
}

function SettingRow(props: { title: string; desc: string; right: React.ReactNode }) {
  return (
    <div className="glass rounded-3xl p-4 border border-white/10 flex items-center justify-between gap-4">
      <div className="min-w-0">
        <div className="text-sm font-semibold">{props.title}</div>
        <div className="text-xs opacity-65 mt-1 leading-5">{props.desc}</div>
      </div>
      <div>{props.right}</div>
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
    <Card className="p-5 border border-[var(--danger)]/20">
      <div className="flex items-center gap-2 mb-3">
        <Trash2 size={16} className="text-[var(--danger)]" />
        <div className="text-sm font-semibold text-[var(--danger)]">منطقة الخطر</div>
      </div>
      <div className="text-xs opacity-65 mb-4 leading-6">
        إعادة تعيين بياناتك المحلية. لا يمكن التراجع عن هذه الإجراءات.
      </div>

      {confirm ? (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="border-[var(--danger)]/40 text-[var(--danger)] hover:bg-[var(--danger)]/10"
            onClick={handleReset}
          >
            <Trash2 size={15} />
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
            <BookMarked size={15} />
            مسح تقدّم الأذكار والمفضلة
          </Button>
          <Button
            variant="outline"
            className="justify-start border-orange-500/30 text-orange-600 dark:text-orange-400 hover:bg-orange-500/8"
            onClick={() => setConfirm("quran")}
          >
            <BookOpen size={15} />
            مسح بيانات القرآن والإشارات
          </Button>
          <Button
            variant="outline"
            className="justify-start border-[var(--danger)]/30 text-[var(--danger)]/80 hover:bg-[var(--danger)]/8"
            onClick={() => setConfirm("all")}
          >
            <Trash2 size={15} />
            مسح جميع البيانات
          </Button>
        </div>
      )}
    </Card>
  );
}
