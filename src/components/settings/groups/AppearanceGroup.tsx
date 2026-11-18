import * as React from "react";
import toast from "react-hot-toast";
import { Palette, Smartphone, Type, Sparkles, Sun, RotateCcw } from "lucide-react";
import { useNoorStore, type NoorTheme } from "@/store/noorStore";
import { THEME_META_COLORS } from "@/hooks/useApplyTheme";
import { THEME_ACCENTS, THEME_CHOICES, themeLabel } from "@/lib/settingsTheme";
import { changeAppIcon, currentAppIcon, type AppIconName } from "@/lib/appIcon";
import { arNum } from "@/lib/formatNumber";
import { clamp, cn } from "@/lib/utils";
import { Slider } from "@/components/ui/Slider";
import { SettingsRow, SettingsSection, ToggleRow } from "@/components/settings/SettingsUI";
import { usePlatform } from "@/components/settings/settingsHooks";

const APP_ICON_CHOICES: Array<{ id: AppIconName; label: string; colors: [string, string] }> = [
  { id: "default", label: "الأصلية", colors: ["#2F4F37", "#d8b56a"] },
  { id: "light", label: "فاتحة", colors: ["#f5efe2", "#2F4F37"] },
  { id: "dark", label: "داكنة", colors: ["#0b0d12", "#d8b56a"] },
  { id: "ramadan", label: "رمضان", colors: ["#1b1440", "#f0c75e"] },
  { id: "gold", label: "ذهبية", colors: ["#b8893a", "#fff4d6"] },
];

function swatchStyle(theme: NoorTheme): React.CSSProperties {
  const background = theme === "system"
    ? `linear-gradient(135deg, ${THEME_META_COLORS.light} 50%, ${THEME_META_COLORS.dark} 50%)`
    : THEME_META_COLORS[theme];
  return { background, ["--swatch-accent" as string]: THEME_ACCENTS[theme] ?? "#ffd780" };
}

