package com.athar.adhkar;

public class NoorTasbeehWidgetProvider extends AtharWidgetProvider {
    @Override
    protected AtharWidgetSpec getSpec() {
        return new AtharWidgetSpec(
            R.layout.noor_widget_tasbeeh,
            "سبحة اليوم",
            new String[] {
                "سبحان الله وبحمده 100 مرة",
                "لا إله إلا الله وحده لا شريك له 100 مرة",
                "أستغفر الله وأتوب إليه 100 مرة",
                "اللهم صل وسلم على نبينا محمد 100 مرة",
                "لا حول ولا قوة إلا بالله 100 مرة"
            },
            "افتح السبحة"
        );
    }
}