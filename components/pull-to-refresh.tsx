'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, AlertCircle } from 'lucide-react';
import packageJson from '../package.json';

export function PullToRefresh() {
  const [isPWA, setIsPWA] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasUpdate, setHasUpdate] = useState(false);
  const [showVersion, setShowVersion] = useState(false);
  const currentVersion = packageJson.version;

  useEffect(() => {
    // Check if running as PWA
    const isPWAMode = window.matchMedia('(display-mode: standalone)').matches ||
                      (window.navigator as any).standalone === true;
    setIsPWA(isPWAMode);

    // Check for updates periodically
    const checkForUpdates = async () => {
      try {
        const registration = await navigator.serviceWorker?.getRegistration();
        if (registration) {
          registration.update();
          
          // Listen for updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  setHasUpdate(true);
                }
              });
            }
          });
        }
      } catch (err) {
        console.log('Update check failed:', err);
      }
    };

    if (isPWAMode) {
      checkForUpdates();
      // Check every 5 minutes
      const interval = setInterval(checkForUpdates, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    window.location.reload();
  };

  // Only show in PWA mode
  if (!isPWA) return null;

  return (
    <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-2">
      <button
        onClick={handleRefresh}
        onMouseEnter={() => setShowVersion(true)}
        onMouseLeave={() => setShowVersion(false)}
        disabled={isRefreshing}
        className="relative p-3 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-all disabled:opacity-50 group"
        title={`Refresh app - v${currentVersion}`}
        aria-label="Refresh app"
      >
        <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
        {hasUpdate && (
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
          </span>
        )}
      </button>
      
      {(showVersion || hasUpdate) && (
        <div className="bg-card text-card-foreground px-3 py-2 rounded-lg shadow-md text-xs border">
          <div className="flex items-center gap-2">
            {hasUpdate && <AlertCircle className="w-3 h-3 text-orange-500" />}
            <span className="font-mono">v{currentVersion}</span>
          </div>
          {hasUpdate && (
            <p className="text-orange-500 text-[10px] mt-1">Update available - Tap to refresh</p>
          )}
        </div>
      )}
    </div>
  );
}
