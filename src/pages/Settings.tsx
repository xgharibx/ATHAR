/**
 * Settings, laid out like the phone's own Settings app.
 *
 * The first page is short: a search that finds individual options, three
 * quick switches, the account, and one row per group showing what it is set
 * to now («الصلاة · الهيئة المصرية · الأذان: …»). Each group opens its own
 * page (/settings/<group>); a search result opens the group and makes the
 * option glow.
 */
import * as React from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { Capacitor } from "@capacitor/core";
import {
  ArrowRight, Bell, BookOpen, Clock, Database, Home, Info, Moon, Palette, Search, Shield, Sparkles, Vibrate, X,
} from "lucide-react";

import { useNoorStore } from "@/store/noorStore";
import { useScrollRestoration } from "@/hooks/useScrollRestoration";
import { calcMethodLabel } from "@/lib/prayerCalcMethods";
import { PRAYER_SOUND_OPTIONS } from "@/lib/reminders";
import { getReciter } from "@/lib/quranReciters";
import { arNum } from "@/lib/formatNumber";
import { cn } from "@/lib/utils";
import { SETTINGS_GROUPS, searchSettings, type SettingsGroupId } from "@/lib/settingsCatalog";
import { AccountPanel } from "@/components/account/AccountPanel";
import { SettingsRow, SettingsSection } from "@/components/settings/SettingsUI";
import { ensureNotificationsAllowed, useSettingHighlight } from "@/components/settings/settingsHooks";
import { PrayerGroup } from "@/components/settings/groups/PrayerGroup";
import { RemindersGroup } from "@/components/settings/groups/RemindersGroup";
import { QuranGroup } from "@/components/settings/groups/QuranGroup";
import { TasbeehGroup } from "@/components/settings/groups/TasbeehGroup";
import { AppearanceGroup } from "@/components/settings/groups/AppearanceGroup";
import { isDarkTheme, nightModeTheme, themeLabel } from "@/lib/settingsTheme";
import { HomeGroup } from "@/components/settings/groups/HomeGroup";
import { PrivacyGroup } from "@/components/settings/groups/PrivacyGroup";
import { DataGroup } from "@/components/settings/groups/DataGroup";
import { AboutGroup } from "@/components/settings/groups/AboutGroup";
import { APP_VERSION } from "@/lib/appVersion";
import { DesignInvite } from "@/components/settings/DesignPicker";
import { resolveUfuqPalette } from "@/lib/design";
import "@/styles/settings.css";

const GROUP_ICONS: Record<SettingsGroupId, React.ReactNode> = {
  prayer: <Clock size={17} />,
  reminders: <Bell size={17} />,
  quran: <BookOpen size={17} />,
  tasbeeh: <Sparkles size={17} />,
  appearance: <Palette size={17} />,
  home: <Home size={17} />,
  privacy: <Shield size={17} />,
  data: <Database size={17} />,
  about: <Info size={17} />,
};

const GROUP_PAGES: Record<SettingsGroupId, React.ComponentType> = {
  prayer: PrayerGroup,
  reminders: RemindersGroup,
  quran: QuranGroup,
  tasbeeh: TasbeehGroup,
  appearance: AppearanceGroup,
  home: HomeGroup,
  privacy: PrivacyGroup,
  data: DataGroup,
  about: AboutGroup,
};

function isGroupId(value: string | undefined): value is SettingsGroupId {
  return SETTINGS_GROUPS.some((group) => group.id === value);
}

