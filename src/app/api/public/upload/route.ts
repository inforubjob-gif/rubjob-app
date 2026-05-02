import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";

export const runtime = "edge";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    
    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const { env } = getRequestContext();
    const bucket = env.UPLOADS as any; // R2Bucket

    if (!bucket) {
      return NextResponse.json({ error: "R2 Bucket 'UPLOADS' not found" }, { status: 500 });
    }

    // Validate file type (Images only)
    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json({ error: "Invalid file type. Only images are allowed." }, { status: 400 });
    }

    // Validate size (5MB for high res ID cards)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json({ error: "File too large. Maximum size is 5MB." }, { status: 400 });
    }

    const filename = `public/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    const contentType = file.type;
    const arrayBuffer = await file.arrayBuffer();

    await bucket.put(filename, arrayBuffer, {
      httpMetadata: { contentType }
    });

    // In a real project, this would be a Cloudflare R2 public URL
    // For now, using the local serve pattern
    const url = `/api/admin/files/${filename}`;

    return NextResponse.json({ success: true, url });
  } catch (err: any) {
    console.error("Public Upload error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
