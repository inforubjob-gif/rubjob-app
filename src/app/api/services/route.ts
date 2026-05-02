import { NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { DIRECT_SERVICES } from "@/lib/constants";

export const runtime = "edge";

/**
 * GET /api/services
 * Fetches all available services from Cloudflare D1
 */
export async function GET(req: Request) {
  try {
    // Access D1 from Cloudflare context via getRequestContext
    const db = getRequestContext().env.DB;
    if (!db) {
      return NextResponse.json({ error: "D1 Database binding 'DB' not found" }, { status: 500 });
    }

    const { results } = await db.prepare(`
      SELECT * FROM services 
      WHERE isActive = 1 AND category = 'laundry'
      ORDER BY category ASC, name ASC
    `).all();

    // Fetch dynamic provider gigs
    let providerGigs: any[] = [];
    try {
      const { results: gigs } = await db.prepare(`
        SELECT ps.*, pu.name as providerName, pu.pictureUrl as providerPicture, pu.lineId as providerLineId
        FROM provider_services ps
        LEFT JOIN provider_users pu ON ps.providerId = pu.id
        WHERE ps.isActive = 1 
        ORDER BY ps.createdAt DESC
      `).all();
      
      // Map gigs to match the Service type expected by the frontend
      providerGigs = gigs.map((gig: any) => {
        let pkgPrice = 0;
        let pkgUnit = "ครั้ง";
        try {
          const packages = JSON.parse(gig.packages);
          if (packages && packages.length > 0) {
            // Find lowest price package or default to first
            const basicPkg = packages.find((p: any) => p.type === "basic") || packages[0];
            pkgPrice = basicPkg.price || 0;
            pkgUnit = basicPkg.unit || "ครั้ง";
          }
        } catch (e) {}

        return {
          id: gig.id,
          name: gig.title,
          category: gig.category || 'specialist',
          description: gig.description,
          basePrice: pkgPrice,
          unit: pkgUnit,
          icon: gig.icon || 'Stars',
          estimatedDays: 0,
          isDynamicGig: true, // Flag to identify provider gigs
          providerId: gig.providerId,
          providerName: gig.providerName || "ผู้เชี่ยวชาญอิสระ",
          packages: gig.packages // Send raw string so Gig page can parse it!
        };
      });
    } catch (e) {
      console.error("Could not fetch provider_services", e);
    }

    // Combine standard services and dynamic gigs
    const allServices = [...results, ...providerGigs];

    return NextResponse.json(
      { services: allServices },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      }
    );
  } catch (error: any) {
    console.error("Fetch services error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
