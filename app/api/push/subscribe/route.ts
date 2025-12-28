import { NextResponse } from "next/server";
export const runtime = "nodejs";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, subscription } = body as {
      userId: string;
      subscription: {
        endpoint: string;
        keys: { p256dh: string; auth: string };
      };
    };

    if (!userId || !subscription?.endpoint || !subscription?.keys) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Upsert user subscription
    const { error } = await supabase
      .from("web_push_subscriptions")
      .upsert({
        user_id: userId,
        endpoint: subscription.endpoint,
        key_p256dh: subscription.keys.p256dh,
        key_auth: subscription.keys.auth,
      }, { onConflict: "user_id" });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}
