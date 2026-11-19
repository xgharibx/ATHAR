import * as React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Compass, MapPin, RefreshCw, Share2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { nextAlignment, useCompassHeading } from "@/hooks/useCompassHeading";
import { readCachedPrayerCoordinates } from "@/lib/prayerLocation";
import { vibrate } from "@/lib/haptics";
import { useNoorStore } from "@/store/noorStore";
import { deviceLocationSupported, getDeviceLocation, type DeviceLocationError } from "@/lib/deviceLocation";
import { shareOrCopy } from "@/lib/shareTargets";

// Kaaba coordinates (Adhan.js authoritative values)
const MECCA_LAT = 21.4225241;
const MECCA_LNG = 39.8261818;
const COMPASS_ACCURACY_WARN_AT = 15;

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
  /** `accuracy` is in metres for a fresh GPS fix, null for the location saved for prayer times. */
  | { status: "ok"; lat: number; lng: number; accuracy: number | null }
  | { status: "error"; code: number; msg: string }
  | { status: "unsupported" };

/** Start from the location already saved for prayer times, so the needle points at once. */
function initialGeo(): GeoState {
  const saved = readCachedPrayerCoordinates();
  return saved ? { status: "ok", lat: saved.lat, lng: saved.lng, accuracy: null } : { status: "idle" };
}

