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

  // Determine the subdomain
  let subdomain = "";

  if (hostname.includes("rubjob.com")) {
    const parts = hostname.split(".rubjob.com");
    subdomain = parts[0] === hostname ? "" : parts[0];
  } else if (hostname.includes("rubjob-app.pages.dev")) {
    const parts = hostname.split(".rubjob-app.pages.dev");
    subdomain = parts[0] === hostname ? "" : parts[0];
  }

  // Rewrite logic - Simplified to prevent 500
  const targetFolder = subdomainMapping[subdomain];

  if (targetFolder && targetFolder !== "") {
    if (!url.pathname.startsWith(`/${targetFolder}`)) {
      return NextResponse.rewrite(new URL(`/${targetFolder}${url.pathname}`, req.url));
    }
  }

  return NextResponse.next();
}
