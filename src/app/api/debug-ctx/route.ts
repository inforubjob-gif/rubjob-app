import { NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

export async function GET() {
  try {
    const ctx = getRequestContext();
    const envKeys = Object.keys(ctx?.env || {});
    
    return NextResponse.json({
      success: true,
      hasContext: !!ctx,
      hasEnv: !!ctx?.env,
      envKeys,
      // Be careful not to expose secrets, but D1 binding name is safe
      isDbBound: !!ctx?.env?.DB,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
