package com.athar.adhkar;

public class NoorPrayerWidgetProvider extends AtharWidgetProvider {
    @Override
    protected AtharWidgetSpec getSpec() {
        return new AtharWidgetSpec(
            R.layout.noor_widget_prayer,
            "الصلاة القادمة",
            new String[] {
                "استعد للصلاة قبل الأذان بدقائق",
                "اللهم اجعل الصلاة قرة عين لنا",
                "حي على الفلاح",
                "الصلاة نور",
                "ثبت قلبك على الصلاة في وقتها"
            },
            "مواقيت الصلاة"
        );
    }
}