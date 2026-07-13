/**
 * Companion — Voice mode.
 *
 * - STT: Web Speech API (webkitSpeechRecognition / SpeechRecognition).
 *   Arabic MSA first, falls back to user locale.
 * - TTS: window.speechSynthesis with an Arabic voice when available.
 *
 * Respects a per-app mute preference stored in localStorage so the rest of
 * the app keeps its existing audio semantics.
 */

type Listener<T> = (v: T) => void;

export interface VoiceState {
  supported: boolean;
  listening: boolean;
  transcript: string;
  error: string | null;
}

const SUPPORTED = typeof window !== "undefined"
  && Boolean((window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition
    || (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition);

function getRecognition(): any | null {
  if (typeof window === "undefined") return null;
  const W = window as unknown as { SpeechRecognition?: any; webkitSpeechRecognition?: any };
  return W.SpeechRecognition || W.webkitSpeechRecognition || null;
}

let current: any | null = null;

export function isVoiceSupported(): boolean { return SUPPORTED; }

export function startListening(onEvent: Listener<VoiceState>): void {
  const Rec = getRecognition();
  if (!Rec) {
    onEvent({ supported: false, listening: false, transcript: "", error: "المتصفح لا يدعم التعرف على الصوت." });
    return;
  }
  try {
    stopListening();
    const rec = new Rec();
    rec.lang = "ar-SA";
    rec.continuous = false;
    rec.interimResults = true;
    let lastTranscript = "";
    onEvent({ supported: true, listening: true, transcript: "", error: null });
    rec.onresult = (e: any) => {
      let text = "";
      for (let i = e.resultIndex; i < e.results.length; i++) text += e.results[i][0].transcript;
      lastTranscript = text;
      onEvent({ supported: true, listening: true, transcript: text, error: null });
    };
    rec.onerror = (e: any) => {
      onEvent({ supported: true, listening: false, transcript: lastTranscript, error: e?.error ?? "unknown" });
    };
    rec.onend = () => {
      onEvent({ supported: true, listening: false, transcript: lastTranscript, error: null });
    };
    current = rec;
    rec.start();
  } catch (err) {
    onEvent({ supported: true, listening: false, transcript: "", error: (err as Error).message });
  }
}

export function stopListening(): void {
  if (current) {
    try { current.stop(); } catch { /* ignore */ }
    current = null;
  }
}

export function speakArabic(text: string, voiceEnabled: boolean): void {
  if (!voiceEnabled) return;
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "ar-SA";
    u.rate = 0.96;
    const voices = window.speechSynthesis.getVoices();
    const ar = voices.find((v) => v.lang?.toLowerCase().startsWith("ar"));
    if (ar) u.voice = ar;
    window.speechSynthesis.speak(u);
  } catch { /* ignore */ }
}

export function stopSpeaking(): void {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    try { window.speechSynthesis.cancel(); } catch { /* ignore */ }
  }
}

export function getVoiceEnabled(): boolean {
  try { return localStorage.getItem("noor_companion_voice_on") === "1"; } catch { return false; }
}
export function setVoiceEnabled(v: boolean): void {
  try { localStorage.setItem("noor_companion_voice_on", v ? "1" : "0"); } catch { /* ignore */ }
}
