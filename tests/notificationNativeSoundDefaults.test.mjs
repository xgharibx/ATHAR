import { execFileSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";

it("honors explicit silence and vibration before Android notification channels", () => {
  const repo = fileURLToPath(new URL("../", import.meta.url));
  const fixture = mkdtempSync(path.join(tmpdir(), "athar-native-audio-"));
  try {
    const plugin = path.join(fixture, "node_modules/@capacitor/local-notifications/android");
    cpSync(path.join(repo, "node_modules/@capacitor/local-notifications/android"), plugin, { recursive: true });
    const script = path.join(fixture, "tools/scripts/patch-capacitor-plugins.mjs");
    mkdirSync(path.dirname(script), { recursive: true });
    cpSync(path.join(repo, "tools/scripts/patch-capacitor-plugins.mjs"), script);
    execFileSync(process.execPath, [script]);
    // Exercise the patched production Java with small Android API doubles.
    const java = path.join(plugin, "src/main/java/com/capacitorjs/plugins/localnotifications");
    const input = readFileSync(path.join(java, "LocalNotification.java"), "utf8");
    const getSound = input.slice(input.indexOf("    public String getSound("), input.indexOf("    public void setSound("));
    const manager = readFileSync(path.join(java, "LocalNotificationManager.java"), "utf8");
    const audio = manager.slice(manager.indexOf("        String sound = localNotification.getSound("), manager.indexOf("        String group = localNotification.getGroup();"));
    const alertOnceStart = manager.indexOf("        mBuilder.setOnlyAlertOnce(");
    const alertOnce = manager.slice(alertOnceStart, manager.indexOf("\n", alertOnceStart));
    const probe = path.join(fixture, "AudioProbe.java");
    writeFileSync(probe, `
class AudioProbe {
  static class Notification { static final int DEFAULT_SOUND=1, DEFAULT_VIBRATE=2, DEFAULT_LIGHTS=4, DEFAULT_ALL=-1; }
  static class Uri { String value; Uri(String s){ value=s; } static Uri parse(String s){return new Uri(s);} public String toString(){return value;} }
  static class Intent { static final int FLAG_GRANT_READ_URI_PERMISSION=1; }
  static class ContentResolver { static final String SCHEME_ANDROID_RESOURCE="android.resource"; }
  static class Context { String getPackageName(){return "test";} void grantUriPermission(String p, Uri u, int f){} }
  static class AssetUtil { static final int RESOURCE_ID_ZERO_VALUE=0; static String getResourceBaseName(String s){return s;} static int getResourceID(Context c,String s,String t){return "birds.mp3".equals(s)?1:0;} }
  static class JSObject { Boolean vibration; JSObject(Boolean v){vibration=v;} Boolean getBool(String k){return vibration;} }
  static class LocalNotification { String sound; JSObject extra; LocalNotification(String s, Boolean v){sound=s;extra=new JSObject(v);} JSObject getExtra(){return extra;}
${getSound}
  }
  static class Builder { Uri sound; int defaults; boolean alertOnce; void setSound(Uri s){sound=s;} void setDefaults(int d){defaults=d;} void setOnlyAlertOnce(boolean b){alertOnce=b;} }
  static int getDefaultSound(Context c){return 0;}
  static String check(String s, Boolean v){Context context=new Context(); LocalNotification localNotification=new LocalNotification(s,v); Builder mBuilder=new Builder();
${audio}
${alertOnce}
    return mBuilder.sound+"|"+mBuilder.defaults+"|"+mBuilder.alertOnce;
  }
  public static void main(String[] args){System.out.print(check("",true)+";"+check("",false)+";"+check("birds.mp3",true)+";"+check("birds.mp3",false)+";"+check(null,true));}
}`);
    execFileSync("javac", ["-d", fixture, probe]);
    const result = execFileSync("java", ["-cp", fixture, "AudioProbe"], { encoding: "utf8" });
    expect(result).toBe("null|6|true;null|4|true;android.resource://test/1|6|false;android.resource://test/1|4|false;null|7|false");
    execFileSync(process.execPath, [script]);
  } finally {
    if (path.dirname(path.resolve(fixture)) !== path.resolve(tmpdir())) throw new Error("Fixture outside temp directory");
    rmSync(fixture, { recursive: true, force: true });
  }
}, 30_000);
