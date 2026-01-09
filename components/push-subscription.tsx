"use client";

import { useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { playNotificationSound } from "@/lib/notification-sound";

export function PushSubscriptionManager() {
  const { user } = useAuth();

  useEffect(() => {
    // Listen for messages from service worker about notifications
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("message", (event) => {
        if (event.data.type === "NOTIFICATION_RECEIVED") {
          console.log("🔔 Notification received in app:", event.data.data);
          // Play sound when notification arrives
          playNotificationSound();
        }
      });
    }
  }, []);

  useEffect(() => {
    // Temporarily disabled - push service error blocking dashboard
    // Will re-enable after debugging redirect issue
    console.log('🔕 Push: Subscription disabled temporarily');
    return;
    
    async function subscribe() {
      try {
        if (!user) {
          console.log('⏳ Push: User not authenticated yet');
          return;
        }

        console.log('🔔 Push: Starting subscription for user:', user.id);

        if (!("serviceWorker" in navigator)) {
          console.warn('🔔 Push: ServiceWorker not supported');
          return;
        }
        if (!("PushManager" in window)) {
          console.warn('🔔 Push: PushManager not supported');
          return;
        }

        // First, request notification permission
        console.log('🔔 Push: Current permission:', Notification.permission);
        
        if (Notification.permission === 'default') {
          console.log('🔔 Push: Requesting notification permission...');
          const permission = await Notification.requestPermission();
          console.log('🔔 Push: Permission result:', permission);
          if (permission !== 'granted') {
            console.warn('🔔 Push: Notification permission not granted');
            return;
          }
        } else if (Notification.permission !== 'granted') {
          console.warn('🔔 Push: Notification permission was previously denied');
          return;
        }

        console.log('🔔 Push: Getting service worker registration...');
        const reg = await navigator.serviceWorker.ready;
        console.log('🔔 Push: Service worker ready:', !!reg);

        // VAPID public key from env
        const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!vapidPublicKey) {
          console.warn('🔔 Push: VAPID public key not configured');
          return;
        }
        console.log('🔔 Push: VAPID key present:', vapidPublicKey.substring(0, 10) + '...');

        // Check if already subscribed
        console.log('🔔 Push: Checking for existing subscription...');
        const existing = await reg.pushManager.getSubscription();
        if (existing) {
          console.log('✅ Push: Already subscribed to push notifications');
          console.log('🔔 Push: Subscription endpoint:', existing.endpoint.substring(0, 50) + '...');
          return;
        }

        console.log('🔔 Push: Creating new push subscription...');
        // Prepare VAPID key
        const keyString = vapidPublicKey.trim();
        const appServerKey = urlBase64ToUint8Array(keyString);
        console.log('🔔 Push: VAPID key length(bytes):', appServerKey?.length);

        if (!appServerKey || !(appServerKey instanceof Uint8Array)) {
          console.error('❌ Push: VAPID applicationServerKey conversion failed');
          return;
        }
        if (appServerKey.length !== 65) {
          console.error('❌ Push: VAPID key length invalid, expected 65, got', appServerKey.length);
          return;
        }

        // Subscribe with VAPID - use a timeout to prevent hanging
        const subscriptionPromise = reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: appServerKey,
        });

        // If subscription takes more than 5 seconds, log and continue
        const timeoutPromise = new Promise<PushSubscription>((_, reject) =>
          setTimeout(() => reject(new Error('Push subscription timeout after 5s')), 5000)
        );

        let sub: PushSubscription;
        try {
          sub = await Promise.race([subscriptionPromise, timeoutPromise]);
        } catch (timeoutErr) {
          console.warn('⏱️ Push: Subscription timed out or service error:', timeoutErr);
          console.warn('⏱️ Push: Dashboard will continue loading without push notifications');
          return;
        }

        console.log('✅ Push: Subscription created, sending to server...');
        console.log('🔔 Push: Endpoint:', sub.endpoint.substring(0, 50) + '...');

        // Send subscription to server with timeout
        try {
          const response = await Promise.race([
            fetch("/api/push/subscribe", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ userId: user.id, subscription: sub }),
            }),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Server response timeout')), 3000)
            ) as Promise<Response>,
          ]);

          if (response.ok) {
            console.log('✅ Push: Subscription registered successfully');
          } else {
            const text = await response.text();
            console.error('❌ Push: Failed to register subscription:', text);
          }
        } catch (serverErr) {
          console.error('❌ Push: Server registration error:', serverErr);
        }
      } catch (err) {
        // Log error but don't block dashboard
        console.error("❌ Push: Subscription failed", err);
        console.warn("⚠️ Push: Continuing without push notifications");
      }
    }

    subscribe();
  }, [user]);

  return null;
}

function urlBase64ToUint8Array(base64String: string) {
  try {
    // Normalize and trim common formatting issues
    const cleaned = base64String.replace(/\s+/g, "").replace(/"/g, "");
    const padding = "=".repeat((4 - (cleaned.length % 4)) % 4);
    const base64 = (cleaned + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  } catch (e) {
    console.error('❌ Push: Failed to convert VAPID key to Uint8Array', e);
    return new Uint8Array();
  }
}
