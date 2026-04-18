import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth-server";

export const runtime = "edge";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ key: string }> }
) {
  const session = await getAdminSession();
  if (!session) return new Response("Unauthorized", { status: 401 });

  try {
    const { key } = await params;
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
  } catch (err: any) {
    console.error("File server error:", err);
    return new Response("Internal Server Error", { status: 500 });
  }
}
