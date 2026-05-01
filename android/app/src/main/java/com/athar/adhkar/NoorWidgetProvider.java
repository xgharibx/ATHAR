package com.athar.adhkar;

public class NoorWidgetProvider extends AtharWidgetProvider {
    @Override
    protected AtharWidgetSpec getSpec() {
        return new AtharWidgetSpec(
            R.layout.noor_widget,
            "أثر اليوم",
            new String[] {
                "سبحان الله وبحمده",
                "اللهم صل وسلم على نبينا محمد",
                "لا إله إلا الله وحده لا شريك له",
                "حسبنا الله ونعم الوكيل",
                "رب اغفر لي وتب علي إنك أنت التواب الرحيم",
                "اللهم أعني على ذكرك وشكرك وحسن عبادتك"
            },
            "افتح الأذكار"
        );
    }
}