function QuickSwitches() {
  const prefs = useNoorStore((s) => s.prefs);
  const setPrefs = useNoorStore((s) => s.setPrefs);
  const reminders = useNoorStore((s) => s.reminders);
  const setReminders = useNoorStore((s) => s.setReminders);
  const ufuq = prefs.designMode === "ufuq";
  const dark = ufuq
    ? document.documentElement.dataset.ufuqPalette === "night"
      || resolveUfuqPalette(prefs.ufuqPalette, Boolean(window.matchMedia?.("(prefers-color-scheme: dark)")?.matches)) === "night"
    : isDarkTheme(prefs.theme);
  const vibrating = prefs.enableHaptics && prefs.hapticStrength !== "off";

  const chip = (active: boolean) => cn(
    "shrink-0 inline-flex items-center gap-1.5 min-h-9 px-3.5 rounded-full border text-[12.5px] font-semibold transition",
    active ? "bg-accent-15 border-accent-35 text-(--fg)" : "border-(--stroke) bg-(--card) text-(--muted)",
  );

  return (
    <div className="mt-2 flex gap-1.5 overflow-x-auto no-scrollbar" role="toolbar" aria-label="تبديلات سريعة">
      <button
        type="button"
        aria-pressed={dark}
        className={chip(dark)}
        onClick={() => setPrefs(ufuq ? { ufuqPalette: dark ? "day" : "night" } : { theme: nightModeTheme(prefs.theme, !dark) })}
      >
        <Moon size={13} aria-hidden="true" />
        الوضع الليلي
      </button>
      <button
        type="button"
        aria-pressed={reminders.enabled}
        className={chip(reminders.enabled)}
        onClick={async () => {
          const next = !reminders.enabled;
          if (next && !(await ensureNotificationsAllowed())) return;
          setReminders({ enabled: next });
          toast.success(next ? "فُعّلت التذكيرات اليومية" : "أُوقفت التذكيرات اليومية");
        }}
      >
        <Bell size={13} aria-hidden="true" />
        التذكيرات
      </button>
      <button
        type="button"
        aria-pressed={vibrating}
        className={chip(vibrating)}
        onClick={() => setPrefs(vibrating ? { enableHaptics: false } : { enableHaptics: true, hapticStrength: prefs.hapticStrength === "off" ? "medium" : prefs.hapticStrength })}
      >
        <Vibrate size={13} aria-hidden="true" />
        الاهتزاز
      </button>
    </div>
  );
}

/** What each group is set to now, for its row on the first page. */
function useGroupSummaries(): Record<SettingsGroupId, string> {
  const prefs = useNoorStore((s) => s.prefs);
  const reminders = useNoorStore((s) => s.reminders);
  const sebhaTarget = useNoorStore((s) => s.sebhaTarget);
  const order = prefs.homeWidgetsOrder ?? [];
  const shownCards = order.filter((key) => prefs.homeWidgets[key] !== false).length;
  const dailyOn = [reminders.morningEnabled, reminders.eveningEnabled, reminders.dailyWirdEnabled, reminders.khatmaEnabled, reminders.tasbeehEnabled, reminders.dailyHadithNotif]
    .filter(Boolean).length;
  const adhan = PRAYER_SOUND_OPTIONS.find((option) => option.id === reminders.prayerSoundProfile)?.label ?? "";
  return {
    prayer: [calcMethodLabel(prefs.prayerCalcMethod ?? 5, true), reminders.prayerAlertsEnabled ? `الأذان: ${adhan}` : "الأذان متوقف"].filter(Boolean).join(" · "),
    reminders: reminders.enabled ? (dailyOn ? `${arNum(dailyOn)} مفعّلة` : "لا تذكير مفعّل") : "متوقفة",
    quran: getReciter(prefs.quranReciter ?? "Alafasy_128kbps")?.label ?? "",
    tasbeeh: `الهدف ${arNum(sebhaTarget)}${prefs.enableHaptics && prefs.hapticStrength !== "off" ? " · مع الاهتزاز" : ""}`,
    appearance: prefs.designMode === "ufuq"
      ? [
        "أُفُق",
        { garden: "الحديقة", bustan: "بستان الذِّكر", plain: "بسيط" }[prefs.ufuqLook ?? "garden"],
        prefs.ufuqPalette === "day" ? "نهار" : prefs.ufuqPalette === "night" ? "ليل" : prefs.ufuqPalette === "time" ? "حسب الوقت" : "حسب الهاتف",
      ].join(" · ")
      : `الكلاسيكي · ${themeLabel(prefs.theme)}`,
    home: `${arNum(shownCards)} من ${arNum(order.length)} بطاقات`,
    privacy: Capacitor.isNativePlatform() ? (prefs.biometricLock ? "القفل مفعّل" : "القفل متوقف") : "الذكاء الاصطناعي",
    data: "النسخ الاحتياطي والمسح",
    about: `الإصدار ${APP_VERSION}`,
  };
}

