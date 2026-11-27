/**
 * Search by voice: what is said becomes the search words, as they are heard,
 * and listening stops after a short quiet. The phone's own recogniser (see
 * lib/voiceTasbeeh.ts); `canListen` is false where there is none.
 */
import * as React from "react";
import toast from "react-hot-toast";
import { speechAvailable, startSpeechStream } from "@/lib/voiceTasbeeh";

/** Stop listening after this long without a new word. */
const QUIET_MS = 3000;

export function useVoiceQuery(onHeard: (text: string) => void) {
  const [canListen, setCanListen] = React.useState(false);
  const [listening, setListening] = React.useState(false);
  const stopRef = React.useRef<(() => void) | null>(null);
  const quietRef = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const heardRef = React.useRef(onHeard);
  React.useEffect(() => {
    heardRef.current = onHeard;
  }, [onHeard]);
  React.useEffect(() => {
    let alive = true;
    void speechAvailable().then((ok) => alive && setCanListen(ok)).catch(() => undefined);
    return () => {
      alive = false;
      clearTimeout(quietRef.current);
      stopRef.current?.();
    };
  }, []);
  const stop = React.useCallback(() => {
    clearTimeout(quietRef.current);
    stopRef.current?.();
    stopRef.current = null;
    setListening(false);
  }, []);
  const toggle = async () => {
    if (listening) {
      stop();
      return;
    }
    const segments = new Map<string, string>();
    try {
      stopRef.current = await startSpeechStream({
        hints: [],
        onTranscript: (e) => {
          segments.set(e.segment, e.text);
          heardRef.current([...segments.values()].join(" ").trim());
          clearTimeout(quietRef.current);
          quietRef.current = setTimeout(stop, QUIET_MS);
        },
        onState: (state) => {
          if (state === "denied") toast.error("اسمح باستخدام الميكروفون لتبحث بصوتك");
          if (state === "denied" || state === "error" || state === "unavailable" || state === "stopped") setListening(false);
        },
      });
      setListening(true);
      quietRef.current = setTimeout(stop, QUIET_MS * 3);
    } catch {
      setListening(false);
      toast.error("لا يمكن الاستماع على هذا الجهاز");
    }
  };
  return { canListen, listening, toggle };
}
