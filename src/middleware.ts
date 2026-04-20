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
  rider: "/rider",
  store: "/store",
  app: "",   // User app — root-level pages, no prefix needed
};

/** Portal path prefixes that should be isolated per-subdomain */
const PORTAL_PREFIXES = ["/admin", "/rider", "/store", "/landing"];

/**
 * Extract subdomain from hostname against known root domains.
 * Returns "" for bare domain (e.g. rubjob-all.com).
 * Returns null if hostname doesn't match any known domain.
 */
function extractSubdomain(hostname: string): string | null {
  // Strip port (e.g. "admin.lvh.me:3000" → "admin.lvh.me")
  const host = hostname.split(":")[0];

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

  return null; // Unknown domain (e.g. localhost during dev)
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
      // Redirect /admin, /rider, /store to proper subdomain
      for (const [sub, prefix] of Object.entries(SUBDOMAIN_MAP)) {
        if (prefix && pathname.startsWith(prefix)) {
          const targetPath = pathname.slice(prefix.length) || "/";
          const targetHost = hostname.replace(
            hostname.split(":")[0],
            `${sub}.${ROOT_DOMAINS.find((d) => hostname.includes(d)) || ROOT_DOMAINS[0]}`
          );
          return NextResponse.redirect(
            new URL(`${url.protocol}//${targetHost}${targetPath}`)
          );
        }
      }
    }

    // Rewrite root "/" to "/landing"
    if (pathname === "/") {
      url.pathname = "/landing";
      return NextResponse.rewrite(url);
    }

    return NextResponse.next();
  }

  // ─── Known portal subdomains (admin, rider, store, app) ───
  const targetPrefix = SUBDOMAIN_MAP[subdomain];

  if (targetPrefix !== undefined) {
    // Subdomain isolation: block cross-portal access
    // e.g. rider.rubjob-all.com/admin → redirect to /
    for (const [otherSub, otherPrefix] of Object.entries(SUBDOMAIN_MAP)) {
      if (
        otherPrefix &&
        otherPrefix !== targetPrefix &&
        pathname.startsWith(otherPrefix)
      ) {
        url.pathname = "/";
        return NextResponse.redirect(url);
      }
    }

    // Block /landing from portal subdomains
    if (pathname.startsWith("/landing")) {
      url.pathname = "/";
      return NextResponse.redirect(url);
    }

    // Rewrite: prepend portal prefix if not already present
    if (targetPrefix && !pathname.startsWith(targetPrefix)) {
      url.pathname = `${targetPrefix}${pathname}`;
      return NextResponse.rewrite(url);
    }

    return NextResponse.next();
  }

  // ─── Unknown subdomain — redirect to root domain ───
  const rootDomain = ROOT_DOMAINS.find((d) => hostname.includes(d)) || ROOT_DOMAINS[0];
  const port = hostname.includes(":") ? `:${hostname.split(":")[1]}` : "";
  return NextResponse.redirect(new URL(`${url.protocol}//${rootDomain}${port}/`));
}
