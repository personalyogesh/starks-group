import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const orderId = String(body?.orderId ?? "");
  if (!orderId) return new NextResponse("Missing orderId", { status: 400 });

  const hasCreds = Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET);
  if (!hasCreds) {
    return new NextResponse("PayPal is not configured. Set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET.", { status: 501 });
  }

  // Real integration would call PayPal capture endpoint and return capture result.
  return NextResponse.json({ id: orderId, status: "COMPLETED" });
}

