'use client';

import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';

export function PullToRefresh() {
  const [isPWA, setIsPWA] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    // Check if running as PWA
    const isPWAMode = window.matchMedia('(display-mode: standalone)').matches ||
                      (window.navigator as any).standalone === true;
    setIsPWA(isPWAMode);
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    window.location.reload();
  };

  // Only show in PWA mode
  if (!isPWA) return null;

  return (
    <button
      onClick={handleRefresh}
      disabled={isRefreshing}
      className="fixed top-4 right-4 z-50 p-2 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-all disabled:opacity-50"
      title="Refresh app"
      aria-label="Refresh app"
    >
      <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
    </button>
  );
}
