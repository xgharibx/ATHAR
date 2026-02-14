import * as React from "react";
import { Download, Upload, Palette, SlidersHorizontal, Sparkles, Bell } from "lucide-react";
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
  requestNotificationPermission,
  syncReminders
} from "@/lib/reminders";

function ThemeChip(props: { value: NoorTheme; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={props.onClick}
      className={[
        "px-4 py-2 rounded-2xl border text-sm transition",
        props.active ? "bg-[rgba(255,215,128,.16)] border-[rgba(255,215,128,.28)]" : "bg-white/6 border-white/10 hover:bg-white/8"
      ].join(" ")}
    >
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

  React.useEffect(() => {
    if (!isNative) return;
    if (notifPerm !== "granted") return;
    void syncReminders(reminders);
  }, [isNative, notifPerm, reminders]);

  const onBackup = () => {
    const blob = exportState();
    downloadJson(`ATHAR-نسخة-احتياطية-${blob.exportedAt.slice(0, 10)}.athar`, blob);
    toast.success("تم تنزيل النسخة الاحتياطية");
  };

  const onRestore = async (file: File) => {
    try {
      const text = await file.text();
      const json = JSON.parse(text) as ExportBlobV1;
      importState(json);
      toast.success("تم الاستيراد بنجاح");
      window.location.reload();
    } catch {
      toast.error("ملف غير صالح");
    }
  };

  return (
    <div className="space-y-4">
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
              <div className="text-xs opacity-70 tabular-nums">{prefs.fontScale.toFixed(2)}</div>
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
              <div className="text-xs opacity-70 tabular-nums">{prefs.lineHeight.toFixed(2)}</div>
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
              <div className="text-xs opacity-70 tabular-nums">{prefs.quranFontScale.toFixed(2)}</div>
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
              <div className="text-xs opacity-70 tabular-nums">{prefs.quranLineHeight.toFixed(2)}</div>
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
                        "px-3 py-1.5 rounded-xl border text-xs transition",
                        prefs.quranPageSize === n
                          ? "bg-[rgba(255,215,128,.16)] border-[rgba(255,215,128,.28)]"
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
              style={{ fontSize: `${18 * prefs.quranFontScale}px`, lineHeight: prefs.quranLineHeight }}
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
                  toast.error("لم يتم السماح بالإشعارات");
                  return;
                }
                await syncReminders({ ...reminders, enabled: true });
                toast.success("تم تفعيل التذكيرات");
              } catch {
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

        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <span className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/12 border border-white/10 cursor-pointer text-sm">
                <Upload size={16} />
                استيراد
              </span>
            </label>
          </div>
        </div>
      </Card>
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
