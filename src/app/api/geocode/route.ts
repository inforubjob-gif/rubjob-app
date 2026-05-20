import { NextResponse } from "next/server";

export const runtime = "edge";

/**
 * GET /api/geocode?q=...
 * Server-side proxy for Nominatim search — avoids client-side rate limiting.
 * Nominatim policy: 1 req/s per IP. By proxying through the server all users
 * share the server's IP with proper User-Agent, which is far more reliable
 * than each browser hitting Nominatim directly.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();

  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const params = new URLSearchParams({
    format: "json",
    q,
    limit: "8",
    "accept-language": "th,en",
    addressdetails: "1",
    countrycodes: "th",
  });

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?${params.toString()}`,
      {
        headers: {
          "User-Agent": "RubJob/1.0 (contact@rubjob-all.com)",
          "Accept-Language": "th,en;q=0.9",
        },
        // Edge cache — reuse identical queries for 60 seconds across users
        // This dramatically reduces Nominatim load when multiple users
        // search for the same popular place name simultaneously
      }
    );

    if (!res.ok) {
      console.error(`Nominatim error: ${res.status}`);
      return NextResponse.json({ results: [] }, { status: 200 });
    }

    const data: Array<{
      place_id: number;
      display_name: string;
      lat: string;
      lon: string;
    }> = await res.json();

    const results = (data || []).map((item) => ({
      id: `nom-${item.place_id}`,
      name: item.display_name,
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
    }));

    return NextResponse.json(
      { results },
      {
        headers: {
          // Cache identical search results for 60s at edge — reduces repeated calls
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
        },
      }
    );
  } catch (err) {
    console.error("Geocode proxy error:", err);
    return NextResponse.json({ results: [] }, { status: 200 });
  }
}
