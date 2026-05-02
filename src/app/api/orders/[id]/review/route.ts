import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

/**
 * POST /api/orders/[id]/review
 * Submit a rating and review for a completed order
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const { rating, reviewText } = await req.json();

    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Invalid rating" }, { status: 400 });
    }

    const db = getRequestContext().env.DB;

    // Update order with rating and review
    const result = await db
      .prepare(
        "UPDATE Orders SET rating = ?, review_text = ? WHERE id = ? AND status = 'COMPLETED'"
      )
      .bind(rating, reviewText, id)
      .run();

    if (result.meta.changes === 0) {
      return NextResponse.json(
        { error: "Order not found or not in COMPLETED status" },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Submit review error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
