# Athar iOS Widgets (WidgetKit) — one-time Xcode setup

كود الودجت جاهز في `AtharWidgets.swift`. جانب التطبيق جاهز بالكامل أيضًا:
`AppDelegate` ينسخ بيانات الودجت إلى App Group ويطلب من WidgetKit التحديث
في كل مرة يغادر المستخدم التطبيق.

المطلوب على جهاز Mac (مرة واحدة، ~10 دقائق):

1. افتح المشروع: `npm run ios:open`
2. File → New → Target… → **Widget Extension**
   - Product Name: `AtharWidgets`
   - أزل علامة "Include Configuration App Intent"
   - Embed in Application: **App**
3. احذف الملفات المولّدة تلقائيًا داخل مجلد الـ target الجديد،
   وأضف بدلًا منها `ios/WidgetExtension/AtharWidgets.swift`
   (Target Membership: `AtharWidgets`).
4. **App Groups**: في تبويب Signing & Capabilities أضف capability باسم
   `App Groups` لكل من target **App** و **AtharWidgets**، وفعّل المجموعة:
   `group.com.athar.adhkar`
   (يجب أن تطابق `AppDelegate.widgetAppGroup`).
5. شغّل التطبيق مرة على الجهاز، افتحه ثم عد للشاشة الرئيسية،
   وأضف ودجت «أثر» — ستظهر مواقيت الصلاة الحية.

## How data flows

```
Web app (prayerWidget.ts)
  → @capacitor/preferences  (UserDefaults.standard, key "CapacitorStorage.noor_widget_prayer_v2")
  → AppDelegate.mirrorWidgetDataToAppGroup()  (on background)
  → UserDefaults(suiteName: "group.com.athar.adhkar")  (raw keys)
  → PrayerProvider.getTimeline()  → WidgetKit renders
```

Payload keys available in the App Group (all JSON strings):

| Key | Content |
|---|---|
| `noor_widget_prayer_v2` | الصلوات الخمس + الصلاة القادمة + سحور/إفطار رمضان |
| `noor_widget_adhkar_v1` | تقدّم أذكار الصباح والمساء |
| `noor_widget_wird_v1` | ورد القرآن اليومي والسورة الحالية |
| `noor_widget_dashboard_v1` | السلسلة (streak) + النقاط + المستوى |

`AtharWidgets.swift` يعرض ودجت المواقيت؛ أضف ودجتات إضافية لنفس الـ bundle
بقراءة بقية المفاتيح بنفس النمط.
