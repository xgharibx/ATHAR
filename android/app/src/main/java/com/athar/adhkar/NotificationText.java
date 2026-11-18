package com.athar.adhkar;

/** Wording shared by the notifications the phone posts by itself. */
final class NotificationText {
    private NotificationText() {}

    private static final char[] ARABIC_DIGITS = { '٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩' };

    /** "04:32" → "٤:٣٢ ص", "19:05" → "٧:٠٥ م" (src/lib/notificationStyle.ts formats the same way). */
    static String time(String hhmm) {
        if (hhmm == null || hhmm.length() < 4) return "";
        try {
            String[] parts = hhmm.trim().split(":");
            int hour = Integer.parseInt(parts[0]);
            int minute = Integer.parseInt(parts[1].substring(0, 2));
            String period = hour < 12 ? "ص" : "م";
            int twelve = hour % 12 == 0 ? 12 : hour % 12;
            return arabicDigits(twelve + ":" + (minute < 10 ? "0" : "") + minute) + " " + period;
        } catch (RuntimeException e) {
            return "";
        }
    }

    static String arabicDigits(String text) {
        StringBuilder out = new StringBuilder(text.length());
        for (char c : text.toCharArray()) out.append(c >= '0' && c <= '9' ? ARABIC_DIGITS[c - '0'] : c);
        return out.toString();
    }

    /** A template's "{time}" filled in. */
    static String withTime(String text, String hhmm) {
        return text == null ? null : text.replace("{time}", time(hhmm));
    }
}
