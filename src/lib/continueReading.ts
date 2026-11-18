/**
 * Keeps Android's «تابع القراءة» app shortcut on the page last read in the
 * Mushaf (AppShortcutsPlugin). Long-press the app icon to land back on it.
 * iPhone has the same through Siri and Spotlight («تابع القرآن في أثر»).
 */
import { Capacitor, registerPlugin } from "@capacitor/core";
import { toArabicNumeral } from "@/lib/quranMeta";
import { useNoorStore } from "@/store/noorStore";

type AppShortcutsPlugin = {
  setContinueReading(options: { page: number; label: string }): Promise<void>;
};

export function continueReadingLabel(page: number): string {
  return `تابع القراءة — صفحة ${toArabicNumeral(page)}`;
}

/** Follow the last-read page; returns an unsubscribe function. */
export function startContinueReadingShortcut(delayMs = 3000): () => void {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "android") return () => {};
  const plugin = registerPlugin<AppShortcutsPlugin>("AppShortcuts");
  let timer: ReturnType<typeof setTimeout> | null = null;
  let published: number | null = null;

  const publish = (page: number | null | undefined) => {
    if (!page || page < 1 || page > 604 || page === published) return;
    if (timer) clearTimeout(timer);
    // Pages turn quickly while reading: publish once the page settles.
    timer = setTimeout(() => {
      timer = null;
      published = page;
      void plugin.setContinueReading({ page, label: continueReadingLabel(page) }).catch(() => {
        published = null;
      });
    }, delayMs);
  };

  publish(useNoorStore.getState().prefs.quranMushafPage);
  const unsubscribe = useNoorStore.subscribe((state, previous) => {
    if (state.prefs.quranMushafPage !== previous.prefs.quranMushafPage) publish(state.prefs.quranMushafPage);
  });
  return () => {
    unsubscribe();
    if (timer) clearTimeout(timer);
  };
}
