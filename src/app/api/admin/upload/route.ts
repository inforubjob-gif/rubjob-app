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

    // Validate file type
    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json({ error: "Invalid file type. Only images are allowed." }, { status: 400 });
    }

    // Validate size (e.g., 2MB)
    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json({ error: "File too large. Maximum size is 2MB." }, { status: 400 });
    }

    const filename = `${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    const contentType = file.type;
    const arrayBuffer = await file.arrayBuffer();

    await bucket.put(filename, arrayBuffer, {
      httpMetadata: { contentType }
    });

    // Generate URL
    // Note: In production, you would use a public R2 bucket domain or a custom domain.
    // For now, we'll return a path that our /api/files route can serve.
    const url = `/api/admin/files/${filename}`;

    return NextResponse.json({ success: true, url });
  } catch (err: any) {
    console.error("Upload error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
