"""Patch Phase 53b: PWA manifest enhancements - prefer_related_applications + screenshots."""
path = r'c:\Users\Amrab\Downloads\noor-adhkar\vite.config.ts'
content = open(path, encoding='utf-8').read()

old = '''        shortcuts: [
          {
            name: "أذكار الصباح",
            short_name: "الصباح",
            description: "ابدأ يومك بأذكار الصباح النبوية",
            url: "/c/morning"
          },
          {
            name: "المصحف",
            short_name: "القرآن",
            description: "اقرأ القرآن الكريم مع التفسير والترجمة",
            url: "/quran"
          },
          {
            name: "المفضلة",
            short_name: "المفضلة",
            description: "الأذكار والآيات المحفوظة لديك",
            url: "/favorites"
          }
        ]
      },'''

new = '''        shortcuts: [
          {
            name: "أذكار الصباح",
            short_name: "الصباح",
            description: "ابدأ يومك بأذكار الصباح النبوية",
            url: "/c/morning"
          },
          {
            name: "المصحف",
            short_name: "القرآن",
            description: "اقرأ القرآن الكريم مع التفسير والترجمة",
            url: "/quran"
          },
          {
            name: "المفضلة",
            short_name: "المفضلة",
            description: "الأذكار والآيات المحفوظة لديك",
            url: "/favorites"
          }
        ],
        prefer_related_applications: false,
        screenshots: [
          {
            src: "icons/screenshot-mobile.png",
            sizes: "390x844",
            type: "image/png",
            form_factor: "narrow",
            label: "الشاشة الرئيسية لتطبيق أثر"
          },
          {
            src: "icons/screenshot-desktop.png",
            sizes: "1280x800",
            type: "image/png",
            form_factor: "wide",
            label: "واجهة سطح المكتب لتطبيق أثر"
          }
        ]
      },'''

if old in content:
    content = content.replace(old, new, 1)
    print("vite.config.ts: PATCHED - added prefer_related_applications + screenshots")
else:
    print("vite.config.ts: OLD not found")
open(path, 'w', encoding='utf-8').write(content)
