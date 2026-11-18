import * as React from "react";
import { Mic2, Languages, Type } from "lucide-react";
import { useNoorStore } from "@/store/noorStore";
import { QURAN_RECITERS, getReciter } from "@/lib/quranReciters";
import { TRANSLATION_SOURCES, getTranslation, type TranslationId } from "@/lib/quranTranslations";
import { arNum } from "@/lib/formatNumber";
import { clamp } from "@/lib/utils";
import { Slider } from "@/components/ui/Slider";
import { ReciterPicker } from "@/components/quran/ReciterPicker";
import { TranslationPicker } from "@/components/quran/TranslationPicker";
import { RecitationDownloadsRow } from "@/components/quran/RecitationDownloadsRow";
import { SettingsRow, SettingsSection } from "@/components/settings/SettingsUI";

/** Which downloadable translations are ready on this device. */
function useTranslationStatus() {
  const [status, setStatus] = React.useState<Partial<Record<TranslationId, "ready">>>({});
  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      const next: Partial<Record<TranslationId, "ready">> = {};
      for (const source of TRANSLATION_SOURCES) {
        if (source.bundled) continue;
        try {
          await getTranslation(source.id, 1);
          next[source.id] = "ready";
        } catch {
          // Not downloaded yet: Saheeh International is always there.
        }
      }
      if (!cancelled) setStatus(next);
    })();
    return () => { cancelled = true; };
  }, []);
  return status;
}

export function QuranGroup() {
  const prefs = useNoorStore((s) => s.prefs);
  const setPrefs = useNoorStore((s) => s.setPrefs);
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const translationStatus = useTranslationStatus();
  const reciter = getReciter(prefs.quranReciter ?? "Alafasy_128kbps")?.label ?? "القارئ";
  const scale = prefs.mushafFontScale ?? 1;

  return (
    <>
      <SettingsSection title="التلاوة">
        <SettingsRow
          id="reciter"
          icon={<Mic2 size={17} />}
          title="القارئ"
          hint={`${arNum(QURAN_RECITERS.length)} قارئًا، مع البحث`}
          value={reciter}
          onClick={() => setPickerOpen(true)}
        />
        <div id="setting-downloads" className="settings-row">
          <div className="settings-row-body pt-3">
            <RecitationDownloadsRow />
          </div>
        </div>
      </SettingsSection>

      <SettingsSection title="المصحف">
        <SettingsRow id="quran-font" icon={<Type size={17} />} title="حجم خط المصحف" value={`${arNum(Math.round(scale * 100))}٪`}>
          <Slider
            value={[scale]}
            min={0.7}
            max={1.6}
            step={0.01}
            onValueChange={(v) => setPrefs({ mushafFontScale: clamp(v[0] ?? 1, 0.7, 1.6) })}
            aria-label="حجم خط المصحف"
          />
        </SettingsRow>
        <SettingsRow id="quran-line" title="تباعد سطور المصحف" value={`${arNum(parseFloat(prefs.quranLineHeight.toFixed(1)))}×`}>
          <Slider
            value={[prefs.quranLineHeight]}
            min={1.8}
            max={3}
            step={0.01}
            onValueChange={(v) => setPrefs({ quranLineHeight: clamp(v[0] ?? 2.55, 1.8, 3) })}
            aria-label="تباعد سطور المصحف"
          />
          <div
            className="settings-preview arabic-text quran-text"
            style={{ fontSize: `${20 * scale}px`, lineHeight: prefs.quranLineHeight }}
          >
            ٱهْدِنَا ٱلصِّرَٰطَ ٱلْمُسْتَقِيمَ
          </div>
        </SettingsRow>
      </SettingsSection>

      <SettingsSection title="الترجمة" footer="تظهر الترجمة أسفل كل آية في المصحف، ويمكنك إخفاؤها من هنا أو من المصحف نفسه.">
        <SettingsRow id="translation" icon={<Languages size={17} />} title="ترجمة القرآن">
          <TranslationPicker
            enabled={!!prefs.mushafShowTranslation}
            value={(prefs.quranTranslationId as TranslationId | undefined) ?? "saheeh"}
            onEnabledChange={(v) => setPrefs({ mushafShowTranslation: v })}
            onChange={(id) => setPrefs({ quranTranslationId: id })}
            status={translationStatus}
          />
        </SettingsRow>
      </SettingsSection>

      <ReciterPicker
        open={pickerOpen}
        value={prefs.quranReciter ?? "Alafasy_128kbps"}
        onChange={(id) => setPrefs({ quranReciter: id })}
        onClose={() => setPickerOpen(false)}
      />
    </>
  );
}
