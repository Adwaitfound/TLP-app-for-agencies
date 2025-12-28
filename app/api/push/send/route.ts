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

    console.log('📤 [Push Send] Received request for users:', userIds);

    const webPush = await getWebPush();
    if (!webPush) {
      console.error('📤 [Push Send] web-push package not available');
      return NextResponse.json({ error: "web-push not available" }, { status: 500 });
    }

    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const subject = process.env.VAPID_SUBJECT || "mailto:admin@example.com";

    if (!publicKey || !privateKey) {
      console.error('📤 [Push Send] VAPID keys not configured');
      return NextResponse.json({ error: "VAPID keys not configured" }, { status: 500 });
    }

    console.log('📤 [Push Send] VAPID keys configured, setting details');
    webPush.setVapidDetails(subject, publicKey, privateKey);

    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("web_push_subscriptions")
      .select("endpoint, key_p256dh, key_auth, user_id")
      .in("user_id", userIds);

    if (error) {
      console.error('📤 [Push Send] DB query error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('📤 [Push Send] Found subscriptions:', data?.length || 0);

    if (!data || data.length === 0) {
      console.warn('📤 [Push Send] No subscriptions found for users:', userIds);
      return NextResponse.json({ ok: true, sent: 0, message: 'No subscriptions found' });
    }

    const sendPromises = (data || []).map((sub) => {
      const subscription = {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.key_p256dh, auth: sub.key_auth },
      } as any;
      
      console.log(`📤 [Push Send] Sending to user ${sub.user_id}`);
      
      return webPush.sendNotification(subscription, JSON.stringify(payload))
        .then(() => {
          console.log(`✅ [Push Send] Successfully sent to ${sub.user_id}`);
          return true;
        })
        .catch((err: any) => {
          console.error(`❌ [Push Send] Failed for ${sub.user_id}:`, err?.message);
          return false;
        });
    });

    const results = await Promise.all(sendPromises);
    const successCount = results.filter(r => r).length;

    console.log(`📤 [Push Send] Completed: ${successCount}/${results.length} successful`);

    return NextResponse.json({ ok: true, sent: successCount, total: results.length });
  } catch (err: any) {
    console.error('📤 [Push Send] Fatal error:', err);
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}
