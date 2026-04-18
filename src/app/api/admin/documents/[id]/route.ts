import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth-server";

export const runtime = "edge";

/**
 * GET /api/admin/documents/[id]
 * Serves a document securely to authenticated admins.
 * This prevents sensitive photos (ID cards, etc.) from being public.
 */
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getAdminSession();
  if (!session) return new Response("Unauthorized", { status: 401 });

  try {
    const { id } = params;
    const db = getRequestContext().env.DB;
    if (!db) return new Response("DB not found", { status: 500 });

    // 1. Security Check: In a real app, verify admin session here.
    // Since we are in a protected admin route context, 
    // we assume the middleware or parent route handles auth.
    
    // 2. Fetch document from DB
    const doc = await db.prepare("SELECT url, type FROM rider_documents WHERE id = ?")
      .bind(id)
      .first() as any;

    if (!doc || !doc.url) {
      return new Response("Document not found", { status: 404 });
    }

    // 3. Handle Base64 data if present
    if (doc.url.startsWith("data:")) {
      const [header, base64Data] = doc.url.split(",");
      const contentType = header.split(":")[1].split(";")[0];
      const buffer = Buffer.from(base64Data, "base64");
      
      return new Response(buffer, {
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "private, max-age=3600",
        },
      });
    }

    // 4. Handle external URLs (fallback)
    return NextResponse.redirect(doc.url);
  } catch (error: any) {
    return new Response(error.message, { status: 500 });
  }
}
