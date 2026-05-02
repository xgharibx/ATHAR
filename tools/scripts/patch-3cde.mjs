/**
 * patch-3cde.mjs
 * 3C: Reminder notification deep-links (morning → /c/morning, evening → /c/evening)
 * 3D: Custom Adhkar Pack (store + new page + Home/Category integration)
 * 3E: Section weekly stats badge + mini bar chart in DhikrList header
 */
import fs from "fs";

function readNorm(p) { return fs.readFileSync(p, "utf8").replace(/\r\n/g, "\n"); }
function writeFile(p, content) { fs.writeFileSync(p, content, "utf8"); }
function replace(src, label, oldStr, newStr) {
  if (!src.includes(oldStr)) { throw new Error(`❌ Cannot find anchor for: ${label}\nSearching for:\n${oldStr.slice(0,120)}`); }
  const count = src.split(oldStr).length - 1;
  if (count > 1) throw new Error(`❌ Multiple (${count}) matches for: ${label}`);
  return src.replace(oldStr, newStr);
}

// ─────────────────────────────────────────────────────────
// 1. src/data/types.ts — add CustomAdhkarPack type
// ─────────────────────────────────────────────────────────
{
  let src = readNorm("src/data/types.ts");
  src = replace(src, "types: CustomAdhkarPack",
    `export function coerceCount(raw: unknown): number {`,
    `export type CustomAdhkarItem = {
  text: string;
  count: number;
};

export type CustomAdhkarPack = {
  id: string;          // \`custom_\${Date.now()}\`
  title: string;
  items: CustomAdhkarItem[];
  createdAt: string;   // ISO
};

export function coerceCount(raw: unknown): number {`
  );
  writeFile("src/data/types.ts", src);
  console.log("✅ types.ts");
}

