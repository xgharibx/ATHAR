import * as React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Compass, MapPin, RefreshCw } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

// Mecca coordinates
const MECCA_LAT = 21.4225;
const MECCA_LNG = 39.8262;

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
  supported: boolean;
  permissionGranted: boolean;
};

export function QiblaPage() {
  const navigate = useNavigate();
  const [geo, setGeo] = React.useState<GeoState>({ status: "idle" });
  const [orient, setOrient] = React.useState<OrientationState>({
    heading: null,
    supported: false,
    permissionGranted: false,
  });
  const compassHeadingRef = React.useRef<number | null>(null);
  const [declination, setDeclination] = React.useState<number | null>(null);

  // Fetch magnetic declination from NOAA when coordinates are ready
  const geoOk  = geo.status === "ok";
  const geoLat = geo.status === "ok" ? (geo as { status: "ok"; lat: number; lng: number }).lat : 0;
  const geoLng = geo.status === "ok" ? (geo as { status: "ok"; lat: number; lng: number }).lng : 0;
  React.useEffect(() => {
    if (!geoOk) return;
    fetch(
      `https://www.ngdc.noaa.gov/geomag-web/calculators/calculateDeclination?lat1=${geoLat}&lon1=${geoLng}&key=EAU51&resultFormat=json`,
    )
      .then((r) => r.json() as Promise<{ result: Array<{ declination: number }> }>)
      .then((data) => {
        const d = data.result?.[0]?.declination;
        if (typeof d === "number") setDeclination(d);
      })
      .catch(() => {
        /* silent — falls back to uncorrected bearing */
      });
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

  // Listen to deviceorientation
  React.useEffect(() => {
    const handleOrientation = (e: DeviceOrientationEvent) => {
      // webkitCompassHeading is iOS-specific (degrees from true north, 0 = north, clockwise)
      const w = e as DeviceOrientationEvent & { webkitCompassHeading?: number };
      let heading: number | null = null;
      if (w.webkitCompassHeading != null) {
        heading = w.webkitCompassHeading;
      } else if (e.alpha != null) {
        // Android: alpha is rotation around z-axis, 0 = screen faces north
        // Convert: heading = 360 - alpha (approximately)
        heading = (360 - e.alpha + 360) % 360;
      }
      if (heading != null) {
        compassHeadingRef.current = heading;
        setOrient((o) => ({ ...o, heading, supported: true }));
      }
    };

    globalThis.addEventListener("deviceorientation", handleOrientation, true);
    return () => {
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

  return (
    <div className="p-4 md:p-5 space-y-4 max-w-lg mx-auto" dir="rtl">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Compass size={20} className="text-[var(--accent)]" />
          <h1 className="text-xl font-bold">القبلة</h1>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
          <ArrowRight size={15} />
          رجوع
        </Button>
      </div>

      {/* Compass card */}
      <Card className="p-6 flex flex-col items-center gap-5">
        {/* Compass rose */}
        <div className="relative w-64 h-64">
          {/* Outer ring with cardinal directions */}
          <svg viewBox="0 0 240 240" className="w-full h-full">
            {/* Animated CSS for spinning outer ring */}
            <style>{`@keyframes compassRingSpin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
            {/* Background circle */}
            <circle cx="120" cy="120" r="118" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="2" />
            {/* Slowly spinning outer decorative ring */}
            <g style={{ transformOrigin: "120px 120px", animation: "compassRingSpin 25s linear infinite" }}>
              <circle cx="120" cy="120" r="115" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1.5" strokeDasharray="4 8" />
            </g>
            <circle cx="120" cy="120" r="100" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.06)" strokeWidth="1.5" />
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
                  stroke={major ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.12)"}
                  strokeWidth={major ? 2 : 1}
                />
              );
            })}
            {/* Cardinal labels */}
            {(["ش", "ش.ش", "غ", "ج.ش", "ج", "ج.ج", "ش", "ش.غ"] as const).map((label, i) => {
              const angle = (i * 45 - 90) * Math.PI / 180;
              const r = 72;
              const x = 120 + r * Math.cos(angle);
              const y = 120 + r * Math.sin(angle) + 4;
              return null; // Skip overlapping labels
            })}
            <text x="120" y="38" textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize="13" fontWeight="bold">ش</text>
            <text x="202" y="124" textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="11">ش</text>
            <text x="120" y="210" textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="11">ج</text>
            <text x="38" y="124" textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="11">غ</text>

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
                fill="rgba(255,255,255,0.2)"
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
          <div className="text-center space-y-1">
            <div className="text-3xl font-bold" style={{ color: "var(--accent)" }}>
              {Math.round(qiblaBearing)}°
            </div>
            <div className="text-sm opacity-60">
              اتجاه القبلة · {formatBearing(qiblaBearing)}
            </div>
            {geo.status === "ok" && (
              <div dir="ltr" className="text-[10px] opacity-35 font-mono mt-0.5">
                {(geo as { status: "ok"; lat: number; lng: number }).lat.toFixed(4)}°N,
                {" "}{(geo as { status: "ok"; lat: number; lng: number }).lng.toFixed(4)}°E
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
              <div className="flex items-center justify-center gap-1.5 text-xs text-[var(--accent)] opacity-80 mt-1">
                <span className="w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse" />
                بوصلة نشطة
              </div>
            )}
          </div>
        ) : null}

        {/* Orientation permission */}
        {!orient.permissionGranted && !orient.supported && (
          <Button variant="secondary" size="sm" onClick={() => void requestOrientation()}>
            <Compass size={15} />
            تفعيل البوصلة
          </Button>
        )}
      </Card>

      {/* Location status card */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <MapPin size={16} className="text-[var(--accent)]" />
          <span className="text-sm font-semibold">الموقع الجغرافي</span>
        </div>

        {geo.status === "idle" || geo.status === "loading" ? (
          <div className="flex items-center gap-2 text-sm opacity-60">
            <RefreshCw size={14} className="animate-spin" />
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
              <RefreshCw size={14} />
              إعادة المحاولة
            </Button>
          </div>
        ) : geo.status === "unsupported" ? (
          <div className="text-sm opacity-60">تحديد الموقع غير مدعوم في هذا المتصفح</div>
        ) : (
          <div className="space-y-2 text-sm">
            <div className="flex gap-4">
              <div className="opacity-60">خط العرض</div>
              <div dir="ltr" className="font-mono font-medium">{geo.lat.toFixed(4)}°N</div>
            </div>
            <div className="flex gap-4">
              <div className="opacity-60">خط الطول</div>
              <div dir="ltr" className="font-mono font-medium">{geo.lng.toFixed(4)}°E</div>
            </div>
            <div className="flex gap-4">
              <div className="opacity-60">الدقة</div>
              <div dir="ltr" className="font-mono font-medium">±{Math.round(geo.accuracy)}م</div>
            </div>
            <Button variant="secondary" size="sm" className="mt-2" onClick={requestGeo}>
              <RefreshCw size={13} />
              تحديث الموقع
            </Button>
          </div>
        )}
      </Card>

      {/* Info card */}
      <Card className="p-4 text-sm opacity-70 space-y-1">
        <div className="font-semibold opacity-100 mb-2">كيفية الاستخدام</div>
        <p>١. اضغط "تفعيل البوصلة" إن ظهر الزر (iOS يحتاج إذن)</p>
        <p>٢. الجزء الأحمر من السهم يشير نحو الكعبة المشرفة</p>
        <p>٣. وجِّه جهازك حتى يصبح السهم مستقيماً للأعلى</p>
      </Card>
    </div>
  );
}
