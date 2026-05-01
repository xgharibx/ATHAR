package com.athar.adhkar;

public class NoorCompactWidgetProvider extends AtharWidgetProvider {
    @Override
    protected AtharWidgetSpec getSpec() {
        return new AtharWidgetSpec(
            R.layout.noor_widget_compact,
            "ذكر سريع",
            new String[] {
                "سبحان الله",
                "الحمد لله",
                "الله أكبر",
                "لا إله إلا الله",
                "أستغفر الله",
                "لا حول ولا قوة إلا بالله"
            },
            "عد الآن"
        );
    }
}