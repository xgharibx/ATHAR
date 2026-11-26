import fs from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => fs.readFileSync(path, "utf8");

describe("«السماع» widget on iPhone", () => {
  const widget = read("ios/App/AtharWidgets/AtharListenWidget.swift");
  const shared = read("ios/App/Shared/OpenAtharScreenIntent.swift");
  const plugin = read("ios/App/App/QuranAudioPlugin.swift");

  it("is in the widget bundle, Control Center included, and built into the extension", () => {
    const bundle = read("ios/App/AtharWidgets/AtharWidgets.swift");
    expect(bundle).toContain("AtharListenWidget()");
    expect(bundle).toContain("AtharListenControl()");
    expect(read("ios/App/App.xcodeproj/project.pbxproj")).toContain("AtharListenWidget.swift in Sources");
    expect(widget).toContain(".supportedFamilies([.systemSmall, .systemMedium, .accessoryRectangular, .accessoryCircular])");
  });

  it("runs its buttons in the app's player, without opening the app", () => {
    expect(shared).toContain("struct ListenControlIntent: AudioPlaybackIntent");
    expect(shared).toContain("struct ListenPlayingIntent: SetValueIntent, AudioPlaybackIntent");
    expect(plugin).toContain("AtharListen.handler = { [weak self] action in self?.widgetCommand(action) }");
    // Closed app: the last run of tracks is played again where it stopped.
    expect(plugin).toContain("restoreSaved(action: action)");
    expect(plugin).toContain('if event == "ended" { forgetQueue() } else { saveQueue() }');
  });

  it("moves its bar and clock by itself while a recitation plays", () => {
    expect(widget).toContain("ProgressView(timerInterval: snapshot.startDate...snapshot.endDate, countsDown: false)");
    expect(widget).toContain("Text(snapshot.startDate, style: .timer)");
    expect(plugin).toContain("WidgetCenter.shared.reloadTimelines(ofKind: AtharListen.widgetKind)");
  });

  it("keeps the player's controls left to right, as everywhere in the app", () => {
    expect(widget.match(/\.environment\(\\\.layoutDirection, \.leftToRight\)/g)?.length).toBeGreaterThanOrEqual(3);
  });
});

describe("«السماع» widget on Android", () => {
  const manifest = read("android/app/src/main/AndroidManifest.xml");
  const service = read("android/app/src/main/java/com/athar/adhkar/RecitationService.java");
  const helper = read("android/app/src/main/java/com/athar/adhkar/ListenWidget.java");
  const provider = read("android/app/src/main/java/com/athar/adhkar/NoorListenWidgetProvider.java");
  const layout = read("android/app/src/main/res/layout/widget_listen.xml");

  it("is declared, refreshed with the others, and named in both languages", () => {
    expect(manifest).toContain('android:name=".NoorListenWidgetProvider"');
    expect(manifest).toContain('android:resource="@xml/widget_listen_info"');
    expect(read("android/app/src/main/java/com/athar/adhkar/WidgetUpdater.java")).toContain("NoorListenWidgetProvider.class");
    expect(read("android/app/src/main/res/values/strings.xml")).toContain('name="widget_listen_label"');
    expect(read("android/app/src/main/res/values-ar/strings.xml")).toContain('<string name="widget_listen_label">أثر · السماع</string>');
  });

  it("finds every view it draws in its layout", () => {
    const ids = new Set([...provider.matchAll(/R\.id\.(listen_\w+)/g)].map((m) => m[1]));
    expect(ids.size).toBeGreaterThan(10);
    for (const id of ids) expect(layout).toContain(`android:id="@+id/${id}"`);
  });

  it("sends its buttons to the player service, which can start the last recitation again", () => {
    expect(service).toContain("if (intent != null && ListenWidget.isCommand(intent.getAction()))");
    expect(service).toContain("if (!isSessionAdded(current)) addSession(current);");
    expect(service).toContain("ListenWidget.restore(this, player, action)");
    // Started in the foreground with nothing to play: still never crashes.
    expect(service).toContain("settleWithoutPlaying()");
    expect(helper).toContain("PendingIntent.getForegroundService(context, requestCode, intent, flags)");
  });

  it("uses only views a home-screen widget may hold", () => {
    const allowed = new Set(["FrameLayout", "LinearLayout", "RelativeLayout", "ImageView", "TextView", "Chronometer", "ViewFlipper", "ProgressBar"]);
    const tags = [...layout.matchAll(/<([A-Z][A-Za-z]*)\b/g)].map((m) => m[1]!);
    expect(tags.length).toBeGreaterThan(10);
    for (const tag of tags) expect(allowed.has(tag), tag).toBe(true);
  });

  it("runs the clock in the launcher, and the controls left to right", () => {
    expect(provider).toContain("views.setChronometer(R.id.listen_elapsed, SystemClock.elapsedRealtime() - positionMs, null, true)");
    expect(layout).toContain('android:layoutDirection="ltr"');
  });
});

describe("The app follows a recitation a widget started", () => {
  it("attaches to the native player when it comes back, without starting it again", () => {
    const player = read("src/lib/listen/player.ts");
    const native = read("src/lib/nativeRecitation.ts");
    expect(player).toContain("void adoptNative();");
    expect(player).toContain("await startNative(index, 0, myToken, true)");
    expect(native).toContain("if (!options.attach) await native.play({");
    // Both players say which track they are on.
    expect(read("ios/App/App/QuranAudioPlugin.swift")).toContain('"id": self.verses.indices.contains(self.currentIndex)');
    expect(read("android/app/src/main/java/com/athar/adhkar/QuranAudioPlugin.java")).toContain('data.put("id", item == null ? "" : item.mediaId);');
  });
});
