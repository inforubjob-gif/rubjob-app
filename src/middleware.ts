import { NextRequest, NextResponse } from "next/server";

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes — accessible from all subdomains)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images (public images)
     * - lib (public lib assets)
     * - manifest.json (PWA manifest)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|images|lib|manifest\\.json).*)",
  ],
};

/**
 * Supported root domains for subdomain extraction.
 * Order matters — first match wins.
 */
const ROOT_DOMAINS = [
  "rubjob-all.com",
  "rubjob.com",
  "rubjob-app.pages.dev",
  "lvh.me", // Local development with subdomains
  "localhost", // Local development root
];

/**
 * Valid portal subdomains and their corresponding internal route prefixes.
 * "" means no rewrite (serves root-level pages).
 */
const SUBDOMAIN_MAP: Record<string, string> = {
  admin: "/admin",
  rubber: "/rubber",
  partner: "/partner",
  store: "/partner-store",
  provider: "/partner-service",
  app: "",   // User app — root-level pages, no prefix needed
};

/** Portal path prefixes that should be isolated per-subdomain */
const PORTAL_PREFIXES = ["/admin", "/rubber", "/partner-store", "/partner-service", "/partner", "/landing"];

/**
 * Extract subdomain from hostname against known root domains.
 * Returns "" for bare domain (e.g. rubjob-all.com).
 * Returns null if hostname doesn't match any known domain.
 */
function extractSubdomain(hostname: string): string | null {
  // Strip port (e.g. "admin.lvh.me:3000" → "admin.lvh.me")
  const host = hostname.split(":")[0];

  // 1. Try exact match against root domains
  for (const root of ROOT_DOMAINS) {
    if (host === root) {
      return ""; // Bare domain, no subdomain
    }
    if (host.endsWith(`.${root}`)) {
      const sub = host.slice(0, -(root.length + 1)); // e.g. "admin"
      // Only return single-level subdomains (not "a.b.rubjob-all.com")
      if (sub && !sub.includes(".")) {
        return sub;
      }
    }
  }

  // 2. Fallback for Cloudflare Pages preview URLs (*.pages.dev)
  if (host.endsWith(".pages.dev")) {
    const parts = host.split(".");
    // If it's like admin.project.pages.dev (length 4)
    if (parts.length >= 4) {
      return parts[0];
    }
    // If it's like project.pages.dev (length 3)
    return "";
  }

  // 3. Fallback for development (localhost, lvh.me with subdomains)
  const parts = host.split(".");
  if (parts.length > 1) {
     const sub = parts[0];
     // Recognize common subdomains even if the root isn't explicitly listed
     if (["admin", "rubber", "store", "provider", "app"].includes(sub)) {
        return sub;
     }
  }

  return null; // Unknown domain
}

export default function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();
  const hostname = req.headers.get("host") || "";
  const pathname = url.pathname;

  const subdomain = extractSubdomain(hostname);

  // ─── Unknown domain (e.g. localhost:3000) — pass through ───
  if (subdomain === null) {
    return NextResponse.next();
  }

  // ─── Root domain (rubjob-all.com, no subdomain) → Landing page ───
  if (subdomain === "") {
    // Block access to portal routes from the root domain
    if (PORTAL_PREFIXES.some((p) => pathname.startsWith(p) && p !== "/landing")) {
      // Redirect /admin, /rubber, /partner to proper subdomain
      for (const [sub, prefix] of Object.entries(SUBDOMAIN_MAP)) {
        if (prefix && pathname.startsWith(prefix)) {
          const hostWithoutPort = hostname.split(":")[0];
          const rootDomain = ROOT_DOMAINS.find((d) => hostWithoutPort.endsWith(d)) || ROOT_DOMAINS[0];
          const targetHost = url.port ? `${sub}.${rootDomain}:${url.port}` : `${sub}.${rootDomain}`;
          const targetPath = pathname.slice(prefix.length) || "/";
          return NextResponse.redirect(new URL(`${url.protocol}//${targetHost}${targetPath}`));
        }
      }
    }

    // For root domain, rewrite paths to serve from the /landing directory
    // e.g. rubjob.com/register/rubber -> serves from src/app/landing/register/rubber
    if (!pathname.startsWith("/landing") && !pathname.startsWith("/api") && !pathname.includes(".")) {
      url.pathname = `/landing${pathname === "/" ? "" : pathname}`;
      return NextResponse.rewrite(url);
    }

    return NextResponse.next();
  }

  // ─── Known portal subdomains (admin, rubber, store, app) ───
  const targetPrefix = SUBDOMAIN_MAP[subdomain];

  if (targetPrefix !== undefined) {
    // Subdomain isolation: redirect cross-portal access to the correct subdomain
    // e.g. app.rubjob.com/rubber → redirect to rubber.rubjob.com/
    for (const [otherSub, otherPrefix] of Object.entries(SUBDOMAIN_MAP)) {
      if (
        otherPrefix &&
        otherPrefix !== targetPrefix &&
        pathname.startsWith(otherPrefix)
      ) {
        const hostWithoutPort = hostname.split(":")[0];
        const rootDomain = ROOT_DOMAINS.find((d) => hostWithoutPort.endsWith(d)) || ROOT_DOMAINS[0];
        const targetHost = url.port ? `${otherSub}.${rootDomain}:${url.port}` : `${otherSub}.${rootDomain}`;
        const targetPath = pathname.slice(otherPrefix.length) || "/";
        return NextResponse.redirect(new URL(`${url.protocol}//${targetHost}${targetPath}`));
      }
    }

    // Block /landing from portal subdomains
    if (pathname.startsWith("/landing")) {
      url.pathname = "/";
      return NextResponse.redirect(url);
    }

    let response;
    // Rewrite: prepend portal prefix if not already present
    if (targetPrefix && !pathname.startsWith(targetPrefix)) {
      url.pathname = `${targetPrefix}${pathname}`;
      response = NextResponse.rewrite(url);
    } else if (targetPrefix && pathname.startsWith(targetPrefix)) {
      // Strip prefix and redirect to clean URL for better subdomain isolation
      // e.g. admin.rubjob.com/admin/orders -> admin.rubjob.com/orders
      const cleanPath = pathname.slice(targetPrefix.length) || "/";
      url.pathname = cleanPath;
      return NextResponse.redirect(url);
    } else {
      response = NextResponse.next();
    }

    // Prevent indexing of portal subdomains by search engines and AI bots
    response.headers.set("X-Robots-Tag", "noindex, nofollow");

    return response;
  }

  // 4. Default fallback: serve the main app for unrecognized domains
  // Instead of redirecting to the root domain, we just let it serve the root files.
  return NextResponse.next();
}