function SettingsHome() {
  const navigate = useNavigate();
  const [query, setQuery] = React.useState("");
  const results = React.useMemo(() => searchSettings(query), [query]);
  const summaries = useGroupSummaries();
  const classicInviteHidden = useNoorStore((s) => s.prefs.designMode === "ufuq");
  const searching = query.trim().length > 0;

  return (
    <div className="settings-page page-enter">
      <div className="settings-search">
        <div className="settings-search-box">
          <Search size={16} className="opacity-55" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث: الأذان، القارئ، قفل التطبيق…"
            aria-label="البحث في الإعدادات"
          />
          {searching ? (
            <button type="button" onClick={() => setQuery("")} aria-label="مسح البحث">
              <X size={14} aria-hidden="true" />
            </button>
          ) : null}
        </div>
        {!searching ? <QuickSwitches /> : null}
      </div>

      {searching ? (
        results.length ? (
          <SettingsSection title="النتائج">
            {results.map(({ item, group }) => (
              <SettingsRow
                key={item.id}
                icon={GROUP_ICONS[group.id]}
                title={item.title}
                hint={group.title}
                onClick={() => navigate(`/settings/${group.id}#setting-${item.id}`)}
              />
            ))}
          </SettingsSection>
        ) : (
          <div className="settings-empty" role="status">
            لا يوجد خيار بهذا الاسم.
            <br />
            جرّب كلمة أخرى، مثل «الأذان» أو «الخط».
          </div>
        )
      ) : (
        <>
          {!classicInviteHidden ? <DesignInvite /> : null}
          <AccountPanel />
          <SettingsSection>
            {SETTINGS_GROUPS.slice(0, 4).map((group) => (
              <SettingsRow
                key={group.id}
                icon={GROUP_ICONS[group.id]}
                title={group.title}
                hint={summaries[group.id] || group.description}
                onClick={() => navigate(`/settings/${group.id}`)}
              />
            ))}
          </SettingsSection>
          <SettingsSection>
            {SETTINGS_GROUPS.slice(4, 6).map((group) => (
              <SettingsRow
                key={group.id}
                icon={GROUP_ICONS[group.id]}
                title={group.title}
                hint={summaries[group.id] || group.description}
                onClick={() => navigate(`/settings/${group.id}`)}
              />
            ))}
          </SettingsSection>
          <SettingsSection>
            {SETTINGS_GROUPS.slice(6).map((group) => (
              <SettingsRow
                key={group.id}
                icon={GROUP_ICONS[group.id]}
                title={group.title}
                hint={summaries[group.id] || group.description}
                onClick={() => navigate(`/settings/${group.id}`)}
              />
            ))}
          </SettingsSection>
        </>
      )}
    </div>
  );
}

function SettingsGroupPage({ group }: { group: SettingsGroupId }) {
  const navigate = useNavigate();
  const location = useLocation();
  useSettingHighlight(location.hash);
  const meta = SETTINGS_GROUPS.find((g) => g.id === group)!;
  const Page = GROUP_PAGES[group];
  return (
    <div className="settings-page page-enter">
      <div className="settings-back">
        <button
          type="button"
          aria-label="رجوع إلى الإعدادات"
          onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/settings"))}
        >
          <ArrowRight size={18} aria-hidden="true" />
        </button>
        <h1>{meta.title}</h1>
      </div>
      <Page />
    </div>
  );
}

export function SettingsPage() {
  useScrollRestoration();
  const { group } = useParams<{ group?: string }>();
  if (isGroupId(group)) return <SettingsGroupPage group={group} />;
  return <SettingsHome />;
}
