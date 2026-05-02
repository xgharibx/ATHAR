/**
 * Islamic Calendar — Hijri events with Gregorian lookups.
 * Each event is defined by its Hijri month + day.
 * Use getNextIslamicEvent() to find the next upcoming event from today.
 */
import { gregorianToHijri } from "@/lib/hijri";

export type IslamicEvent = {
  id: string;
  label: string;
  icon: string;
  hijriMonth: number;
  hijriDay: number;
};

export const ISLAMIC_EVENTS: IslamicEvent[] = [
  { id: "new_year",       label: "رأس السنة الهجرية",        icon: "🌙",  hijriMonth: 1,  hijriDay: 1  },
  { id: "ashura",         label: "يوم عاشوراء",               icon: "🌿",  hijriMonth: 1,  hijriDay: 10 },
  { id: "mawlid",         label: "المولد النبوي الشريف",      icon: "🕌",  hijriMonth: 3,  hijriDay: 12 },
  { id: "isra_miraj",     label: "ليلة الإسراء والمعراج",    icon: "✨",  hijriMonth: 7,  hijriDay: 27 },
  { id: "15_shaban",      label: "ليلة النصف من شعبان",      icon: "🌕",  hijriMonth: 8,  hijriDay: 15 },
  { id: "ramadan_1",      label: "أول رمضان المبارك",         icon: "🌙",  hijriMonth: 9,  hijriDay: 1  },
  { id: "laylat_qadr",    label: "ليلة القدر (٢٧ رمضان)",    icon: "💫",  hijriMonth: 9,  hijriDay: 27 },
  { id: "eid_fitr",       label: "عيد الفطر المبارك",         icon: "🎉",  hijriMonth: 10, hijriDay: 1  },
  { id: "dhul_hijjah_1",  label: "أول أيام ذي الحجة",        icon: "✨",  hijriMonth: 12, hijriDay: 1  },
  { id: "arafat",         label: "يوم عرفة المبارك",          icon: "🤲",  hijriMonth: 12, hijriDay: 9  },
  { id: "eid_adha",       label: "عيد الأضحى المبارك",        icon: "🐑",  hijriMonth: 12, hijriDay: 10 },
];

/**
 * Scan up to maxSearch days forward from today to find the first Gregorian
 * date whose Hijri representation matches targetMonth:targetDay.
 */
function findNextHijriDate(targetMonth: number, targetDay: number, maxSearch = 420): Date | null {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  for (let i = 0; i < maxSearch; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const h = gregorianToHijri(d);
    if (h.month === targetMonth && h.day === targetDay) return d;
  }
  return null;
}

export type UpcomingEvent = {
  event: IslamicEvent;
  daysUntil: number;
  gregorianDate: Date;
};

/** Returns the soonest upcoming Islamic event (today counts as day 0). */
export function getNextIslamicEvent(): UpcomingEvent | null {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let best: UpcomingEvent | null = null;

  for (const event of ISLAMIC_EVENTS) {
    const gDate = findNextHijriDate(event.hijriMonth, event.hijriDay);
    if (!gDate) continue;
    const daysUntil = Math.round((gDate.getTime() - today.getTime()) / 86400000);
    if (!best || daysUntil < best.daysUntil) {
      best = { event, daysUntil, gregorianDate: gDate };
    }
  }
  return best;
}
