// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import * as React from "react";
import { MemoryRouter } from "react-router-dom";
import { countWords, planReveal } from "@/lib/companionReveal";
import { ReplyContent } from "@/components/companion/ReplyContent";

const answer = `الصيام يوم الجمعة وحده مكروه عند **جمهور العلماء**.

:::hadith
«لا يصم أحدكم يوم الجمعة إلا يوما قبله أو بعده»
— الراوي: أبو هريرة | المصدر: صحيح البخاري (1985) | الدرجة: صحيح — البخاري
:::

المصادر: [إسلام ويب](https://www.islamweb.net/ar/fatwa/1/)`;

describe("writing an answer onto the screen", () => {
  it("counts words the way they will appear", () => {
    expect(countWords("مكروه عند **جمهور العلماء** [إسلام ويب](https://x.y)")).toBe(6);
  });

  it("paces a short answer at the natural speed and caps a long one", () => {
    const short = planReveal("كلمة ".repeat(20));
    expect(short.step).toBe(34);
    const long = planReveal("كلمة ".repeat(2000));
    expect(long.totalMs).toBeLessThanOrEqual(6500 + 700);
    expect(long.step).toBeGreaterThanOrEqual(3);
  });

  it("gives every word its own place in the writing, in reading order", () => {
    const html = renderToString(React.createElement(MemoryRouter, null, React.createElement(ReplyContent, { text: answer, onNavigate: () => undefined, write: true })));
    expect(html).toContain('class="ai-reveal"');
    const times = Array.from(html.matchAll(/data-at="(\d+)"/g)).map((match) => Number(match[1]));
    expect(times.length).toBeGreaterThan(15);
    // Prose first, then the card's words: the writing never goes backwards.
    expect([...times].sort((a, b) => a - b)).toEqual(times);
    // The card unfolds and the sources arrive within the plan.
    expect(html).toMatch(/class="relative my-2.5 overflow-hidden rounded-2xl border rc"/);
    expect(html).toMatch(/class="[^"]*rf[^"]*"[^>]*>المصادر:/);
  });

  it("shows an answer from the history as it is, with nothing to animate", () => {
    const html = renderToString(React.createElement(MemoryRouter, null, React.createElement(ReplyContent, { text: answer, onNavigate: () => undefined })));
    expect(html).not.toContain("ai-reveal");
    expect(html).not.toContain("data-at");
    expect(html).toContain("لا يصم أحدكم يوم الجمعة");
  });
});
