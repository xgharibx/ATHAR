/**
 * Fully offline prayer times (the `adhan` package, Jean Meeus astronomical
 * formulas) for the app's calculation methods. The prayer screen falls back to
 * this without a network, and the phone uses it to keep queuing the Adhan for
 * months while the app stays closed (src/lib/prayerTopUp.ts).
 */
import { CalculationMethod, Coordinates, Madhab, PrayerTimes as AdhanPrayerTimes, type CalculationParameters } from "adhan";

export type LocalPrayerTimings = {
  Fajr: string;
  Sunrise: string;
  Dhuhr: string;
  Asr: string;
  Maghrib: string;
  Isha: string;
};

// AlAdhan numeric method codes → local `adhan` parameters. The offline library
// exposes the prayer angles but not every authority's minute-by-minute tuning.
export function methodToCalculationParameters(method: number): CalculationParameters {
  switch (method) {
    case 1: return CalculationMethod.Karachi();
    case 2: return CalculationMethod.NorthAmerica(); // ISNA
    case 3: return CalculationMethod.MuslimWorldLeague();
    case 4: return CalculationMethod.UmmAlQura();
    case 5: return CalculationMethod.Egyptian();
    case 7: return CalculationMethod.Tehran();
    case 8: return CalculationMethod.Dubai(); // Gulf Region — closest available
    case 9: return CalculationMethod.Kuwait();
    case 10: return CalculationMethod.Qatar();
    case 11: return CalculationMethod.Singapore();
    case 12: return localAngleMethod(12, 12); // France
    case 13: return CalculationMethod.Turkey();
    case 14: return localAngleMethod(16, 15); // Russia
    case 15: return CalculationMethod.MoonsightingCommittee();
    case 16: return CalculationMethod.Dubai();
    case 17: return localAngleMethod(20, 18); // JAKIM
    case 18: return localAngleMethod(18, 18); // Tunisia
    case 19: return localAngleMethod(18, 17); // Algeria
    case 20: return localAngleMethod(20, 18); // Indonesia
    case 21: return localAngleMethod(19, 17); // Morocco
    case 23: return localAngleMethod(18, 18, 5); // Jordan: Maghrib is 5 minutes after sunset
    default: return CalculationMethod.MuslimWorldLeague();
  }
}

function localAngleMethod(fajrAngle: number, ishaAngle: number, maghribOffset = 0): CalculationParameters {
  const params = CalculationMethod.Other();
  params.fajrAngle = fajrAngle;
  params.ishaAngle = ishaAngle;
  params.adjustments.maghrib = maghribOffset;
  return params;
}

function two(n: number) {
  return String(n).padStart(2, "0");
}

/**
 * PrayerTimes returns UTC instants for the coordinates; they are formatted in
 * the device time zone, which the countdowns and notification scheduler also use.
 */
export function computeLocalPrayerTimings(lat: number, lng: number, date: Date, method: number, school: number): LocalPrayerTimings {
  const params = methodToCalculationParameters(method);
  params.madhab = school === 1 ? Madhab.Hanafi : Madhab.Shafi;
  const times = new AdhanPrayerTimes(new Coordinates(lat, lng), date, params);
  const fmt = (d: Date) => `${two(d.getHours())}:${two(d.getMinutes())}`;
  return {
    Fajr: fmt(times.fajr),
    Sunrise: fmt(times.sunrise),
    Dhuhr: fmt(times.dhuhr),
    Asr: fmt(times.asr),
    Maghrib: fmt(times.maghrib),
    Isha: fmt(times.isha),
  };
}
