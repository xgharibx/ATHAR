/**
 * Counting tasbeeh by voice.
 *
 * In the apps this uses the phone's own speech recognition (VoiceTasbeehPlugin:
 * Apple's on iPhone, on the device when it can; Android's recogniser), because
 * the in-app web view has no speech recognition. In a browser that has it,
 * the Web Speech API does the same job.
 *
 * Every repetition counts: the recogniser sends a growing transcript while the
 * person speaks, and each new occurrence of a phrase since the last update
 * adds one. Saying «سبحان الله» three times in one breath counts three.
 */
import { Capacitor, registerPlugin, type PluginListenerHandle } from "@capacitor/core";

export type VoicePhrase = { key: string; text: string };

/** The four tasbeehat (Sebha's keys) and the ways people say them. */
export const VOICE_TASBEEH_PHRASES: VoicePhrase[] = [
  { key: "subhanallah", text: "سبحان الله" },
  { key: "alhamdulillah", text: "الحمد لله" },
  { key: "la_ilaha_illallah", text: "لا إله إلا الله" },
  { key: "allahu_akbar", text: "الله أكبر" },
];

/**
 * Arabic text reduced to bare letters: no diacritics, tatweel, spaces or
 * punctuation, and one form for the letters recognisers write differently
 * (أ إ آ ٱ → ا, ى → ي, ة → ه).
 */
export function normalizeArabic(text: string): string {
  return text
    .replace(/[ً-ٰٟۖ-ۭـ]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[^ء-ي]/g, "");
}

function countOccurrences(haystack: string, needle: string): number {
  if (!needle) return 0;
  let count = 0;
  let index = haystack.indexOf(needle);
  while (index !== -1) {
    count += 1;
    index = haystack.indexOf(needle, index + needle.length);
  }
  return count;
}

/**
 * Turns a recogniser's updates into counts. Each update carries the whole
 * transcript of its segment so far; a new segment starts from zero. A revised
 * (shorter) transcript never takes counts back.
 */
export function createVoiceCounter(phrases: VoicePhrase[]) {
  const patterns = phrases
    .map((phrase) => ({ key: phrase.key, pattern: normalizeArabic(phrase.text) }))
    .filter((phrase) => phrase.pattern.length >= 3);
  let segment: string | null = null;
  let counted = new Map<string, number>();

  return {
    /** The phrase keys to count for this update, one entry per repetition. */
    push(segmentId: string, transcript: string): string[] {
      if (segmentId !== segment) {
        segment = segmentId;
        counted = new Map();
      }
      const text = normalizeArabic(transcript);
      const result: string[] = [];
      for (const { key, pattern } of patterns) {
        const seen = countOccurrences(text, pattern);
        const before = counted.get(key) ?? 0;
        if (seen > before) {
          for (let i = before; i < seen; i += 1) result.push(key);
          counted.set(key, seen);
        }
      }
      return result;
    },
  };
}

export type VoiceTasbeehState = "listening" | "stopped" | "denied" | "unavailable" | "error";

export type VoiceTasbeehHandlers = {
  phrases: VoicePhrase[];
  onCount: (key: string) => void;
  onHeard?: (text: string) => void;
  onState?: (state: VoiceTasbeehState) => void;
};

type TranscriptEvent = { text: string; segment: string; final?: boolean };

type VoiceTasbeehPlugin = {
  available(): Promise<{ available: boolean; onDevice?: boolean }>;
  start(options: { locale: string; hints: string[] }): Promise<void>;
  stop(): Promise<void>;
  addListener(event: "transcript", listener: (event: TranscriptEvent) => void): Promise<PluginListenerHandle>;
  addListener(event: "state", listener: (event: { state: VoiceTasbeehState }) => void): Promise<PluginListenerHandle>;
};

let nativePlugin: VoiceTasbeehPlugin | null = null;

function native(): VoiceTasbeehPlugin | null {
  if (!Capacitor.isNativePlatform()) return null;
  nativePlugin ??= registerPlugin<VoiceTasbeehPlugin>("VoiceTasbeeh");
  return nativePlugin;
}

type WebRecognitionCtor = new () => SpeechRecognition;

function webRecognition(): WebRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  return (window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null) as WebRecognitionCtor | null;
}

/** Whether this phone or browser can count by voice. */
export async function voiceTasbeehAvailable(): Promise<boolean> {
  const plugin = native();
  if (plugin) {
    try {
      return (await plugin.available()).available;
    } catch {
      return false;
    }
  }
  return webRecognition() !== null;
}

const LOCALE = "ar-SA";

/** Start listening; resolves to a stop function. */
export async function startVoiceTasbeeh(handlers: VoiceTasbeehHandlers): Promise<() => void> {
  const counter = createVoiceCounter(handlers.phrases);
  const handle = (event: TranscriptEvent) => {
    handlers.onHeard?.(event.text);
    for (const key of counter.push(event.segment, event.text)) handlers.onCount(key);
  };

  const plugin = native();
  if (plugin) {
    const listeners = await Promise.all([
      plugin.addListener("transcript", handle),
      plugin.addListener("state", ({ state }) => handlers.onState?.(state)),
    ]);
    try {
      await plugin.start({ locale: LOCALE, hints: handlers.phrases.map((phrase) => phrase.text) });
    } catch (error) {
      for (const listener of listeners) void listener.remove();
      throw error;
    }
    handlers.onState?.("listening");
    return () => {
      void plugin.stop().catch(() => {});
      for (const listener of listeners) void listener.remove();
      handlers.onState?.("stopped");
    };
  }

  const Recognition = webRecognition();
  if (!Recognition) {
    handlers.onState?.("unavailable");
    throw new Error("unavailable");
  }
  let active = true;
  let session = 0;
  let recognition: SpeechRecognition | null = null;
  const begin = () => {
    session += 1;
    const current = session;
    const next = new Recognition();
    next.lang = LOCALE;
    next.continuous = true;
    next.interimResults = true;
    next.maxAlternatives = 1;
    next.onresult = (event: SpeechRecognitionEvent) => {
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        handle({ text: result[0]?.transcript ?? "", segment: `${current}:${i}`, final: result.isFinal });
      }
    };
    next.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        active = false;
        handlers.onState?.("denied");
      } else if (event.error !== "no-speech" && event.error !== "aborted") {
        active = false;
        handlers.onState?.("error");
      }
    };
    // Browsers end a session after a pause: carry on until stopped.
    next.onend = () => {
      if (!active) return;
      try {
        begin();
      } catch {
        active = false;
        handlers.onState?.("error");
      }
    };
    recognition = next;
    next.start();
  };
  begin();
  handlers.onState?.("listening");
  return () => {
    active = false;
    recognition?.stop();
    handlers.onState?.("stopped");
  };
}
