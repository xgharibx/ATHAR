import * as React from "react";

/**
 * Claude-style "stick to bottom" for a streaming chat.
 *
 * The old behavior scrolled to the end on *every* streamed token, which
 * fought the reader the moment they scrolled up to re-read something. This
 * follows the stream only while the reader is already at the bottom, and the
 * instant they scroll away it lets go — exactly like Claude / ChatGPT.
 *
 * Usage:
 *   const { scrollerRef, endRef, atBottom, scrollToBottom, stickToBottom } = useStickToBottom();
 *   - Attach `scrollerRef` to the scroll container, OR leave it unattached to
 *     use the window as the scroller (whole-page scroll).
 *   - Put `endRef` on a sentinel <div/> after the last message.
 *   - `stickToBottom()` on every streamed-text change — only scrolls if the
 *     reader is near the bottom.
 *   - `scrollToBottom()` when the user sends a message (they expect to jump to
 *     their new turn) or when they tap the "jump to latest" affordance.
 *   - `atBottom` drives that affordance's visibility.
 */
export function useStickToBottom(threshold = 140) {
  const scrollerRef = React.useRef<HTMLElement | null>(null);
  const endRef = React.useRef<HTMLDivElement>(null);
  const stick = React.useRef(true);
  const [atBottom, setAtBottom] = React.useState(true);

  const distanceFromBottom = React.useCallback(() => {
    const s = scrollerRef.current;
    if (s) return s.scrollHeight - s.scrollTop - s.clientHeight;
    const doc = document.documentElement;
    return doc.scrollHeight - window.scrollY - window.innerHeight;
  }, []);

  const measure = React.useCallback(() => {
    const near = distanceFromBottom() <= threshold;
    stick.current = near;
    setAtBottom(near);
  }, [distanceFromBottom, threshold]);

  React.useEffect(() => {
    const target: Window | HTMLElement = scrollerRef.current ?? window;
    target.addEventListener("scroll", measure, { passive: true });
    measure();
    return () => target.removeEventListener("scroll", measure);
  }, [measure]);

  const scrollToBottom = React.useCallback((behavior: ScrollBehavior = "smooth") => {
    stick.current = true;
    setAtBottom(true);
    // rAF: let the just-added bubble lay out before we measure/scroll to it.
    requestAnimationFrame(() => endRef.current?.scrollIntoView({ behavior, block: "end" }));
  }, []);

  const stickToBottom = React.useCallback((behavior: ScrollBehavior = "auto") => {
    if (stick.current) endRef.current?.scrollIntoView({ behavior, block: "end" });
  }, []);

  return { scrollerRef, endRef, atBottom, scrollToBottom, stickToBottom };
}
