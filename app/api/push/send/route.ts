import { NextResponse } from "next/server";
export const runtime = "nodejs";
import { createServiceClient } from "@/lib/supabase/server";

// Lazy import web-push to avoid edge runtime issues when not configured
async function getWebPush() {
  try {
    // @ts-ignore - web-push is optional and may not be installed
    const wp = await import("web-push");
    return wp.default || (wp as any);
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userIds, payload } = body as {
      userIds: string[];
      payload: { title: string; body: string; tag?: string };
    };

    const webPush = await getWebPush();
    if (!webPush) {
      return NextResponse.json({ error: "web-push not available" }, { status: 500 });
    }

    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const subject = process.env.VAPID_SUBJECT || "mailto:admin@example.com";

    if (!publicKey || !privateKey) {
      return NextResponse.json({ error: "VAPID keys not configured" }, { status: 500 });
    }

    webPush.setVapidDetails(subject, publicKey, privateKey);

    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("web_push_subscriptions")
      .select("endpoint, key_p256dh, key_auth, user_id")
      .in("user_id", userIds);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const sendPromises = (data || []).map((sub) => {
      const subscription = {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.key_p256dh, auth: sub.key_auth },
      } as any;
      return webPush.sendNotification(subscription, JSON.stringify(payload)).catch(() => {});
    });

    await Promise.all(sendPromises);

    return NextResponse.json({ ok: true, sent: sendPromises.length });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}
