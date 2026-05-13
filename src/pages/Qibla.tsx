import * as React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Compass, MapPin, RefreshCw, Share2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

// Mecca coordinates
const MECCA_LAT = 21.4225;
const MECCA_LNG = 39.8262;
const DECLINATION_CACHE_TTL = 24 * 60 * 60 * 1000;
const COMPASS_ACCURACY_WARN_AT = 15;
const HEADING_SMOOTHING = 0.28;

function toRad(deg: number) {
  return (deg * Math.PI) / 180;
}

function calcQiblaBearing(userLat: number, userLng: number): number {
  const lat1 = toRad(userLat);
  const lat2 = toRad(MECCA_LAT);
  const dLng = toRad(MECCA_LNG - userLng);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  const bearing = (Math.atan2(y, x) * 180) / Math.PI;
  return ((bearing % 360) + 360) % 360;
}

function normalizeDegrees(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

function smoothHeading(prev: number | null, next: number): number {
  if (prev == null) return normalizeDegrees(next);
  const delta = ((next - prev + 540) % 360) - 180;
  return normalizeDegrees(prev + delta * HEADING_SMOOTHING);
}

function declinationCacheKey(lat: number, lng: number) {
  return `athar:qibla:declination:${lat.toFixed(2)}:${lng.toFixed(2)}`;
}

function readCachedDeclination(lat: number, lng: number): number | null {
  try {
    const raw = localStorage.getItem(declinationCacheKey(lat, lng));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { value?: unknown; savedAt?: unknown };
    if (typeof parsed.value !== "number" || typeof parsed.savedAt !== "number") return null;
    if (Date.now() - parsed.savedAt > DECLINATION_CACHE_TTL) return null;
    return parsed.value;
  } catch {
    return null;
  }
}

function writeCachedDeclination(lat: number, lng: number, value: number) {
  try {
    localStorage.setItem(declinationCacheKey(lat, lng), JSON.stringify({ value, savedAt: Date.now() }));
  } catch {
    // Storage can be unavailable; the live value is still usable for this session.
  }
}

function formatBearing(deg: number) {
  const dirs = ["شمال", "شمال شرق", "شرق", "جنوب شرق", "جنوب", "جنوب غرب", "غرب", "شمال غرب"];
  const idx = Math.round(deg / 45) % 8;
  return dirs[idx] ?? "شمال";
}

type GeoState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ok"; lat: number; lng: number; accuracy: number }
  | { status: "error"; msg: string }
  | { status: "unsupported" };

type OrientationState = {
  heading: number | null; // degrees true north
  accuracy: number | null;
  supported: boolean;
  permissionGranted: boolean;
};

export function QiblaPage() {
  const navigate = useNavigate();
  const [geo, setGeo] = React.useState<GeoState>({ status: "idle" });
  const [orient, setOrient] = React.useState<OrientationState>({
    heading: null,
    accuracy: null,
    supported: false,
    permissionGranted: false,
  });
  const compassHeadingRef = React.useRef<number | null>(null);
  const [declination, setDeclination] = React.useState<number | null>(null);

  // Fetch magnetic declination from NOAA when coordinates are ready
  const geoOk  = geo.status === "ok";
  const geoLat = geo.status === "ok" ? geo.lat : 0;
  const geoLng = geo.status === "ok" ? geo.lng : 0;
  React.useEffect(() => {
    if (!geoOk) return;
    const cachedDeclination = readCachedDeclination(geoLat, geoLng);
    if (cachedDeclination != null) setDeclination(cachedDeclination);
    let active = true;
    fetch(
      `https://www.ngdc.noaa.gov/geomag-web/calculators/calculateDeclination?lat1=${geoLat}&lon1=${geoLng}&key=EAU51&resultFormat=json`,
    )
      .then((r) => r.json() as Promise<{ result: Array<{ declination: number }> }>)
      .then((data) => {
        const d = data.result?.[0]?.declination;
        if (typeof d === "number" && active) {
          setDeclination(d);
          writeCachedDeclination(geoLat, geoLng, d);
        }
      })
      .catch(() => {
        /* silent — falls back to uncorrected bearing */
      });
    return () => {
      active = false;
    };
  }, [geoOk, geoLat, geoLng]);

  // Request geolocation
  const requestGeo = React.useCallback(() => {
    if (!navigator.geolocation) {
      setGeo({ status: "unsupported" });
      return;
    }
    setGeo({ status: "loading" });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeo({
          status: "ok",
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
      },
      (err) => {
        setGeo({ status: "error", msg: err.message });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  // Auto-request geo on mount
  React.useEffect(() => {
    requestGeo();
  }, [requestGeo]);

  // On Android / non-iOS, deviceorientation fires without any permission prompt.
  // Pre-grant permissionGranted so the button never shows and the listener works immediately.
  React.useEffect(() => {
    const w = globalThis as typeof globalThis & {
      DeviceOrientationEvent?: { requestPermission?: () => Promise<string> };
    };
    if (typeof w.DeviceOrientationEvent?.requestPermission !== "function") {
      setOrient((o) => ({ ...o, permissionGranted: true }));
    }
  }, []);

  // Request device orientation
  const requestOrientation = React.useCallback(async () => {
    const w = globalThis as typeof globalThis & {
      DeviceOrientationEvent?: {
        requestPermission?: () => Promise<string>;
      };
    };
    // iOS 13+ requires permission
    if (typeof w.DeviceOrientationEvent?.requestPermission === "function") {
      try {
        const perm = await w.DeviceOrientationEvent.requestPermission();
        if (perm !== "granted") {
          setOrient((o) => ({ ...o, permissionGranted: false }));
          return;
        }
        setOrient((o) => ({ ...o, permissionGranted: true }));
      } catch {
        setOrient((o) => ({ ...o, permissionGranted: false }));
        return;
      }
    } else {
      setOrient((o) => ({ ...o, permissionGranted: true }));
    }
  }, []);

  // Listen to device orientation — cross-platform compass strategy:
  //   • deviceorientationabsolute (Chrome/Android): alpha = CW degrees from North → heading = alpha
  //   • deviceorientation + webkitCompassHeading (iOS): already CW from North
  //   • Non-absolute alpha without webkitCompassHeading: IGNORED (relative to initial, not useful)
  React.useEffect(() => {
    const gotAbsolute = { current: false };

    const handleAbsolute = (e: DeviceOrientationEvent) => {
      if (e.alpha == null) return;
      gotAbsolute.current = true;
      // Chrome deviceorientationabsolute: alpha is clockwise compass bearing from magnetic North
      const heading = ((e.alpha % 360) + 360) % 360;
      const smoothed = smoothHeading(compassHeadingRef.current, heading);
      compassHeadingRef.current = smoothed;
      setOrient((o) => ({ ...o, heading: smoothed, accuracy: null, supported: true }));
    };

    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (gotAbsolute.current) return; // absolute events take priority
      const w = e as DeviceOrientationEvent & { webkitCompassHeading?: number; webkitCompassAccuracy?: number };
      let heading: number | null = null;
      let accuracy: number | null = null;
      if (w.webkitCompassHeading != null) {
        // iOS: webkitCompassHeading is CW degrees from True North
        heading = w.webkitCompassHeading;
        accuracy = typeof w.webkitCompassAccuracy === "number" ? Math.abs(w.webkitCompassAccuracy) : null;
      }
      // Non-absolute alpha without webkitCompassHeading is relative — skip it
      if (heading == null) return;
      const smoothed = smoothHeading(compassHeadingRef.current, heading);
      compassHeadingRef.current = smoothed;
      setOrient((o) => ({ ...o, heading: smoothed, accuracy, supported: true }));
    };

    globalThis.addEventListener("deviceorientationabsolute", handleAbsolute, true);
    globalThis.addEventListener("deviceorientation", handleOrientation, true);
    return () => {
      globalThis.removeEventListener("deviceorientationabsolute", handleAbsolute, true);
      globalThis.removeEventListener("deviceorientation", handleOrientation, true);
    };
  }, []);

  const qiblaBearing =
    geo.status === "ok" ? calcQiblaBearing(geo.lat, geo.lng) : null;

  // Compass needle rotation: needle points to qibla direction
  // Apply magnetic declination correction when available:
  //   True heading = Magnetic heading + Declination
  //   needle = (qiblaBearing_true - trueHeading + 360) % 360
  //          = (qiblaBearing - compassHeading - declination + 720) % 360
  const needleRotation = React.useMemo(() => {
    if (qiblaBearing == null) return 0;
    const heading = orient.heading;
    const dec = declination ?? 0;
    if (heading == null) return qiblaBearing; // Static true bearing
    return ((qiblaBearing - heading - dec) % 360 + 360) % 360;
  }, [qiblaBearing, orient.heading, declination]);

  const hasOrientation = orient.supported && orient.heading != null;
  const compassAccuracy = orient.accuracy;
  const hasPoorCompassAccuracy = compassAccuracy != null && compassAccuracy > COMPASS_ACCURACY_WARN_AT;

  return (
    <div className="p-4 md:p-5 space-y-4 max-w-lg mx-auto" dir="rtl">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Compass size={20} aria-hidden="true" className="text-[var(--accent)]" />
          <h1 className="text-xl font-bold">القبلة</h1>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
          <ArrowRight size={15} aria-hidden="true" />
          رجوع
        </Button>
      </div>

      {/* Compass card */}
      <Card className="p-6 flex flex-col items-center gap-5">
        {/* Compass rose */}
        <div className="relative w-64 h-64">
          {/* Outer ring with cardinal directions */}
          <svg viewBox="0 0 240 240" className="w-full h-full" aria-hidden="true">
            {/* Animated CSS for spinning outer ring */}
            <style>{`@keyframes compassRingSpin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
            {/* Background circle */}
            <circle cx="120" cy="120" r="118" fill="none" stroke="var(--stroke)" strokeWidth="2" />
            {/* Slowly spinning outer decorative ring */}
            <g style={{ transformOrigin: "120px 120px", animation: "compassRingSpin 25s linear infinite" }}>
              <circle cx="120" cy="120" r="115" fill="none" stroke="var(--stroke)" strokeWidth="1.5" strokeDasharray="4 8" />
            </g>
            <circle cx="120" cy="120" r="100" fill="var(--card)" stroke="var(--stroke)" strokeWidth="1.5" />
            {/* Tick marks */}
            {Array.from({ length: 36 }, (_, i) => {
              const angle = i * 10;
              const rad = (angle - 90) * Math.PI / 180;
              const major = angle % 90 === 0;
              const med = angle % 45 === 0;
              const r1 = major ? 82 : med ? 86 : 90;
              const r2 = 96;
              return (
                <line
                  key={i}
                  x1={120 + r1 * Math.cos(rad)}
                  y1={120 + r1 * Math.sin(rad)}
                  x2={120 + r2 * Math.cos(rad)}
                  y2={120 + r2 * Math.sin(rad)}
                  stroke={major ? "var(--muted)" : "var(--stroke)"}
                  strokeWidth={major ? 2 : 1}
                />
              );
            })}
            {/* Cardinal labels */}
            <text x="120" y="38" textAnchor="middle" fill="var(--muted)" fontSize="13" fontWeight="bold">ش</text>
            <text x="202" y="124" textAnchor="middle" fill="var(--muted-2)" fontSize="11">ق</text>
            <text x="120" y="210" textAnchor="middle" fill="var(--muted-2)" fontSize="11">ج</text>
            <text x="38" y="124" textAnchor="middle" fill="var(--muted-2)" fontSize="11">غ</text>

            {/* Qibla needle — animated */}
            <g
              transform={`rotate(${needleRotation}, 120, 120)`}
              style={{ transition: hasOrientation ? "transform 0.3s ease-out" : "none" }}
            >
              {/* Kaaba icon at tip */}
              <polygon
                points="120,28 113,80 127,80"
                fill="var(--accent)"
                opacity="0.95"
              />
              <polygon
                points="120,212 113,160 127,160"
                fill="var(--card-2)"
              />
              {/* Center dot */}
              <circle cx="120" cy="120" r="6" fill="var(--accent)" />
              <circle cx="120" cy="120" r="3" fill="white" opacity="0.8" />

              {/* Kaaba symbol at needle tip */}
              <rect x="112" y="14" width="16" height="12" rx="2" fill="var(--accent)" />
              <rect x="114" y="16" width="12" height="8" rx="1" fill="rgba(0,0,0,0.3)" />
            </g>
          </svg>
        </div>

        {/* Bearing info */}
        {qiblaBearing != null ? (
          <div className="text-center space-y-1" aria-live="polite" aria-atomic="true">
            <div className="text-3xl font-bold" style={{ color: "var(--accent)" }}>
              {Math.round(qiblaBearing)}°
            </div>
            <div className="text-sm opacity-60">
              اتجاه القبلة · {formatBearing(qiblaBearing)}
            </div>
            {geo.status === "ok" && (
              <div dir="ltr" className="text-[10px] opacity-35 font-mono mt-0.5">
                {(geo as { status: "ok"; lat: number; lng: number }).lat >= 0 ? (geo as { status: "ok"; lat: number; lng: number }).lat.toFixed(4) + "°N" : Math.abs((geo as { status: "ok"; lat: number; lng: number }).lat).toFixed(4) + "°S"},
                {" "}{(geo as { status: "ok"; lat: number; lng: number }).lng >= 0 ? (geo as { status: "ok"; lat: number; lng: number }).lng.toFixed(4) + "°E" : Math.abs((geo as { status: "ok"; lat: number; lng: number }).lng).toFixed(4) + "°W"}
                {declination != null && (
                  <span className="ml-2 opacity-80">D={declination > 0 ? "+" : ""}{declination.toFixed(1)}°</span>
                )}
              </div>
            )}
            {declination != null && Math.abs(declination) >= 0.3 && (
              <div className="text-[10px] opacity-50 mt-0.5">انحراف مغناطيسي: {declination > 0 ? "+" : ""}{declination.toFixed(1)}° (مُصحَّح)</div>
            )}
            {!hasOrientation && (
              <div className="text-xs opacity-40 mt-2">
                السهم يشير إلى اتجاه القبلة الثابت (لا يوجد بوصلة نشطة)
              </div>
            )}
            {hasOrientation && (
              <div className="flex flex-col items-center gap-1 text-xs text-[var(--accent)] opacity-80 mt-1">
                <div className="flex items-center justify-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse" aria-hidden="true" />
                  بوصلة نشطة
                </div>
                {compassAccuracy != null && (
                  <div className={cn("text-[11px]", hasPoorCompassAccuracy ? "text-[var(--danger)] opacity-90" : "opacity-65")}>
                    دقة البوصلة ±{Math.round(compassAccuracy)}°
                    {hasPoorCompassAccuracy ? " · حرّك الجهاز بعيداً عن المعادن" : ""}
                  </div>
                )}
              </div>
            )}
            <button
              type="button"
              onClick={async () => {
                const dir = formatBearing(qiblaBearing);
                const text = `اتجاه القبلة من موقعي: ${Math.round(qiblaBearing)}° (${dir})`;
                if (navigator.share) { await navigator.share({ text }).catch(() => {}); }
                else { try { await navigator.clipboard.writeText(text); toast.success("تم النسخ"); } catch { toast.error("تعذّر النسخ"); } }
              }}
              aria-label="مشاركة اتجاه القبلة"
              className="mt-2 flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full opacity-60 hover:opacity-90 transition"
              style={{ background: "var(--card)", border: "1px solid var(--stroke)", color: "var(--fg)" }}
            >
              <Share2 size={13} aria-hidden="true" />
              مشاركة الاتجاه
            </button>
          </div>
        ) : null}

        {/* Orientation permission */}
        {!orient.permissionGranted && !orient.supported && (
          <Button variant="secondary" size="sm" onClick={() => void requestOrientation()}>
            <Compass size={15} aria-hidden="true" />
            تفعيل البوصلة
          </Button>
        )}
      </Card>

      {/* Location status card */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <MapPin size={16} aria-hidden="true" className="text-[var(--accent)]" />
          <span className="text-sm font-semibold">الموقع الجغرافي</span>
        </div>

        {geo.status === "idle" || geo.status === "loading" ? (
          <div className="flex items-center gap-2 text-sm opacity-60" role="status" aria-label="جارٍ تحديد موقعك">
            <RefreshCw size={14} aria-hidden="true" className="animate-spin" />
            جارٍ تحديد موقعك...
          </div>
        ) : geo.status === "error" ? (
          <div className="space-y-3">
            <div className="text-sm opacity-60">
              {geo.msg.includes("denied") || geo.msg.includes("User denied")
                ? "رفضت الإذن بالوصول للموقع. يرجى السماح للتطبيق بتحديد موقعك من الإعدادات."
                : geo.msg.includes("unavailable")
                ? "تعذر تحديد موقعك. تأكد من تفعيل خدمة الموقع."
                : geo.msg.includes("timeout")
                ? "انتهت مهلة تحديد الموقع. يرجى المحاولة مجدداً."
                : "تعذر تحديد موقعك الجغرافي."}
            </div>
            <Button variant="secondary" size="sm" onClick={requestGeo}>
              <RefreshCw size={14} aria-hidden="true" />
              إعادة المحاولة
            </Button>
          </div>
        ) : geo.status === "unsupported" ? (
          <div className="text-sm opacity-60">تحديد الموقع غير مدعوم في هذا المتصفح</div>
        ) : (
          <div className="space-y-2 text-sm">
            <div className="flex gap-4">
              <div className="opacity-60">خط العرض</div>
              <div dir="ltr" className="font-mono font-medium">{Math.abs(geo.lat).toFixed(4)}°{geo.lat >= 0 ? "N" : "S"}</div>
            </div>
            <div className="flex gap-4">
              <div className="opacity-60">خط الطول</div>
              <div dir="ltr" className="font-mono font-medium">{Math.abs(geo.lng).toFixed(4)}°{geo.lng >= 0 ? "E" : "W"}</div>
            </div>
            <div className="flex gap-4">
              <div className="opacity-60">الدقة</div>
              <div dir="ltr" className="font-mono font-medium">±{Math.round(geo.accuracy)}م</div>
            </div>
            <Button variant="secondary" size="sm" className="mt-2" onClick={requestGeo}>
              <RefreshCw size={13} aria-hidden="true" />
              تحديث الموقع
            </Button>
          </div>
        )}
      </Card>

      {/* Info card */}
      <Card className="p-4 text-sm opacity-70 space-y-1">
        <div className="font-semibold opacity-100 mb-2">كيفية الاستخدام</div>
        <p>١. امسك الجهاز أفقياً (موازياً للأرض) للحصول على أدق النتائج</p>
        <p>٢. اضغط "تفعيل البوصلة" إن ظهر الزر (iOS يحتاج إذن صريح)</p>
        <p>٣. رأس السهم يشير نحو الكعبة المشرفة</p>
        <p>٤. دوِّر الجهاز حتى يصبح السهم مستقيماً للأعلى — فأنت تواجه القبلة</p>
        <p>٥. إن كانت الدقة ضعيفة، حرّك الجهاز على شكل رقم ٨ لمعايرة البوصلة</p>
      </Card>
    </div>
  );
}