// ─────────────────────────────────────────────────────────
// 2. src/store/noorStore.ts — add customPacks + sectionCompletions
// ─────────────────────────────────────────────────────────
{
  let src = readNorm("src/store/noorStore.ts");

  // 2a. Import CustomAdhkarPack type
  src = replace(src, "store: import CustomAdhkarPack",
    `import { isDailySection } from "@/lib/dailySections";`,
    `import { isDailySection } from "@/lib/dailySections";
import type { CustomAdhkarPack } from "@/data/types";`
  );

  // 2b. Add to NoorState type
  src = replace(src, "store: NoorState customPacks + sectionCompletions",
    `  // Hadith bookmarks + reading progress + notes
  hadithBookmarks: Record<string, boolean>; // key: \`\${bookKey}:\${n}\`
  toggleHadithBookmark: (bookKey: string, n: number) => void;
  hadithProgress: Record<string, number>; // key: bookKey → last hadith n viewed
  setHadithProgress: (bookKey: string, n: number) => void;
  hadithNotes: Record<string, string>; // key: \`\${bookKey}:\${n}\`
  setHadithNote: (bookKey: string, n: number, note: string) => void;
};`,
    `  // Hadith bookmarks + reading progress + notes
  hadithBookmarks: Record<string, boolean>; // key: \`\${bookKey}:\${n}\`
  toggleHadithBookmark: (bookKey: string, n: number) => void;
  hadithProgress: Record<string, number>; // key: bookKey → last hadith n viewed
  setHadithProgress: (bookKey: string, n: number) => void;
  hadithNotes: Record<string, string>; // key: \`\${bookKey}:\${n}\`
  setHadithNote: (bookKey: string, n: number, note: string) => void;

  // 3D: Custom Adhkar Packs
  customPacks: CustomAdhkarPack[];
  addCustomPack: (pack: Omit<CustomAdhkarPack, "id" | "createdAt">) => string;
  updateCustomPack: (id: string, patch: Partial<Pick<CustomAdhkarPack, "title" | "items">>) => void;
  deleteCustomPack: (id: string) => void;

  // 3E: Section completion history (for weekly stats)
  sectionCompletions: Record<string, string[]>; // sectionId → ISO date array
  recordSectionCompletion: (sectionId: string) => void;
};`
  );

  // 2c. Add initial state values and actions (after hadithNotes actions)
  src = replace(src, "store: hadithNotes action end",
    `      setHadithNote: (bookKey, n, note) => {
        const key = \`\${bookKey}:\${n}\`;
        set((s) => ({
          hadithNotes: note.trim()
            ? { ...s.hadithNotes, [key]: note.trim() }
            : Object.fromEntries(Object.entries(s.hadithNotes).filter(([k]) => k !== key)),
        }));
      },`,
    `      setHadithNote: (bookKey, n, note) => {
        const key = \`\${bookKey}:\${n}\`;
        set((s) => ({
          hadithNotes: note.trim()
            ? { ...s.hadithNotes, [key]: note.trim() }
            : Object.fromEntries(Object.entries(s.hadithNotes).filter(([k]) => k !== key)),
        }));
      },

      // 3D: Custom Adhkar Packs
      customPacks: [],
      addCustomPack: (pack) => {
        const id = \`custom_\${Date.now()}\`;
        const full: CustomAdhkarPack = { ...pack, id, createdAt: new Date().toISOString() };
        set((s) => ({ customPacks: [...s.customPacks, full] }));
        return id;
      },
      updateCustomPack: (id, patch) =>
        set((s) => ({ customPacks: s.customPacks.map((p) => p.id === id ? { ...p, ...patch } : p) })),
      deleteCustomPack: (id) =>
        set((s) => ({ customPacks: s.customPacks.filter((p) => p.id !== id) })),

      // 3E: Section completion history
      sectionCompletions: {},
      recordSectionCompletion: (sectionId) => {
        const today = todayISO();
        set((s) => {
          const prev = s.sectionCompletions[sectionId] ?? [];
          if (prev[prev.length - 1] === today) return {};
          return { sectionCompletions: { ...s.sectionCompletions, [sectionId]: [...prev, today].slice(-365) } };
        });
      },`
  );

  // 2d. Bump version from 20 → 21 and add migration entries
  src = replace(src, "store: version bump 21",
    `      version: 20,`,
    `      version: 21,`
  );

  src = replace(src, "store: migration customPacks + sectionCompletions",
    `          hadithBookmarks: (state as Partial<NoorState>).hadithBookmarks ?? {},
          hadithProgress: (state as Partial<NoorState>).hadithProgress ?? {},
          hadithNotes: (state as Partial<NoorState>).hadithNotes ?? {},
        } as NoorState;`,
    `          hadithBookmarks: (state as Partial<NoorState>).hadithBookmarks ?? {},
          hadithProgress: (state as Partial<NoorState>).hadithProgress ?? {},
          hadithNotes: (state as Partial<NoorState>).hadithNotes ?? {},
          customPacks: Array.isArray((state as Partial<NoorState>).customPacks) ? (state as Partial<NoorState>).customPacks! : [],
          sectionCompletions: (state as Partial<NoorState>).sectionCompletions ?? {},
        } as NoorState;`
  );

  writeFile("src/store/noorStore.ts", src);
  console.log("✅ noorStore.ts");
}

