import * as React from "react";
import toast from "react-hot-toast";
import { Vibrate, Target, HeartPulse, SkipForward } from "lucide-react";
import { useNoorStore } from "@/store/noorStore";
import { requestMindfulHealth } from "@/lib/mindfulMinutes";
import { arNum } from "@/lib/formatNumber";
import { Segmented, SettingsRow, SettingsSection, Stepper, ToggleRow } from "@/components/settings/SettingsUI";
import { usePlatform } from "@/components/settings/settingsHooks";

const GOAL_PRESETS = [33, 100, 200, 500] as const;

export function TasbeehGroup() {
  const prefs = useNoorStore((s) => s.prefs);
  const setPrefs = useNoorStore((s) => s.setPrefs);
  const sebhaTarget = useNoorStore((s) => s.sebhaTarget);
  const setSebhaTarget = useNoorStore((s) => s.setSebhaTarget);
  const platform = usePlatform();
  const strength = prefs.hapticStrength ?? "medium";

  return (
    <>
      <SettingsSection title="العدّ">
        <ToggleRow
          id="haptics"
          icon={<Vibrate size={17} />}
          title="الاهتزاز"
          hint="اهتزاز خفيف مع كل تسبيحة"
          checked={prefs.enableHaptics && strength !== "off"}
          onChange={(on) => setPrefs({ enableHaptics: on, ...(on && strength === "off" ? { hapticStrength: "medium" } : {}) })}
        >
          {prefs.enableHaptics && strength !== "off" ? (
            <Segmented
              label="قوة الاهتزاز"
              value={strength}
              onChange={(value) => setPrefs({ hapticStrength: value })}
              options={[
                { value: "light", label: "خفيف" },
                { value: "medium", label: "متوسط" },
                { value: "strong", label: "قوي" },
              ] as const}
            />
          ) : null}
        </ToggleRow>
        <ToggleRow
          id="auto-advance"
          icon={<SkipForward size={17} />}
          title="الانتقال التلقائي"
          hint="ينتقل إلى الذكر التالي عند إتمام العدد"
          checked={prefs.autoAdvanceDhikr ?? true}
          onChange={(on) => setPrefs({ autoAdvanceDhikr: on })}
        />
      </SettingsSection>

      <SettingsSection title="الهدف" footer="يظهر هدفك في الصفحة الرئيسية وفي السبحة.">
        <SettingsRow
          id="sebha-goal"
          icon={<Target size={17} />}
          title="هدف السبحة اليومي"
          control={
            <Stepper
              label="هدف السبحة اليومي"
              value={sebhaTarget}
              min={10}
              max={9999}
              step={10}
              format={(n) => arNum(n)}
              onChange={setSebhaTarget}
            />
          }
        >
          <Segmented
            label="أهداف شائعة"
            value={GOAL_PRESETS.includes(sebhaTarget as (typeof GOAL_PRESETS)[number]) ? sebhaTarget : -1}
            onChange={(value) => setSebhaTarget(value)}
            options={GOAL_PRESETS.map((n) => ({ value: n as number, label: arNum(n) }))}
          />
        </SettingsRow>
      </SettingsSection>

      {platform === "ios" ? (
        <SettingsSection title="تطبيق الصحة" footer="أثر يكتب في «الدقائق الذهنية» فقط، ولا يقرأ أيًّا من بياناتك الصحية.">
          <ToggleRow
            id="health"
            icon={<HeartPulse size={17} />}
            title="دقائق ذهنية في تطبيق الصحة"
            hint="تُحفظ جلسات التسبيح التي تطول دقيقة فأكثر"
            checked={prefs.healthMindful === true}
            onChange={async (on) => {
              if (!on) {
                setPrefs({ healthMindful: false });
                return;
              }
              if (await requestMindfulHealth()) {
                setPrefs({ healthMindful: true });
                toast.success("ستُحفظ جلسات التسبيح في تطبيق الصحة");
              } else {
                toast.error("اسمح لأثر بالكتابة في «الدقائق الذهنية» من تطبيق الصحة");
              }
            }}
          />
        </SettingsSection>
      ) : null}
    </>
  );
}
