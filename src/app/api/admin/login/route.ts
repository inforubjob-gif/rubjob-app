export const runtime = "edge";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ success: false, error: "Please provide email and password" }, { status: 400 });
    }

    const db = (req as any).context?.env?.DB;
    if (!db) {
      console.warn("D1 not found, falling back to environment variables only.");
    } else {
      // 1. Check D1 Database
      const admin = await db.prepare(`
        SELECT * FROM admin_users WHERE email = ? AND password = ?
      `).bind(email, password).first();

      if (admin) {
        return NextResponse.json({ success: true, name: admin.name });
      }
    }

    // 2. Fallback to Environment Variables
    const validEmail = process.env.ADMIN_EMAIL || "admin@rubjob.com";
    const validPassword = process.env.ADMIN_PASSWORD || "admin123";

    if (email === validEmail && password === validPassword) {
      return NextResponse.json({ success: true, name: "Master Admin" });
    } else {
      return NextResponse.json({ success: false, error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" }, { status: 401 });
    }
  } catch (err) {
    console.error("Admin login error:", err);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}
