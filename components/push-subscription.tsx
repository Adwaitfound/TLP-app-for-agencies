"use client";

import { useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";

export function PushSubscriptionManager() {
  const { user } = useAuth();

  useEffect(() => {
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
        // Subscribe with VAPID
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        });

        console.log('✅ Push: Subscription created, sending to server...');
        console.log('🔔 Push: Endpoint:', sub.endpoint.substring(0, 50) + '...');

        // Send subscription to server
        const response = await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user.id, subscription: sub }),
        });

        if (response.ok) {
          console.log('✅ Push: Subscription registered successfully');
        } else {
          const text = await response.text();
          console.error('❌ Push: Failed to register subscription:', text);
        }
      } catch (err) {
        console.error("❌ Push: Subscription failed", err);
      }
    }

    subscribe();
  }, [user]);

  return null;
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