// ─────────────────────────────────────────────────────────
// 3. src/lib/reminders.ts — add deep-link extra fields + listener export
// ─────────────────────────────────────────────────────────
{
  let src = readNorm("src/lib/reminders.ts");

  // 3a. Add route extra to each reminder notification in buildReminderNotifications
  src = replace(src, "reminders: morning extra",
    `    {
      enabled: reminders.morningEnabled,
      id: REMINDER_IDS.morning,
      title: "أثر — تذكير الصباح",
      body: dailyPhrase(MORNING_PHRASES),
      hhmm: reminders.morningTime,
    },
    {
      enabled: reminders.eveningEnabled,
      id: REMINDER_IDS.evening,
      title: "أثر — تذكير المساء",
      body: dailyPhrase(EVENING_PHRASES),
      hhmm: reminders.eveningTime,
    },
    {
      enabled: reminders.dailyWirdEnabled,
      id: REMINDER_IDS.dailyWird,
      title: "أثر — وردك اليومي",
      body: dailyPhrase(DAILY_WIRD_PHRASES),
      hhmm: reminders.dailyWirdTime,
    },
    {
      enabled: reminders.khatmaEnabled,
      id: REMINDER_IDS.khatma,
      title: "أثر — خطة الختمة",
      body: dailyPhrase(KHATMA_PHRASES),
      hhmm: reminders.khatmaTime,
    },
  ];`,
    `    {
      enabled: reminders.morningEnabled,
      id: REMINDER_IDS.morning,
      title: "أثر — تذكير الصباح",
      body: dailyPhrase(MORNING_PHRASES),
      hhmm: reminders.morningTime,
      extra: { route: "/c/morning" },
    },
    {
      enabled: reminders.eveningEnabled,
      id: REMINDER_IDS.evening,
      title: "أثر — تذكير المساء",
      body: dailyPhrase(EVENING_PHRASES),
      hhmm: reminders.eveningTime,
      extra: { route: "/c/evening" },
    },
    {
      enabled: reminders.dailyWirdEnabled,
      id: REMINDER_IDS.dailyWird,
      title: "أثر — وردك اليومي",
      body: dailyPhrase(DAILY_WIRD_PHRASES),
      hhmm: reminders.dailyWirdTime,
      extra: { route: "/quran" },
    },
    {
      enabled: reminders.khatmaEnabled,
      id: REMINDER_IDS.khatma,
      title: "أثر — خطة الختمة",
      body: dailyPhrase(KHATMA_PHRASES),
      hhmm: reminders.khatmaTime,
      extra: { route: "/quran/plans" },
    },
  ];`
  );

  // 3b. Update buildRepeatingNotification to pass extra through
  src = replace(src, "reminders: buildRepeatingNotification add extra",
    `function buildRepeatingNotification(options: {
  id: number;
  title: string;
  body: string;
  hhmm: string;
  audio: NotificationAudioConfig;
}) {
  const at = nextAtLocalTime(options.hhmm);
  if (!at) return null;

  return {
    id: options.id,
    title: options.title,
    body: options.body,
    channelId: options.audio.channelId,
    sound: options.audio.soundFile,
    smallIcon: REMINDER_NOTIFICATION_ICON,
    largeIcon: REMINDER_NOTIFICATION_LARGE_ICON,
    iconColor: REMINDER_ICON_COLOR,
    schedule: { at, repeats: true, every: "day" as const },
  };
}`,
    `function buildRepeatingNotification(options: {
  id: number;
  title: string;
  body: string;
  hhmm: string;
  audio: NotificationAudioConfig;
  extra?: Record<string, string>;
}) {
  const at = nextAtLocalTime(options.hhmm);
  if (!at) return null;

  return {
    id: options.id,
    title: options.title,
    body: options.body,
    channelId: options.audio.channelId,
    sound: options.audio.soundFile,
    smallIcon: REMINDER_NOTIFICATION_ICON,
    largeIcon: REMINDER_NOTIFICATION_LARGE_ICON,
    iconColor: REMINDER_ICON_COLOR,
    extra: options.extra,
    schedule: { at, repeats: true, every: "day" as const },
  };
}`
  );

  // 3c. Update buildReminderNotifications to pass extra through
  src = replace(src, "reminders: pass extra to buildRepeatingNotification",
    `    const notification = buildRepeatingNotification({
      id: plan.id,
      title: plan.title,
      body: plan.body,
      hhmm: plan.hhmm,
      audio,
    });`,
    `    const notification = buildRepeatingNotification({
      id: plan.id,
      title: plan.title,
      body: plan.body,
      hhmm: plan.hhmm,
      audio,
      extra: (plan as { extra?: Record<string, string> }).extra,
    });`
  );

  // 3d. Add export for deep-link listener at end of file
  src = src.trimEnd() + `

/** 3C: Register a listener that navigates to the route embedded in a notification's extra.
 *  Returns a cleanup function (call it in a useEffect return). */
export async function registerNotificationDeepLinkListener(
  navigate: (path: string) => void,
): Promise<() => void> {
  if (!Capacitor.isNativePlatform()) return () => {};
  const { LocalNotifications } = await import("@capacitor/local-notifications");
  const handle = await LocalNotifications.addListener(
    "localNotificationActionPerformed",
    (action) => {
      const extra = action.notification.extra as Record<string, unknown> | undefined;
      const route = extra?.route;
      if (typeof route === "string" && route.startsWith("/")) {
        navigate(route);
      }
    },
  );
  return () => { handle.remove(); };
}
`;

  writeFile("src/lib/reminders.ts", src);
  console.log("✅ reminders.ts");
}

