package com.athar.adhkar;

public class NoorSunnahWidgetProvider extends AtharWidgetProvider {
    @Override
    protected AtharWidgetSpec getSpec() {
        return new AtharWidgetSpec(
            R.layout.noor_widget_sunnah,
            "سنة مهجورة",
            new String[] {
                "أفشوا السلام بينكم",
                "السواك مطهرة للفم مرضاة للرب",
                "ادع لأخيك بظهر الغيب",
                "ابدأ باليمين في اللباس والطهور",
                "تبسمك في وجه أخيك صدقة"
            },
            "سنن اليوم"
        );
    }
}