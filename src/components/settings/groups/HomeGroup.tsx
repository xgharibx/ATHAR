import * as React from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { useNoorStore, DEFAULT_HOME_WIDGETS_ORDER, type HomeWidgetKey } from "@/store/noorStore";
import { Switch } from "@/components/ui/Switch";
import { SettingsSection } from "@/components/settings/SettingsUI";

const HOME_WIDGET_LABELS: Record<HomeWidgetKey, string> = {
  prayer: "مواقيت الصلاة",
  hadith: "حديث اليوم",
  wisdom: "حكمة اليوم",
  smart: "الذكر المقترح",
  checklist: "قائمة اليوم",
  dailyStep: "خطوة اليوم",
  tasbeeh: "التسبيح السريع",
  dailyWird: "الورد اليومي",
  dailyVerse: "آية اليوم",
  quests: "مهام اليوم",
};

const NOTES: Partial<Record<HomeWidgetKey, string>> = {
  wisdom: "ضمن شريط اليوم",
  dailyVerse: "ضمن شريط اليوم",
  quests: "ضمن قائمة اليوم",
};

export function HomeGroup() {
  const prefs = useNoorStore((s) => s.prefs);
  const setPrefs = useNoorStore((s) => s.setPrefs);
  const order: HomeWidgetKey[] = prefs.homeWidgetsOrder ?? [...DEFAULT_HOME_WIDGETS_ORDER];

  const move = (index: number, by: -1 | 1) => {
    const target = index + by;
    if (target < 0 || target >= order.length) return;
    const next = [...order];
    [next[index], next[target]] = [next[target], next[index]];
    setPrefs({ homeWidgetsOrder: next });
  };

  return (
    <SettingsSection title="بطاقات الصفحة الرئيسية" footer="أخفِ ما لا تحتاجه، ورتّب البطاقات بالأسهم.">
      <div id="setting-home-cards" role="list" aria-label="ترتيب بطاقات الصفحة الرئيسية">
        {order.map((key, index) => (
          <div key={key} role="listitem" className="settings-row">
            <div className="settings-row-head">
              <span className="flex flex-col">
                <button type="button" className="p-1 disabled:opacity-25" disabled={index === 0} onClick={() => move(index, -1)} aria-label={`تحريك ${HOME_WIDGET_LABELS[key]} للأعلى`}>
                  <ArrowUp size={14} aria-hidden="true" />
                </button>
                <button type="button" className="p-1 disabled:opacity-25" disabled={index === order.length - 1} onClick={() => move(index, 1)} aria-label={`تحريك ${HOME_WIDGET_LABELS[key]} للأسفل`}>
                  <ArrowDown size={14} aria-hidden="true" />
                </button>
              </span>
              <span className="settings-row-text">
                <span className="settings-row-title">{HOME_WIDGET_LABELS[key]}</span>
                {NOTES[key] ? <span className="settings-row-hint">{NOTES[key]}</span> : null}
              </span>
              <Switch
                aria-label={HOME_WIDGET_LABELS[key]}
                checked={prefs.homeWidgets[key] ?? true}
                onCheckedChange={(on) => setPrefs({ homeWidgets: { ...prefs.homeWidgets, [key]: on } })}
              />
            </div>
          </div>
        ))}
      </div>
    </SettingsSection>
  );
}
