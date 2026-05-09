package com.athar.adhkar;

public class NoorTasbeehWidgetProvider extends AtharWidgetProvider {
    @Override
    protected AtharWidgetSpec getSpec() {
        return new AtharWidgetSpec(
            R.layout.noor_widget_tasbeeh,
            "سبحة اليوم",
            new String[] {
                "سُبْحَانَ الله — ٣٣ مرة",
                "الحَمْدُ لِلَّه — ٣٣ مرة",
                "لا إِلَهَ إِلَّا الله — ٣٣ مرة",
                "اللهُ أَكْبَر — ٣٣ مرة"
            },
            "افتح السبحة"
        );
    }
}