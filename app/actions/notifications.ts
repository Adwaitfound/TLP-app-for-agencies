"use server";

import { createServiceClient } from "@/lib/supabase/server";

export async function markAllNotificationsRead(userId: string) {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("user_id", userId)
    .eq("read", false);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function sendTestNotificationToAdmin() {
  const supabase = createServiceClient();

  // Pick an admin; if none, fall back to project manager
  const { data: admin } = await supabase
    .from("users")
    .select("id, full_name")
    .eq("role", "admin")
    .limit(1)
    .maybeSingle();

  const recipient = admin;

  if (!recipient) {
    const { data: pm } = await supabase
      .from("users")
      .select("id, full_name")
      .eq("role", "project_manager")
      .limit(1)
      .maybeSingle();
    if (!pm) return { success: false, error: "No admin or PM found" };
    return insertTest(pm.id, supabase);
  }

  return insertTest(recipient.id, supabase);
}

async function insertTest(userId: string, supabase: ReturnType<typeof createServiceClient>) {
  const { error } = await supabase.from("notifications").insert({
    user_id: userId,
    type: "test",
    message: "This is a test admin notification",
    metadata: { sent_at: new Date().toISOString() },
  });
  if (error) return { success: false, error: error.message };
  return { success: true };
}

// Chat functionality removed - no longer needed

async function sendWebPushNotification(
  userIds: string[],
  title: string,
  body: string,
  tag: string
) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/push/send`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userIds,
          payload: {
            title,
            body,
            tag,
            icon: '/icons/icon-192x192.png',
            badge: '/icons/icon-192x192.png',
            image: '/icons/icon-512x512.png',
            vibrate: [200, 100, 200],
            requireInteraction: tag === 'mention',
            data: {
              url: '/dashboard/notifications',
              timestamp: Date.now(),
            },
          },
        }),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      console.error("Web push API error:", err);
    }
  } catch (err) {
    console.error("Failed to call web push API:", err);
    throw err;
  }
}
