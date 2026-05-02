import * as React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, MapPin, RefreshCw } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

// ─── Types ────────────────────────────────────────────────────────────────────

type OverpassElement = {
  type: "node" | "way";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: { name?: string; "name:ar"?: string; [key: string]: string | undefined };
};

type OverpassResponse = { elements: OverpassElement[] };

type GeoState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ok"; lat: number; lng: number }
  | { status: "error"; msg: string };

type Mosque = {
  id: number;
  name: string;
  lat: number;
  lon: number;
  distanceKm: number;
};

// ─── Haversine distance ───────────────────────────────────────────────────────

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── NearbyMosquesPage ────────────────────────────────────────────────────────

export function NearbyMosquesPage() {
  const navigate = useNavigate();
  const [geo, setGeo] = React.useState<GeoState>({ status: "idle" });
  const [mosques, setMosques] = React.useState<Mosque[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [fetchError, setFetchError] = React.useState<string | null>(null);

  const fetchMosques = React.useCallback(async (lat: number, lng: number) => {
    setLoading(true);
    setFetchError(null);
    try {
      const query = `[out:json][timeout:15];(node(around:5000,${lat},${lng})[amenity=place_of_worship][religion=muslim];way(around:5000,${lat},${lng})[amenity=place_of_worship][religion=muslim];);out center 25;`;
      const res = await fetch("https://overpass-api.de/api/interpreter", {
        method: "POST",
        body: `data=${encodeURIComponent(query)}`,
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });
      if (!res.ok) throw new Error("فشل الاتصال بـ Overpass API");
      const data = (await res.json()) as OverpassResponse;
      const items: Mosque[] = data.elements
        .map((el) => {
          const elLat = el.lat ?? el.center?.lat ?? 0;
          const elLon = el.lon ?? el.center?.lon ?? 0;
          const nameAr = el.tags?.["name:ar"] ?? el.tags?.["name"] ?? "مسجد";
          return { id: el.id, name: nameAr, lat: elLat, lon: elLon, distanceKm: haversine(lat, lng, elLat, elLon) };
        })
        .sort((a, b) => a.distanceKm - b.distanceKm)
        .slice(0, 10);
      setMosques(items);
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : "تعذر جلب بيانات المساجد");
    } finally {
      setLoading(false);
    }
  }, []);

  const requestGeo = React.useCallback(() => {
    if (!navigator.geolocation) {
      setGeo({ status: "error", msg: "تحديد الموقع غير مدعوم في هذا المتصفح" });
      return;
    }
    setGeo({ status: "loading" });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setGeo({ status: "ok", lat, lng });
        void fetchMosques(lat, lng);
      },
      (err) => setGeo({ status: "error", msg: err.message }),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, [fetchMosques]);

  React.useEffect(() => {
    requestGeo();
  }, [requestGeo]);

  return (
    <div className="p-4 md:p-5 space-y-4 max-w-2xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🕌</span>
          <h1 className="text-xl font-bold">المساجد القريبة</h1>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
          <ArrowRight size={15} />
          رجوع
        </Button>
      </div>

      {/* Geo loading */}
      {(geo.status === "idle" || geo.status === "loading") && (
        <Card className="p-4 flex items-center gap-3 text-sm opacity-60">
          <RefreshCw size={16} className="animate-spin shrink-0" />
          <span>جارٍ تحديد موقعك...</span>
        </Card>
      )}

      {/* Geo error */}
      {geo.status === "error" && (
        <Card className="p-4 space-y-3">
          <div className="text-sm opacity-70">{geo.msg}</div>
          <Button variant="secondary" size="sm" onClick={requestGeo}>
            <RefreshCw size={14} /> إعادة المحاولة
          </Button>
        </Card>
      )}

      {/* Mosques loading */}
      {loading && geo.status === "ok" && (
        <Card className="p-4 flex items-center gap-3 text-sm opacity-60">
          <RefreshCw size={16} className="animate-spin shrink-0" />
          <span>جارٍ البحث عن المساجد القريبة في نطاق 5 كم...</span>
        </Card>
      )}

      {/* Fetch error */}
      {fetchError && (
        <Card className="p-4 space-y-3">
          <div className="text-sm opacity-70">{fetchError}</div>
          {geo.status === "ok" && (
            <Button variant="secondary" size="sm" onClick={() => void fetchMosques(geo.lat, geo.lng)}>
              <RefreshCw size={14} /> إعادة المحاولة
            </Button>
          )}
        </Card>
      )}

      {/* Empty state */}
      {!loading && !fetchError && geo.status === "ok" && mosques.length === 0 && (
        <Card className="p-6 text-sm text-center space-y-2">
          <div className="text-4xl mb-2">🕌</div>
          <div className="opacity-60">لم يُعثر على مساجد مسجّلة في نطاق 5 كم من موقعك</div>
          <Button variant="secondary" size="sm" className="mt-2" onClick={() => void fetchMosques((geo as {status:"ok";lat:number;lng:number}).lat, (geo as {status:"ok";lat:number;lng:number}).lng)}>
            <RefreshCw size={14} /> بحث مجدداً
          </Button>
        </Card>
      )}

      {/* Mosque list */}
      {mosques.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-semibold opacity-60 uppercase tracking-wide mb-3">
            {mosques.length} مسجد في نطاق 5 كم
          </div>
          {mosques.map((mosque, i) => {
            const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${mosque.lat},${mosque.lon}`;
            const distLabel =
              mosque.distanceKm < 1
                ? `${Math.round(mosque.distanceKm * 1000)} م`
                : `${mosque.distanceKm.toFixed(2)} كم`;
            return (
              <Card key={mosque.id} className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-xl"
                      style={{ backgroundColor: "rgba(255,255,255,0.07)" }}
                    >
                      🕌
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-sm truncate">{mosque.name}</div>
                      <div className="text-xs opacity-50 mt-0.5 flex items-center gap-1">
                        <MapPin size={10} />
                        <span>{distLabel}</span>
                        <span>·</span>
                        <span>#{i + 1}</span>
                      </div>
                    </div>
                  </div>
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 text-[11px] px-3 py-1.5 rounded-full border border-white/20 hover:bg-white/10 transition whitespace-nowrap"
                    style={{ color: "var(--accent)" }}
                  >
                    خرائط ↗
                  </a>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Source disclaimer */}
      <Card className="p-3 text-[11px] opacity-40 text-center">
        البيانات من OpenStreetMap عبر Overpass API — قد لا تشمل جميع المساجد
      </Card>
    </div>
  );
}
