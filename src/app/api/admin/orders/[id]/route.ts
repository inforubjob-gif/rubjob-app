import { NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { getAdminSession } from "@/lib/auth-server";
import { transitionOrderStatus } from "@/lib/order-logic";

export const runtime = "edge";

/**
 * PATCH /api/admin/orders/[id]
 * Admin manually updates order status or assigns riders
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { status, pickupDriverId, deliveryDriverId } = body;
    const db = getRequestContext().env.DB;

    if (pickupDriverId || deliveryDriverId) {
      let updateQuery = "UPDATE orders SET updatedAt = CURRENT_TIMESTAMP";
      const updateParams: any[] = [];

      if (pickupDriverId) {
        updateQuery += ", pickupDriverId = ?";
        updateParams.push(pickupDriverId);
      }
      if (deliveryDriverId) {
        updateQuery += ", deliveryDriverId = ?";
        updateParams.push(deliveryDriverId);
      }

      updateQuery += " WHERE id = ?";
      updateParams.push(id);

      await db.prepare(updateQuery).bind(...updateParams).run();
    }

    if (status) {
      const result = await transitionOrderStatus(
        db,
        id,
        status,
        getRequestContext().env
      );
      if (!result.success) {
        return NextResponse.json(result, { status: 400 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Admin order update error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
