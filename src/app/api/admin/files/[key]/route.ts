import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";
import { getAdminSession, getRubberSession, getStoreSession } from "@/lib/auth-server";

export const runtime = "edge";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ key: string }> }
) {
  const { key } = await params;

  // Security Upgrade: Check for any valid platform session, unless it's a public file
  if (!key.startsWith("public-")) {
    const [admin, rubber, store] = await Promise.all([
      getAdminSession(),
      getRubberSession(),
      getStoreSession()
    ]);

    if (!admin && !rubber && !store) {
      return new Response("Unauthorized: No valid session found", { status: 401 });
    }
  }

  try {
    const { env } = getRequestContext();
    const bucket = env.UPLOADS as any; // R2Bucket

    if (!bucket || !key) {
      return new Response("Not Found", { status: 404 });
    }

    const object = await bucket.get(key);

    if (!object) {
      return new Response("Not Found", { status: 404 });
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("etag", object.httpEtag);
    headers.set("cache-control", "public, max-age=31536000");

    return new Response(object.body, {
      headers,
    });
  } catch (err: unknown) {
    console.error("File server error:", err);
    return new Response("Internal Server Error", { status: 500 });
  }
}
