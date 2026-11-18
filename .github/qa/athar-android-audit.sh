#!/usr/bin/env bash
set -euo pipefail
mkdir -p "$RUNNER_TEMP/android-qa"
adb install android/app/build/outputs/apk/debug/app-debug.apk
adb install -t android/app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk
failed=0
while IFS='|' read -r name route title; do
  log="$RUNNER_TEMP/android-qa/$name.txt"
  adb shell "am instrument -w -r -e class com.athar.adhkar.ReleaseScreenshotCaptureTest -e screenshotRoute '$route' -e screenshotReadyText '$title' -e screenshotName '$name.png' com.athar.adhkar.test/androidx.test.runner.AndroidJUnitRunner" > "$log" || true
  if grep -Fq 'OK (1 test)' "$log"; then
    echo "| $name | Passed |" >> "$GITHUB_STEP_SUMMARY"
  else
    echo "| $name | Failed |" >> "$GITHUB_STEP_SUMMARY"
    cat "$log"
    failed=1
  fi
done <<'SCREENS'
home|/|مواقيت الصلاة
adhkar|/c/evening|أذكار المساء
quran|/quran|القرآن الكريم
mushaf|/mushaf/1|ٱلۡحَمۡدُ
prayer|/prayer-times|مواقيت الصلاة
qibla|/qibla|القبلة
mosques|/mosques|المساجد القريبة
sebha|/sebha|السبحة اليومية
wird|/wird|جدول الورد
muhasaba|/muhasaba|جدول المحاسبة
qadaa|/qadaa|قضاء الفوائت
library|/library|المكتبة الإسلامية
hadith|/hadith|الأحاديث
ijaz|/ijaz|الإعجاز العلمي
companion|/companion|عرّفني على نفسك
reminders|/reminders|تذكيراتي
feedback|/feedback|صوتك يترك أثرًا
SCREENS
adb pull /sdcard/Android/data/com.athar.adhkar/files/release-screenshots/ "$RUNNER_TEMP/android-qa/screenshots" || true
exit "$failed"
