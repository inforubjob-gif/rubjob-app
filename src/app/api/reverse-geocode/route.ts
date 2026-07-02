import { NextResponse } from "next/server";

export const runtime = "edge";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");
  
  if (!lat || !lng) {
    return NextResponse.json({ error: "Missing lat/lng" }, { status: 400 });
  }

  const GKEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
  if (!GKEY) {
    return NextResponse.json({ error: "Missing API key" }, { status: 500 });
  }

  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&language=th&key=${GKEY}`
    );
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: "Geocoding failed" }, { status: 500 });
  }
}
