"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';

export function NotificationPermissionHandler() {
  const { user } = useAuth();
  const [permissionState, setPermissionState] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);

  const addLog = (message: string) => {
    console.log(`🔔 [Notification Handler] ${message}`);
    setDebugInfo(prev => [...prev.slice(-20), `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  useEffect(() => {
    if (!user || typeof window === 'undefined') return;

    checkPermissionStatus();
  }, [user]);

  const checkPermissionStatus = async () => {
    if ('Notification' in window) {
      const permission = Notification.permission;
      setPermissionState(permission);
      addLog(`Current permission: ${permission}`);

      // Check if service worker is registered
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.ready;
          addLog(`Service Worker registered: ${registration.active?.state}`);

          // Check if already subscribed
          const subscription = await registration.pushManager.getSubscription();
          setIsSubscribed(!!subscription);
          addLog(`Push subscription: ${subscription ? 'Active' : 'None'}`);
          
          if (subscription) {
            addLog(`Endpoint: ${subscription.endpoint.substring(0, 50)}...`);
          }
        } catch (error) {
          addLog(`SW check error: ${error}`);
        }
      } else {
        addLog('Service Worker not supported');
      }
    } else {
      addLog('Notifications not supported in this browser');
    }
  };

  const requestPermission = async () => {
    addLog('Requesting notification permission...');
    
    try {
      const permission = await Notification.requestPermission();
      setPermissionState(permission);
      addLog(`Permission result: ${permission}`);

      if (permission === 'granted') {
        await subscribeToPush();
      }
    } catch (error) {
      addLog(`Permission error: ${error}`);
    }
  };

  const subscribeToPush = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      addLog('Push notifications not supported');
      return;
    }

    try {
      addLog('Waiting for Service Worker...');
      const registration = await navigator.serviceWorker.ready;
      addLog('Service Worker ready');

      // Check if already subscribed
      let subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        addLog('Already subscribed, unsubscribing first...');
        await subscription.unsubscribe();
      }

      // Subscribe with VAPID key
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        addLog('ERROR: VAPID public key not found');
        return;
      }

      addLog('Converting VAPID key...');
      const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);
      
      addLog('Subscribing to push...');
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey,
      });

      addLog('Subscription created, sending to server...');

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
        addLog('✅ Successfully subscribed to push notifications');
      } else {
        const error = await response.text();
        addLog(`❌ Server error: ${error}`);
      }
    } catch (error) {
      addLog(`❌ Subscribe error: ${error}`);
    }
  };

  const testNotification = async () => {
    addLog('Testing local notification...');
    
    if (Notification.permission === 'granted') {
      try {
        const notification = new Notification('Test Notification', {
          body: 'This is a test notification from TLP App',
          icon: '/icons/icon-192x192.png',
          badge: '/icons/icon-192x192.png',
          vibrate: [200, 100, 200],
          tag: 'test',
        });

        notification.onclick = () => {
          addLog('Notification clicked');
          window.focus();
          notification.close();
        };

        addLog('✅ Local notification shown');
      } catch (error) {
        addLog(`❌ Local notification error: ${error}`);
      }
    } else {
      addLog('❌ Permission not granted');
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

      <details className="mt-3">
        <summary className="text-xs font-medium cursor-pointer text-gray-600 dark:text-gray-400">
          Debug Log ({debugInfo.length})
        </summary>
        <div className="mt-2 max-h-40 overflow-y-auto bg-gray-50 dark:bg-gray-900 rounded p-2 text-xs font-mono">
          {debugInfo.map((log, i) => (
            <div key={i} className="text-gray-700 dark:text-gray-300">{log}</div>
          ))}
        </div>
      </details>
    </div>
  );
}
