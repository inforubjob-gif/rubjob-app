import { NextRequest, NextResponse } from "next/server";

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images (public images)
     */
    "/((?!_next/static|_next/image|favicon.ico|images|lib).*)",
  ],
};

export default function middleware(req: NextRequest) {
  try {
    const url = req.nextUrl;
    const hostname = req.headers.get("host") || "";
    
    // Define subdomains and their corresponding internal folders
    const subdomainMapping: Record<string, string> = {
      "rider": "rider",
      "store": "store",
      "admin": "admin",
      "app": "", // Main app (root)
    };

    // Determine the subdomain based on different hosting environments
    let subdomain = "";

    if (hostname.includes("lvh.me")) {
      // Local testing: rider.lvh.me:3000
      const parts = hostname.split(".lvh.me");
      subdomain = parts[0] === hostname ? "" : parts[0];
    } else if (hostname.includes("rubjob.com")) {
      // Production (Main): rider.rubjob.com
      const parts = hostname.split(".rubjob.com");
      subdomain = parts[0] === hostname ? "" : parts[0];
    } else if (hostname.includes("rubjob-app.pages.dev")) {
      // Cloudflare Pages Default: rider.rubjob-app.pages.dev
      const parts = hostname.split(".rubjob-app.pages.dev");
      subdomain = parts[0] === hostname ? "" : parts[0];
    }

    // Rewrite logic
    const targetFolder = subdomainMapping[subdomain];

    if (targetFolder) {
      if (!url.pathname.startsWith('/api') && !url.pathname.startsWith(`/${targetFolder}`) && targetFolder !== "") {
        return NextResponse.rewrite(new URL(`/${targetFolder}${url.pathname}`, req.url));
      }
    }

    // Access Control / Security:
    const isLocal = hostname.includes("localhost") || hostname.includes("127.0.0.1");

    const isMainDomain = !subdomain || subdomain === "www" || subdomain === "app";
    if (isMainDomain && !isLocal) {
      const restrictedFolders = ["rider", "store", "admin"];
      if (restrictedFolders.some(folder => url.pathname.startsWith(`/${folder}`))) {
        return new NextResponse(null, { status: 404 });
      }
    }

    // Admin API Auth Check
    if (url.pathname.startsWith("/api/admin") && !url.pathname.startsWith("/api/admin/login")) {
      const adminToken = req.cookies.get("admin_token");
      if (!adminToken) {
        return new NextResponse(JSON.stringify({ error: "Unauthorized" }), { 
          status: 401, 
          headers: { "Content-Type": "application/json" } 
        });
      }
    }

    return NextResponse.next();
  } catch (err: any) {
    return new NextResponse(JSON.stringify({ 
      error: "Middleware Crash", 
      message: err.message, 
      stack: err.stack 
    }), { 
      status: 500, 
      headers: { "Content-Type": "application/json" } 
    });
  }
}
