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

export async function notifyChatMessage(
  senderId: string,
  senderName: string,
  message: string,
  messageId: string
) {
  const supabase = createServiceClient();

  // Get all team members except the sender and clients
  const { data: users } = await supabase
    .from("users")
    .select("id, full_name")
    .in("role", ["admin", "project_manager", "employee"])
    .neq("id", senderId);

  if (!users || users.length === 0) return { success: true };

  // Extract mentions from message (@username)
  const mentionMatches = message.match(/@(\w+)/g) || [];
  const mentionedNames = mentionMatches.map(m => m.substring(1).toLowerCase());
  
  // Create preview once for all uses
  const preview = message.length > 50 ? message.substring(0, 50) + '...' : message;

  // Create notifications for all users
  const notifications = users.map(user => {
    const isMentioned = mentionedNames.some(name => 
      user.full_name.toLowerCase().replace(/\s+/g, '').includes(name)
    );

    return {
      user_id: user.id,
      type: isMentioned ? 'chat_mention' : 'chat_message',
      message: isMentioned 
        ? `${senderName} mentioned you: ${preview}`
        : `${senderName}: ${preview}`,
      metadata: {
        sender_id: senderId,
        sender_name: senderName,
        message_id: messageId,
        is_mention: isMentioned,
        full_message: message,
      },
    };
  });

  const { error } = await supabase
    .from("notifications")
    .insert(notifications);

  if (error) return { success: false, error: error.message };

  // Send web push notifications for mentioned users
  const mentionedUserIds = users
    .filter(user => mentionedNames.some(name => 
      user.full_name.toLowerCase().replace(/\s+/g, '').includes(name)
    ))
    .map(u => u.id);

  if (mentionedUserIds.length > 0) {
    try {
      await sendWebPushNotification(
        mentionedUserIds,
        `${senderName} mentioned you in chat`,
        `${preview}`,
        'chat_mention'
      );
    } catch (err) {
      console.error("Failed to send web push for mentions:", err);
      // Don't fail the whole operation if web push fails
    }
  }

  // Send web push for all users (optional, or just for mentions)
  const allUserIds = users.map(u => u.id);
  try {
    await sendWebPushNotification(
      allUserIds,
      `New message from ${senderName}`,
      preview,
      'chat_message'
    );
  } catch (err) {
    console.error("Failed to send web push notifications:", err);
    // Don't fail the whole operation if web push fails
  }

  return { success: true };
}

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
