import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";

export const runtime = "edge";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const host = req.headers.get("host") || "";
  
  const results: any = {
    timestamp: new Date().toISOString(),
    host,
    url: req.url,
    environment: process.env.NODE_ENV,
    bindings: {
      db: false,
      kv: false,
      r2: false,
    },
    tables: {},
    error: null
  };

  try {
    const context = getRequestContext();
    if (context && context.env) {
      if (context.env.DB) {
        results.bindings.db = true;
        
        // Check tables
        const db = context.env.DB;
        const tableList = await db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
        const names = tableList.results.map((r: any) => r.name).filter((n: string) => !n.startsWith('_'));
        
        for (const name of names) {
          try {
            const count = await db.prepare(`SELECT COUNT(*) as count FROM "${name}"`).first();
            results.tables[name] = (count as any)?.count ?? 0;
          } catch (e: any) {
            results.tables[name] = `Error: ${e.message}`;
          }
        }
      }
      if (context.env.KV) results.bindings.kv = true;
      if (context.env.R2) results.bindings.r2 = true;
    } else {
      results.error = "Cloudflare Context (getRequestContext) is missing or empty.";
    }
  } catch (err: any) {
    results.error = err.message;
  }

  return NextResponse.json(results);
}
