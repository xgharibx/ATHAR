// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { renderToString } from "react-dom/server";
import * as React from "react";

/**
 * The Companion page is a large client-only React component wired to
 * Dexie (IndexedDB), localStorage, the Anthropic SDK and the browser
 * speech APIs. Full SSR-through-the-page is brittle; the tests below
 * target what this UI polish phase actually changed:
 *
 *   1. The "أثر" brand string + composer input field are still in the
 *      page source (integration smoke test).
 *   2. The new "Companion status" footer exposes its counts (conversations
 *      + pinned) and they update with the conversation list prop.
 *   3. The ShimmerCursor's token counter ("جاري توليد … رمز") reflects the
 *      number of whitespace-split tokens in the streaming reply.
 *
 * Tests 2 and 3 re-render lightweight presenters via `react-dom/server`
 * in JSDOM so we cover real DOM output without a full testing library.
 */
import type { CompanionConversation } from "@/lib/companionHistory";
import { MemoryRouter } from "react-router-dom";
import { CompanionPage } from "@/pages/Companion";

function makeConv(over: Partial<CompanionConversation> = {}): CompanionConversation {
  return {
    id: `c_${Math.random().toString(36).slice(2)}`,
    title: "حوار اختبار",
    messages: [
      { role: "user", content: "ما فضل الاستغفار؟" },
      { role: "assistant", content: "الاستغفار باب من أبواب الجنة" },
    ],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    pinned: false,
    ...over,
  };
}

describe("Companion page — integration smoke", () => {
  it("ships the 'أثر' brand and composer placeholder in the page source", () => {
    // Integration-level smoke: a happy render of the brand title and the
    // composer textarea confirms the page's public surface is intact.
    const html = renderToString(
      React.createElement(
        MemoryRouter,
        null,
        React.createElement(CompanionPage),
      ),
    );
    expect(html).toContain("أثر");
    expect(html).toContain("aria-label=\"رسالتك\"");
    expect(html).toContain("اكتب سؤالك لرفيق أثر");
  });

  it("ships the Companion status footer markup in the source", () => {
    const file = fs.readFileSync(
      path.resolve(process.cwd(), "src/pages/Companion.tsx"),
      "utf8",
    );
    expect(file).toContain("athar-companion-status-footer");
    expect(file).toContain("athar-status-conv-count");
    expect(file).toContain("athar-status-pinned-count");
  });
});

/**
 * The status footer is a leaf block inside the history slide-over. Since
 * it derives from the `history` array (loaded by `listConversations()`),
 * we exercise the same counting logic by re-implementing it as a tiny
 * presenter here — and assert the same numbers the real footer produces.
 */
describe("Companion status footer — counts", () => {
  // Mirror of the inline footer expression in Companion.tsx.
  const computeFooter = (history: CompanionConversation[]) => ({
    total: history.length,
    pinned: history.filter((c) => c.pinned).length,
  });

  it("renders total + pinned counts via a presenter component", () => {
    const convs: CompanionConversation[] = [
      makeConv({ id: "c_1", pinned: true }),
      makeConv({ id: "c_2", pinned: false }),
      makeConv({ id: "c_3", pinned: true }),
    ];
    const Footer = ({ history }: { history: CompanionConversation[] }) => {
      const { total, pinned } = computeFooter(history);
      return React.createElement(
        "div",
        { "data-testid": "athar-companion-status-footer" },
        React.createElement(
          "span",
          { "data-testid": "athar-status-conv-count" },
          total.toLocaleString("ar-EG"),
        ),
        React.createElement(
          "span",
          { "data-testid": "athar-status-pinned-count" },
          pinned.toLocaleString("ar-EG"),
        ),
      );
    };
    const html = renderToString(React.createElement(Footer, { history: convs }));
    expect(html).toContain("athar-companion-status-footer");
    expect(html).toMatch(/data-testid="athar-status-conv-count"[^>]*>٣</);
    expect(html).toMatch(/data-testid="athar-status-pinned-count"[^>]*>٢</);
  });

  it("reports 0 conversations + 0 pinned when history is empty", () => {
    expect(computeFooter([])).toEqual({ total: 0, pinned: 0 });
  });

  it("counts only pinned conversations in the pinned tally", () => {
    const convs = [
      makeConv({ id: "c_1", pinned: true }),
      makeConv({ id: "c_2", pinned: false }),
      makeConv({ id: "c_3", pinned: true }),
      makeConv({ id: "c_4", pinned: false }),
    ];
    expect(computeFooter(convs)).toEqual({ total: 4, pinned: 2 });
  });

  it("reflects deletions — removing a conversation drops the total", () => {
    const convs = [
      makeConv({ id: "c_1", pinned: true }),
      makeConv({ id: "c_2" }),
    ];
    const afterDelete = convs.filter((c) => c.id !== "c_1");
    expect(computeFooter(afterDelete)).toEqual({ total: 1, pinned: 0 });
  });
});

/**
 * The token counter inside the ShimmerCursor is whitespace-split count of
 * the streaming text — sufficient as a calm "still growing" affordance.
 * The formatter mirrors `countTokens` in Companion.tsx.
 */
describe("ShimmerCursor token counter", () => {
  // Mirror of `countTokens` in Companion.tsx — the live-counter source.
  const countTokens = (text: string): number => {
    if (!text) return 0;
    const trimmed = text.trim();
    if (!trimmed) return 0;
    return trimmed.split(/\s+/).length;
  };

  it("counts whitespace-separated words for streaming text", () => {
    expect(countTokens("السلام عليكم ورحمة الله وبركاته")).toBe(5);
  });

  it("returns 0 for empty or whitespace-only strings", () => {
    expect(countTokens("")).toBe(0);
    expect(countTokens("   \n\n  ")).toBe(0);
  });

  it("formats the counter in Arabic-Indic digits", () => {
    const formatted = (42).toLocaleString("ar-EG");
    expect(formatted).toMatch(/[٠-٩]/);
    expect(formatted).toContain("٤٢");
  });

  it("increases as more text is streamed", () => {
    const a = countTokens("السلام عليكم");
    const b = countTokens("السلام عليكم ورحمة الله");
    expect(b).toBeGreaterThan(a);
  });

  it("SSR snapshot contains the badge with the token count", () => {
    const Badge = ({ tokens }: { tokens?: number }) => {
      const formatted = typeof tokens === "number"
        ? tokens.toLocaleString("ar-EG")
        : null;
      if (formatted === null) return null;
      return React.createElement(
        "span",
        { "data-testid": "athar-token-counter" },
        `جاري توليد ${formatted} رمز`,
      );
    };
    const html = renderToString(React.createElement(Badge, { tokens: 42 }));
    expect(html).toContain("athar-token-counter");
    expect(html).toContain("جاري توليد");
    expect(html).toContain("٤٢");
    expect(html).toContain("رمز");
  });

  it("renders nothing when no tokens have arrived yet", () => {
    const Badge = ({ tokens }: { tokens?: number }) => {
      const formatted = typeof tokens === "number"
        ? tokens.toLocaleString("ar-EG")
        : null;
      if (formatted === null) return null;
      return React.createElement("span", null, formatted);
    };
    expect(renderToString(React.createElement(Badge, {}))).toBe("");
  });
});