// ─────────────────────────────────────────────────────────
// 4. src/App.tsx — add listener + route for /adhkar/custom
// ─────────────────────────────────────────────────────────
{
  let src = readNorm("src/App.tsx");

  // 4a. Import registerNotificationDeepLinkListener + add useNavigate to router import
  src = replace(src, "App: import useNavigate",
    `import { Routes, Route, useLocation } from "react-router-dom";`,
    `import { Routes, Route, useLocation, useNavigate } from "react-router-dom";`
  );

  src = replace(src, "App: import deep-link listener",
    `import { syncReminders } from "@/lib/reminders";`,
    `import { syncReminders, registerNotificationDeepLinkListener } from "@/lib/reminders";`
  );

  // 4b. Add const navigate inside App() function
  src = replace(src, "App: add navigate const",
    `export default function App() {
  useApplyTheme();`,
    `export default function App() {
  useApplyTheme();
  const navigate = useNavigate();`
  );

  // 4c. Add lazy CustomAdhkarPage
  src = replace(src, "App: lazy CustomAdhkarPage",
    `const QuranPlansPage = React.lazy(() => import("@/pages/QuranPlans").then((m) => ({ default: m.QuranPlansPage })));`,
    `const QuranPlansPage = React.lazy(() => import("@/pages/QuranPlans").then((m) => ({ default: m.QuranPlansPage })));
const CustomAdhkarPage = React.lazy(() => import("@/pages/CustomAdhkar").then((m) => ({ default: m.CustomAdhkarPage })));`
  );

  // 4d. Add useEffect for deep-link listener
  src = replace(src, "App: deep-link listener useEffect",
    `  React.useEffect(() => {
    void syncReminders(reminders, notificationPrayerTimings);
  }, [notificationPrayerTimings, reminders]);`,
    `  React.useEffect(() => {
    void syncReminders(reminders, notificationPrayerTimings);
  }, [notificationPrayerTimings, reminders]);

  // 3C: Register notification deep-link listener on native platforms
  React.useEffect(() => {
    let cleanup: (() => void) | undefined;
    registerNotificationDeepLinkListener(navigate).then((fn) => { cleanup = fn; });
    return () => { cleanup?.(); };
  }, [navigate]);`
  );

  // 4e. Add route for /adhkar/custom
  src = replace(src, "App: route CustomAdhkar",
    `          <Route path="quran/plans" element={<S><QuranPlansPage /></S>} />`,
    `          <Route path="quran/plans" element={<S><QuranPlansPage /></S>} />
          <Route path="adhkar/custom" element={<S><CustomAdhkarPage /></S>} />`
  );

  writeFile("src/App.tsx", src);
  console.log("✅ App.tsx");
}

