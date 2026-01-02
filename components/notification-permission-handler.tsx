"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';

export function NotificationPermissionHandler() {
  const { user } = useAuth();
  const [permissionState, setPermissionState] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [hasShownUpdateNotice, setHasShownUpdateNotice] = useState(false);

  useEffect(() => {
    if (!user || typeof window === 'undefined') return;

    checkPermissionStatus();
    const seen = localStorage.getItem(updateNoticeKey());
    setHasShownUpdateNotice(!!seen);
  }, [user]);

  const checkPermissionStatus = async () => {
    if ('Notification' in window) {
      const permission = Notification.permission;
      setPermissionState(permission);
      if (permission === 'granted') {
        maybeShowUpdateNotification();
      }

      // Check if service worker is registered
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.ready;

          // Check if already subscribed
          const subscription = await registration.pushManager.getSubscription();
          setIsSubscribed(!!subscription);
        } catch (error) {
          console.warn('Notification service worker check failed', error);
        }
      } else {
        console.warn('Service Worker not supported');
      }
    } else {
      console.warn('Notifications not supported in this browser');
    }
  };

  const requestPermission = async () => {
    try {
      const permission = await Notification.requestPermission();
      setPermissionState(permission);

      if (permission === 'granted') {
        await subscribeToPush();
        maybeShowUpdateNotification();
      }
    } catch (error) {
      console.warn('Notification permission error', error);
    }
  };

  const subscribeToPush = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('Push notifications not supported');
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;

      // Check if already subscribed
      let subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        await subscription.unsubscribe();
      }

      // Subscribe with VAPID key
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        console.warn('VAPID public key not found');
        return;
      }

      const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey,
      });

      // Send subscription to server
      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription,
          userId: user?.id,
        }),
      });

      if (response.ok) {
        setIsSubscribed(true);
        maybeShowUpdateNotification();
      } else {
        const error = await response.text();
        console.warn('Push subscribe server error:', error);
      }
    } catch (error) {
      console.warn('Push subscribe error', error);
    }
  };

  const testNotification = async () => {
    if (Notification.permission === 'granted') {
      try {
        const notification = new Notification('Test Notification', {
          body: 'This is a test notification from TLP App',
          icon: '/icons/icon-192x192.png',
          badge: '/icons/icon-192x192.png',
          tag: 'test',
        } as NotificationOptions & { vibrate?: number[] });

        notification.onclick = () => {
          window.focus();
          notification.close();
        };
      } catch (error) {
        console.warn('Local notification error', error);
      }
    } else {
      console.warn('Notification permission not granted');
    }
  };

  const maybeShowUpdateNotification = () => {
    if (hasShownUpdateNotice || typeof window === 'undefined') return;
    if (!('Notification' in window) || Notification.permission !== 'granted') return;

    try {
      new Notification('Update available', {
        body: 'A newer version is ready. Please update to the latest build now.',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-192x192.png',
        tag: 'update-reminder',
      });
      localStorage.setItem(updateNoticeKey(), '1');
      setHasShownUpdateNotice(true);
    } catch (error) {
      console.warn('Unable to show update notification', error);
    }
  };

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  if (!user) return null;

  const isPWA = typeof window !== 'undefined' && 
    window.matchMedia('(display-mode: standalone)').matches;

  return (
    <div className="fixed bottom-20 left-4 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4 max-w-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm">Notification Status</h3>
        <span className={`text-xs px-2 py-1 rounded ${
          permissionState === 'granted' ? 'bg-green-100 text-green-800' :
          permissionState === 'denied' ? 'bg-red-100 text-red-800' :
          'bg-yellow-100 text-yellow-800'
        }`}>
          {permissionState}
        </span>
      </div>

      <div className="space-y-2 mb-3">
        <div className="text-xs flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${isPWA ? 'bg-green-500' : 'bg-gray-300'}`} />
          PWA Mode: {isPWA ? 'Yes' : 'No'}
        </div>
        <div className="text-xs flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${isSubscribed ? 'bg-green-500' : 'bg-gray-300'}`} />
          Push Subscribed: {isSubscribed ? 'Yes' : 'No'}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {permissionState !== 'granted' && (
          <button
            onClick={requestPermission}
            className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 transition"
          >
            Enable Notifications
          </button>
        )}
        
        {permissionState === 'granted' && !isSubscribed && (
          <button
            onClick={subscribeToPush}
            className="px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded hover:bg-green-700 transition"
          >
            Subscribe to Push
          </button>
        )}

        {permissionState === 'granted' && (
          <button
            onClick={testNotification}
            className="px-3 py-1.5 bg-purple-600 text-white text-xs font-medium rounded hover:bg-purple-700 transition"
          >
            Test Notification
          </button>
        )}

        <button
          onClick={checkPermissionStatus}
          className="px-3 py-1.5 bg-gray-600 text-white text-xs font-medium rounded hover:bg-gray-700 transition"
        >
          Refresh Status
        </button>
      </div>
    </div>
  );
}

const updateNoticeKey = () => `tlp-update-notice-${process.env.NEXT_PUBLIC_APP_VERSION || 'latest'}`;
