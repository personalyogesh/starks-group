import { NextResponse } from "next/server";

// Server-side only. Do NOT expose secrets to the client.
// Set these in Vercel / .env (NOT NEXT_PUBLIC):
// - PAYPAL_CLIENT_ID
// - PAYPAL_CLIENT_SECRET
// - PAYPAL_ENV ("sandbox" | "live")

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const amount = Number(body?.amount ?? 0);
  const currency = String(body?.currency ?? "USD");
  const memo = String(body?.memo ?? "");

  if (!amount || amount <= 0) {
    return new NextResponse("Invalid amount", { status: 400 });
  }

  // NOTE: Real PayPal integration should:
  // 1) fetch OAuth token using client_id/secret
  // 2) create an order via PayPal Orders API
  // 3) return order id to client
  //
  // We keep a safe stub here so the app compiles; wire it up when credentials are ready.
  const hasCreds = Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET);
  if (!hasCreds) {
    return new NextResponse(
      `PayPal is not configured. Set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET. (requested ${amount} ${currency}${memo ? ` — ${memo}` : ""})`,
      { status: 501 }
    );
  }

  return NextResponse.json({ id: "PAYPAL_ORDER_STUB" });
}

