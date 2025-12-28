"use client";

import { useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";

export function PushSubscriptionManager() {
  const { user } = useAuth();

  useEffect(() => {
    async function subscribe() {
      try {
        if (!user) return;
        if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

        // First, request notification permission
        if (Notification.permission === 'default') {
          const permission = await Notification.requestPermission();
          if (permission !== 'granted') {
            console.warn('Notification permission not granted');
            return;
          }
        } else if (Notification.permission !== 'granted') {
          console.warn('Notification permission was denied');
          return;
        }

        const reg = await navigator.serviceWorker.ready;

        // VAPID public key from env
        const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!vapidPublicKey) {
          console.warn('VAPID public key not configured');
          return;
        }

        // Check if already subscribed
        const existing = await reg.pushManager.getSubscription();
        if (existing) {
          console.log('✅ Already subscribed to push notifications');
          return;
        }

        // Subscribe with VAPID
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        });

        // Send subscription to server
        const response = await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user.id, subscription: sub }),
        });

        if (response.ok) {
          console.log('✅ Push subscription registered successfully');
        } else {
          console.error('Failed to register push subscription:', await response.text());
        }
      } catch (err) {
        console.warn("Push subscription failed", err);
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