// ─────────────────────────────────────────────────────────
// 5. src/components/dhikr/DhikrList.tsx — record completion + weekly stats header
// ─────────────────────────────────────────────────────────
{
  let src = readNorm("src/components/dhikr/DhikrList.tsx");

  // 5a. Add store selectors for sectionCompletions
  src = replace(src, "DhikrList: add store selectors",
    `  const resetSection = useNoorStore((s) => s.resetSection);
  const increment = useNoorStore((s) => s.increment);
  const progressMap = useNoorStore((s) => s.progress);`,
    `  const resetSection = useNoorStore((s) => s.resetSection);
  const increment = useNoorStore((s) => s.increment);
  const progressMap = useNoorStore((s) => s.progress);
  const sectionCompletions = useNoorStore((s) => s.sectionCompletions);
  const recordSectionCompletion = useNoorStore((s) => s.recordSectionCompletion);`
  );

  // 5b. Record completion in the 100% confetti effect + compute weekly stats
  src = replace(src, "DhikrList: record completion + weekly stats",
    `  // D2: category completion confetti
  const prevPercentRef = React.useRef<number>(stats.percent);
  React.useEffect(() => {
    if (stats.percent >= 100 && prevPercentRef.current < 100 && props.items.length > 0) {
      getConfetti().then((c) => {
        c({ particleCount: 120, spread: 80, startVelocity: 30, scalar: 1.0, origin: { y: 0.6 } });
        setTimeout(() => c({ particleCount: 60, spread: 100, startVelocity: 20, scalar: 0.9, origin: { x: 0.2, y: 0.8 } }), 300);
        setTimeout(() => c({ particleCount: 60, spread: 100, startVelocity: 20, scalar: 0.9, origin: { x: 0.8, y: 0.8 } }), 500);
      });
    }
    prevPercentRef.current = stats.percent;
  }, [stats.percent, props.items.length]);`,
    `  // D2: category completion confetti + 3E record completion
  const prevPercentRef = React.useRef<number>(stats.percent);
  React.useEffect(() => {
    if (stats.percent >= 100 && prevPercentRef.current < 100 && props.items.length > 0) {
      recordSectionCompletion(props.sectionId);
      getConfetti().then((c) => {
        c({ particleCount: 120, spread: 80, startVelocity: 30, scalar: 1.0, origin: { y: 0.6 } });
        setTimeout(() => c({ particleCount: 60, spread: 100, startVelocity: 20, scalar: 0.9, origin: { x: 0.2, y: 0.8 } }), 300);
        setTimeout(() => c({ particleCount: 60, spread: 100, startVelocity: 20, scalar: 0.9, origin: { x: 0.8, y: 0.8 } }), 500);
      });
    }
    prevPercentRef.current = stats.percent;
  }, [stats.percent, props.items.length, props.sectionId, recordSectionCompletion]);

  // 3E: Weekly stats (last 7 days)
  const weeklyStats = React.useMemo(() => {
    const completions = sectionCompletions[props.sectionId] ?? [];
    const now = Date.now();
    const bars = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now - (6 - i) * 86_400_000);
      const iso = \`\${d.getFullYear()}-\${String(d.getMonth() + 1).padStart(2, "0")}-\${String(d.getDate()).padStart(2, "0")}\`;
      return completions.includes(iso) ? 1 : 0;
    });
    const weeklyCount = bars.reduce((a, b) => a + b, 0);
    return { weeklyCount, bars };
  }, [sectionCompletions, props.sectionId]);`
  );

  // 5c. Add weekly stats badge under the title in the header
  src = replace(src, "DhikrList: weekly stats badge in header",
    `              <div className="text-sm opacity-70 mt-2 tabular-nums">
                {hasItems
                  ? \`التقدّم: \${stats.done}/\${stats.total} • \${stats.percent}% • ~\${Math.max(1, Math.round(props.items.length / 2))} دق\`
                  : "0 ذكر"}
              </div>`,
    `              <div className="text-sm opacity-70 mt-2 tabular-nums">
                {hasItems
                  ? \`التقدّم: \${stats.done}/\${stats.total} • \${stats.percent}% • ~\${Math.max(1, Math.round(props.items.length / 2))} دق\`
                  : "0 ذكر"}
              </div>
              {weeklyStats.weeklyCount > 0 && (
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[11px] opacity-60">أتممتها {weeklyStats.weeklyCount} مرات هذا الأسبوع</span>
                  <div className="flex items-end gap-[2px]">
                    {weeklyStats.bars.map((v, i) => (
                      <div
                        key={i}
                        className="w-[5px] rounded-sm transition-all"
                        style={{
                          height: v ? "12px" : "5px",
                          background: v ? identity.accent : "rgba(255,255,255,0.15)",
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}`
  );

  writeFile("src/components/dhikr/DhikrList.tsx", src);
  console.log("✅ DhikrList.tsx");
}

// ─────────────────────────────────────────────────────────
// 6. src/pages/Category.tsx — support custom pack sections
// ─────────────────────────────────────────────────────────
{
  let src = readNorm("src/pages/Category.tsx");

  // 6a. Import DhikrItem type (add to existing types import)
  src = replace(src, "Category: import DhikrItem",
    `import { coerceCount } from "@/data/types";`,
    `import { coerceCount, type DhikrItem } from "@/data/types";`
  );

  // 6b. Read customPacks from store
  src = replace(src, "Category: read customPacks from store",
    `  const { data, isLoading } = useAdhkarDB();`,
    `  const { data, isLoading } = useAdhkarDB();
  const customPacks = useNoorStore((s) => s.customPacks);`
  );

  // 6c. Insert custom pack fallback check before the not-found card
  src = replace(src, "Category: fallback to customPack",
    `  const section = data.db.sections.find((s) => s.id === id);
  if (!section) {
    return (
      <div className="p-6">
        <Card className="p-6">
          <div className="flex items-center gap-2 font-semibold">
            <AlertTriangle size={18} />
            القسم غير موجود
          </div>
          <div className="mt-2 text-sm opacity-70">قد يكون المعرّف خاطئًا: {id}</div>
          <div className="mt-4">
            <Button variant="secondary" onClick={() => navigate("/")}>
              <Home size={16} />
              العودة
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <DhikrList
      sectionId={section.id}
      title={section.title}
      items={section.content.map((i) => ({ ...i, count: coerceCount(i.count) }))}
      focusIndex={focusIndex}
    />
  );`,
    `  const section = data.db.sections.find((s) => s.id === id);
  if (!section) {
    // 3D: fall back to user-created custom pack
    const customPack = customPacks.find((p) => p.id === id);
    if (customPack) {
      const customItems: DhikrItem[] = customPack.items.map((it) => ({
        text: it.text,
        count: it.count,
        benefit: "",
        source: "",
        source_label: "",
        source_url: "",
        minimal: false,
        count_description: "",
      }));
      return (
        <DhikrList
          sectionId={customPack.id}
          title={customPack.title}
          items={customItems}
          focusIndex={focusIndex}
        />
      );
    }
    return (
      <div className="p-6">
        <Card className="p-6">
          <div className="flex items-center gap-2 font-semibold">
            <AlertTriangle size={18} />
            القسم غير موجود
          </div>
          <div className="mt-2 text-sm opacity-70">قد يكون المعرّف خاطئًا: {id}</div>
          <div className="mt-4">
            <Button variant="secondary" onClick={() => navigate("/")}>
              <Home size={16} />
              العودة
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <DhikrList
      sectionId={section.id}
      title={section.title}
      items={section.content.map((i) => ({ ...i, count: coerceCount(i.count) }))}
      focusIndex={focusIndex}
    />
  );`
  );

  writeFile("src/pages/Category.tsx", src);
  console.log("✅ Category.tsx");
}