export function AppearanceGroup() {
  const prefs = useNoorStore((s) => s.prefs);
  const setPrefs = useNoorStore((s) => s.setPrefs);
  const resetPrefs = useNoorStore((s) => s.resetPrefs);
  const platform = usePlatform();
  const [appIcon, setAppIcon] = React.useState<AppIconName | null>(null);
  const [iconBusy, setIconBusy] = React.useState(false);

  React.useEffect(() => {
    let active = true;
    void currentAppIcon().then((name) => { if (active) setAppIcon(name); });
    return () => { active = false; };
  }, []);

  const chooseIcon = async (name: AppIconName) => {
    setIconBusy(true);
    const { ok, appliesOnLeave } = await changeAppIcon(name);
    setIconBusy(false);
    if (!ok) {
      toast.error("تعذّر تغيير الأيقونة");
      return;
    }
    setAppIcon(name);
    if (appliesOnLeave) toast.success("تتغيّر الأيقونة عند الخروج من التطبيق. قد يلزم بعض الهواتف إعادة إضافتها إلى الشاشة الرئيسية");
  };

  return (
    <>
      <SettingsSection title="السمة">
        <SettingsRow id="theme" icon={<Palette size={17} />} title="سمة التطبيق" value={themeLabel(prefs.theme)}>
          <div className="settings-themes" role="radiogroup" aria-label="سمة التطبيق">
            {THEME_CHOICES.map((choice) => (
              <button
                key={choice.id}
                type="button"
                role="radio"
                aria-checked={prefs.theme === choice.id}
                onClick={() => setPrefs({ theme: choice.id })}
                className={cn("settings-theme", prefs.theme === choice.id && "is-active")}
              >
                <span className="settings-theme-swatch" style={swatchStyle(choice.id)} aria-hidden="true" />
                {choice.label}
              </button>
            ))}
          </div>
        </SettingsRow>
        <SettingsRow
          id="accent"
          title="لون مخصّص"
          hint={prefs.customAccent ? "يحلّ محلّ لون السمة في الأزرار والتمييز" : "اختر لونًا يحلّ محلّ لون السمة"}
          control={
            <div className="flex items-center gap-2">
              {prefs.customAccent ? (
                <button
                  type="button"
                  className="settings-choice-preview"
                  onClick={() => { setPrefs({ customAccent: undefined }); toast("عاد لون السمة"); }}
                >
                  إلغاء
                </button>
              ) : null}
              <label className="relative cursor-pointer">
                <input
                  type="color"
                  value={prefs.customAccent ?? "#10b981"}
                  onChange={(e) => setPrefs({ customAccent: e.target.value })}
                  className="sr-only"
                  aria-label="اختيار لون مخصّص"
                />
                <span
                  className="block h-9 w-9 rounded-xl border-2 border-(--stroke)"
                  style={{ background: prefs.customAccent ?? "var(--accent)" }}
                />
              </label>
            </div>
          }
        />
        {platform !== "web" && appIcon ? (
          <SettingsRow id="app-icon" icon={<Smartphone size={17} />} title="أيقونة التطبيق" hint="شكل أثر على الشاشة الرئيسية">
            <div className="flex flex-wrap gap-2.5" role="radiogroup" aria-label="أيقونة التطبيق">
              {APP_ICON_CHOICES.map((icon) => (
                <button
                  key={icon.id}
                  type="button"
                  role="radio"
                  aria-checked={appIcon === icon.id}
                  disabled={iconBusy}
                  onClick={() => void chooseIcon(icon.id)}
                  className={cn("settings-theme w-[72px]", appIcon === icon.id && "is-active")}
                >
                  <span
                    className="settings-theme-swatch !aspect-square !rounded-[22%]"
                    style={{ background: `radial-gradient(circle at 50% 45%, ${icon.colors[1]} 0 18%, ${icon.colors[0]} 19%)`, ["--swatch-accent" as string]: "transparent" }}
                    aria-hidden="true"
                  />
                  {icon.label}
                </button>
              ))}
            </div>
          </SettingsRow>
        ) : null}
      </SettingsSection>

      <SettingsSection title="النص">
        <SettingsRow id="text-size" icon={<Type size={17} />} title="حجم النص" value={`${arNum(Math.round(prefs.fontScale * 100))}٪`}>
          <Slider
            value={[prefs.fontScale]}
            min={0.9}
            max={1.6}
            step={0.01}
            onValueChange={(v) => setPrefs({ fontScale: clamp(v[0] ?? 1.05, 0.9, 1.6) })}
            aria-label="حجم النص"
          />
        </SettingsRow>
        <SettingsRow id="line-height" title="تباعد السطور" value={`${arNum(parseFloat(prefs.lineHeight.toFixed(1)))}×`}>
          <Slider
            value={[prefs.lineHeight]}
            min={1.6}
            max={2.4}
            step={0.01}
            onValueChange={(v) => setPrefs({ lineHeight: clamp(v[0] ?? 1.95, 1.6, 2.4) })}
            aria-label="تباعد السطور"
          />
          <div className="settings-preview arabic-text" style={{ fontSize: `${prefs.fontScale}rem`, lineHeight: prefs.lineHeight }}>
            سُبْحَانَ اللَّهِ وَبِحَمْدِهِ، سُبْحَانَ اللَّهِ الْعَظِيمِ
          </div>
        </SettingsRow>
        <ToggleRow
          id="benefits"
          title="فضل الذكر"
          hint="يظهر فضل الذكر ودليله تحت نصّه إن وُجد"
          checked={prefs.showBenefits}
          onChange={(on) => setPrefs({ showBenefits: on })}
        />
      </SettingsSection>

      <SettingsSection title="المؤثرات">
        <ToggleRow
          id="effects"
          icon={<Sparkles size={17} />}
          title="خلفية النجوم ثلاثية الأبعاد"
          hint="أجمل، لكنها تستهلك البطارية أكثر"
          checked={prefs.enable3D}
          onChange={(on) => setPrefs({ enable3D: on })}
        />
        <ToggleRow
          title="البطاقات الزجاجية"
          hint="خلفية شفافة مضيئة للبطاقات"
          checked={prefs.transparentMode}
          onChange={(on) => setPrefs({ transparentMode: on })}
        />
        <ToggleRow
          title="وضع قراءة أوضح"
          hint="تباين أقوى وبطاقات أوضح مع الإبقاء على ألوان السمة"
          checked={prefs.clearReading}
          onChange={(on) => setPrefs({ clearReading: on })}
        />
        <ToggleRow
          title="تقليل الحركة"
          hint="حركة أقل للأجهزة الأبطأ ولمن تزعجه الحركة"
          checked={prefs.reduceMotion}
          onChange={(on) => setPrefs({ reduceMotion: on })}
        />
      </SettingsSection>

      <SettingsSection title="الشاشة">
        <ToggleRow
          id="keep-awake"
          icon={<Sun size={17} />}
          title="إبقاء الشاشة مضاءة"
          hint="لا تنطفئ الشاشة أثناء قراءة المصحف والتسبيح والتسميع"
          checked={prefs.keepScreenAwake !== false}
          onChange={(on) => setPrefs({ keepScreenAwake: on })}
        />
      </SettingsSection>

      <SettingsSection footer="يعيد السمة والنص والمؤثرات وخيارات المصحف إلى الأصل، دون المساس بتقدّمك ومحفوظاتك.">
        <SettingsRow
          title="استعادة المظهر الأصلي"
          icon={<RotateCcw size={17} />}
          onClick={() => {
            resetPrefs();
            toast.success("عاد المظهر إلى الأصل");
          }}
        />
      </SettingsSection>
    </>
  );
}