export function QiblaPage() {
  const navigate = useNavigate();
  const [geo, setGeo] = React.useState<GeoState>(initialGeo);
  const enableHaptics = useNoorStore((s) => s.prefs.enableHaptics);
  const hapticStrength = useNoorStore((s) => s.prefs.hapticStrength);

  // Request geolocation
  const requestGeo = React.useCallback(() => {
    if (!deviceLocationSupported()) {
      setGeo({ status: "unsupported" });
      return;
    }
    setGeo({ status: "loading" });
    // The Qibla bearing barely moves within a city, so an approximate location is enough.
    getDeviceLocation({ precise: false, timeoutMs: 10000, maxAgeMs: 10 * 60_000 }).then(
      ({ lat, lng, accuracy }) => {
        setGeo({ status: "ok", lat, lng, accuracy: accuracy ?? Number.NaN });
      },
      (err: DeviceLocationError) => {
        setGeo({ status: "error", code: err.code ?? 2, msg: err.message });
      },
    );
  }, []);

  const location = React.useMemo(
    () => (geo.status === "ok" ? { lat: geo.lat, lng: geo.lng } : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [geo.status === "ok" ? geo.lat : null, geo.status === "ok" ? geo.lng : null],
  );
  const compass = useCompassHeading(location);

  const qiblaBearing = location ? calcQiblaBearing(location.lat, location.lng) : null;

  // The needle turns by the continuous heading, so crossing north never
  // makes it spin the long way round.
  const needleRotation = qiblaBearing == null
    ? 0
    : compass.continuousHeading == null
      ? qiblaBearing // No compass: the needle shows the bearing from north.
      : qiblaBearing - compass.continuousHeading;

  const hasOrientation = compass.heading != null;
  const compassAccuracy = compass.accuracy;
  const hasPoorCompassAccuracy = compass.calibrationNeeded || (compassAccuracy != null && compassAccuracy > COMPASS_ACCURACY_WARN_AT);
  const hasTiltWarning = compass.tiltWarning;

  // Facing the Qibla: highlight it and give one gentle tap on arrival.
  const [aligned, setAligned] = React.useState(false);
  const nextAligned = nextAlignment(aligned, compass.heading, qiblaBearing);
  if (nextAligned !== aligned) setAligned(nextAligned);
  React.useEffect(() => {
    if (!aligned || !enableHaptics || hapticStrength === "off") return;
    vibrate(hapticStrength === "light" ? 10 : hapticStrength === "strong" ? 40 : 22);
  }, [aligned, enableHaptics, hapticStrength]);

  return (
    <div className="p-4 md:p-5 stack-y-4 max-w-lg mx-auto" dir="rtl">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Compass size={20} aria-hidden="true" className="text-(--accent)" />
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
            <circle
              cx="120"
              cy="120"
              r="118"
              fill="none"
              stroke={aligned ? "var(--accent)" : "var(--stroke)"}
              strokeWidth={aligned ? 4 : 2}
              style={{ transition: "stroke 0.2s ease, stroke-width 0.2s ease" }}
            />
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
              style={{
                transform: `rotate(${needleRotation}deg)`,
                transformOrigin: "120px 120px",
                transition: hasOrientation ? "transform 0.12s linear" : "none",
              }}
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
          <div className="text-center stack-y-1" aria-live="polite" aria-atomic="true">
            <div className="text-3xl font-bold" style={{ color: "var(--accent)" }}>
              {Math.round(qiblaBearing)}°
            </div>
            <div className="text-sm opacity-60">
              اتجاه القبلة، {formatBearing(qiblaBearing)}
            </div>
            {geo.status === "ok" && (
              <div dir="ltr" className="text-[10px] opacity-35 font-mono mt-0.5">
                {(geo as { status: "ok"; lat: number; lng: number }).lat >= 0 ? (geo as { status: "ok"; lat: number; lng: number }).lat.toFixed(4) + "°N" : Math.abs((geo as { status: "ok"; lat: number; lng: number }).lat).toFixed(4) + "°S"},
                {" "}{(geo as { status: "ok"; lat: number; lng: number }).lng >= 0 ? (geo as { status: "ok"; lat: number; lng: number }).lng.toFixed(4) + "°E" : Math.abs((geo as { status: "ok"; lat: number; lng: number }).lng).toFixed(4) + "°W"}
              </div>
            )}
            {aligned && (
              <div role="status" className="text-sm font-semibold text-(--accent) mt-1">
                أنت تواجه القبلة الآن
              </div>
            )}
            {hasTiltWarning && hasOrientation && (
              <div className="text-[11px] text-(--danger) opacity-80 mt-1">امسك الجهاز أفقياً للحصول على دقة أعلى</div>
            )}
            {!hasOrientation && (
              <div className="text-xs opacity-40 mt-2">
                السهم يشير إلى اتجاه القبلة الثابت (لا يوجد بوصلة نشطة)
              </div>
            )}
            {hasOrientation && (
              <div className="flex flex-col items-center gap-1 text-xs text-(--accent) opacity-80 mt-1">
                <div className="flex items-center justify-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-(--accent) animate-pulse" aria-hidden="true" />
                  بوصلة نشطة{compass.trueNorth ? "، مصحّحة للشمال الحقيقي" : ""}
                </div>
                {compassAccuracy != null && (
                  <div className={cn("text-[11px]", hasPoorCompassAccuracy ? "text-(--danger) opacity-90" : "opacity-65")}>
                    دقة البوصلة ±{Math.round(compassAccuracy)}°
                  </div>
                )}
                {hasPoorCompassAccuracy && (
                  <div className="text-[11px] text-(--danger) opacity-90">
                    حرّك الجهاز على شكل رقم ٨ وابتعد عن المعادن والأجهزة لمعايرة البوصلة
                  </div>
                )}
              </div>
            )}
            <button
              type="button"
              onClick={async () => {
                const dir = formatBearing(qiblaBearing);
                const text = `اتجاه القبلة من موقعي: ${Math.round(qiblaBearing)}° (${dir})`;
                await shareOrCopy(text);
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
        {compass.webPermissionNeeded && (
          <Button variant="secondary" size="sm" onClick={() => void compass.requestWebPermission()}>
            <Compass size={15} aria-hidden="true" />
            تفعيل البوصلة
          </Button>
        )}
      </Card>

      {/* Location status card */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <MapPin size={16} aria-hidden="true" className="text-(--accent)" />
          <span className="text-sm font-semibold">الموقع الجغرافي</span>
        </div>

        {geo.status === "idle" ? (
          <div className="stack-y-3">
            <div className="text-sm opacity-60 leading-relaxed">
              استخدم موقعك الحالي لتحديد اتجاه القبلة.
            </div>
            <Button variant="secondary" size="sm" onClick={requestGeo}>
              <MapPin size={14} aria-hidden="true" />
              تحديد موقعي
            </Button>
          </div>
        ) : geo.status === "loading" ? (
          <div className="flex items-center gap-2 text-sm opacity-60" role="status" aria-label="جارٍ تحديد موقعك">
            <RefreshCw size={14} aria-hidden="true" className="animate-spin" />
            جارٍ تحديد موقعك...
          </div>
        ) : geo.status === "error" ? (
          <div className="stack-y-3">
            <div className="text-sm opacity-60">
              {geo.code === 1
                ? "رفضت الإذن بالوصول للموقع. يرجى السماح للتطبيق بتحديد موقعك من الإعدادات."
                : geo.code === 2
                ? "تعذر تحديد موقعك. تأكد من تفعيل خدمة الموقع."
                : geo.code === 3
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
          <div className="stack-y-2 text-sm">
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
              <div dir="ltr" className="font-mono font-medium">
                {geo.accuracy == null ? <span dir="rtl" className="font-sans">موقع مواقيت الصلاة</span> : Number.isFinite(geo.accuracy) ? `±${Math.round(geo.accuracy)}م` : "—"}
              </div>
            </div>
            <Button variant="secondary" size="sm" className="mt-2" onClick={requestGeo}>
              <RefreshCw size={13} aria-hidden="true" />
              تحديث الموقع
            </Button>
          </div>
        )}
      </Card>

      {/* Info card */}
      <Card className="p-4 pr-24 md:pr-4 text-sm opacity-70 stack-y-1">
        <div className="font-semibold opacity-100 mb-2">كيفية الاستخدام</div>
        <p>١. امسك الجهاز أفقياً (موازياً للأرض) للحصول على أدق النتائج</p>
        <p>٢. اضغط "تفعيل البوصلة" إن ظهر الزر (المتصفح على iOS يحتاج إذنًا صريحًا)</p>
        <p>٣. رأس السهم يشير نحو الكعبة المشرفة</p>
        <p>٤. دوِّر الجهاز حتى يصبح السهم مستقيماً للأعلى — يهتز الجهاز وتتلوّن الدائرة حين تواجه القبلة</p>
        <p>٥. إن كانت الدقة ضعيفة، حرّك الجهاز على شكل رقم ٨ لمعايرة البوصلة</p>
      </Card>
    </div>
  );
}