// ─────────────────────────────────────────────────────────
// 7. src/pages/Home.tsx — show custom packs in sections strip
// ─────────────────────────────────────────────────────────
{
  let src = readNorm("src/pages/Home.tsx");

  // 7a. Read customPacks from store (right after progressMap line)
  src = replace(src, "Home: read customPacks",
    `  const sections = data?.db.sections ?? [];`,
    `  const sections = data?.db.sections ?? [];
  const customPacks = useNoorStore((s) => s.customPacks);`
  );

  // 7b. Add custom packs to the strip before DB sections
  src = replace(src, "Home: custom pack strip entry",
    `            {sections.map((section, idx) => {`,
    `            {/* 3D: Custom packs strip entries */}
            {customPacks.map((pack) => {
              let done = 0;
              const total = pack.items.length;
              pack.items.forEach((item, i) => {
                const have = Math.min(item.count, Math.max(0, Number(progressMap[\`\${pack.id}:\${i}\`]) || 0));
                if (have >= item.count) done++;
              });
              const isComplete = total > 0 && done === total;
              const pctDone = total > 0 ? Math.round((done / total) * 100) : 0;
              return (
                <button
                  key={pack.id}
                  onClick={() => { trackUxEvent(\`home_strip:\${pack.id}\`); navigate(\`/c/\${pack.id}\`); }}
                  className="press-effect flex-none flex flex-col items-center gap-1 px-3.5 py-2.5 rounded-2xl glass border min-w-[60px] select-none active:scale-[.91] transition-all"
                  style={{
                    borderColor: isComplete
                      ? "color-mix(in srgb, var(--ok) 30%, transparent)"
                      : pctDone > 0 ? "rgba(201,162,39,0.4)" : "rgba(255,255,255,0.08)",
                  }}
                >
                  <span className="text-[22px] leading-none">📝</span>
                  <span className="text-[10px] font-medium opacity-60 leading-none mt-0.5 max-w-[60px] truncate">{pack.title}</span>
                  <div className="w-full h-[3px] rounded-full bg-white/10 overflow-hidden mt-1">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{ width: \`\${pctDone}%\`, background: isComplete ? "var(--ok)" : "var(--accent)" }}
                    />
                  </div>
                </button>
              );
            })}
            <button
              onClick={() => { trackUxEvent("home_strip:custom_manage"); navigate("/adhkar/custom"); }}
              className="press-effect flex-none flex flex-col items-center gap-1 px-3.5 py-2.5 rounded-2xl glass border min-w-[60px] select-none active:scale-[.91] transition-all"
              style={{ borderColor: "rgba(255,255,255,0.08)", opacity: 0.7 }}
            >
              <span className="text-[22px] leading-none">＋</span>
              <span className="text-[10px] font-medium opacity-60 leading-none mt-0.5">أذكاري</span>
              <div className="w-full h-[3px] rounded-full bg-white/10 overflow-hidden mt-1" />
            </button>
            {sections.map((section, idx) => {`
  );

  writeFile("src/pages/Home.tsx", src);
  console.log("✅ Home.tsx");
}

console.log("\n✅ All patches applied successfully.");
