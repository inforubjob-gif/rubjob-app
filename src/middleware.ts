import { NextRequest, NextResponse } from "next/server";

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images (public images)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|images|lib).*)",
  ],
};

export default function middleware(req: NextRequest) {
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
    // If we're at the root of the subdomain (e.g., rider.rubjob.com/)
    // and the path doesn't already start with the folder name
    if (!url.pathname.startsWith(`/${targetFolder}`) && targetFolder !== "") {
      return NextResponse.rewrite(new URL(`/${targetFolder}${url.pathname}`, req.url));
    }
  }

  // Access Control / Security:
  // Allow localhost/127.0.0.1 to access everything for easy local development
  const isLocal = hostname.includes("localhost") || hostname.includes("127.0.0.1");

  const isMainDomain = !subdomain || subdomain === "www" || subdomain === "app";
  if (isMainDomain && !isLocal) {
    const restrictedFolders = ["rider", "store", "admin"];
    if (restrictedFolders.some(folder => url.pathname.startsWith(`/${folder}`))) {
      // Prevent users from manually typing rubjob.com/admin in production
      return new NextResponse(null, { status: 404 });
    }
  }

  return NextResponse.next();
}
