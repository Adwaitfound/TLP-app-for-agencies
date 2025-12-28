"use client";

import { useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { createClient } from "@/lib/supabase/client";
import { requestNotificationPermission, sendChatNotification } from "@/lib/notifications";

/**
 * ChatNotifier: Global real-time listener that triggers notifications for new chat messages
 * Mount this at the root layout so notifications work across all routes.
 */
export function ChatNotifier() {
  const { user } = useAuth();
  const supabase = createClient();

  useEffect(() => {
    // Ask once for permission
    requestNotificationPermission().catch(() => {});
  }, []);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("chat_notifier_global")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages" },
        async (payload) => {
          try {
            // Avoid notifying for own messages
            if (payload.new.user_id === user.id) return;

            // Get sender details
            const { data: sender } = await supabase
              .from("users")
              .select("id, full_name, avatar_url")
              .eq("id", payload.new.user_id)
              .single();

            await sendChatNotification(
              sender?.full_name || "Team Member",
              payload.new.message as string,
              sender?.avatar_url
            );
          } catch (err) {
            console.warn("ChatNotifier failed to send notification", err);
          }
        }
      )
      .subscribe((status) => {
        console.log("🔔 ChatNotifier subscription:", status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return null;
}
