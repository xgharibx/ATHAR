/**
 * Helpers for grouping conversation history by recency buckets
 * (today / yesterday / this week / this month / older) and producing
 * preview snippets. Extracted from the Companion page so they're
 * pure & unit-testable.
 */
import type { CompanionConversation } from "@/lib/companionHistory";

export type HistoryGroup = { label: string; key: string; items: CompanionConversation[] };

export type HistoryLayout = {
  pinned: CompanionConversation[];
  groups: HistoryGroup[];
};

function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function groupConversationsByRecency(items: CompanionConversation[]): HistoryLayout {
  const todayStart = startOfDay(Date.now());
  const yesterdayStart = todayStart - 86_400_000;
  const weekStart = todayStart - 6 * 86_400_000;
  const monthStart = todayStart - 29 * 86_400_000;

  const pinned = items
    .filter((c) => c.pinned)
    .sort((a, b) => (b.pinnedAt ?? 0) - (a.pinnedAt ?? 0));

  const buckets: HistoryGroup[] = [
    { label: "اليوم", key: "today", items: [] },
    { label: "الأمس", key: "yesterday", items: [] },
    { label: "هذا الأسبوع", key: "week", items: [] },
    { label: "هذا الشهر", key: "month", items: [] },
    { label: "أقدم", key: "older", items: [] },
  ];
  for (const c of items) {
    if (c.pinned) continue;
    const d = startOfDay(c.updatedAt);
    if (d >= todayStart) buckets[0].items.push(c);
    else if (d >= yesterdayStart) buckets[1].items.push(c);
    else if (d >= weekStart) buckets[2].items.push(c);
    else if (d >= monthStart) buckets[3].items.push(c);
    else buckets[4].items.push(c);
  }
  return {
    pinned,
    groups: buckets.filter((b) => b.items.length > 0),
  };
}

export function previewSnippet(conv: CompanionConversation, max = 90): string {
  const lastAssistant = [...conv.messages].reverse().find((m) => m.role === "assistant");
  const text = (lastAssistant?.content ?? conv.messages[0]?.content ?? "").replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

export function exportConversationText(conv: CompanionConversation): string {
  const header = `محادثة أثر — ${conv.title}\nالتاريخ: ${new Date(conv.createdAt).toLocaleString("ar-EG")}\n\n`;
  const body = conv.messages
    .map((m) => `${m.role === "user" ? "👤 أنت" : "✨ أثر"}:\n${m.content}\n`)
    .join("\n");
  return header + body;
}