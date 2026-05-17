/**
 * Longdo Map API Helper
 * Free tier: 1,000 requests/day
 * Sign up at: https://map.longdo.com/console
 * 
 * Usage: Set LONGDO_MAP_KEY in Cloudflare Pages environment variables
 * If no key is set, falls back to Nominatim
 */

export interface GeoResult {
  district: string;    // ตำบล
  subdistrict: string; // แขวง/ตำบล
  amphoe: string;      // อำเภอ/เขต
  province: string;    // จังหวัด
  areaName: string;    // ชื่อย่าน (human-readable)
}

/**
 * Reverse geocode using Longdo Map API (Thai-optimized)
 * Falls back to Nominatim if no API key
 */
export async function reverseGeocode(
  lat: number,
  lon: number,
  longdoKey?: string
): Promise<GeoResult | null> {
  // Try Longdo Map first (if key available)
  if (longdoKey) {
    try {
      const res = await fetch(
        `https://api.longdo.com/map/services/address?lon=${lon}&lat=${lat}&key=${longdoKey}`,
        { signal: AbortSignal.timeout(3000) }
      );
      if (res.ok) {
        const data = await res.json();
        if (data?.district) {
          return {
            district: data.district || "",
            subdistrict: data.subdistrict || "",
            amphoe: data.amphoe || data.district || "",
            province: data.province || "",
            areaName: data.subdistrict
              ? `${data.subdistrict}, ${data.district}`
              : data.district || "ไม่ทราบพื้นที่",
          };
        }
      }
    } catch (err) {
      console.error("Longdo geocode error:", err);
    }
  }

  // Fallback to Nominatim
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&accept-language=th&zoom=14`,
      { signal: AbortSignal.timeout(3000) }
    );
    if (res.ok) {
      const data = await res.json();
      const addr = data.address || {};
      return {
        district: addr.city_district || addr.suburb || "",
        subdistrict: addr.village || addr.neighbourhood || "",
        amphoe: addr.city || addr.town || "",
        province: addr.state || addr.province || "",
        areaName:
          addr.city_district ||
          addr.suburb ||
          addr.city ||
          addr.town ||
          "ไม่ทราบพื้นที่",
      };
    }
  } catch (err) {
    console.error("Nominatim geocode error:", err);
  }

  return null;
}

/**
 * Search places by text query (Thai)
 */
export async function searchPlace(
  query: string,
  longdoKey?: string
): Promise<Array<{ name: string; lat: number; lon: number }>> {
  if (!longdoKey) return [];

  try {
    const res = await fetch(
      `https://search.longdo.com/mapsearch/json/search?keyword=${encodeURIComponent(query)}&limit=5&key=${longdoKey}`,
      { signal: AbortSignal.timeout(3000) }
    );
    if (res.ok) {
      const data = await res.json();
      return (data.data || []).map((item: any) => ({
        name: item.name || item.w,
        lat: item.lat,
        lon: item.lon,
      }));
    }
  } catch (err) {
    console.error("Longdo search error:", err);
  }
  return [];
}
