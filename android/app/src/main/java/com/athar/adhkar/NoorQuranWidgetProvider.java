package com.athar.adhkar;

public class NoorQuranWidgetProvider extends AtharWidgetProvider {
    @Override
    protected AtharWidgetSpec getSpec() {
        return new AtharWidgetSpec(
            R.layout.noor_widget_quran,
            "ورد القرآن",
            new String[] {
                "اقرأ صفحة واحدة بتدبر",
                "راجع آخر موضع وصلت إليه",
                "خمس آيات بخشوع تكفي للبداية",
                "اجعل وردك قبل الانشغال",
                "استمع للآيات ثم كررها للحفظ"
            },
            "افتح المصحف"
        );
    }
}