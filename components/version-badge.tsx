"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

export function VersionBadge() {
  const [refreshing, setRefreshing] = useState(false);
  const [showVersion, setShowVersion] = useState(false);
  const version = "0.1.35"; // From package.json

  const handleHardRefresh = () => {
    console.log("🔄 Hard refresh initiated - clearing all caches");
    setRefreshing(true);
    
    // Clear all caches
    if ('caches' in window) {
      caches.keys().then((names) => {
        console.log("🔄 Clearing caches:", names);
        names.forEach((name) => {
          caches.delete(name);
        });
      });
    }

    // Clear service worker and reload
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        console.log("🔄 Unregistering service workers:", registrations.length);
        registrations.forEach((registration) => {
          registration.unregister();
        });
      }).finally(() => {
        console.log("🔄 Hard reload with cache bypass");
        // Hard reload with cache bypass
        window.location.href = window.location.href;
      });
    } else {
      console.log("🔄 Hard reload with cache bypass (no SW)");
      // Hard reload with cache bypass
      window.location.href = window.location.href;
    }
  };

  return (
    <div className="fixed bottom-20 right-4 z-50 flex flex-col items-end gap-2">
      <div className="flex items-center gap-2">
        <Button
          onClick={handleHardRefresh}
          disabled={refreshing}
          size="sm"
          variant="outline"
          className="h-8 px-3 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-border shadow-lg hover:bg-accent"
          title="Hard refresh to latest build"
        >
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${refreshing ? "animate-spin" : ""}`} />
          <span className="text-xs font-medium">Refresh</span>
        </Button>
        <div 
          className="text-xs font-mono bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 text-foreground px-3 py-1.5 rounded-md border border-border shadow-lg cursor-pointer hover:bg-accent transition-colors"
          onClick={() => setShowVersion(!showVersion)}
          title="Click to toggle version details"
        >
          <span className="text-muted-foreground">v</span>
          <span className="font-semibold">{version}</span>
        </div>
      </div>
      
      {showVersion && (
        <div className="text-xs bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 text-foreground px-3 py-2 rounded-md border border-border shadow-lg max-w-xs">
          <div className="font-mono text-muted-foreground mb-1">Build Info</div>
          <div className="space-y-1">
            <div>Version: <span className="font-semibold">{version}</span></div>
            <div>Built: <span className="font-semibold">{new Date().toLocaleDateString()}</span></div>
            <div className="text-xs text-muted-foreground mt-2">Service Worker: <span className="font-semibold">{typeof navigator !== 'undefined' && 'serviceWorker' in navigator ? '✓ Active' : '✗ Disabled'}</span></div>
          </div>
        </div>
      )}
    </div>
  );
}
