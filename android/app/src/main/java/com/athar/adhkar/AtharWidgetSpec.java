package com.athar.adhkar;

public class AtharWidgetSpec {
    public final int layoutId;
    public final String title;
    public final String[] phrases;
    public final String actionLabel;

    public AtharWidgetSpec(int layoutId, String title, String[] phrases, String actionLabel) {
        this.layoutId = layoutId;
        this.title = title;
        this.phrases = phrases;
        this.actionLabel = actionLabel;
    }

    public String resolvePhrase() {
        if (phrases == null || phrases.length == 0) return "اذكر الله";
        int dayIndex = (int) (System.currentTimeMillis() / 86400000L);
        int index = Math.floorMod(dayIndex, phrases.length);
        return phrases[index];
    }
}